// js/state.js — Gerenciador de Estado Local-First com Validador Anti-Anacronismo

import { PORTAIS_CIDADES } from './portais.js';

export const state = {
  concursos: [],
  acompanhados: [],
  filtroTab: 'todos',
  filtroCidade: '',
  filtroTexto: '',
  config: {
    supabaseUrl: 'https://vbnzvyxhfnsmbmgxahvn.supabase.co',
    supabaseKey: '',
    geminiKey: ''
  },
  modalStack: [],
  supabase: null,
  isOnline: false
};

const CACHE_KEY = 'radar_concursos_cache_v5';

const DADOS_INICIAIS = [
  {
    id: "catanduva_ibam_apoio_escolar_2026",
    cidade: "Catanduva",
    orgao: "Prefeitura Municipal de Catanduva",
    titulo: "Processo Seletivo 2026 — Profissional de Apoio Escolar (66 Vagas)",
    status: "Edital Aberto",
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
    titulo: "Concurso Público 01/2025 — Quadro Geral da Prefeitura (506 Vagas)",
    status: "Em Andamento (Recursos / Gabarito)",
    cargos: ["Agente Administrativo", "Assistente de Licitação", "Fiscal de Posturas", "Técnico em Enfermagem", "Analista"],
    areas: ["Administrativo", "Licitações", "Fiscal", "Saúde"],
    salario_resumo: "R$ 2.400,00 a R$ 10.500,00",
    prazo_inscricao: "Inscrições encerradas • Provas aplicadas • Fase de Classificação Prévia e Recursos",
    link_oficial: "https://www.vunesp.com.br",
    resumo_ia: "Grande concurso organizado pela Fundação Vunesp com 506 vagas imediatas. As provas já foram realizadas; certame atualmente na fase de publicação de notas e análise de recursos dos candidatos.",
    updated_at: new Date().toISOString()
  },
  {
    id: "sao_jose_do_rio_preto_gcm_previsao",
    cidade: "São José do Rio Preto",
    orgao: "Prefeitura Municipal de São José do Rio Preto",
    titulo: "Guarda Civil Municipal (GCM) — Novo Concurso em Estudos",
    status: "Previsto",
    cargos: ["Guarda Civil Municipal - 3ª Classe", "Segurança Urbana"],
    areas: ["Segurança", "Operacional"],
    salario_resumo: "R$ 2.897,00 + adicionais e benefícios",
    prazo_inscricao: "Planejamento e estudos para novo edital de expansão",
    link_oficial: "https://www.riopreto.sp.gov.br/concursos",
    resumo_ia: "O último concurso de GCM ocorreu em 2024 pela Fundação Vunesp (edital de 2024 já encerrado/em convocação). A administração municipal de Rio Preto estuda novo certame para recomposição e ampliação do efetivo.",
    updated_at: new Date().toISOString()
  },
  {
    id: "potirendaba_concurso_001_2026",
    cidade: "Potirendaba",
    orgao: "Prefeitura Municipal de Potirendaba",
    titulo: "Concurso Público 001/2026 — Quadro Geral e Específico",
    status: "Em Andamento (Recursos / Gabarito)",
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
    titulo: "Concurso Público Autárquico — Quadro Operacional e Compras",
    status: "Edital Aberto",
    cargos: ["Comprador", "Agente Administrativo", "Operador de ETA", "Técnico Químico"],
    areas: ["Administrativo", "Licitações", "Operacional"],
    salario_resumo: "R$ 2.450,00 a R$ 5.120,00",
    prazo_inscricao: "Inscrições vigentes até fim do mês no portal oficial",
    link_oficial: "https://www.mirassol.sp.gov.br/concursos",
    resumo_ia: "Concurso para cargos efetivos da autarquia municipal com prova objetiva prevista para os próximos 60 dias.",
    updated_at: new Date().toISOString()
  }
];

// Sanitizador rigoroso para corrigir anacronismos e links quebrados
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

  // 2. Correção de Link Oficial (Garante que o link funcione e não seja 404):
  const cidade = item.cidade || '';
  const portais = PORTAIS_CIDADES[cidade];
  const url = (item.link_oficial || '').trim();

  const isLinkInvalido = !url || 
    url.includes('example.com') || 
    url.endsWith('/licitacoes') || 
    url.endsWith('/concursos') ||
    url.includes('google.com/search');

  if (isLinkInvalido && portais) {
    item.link_oficial = portais.concursos || portais.site;
  }

  return item;
}

export function carregarDadosLocais() {
  const conc = localStorage.getItem(CACHE_KEY);
  const acomp = localStorage.getItem('radar_acompanhados');
  const url = localStorage.getItem('radar_supabase_url');
  const sKey = localStorage.getItem('radar_supabase_key');
  const gKey = localStorage.getItem('radar_gemini_key');

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

  salvarLocal();
}

export function salvarLocal() {
  localStorage.setItem(CACHE_KEY, JSON.stringify(state.concursos));
  localStorage.setItem('radar_acompanhados', JSON.stringify(state.acompanhados));
  if (state.config.supabaseUrl) localStorage.setItem('radar_supabase_url', state.config.supabaseUrl);
  if (state.config.supabaseKey) localStorage.setItem('radar_supabase_key', state.config.supabaseKey);
  if (state.config.geminiKey) localStorage.setItem('radar_gemini_key', state.config.geminiKey);
}
