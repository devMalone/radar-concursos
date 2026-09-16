// js/app.js — Orquestrador Principal do Radar de Concursos SP (Padrão Casa do Sagrado)

import { state, carregarDadosLocais, salvarLocal } from './state.js';
import { 
  abrirModal, 
  fecharModal, 
  fecharModalAtual, 
  mostrarToast, 
  refreshIcons,
  toggleMostrarChave
} from './utils.js';
import { 
  renderizarRadar, 
  toggleAcompanhar, 
  abrirModalPlano, 
  copiarPlanoEstudo,
  toggleTopicoEstudo,
  compartilharConcurso
} from './radar.js';
import { 
  renderizarMunicipios, 
  abrirModalPortais,
  PORTAIS_CIDADES
} from './portais.js';
import { 
  abrirModalConsultaAvulsa, 
  executarConsultaAvulsaLive,
  setModoConsulta
} from './consulta.js';
import { 
  iniciarSupabase, 
  sincronizarSupabase, 
  testarConexaoSupabase, 
  salvarConfiguracoes 
} from './supabase.js';

// Expõe ações globais para cliques inline no HTML
window.radarActions = {
  mudarAba,
  toggleAcompanhar,
  abrirModalPlano,
  copiarPlanoEstudo,
  toggleTopicoEstudo,
  compartilharConcurso,
  abrirModalPortais,
  abrirModalConsultaAvulsa,
  executarConsultaAvulsaLive,
  setModoConsulta,
  fecharModal,
  fecharModalAtual,
  sincronizarSupabase,
  testarConexaoSupabase,
  salvarConfiguracoes,
  ativarNotificacoes,
  testarNotificacaoNativa,
  toggleCidadeAlerta,
  toggleMostrarChave
};

// ================= SINCRONIZAÇÃO DE ALTURA (100dvh) =================
function sincronizarAlturaViewport() {
  const altura = window.innerHeight;
  document.documentElement.style.setProperty('--app-height', `${altura}px`);
}
window.addEventListener('resize', sincronizarAlturaViewport);
window.addEventListener('orientationchange', sincronizarAlturaViewport);
sincronizarAlturaViewport();

// ================= ROTEAMENTO DE ABAS INFERIORES =================
export function mudarAba(abaId) {
  // Esconde todas as abas
  document.querySelectorAll('.tab-view').forEach(aba => {
    aba.classList.remove('active');
  });

  // Desativa todos os botões do bottom nav
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.classList.remove('active');
  });

  // Ativa a aba alvo
  const abaAlvo = document.getElementById(abaId);
  if (abaAlvo) {
    abaAlvo.classList.add('active');
  }

  // Ativa o botão correspondente
  const btnAlvo = document.querySelector(`.nav-btn[data-tab="${abaId}"]`);
  if (btnAlvo) {
    btnAlvo.classList.add('active');
  }

  // Comportamentos específicos de cada aba
  if (abaId === 'tab-radar') {
    renderizarRadar();
  } else if (abaId === 'tab-acompanhados') {
    renderizarRadar();
  } else if (abaId === 'tab-municipios') {
    renderizarMunicipios();
  } else if (abaId === 'tab-config') {
    carregarInputsConfiguracoes();
  }

  refreshIcons();
}

function carregarInputsConfiguracoes() {
  const urlEl = document.getElementById('cfgSupabaseUrl');
  const keyEl = document.getElementById('cfgSupabaseKey');
  const geminiEl = document.getElementById('cfgGeminiKey');
  const braveEl = document.getElementById('cfgBraveKey');

  if (urlEl) urlEl.value = state.config.supabaseUrl || '';
  if (keyEl) keyEl.value = state.config.supabaseKey || '';
  if (geminiEl) geminiEl.value = state.config.geminiKey || '';
  if (braveEl) braveEl.value = state.config.braveKey || '';

  renderizarChipsCidadesAlerta();
}

