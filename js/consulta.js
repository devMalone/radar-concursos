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
  const title = document.getElementById('consultaLoadingTitle');
  const sub = document.getElementById('consultaLoadingSub');

  if (form) form.style.display = 'block';
  if (loading) loading.style.display = 'none';
  if (statusBox) statusBox.style.display = 'none';
  if (title) title.textContent = 'Consultando Portais & Diários Oficiais...';
  if (sub) sub.textContent = 'O Gemini 3.5 com Google Search Grounding está apurando certames e publicações oficiais recentes para o município.';
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

  const focoTexto = cargo 
    ? `Foco de interesse informado pelo usuário: ${cargo}.`
    : `Foco de interesse: Geral (Prefeitura, Educação, Saúde, Administração, Guarda Civil e Autarquias).`;

  const prompt = `Você é um especialista em concursos públicos do estado de São Paulo.
Pesquise na web com o Google Search sobre concursos públicos, processos seletivos e convocações da Prefeitura Municipal de ${cidade} - SP e órgãos públicos locais.
${focoTexto}

${contextoPortal}
Principais bancas examinadoras de SP: ${bancasTexto}.

DIRETRIZES DE PESQUISA:
1. Busque editais da Prefeitura Municipal de ${cidade}, Câmara Municipal, autarquias municipais (como DAE, SEMAE, SAAE, EMURB) e na banca Fundação Vunesp ou IBAM.
2. Identifique e traga certames com:
   - Inscrições Abertas ou com edital publicado
   - Em Andamento (provas aplicadas, gabaritos, fase de recursos, homologação ou convocações de aprovados do cadastro de reserva)
   - Processos Seletivos Simplificados
   - Licitações abertas para contratação de banca organizadora
3. Se houver concurso vigente com convocações ou recursos em andamento, inclua-o com status "Em Andamento (Recursos / Gabarito)".
4. Forneça links oficiais funcionais (página da banca organizadora ou portal oficial de concursos da prefeitura: ${portaisConhecidos ? portaisConhecidos.concursos : 'site do município'}).

FORMATO DE RESPOSTA:
Retorne EXCLUSIVAMENTE um bloco markdown com array JSON com todos os certames localizados:
\`\`\`json
[
  {
    "cidade": "${cidade}",
    "orgao": "Prefeitura Municipal de ${cidade}",
    "banca": "Fundação Vunesp (ou banca organizadora)",
    "titulo": "Nome oficial do concurso ou processo seletivo",
    "status": "Edital Aberto" OU "Em Andamento (Recursos / Gabarito)" OU "Licitação" OU "Previsto",
    "fase_detalhada": "Fase detalhada (ex: Inscrições Abertas até DD/MM OU Convocações de Aprovados OU Fase de Recursos)",
    "cargos": ["Lista dos principais cargos"],
    "areas": ["Administrativo", "Educação", "Geral"],
    "salario_resumo": "Ex: R$ 3.000 a R$ 7.000 ou A consultar",
    "prazo_inscricao": "Informação sobre datas e inscrições",
    "link_oficial": "${portaisConhecidos ? portaisConhecidos.concursos : 'https://www.vunesp.com.br'}",
    "resumo_ia": "Resumo objetivo explicando a situação atual do certame e banca examinadora."
  }
]
\`\`\`
Caso a pesquisa na web não encontre nenhum concurso ou processo seletivo (aberto ou em andamento) para o município, retorne:
\`\`\`json
[]
\`\`\``;

  const timer1 = setTimeout(() => {
    const title = document.getElementById('consultaLoadingTitle');
    const sub = document.getElementById('consultaLoadingSub');
    if (title) title.textContent = 'Varrendo Diários Oficiais & Bancas...';
    if (sub) sub.textContent = 'Buscando publicações na Vunesp, IBAM, Consulplan e portais municipais...';
  }, 2000);

  const timer2 = setTimeout(() => {
    const title = document.getElementById('consultaLoadingTitle');
    const sub = document.getElementById('consultaLoadingSub');
    if (title) title.textContent = 'Auditando Vigência e Prazos...';
    if (sub) sub.textContent = 'Verificando inscrições, convocações de aprovados e links oficiais...';
  }, 4500);

  try {
    const candidateText = await chamarGeminiGrounding(apiKey, prompt);
    clearTimeout(timer1);
    clearTimeout(timer2);

    const parsedItems = extrairJsonConcursos(candidateText);

    if (Array.isArray(parsedItems)) {
      if (parsedItems.length > 0) {
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
      } else {
        // A IA respondeu confirmando que não há certames ativos no critério
        mostrarFeedbackConsulta(
          'Nenhum certame localizado pela IA',
          `A busca online no Google Search apurou os portais e não localizou editais com inscrições abertas ou convocações recentes para <strong>${escapeHtml(cidade)}</strong> com o filtro informado.<br><br>Você pode conferir diretamente no portal de concursos oficial do município:`,
          'info',
          portaisConhecidos?.concursos,
          `Abrir Portal de Concursos de ${cidade}`
        );
        return;
      }
    }

    // Se nenhum formato válido foi identificado
    mostrarFeedbackConsulta(
      'Nenhum certame localizado',
      `Não foram encontradas publicações recentes de concursos ou processos seletivos para <strong>${escapeHtml(cidade)}</strong> com os critérios informados.`,
      'info',
      portaisConhecidos?.concursos,
      `Abrir Portal de Concursos de ${cidade}`
    );
  } catch (err) {
    clearTimeout(timer1);
    clearTimeout(timer2);
    console.warn('[Consulta Gemini Grounding] Erro:', err);
    mostrarFeedbackConsulta(
      'Falha na Comunicação',
      `Não foi possível concluir a busca online no momento. Detalhe: ${escapeHtml(err.message || 'Erro de rede ou chave API')}. Verifique sua conexão e a chave Gemini API em Ajustes.`,
      'error'
    );
  }
}

