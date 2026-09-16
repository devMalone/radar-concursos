// js/radar.js — Renderização dos Cards de Concurso, Filtros & Plano de Estudos

import { state, salvarLocal } from './state.js';
import { gerarSvgBrasao, escapeHtml, abrirModal, fecharModal, mostrarToast, refreshIcons } from './utils.js';
import { abrirModalPortais } from './portais.js';

let planoAtual = null;

export function getStatusBadgeClass(status) {
  const s = (status || '').toLowerCase();
  if (s.includes('aberto')) return 'status-aberto';
  if (s.includes('licita')) return 'status-licit';
  if (s.includes('previsto')) return 'status-prev';
  if (s.includes('canc') || s.includes('susp')) return 'status-canc';
  if (
    s.includes('andamento') || 
    s.includes('recurso') || 
    s.includes('resultado') || 
    s.includes('gabarito') || 
    s.includes('encerrad') || 
    s.includes('convoca') || 
    s.includes('formação') || 
    s.includes('classifica') || 
    s.includes('vigente')
  ) {
    return 'status-andamento';
  }
  return 'status-prev';
}

export function filtrarConcursos(apenasAcompanhados = false) {
  return state.concursos.filter(c => {
    if (apenasAcompanhados) {
      if (!state.acompanhados.includes(c.id)) return false;
    }

    if (state.filtroTexto) {
      const termo = `${c.cidade} ${c.orgao} ${c.titulo} ${(c.cargos || []).join(' ')} ${(c.areas || []).join(' ')} ${c.resumo_ia || ''}`.toLowerCase();
      if (!termo.includes(state.filtroTexto)) return false;
    }

    if (state.filtroCidade && c.cidade !== state.filtroCidade) {
      return false;
    }

    if (!apenasAcompanhados && state.filtroTab !== 'todos') {
      const s = (c.status || '').toLowerCase();
      const tab = state.filtroTab.toLowerCase();
      if (tab === 'andamento') {
        if (
          !s.includes('andamento') && 
          !s.includes('recurso') && 
          !s.includes('resultado') && 
          !s.includes('gabarito') && 
          !s.includes('encerrad') &&
          !s.includes('convoca') &&
          !s.includes('formação') &&
          !s.includes('classifica') &&
          !s.includes('vigente')
        ) {
          return false;
        }
      } else if (!s.includes(tab)) {
        return false;
      }
    }

    return true;
  });
}

export function renderizarRadar() {
  // Atualiza badge na navegação inferior
  const navBadge = document.getElementById('countAcompanhadosNav');
  if (navBadge) {
    const count = state.acompanhados.length;
    navBadge.textContent = count;
    navBadge.style.display = count > 0 ? 'inline-block' : 'none';
  }

  // Renderiza lista principal de concursos
  const listaRadar = document.getElementById('concursosList');
  if (listaRadar) {
    const itens = filtrarConcursos(false);
    listaRadar.innerHTML = renderizarListaCards(itens, false);
  }

  // Renderiza lista da aba de Acompanhados
  const listaAcomp = document.getElementById('acompanhadosList');
  if (listaAcomp) {
    const itensAcomp = filtrarConcursos(true);
    listaAcomp.innerHTML = renderizarListaCards(itensAcomp, true);
  }

  refreshIcons();
}

export function calcularEtapaConcurso(status, fase, texto) {
  const t = `${status || ''} ${fase || ''} ${texto || ''}`.toLowerCase();
  if (t.includes('convoca') || t.includes('nomea') || t.includes('formação') || t.includes('vigente') || t.includes('posse')) return 5;
  if (t.includes('recurso') || t.includes('gabarito') || t.includes('classifica') || t.includes('resultado') || t.includes('homologa')) return 4;
  if (t.includes('prova aplicada') || t.includes('provas aplicadas') || t.includes('provas realizadas') || t.includes('dia da prova')) return 3;
  if ((status || '').toLowerCase().includes('aberto') || t.includes('inscrições abertas') || t.includes('inscrição aberta')) return 2;
  return 1;
}

