// js/consulta.js — Consulta Avulsa Instantânea com Gemini 3.6 Flash & Google Search

import { state, salvarLocal } from './state.js';
import { abrirModal, fecharModal, mostrarToast } from './utils.js';
import { renderizarRadar } from './radar.js';

export function abrirModalConsultaAvulsa() {
  const form = document.getElementById('consultaForm');
  const loading = document.getElementById('consultaLoading');
  if (form) form.style.display = 'block';
  if (loading) loading.style.display = 'none';

  abrirModal('modalConsultaAvulsa');
}

export async function executarConsultaAvulsaLive() {
  const cidadeInput = document.getElementById('avulsoCidade');
  const cargoInput = document.getElementById('avulsoCargo');
  
  const cidade = cidadeInput ? cidadeInput.value.trim() : '';
  const cargo = cargoInput ? cargoInput.value.trim() : '';
  const apiKey = state.config.geminiKey;

  if (!cidade) {
    mostrarToast('Informe o município para a pesquisa.', 'error');
    return;
  }

  if (!apiKey) {
    mostrarToast('Chave Gemini API não cadastrada. Insira na aba Ajustes.', 'error');
    return;
  }

  const form = document.getElementById('consultaForm');
  const loading = document.getElementById('consultaLoading');
  if (form) form.style.display = 'none';
  if (loading) loading.style.display = 'flex';

  const prompt = `Você é um especialista em monitoramento de concursos públicos e licitações no estado de São Paulo.
Faça uma pesquisa profunda e atualizada na web sobre concursos públicos, processos seletivos e licitações de bancas organizadoras no município de ${cidade} - SP, com foco em: ${cargo || 'Geral / Administrativo / Licitações'}.
Ano de referência: ${new Date().getFullYear()} ou meses recentes.

REGRAS DE STATUS OBRIGATÓRIAS:
- "Edital Aberto": use APENAS se as inscrições estiverem ABERTAS hoje e o candidato ainda puder se inscrever.
- "Em Andamento (Recursos / Gabarito)": use se as inscrições já fecharam, ou se as provas já foram realizadas e está em fase de gabarito preliminar, recursos ou resultados.
- "Licitação": use quando a prefeitura estiver contratando a banca examinadora (pregão ou dispensa).
- "Previsto": use para concurso anunciado sem edital publicado.
- "Cancelado / Suspenso": se foi suspenso ou cancelado.

REGRAS DE LINKS OBRIGATÓRIAS:
- NUNCA invente URLs falsas ou rotas genéricas (/licitacoes ou /concursos) se você não as viu comprovadamente na busca.
- Retorne apenas links reais verificados da banca examinadora (ex: consulplan, vunesp) ou a página real de serviços do município, ou o domínio oficial raiz.

Retorne EXCLUSIVAMENTE um array JSON puro:
[
  {
    "cidade": "${cidade}",
    "orgao": "Nome do órgão (ex: Prefeitura de ${cidade})",
    "titulo": "Título oficial do concurso ou licitação",
    "status": "Edital Aberto" OU "Em Andamento (Recursos / Gabarito)" OU "Licitação" OU "Previsto" OU "Cancelado / Suspenso",
    "cargos": ["Cargo 1", "Cargo 2"],
    "areas": ["Administrativo", "Licitações", "Geral"],
    "salario_resumo": "Vencimento informado ou A consultar",
    "prazo_inscricao": "Status das inscrições e provas",
    "link_oficial": "URL oficial real verificada",
    "resumo_ia": "Resumo objetivo explicando o momento exato do certame."
  }
]`;

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        tools: [{ google_search: {} }]
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    const candidateText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    // Limpa possíveis marcadores Markdown
    const clean = candidateText.replace(/```json/g, '').replace(/```/g, '').trim();
    const sIdx = clean.indexOf('[');
    const eIdx = clean.lastIndexOf(']');

    if (sIdx !== -1 && eIdx !== -1) {
      const items = JSON.parse(clean.substring(sIdx, eIdx + 1));
      if (items.length > 0) {
        items.forEach(item => {
          item.id = `avulso_${cidade}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`.toLowerCase().replace(/[^a-z0-9_]/g, '_');
          item.updated_at = new Date().toISOString();
          
          // Remove duplicações se já existir título similar
          const existingIdx = state.concursos.findIndex(c => c.titulo.toLowerCase() === item.titulo.toLowerCase());
          if (existingIdx !== -1) {
            state.concursos[existingIdx] = item;
          } else {
            state.concursos.unshift(item);
          }
        });

        salvarLocal();
        renderizarRadar();
        fecharModal('modalConsultaAvulsa');
        mostrarToast(`Varredura concluída: ${items.length} registro(s) obtido(s)!`, 'success');
        return;
      }
    }
    
    fecharModal('modalConsultaAvulsa');
    mostrarToast('Varredura concluída. Nenhuma alteração recente encontrada.', 'info');
  } catch (err) {
    console.warn('[Consulta Avulsa] Erro:', err);
    fecharModal('modalConsultaAvulsa');
    mostrarToast('Erro ao consultar Gemini ou limite de requisições excedido.', 'error');
  }
}
