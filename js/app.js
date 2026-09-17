// js/app.js — Orquestrador Principal do Radar de Concursos SP (v13 PWA)

import { state, carregarDadosLocais, salvarLocal } from './state.js';
import { 
  abrirModal, 
  fecharModal, 
  fecharModalAtual, 
  mostrarToast, 
  refreshIcons,
  toggleMostrarChave,
  getIsClosingProgrammatically,
  setIsClosingProgrammatically
} from './utils.js';
import { 
  renderizarRadar, 
  toggleAcompanhar, 
  abrirModalPlano, 
  copiarPlanoEstudo,
  toggleTopicoEstudo,
  compartilharConcurso,
  abrirOpcoesAgenda,
  abrirGoogleCalendar,
  baixarArquivoICS,
  toggleDetalhesCard
} from './radar.js';
import { 
  renderizarMunicipios, 
  abrirModalPortais,
  PORTAIS_CIDADES
} from './portais.js';
import { 
  abrirModalConsultaAvulsa, 
  executarConsultaAvulsaLive,
  resetarFormularioConsulta
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
  resetarFormularioConsulta,
  toggleDetalhesCard,
  fecharModal,
  fecharModalAtual,
  sincronizarSupabase,
  testarConexaoSupabase,
  salvarConfiguracoes: salvarConfiguracoesApp,
  ativarNotificacoes,
  testarNotificacaoNativa,
  toggleCidadeAlerta,
  adicionarCidadeCustom,
  adicionarInteresseCustom,
  removerInteresse,
  toggleMostrarChave,
  abrirOpcoesAgenda,
  abrirGoogleCalendar,
  baixarArquivoICS
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

  if (urlEl) urlEl.value = state.config.supabaseUrl || '';
  if (keyEl) keyEl.value = state.config.supabaseKey || '';
  if (geminiEl) geminiEl.value = state.config.geminiKey || '';

  renderizarChipsInteresses();
  renderizarChipsCidadesAlerta();
}

// ================= MOTOR DE INTERESSES DO USUÁRIO =================
function renderizarChipsInteresses() {
  const container = document.getElementById('interessesContainer');
  if (!container) return;

  const interesses = state.config.interesses || [];
  if (interesses.length === 0) {
    container.innerHTML = `
      <span style="font-size: 11.5px; color: var(--text-dim); font-style: italic;">
        Nenhuma palavra-chave cadastrada. O app usará visual neutro para todos os cargos.
      </span>
    `;
    return;
  }

  container.innerHTML = interesses.map((tag, idx) => `
    <span class="interesse-chip-item">
      <span>${escapeHtml(tag)}</span>
      <button type="button" class="btn-remove-chip" onclick="window.radarActions.removerInteresse(${idx})" title="Remover termo">
        &times;
      </button>
    </span>
  `).join('');
}

function adicionarInteresseCustom() {
  const input = document.getElementById('inputNovoInteresse');
  if (!input) return;
  const val = input.value.trim();
  if (!val) return;

  if (!state.config.interesses) state.config.interesses = [];
  const normalizado = val.toLowerCase();
  const jaExiste = state.config.interesses.some(i => i.toLowerCase() === normalizado);

  if (jaExiste) {
    mostrarToast('Este termo de interesse já está cadastrado.', 'info');
    return;
  }

  state.config.interesses.push(val);
  input.value = '';
  salvarLocal();
  renderizarChipsInteresses();
  renderizarRadar();
  mostrarToast(`Interesse "${val}" adicionado!`, 'success');
}

function removerInteresse(idx) {
  if (!state.config.interesses) return;
  if (idx >= 0 && idx < state.config.interesses.length) {
    const removido = state.config.interesses.splice(idx, 1);
    salvarLocal();
    renderizarChipsInteresses();
    renderizarRadar();
    mostrarToast(`Termo "${removido[0]}" removido.`);
  }
}

// ================= MUNICÍPIOS MONITORADOS PARA ALERTAS =================
function renderizarChipsCidadesAlerta() {
  const container = document.getElementById('alertCitiesContainer');
  if (!container) return;

  const todasCidades = Object.keys(PORTAIS_CIDADES);
  const selecionadas = state.config.cidadesAlertas || [];

  // Combina com cidades custom que o usuário adicionou
  const listaUnica = Array.from(new Set([...todasCidades, ...selecionadas]));

  container.innerHTML = listaUnica.map(cid => {
    const isAtivo = selecionadas.includes(cid);
    return `
      <span class="alert-city-chip ${isAtivo ? 'active' : ''}" onclick="window.radarActions.toggleCidadeAlerta('${escapeHtml(cid)}')">
        ${isAtivo ? '✓ ' : '+ '}${escapeHtml(cid)}
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

function adicionarCidadeCustom() {
  const input = document.getElementById('inputNovaCidadeAlerta');
  if (!input) return;
  const cid = input.value.trim();
  if (!cid) return;

  if (!state.config.cidadesAlertas) state.config.cidadesAlertas = [];
  if (!state.config.cidadesAlertas.includes(cid)) {
    state.config.cidadesAlertas.push(cid);
    salvarLocal();
    renderizarChipsCidadesAlerta();
    mostrarToast(`Cidade ${cid} monitorada com sucesso!`, 'success');
  }
  input.value = '';
}

function salvarConfiguracoesApp() {
  const url = document.getElementById('cfgSupabaseUrl').value.trim();
  const key = document.getElementById('cfgSupabaseKey').value.trim();
  const gemini = document.getElementById('cfgGeminiKey').value.trim();
  salvarConfiguracoes(url, key, gemini, state.config.interesses);
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
    const cidadeExemplo = cidades[0] || 'São José do Rio Preto';

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

// ================= BOTÃO VOLTAR DO ANDROID (POPSTATE SEGURO) =================
let ultimoToqueSair = 0;
window.addEventListener('popstate', (e) => {
  // Se o fechamento foi programático (via botão X ou conclusão), ignora sem disparar saída
  if (getIsClosingProgrammatically()) {
    setIsClosingProgrammatically(false);
    return;
  }

  // Se havia modal aberto na pilha e o usuário tocou no botão Voltar físico do Android
  if (state.modalStack.length > 0) {
    const modalId = state.modalStack.pop();
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.remove('active');
    }
    return;
  }

  // Se estiver em outra aba, retorna para o Radar
  const tabRadar = document.getElementById('tab-radar');
  if (tabRadar && !tabRadar.classList.contains('active')) {
    mudarAba('tab-radar');
    history.pushState(null, '');
    return;
  }

  // Se já estiver no Radar e não houver modais, confirmação de segurança para sair
  const agora = Date.now();
  if (agora - ultimoToqueSair < 2200) {
    // Permite sair
  } else {
    ultimoToqueSair = agora;
    mostrarToast('Pressione novamente para sair do app', 'info');
    history.pushState(null, '');
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
      salvarConfiguracoesApp();
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

  // Adicionar termo de interesse no Enter
  const inputInteresse = document.getElementById('inputNovoInteresse');
  if (inputInteresse) {
    inputInteresse.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        adicionarInteresseCustom();
      }
    });
  }

  // Adicionar cidade custom no Enter
  const inputCidadeAlerta = document.getElementById('inputNovaCidadeAlerta');
  if (inputCidadeAlerta) {
    inputCidadeAlerta.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        adicionarCidadeCustom();
      }
    });
  }

  // NOTA ERGONÔMICA: Modais NÃO fecham ao clicar no overlay para evitar
  // toques acidentais e fechamento involuntário durante digitação.
  // Fechamento exclusivo pelo botão X ou botão Voltar do dispositivo.
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