export function renderTimelineStepper(c) {
  const step = calcularEtapaConcurso(c.status, c.fase_detalhada, `${c.titulo} ${c.prazo_inscricao} ${c.resumo_ia}`);
  
  return `
    <div class="timeline-stepper" title="Etapa Oficial do Concurso">
      <div class="step-node ${step >= 1 ? 'done' : ''} ${step === 1 ? 'current' : ''}">
        <span class="step-dot"></span>
        <span class="step-label">Edital</span>
      </div>
      <div class="step-line ${step >= 2 ? 'done' : ''}"></div>
      <div class="step-node ${step >= 2 ? 'done' : ''} ${step === 2 ? 'current' : ''}">
        <span class="step-dot"></span>
        <span class="step-label">Inscrições</span>
      </div>
      <div class="step-line ${step >= 3 ? 'done' : ''}"></div>
      <div class="step-node ${step >= 3 ? 'done' : ''} ${step === 3 ? 'current' : ''}">
        <span class="step-dot"></span>
        <span class="step-label">Provas</span>
      </div>
      <div class="step-line ${step >= 4 ? 'done' : ''}"></div>
      <div class="step-node ${step >= 4 ? 'done' : ''} ${step === 4 ? 'current' : ''}">
        <span class="step-dot"></span>
        <span class="step-label">Recursos</span>
      </div>
      <div class="step-line ${step >= 5 ? 'done' : ''}"></div>
      <div class="step-node ${step >= 5 ? 'done' : ''} ${step === 5 ? 'current' : ''}">
        <span class="step-dot"></span>
        <span class="step-label">Convocações</span>
      </div>
    </div>
  `;
}