function renderizarChipsCidadesAlerta() {
  const container = document.getElementById('alertCitiesContainer');
  if (!container) return;

  const todasCidades = Object.keys(PORTAIS_CIDADES);
  const selecionadas = state.config.cidadesAlertas || [];

  container.innerHTML = todasCidades.map(cid => {
    const isAtivo = selecionadas.includes(cid);
    return `
      <span class="alert-city-chip ${isAtivo ? 'active' : ''}" onclick="window.radarActions.toggleCidadeAlerta('${cid}')">
        ${isAtivo ? '✓ ' : '+ '}${cid}
      </span>
    `;
  }).join('');
}

function toggleCidadeAlerta(cidade) {
  if (!state.config.cidadesAlertas) state.config.cidadesAlertas = [];
  const idx = state.config.cidadesAlertas.indexOf(cidade);
  if (idx > -1) {
    state.config.cidadesAlertas.splice(idx, 1);
    mostrarToast(`Alertas desativados para ${cidade}.`);
  } else {
    state.config.cidadesAlertas.push(cidade);
    mostrarToast(`Alertas ativados para ${cidade}!`, 'success');
  }
  salvarLocal();
  renderizarChipsCidadesAlerta();
}

async function testarNotificacaoNativa() {
  if (!('Notification' in window)) {
    mostrarToast('Este navegador não suporta notificações nativas.', 'error');
    return;
  }

  if (Notification.permission !== 'granted') {
    await ativarNotificacoes();
    return;
  }

  try {
    const reg = await navigator.serviceWorker.ready;
    const cidades = state.config.cidadesAlertas || [];
    const cidadeExemplo = cidades[0] || 'Catanduva';

    reg.showNotification(`Radar de Concursos: ${cidadeExemplo}`, {
      body: `Novo edital oficial publicado! Inscrições abertas e retificações apuradas.`,
      icon: './favicon.png',
      badge: './favicon.png',
      vibrate: [120, 60, 120],
      tag: 'radar-teste-alerta',
      data: { url: './index.html' }
    });
    mostrarToast('Notificação enviada com sucesso!', 'success');
  } catch (e) {
    console.warn('[Notificação Teste]', e);
    mostrarToast('Erro ao disparar notificação.', 'error');
  }
}

// ================= BOTÃO VOLTAR DO ANDROID (POPSTATE) =================
let ultimoToqueSair = 0;
window.addEventListener('popstate', (e) => {
  if (state.modalStack.length > 0) {
    fecharModalAtual(true);
  } else {
    // Se estiver em outra aba, volta para o Radar
    const tabRadar = document.getElementById('tab-radar');
    if (tabRadar && !tabRadar.classList.contains('active')) {
      mudarAba('tab-radar');
      history.pushState(null, '');
      return;
    }

    // Se já estiver no Radar, dupla confirmação para sair
    const agora = Date.now();
    if (agora - ultimoToqueSair < 2200) {
      // Permite fechar/sair
    } else {
      ultimoToqueSair = agora;
      mostrarToast('Pressione novamente para sair do app', 'info');
      history.pushState(null, '');
    }
  }
});

// ================= PWA INSTALL BANNER =================
let deferredPrompt = null;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  const installBtn = document.getElementById('btnInstalarApp');
  if (installBtn) {
    installBtn.style.display = 'flex';
  }
});

function configurarInstalacaoPwa() {
  const installBtn = document.getElementById('btnInstalarApp');
  if (!installBtn) return;

  installBtn.addEventListener('click', async () => {
    if (!deferredPrompt) {
      mostrarToast('Para instalar, use a opção "Adicionar à tela inicial" do navegador.', 'info');
      return;
    }
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      mostrarToast('Aplicativo adicionado à sua tela inicial!', 'success');
      installBtn.style.display = 'none';
    }
    deferredPrompt = null;
  });
}

