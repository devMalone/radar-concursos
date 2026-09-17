// js/consulta.js — Motor de Busca Investigativa de Editais via Gemini Grounding

import { state, salvarLocal, sanitizarItemConcurso } from './state.js';
import { abrirModal, fecharModalAtual, mostrarToast, escapeHtml } from './utils.js';
import { renderizarRadar } from './radar.js';
import { PORTAIS_CIDADES, BANCAS_OFICIAIS } from './portais.js';

export function abrirModalConsultaAvulsa() {
  const form = document.getElementById('consultaForm');
  const loading = document.getElementById('consultaLoading');
  const statusBox = document.getElementById('consultaStatusFeedback');

  if (form) form.style.display = 'block';
  if (loading) loading.style.display = 'none';
  if (statusBox) statusBox.style.display = 'none';

  // Se houver cidade selecionada no filtro principal, pré-preenche
  const inputCidade = document.getElementById('avulsoCidade');
  if (inputCidade && state.filtroCidade) {
    inputCidade.value = state.filtroCidade;
  }

  abrirModal('modalConsultaAvulsa');
}

export function resetarFormularioConsulta() {
  const form = document.getElementById('consultaForm');
  const loading = document.getElementById('consultaLoading');
  const statusBox = document.getElementById('consultaStatusFeedback');

  if (form) form.style.display = 'block';
  if (loading) loading.style.display = 'none';
  if (statusBox) statusBox.style.display = 'none';
}