// Extrai array JSON de forma blindada contra notas de rodapé de busca [1], [2] ou markdown
export function extrairJsonConcursos(text) {
  if (!text) return null;

  // 1. Tenta extrair de blocos ```json ... ``` ou ``` ... ```
  const codeBlockMatch = text.match(/```(?:json)?\s*(\[\s*[\s\S]*?\])\s*```/i);
  if (codeBlockMatch && codeBlockMatch[1]) {
    try {
      const parsed = JSON.parse(codeBlockMatch[1]);
      if (Array.isArray(parsed)) return parsed;
    } catch (e) {}
  }

  // 2. Procura pelo início de um array com objetos: [ { ... } ]
  // A regex /\[\s*\{/ ignora notas de rodapé como [1] ou [fonte]
  const sIdx = text.search(/\[\s*\{/);
  if (sIdx !== -1) {
    let profundidade = 0;
    let fimReal = -1;
    let emString = false;
    let escape = false;

    for (let i = sIdx; i < text.length; i++) {
      const char = text[i];
      if (escape) {
        escape = false;
        continue;
      }
      if (char === '\\') {
        escape = true;
        continue;
      }
      if (char === '"') {
        emString = !emString;
        continue;
      }
      if (!emString) {
        if (char === '[') profundidade++;
        else if (char === ']') {
          profundidade--;
          if (profundidade === 0) {
            fimReal = i;
            break;
          }
        }
      }
    }

    if (fimReal !== -1) {
      try {
        const candidate = text.substring(sIdx, fimReal + 1);
        const parsed = JSON.parse(candidate);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {}
    }
  }

  // 3. Verifica se retornou array vazio []
  if (/\[\s*\]/.test(text)) {
    return [];
  }

  // 4. Fallback de emergência para objetos individuais
  const regexObjetos = /\{[^{}]*"cidade"[^{}]*"titulo"[^{}]*\}/g;
  const matches = text.match(regexObjetos);
  if (matches && matches.length > 0) {
    const items = [];
    for (const m of matches) {
      try {
        items.push(JSON.parse(m));
      } catch (e) {}
    }
    if (items.length > 0) return items;
  }

  return null;
}

const MODELOS_PADRAO = [
  'gemini-3.5-flash-lite',
  'gemini-3.5-flash',
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-1.5-flash'
];

let cacheModelos = null;

// Descobre dinamicamente os modelos disponíveis na conta ou usa padrão moderno direto
async function obterModelosGemini(apiKey) {
  if (cacheModelos && cacheModelos.length > 0) {
    return cacheModelos;
  }
  return MODELOS_PADRAO;
}

// Executa a chamada à API Gemini testando modelos com suporte a Search Grounding
async function chamarGeminiGrounding(apiKey, prompt) {
  const modelos = await obterModelosGemini(apiKey);
  let ultimoErro = null;

  for (const modelo of modelos) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent?key=${apiKey}`;
      
      // Tenta inicialmente com Google Search Grounding e baixa temperatura para resposta mais rápida
      let response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          tools: [{ google_search: {} }],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 2048
          }
        })
      });

      // Se retornar 400 (banco de ferramentas não suportado pelo modelo específico), tenta sem tools
      if (!response.ok && response.status === 400) {
        response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.2,
              maxOutputTokens: 2048
            }
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

function mostrarFeedbackConsulta(titulo, mensagem, tipo = 'info', linkPortal = null, textoPortal = null) {
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
        ${linkPortal ? `
          <a href="${escapeHtml(linkPortal)}" target="_blank" rel="noopener noreferrer" class="btn-card-action primary" style="text-decoration: none; margin-top: 4px; padding: 8px 14px; gap: 6px;">
            <i data-lucide="external-link" style="width: 14px; height: 14px;"></i>
            <span>${escapeHtml(textoPortal || 'Acessar Portal de Concursos')}</span>
          </a>
        ` : ''}
        <button type="button" class="btn-card-action" onclick="window.radarActions.resetarFormularioConsulta()" style="margin-top: 6px;">
          <i data-lucide="arrow-left" style="width: 14px; height: 14px;"></i>
          <span>Voltar ao Formulário</span>
        </button>
      </div>
    `;
    if (window.lucide) window.lucide.createIcons();
  }
}
