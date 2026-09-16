// js/state.js — Gerenciador de Estado Local-First (Padrão Casa do Sagrado)

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

const DADOS_INICIAIS = [
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
    id: "catanduva_prefeitura_concurso_01",
    cidade: "Catanduva",
    orgao: "Prefeitura Municipal de Catanduva",
    titulo: "Concurso Público — Diversos Cargos Administrativos e Saúde",
    status: "Edital Aberto",
    cargos: ["Assistente de Licitação", "Agente Administrativo", "Fiscal Tributário", "Enfermeiro", "Analista de TI"],
    areas: ["Administrativo", "Licitações", "Saúde", "TI"],
    salario_resumo: "R$ 2.850,00 a R$ 8.420,00",
    prazo_inscricao: "Inscrições abertas no portal oficial da banca",
    link_oficial: "https://www.catanduva.sp.gov.br/concursos-e-processos-seletivos/",
    resumo_ia: "Edital publicado pela banca Vunesp. Excelente oportunidade para atuar na área de compras governamentais sob a égide da Lei 14.133/21.",
    updated_at: new Date().toISOString()
  },
  {
    id: "sao_jose_do_rio_preto_guarda_civil",
    cidade: "São José do Rio Preto",
    orgao: "Prefeitura Municipal de São José do Rio Preto",
    titulo: "Concurso Guarda Civil Municipal & Agente de Fiscalização",
    status: "Previsto",
    cargos: ["Guarda Civil Municipal", "Fiscal de Posturas", "Agente de Trânsito"],
    areas: ["Segurança", "Fiscal"],
    salario_resumo: "R$ 3.500,00 a R$ 5.800,00 + adicionais",
    prazo_inscricao: "Comissão organizadora instituída em Diário Oficial",
    link_oficial: "https://diariooficial.riopreto.sp.gov.br",
    resumo_ia: "Publicação preliminar de autorização no Diário Oficial. Previsão de mais de 80 vagas imediatas e cadastro de reserva.",
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
    prazo_inscricao: "Inscrições vigentes até fim do mês",
    link_oficial: "https://www.mirassol.sp.gov.br/concursos",
    resumo_ia: "Concurso para cargos efetivos da autarquia municipal com prova objetiva prevista para os próximos 60 dias.",
    updated_at: new Date().toISOString()
  }
];

export function carregarDadosLocais() {
  const conc = localStorage.getItem('radar_concursos_cache');
  const acomp = localStorage.getItem('radar_acompanhados');
  const url = localStorage.getItem('radar_supabase_url');
  const sKey = localStorage.getItem('radar_supabase_key');
  const gKey = localStorage.getItem('radar_gemini_key');

  if (conc) {
    try {
      state.concursos = JSON.parse(conc);
    } catch (e) {
      state.concursos = DADOS_INICIAIS;
    }
  } else {
    state.concursos = DADOS_INICIAIS;
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
  localStorage.setItem('radar_concursos_cache', JSON.stringify(state.concursos));
  localStorage.setItem('radar_acompanhados', JSON.stringify(state.acompanhados));
  if (state.config.supabaseUrl) localStorage.setItem('radar_supabase_url', state.config.supabaseUrl);
  if (state.config.supabaseKey) localStorage.setItem('radar_supabase_key', state.config.supabaseKey);
  if (state.config.geminiKey) localStorage.setItem('radar_gemini_key', state.config.geminiKey);
}