export async function executarConsultaAvulsaLive() {
  const cidadeInput = document.getElementById('avulsoCidade');
  const cargoInput = document.getElementById('avulsoCargo');
  
  const cidade = cidadeInput ? cidadeInput.value.trim() : '';
  const cargo = cargoInput ? cargoInput.value.trim() : '';

  if (!cidade) {
    mostrarToast('Informe o município para a pesquisa.', 'error');
    return;
  }

  const rawKey = state.config.geminiKey;
  const apiKey = (rawKey || '').trim().replace(/^["']|["']$/g, '');
  if (!apiKey) {
    mostrarToast('Chave Gemini API não configurada. Insira na aba Ajustes.', 'error');
    return;
  }

  const form = document.getElementById('consultaForm');
  const loading = document.getElementById('consultaLoading');
  const statusBox = document.getElementById('consultaStatusFeedback');

  if (form) form.style.display = 'none';
  if (statusBox) statusBox.style.display = 'none';
  if (loading) loading.style.display = 'flex';

  const dataAtual = new Date();
  const hojeStr = dataAtual.toLocaleDateString('pt-BR');
  const anoAtual = dataAtual.getFullYear();

  const portaisConhecidos = PORTAIS_CIDADES[cidade];
  const contextoPortal = portaisConhecidos 
    ? `Portais oficiais conhecidos do município: Prefeitura: ${portaisConhecidos.site}, Concursos: ${portaisConhecidos.concursos}, Diário Oficial: ${portaisConhecidos.diario}`
    : '';

  const bancasTexto = Object.values(BANCAS_OFICIAIS)
    .map(b => `${b.nome} (${b.site})`)
    .join(', ');

  const prompt = `Você é um auditor e pesquisador sênior especializado em diários oficiais e concursos públicos no estado de São Paulo.
Faça uma pesquisa rigorosa na web com o Google Search sobre concursos públicos, processos seletivos e contratação de bancas examinadoras para o município de: ${cidade} - SP.
Foco de interesse: ${cargo || 'Geral / Administrativo / Licitações / Saúde / Educação'}.

${contextoPortal}
Bancas Oficiais Reconhecidas no Estado de SP: ${bancasTexto}.

DATA DE REFERÊNCIA HOJE: ${hojeStr} (Ano atual: ${anoAtual}).

⚠️ DIRETRIZES DE AUDITORIA PÚBLICA E ANTI-ALUCINAÇÃO (MÁXIMA RIGIDEZ):
1. VIGÊNCIA DE CONCURSOS E CADASTRO DE RESERVA (CF/88 art. 37):
   - Concursos homologados possuem validade legal de 2 anos (prorrogáveis por mais 2).
   - Enquanto um concurso estiver vigente ou em etapas de chamamento de aprovados, relate a realidade documental.
   - NUNCA invente certames "Previstos" sem portaria de comissão organizadora formal ou autorização do Prefeito publicada em Diário Oficial.
   - Se houver concurso vigente com convocações em andamento, informe o status exato.

2. VERIFICAÇÃO RIGOROSA DO STATUS:
   - "Edital Aberto": EXCLUSIVO para certames onde as inscrições estejam formalmente abertas HOJE para novos candidatos (data limite >= ${hojeStr}).
   - "Em Andamento (Recursos / Gabarito)": Certames cujas inscrições fecharam ou provas foram aplicadas, e estão em fase de recursos, gabaritos, homologação ou convocações.
   - "Licitação": Quando o município abriu processo formal no Diário Oficial para contratar banca examinadora.
   - "Previsto": SOMENTE com ato oficial publicado em Diário Oficial.
   - "Cancelado / Suspenso": Certames com atos suspensos ou revogados.

3. REGRAS DE LINKS FUNCIONAIS (PROIBIDO LINKS QUEBRADOS):
   - Retorne links REAIS e que funcionem ao clicar:
     - O link oficial da banca organizadora (ex: vunesp.com.br, ibamsp-concursos.org.br, institutoconsulplan.org.br, etc.)
     - OU o portal oficial de concursos/serviços da prefeitura.
   - NUNCA invente rotas falsas (como /licitacoes, /concursos-2024) que geram tela 404.

Retorne EXCLUSIVAMENTE um array JSON puro (sem explicações antes ou depois):
[
  {
    "cidade": "${cidade}",
    "orgao": "Ex: Prefeitura Municipal de ${cidade}",
    "banca": "Ex: Fundação Vunesp, IBAM-SP, Instituto Consulplan ou Prefeitura",
    "titulo": "Título oficial e específico do concurso ou processo seletivo",
    "status": "Edital Aberto" OU "Em Andamento (Recursos / Gabarito)" OU "Licitação" OU "Previsto" OU "Cancelado / Suspenso",
    "fase_detalhada": "Ex: Inscrições Abertas até DD/MM OU Provas Realizadas • Fase de Recursos OU Convocação de Aprovados",
    "cargos": ["Cargo 1", "Cargo 2"],
    "areas": ["Administrativo", "Segurança", "Geral"],
    "salario_resumo": "Vencimento informado ou A consultar",
    "prazo_inscricao": "Ex: Inscrições abertas até DD/MM/AAAA OU Inscrições encerradas • Provas aplicadas",
    "link_oficial": "URL real verificada e funcional",
    "resumo_ia": "Resumo analítico destacando a banca examinadora, a situação real de datas e o estágio atual do certame."
  }
]`;

  try {
    const candidateText = await chamarGeminiGrounding(apiKey, prompt);

    // Limpa delimitadores de bloco JSON
    const clean = candidateText.replace(/```json/g, '').replace(/```/g, '').trim();
    const sIdx = clean.indexOf('[');
    const eIdx = clean.lastIndexOf(']');

    if (sIdx !== -1 && eIdx !== -1) {
      const parsedItems = JSON.parse(clean.substring(sIdx, eIdx + 1));
      if (Array.isArray(parsedItems) && parsedItems.length > 0) {
        parsedItems.forEach(rawItem => {
          const item = sanitizarItemConcurso(rawItem);
          item.id = `avulso_${cidade}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`.toLowerCase().replace(/[^a-z0-9_]/g, '_');
          item.updated_at = new Date().toISOString();
          
          // Se já existir certame com mesmo título, atualiza; senão insere no topo
          const existingIdx = state.concursos.findIndex(c => (c.titulo || '').toLowerCase() === (item.titulo || '').toLowerCase());
          if (existingIdx !== -1) {
            state.concursos[existingIdx] = item;
          } else {
            state.concursos.unshift(item);
          }
        });

        salvarLocal();
        state.filtroCidade = cidade;
        const selectCidade = document.getElementById('selectCidade');
        if (selectCidade) selectCidade.value = cidade;

        renderizarRadar();
        fecharModalAtual();
        mostrarToast(`🔍 ${parsedItems.length} certame(s) localizado(s) para ${cidade}!`, 'success');
        return;
      }
    }

    // Se nenhum item foi parseado
    mostrarFeedbackConsulta(
      'Nenhum certame localizado',
      `Não foram encontradas publicações recentes de concursos ou processos seletivos para <strong>${escapeHtml(cidade)}</strong> com os critérios informados.`,
      'info'
    );
  } catch (err) {
    console.warn('[Consulta Gemini Grounding] Erro:', err);
    mostrarFeedbackConsulta(
      'Falha na Comunicação',
      `Não foi possível concluir a busca online no momento. Detalhe: ${escapeHtml(err.message || 'Erro de rede ou chave API')}. Verifique sua conexão e a chave Gemini API em Ajustes.`,
      'error'
    );
  }
}

// Descobre dinamicamente os modelos disponíveis na conta do usuário ou usa fallback moderno (Gemini 3.5)
async function obterModelosGemini(apiKey) {
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.models)) {
        const candidatos = data.models
          .filter(m => Array.isArray(m.supportedGenerationMethods) && m.supportedGenerationMethods.includes('generateContent'))
          .map(m => m.name.replace(/^models\//, ''));

        // Priorização inteligente:
        // 1º: gemini-3.5-flash-lite (recomendado pelo Google para alta velocidade)
        // 2º: gemini-3.5-flash (alta capacidade)
        // 3º: gemini-2.5-flash / outros flash
        // 4º: demais modelos (pro, etc)
        candidatos.sort((a, b) => {
          const score = (m) => {
            if (m === 'gemini-3.5-flash-lite') return 100;
            if (m === 'gemini-3.5-flash') return 95;
            if (m.includes('3.5') && m.includes('flash')) return 90;
            if (m === 'gemini-2.5-flash') return 80;
            if (m.includes('flash')) return 70;
            return 10;
          };
          return score(b) - score(a);
        });

        if (candidatos.length > 0) {
          return candidatos;
        }
      }
    }
  } catch (e) {
    console.warn('[Gemini Discovery] Falha ao consultar lista de modelos:', e);
  }

  // Fallback moderno e resiliente
  return [
    'gemini-3.5-flash-lite',
    'gemini-3.5-flash',
    'gemini-2.5-flash',
    'gemini-2.0-flash',
    'gemini-1.5-flash'
  ];
}

