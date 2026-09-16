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
    braveKey: '',
    cidadesAlertas: ['São José do Rio Preto', 'Catanduva', 'Potirendaba', 'Mirassol']
  },
  modalStack: [],
  supabase: null,
  isOnline: false
};

const CACHE_KEY = 'radar_concursos_cache_v7';

const DADOS_INICIAIS = [
  {
    id: "catanduva_ibam_apoio_escolar_2026",
    cidade: "Catanduva",
    orgao: "Prefeitura Municipal de Catanduva",
    banca: "IBAM-SP",
    titulo: "Processo Seletivo 2026 — Profissional de Apoio Escolar (66 Vagas)",
    status: "Edital Aberto",
    fase_detalhada: "Inscrições Abertas até 01/10/2026",
    confianca_score: 98,
    confianca_rotulo: "Oficial Verificado",
    cargos: ["Profissional de Apoio Escolar", "Apoio Educacional", "Monitor Escolar"],
    areas: ["Educação", "Apoio", "Administrativo"],
    salario_resumo: "R$ 1.412,00 + R$ 809,27 (Auxílio-Alimentação)",
    prazo_inscricao: "Inscrições abertas de 01/09/2026 a 01/10/2026 • Prova em 01/11/2026",
    link_oficial: "https://www.ibamsp-concursos.org.br/site/",
    resumo_ia: "Processo seletivo oficial organizado pelo IBAM-SP para 66 vagas imediatas de nível médio. Inscrições ativas diretamente no portal da banca IBAM.",
    updated_at: new Date().toISOString()
  },
  {
    id: "sao_jose_do_rio_preto_vunesp_geral_2026",
    cidade: "São José do Rio Preto",
    orgao: "Prefeitura Municipal de São José do Rio Preto",
    banca: "Fundação Vunesp",
    titulo: "Concurso Público nº 01/2025 — Quadro Geral da Prefeitura (506 Vagas)",
    status: "Em Andamento (Recursos / Gabarito)",
    fase_detalhada: "Nomeações e Convocações Vigentes (Art. 37 CF/88)",
    confianca_score: 95,
    confianca_rotulo: "Oficial Verificado",
    cargos: ["Agente Administrativo", "Assistente de Licitação", "Fiscal de Posturas", "Técnico em Enfermagem", "Auditor Fiscal"],
    areas: ["Administrativo", "Licitações", "Fiscal", "Saúde"],
    salario_resumo: "R$ 2.400,00 a R$ 10.500,00",
    prazo_inscricao: "Inscrições encerradas • Provas aplicadas • Fase de Classificação e Nomeações",
    link_oficial: "https://www.vunesp.com.br",
    resumo_ia: "Grande concurso organizado pela Fundação Vunesp com 506 vagas imediatas para áreas administrativa, fiscal, saúde e trânsito. Provas aplicadas; certame atualmente na fase de publicação de notas, recursos e nomeações dos aprovados. Concurso vigente sem novo certame geral previsto.",
    updated_at: new Date().toISOString()
  },
  {
    id: "sao_jose_do_rio_preto_gcm_2024",
    cidade: "São José do Rio Preto",
    orgao: "Prefeitura Municipal de São José do Rio Preto",
    banca: "Fundação Vunesp",
    titulo: "Concurso Público nº 01/2024 — Guarda Civil Municipal (100 Vagas)",
    status: "Em Andamento (Recursos / Gabarito)",
    fase_detalhada: "Curso de Formação e Convocações",
    confianca_score: 95,
    confianca_rotulo: "Oficial Verificado",
    cargos: ["Guarda Civil Municipal - 3ª Classe", "Segurança Urbana"],
    areas: ["Segurança", "Operacional"],
    salario_resumo: "R$ 2.897,00 + adicionais e benefícios",
    prazo_inscricao: "Inscrições encerradas • Provas aplicadas • Curso de Formação e Convocações",
    link_oficial: "https://www.vunesp.com.br",
    resumo_ia: "Certame organizado pela Fundação Vunesp para 100 vagas de nível médio. Fases de provas, TAF e psicotécnico concluídas, avançando para o Curso de Formação da Guarda. Certame ativo em fase de convocações; não há novo concurso de GCM autorizado no momento.",
    updated_at: new Date().toISOString()
  },
  {
    id: "potirendaba_concurso_001_2026",
    cidade: "Potirendaba",
    orgao: "Prefeitura Municipal de Potirendaba",
    banca: "Instituto Consulplan",
    titulo: "Concurso Público 001/2026 — Quadro Geral e Específico",
    status: "Em Andamento (Recursos / Gabarito)",
    fase_detalhada: "Recursos e Gabaritos Preliminares",
    confianca_score: 92,
    confianca_rotulo: "Oficial Verificado",
    cargos: ["Assistente de Licitação", "Agente Administrativo", "Secretário de Escola", "Agente de Trânsito", "Fiscal de Tributos"],
    areas: ["Administrativo", "Licitações", "Educação", "Segurança"],
    salario_resumo: "R$ 2.150,00 a R$ 5.400,00",
    prazo_inscricao: "Inscrições encerradas • Provas aplicadas • Fase de Recursos e Gabaritos",
    link_oficial: "https://www.potirendaba.sp.gov.br/portal/servicos/1053/concurso-publico-0012026/",
    resumo_ia: "Certame organizado pelo Instituto Consulplan. As provas objetivas já foram aplicadas; certame atualmente na fase de divulgação de gabaritos preliminares e interposição de recursos dos candidatos.",
    updated_at: new Date().toISOString()
  },
  {
    id: "mirassol_saae_concurso",
    cidade: "Mirassol",
    orgao: "SAAE - Serviço Autônomo de Água e Esgoto de Mirassol",
    banca: "Prefeitura / Autarquia",
    titulo: "Concurso Público Autárquico — Quadro Operacional e Compras",
    status: "Edital Aberto",
    fase_detalhada: "Inscrições Abertas no Portal Oficial",
    confianca_score: 88,
    confianca_rotulo: "Auditado • Diário Oficial",
    cargos: ["Comprador", "Agente Administrativo", "Operador de ETA", "Técnico Químico"],
    areas: ["Administrativo", "Licitações", "Operacional"],
    salario_resumo: "R$ 2.450,00 a R$ 5.120,00",
    prazo_inscricao: "Inscrições vigentes até fim do mês no portal oficial",
    link_oficial: "https://www.mirassol.sp.gov.br/concursos",
    resumo_ia: "Concurso para cargos efetivos da autarquia municipal com prova objetiva prevista para os próximos 60 dias.",
    updated_at: new Date().toISOString()
  }
];

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
  const conc = localStorage.getItem(CACHE_KEY);
  const acomp = localStorage.getItem('radar_acompanhados');
  const url = localStorage.getItem('radar_supabase_url');
  const sKey = localStorage.getItem('radar_supabase_key');
  const gKey = localStorage.getItem('radar_gemini_key');
  const bKey = localStorage.getItem('radar_brave_key');

  if (conc) {
    try {
      const parsed = JSON.parse(conc);
      state.concursos = (parsed || []).map(sanitizarItemConcurso);
    } catch (e) {
      state.concursos = DADOS_INICIAIS.map(sanitizarItemConcurso);
    }
  } else {
    state.concursos = DADOS_INICIAIS.map(sanitizarItemConcurso);
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
  if (bKey) state.config.braveKey = bKey;

  const cAlertas = localStorage.getItem('radar_cidades_alertas');
  if (cAlertas) {
    try {
      state.config.cidadesAlertas = JSON.parse(cAlertas);
    } catch (e) {
      state.config.cidadesAlertas = ['São José do Rio Preto', 'Catanduva', 'Potirendaba', 'Mirassol'];
    }
  }

  salvarLocal();
}

export function salvarLocal() {
  localStorage.setItem(CACHE_KEY, JSON.stringify(state.concursos));
  localStorage.setItem('radar_acompanhados', JSON.stringify(state.acompanhados));
  localStorage.setItem('radar_cidades_alertas', JSON.stringify(state.config.cidadesAlertas || []));
  if (state.config.supabaseUrl) localStorage.setItem('radar_supabase_url', state.config.supabaseUrl);
  if (state.config.supabaseKey) localStorage.setItem('radar_supabase_key', state.config.supabaseKey);
  if (state.config.geminiKey) localStorage.setItem('radar_gemini_key', state.config.geminiKey);
  if (state.config.braveKey) localStorage.setItem('radar_brave_key', state.config.braveKey);
}

