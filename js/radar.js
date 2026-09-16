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
  if (s.includes('andamento') || s.includes('recurso') || s.includes('resultado') || s.includes('gabarito') || s.includes('encerrad')) {
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
        if (!s.includes('andamento') && !s.includes('recurso') && !s.includes('resultado') && !s.includes('gabarito') && !s.includes('encerrad')) {
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

    const linkOficialBtn = c.link_oficial ? `
      <a href="${escapeHtml(c.link_oficial)}" target="_blank" rel="noopener noreferrer" class="btn-card-action primary">
        <i data-lucide="file-text" style="width: 14px; height: 14px;"></i>
        <span>Edital / Banca</span>
      </a>
    ` : '';

    return `
      <div class="concurso-card" data-id="${escapeHtml(c.id)}">
        <!-- Linha 1: Brasão + Cidade + Status + Acompanhar -->
        <div class="card-header-row">
          <div class="city-crest-group">
            ${brasaoSvg}
            <div>
              <div class="city-name">${escapeHtml(c.cidade)}</div>
              <span class="status-badge ${statusClass}">
                <span class="pulse-dot"></span>
                ${escapeHtml(c.status)}
              </span>
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
            <span>Portais Oficiais</span>
          </button>
          ${linkOficialBtn}
          <button class="btn-card-action study" onclick="window.radarActions.abrirModalPlano('${escapeHtml(c.id)}')">
            <i data-lucide="graduation-cap" style="width: 14px; height: 14px;"></i>
            <span>Gerar Plano de Estudos</span>
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

export function abrirModalPlano(concursoId) {
  const item = state.concursos.find(c => c.id === concursoId);
  if (!item) return;

  planoAtual = item;

  const tituloEl = document.getElementById('modalPlanoTitulo');
  if (tituloEl) {
    tituloEl.textContent = `Plano de Estudos: ${item.cidade}`;
  }

  const cargosStr = (item.cargos || []).join(', ');
  const temLicitacao = /licitaç|compras|contrato|pregoeiro/i.test(cargosStr);

  const bodyEl = document.getElementById('modalPlanoBody');
  if (bodyEl) {
    bodyEl.innerHTML = `
      <div style="background: rgba(16, 185, 129, 0.08); border: 1px solid rgba(16, 185, 129, 0.25); border-radius: 10px; padding: 12px;">
        <strong style="color: #34d399; display: flex; align-items: center; gap: 6px; font-size: 13px;">
          <i data-lucide="target" style="width: 15px; height: 15px;"></i> Foco do Certame
        </strong>
        <p style="font-size: 12px; color: #cbd5e1; margin-top: 3px;">
          ${escapeHtml(item.titulo)} — ${escapeHtml(item.orgao)}
        </p>
      </div>

      <div class="study-box">
        <div class="study-title">
          <span>1. Língua Portuguesa</span>
          <span style="font-size: 10.5px; color: #34d399;">Base Eliminatória</span>
        </div>
        <ul class="study-list">
          <li>Interpretação e compreensão de textos técnicos e dissertativos</li>
          <li>Concordância verbal/nominal, regência e crase</li>
          <li>Pontuação, ortografia oficial e sintaxe do período</li>
        </ul>
      </div>

      <div class="study-box">
        <div class="study-title">
          <span>2. Raciocínio Lógico & Matemática</span>
          <span style="font-size: 10.5px; color: #38bdf8;">Base Comum</span>
        </div>
        <ul class="study-list">
          <li>Regra de três simples/composta, porcentagem e frações</li>
          <li>Estruturas lógicas, proposições e diagramas lógicos</li>
        </ul>
      </div>

      ${temLicitacao ? `
        <div class="study-box" style="border-color: rgba(245, 158, 11, 0.35); background: rgba(245, 158, 11, 0.06);">
          <div class="study-title" style="color: #fde68a;">
            <span>3. Nova Lei de Licitações (Lei 14.133/21)</span>
            <span style="font-size: 10.5px; color: #f59e0b; font-weight: 700;">ALTA PRIORIDADE</span>
          </div>
          <ul class="study-list">
            <li>Princípios da licitação, planejamento e Estudo Técnico Preliminar (ETP)</li>
            <li>Modalidades licitatórias: Pregão, Concorrência e Diálogo Competitivo</li>
            <li>Contratação direta: Dispensa e Inexigibilidade de licitação</li>
            <li>Gestão, fiscalização e formalização de contratos administrativos</li>
          </ul>
        </div>
      ` : `
        <div class="study-box">
          <div class="study-title">
            <span>3. Legislação Municipal & Princípios Constitucionais</span>
            <span style="font-size: 10.5px; color: #a78bfa;">Específica</span>
          </div>
          <ul class="study-list">
            <li>Lei Orgânica do Município de ${escapeHtml(item.cidade)}</li>
            <li>Estatuto dos Servidores Públicos do Município</li>
            <li>Artigo 37 da Constituição Federal (Princípios da Administração)</li>
          </ul>
        </div>
      `}

      <div class="study-box">
        <div class="study-title">
          <span>4. Rotinas Administrativas & Redação Oficial</span>
          <span style="font-size: 10.5px; color: #94a3b8;">Complementar</span>
        </div>
        <ul class="study-list">
          <li>Manual de Redação Oficial (ofícios, despachos, memorandos)</li>
          <li>Noções de arquivamento, protocolo e atendimento ao público</li>
        </ul>
      </div>
    `;
  }

  abrirModal('modalPlanoEstudo');
}

export function copiarPlanoEstudo() {
  if (!planoAtual) return;
  const c = planoAtual;
  const texto = `=== PLANO DE ESTUDOS: ${c.cidade} - ${c.titulo} ===\n` +
    `Órgão: ${c.orgao}\n` +
    `Status: ${c.status}\n` +
    `Cargos: ${(c.cargos || []).join(', ')}\n\n` +
    `1. LÍNGUA PORTUGUESA:\n- Interpretação e compreensão de textos\n- Concordância e regência verbal/nominal\n- Crase e pontuação\n\n` +
    `2. RACIOCÍNIO LÓGICO / MATEMÁTICA:\n- Porcentagem e proporções\n- Regra de três e diagramas lógicos\n\n` +
    `3. CONHECIMENTOS ESPECÍFICOS & LEGISLAÇÃO:\n- Lei Orgânica de ${c.cidade}\n- Nova Lei de Licitações (Lei 14.133/21)\n- Art. 37 da Constituição Federal\n\n` +
    `4. ROTINAS ADMINISTRATIVAS:\n- Redação Oficial e correspondências\n- Arquivamento e protocolo\n\n` +
    `Gerado pelo Radar de Concursos SP`;

  navigator.clipboard.writeText(texto).then(() => {
    mostrarToast('Plano de estudos copiado!', 'success');
  }).catch(() => {
    mostrarToast('Plano gerado com sucesso!', 'info');
  });
}