// Executa a chamada à API Gemini testando modelos com suporte a Search Grounding
async function chamarGeminiGrounding(apiKey, prompt) {
  const modelos = await obterModelosGemini(apiKey);
  let ultimoErro = null;

  for (const modelo of modelos) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent?key=${apiKey}`;
      
      // Tenta inicialmente com Google Search Grounding
      let response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          tools: [{ google_search: {} }]
        })
      });

      // Se retornar 400 (banco de ferramentas não suportado pelo modelo específico), tenta sem tools
      if (!response.ok && response.status === 400) {
        response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }]
          })
        });
      }

      if (response.ok) {
        const data = await response.json();
        const candidateText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
        if (candidateText) {
          return candidateText;
        }
      } else {
        const errBody = await response.text();
        console.warn(`[Gemini ${modelo}] HTTP ${response.status}:`, errBody);
        let msg = `HTTP ${response.status} (${modelo})`;
        try {
          const jsonErr = JSON.parse(errBody);
          if (jsonErr?.error?.message) {
            msg = `${jsonErr.error.message} (${modelo})`;
          }
        } catch (_) {}
        ultimoErro = new Error(msg);
      }
    } catch (e) {
      console.warn(`[Gemini ${modelo}] Exceção:`, e);
      ultimoErro = e;
    }
  }

  throw ultimoErro || new Error('Não foi possível obter resposta dos servidores da IA.');
}

function mostrarFeedbackConsulta(titulo, mensagem, tipo = 'info') {
  const loading = document.getElementById('consultaLoading');
  const statusBox = document.getElementById('consultaStatusFeedback');
  if (loading) loading.style.display = 'none';

  if (statusBox) {
    statusBox.style.display = 'flex';
    statusBox.innerHTML = `
      <div style="text-align: center; display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 12px 0;">
        <i data-lucide="${tipo === 'error' ? 'alert-triangle' : 'info'}" style="width: 32px; height: 32px; color: ${tipo === 'error' ? '#ef4444' : '#60a5fa'};"></i>
        <h4 style="color: var(--text); font-size: 15px; font-weight: 700; margin: 0;">${escapeHtml(titulo)}</h4>
        <p style="color: var(--text-muted); font-size: 12.5px; line-height: 1.45; margin: 0; max-width: 320px;">
          ${mensagem}
        </p>
        <button type="button" class="btn-card-action" onclick="window.radarActions.resetarFormularioConsulta()" style="margin-top: 8px;">
          <i data-lucide="arrow-left" style="width: 14px; height: 14px;"></i>
          <span>Voltar ao Formulário</span>
        </button>
      </div>
    `;
    if (window.lucide) window.lucide.createIcons();
  }
}
