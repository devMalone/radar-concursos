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

let cacheModelosValidos = null;

export function resetarCacheModelos() {
  cacheModelosValidos = null;
}

// Testa a chave Gemini do usuário diretamente na interface com feedback detalhado
export async function testarChaveGemini(apiKeyManual = null) {
  const statusEl = document.getElementById('geminiTestStatus');
  const btnTestar = document.getElementById('btnTestarGemini');
  
  // 1. Obtém e limpa a chave
  const inputEl = document.getElementById('cfgGeminiKey');
  let rawKey = '';
  if (apiKeyManual !== null && apiKeyManual !== undefined) {
    rawKey = apiKeyManual;
  } else if (inputEl && inputEl.value) {
    rawKey = inputEl.value;
  } else if (state.config.geminiKey) {
    rawKey = state.config.geminiKey;
  }
  const apiKey = (rawKey || '').trim().replace(/^["']|["']$/g, '');

  if (!apiKey) {
    if (statusEl) {
      statusEl.style.display = 'block';
      statusEl.innerHTML = `
        <div style="background: rgba(239, 68, 68, 0.12); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 8px; padding: 10px 12px; color: #fca5a5; font-size: 12px; display: flex; gap: 8px; align-items: flex-start;">
          <i data-lucide="alert-triangle" style="width: 16px; height: 16px; flex-shrink: 0; color: #ef4444; margin-top: 1px;"></i>
          <span>Por favor, insira sua <strong>Gemini API Key</strong> no campo acima antes de testar.</span>
        </div>
      `;
      if (window.lucide) window.lucide.createIcons();
    }
    mostrarToast('Insira a chave da Gemini API antes de testar.', 'error');
    return false;
  }

  // 2. Salva imediatamente no estado e no localStorage
  state.config.geminiKey = apiKey;
  localStorage.setItem('radar_gemini_key', apiKey);
  resetarCacheModelos();

  // 3. Feedback visual de carregamento
  if (btnTestar) {
    btnTestar.disabled = true;
    btnTestar.innerHTML = `<i data-lucide="loader-2" class="spin" style="width: 14px; height: 14px;"></i><span>Consultando Google AI...</span>`;
    if (window.lucide) window.lucide.createIcons();
  }
  if (statusEl) {
    statusEl.style.display = 'block';
    statusEl.innerHTML = `
      <div style="background: rgba(59, 130, 246, 0.1); border: 1px solid rgba(59, 130, 246, 0.25); border-radius: 8px; padding: 10px 12px; color: #93c5fd; font-size: 12px; display: flex; gap: 8px; align-items: center;">
        <i data-lucide="loader-2" class="spin" style="width: 16px; height: 16px; flex-shrink: 0; color: #60a5fa;"></i>
        <span>Consultando catálogo de modelos autorizados na sua chave Google...</span>
      </div>
    `;
    if (window.lucide) window.lucide.createIcons();
  }

  try {
    // 4. Executa ListModels em v1beta e v1
    const modelosUnicos = [];
    const nomesVistos = new Set();
    let ultimoErro = null;

    for (const apiVer of ['v1beta', 'v1']) {
      try {
        const res = await fetch(`https://generativelanguage.googleapis.com/${apiVer}/models?key=${apiKey}`);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.models)) {
            for (const m of data.models) {
              const methods = m.supportedGenerationMethods || [];
              if (methods.includes('generateContent')) {
                const cleanName = m.name.replace(/^models\//, '');
                if (!nomesVistos.has(cleanName)) {
                  nomesVistos.add(cleanName);
                  modelosUnicos.push({ apiVer, name: cleanName });
                }
              }
            }
          }
        } else {
          const errBody = await res.text();
          let msg = `HTTP ${res.status}`;
          try {
            const j = JSON.parse(errBody);
            if (j?.error?.message) msg = j.error.message;
          } catch (_) {}
          ultimoErro = msg;
        }
      } catch (err) {
        ultimoErro = err.message || 'Falha de conexão';
      }
    }

    if (modelosUnicos.length === 0) {
      throw new Error(ultimoErro ? `Google API: ${ultimoErro}` : 'Nenhum modelo compatível com geração de conteúdo foi encontrado para esta chave.');
    }

    // Prioriza modelos flash rápidos e modernos
    modelosUnicos.sort((a, b) => {
      const score = (m) => {
        const n = m.name.toLowerCase();
        if (n.includes('flash') && (n.includes('2.0') || n.includes('2.5') || n.includes('3.5'))) return 100;
        if (n.includes('flash')) return 90;
        if (n.includes('pro')) return 50;
        return 10;
      };
      return score(b) - score(a);
    });

    // 5. Teste rápido de geração com o primeiro modelo
    const modeloTeste = modelosUnicos[0];
    if (statusEl) {
      statusEl.innerHTML = `
        <div style="background: rgba(59, 130, 246, 0.1); border: 1px solid rgba(59, 130, 246, 0.25); border-radius: 8px; padding: 10px 12px; color: #93c5fd; font-size: 12px; display: flex; gap: 8px; align-items: center;">
          <i data-lucide="loader-2" class="spin" style="width: 16px; height: 16px; flex-shrink: 0; color: #60a5fa;"></i>
          <span>Modelos encontrados! Testando geração com <strong>${escapeHtml(modeloTeste.name)}</strong>...</span>
        </div>
      `;
      if (window.lucide) window.lucide.createIcons();
    }

    const testRes = await fetch(`https://generativelanguage.googleapis.com/${modeloTeste.apiVer}/models/${modeloTeste.name}:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: 'OK' }] }],
        generationConfig: { maxOutputTokens: 5 }
      })
    });

    if (!testRes.ok) {
      const errBody = await testRes.text();
      let msg = `HTTP ${testRes.status}`;
      try {
        const j = JSON.parse(errBody);
        if (j?.error?.message) msg = j.error.message;
      } catch (_) {}
      throw new Error(`Falha no teste com ${modeloTeste.name}: ${msg}`);
    }

    // Armazena no cache de modelos validados para buscas instantâneas
    cacheModelosValidos = modelosUnicos;

    const listaExibicao = modelosUnicos.slice(0, 4).map(m => m.name).join(', ');
    if (statusEl) {
      statusEl.innerHTML = `
        <div style="background: rgba(34, 197, 94, 0.12); border: 1px solid rgba(34, 197, 94, 0.3); border-radius: 8px; padding: 10px 12px; color: #86efac; font-size: 12px; display: flex; flex-direction: column; gap: 5px;">
          <div style="display: flex; gap: 8px; align-items: center; font-weight: 700;">
            <i data-lucide="check-circle-2" style="width: 16px; height: 16px; flex-shrink: 0; color: #22c55e;"></i>
            <span>Chave Gemini validada e ativa com sucesso!</span>
          </div>
          <div style="color: #cbd5e1; font-size: 11px; line-height: 1.4;">
            <strong>Modelo Selecionado:</strong> ${escapeHtml(modeloTeste.name)} (${modeloTeste.apiVer})<br>
            <strong>Modelos Autorizados:</strong> ${escapeHtml(listaExibicao)}${modelosUnicos.length > 4 ? '...' : ''}
          </div>
        </div>
      `;
      if (window.lucide) window.lucide.createIcons();
    }
    mostrarToast(`Chave Gemini OK! Modelo ativo: ${modeloTeste.name}`, 'success');
    return true;

  } catch (err) {
    console.warn('[Teste Gemini] Erro:', err);
    if (statusEl) {
      statusEl.innerHTML = `
        <div style="background: rgba(239, 68, 68, 0.12); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 8px; padding: 10px 12px; color: #fca5a5; font-size: 12px; display: flex; flex-direction: column; gap: 5px;">
          <div style="display: flex; gap: 8px; align-items: center; font-weight: 700;">
            <i data-lucide="alert-triangle" style="width: 16px; height: 16px; flex-shrink: 0; color: #ef4444;"></i>
            <span>Falha ao validar chave Gemini</span>
          </div>
          <span style="font-size: 11.5px; color: #cbd5e1; line-height: 1.4;">${escapeHtml(err.message)}</span>
          <span style="font-size: 11px; color: #94a3b8; margin-top: 2px;">
            Obtenha uma chave gratuita válida no <a href="https://aistudio.google.com" target="_blank" rel="noopener noreferrer" style="color: #60a5fa; text-decoration: underline;">Google AI Studio</a>.
          </span>
        </div>
      `;
      if (window.lucide) window.lucide.createIcons();
    }
    mostrarToast(`Erro na chave: ${err.message}`, 'error');
    return false;
  } finally {
    if (btnTestar) {
      btnTestar.disabled = false;
      btnTestar.innerHTML = `<i data-lucide="activity" style="width: 14px; height: 14px;"></i><span>Testar Chave Gemini</span>`;
      if (window.lucide) window.lucide.createIcons();
    }
  }
}

// Consulta o ListModels oficial do Google em v1beta e v1 para descobrir os modelos reais da chave
async function obterModelosValidos(apiKey) {
  if (cacheModelosValidos && cacheModelosValidos.length > 0) {
    return cacheModelosValidos;
  }

  const modelos = [];
  const nomesVistos = new Set();
  let erroAutenticacao = null;

  for (const apiVer of ['v1beta', 'v1']) {
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/${apiVer}/models?key=${apiKey}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.models) && data.models.length > 0) {
          for (const m of data.models) {
            const methods = m.supportedGenerationMethods || [];
            if (methods.includes('generateContent')) {
              const cleanName = m.name.replace(/^models\//, '');
              if (!nomesVistos.has(cleanName)) {
                nomesVistos.add(cleanName);
                modelos.push({ apiVer, name: cleanName });
              }
            }
          }
        }
      } else {
        const errText = await res.text();
        console.warn(`[ListModels ${apiVer}] HTTP ${res.status}:`, errText);
        if (res.status === 400 || res.status === 403) {
          try {
            const errJson = JSON.parse(errText);
            if (errJson?.error?.message) {
              erroAutenticacao = `Google API (${res.status}): ${errJson.error.message}`;
            }
          } catch (_) {}
        }
      }
    } catch (e) {
      console.warn(`[ListModels ${apiVer}] Exceção:`, e);
    }
  }

  // Se a chave for comprovadamente inválida / sem permissão na Google API
  if (modelos.length === 0 && erroAutenticacao) {
    throw new Error(erroAutenticacao);
  }

  if (modelos.length > 0) {
    // Prioriza modelos rápidos e inteligentes
    modelos.sort((a, b) => {
      const score = (m) => {
        const n = m.name.toLowerCase();
        if (n.includes('flash') && (n.includes('2.0') || n.includes('2.5') || n.includes('3.5'))) return 100;
        if (n.includes('flash')) return 90;
        if (n.includes('pro')) return 50;
        return 10;
      };
      return score(b) - score(a);
    });

    cacheModelosValidos = modelos;
    return modelos;
  }

  // Fallback seguro caso a listagem não responda (sem modelos com 404 em v1beta)
  return [
    { apiVer: 'v1beta', name: 'gemini-2.0-flash' },
    { apiVer: 'v1beta', name: 'gemini-2.0-flash-exp' },
    { apiVer: 'v1', name: 'gemini-1.5-flash' },
    { apiVer: 'v1', name: 'gemini-1.5-pro' },
    { apiVer: 'v1beta', name: 'gemini-1.5-flash-latest' }
  ];
}

// Executa a chamada à API Gemini testando modelos com suporte a Search Grounding
async function chamarGeminiGrounding(apiKey, prompt) {
  const modelos = await obterModelosValidos(apiKey);
  const errosDetalhados = [];

  for (const item of modelos) {
    const { apiVer, name } = item;
    try {
      const url = `https://generativelanguage.googleapis.com/${apiVer}/models/${name}:generateContent?key=${apiKey}`;
      
      const payload = {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 2048
        }
      };

      // Tenta Google Search Grounding se for v1beta
      if (apiVer === 'v1beta') {
        payload.tools = [{ google_search: {} }];
      }

      let response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      // Se retornar 400 com tools no v1beta, tenta sem tools
      if (!response.ok && response.status === 400 && payload.tools) {
        delete payload.tools;
        response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
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
        console.warn(`[Gemini ${name} (${apiVer})] HTTP ${response.status}:`, errBody);
        let msg = `${name}: HTTP ${response.status}`;
        try {
          const jsonErr = JSON.parse(errBody);
          if (jsonErr?.error?.message) {
            msg = `${name}: ${jsonErr.error.message}`;
          }
        } catch (_) {}
        errosDetalhados.push(msg);
      }
    } catch (e) {
      console.warn(`[Gemini ${name}] Exceção:`, e);
      errosDetalhados.push(`${name}: ${e.message}`);
    }
  }

  const resumo = errosDetalhados.slice(0, 2).join(' | ');
  throw new Error(resumo || 'Não foi possível obter resposta dos servidores da IA.');
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
        ${tipo === 'error' ? `
          <button type="button" class="btn-card-action primary" onclick="window.radarActions.irParaAjustesETestarChave()" style="margin-top: 4px; padding: 8px 14px; gap: 6px;">
            <i data-lucide="sliders" style="width: 14px; height: 14px;"></i>
            <span>Verificar Chave em Ajustes</span>
          </button>
        ` : ''}
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