// ================= NOTIFICAÇÕES WEB PUSH =================
async function ativarNotificacoes() {
  if (!('Notification' in window)) {
    mostrarToast('Este navegador não suporta notificações nativas.', 'error');
    return;
  }

  if (Notification.permission === 'granted') {
    mostrarToast('As notificações já estão ativadas no seu aparelho.', 'info');
    return;
  }

  try {
    const perm = await Notification.requestPermission();
    if (perm === 'granted') {
      mostrarToast('Notificações ativadas! Você receberá alertas de editais.', 'success');
      if ('serviceWorker' in navigator) {
        const reg = await navigator.serviceWorker.ready;
        reg.showNotification('Radar de Concursos SP', {
          body: 'Notificações ativas para concursos e licitações na região.',
          icon: './favicon.png'
        });
      }
    } else {
      mostrarToast('Permissão de notificações não concedida.', 'info');
    }
  } catch (err) {
    console.warn('[Push]', err);
  }
}

// ================= FILTROS & EVENTOS DA INTERFACE =================
function configurarEventosInterface() {
  // Pílulas de filtro de status
  document.querySelectorAll('.pill[data-filter]').forEach(pill => {
    pill.addEventListener('click', () => {
      document.querySelectorAll('.pill[data-filter]').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      state.filtroTab = pill.getAttribute('data-filter');
      renderizarRadar();
    });
  });

  // Busca textual
  const inputBusca = document.getElementById('inputBusca');
  if (inputBusca) {
    inputBusca.addEventListener('input', (e) => {
      state.filtroTexto = e.target.value.trim().toLowerCase();
      renderizarRadar();
    });
  }

  // Filtro por cidade
  const selectCidade = document.getElementById('selectCidade');
  if (selectCidade) {
    selectCidade.addEventListener('change', (e) => {
      state.filtroCidade = e.target.value;
      renderizarRadar();
    });
  }

  // Navegação inferior
  document.querySelectorAll('.nav-btn[data-tab]').forEach(btn => {
    btn.addEventListener('click', () => {
      const tabId = btn.getAttribute('data-tab');
      mudarAba(tabId);
    });
  });

  // Floating Action Button
  const fab = document.getElementById('fabConsulta');
  if (fab) {
    fab.addEventListener('click', () => {
      abrirModalConsultaAvulsa();
    });
  }

  // Botão de sync no topo
  const btnSyncTop = document.getElementById('btnSyncTop');
  if (btnSyncTop) {
    btnSyncTop.addEventListener('click', () => {
      sincronizarSupabase(true);
    });
  }

  // Salvar formulário de configurações
  const btnSalvarCfg = document.getElementById('btnSalvarConfig');
  if (btnSalvarCfg) {
    btnSalvarCfg.addEventListener('click', () => {
      const url = document.getElementById('cfgSupabaseUrl').value.trim();
      const key = document.getElementById('cfgSupabaseKey').value.trim();
      const gemini = document.getElementById('cfgGeminiKey').value.trim();
      const braveEl = document.getElementById('cfgBraveKey');
      const brave = braveEl ? braveEl.value.trim() : '';
      salvarConfiguracoes(url, key, gemini, brave);
    });
  }

  // Testar conexão Supabase
  const btnTestarCfg = document.getElementById('btnTestarConfig');
  if (btnTestarCfg) {
    btnTestarCfg.addEventListener('click', () => {
      const url = document.getElementById('cfgSupabaseUrl').value.trim();
      const key = document.getElementById('cfgSupabaseKey').value.trim();
      testarConexaoSupabase(url, key);
    });
  }

  // Fechar modais ao clicar no overlay
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        fecharModalAtual();
      }
    });
  });
}

// ================= INICIALIZAÇÃO DA APLICAÇÃO =================
window.addEventListener('DOMContentLoaded', async () => {
  carregarDadosLocais();
  iniciarSupabase();
  configurarEventosInterface();
  configurarInstalacaoPwa();
  
  // Render inicial
  renderizarRadar();
  refreshIcons();

  // Garante estado no histórico para o botão voltar do Android
  history.replaceState(null, '');

  // Sincronização em segundo plano silenciosa
  await sincronizarSupabase(false);
});

// Registro do Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(err => {
      console.warn('[Service Worker] Registro:', err);
    });
  });
}
