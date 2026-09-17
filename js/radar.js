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
/* ==========================================================================
   MOTOR DE PRAZOS INTELIGENTES & CONTAGEM REGRESSIVA
   ========================================================================== */
export function extrairDatasConcurso(c) {
  const textoCompleto = `${c.prazo_inscricao || ''} ${c.fase_detalhada || ''} ${c.titulo || ''} ${c.resumo_ia || ''}`;
  
  let dataInscricaoFim = null;
  let dataProva = null;

  const matchProva = textoCompleto.match(/prova[s]?\s+(?:em\s+|prevista[s]?\s+para\s+|no\s+dia\s+|de\s+)?(\d{1,2}\/\d{1,2}\/\d{4})/i);
  if (matchProva) {
    dataProva = parseDataBrasileira(matchProva[1]);
  }

  const matchInscricao = textoCompleto.match(/(?:at[eé]|a|encerra[m]?\s+em)\s+(\d{1,2}\/\d{1,2}\/\d{4})/i);
  if (matchInscricao) {
    dataInscricaoFim = parseDataBrasileira(matchInscricao[1]);
  } else {
    const todasDatas = [...textoCompleto.matchAll(/\b(\d{1,2}\/\d{1,2}\/\d{4})\b/g)].map(m => m[1]);
    if (todasDatas.length >= 2 && !dataProva) {
      dataInscricaoFim = parseDataBrasileira(todasDatas[1]);
    } else if (todasDatas.length === 1 && !dataProva) {
      dataInscricaoFim = parseDataBrasileira(todasDatas[0]);
    }
  }

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  let diasParaInscricao = null;
  if (dataInscricaoFim) {
    const diff = dataInscricaoFim.getTime() - hoje.getTime();
    diasParaInscricao = Math.ceil(diff / (1000 * 60 * 60 * 24));
  }

  let diasParaProva = null;
  if (dataProva) {
    const diff = dataProva.getTime() - hoje.getTime();
    diasParaProva = Math.ceil(diff / (1000 * 60 * 60 * 24));
  }

  return {
    dataInscricaoFim,
    dataProva,
    diasParaInscricao,
    diasParaProva
  };
}

function parseDataBrasileira(dataStr) {
  if (!dataStr) return null;
  const parts = dataStr.split('/');
  if (parts.length !== 3) return null;
  const dia = parseInt(parts[0], 10);
  const mes = parseInt(parts[1], 10) - 1;
  const ano = parseInt(parts[2], 10);
  return new Date(ano, mes, dia, 23, 59, 59);
}

export function renderCountdownBadges(c) {
  const { dataInscricaoFim, dataProva, diasParaInscricao, diasParaProva } = extrairDatasConcurso(c);
  const badges = [];

  // Inscrição
  if (diasParaInscricao !== null) {
    if (diasParaInscricao < 0) {
      badges.push(`
        <span class="countdown-chip closed" title="Prazo de inscrição encerrado">
          <i data-lucide="calendar-x" style="width: 11px; height: 11px;"></i>
          <span>Inscrições Encerradas</span>
        </span>
      `);
    } else if (diasParaInscricao === 0) {
      badges.push(`
        <span class="countdown-chip urgent" title="Último dia de inscrição hoje!">
          <span class="pulse-urgent"></span>
          <i data-lucide="clock" style="width: 11px; height: 11px;"></i>
          <span>Último dia de inscrição!</span>
        </span>
      `);
    } else if (diasParaInscricao <= 5) {
      badges.push(`
        <span class="countdown-chip urgent" title="Inscrições encerram em breve">
          <span class="pulse-urgent"></span>
          <i data-lucide="flame" style="width: 11px; height: 11px;"></i>
          <span>Inscrições: Faltam ${diasParaInscricao} ${diasParaInscricao === 1 ? 'dia' : 'dias'}</span>
        </span>
      `);
    } else {
      badges.push(`
        <span class="countdown-chip active" title="Inscrições abertas">
          <i data-lucide="calendar" style="width: 11px; height: 11px;"></i>
          <span>Inscrições até ${dataInscricaoFim.toLocaleDateString('pt-BR')} (${diasParaInscricao} dias)</span>
        </span>
      `);
    }
  }

  // Prova
  if (diasParaProva !== null) {
    if (diasParaProva < 0) {
      badges.push(`
        <span class="countdown-chip done" title="Provas já foram aplicadas">
          <i data-lucide="check-circle" style="width: 11px; height: 11px;"></i>
          <span>Provas Aplicadas</span>
        </span>
      `);
    } else if (diasParaProva === 0) {
      badges.push(`
        <span class="countdown-chip exam-today" title="Dia da realização da prova!">
          <i data-lucide="alert-circle" style="width: 11px; height: 11px;"></i>
          <span>Dia da Prova Hoje</span>
        </span>
      `);
    } else {
      badges.push(`
        <span class="countdown-chip exam" title="Foco total na preparação e revisão">
          <i data-lucide="target" style="width: 11px; height: 11px;"></i>
          <span>Prova em ${diasParaProva} ${diasParaProva === 1 ? 'dia' : 'dias'} (${dataProva.toLocaleDateString('pt-BR')})</span>
        </span>
      `);
    }
  }

  if (badges.length === 0) return '';
  return `<div class="countdown-row">${badges.join('')}</div>`;
}

function formatToICSDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}${m}${d}`;
}

export function gerarConteudoICS(c) {
  const { dataInscricaoFim, dataProva } = extrairDatasConcurso(c);
  const events = [];
  const now = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

  if (dataProva) {
    const nextDay = new Date(dataProva.getTime() + 86400000);
    events.push(`BEGIN:VEVENT
UID:prova-${c.id}-${Date.now()}@radarconcursos.sp
DTSTAMP:${now}
DTSTART;VALUE=DATE:${formatToICSDate(dataProva)}
DTEND;VALUE=DATE:${formatToICSDate(nextDay)}
SUMMARY:[PROVA] ${c.orgao} — ${c.cidade}
DESCRIPTION:Dia da Prova do Concurso ${c.titulo}. Banca: ${c.banca || 'Oficial'}. Link Oficial: ${c.link_oficial || ''}
LOCATION:${c.cidade} - SP, Brasil
STATUS:CONFIRMED
TRANSP:TRANSPARENT
END:VEVENT`);
  }

  if (dataInscricaoFim) {
    const nextDay = new Date(dataInscricaoFim.getTime() + 86400000);
    events.push(`BEGIN:VEVENT
UID:inscricao-${c.id}-${Date.now()}@radarconcursos.sp
DTSTAMP:${now}
DTSTART;VALUE=DATE:${formatToICSDate(dataInscricaoFim)}
DTEND;VALUE=DATE:${formatToICSDate(nextDay)}
SUMMARY:[ÚLTIMO DIA INSCRIÇÃO] ${c.orgao} — ${c.cidade}
DESCRIPTION:Término do prazo de inscrição para ${c.titulo}. Link Oficial: ${c.link_oficial || ''}
LOCATION:${c.cidade} - SP, Brasil
STATUS:CONFIRMED
TRANSP:TRANSPARENT
END:VEVENT`);
  }

  return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Antigravity//Radar de Concursos SP//PT-BR
CALSCALE:GREGORIAN
METHOD:PUBLISH
${events.join('\n')}
END:VCALENDAR`;
}

