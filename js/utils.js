// js/utils.js — Utilitários de Interface e Ergonomia (Padrão Casa do Sagrado)

import { state } from './state.js';

let isClosingProgrammatically = false;

export function setIsClosingProgrammatically(val) {
  isClosingProgrammatically = !!val;
}

export function getIsClosingProgrammatically() {
  return isClosingProgrammatically;
}

export function abrirModal(modalId) {
  const modal = document.getElementById(modalId);
  if (!modal) return;

  state.modalStack.push(modalId);
  history.pushState({ modal: modalId }, '');

  modal.classList.add('active');
  refreshIcons();
}

export function fecharModalAtual(fromPopState = false) {
  if (state.modalStack.length === 0) return;

  const modalId = state.modalStack.pop();
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove('active');
  }

  if (!fromPopState) {
    setIsClosingProgrammatically(true);
    history.back();
  }
}

export function fecharModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove('active');
  }
  const idx = state.modalStack.indexOf(modalId);
  if (idx !== -1) {
    state.modalStack.splice(idx, 1);
    setIsClosingProgrammatically(true);
    history.back();
  }
}

export function toggleMostrarChave(inputId, btnEl) {
  const input = document.getElementById(inputId);
  if (!input) return;

  const isRevealed = input.classList.contains('revealed');
  const icon = btnEl.querySelector('i');

  if (!isRevealed) {
    input.classList.add('revealed');
    if (icon) icon.setAttribute('data-lucide', 'eye-off');
  } else {
    input.classList.remove('revealed');
    if (icon) icon.setAttribute('data-lucide', 'eye');
  }
  refreshIcons();
}

export function mostrarToast(msg, tipo = 'info') {
  const toast = document.getElementById('appToast');
  const toastMsg = document.getElementById('toastMsg');
  if (!toast || !toastMsg) return;

  toastMsg.textContent = msg;

  const icon = toast.querySelector('i');
  if (icon) {
    let iconName = 'info';
    let color = '#93c5fd';
    if (tipo === 'success') { iconName = 'check-circle'; color = '#10b981'; }
    if (tipo === 'error') { iconName = 'alert-circle'; color = '#ef4444'; }
    icon.setAttribute('data-lucide', iconName);
    icon.style.color = color;
  }

  refreshIcons();
  toast.classList.add('active');

  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    toast.classList.remove('active');
  }, 3200);
}

let toastTimeout = null;

export function refreshIcons() {
  if (window.lucide) {
    window.lucide.createIcons();
  }
}

export function escapeHtml(str) {
  if (typeof str !== 'string') return '';
  return str.replace(/[&<>"']/g, function(m) {
    switch (m) {
      case '&': return '&amp;';
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '"': return '&quot;';
      case "'": return '&#039;';
      default: return m;
    }
  });
}

// Gerador de Brasão Vetorial SVG Paulista por Município
export function gerarSvgBrasao(cidade) {
  const c = cidade || "";
  let corFundo = "#1e3a8a";
  let corDetalhe = "#3b82f6";
  let corOuro = "#f59e0b";
  let simboloPath = `<path d="M16 10 L20 18 L12 18 Z" fill="${corOuro}"/>`;

  if (c.includes("Rio Preto")) {
    corFundo = "#1d4ed8";
    corDetalhe = "#60a5fa";
    simboloPath = `
      <path d="M16 9 V23 M9 16 H23" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round"/>
      <path d="M10 21 Q16 19 22 21" stroke="${corOuro}" stroke-width="1.8" fill="none"/>
    `;
  } else if (c.includes("Catanduva")) {
    corFundo = "#047857";
    corDetalhe = "#dc2626";
    simboloPath = `
      <circle cx="16" cy="16" r="4.5" fill="none" stroke="${corOuro}" stroke-width="2"/>
      <path d="M16 9 V11 M16 21 V23 M9 16 H11 M21 16 H23" stroke="${corOuro}" stroke-width="2" stroke-linecap="round"/>
    `;
  } else if (c.includes("Mirassol")) {
    corFundo = "#b45309";
    corDetalhe = "#2563eb";
    simboloPath = `
      <circle cx="16" cy="16" r="4" fill="${corOuro}"/>
      <path d="M16 8 V10 M16 22 V24 M8 16 H10 M22 16 H24 M10.5 10.5 L12 12 M20 20 L21.5 21.5 M10.5 21.5 L12 20 M20 12 L21.5 10.5" stroke="${corOuro}" stroke-width="1.5"/>
    `;
  } else if (c.includes("Potirendaba")) {
    corFundo = "#15803d";
    corDetalhe = "#0284c7";
    simboloPath = `
      <path d="M10 20 L16 12 L22 20 Z" fill="${corOuro}" opacity="0.9"/>
      <circle cx="16" cy="11" r="1.8" fill="#ffffff"/>
    `;
  } else if (c.includes("Cedral")) {
    corFundo = "#065f46";
    corDetalhe = "#d97706";
    simboloPath = `
      <path d="M16 9 L20 15 H17 L21 21 H11 L15 15 H12 Z" fill="#ffffff"/>
    `;
  } else if (c.includes("Votuporanga")) {
    corFundo = "#1e40af";
    corDetalhe = "#d97706";
    simboloPath = `
      <path d="M12 21 V13 H20 V21 Z" fill="${corOuro}"/>
      <path d="M11 13 L16 8 L21 13 Z" fill="#ffffff"/>
    `;
  } else if (c.includes("Olímpia")) {
    corFundo = "#0369a1";
    corDetalhe = "#15803d";
    simboloPath = `
      <path d="M10 17 Q16 13 22 17 M10 21 Q16 17 22 21" stroke="#ffffff" stroke-width="1.8" fill="none" stroke-linecap="round"/>
    `;
  } else {
    corFundo = "#334155";
    corDetalhe = "#64748b";
    simboloPath = `
      <path d="M16 10 L21 15 L16 20 L11 15 Z" fill="${corOuro}"/>
    `;
  }

  return `
    <svg class="municipal-crest-svg" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M6 5 C6 5 16 3 16 3 C16 3 26 5 26 5 V17 C26 23.5 16 29 16 29 C16 29 6 23.5 6 17 V5 Z" fill="${corFundo}" stroke="rgba(255,255,255,0.25)" stroke-width="1.2"/>
      <path d="M8 7 C8 7 16 5 16 5 C16 5 24 7 24 7 V16.5 C24 22 16 26.8 16 26.8 C16 26.8 8 22 8 16.5 V7 Z" fill="${corDetalhe}" opacity="0.35"/>
      ${simboloPath}
      <path d="M9 3 H23 V5 H21 V4 H19 V5 H17 V4 H15 V5 H13 V4 H11 V5 H9 Z" fill="#e2e8f0" stroke="#94a3b8" stroke-width="0.6"/>
    </svg>
  `;
}
