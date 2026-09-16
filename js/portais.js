// js/portais.js — Catálogo de Portais Oficiais & Guia de Municípios

import { gerarSvgBrasao, escapeHtml, abrirModal, refreshIcons } from './utils.js';

export const PORTAIS_CIDADES = {
  "São José do Rio Preto": {
    site: "https://www.riopreto.sp.gov.br",
    diario: "https://diariooficial.riopreto.sp.gov.br",
    concursos: "https://www.riopreto.sp.gov.br/concursos",
    licitacoes: "https://transparencia.riopreto.sp.gov.br"
  },
  "Catanduva": {
    site: "https://www.catanduva.sp.gov.br",
    diario: "https://www.catanduva.sp.gov.br/diario-oficial/",
    concursos: "https://www.catanduva.sp.gov.br/concursos-e-processos-seletivos/",
    licitacoes: "https://www.catanduva.sp.gov.br/licitacoes/"
  },
  "Mirassol": {
    site: "https://www.mirassol.sp.gov.br",
    diario: "https://www.mirassol.sp.gov.br/diario-oficial",
    concursos: "https://www.mirassol.sp.gov.br/concursos",
    licitacoes: "https://www.mirassol.sp.gov.br/licitacoes"
  },
  "Potirendaba": {
    site: "https://www.potirendaba.sp.gov.br",
    diario: "https://www.potirendaba.sp.gov.br/portal/diario-oficial",
    concursos: "https://www.potirendaba.sp.gov.br/portal/servicos/202/concursos-publicos/",
    licitacoes: "https://transparencia.potirendaba.sp.gov.br:879/comprasedital/"
  },
  "Cedral": {
    site: "https://www.cedral.sp.gov.br",
    diario: "https://www.cedral.sp.gov.br/diario-oficial",
    concursos: "https://www.cedral.sp.gov.br/concursos",
    licitacoes: "https://www.cedral.sp.gov.br/licitacoes"
  },
  "Bady Bassitt": {
    site: "https://www.badybassitt.sp.gov.br",
    diario: "https://www.badybassitt.sp.gov.br/diario-oficial",
    concursos: "https://www.badybassitt.sp.gov.br/concursos",
    licitacoes: "https://www.badybassitt.sp.gov.br/licitacoes"
  },
  "Votuporanga": {
    site: "https://www.votuporanga.sp.gov.br",
    diario: "https://www.votuporanga.sp.gov.br/portal/diario-oficial",
    concursos: "https://www.votuporanga.sp.gov.br/portal/concursos",
    licitacoes: "https://www.votuporanga.sp.gov.br/portal/licitacoes"
  },
  "Olímpia": {
    site: "https://www.olimpia.sp.gov.br",
    diario: "https://www.olimpia.sp.gov.br/portal/diario-oficial",
    concursos: "https://www.olimpia.sp.gov.br/portal/concursos",
    licitacoes: "https://www.olimpia.sp.gov.br/portal/licitacoes"
  },
  "Barretos": {
    site: "https://www.barretos.sp.gov.br",
    diario: "https://www.barretos.sp.gov.br/diario-oficial",
    concursos: "https://www.barretos.sp.gov.br/concursos",
    licitacoes: "https://www.barretos.sp.gov.br/licitacoes"
  },
  "Bebedouro": {
    site: "https://www.bebedouro.sp.gov.br",
    diario: "https://www.bebedouro.sp.gov.br/diario-oficial",
    concursos: "https://www.bebedouro.sp.gov.br/concursos",
    licitacoes: "https://www.bebedouro.sp.gov.br/licitacoes"
  },
  "Tanabi": {
    site: "https://www.tanabi.sp.gov.br",
    diario: "https://www.tanabi.sp.gov.br/diario-oficial",
    concursos: "https://www.tanabi.sp.gov.br/concursos",
    licitacoes: "https://www.tanabi.sp.gov.br/licitacoes"
  },
  "Monte Aprazível": {
    site: "https://www.monteaprazivel.sp.gov.br",
    diario: "https://www.monteaprazivel.sp.gov.br/diario-oficial",
    concursos: "https://www.monteaprazivel.sp.gov.br/concursos",
    licitacoes: "https://www.monteaprazivel.sp.gov.br/licitacoes"
  },
  "Fernandópolis": {
    site: "https://www.fernandopolis.sp.gov.br",
    diario: "https://www.fernandopolis.sp.gov.br/diario-oficial",
    concursos: "https://www.fernandopolis.sp.gov.br/concursos",
    licitacoes: "https://www.fernandopolis.sp.gov.br/licitacoes"
  },
  "José Bonifácio": {
    site: "https://www.josebonifacio.sp.gov.br",
    diario: "https://www.josebonifacio.sp.gov.br/diario-oficial",
    concursos: "https://www.josebonifacio.sp.gov.br/concursos",
    licitacoes: "https://www.josebonifacio.sp.gov.br/licitacoes"
  }
};