export function baixarArquivoICS(concursoId) {
  const c = state.concursos.find(item => item.id === concursoId);
  if (!c) return;

  const conteudo = gerarConteudoICS(c);
  const blob = new Blob([conteudo], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `concurso_${c.cidade.toLowerCase().replace(/\s+/g, '_')}_agenda.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  mostrarToast('Arquivo .ics gerado com sucesso para seu calendário!');
}

export function abrirGoogleCalendar(concursoId, tipo = 'prova') {
  const c = state.concursos.find(item => item.id === concursoId);
  if (!c) return;

  const { dataInscricaoFim, dataProva } = extrairDatasConcurso(c);
  const targetDate = tipo === 'prova' ? dataProva : dataInscricaoFim;
  if (!targetDate) {
    mostrarToast('Data não identificada para este certame.');
    return;
  }

  const nextDay = new Date(targetDate.getTime() + 86400000);
  const startStr = formatToICSDate(targetDate);
  const endStr = formatToICSDate(nextDay);

  const titulo = tipo === 'prova' 
    ? `[PROVA] Concurso ${c.orgao} (${c.cidade})`
    : `[ÚLTIMO DIA] Inscrição Concurso ${c.orgao} (${c.cidade})`;

  const detalhes = `Concurso: ${c.titulo}\nBanca Oficial: ${c.banca || 'Própria'}\nCargos: ${(c.cargos || []).join(', ')}\nLink Oficial: ${c.link_oficial || ''}`;
  const local = `${c.cidade} - SP, Brasil`;

  const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(titulo)}&dates=${startStr}/${endStr}&details=${encodeURIComponent(detalhes)}&location=${encodeURIComponent(local)}`;
  window.open(url, '_blank', 'noopener,noreferrer');
}

export function abrirOpcoesAgenda(concursoId) {
  const c = state.concursos.find(item => item.id === concursoId);
  if (!c) return;

  const { dataInscricaoFim, dataProva, diasParaInscricao, diasParaProva } = extrairDatasConcurso(c);

  const tituloEl = document.getElementById('modalAgendaTitulo');
  if (tituloEl) {
    tituloEl.textContent = `${c.cidade} — Adicionar à Agenda`;
  }

  const bodyEl = document.getElementById('modalAgendaBody');
  if (bodyEl) {
    bodyEl.innerHTML = `
      <div style="background: rgba(59, 130, 246, 0.08); border: 1px solid rgba(59, 130, 246, 0.25); border-radius: 10px; padding: 12px; margin-bottom: 12px;">
        <strong style="color: var(--primary); display: flex; align-items: center; gap: 6px; font-size: 13px;">
          <i data-lucide="calendar" style="width: 15px; height: 15px;"></i> ${escapeHtml(c.orgao)}
        </strong>
        <p style="font-size: 12px; color: var(--text-muted); margin-top: 4px;">
          ${escapeHtml(c.titulo)}
        </p>
      </div>

      <div class="agenda-options-list">
        ${dataProva ? `
          <button type="button" class="agenda-opt-btn" onclick="window.radarActions.abrirGoogleCalendar('${escapeHtml(c.id)}', 'prova')">
            <div style="display: flex; align-items: center; gap: 10px;">
              <i data-lucide="target" style="width: 18px; height: 18px; color: #a78bfa;"></i>
              <div style="text-align: left;">
                <div style="font-size: 13px; font-weight: 700;">Google Agenda: Dia da Prova</div>
                <div style="font-size: 11px; color: var(--text-dim);">${dataProva.toLocaleDateString('pt-BR')} ${diasParaProva !== null ? `(${diasParaProva} dias)` : ''}</div>
              </div>
            </div>
            <i data-lucide="external-link" style="width: 14px; height: 14px; color: var(--text-dim);"></i>
          </button>
        ` : ''}

        ${dataInscricaoFim ? `
          <button type="button" class="agenda-opt-btn" onclick="window.radarActions.abrirGoogleCalendar('${escapeHtml(c.id)}', 'inscricao')">
            <div style="display: flex; align-items: center; gap: 10px;">
              <i data-lucide="clock" style="width: 18px; height: 18px; color: #f59e0b;"></i>
              <div style="text-align: left;">
                <div style="font-size: 13px; font-weight: 700;">Google Agenda: Fim das Inscrições</div>
                <div style="font-size: 11px; color: var(--text-dim);">${dataInscricaoFim.toLocaleDateString('pt-BR')} ${diasParaInscricao !== null ? `(${diasParaInscricao} dias)` : ''}</div>
              </div>
            </div>
            <i data-lucide="external-link" style="width: 14px; height: 14px; color: var(--text-dim);"></i>
          </button>
        ` : ''}

        <button type="button" class="agenda-opt-btn" onclick="window.radarActions.baixarArquivoICS('${escapeHtml(c.id)}')">
          <div style="display: flex; align-items: center; gap: 10px;">
            <i data-lucide="download" style="width: 18px; height: 18px; color: #34d399;"></i>
            <div style="text-align: left;">
              <div style="font-size: 13px; font-weight: 700;">Baixar Arquivo Universal (.ICS)</div>
              <div style="font-size: 11px; color: var(--text-dim);">Sincroniza com iPhone, Android, Outlook e Mac</div>
            </div>
          </div>
          <i data-lucide="arrow-down-to-line" style="width: 14px; height: 14px; color: #34d399;"></i>
        </button>
      </div>
    `;
  }

  abrirModal('modalAgendaConcurso');
  refreshIcons();
}

export function toggleDetalhesCard(concursoId) {
  const panel = document.getElementById(`detalhes-${concursoId}`);
  const icon = document.getElementById(`icon-detalhes-${concursoId}`);
  if (!panel) return;

  const estaAberto = panel.style.display !== 'none';
  if (estaAberto) {
    panel.style.display = 'none';
    if (icon) icon.setAttribute('data-lucide', 'chevron-down');
  } else {
    panel.style.display = 'flex';
    if (icon) icon.setAttribute('data-lucide', 'chevron-up');
  }
  refreshIcons();
}

function renderizarListaCards(itens, isAbaAcompanhados = false) {
  if (itens.length === 0) {
    if (isAbaAcompanhados) {
      return `
        <div class="empty-state">
          <i data-lucide="bookmark" style="width: 42px; height: 42px; color: var(--text-dim);"></i>
          <h3 style="color: var(--text); font-size: 15px; font-weight: 700;">Nenhum concurso acompanhado</h3>
          <p style="font-size: 12.5px; color: var(--text-muted); max-width: 280px; text-align: center;">
            Toque no ícone de salvar em qualquer concurso do Radar para monitorar prazos e convocações aqui.
          </p>
        </div>
      `;
    }
    return `
      <div class="empty-state-welcome">
        <div class="empty-state-icon">
          <i data-lucide="radar" style="width: 36px; height: 36px; color: #60a5fa;"></i>
        </div>
        <h3 style="color: #f8fafc; font-size: 16px; font-weight: 700; margin: 0;">Nenhum certame carregado</h3>
        <p style="font-size: 13px; color: var(--text-muted); line-height: 1.45; text-align: center; max-width: 310px; margin: 0;">
          Sua base está limpa. Pesquise editais e processos seletivos do seu município com a IA ou sincronize com o banco de dados.
        </p>
        <div style="display: flex; flex-direction: column; gap: 8px; width: 100%; max-width: 280px; margin-top: 6px;">
          <button type="button" class="btn-modal-main" onclick="window.radarActions.abrirModalConsultaAvulsa()">
            <i data-lucide="search" style="width: 15px; height: 15px;"></i>
            <span>Buscar no Município</span>
          </button>
          <button type="button" class="btn-card-action" style="justify-content: center;" onclick="window.radarActions.sincronizarSupabase(true)">
            <i data-lucide="refresh-cw" style="width: 14px; height: 14px;"></i>
            <span>Sincronizar Nuvem</span>
          </button>
        </div>
      </div>
    `;
  }

  return itens.map(c => {
    const isTracking = state.acompanhados.includes(c.id);
    const statusClass = getStatusBadgeClass(c.status);
    const brasaoSvg = gerarSvgBrasao(c.cidade);

    const interesses = state.config.interesses || [];
    const cargosHtml = (c.cargos || []).slice(0, 4).map(cargo => {
      const isInteresse = interesses.length > 0 && interesses.some(term => {
        const t = term.trim().toLowerCase();
        return t && cargo.toLowerCase().includes(t);
      });
      return `<span class="cargo-chip ${isInteresse ? 'match-interesse' : ''}">${escapeHtml(cargo)}</span>`;
    }).join('');

    const maisCargosCount = (c.cargos || []).length > 4 ? (c.cargos.length - 4) : 0;

    const score = typeof c.confianca_score === 'number' ? c.confianca_score : 85;
    const rotulo = c.confianca_rotulo || 'Oficial Verificado';

    const linkOficialBtn = c.link_oficial ? `
      <a href="${escapeHtml(c.link_oficial)}" target="_blank" rel="noopener noreferrer" class="btn-card-action primary" title="Acessar edital ou portal oficial">
        <i data-lucide="external-link" style="width: 13px; height: 13px;"></i>
        <span>${escapeHtml(c.banca ? `Banca (${c.banca})` : 'Edital Oficial')}</span>
      </a>
    ` : '';

    return `
      <div class="concurso-card" data-id="${escapeHtml(c.id)}">
        <!-- Linha 1: Brasão + Cidade + Status + Acompanhar -->
        <div class="card-header-compact">
          <div class="city-crest-group">
            ${brasaoSvg}
            <div class="city-info-col">
              <span class="city-name">${escapeHtml(c.cidade)}</span>
              <span class="banca-discreet">${escapeHtml(c.banca || 'Órgão Municipal')} • ${score}% ${escapeHtml(rotulo)}</span>
            </div>
          </div>

          <div class="card-header-actions">
            <span class="status-badge ${statusClass}">
              <span class="pulse-dot"></span>
              ${escapeHtml(c.status)}
            </span>
            <button class="btn-track-icon ${isTracking ? 'active' : ''}" 
              onclick="window.radarActions.toggleAcompanhar('${escapeHtml(c.id)}')" 
              title="${isTracking ? 'Acompanhando' : 'Acompanhar'}">
              <i data-lucide="${isTracking ? 'bookmark-check' : 'bookmark'}" style="width: 15px; height: 15px;"></i>
            </button>
          </div>
        </div>

        <!-- Linha 2: Título + Órgão + Cargos -->
        <div class="card-body-compact">
          <h3 class="concurso-title">${escapeHtml(c.titulo)}</h3>
          <div class="concurso-orgao">
            <i data-lucide="landmark" style="width: 12px; height: 12px; color: var(--text-dim);"></i>
            <span>${escapeHtml(c.orgao)}</span>
          </div>
          ${cargosHtml ? `
            <div class="cargos-wrap">
              ${cargosHtml}
              ${maisCargosCount > 0 ? `<span class="cargo-chip-more">+${maisCargosCount}</span>` : ''}
            </div>
          ` : ''}
        </div>

        <!-- Linha 3: Vencimento & Inscrição Compactos -->
        <div class="meta-row-compact">
          <div class="meta-item-compact">
            <i data-lucide="banknote" style="width: 12px; height: 12px; color: #34d399;"></i>
            <span>${escapeHtml(c.salario_resumo || 'A consultar')}</span>
          </div>
          <div class="meta-item-compact">
            <i data-lucide="calendar" style="width: 12px; height: 12px; color: #60a5fa;"></i>
            <span>${escapeHtml(c.prazo_inscricao || 'Consultar edital')}</span>
          </div>
        </div>

        ${renderCountdownBadges(c)}

        <!-- Linha 4: Ações Primárias -->
        <div class="card-actions-row">
          ${linkOficialBtn}
          <button class="btn-card-action study" onclick="window.radarActions.abrirModalPlano('${escapeHtml(c.id)}')">
            <i data-lucide="graduation-cap" style="width: 13px; height: 13px;"></i>
            <span>Plano</span>
          </button>
          <button class="btn-card-action details-toggle" onclick="window.radarActions.toggleDetalhesCard('${escapeHtml(c.id)}')">
            <i data-lucide="chevron-down" style="width: 13px; height: 13px;" id="icon-detalhes-${escapeHtml(c.id)}"></i>
            <span>Detalhes</span>
          </button>
        </div>

        <!-- Painel Expansível de Detalhes (sob demanda) -->
        <div class="card-details-panel" id="detalhes-${escapeHtml(c.id)}" style="display: none;">
          ${renderTimelineStepper(c)}

          ${c.resumo_ia ? `
            <div class="ai-summary-box">
              <div class="ai-summary-tag">
                <i data-lucide="sparkles" style="width: 11px; height: 11px;"></i>
                Análise do Edital
              </div>
              <p style="margin: 0; font-size: 12px; color: #cbd5e1; line-height: 1.4;">${escapeHtml(c.resumo_ia)}</p>
            </div>
          ` : ''}

          <div class="details-subactions">
            <button type="button" class="btn-subaction" onclick="window.radarActions.abrirOpcoesAgenda('${escapeHtml(c.id)}')">
              <i data-lucide="calendar-plus" style="width: 12px; height: 12px; color: #a78bfa;"></i>
              <span>Agenda (.ics)</span>
            </button>
            <button type="button" class="btn-subaction" onclick="window.radarActions.abrirModalPortais('${escapeHtml(c.cidade)}')">
              <i data-lucide="landmark" style="width: 12px; height: 12px; color: #60a5fa;"></i>
              <span>Portais</span>
            </button>
            <button type="button" class="btn-subaction" onclick="window.radarActions.compartilharConcurso('${escapeHtml(c.id)}')">
              <i data-lucide="share-2" style="width: 12px; height: 12px; color: #34d399;"></i>
              <span>Compartilhar</span>
            </button>
          </div>
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