function renderizarListaCards(itens, isAbaAcompanhados = false) {
  if (itens.length === 0) {
    return `
      <div class="empty-state">
        <i data-lucide="${isAbaAcompanhados ? 'bookmark' : 'search-x'}" style="width: 42px; height: 42px; color: var(--text-dim);"></i>
        <h3 style="color: var(--text); font-size: 15px; font-weight: 700;">
          ${isAbaAcompanhados ? 'Nenhum concurso acompanhado' : 'Nenhum certame localizado'}
        </h3>
        <p style="font-size: 12.5px; color: var(--text-muted); max-width: 280px; text-align: center;">
          ${isAbaAcompanhados 
            ? 'Toque em "Acompanhar" nos concursos do radar para monitorar prazos e convocações aqui.' 
            : 'Tente alterar os filtros ou dispare uma Consulta Avulsa sob demanda com a IA.'}
        </p>
      </div>
    `;
  }

  return itens.map(c => {
    const isTracking = state.acompanhados.includes(c.id);
    const statusClass = getStatusBadgeClass(c.status);
    const brasaoSvg = gerarSvgBrasao(c.cidade);

    const cargosHtml = (c.cargos || []).map(cargo => {
      const isLicit = /licitaç|compras|contrato|pregoeiro|trânsito/i.test(cargo);
      return `<span class="cargo-chip ${isLicit ? 'highlight' : ''}">${escapeHtml(cargo)}</span>`;
    }).join('');

    const score = typeof c.confianca_score === 'number' ? c.confianca_score : 85;
    const trustClass = score >= 85 ? 'trust-high' : (score >= 60 ? 'trust-medium' : 'trust-low');
    const rotulo = c.confianca_rotulo || (score >= 85 ? 'Oficial Verificado' : 'Auditado');
    const trustBadge = `
      <span class="trust-badge ${trustClass}" title="Auditoria Documental: ${score}% de confiabilidade">
        <span class="trust-dot"></span>
        <span>${score}% ${escapeHtml(rotulo)}</span>
      </span>
    `;

    const bancaBadge = c.banca ? `
      <span class="banca-badge" title="Banca Examinadora Oficial Reconhecida">
        <i data-lucide="building-2" style="width: 11px; height: 11px;"></i>
        <span>${escapeHtml(c.banca)}</span>
      </span>
    ` : '';

    const faseBadge = c.fase_detalhada ? `
      <span class="fase-pill" title="Estágio Formal do Concurso">
        <i data-lucide="info" style="width: 10px; height: 10px;"></i>
        <span>${escapeHtml(c.fase_detalhada)}</span>
      </span>
    ` : '';

    const linkOficialBtn = c.link_oficial ? `
      <a href="${escapeHtml(c.link_oficial)}" target="_blank" rel="noopener noreferrer" class="btn-card-action primary" title="Acessar portal da banca examinadora ou edital oficial">
        <i data-lucide="file-text" style="width: 14px; height: 14px;"></i>
        <span>${escapeHtml(c.banca ? `Banca (${c.banca})` : 'Edital Oficial')}</span>
      </a>
    ` : '';

    return `
      <div class="concurso-card" data-id="${escapeHtml(c.id)}">
        <!-- Linha 1: Brasão + Cidade + Badges de Auditoria + Acompanhar -->
        <div class="card-header-row">
          <div class="city-crest-group">
            ${brasaoSvg}
            <div>
              <div class="city-name">${escapeHtml(c.cidade)}</div>
              <div class="card-badges-row">
                <span class="status-badge ${statusClass}">
                  <span class="pulse-dot"></span>
                  ${escapeHtml(c.status)}
                </span>
                ${trustBadge}
                ${bancaBadge}
                ${faseBadge}
              </div>
            </div>
          </div>

          <button class="btn-track ${isTracking ? 'active' : ''}" onclick="window.radarActions.toggleAcompanhar('${escapeHtml(c.id)}')">
            <i data-lucide="${isTracking ? 'bookmark-check' : 'bookmark'}" style="width: 15px; height: 15px;"></i>
            <span>${isTracking ? 'Acompanhando' : 'Acompanhar'}</span>
          </button>
        </div>

        <!-- Linha 2: Título + Órgão + Cargos -->
        <div class="card-body-row">
          <h2 class="concurso-title">${escapeHtml(c.titulo)}</h2>
          <div class="concurso-orgao">
            <i data-lucide="landmark" style="width: 14px; height: 14px; color: var(--text-dim);"></i>
            <span>${escapeHtml(c.orgao)}</span>
          </div>
          <div class="cargos-wrap">
            ${cargosHtml}
          </div>
        </div>

        <!-- Linha 3: Meta Grid & Resumo IA -->
        <div class="meta-grid">
          <div class="meta-item">
            <i data-lucide="coins" style="width: 15px; height: 15px; color: #34d399;"></i>
            <span>Vencimento: <strong>${escapeHtml(c.salario_resumo || 'A consultar')}</strong></span>
          </div>
          <div class="meta-item">
            <i data-lucide="calendar" style="width: 15px; height: 15px; color: #60a5fa;"></i>
            <span>Inscrições: <strong>${escapeHtml(c.prazo_inscricao || 'Consultar edital')}</strong></span>
          </div>
        </div>

        <!-- Linha 3.5: Linha do Tempo das Etapas Oficiais -->
        ${renderTimelineStepper(c)}

        ${c.resumo_ia ? `
          <div class="ai-summary-box">
            <div class="ai-summary-tag">
              <i data-lucide="sparkles" style="width: 12px; height: 12px;"></i>
              Análise Técnica do Radar
            </div>
            ${escapeHtml(c.resumo_ia)}
          </div>
        ` : ''}

        <!-- Linha 4: Ações Operacionais -->
        <div class="card-actions-row">
          <button class="btn-card-action" onclick="window.radarActions.abrirModalPortais('${escapeHtml(c.cidade)}')">
            <i data-lucide="external-link" style="width: 14px; height: 14px;"></i>
            <span>Portais da Cidade</span>
          </button>
          ${linkOficialBtn}
          <button class="btn-card-action study" onclick="window.radarActions.abrirModalPlano('${escapeHtml(c.id)}')">
            <i data-lucide="graduation-cap" style="width: 14px; height: 14px;"></i>
            <span>Plano de Estudos</span>
          </button>
          <button class="btn-card-action share" onclick="window.radarActions.compartilharConcurso('${escapeHtml(c.id)}')">
            <i data-lucide="share-2" style="width: 14px; height: 14px;"></i>
            <span>Compartilhar</span>
          </button>
        </div>
      </div>
    `;
  }).join('');
}

export function toggleAcompanhar(id) {
  const idx = state.acompanhados.indexOf(id);
  if (idx > -1) {
    state.acompanhados.splice(idx, 1);
    mostrarToast('Concurso removido dos acompanhados.');
  } else {
    state.acompanhados.push(id);
    mostrarToast('Concurso adicionado aos acompanhados!', 'success');
  }
  salvarLocal();
  renderizarRadar();
}

export function getProgressoEstudos(concursoId) {
  try {
    const raw = localStorage.getItem('radar_topicos_estudados');
    const marcados = raw ? JSON.parse(raw) : [];
    return marcados.filter(id => id.startsWith(`${concursoId}_`));
  } catch (e) {
    return [];
  }
}

export function toggleTopicoEstudo(concursoId, topicoId) {
  try {
    const raw = localStorage.getItem('radar_topicos_estudados');
    let marcados = raw ? JSON.parse(raw) : [];
    const fullId = `${concursoId}_${topicoId}`;
    
    if (marcados.includes(fullId)) {
      marcados = marcados.filter(id => id !== fullId);
    } else {
      marcados.push(fullId);
    }
    localStorage.setItem('radar_topicos_estudados', JSON.stringify(marcados));
    abrirModalPlano(concursoId); // Re-renderiza o modal atualizado
  } catch (e) {
    console.warn('[Estudos]', e);
  }
}

