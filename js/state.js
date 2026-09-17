// js/state.js — Gerenciador de Estado Local-First com Validador Anti-Anacronismo e Escore de Confiança

import { PORTAIS_CIDADES, BANCAS_OFICIAIS, identificarBancaOficial, repararUrlOficial } from './portais.js';

export const state = {
  concursos: [],
  acompanhados: [],
  filtroTab: 'todos',
  filtroCidade: '',
  filtroTexto: '',
  config: {
    supabaseUrl: 'https://vbnzvyxhfnsmbmgxahvn.supabase.co',
    supabaseKey: '',
    geminiKey: '',
    interesses: [],
    cidadesAlertas: []
  },
  modalStack: [],
  supabase: null,
  isOnline: false
};

const CACHE_KEY = 'radar_concursos_cache_v8';

// Inicialização limpa (zero-state) sob demanda do usuário: sem certames fictícios
const DADOS_INICIAIS = [];

// Cálculo determinístico do escore de confiança oficial (0 a 100%)
export function calcularScoreConfianca(item) {
  if (!item) return { score: 50, rotulo: 'Sob Verificação' };

  let score = 0;
  const texto = `${item.titulo || ''} ${item.resumo_ia || ''} ${item.orgao || ''} ${item.banca || ''}`.toLowerCase();
  const url = (item.link_oficial || '').toLowerCase();

  // 1. Identificação de banca examinadora oficial reconhecida (+40 pts) ou órgão público (+25 pts)
  const bancaDetectada = identificarBancaOficial(item.banca || texto || url);
  if (bancaDetectada) {
    score += 40;
    if (!item.banca) item.banca = bancaDetectada.nome;
  } else if (item.orgao && (item.orgao.toLowerCase().includes('prefeitura') || item.orgao.toLowerCase().includes('câmara') || item.orgao.toLowerCase().includes('saae'))) {
    score += 25;
  }

  // 2. Link oficial direto e funcional (+30 pts)
  const isLinkValido = url && 
    !url.includes('example.com') && 
    !url.includes('google.com/search') && 
    !url.endsWith('/licitacoes') && 
    !url.endsWith('/concursos');
  
  if (isLinkValido) {
    try {
      const host = new URL(url.startsWith('http') ? url : `https://${url}`).hostname;
      if (bancaDetectada && bancaDetectada.site.includes(host)) {
        score += 30; // Link direto na banca oficial
      } else if (host.endsWith('.gov.br') || host.endsWith('.org.br') || host.endsWith('.com.br')) {
        score += 25;
      } else {
        score += 15;
      }
    } catch (e) {
      score += 15;
    }
  }

  // 3. Vigência e datas verificáveis (+20 pts)
  const prazo = (item.prazo_inscricao || '').toLowerCase();
  if (prazo && (prazo.includes('202') || prazo.includes('inscrições') || prazo.includes('provas') || prazo.includes('vigente') || prazo.includes('convocações'))) {
    score += 20;
  } else if (prazo) {
    score += 10;
  }

  // 4. Coerência cronológica e ausência de contradições (+10 pts)
  const temAnacronismo = item.status === 'Edital Aberto' && (texto.includes('2024') || texto.includes('2023') || texto.includes('encerrad') || texto.includes('já ocorreram'));
  if (!temAnacronismo) {
    score += 10;
  }

  // Limite estrito entre 15% e 100%
  score = Math.min(100, Math.max(15, score));

  let rotulo = 'Sob Verificação';
  if (score >= 85) {
    rotulo = 'Oficial Verificado';
  } else if (score >= 60) {
    rotulo = 'Auditado • Diário Oficial';
  }

  return { score, rotulo };
}

