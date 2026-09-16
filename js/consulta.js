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

⚠️ DIRETRIZES DE AUDITORIA PÚBLICA E ANTI-ALUCINAÇÃO (MÁXIMA RIGIDEZ):
1. VIGÊNCIA DE CONCURSOS E CADASTRO DE RESERVA (CF/88 art. 37):
   - Concursos homologados possuem validade legal de 2 anos (prorrogáveis por mais 2).
   - Enquanto um concurso estiver vigente (como o Concurso Geral nº 01/2025 da Vunesp em Rio Preto com 506 vagas, ou o Concurso GCM nº 01/2024 da Vunesp em fase de Curso de Formação), o município convoca os aprovados e NÃO pode abrir novo concurso para os mesmos cargos.
   - NUNCA invente que a prefeitura "está estudando novo certame" ou classifique como "Previsto" a menos que exista comprovação documental no Diário Oficial (portaria de comissão organizadora instituída ou autorização expressa do Prefeito).
   - Se o concurso recente estiver vigente ou em etapas de nomeação/curso de formação, relate a realidade com precisão: que o concurso está em andamento/vigente chamando os aprovados, e que não há novo certame oficialmente autorizado.

2. VERIFICAÇÃO RIGOROSA DO STATUS:
   - "Edital Aberto": EXCLUSIVO para certames onde as inscrições estejam formalmente abertas HOJE para novos candidatos (data limite de inscrição >= ${hojeStr}).
   - "Em Andamento (Recursos / Gabarito)": Use para certames cujas provas já foram realizadas ou inscrições fecharam, e estão em fase de recursos, gabaritos, classificação, curso de formação ou convocações de aprovados.
   - "Licitação": Quando o município abriu processo formal no Diário Oficial para contratar banca examinadora (pregão ou dispensa).
   - "Previsto": SOMENTE com ato oficial de comissão formada publicado em Diário Oficial.
   - "Cancelado / Suspenso": Certames com atos revogados ou suspensos judicialmente.

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