export function abrirModalPlano(concursoId) {
  const item = state.concursos.find(c => c.id === concursoId);
  if (!item) return;

  planoAtual = item;

  const tituloEl = document.getElementById('modalPlanoTitulo');
  if (tituloEl) {
    tituloEl.textContent = `Plano de Estudos: ${item.cidade}`;
  }

  const cargosStr = `${(item.cargos || []).join(' ')} ${item.titulo || ''}`.toLowerCase();
  
  // Detecção dinâmica de especialidade
  const isLicitacao = /licitaç|compras|contrato|pregoeiro/i.test(cargosStr);
  const isEducacao = /escola|professor|educa|monitor|creche|apoio escolar/i.test(cargosStr);
  const isSeguranca = /guarda|gcm|segurança|vigia|trânsito/i.test(cargosStr);
  const isSaude = /enferm|médic|saúde|odont|farmac|psicó/i.test(cargosStr);
  const isFiscal = /fiscal|tribut|auditor|postura/i.test(cargosStr);

  // Módulo específico customizado
  let moduloEspecifico = {
    titulo: `3. Legislação Municipal de ${item.cidade} & CF/88`,
    tag: 'Específica',
    topicos: [
      { id: 'esp_1', texto: `Lei Orgânica do Município de ${item.cidade}` },
      { id: 'esp_2', texto: 'Estatuto dos Servidores Públicos Municipais' },
      { id: 'esp_3', texto: 'Art. 37 da Constituição Federal (Princípios da Administração Pública)' },
      { id: 'esp_4', texto: 'Lei de Acesso à Informação (Lei 12.527/11) e Transparência' }
    ]
  };

  if (isLicitacao) {
    moduloEspecifico = {
      titulo: '3. Nova Lei de Licitações (Lei 14.133/21)',
      tag: 'ALTA PRIORIDADE',
      corTag: '#f59e0b',
      topicos: [
        { id: 'esp_lic1', texto: 'Princípios da Licitação, Fase Preparatória e ETP (Estudo Técnico Preliminar)' },
        { id: 'esp_lic2', texto: 'Modalidades: Pregão Eletrônico, Concorrência e Diálogo Competitivo' },
        { id: 'esp_lic3', texto: 'Contratação Direta: Hipóteses de Dispensa e Inexigibilidade de Licitação' },
        { id: 'esp_lic4', texto: 'Gestão, Fiscalização de Contratos Administrativos e Sanções' }
      ]
    };
  } else if (isEducacao) {
    moduloEspecifico = {
      titulo: '3. Legislação Educacional & Desenvolvimento Infantil',
      tag: 'FUNDAMENTAL',
      corTag: '#34d399',
      topicos: [
        { id: 'esp_edu1', texto: 'LDB - Lei de Diretrizes e Bases da Educação Nacional (Lei 9.394/96)' },
        { id: 'esp_edu2', texto: 'ECA - Estatuto da Criança e do Adolescente (Lei 8.069/90)' },
        { id: 'esp_edu3', texto: 'Rotinas de Secretaria Escolar, Censo Escolar e Documentação de Alunos' },
        { id: 'esp_edu4', texto: 'Inclusão Escolar, Mediação e Apoio à Educação Especial' }
      ]
    };
  } else if (isSeguranca) {
    moduloEspecifico = {
      titulo: '3. Legislação de Segurança Pública & Estatuto das Guardas',
      tag: 'ELIMINATÓRIA',
      corTag: '#38bdf8',
      topicos: [
        { id: 'esp_seg1', texto: 'Estatuto Geral das Guardas Municipais (Lei Federal 13.022/14)' },
        { id: 'esp_seg2', texto: 'Constituição Federal: Artigo 144 (Da Segurança Pública)' },
        { id: 'esp_seg3', texto: 'Noções de Direito Penal: Crimes contra a Pessoa e contra o Patrimônio' },
        { id: 'esp_seg4', texto: 'Direitos Humanos, Uso Progressivo da Força e Primeiros Socorros' }
      ]
    };
  } else if (isSaude) {
    moduloEspecifico = {
      titulo: '3. Legislação do SUS & Saúde Pública',
      tag: 'ESPECÍFICA',
      corTag: '#a78bfa',
      topicos: [
        { id: 'esp_sau1', texto: 'Sistema Único de Saúde: Leis Federais 8.080/90 e 8.142/90' },
        { id: 'esp_sau2', texto: 'Política Nacional de Atenção Básica (PNAB) e HumanizaSUS' },
        { id: 'esp_sau3', texto: 'Vigilância Epidemiológica, Sanitária e Imunizações' },
        { id: 'esp_sau4', texto: 'Código de Ética Profissional e Biossegurança' }
      ]
    };
  } else if (isFiscal) {
    moduloEspecifico = {
      titulo: '3. Direito Tributário Municipal & Fiscalização',
      tag: 'ESPECÍFICA',
      corTag: '#fbbf24',
      topicos: [
        { id: 'esp_fisc1', texto: 'Código Tributário Nacional (CTN) e Competências Municipais (ISS, IPTU, ITBI)' },
        { id: 'esp_fisc2', texto: 'Poder de Polícia Administrativa e Fiscalização de Posturas' },
        { id: 'esp_fisc3', texto: 'Auto de Infração, Notificação e Processo Administrativo Tributário' },
        { id: 'esp_fisc4', texto: 'Lei de Responsabilidade Fiscal (LC 101/00)' }
      ]
    };
  }

  // Tópicos completos para tracking
  const todosTopicos = [
    { id: 'lp_1', texto: 'Interpretação e compreensão de textos técnicos e dissertativos' },
    { id: 'lp_2', texto: 'Concordância verbal/nominal, regência e crase' },
    { id: 'lp_3', texto: 'Pontuação, ortografia oficial e sintaxe do período' },
    { id: 'rl_1', texto: 'Regra de três simples/composta, porcentagem e frações' },
    { id: 'rl_2', texto: 'Estruturas lógicas, proposições e diagramas lógicos' },
    ...moduloEspecifico.topicos,
    { id: 'adm_1', texto: 'Manual de Redação Oficial (ofícios, despachos, memorandos)' },
    { id: 'adm_2', texto: 'Noções de arquivamento, protocolo e atendimento ao cidadão' }
  ];

  const marcados = getProgressoEstudos(concursoId);
  const total = todosTopicos.length;
  const concluidos = marcados.length;
  const porcentagem = Math.round((concluidos / total) * 100);

  function renderCheckItem(topico) {
    const isDone = marcados.includes(`${concursoId}_${topico.id}`);
    return `
      <li class="study-check-item ${isDone ? 'done' : ''}">
        <input 
          type="checkbox" 
          ${isDone ? 'checked' : ''} 
          onchange="window.radarActions.toggleTopicoEstudo('${escapeHtml(concursoId)}', '${escapeHtml(topico.id)}')"
        >
        <span>${escapeHtml(topico.texto)}</span>
      </li>
    `;
  }

  const bodyEl = document.getElementById('modalPlanoBody');
  if (bodyEl) {
    bodyEl.innerHTML = `
      <div style="background: rgba(16, 185, 129, 0.08); border: 1px solid rgba(16, 185, 129, 0.25); border-radius: 10px; padding: 12px; margin-bottom: 10px;">
        <strong style="color: #34d399; display: flex; align-items: center; gap: 6px; font-size: 13px;">
          <i data-lucide="target" style="width: 15px; height: 15px;"></i> ${escapeHtml(item.cidade)} • ${escapeHtml(item.banca || 'Banca Oficial')}
        </strong>
        <p style="font-size: 12px; color: #cbd5e1; margin-top: 3px;">
          ${escapeHtml(item.titulo)}
        </p>
      </div>

      <!-- Barra de Progresso Interativo -->
      <div class="study-progress-wrap">
        <div class="study-progress-header">
          <span>Progresso de Revisão</span>
          <span>${concluidos}/${total} tópicos (${porcentagem}%)</span>
        </div>
        <div class="study-progress-bar">
          <div class="study-progress-fill" style="width: ${porcentagem}%;"></div>
        </div>
      </div>

      <!-- Módulo 1: Português -->
      <div class="study-box">
        <div class="study-title">
          <span>1. Língua Portuguesa</span>
          <span style="font-size: 10.5px; color: #34d399;">Base Eliminatória</span>
        </div>
        <ul class="study-check-list">
          ${renderCheckItem(todosTopicos[0])}
          ${renderCheckItem(todosTopicos[1])}
          ${renderCheckItem(todosTopicos[2])}
        </ul>
      </div>

      <!-- Módulo 2: Raciocínio Lógico -->
      <div class="study-box">
        <div class="study-title">
          <span>2. Raciocínio Lógico & Matemática</span>
          <span style="font-size: 10.5px; color: #38bdf8;">Base Comum</span>
        </div>
        <ul class="study-check-list">
          ${renderCheckItem(todosTopicos[3])}
          ${renderCheckItem(todosTopicos[4])}
        </ul>
      </div>

      <!-- Módulo 3: Específico Customizado por Cargo -->
      <div class="study-box" style="${isLicitacao ? 'border-color: rgba(245, 158, 11, 0.35); background: rgba(245, 158, 11, 0.06);' : ''}">
        <div class="study-title" style="${moduloEspecifico.corTag ? `color: ${moduloEspecifico.corTag};` : ''}">
          <span>${escapeHtml(moduloEspecifico.titulo)}</span>
          <span style="font-size: 10.5px; color: ${moduloEspecifico.corTag || '#a78bfa'}; font-weight: 700;">${moduloEspecifico.tag}</span>
        </div>
        <ul class="study-check-list">
          ${moduloEspecifico.topicos.map(renderCheckItem).join('')}
        </ul>
      </div>

      <!-- Módulo 4: Administrativo -->
      <div class="study-box">
        <div class="study-title">
          <span>4. Rotinas Administrativas & Redação Oficial</span>
          <span style="font-size: 10.5px; color: #94a3b8;">Complementar</span>
        </div>
        <ul class="study-check-list">
          ${renderCheckItem(todosTopicos[todosTopicos.length - 2])}
          ${renderCheckItem(todosTopicos[todosTopicos.length - 1])}
        </ul>
      </div>
    `;
  }

  abrirModal('modalPlanoEstudo');
  refreshIcons();
}

