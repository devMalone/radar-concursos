// js/consulta.js — Consulta Avulsa Instantânea com IA Gemini 3.6 Flash com Rigor Temporal

import { state, salvarLocal, sanitizarItemConcurso } from './state.js';
import { abrirModal, fecharModal, mostrarToast } from './utils.js';
import { renderizarRadar } from './radar.js';
import { PORTAIS_CIDADES } from './portais.js';

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

  const dataAtual = new Date();
  const hojeStr = dataAtual.toLocaleDateString('pt-BR');
  const anoAtual = dataAtual.getFullYear();

  const portaisConhecidos = PORTAIS_CIDADES[cidade];
  const contextoPortal = portaisConhecidos 
    ? `Portais conhecidos do município: Prefeitura: ${portaisConhecidos.site}, Concursos: ${portaisConhecidos.concursos}`
    : '';

  const prompt = `Você é um auditor e pesquisador sênior especializado em diários oficiais e concursos públicos no estado de São Paulo.
Faça uma pesquisa rigorosa na web com o Google Search sobre concursos públicos, processos seletivos e contratação de bancas examinadoras para o município de: ${cidade} - SP.
Foco de interesse: ${cargo || 'Geral / Administrativo / Licitações / Segurança'}.

${contextoPortal}

DATA DE REFERÊNCIA HOJE: ${hojeStr} (Ano atual: ${anoAtual}).

⚠️ DIRETRIZES DE TEMPORALIDADE E ANTI-ANACRONISMO (CRÍTICO):
1. Verifique SEMPRE a data do edital e o encerramento das inscrições:
   - Editais de 2024, 2023 ou meses passados cujas inscrições já fecharam ou cujas provas já foram realizadas NÃO ESTÃO ABERTOS!
   - NUNCA marque um concurso com "Edital Aberto" se a data limite de inscrição já passou em relação a ${hojeStr}.
2. Se o certame é de 2024/2025 e as provas já aconteceram ou as inscrições fecharam:
   - Use o status: "Em Andamento (Recursos / Gabarito)".
   - E no prazo_inscricao informe: "Inscrições encerradas • Provas realizadas • Fase de recursos/classificação".
3. Se o certame de 2024 já foi concluído/homologado e há expectativa, estudos ou movimentação da prefeitura para um novo certame (ex: Guarda Civil Municipal de Rio Preto, onde o concurso anterior foi em 2024 e a prefeitura estuda novas vagas para 2026/2027):
   - Use o status: "Previsto".
   - Título: "Guarda Civil Municipal — Novo Concurso em Planejamento".
   - Explique no resumo_ia: "O último concurso ocorreu em 2024 pela banca Vunesp (encerrado). O município planeja novo edital para ampliação do efetivo."
4. Status válidos permitidos:
   - "Edital Aberto": SOMENTE se as inscrições estiverem formalmente abertas hoje para novos inscritos.
   - "Em Andamento (Recursos / Gabarito)": se as provas já ocorreram ou as inscrições já fecharam e está em fase de resultados.
   - "Licitação": quando o município abriu licitação/pregão/dispensa para contratar a banca organizadora.
   - "Previsto": certames autorizados, comissão formada ou estudos anunciados.
   - "Cancelado / Suspenso": certames com atos revogados ou suspensos judicialmente.

⚠️ REGRAS DE LINKS FUNCIONAIS (PROIBIDO LINKS QUEBRADOS):
- Retorne links REAIS e que funcionem ao clicar:
  - O link oficial da banca organizadora (ex: vunesp.com.br, ibamsp-concursos.org.br, institutoconsulplan.org.br, etc.)
  - OU o portal oficial de concursos/serviços da prefeitura.
- NUNCA invente rotas falsas (como /licitacoes, /concursos-2024) que geram tela de erro 404. Se não encontrar o link profundo exato do PDF, retorne a página principal de concursos do município ou da banca.

Retorne EXCLUSIVAMENTE um array JSON puro (sem explicações antes ou depois):
[
  {
    "cidade": "${cidade}",
    "orgao": "Ex: Prefeitura Municipal de ${cidade}",
    "titulo": "Título oficial e específico do concurso ou processo seletivo",
    "status": "Edital Aberto" OU "Em Andamento (Recursos / Gabarito)" OU "Licitação" OU "Previsto" OU "Cancelado / Suspenso",
    "cargos": ["Cargo 1", "Cargo 2"],
    "areas": ["Administrativo", "Segurança", "Geral"],
    "salario_resumo": "Vencimento informado ou A consultar",
    "prazo_inscricao": "Ex: Inscrições abertas até DD/MM/AAAA OU Inscrições encerradas • Provas aplicadas",
    "link_oficial": "URL real verificada e funcional",
    "resumo_ia": "Resumo analítico destacando a banca, a situação real de datas e o estágio atual do concurso."
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
    
    // Limpa delimitadores de bloco JSON
    const clean = candidateText.replace(/```json/g, '').replace(/```/g, '').trim();
    const sIdx = clean.indexOf('[');
    const eIdx = clean.lastIndexOf(']');

    if (sIdx !== -1 && eIdx !== -1) {
      const parsedItems = JSON.parse(clean.substring(sIdx, eIdx + 1));
      if (parsedItems.length > 0) {
        parsedItems.forEach(rawItem => {
          // Passa pelo filtro sanitizador rigoroso
          const item = sanitizarItemConcurso(rawItem);
          item.id = `avulso_${cidade}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`.toLowerCase().replace(/[^a-z0-9_]/g, '_');
          item.updated_at = new Date().toISOString();
          
          // Se já existir certame com mesmo título, atualiza; senão insere no topo
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
        mostrarToast(`Pesquisa concluída: ${parsedItems.length} certame(s) verificado(s)!`, 'success');
        return;
      }
    }
    
    fecharModal('modalConsultaAvulsa');
    mostrarToast('Varredura concluída. Nenhuma novidade recente encontrada para este critério.', 'info');
  } catch (err) {
    console.warn('[Consulta Avulsa] Erro:', err);
    fecharModal('modalConsultaAvulsa');
    mostrarToast('Falha na comunicação com o Gemini. Verifique a chave ou tente em instantes.', 'error');
  }
}