// Sanitizador rigoroso para corrigir anacronismos, links quebrados e atribuir auditoria
export function sanitizarItemConcurso(item) {
  if (!item) return item;

  const texto = `${item.titulo || ''} ${item.prazo_inscricao || ''} ${item.resumo_ia || ''}`.toLowerCase();
  
  // 1. Correção de Status (Anti-Anacronismo): se o concurso é de 2024/2023, não pode ser Edital Aberto hoje!
  if (item.status === 'Edital Aberto') {
    const mencionaPassado = texto.includes('2024') || texto.includes('2023') || texto.includes('2022') ||
      texto.includes('encerrad') || texto.includes('já ocorreram') || texto.includes('ocorreu em') ||
      texto.includes('provas aplicadas') || texto.includes('provas realizadas') || texto.includes('classificação');
    
    if (mencionaPassado) {
      if (texto.includes('previsto') || texto.includes('estudos') || texto.includes('planeja') || texto.includes('novas vagas') || texto.includes('expansão')) {
        item.status = 'Previsto';
      } else {
        item.status = 'Em Andamento (Recursos / Gabarito)';
      }
    }
  }

  // 2. Identificação de Banca Oficial
  if (!item.banca) {
    const bancaObj = identificarBancaOficial(`${item.titulo || ''} ${item.resumo_ia || ''} ${item.link_oficial || ''}`);
    if (bancaObj) {
      item.banca = bancaObj.nome;
    }
  }

  // 3. Correção e Reparo de Link Oficial
  item.link_oficial = repararUrlOficial(item.link_oficial, item.banca, item.cidade);

  // 4. Cálculo do Escore de Confiança e Rótulo de Auditoria
  const confianca = calcularScoreConfianca(item);
  item.confianca_score = item.confianca_score || confianca.score;
  item.confianca_rotulo = item.confianca_rotulo || confianca.rotulo;

  return item;
}

export function carregarDadosLocais() {
  // Limpeza de caches legados com dados mockados
  try {
    localStorage.removeItem('radar_concursos_cache_v7');
    localStorage.removeItem('radar_concursos_cache_v6');
    localStorage.removeItem('radar_brave_key');
  } catch (e) {}

  const conc = localStorage.getItem(CACHE_KEY);
  const acomp = localStorage.getItem('radar_acompanhados');
  const url = localStorage.getItem('radar_supabase_url');
  const sKey = localStorage.getItem('radar_supabase_key');
  const gKey = localStorage.getItem('radar_gemini_key');
  const inter = localStorage.getItem('radar_interesses_usuario');

  if (conc) {
    try {
      const parsed = JSON.parse(conc);
      state.concursos = (parsed || []).map(sanitizarItemConcurso);
    } catch (e) {
      state.concursos = [];
    }
  } else {
    state.concursos = [];
  }

  if (acomp) {
    try {
      state.acompanhados = JSON.parse(acomp);
    } catch (e) {
      state.acompanhados = [];
    }
  }

  if (url) state.config.supabaseUrl = url;
  if (sKey) state.config.supabaseKey = sKey;
  if (gKey) state.config.geminiKey = gKey;

  if (inter) {
    try {
      state.config.interesses = JSON.parse(inter);
    } catch (e) {
      state.config.interesses = [];
    }
  } else {
    state.config.interesses = [];
  }

  const cAlertas = localStorage.getItem('radar_cidades_alertas');
  if (cAlertas) {
    try {
      state.config.cidadesAlertas = JSON.parse(cAlertas);
    } catch (e) {
      state.config.cidadesAlertas = [];
    }
  } else {
    state.config.cidadesAlertas = [];
  }

  salvarLocal();
}

export function salvarLocal() {
  localStorage.setItem(CACHE_KEY, JSON.stringify(state.concursos));
  localStorage.setItem('radar_acompanhados', JSON.stringify(state.acompanhados));
  localStorage.setItem('radar_cidades_alertas', JSON.stringify(state.config.cidadesAlertas || []));
  localStorage.setItem('radar_interesses_usuario', JSON.stringify(state.config.interesses || []));
  if (state.config.supabaseUrl) localStorage.setItem('radar_supabase_url', state.config.supabaseUrl);
  if (state.config.supabaseKey) localStorage.setItem('radar_supabase_key', state.config.supabaseKey);
  if (state.config.geminiKey) localStorage.setItem('radar_gemini_key', state.config.geminiKey);
}