export function copiarPlanoEstudo() {
  if (!planoAtual) return;
  const c = planoAtual;
  const marcados = getProgressoEstudos(c.id);

  const texto = `🎯 PLANO DE ESTUDOS PERSONALIZADO • ${c.cidade}\n` +
    `Certame: ${c.titulo}\n` +
    `Órgão: ${c.orgao} • Banca: ${c.banca || 'Oficial'}\n` +
    `Cargos: ${(c.cargos || []).join(', ')}\n\n` +
    `Status: ${marcados.length} tópicos concluídos\n\n` +
    `Marque seus estudos e acompanhe suas metas no Radar de Concursos SP!`;

  navigator.clipboard.writeText(texto).then(() => {
    mostrarToast('Resumo de estudos copiado para a área de transferência!', 'success');
  }).catch(() => {
    mostrarToast('Plano gerado com sucesso!', 'info');
  });
}

export async function compartilharConcurso(id) {
  const c = state.concursos.find(item => item.id === id);
  if (!c) return;

  const bancaTexto = c.banca ? `🏛️ Banca: ${c.banca}\n` : '';
  const prazoTexto = c.prazo_inscricao ? `📅 Período: ${c.prazo_inscricao}\n` : '';
  const vencTexto = c.salario_resumo ? `💰 Vencimento: ${c.salario_resumo}\n` : '';
  const cargosTexto = (c.cargos || []).length > 0 ? `🎯 Cargos: ${(c.cargos || []).join(', ')}\n` : '';
  const linkTexto = c.link_oficial ? `🔗 Link Oficial: ${c.link_oficial}\n` : '';

  const texto = `📢 [RADAR DE CONCURSOS SP]\n\n` +
    `📍 ${c.cidade} - ${c.titulo}\n` +
    `📊 Status: ${c.status} (${c.confianca_score || 90}% Verificado Oficial)\n` +
    bancaTexto +
    cargosTexto +
    vencTexto +
    prazoTexto +
    linkTexto +
    `\nAcesse no Radar de Concursos SP: https://devmalone.github.io/radar-concursos/`;

  if (navigator.share) {
    try {
      await navigator.share({
        title: `${c.cidade}: ${c.titulo}`,
        text: texto,
        url: c.link_oficial || window.location.href
      });
      mostrarToast('Compartilhado com sucesso!', 'success');
      return;
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.warn('[Share]', err);
      }
    }
  }

  try {
    await navigator.clipboard.writeText(texto);
    mostrarToast('Informações copiadas para enviar no WhatsApp!', 'success');
  } catch (e) {
    mostrarToast('Não foi possível compartilhar.', 'error');
  }
}