export const BANCAS_OFICIAIS = {
  "vunesp": {
    nome: "Fundação Vunesp",
    sigla: "Vunesp",
    site: "https://www.vunesp.com.br",
    confiavel: true
  },
  "ibam": {
    nome: "IBAM Concursos",
    sigla: "IBAM-SP",
    site: "https://www.ibamsp-concursos.org.br/site/",
    confiavel: true
  },
  "consulplan": {
    nome: "Instituto Consulplan",
    sigla: "Consulplan",
    site: "https://concurso4.institutoconsulplan.org.br",
    confiavel: true
  },
  "consesp": {
    nome: "Consesp Concursos",
    sigla: "Consesp",
    site: "https://www.consesp.com.br",
    confiavel: true
  },
  "avanca": {
    nome: "Avança SP",
    sigla: "Avança SP",
    site: "https://www.avancasp.org.br",
    confiavel: true
  },
  "fcc": {
    nome: "Fundação Carlos Chagas",
    sigla: "FCC",
    site: "https://www.concursosfcc.com.br",
    confiavel: true
  },
  "cebraspe": {
    nome: "Cebraspe",
    sigla: "Cebraspe",
    site: "https://www.cebraspe.org.br",
    confiavel: true
  },
  "instituto mais": {
    nome: "Instituto Mais",
    sigla: "Inst. Mais",
    site: "https://www.institutomais.org.br",
    confiavel: true
  }
};

export function identificarBancaOficial(texto) {
  if (!texto) return null;
  const t = texto.toLowerCase();
  for (const [chave, banca] of Object.entries(BANCAS_OFICIAIS)) {
    if (t.includes(chave) || t.includes(banca.sigla.toLowerCase()) || t.includes(banca.nome.toLowerCase())) {
      return banca;
    }
  }
  return null;
}

export function repararUrlOficial(urlOriginal, bancaNome, cidade) {
  let url = (urlOriginal || '').trim();

  // Se for URL quebrada ou rota deduzida inexistente
  const isQuebrada = !url || 
    url.includes('example.com') ||
    url.includes('google.com/search') ||
    url.endsWith('/licitacoes') || 
    url.endsWith('/concursos') ||
    url.includes('concurso-2024');

  // Prioriza a banca oficial caso a URL seja genérica ou quebrada
  const banca = identificarBancaOficial(bancaNome || url);
  if (banca && isQuebrada) {
    return banca.site;
  }

  // Fallback para portal da cidade
  if (isQuebrada) {
    const portais = PORTAIS_CIDADES[cidade];
    if (portais) {
      return portais.concursos || portais.site;
    }
  }

  return url;
}

export function renderizarMunicipios() {
  const container = document.getElementById('municipiosList');
  if (!container) return;

  const cidades = Object.keys(PORTAIS_CIDADES);

  container.innerHTML = cidades.map(cidade => {
    const dados = PORTAIS_CIDADES[cidade];
    const brasaoSvg = gerarSvgBrasao(cidade);

    return `
      <div class="municipio-card">
        <div class="municipio-header">
          ${brasaoSvg}
          <div class="municipio-name">${escapeHtml(cidade)}</div>
        </div>
        <div class="municipio-links">
          <a href="${dados.site}" target="_blank" rel="noopener noreferrer" class="municipio-link-item">
            <span>Site Oficial da Prefeitura</span>
            <i data-lucide="external-link" style="width: 14px; height: 14px;"></i>
          </a>
          <a href="${dados.diario}" target="_blank" rel="noopener noreferrer" class="municipio-link-item">
            <span>Diário Oficial Municipal</span>
            <i data-lucide="external-link" style="width: 14px; height: 14px;"></i>
          </a>
          <a href="${dados.concursos}" target="_blank" rel="noopener noreferrer" class="municipio-link-item">
            <span>Portal de Concursos & Editais</span>
            <i data-lucide="external-link" style="width: 14px; height: 14px;"></i>
          </a>
          <a href="${dados.licitacoes}" target="_blank" rel="noopener noreferrer" class="municipio-link-item">
            <span>Licitações & Contratação de Bancas</span>
            <i data-lucide="external-link" style="width: 14px; height: 14px;"></i>
          </a>
        </div>
      </div>
    `;
  }).join('');

  refreshIcons();
}

export function abrirModalPortais(cidade) {
  const dados = PORTAIS_CIDADES[cidade] || {
    site: `https://www.google.com/search?q=prefeitura+${encodeURIComponent(cidade)}+oficial`,
    diario: `https://www.google.com/search?q=diario+oficial+${encodeURIComponent(cidade)}`,
    concursos: `https://www.google.com/search?q=concursos+prefeitura+${encodeURIComponent(cidade)}`,
    licitacoes: `https://www.google.com/search?q=licitacoes+prefeitura+${encodeURIComponent(cidade)}`
  };

  const titleEl = document.getElementById('modalPortaisTitulo');
  if (titleEl) titleEl.innerText = `Portais Oficiais — ${cidade}`;

  const listaEl = document.getElementById('modalPortaisLista');
  if (listaEl) {
    listaEl.innerHTML = `
      <div class="municipio-links">
        <a href="${dados.site}" target="_blank" rel="noopener noreferrer" class="municipio-link-item">
          <div>
            <div style="font-weight: 700; color: var(--text);">Site Oficial da Prefeitura</div>
            <div style="font-size: 11px; color: var(--text-muted);">Portal institucional de ${escapeHtml(cidade)}</div>
          </div>
          <i data-lucide="arrow-up-right" style="width: 16px; height: 16px; color: var(--text-dim);"></i>
        </a>

        <a href="${dados.diario}" target="_blank" rel="noopener noreferrer" class="municipio-link-item">
          <div>
            <div style="font-weight: 700; color: var(--text);">Diário Oficial do Município</div>
            <div style="font-size: 11px; color: var(--text-muted);">Decretos, comissões e autorizações</div>
          </div>
          <i data-lucide="arrow-up-right" style="width: 16px; height: 16px; color: var(--text-dim);"></i>
        </a>

        <a href="${dados.concursos}" target="_blank" rel="noopener noreferrer" class="municipio-link-item">
          <div>
            <div style="font-weight: 700; color: var(--text);">Página Oficial de Concursos</div>
            <div style="font-size: 11px; color: var(--text-muted);">Editais, inscrições e resultados</div>
          </div>
          <i data-lucide="arrow-up-right" style="width: 16px; height: 16px; color: var(--text-dim);"></i>
        </a>

        <a href="${dados.licitacoes}" target="_blank" rel="noopener noreferrer" class="municipio-link-item">
          <div>
            <div style="font-weight: 700; color: var(--text);">Licitações & Contratos</div>
            <div style="font-size: 11px; color: var(--text-muted);">Editais de contratação de bancas</div>
          </div>
          <i data-lucide="arrow-up-right" style="width: 16px; height: 16px; color: var(--text-dim);"></i>
        </a>
      </div>
    `;
  }

  abrirModal('modalPortais');
}
