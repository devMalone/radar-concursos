// js/supabase.js — Sincronização em Nuvem Supabase & Testador de Conexão

import { state, salvarLocal } from './state.js';
import { mostrarToast } from './utils.js';
import { renderizarRadar } from './radar.js';

export function iniciarSupabase() {
  const url = state.config.supabaseUrl;
  const key = state.config.supabaseKey;

  const dot = document.getElementById('syncIndicator');

  if (url && key && window.supabase) {
    try {
      state.supabase = window.supabase.createClient(url, key);
      state.isOnline = true;
      if (dot) {
        dot.classList.remove('offline');
        dot.title = "Supabase Conectado";
      }
    } catch (e) {
      console.warn('[Supabase] Falha ao inicializar client:', e);
      state.isOnline = false;
      if (dot) {
        dot.classList.add('offline');
        dot.title = "Supabase Desconectado";
      }
    }
  } else {
    state.isOnline = false;
    if (dot) {
      dot.classList.add('offline');
      dot.title = "Supabase Desconectado";
    }
  }
}

export async function sincronizarSupabase(comFeedback = false) {
  const btn = document.getElementById('btnSyncTop');
  if (btn) btn.style.opacity = '0.5';

  if (!state.supabase) {
    if (comFeedback) {
      mostrarToast('Supabase não conectado. Exibindo dados em cache local.', 'info');
    }
    if (btn) btn.style.opacity = '1';
    return;
  }

  try {
    const { data, error } = await state.supabase
      .from('concursos')
      .select('*')
      .order('updated_at', { ascending: false });

    if (error) {
      if (comFeedback) {
        mostrarToast('Erro ao sincronizar: ' + error.message, 'error');
      }
    } else if (data && data.length > 0) {
      // Safe merge defensivo para não perder dados locais e disparo de push para cidades monitoradas
      data.forEach(incoming => {
        const idx = state.concursos.findIndex(c => c.id === incoming.id);
        if (idx >= 0) {
          state.concursos[idx] = { ...state.concursos[idx], ...incoming };
        } else {
          state.concursos.unshift(incoming);
          const monitoradas = state.config.cidadesAlertas || [];
          if (monitoradas.includes(incoming.cidade)) {
            if ('Notification' in window && Notification.permission === 'granted' && navigator.serviceWorker) {
              navigator.serviceWorker.ready.then(reg => {
                reg.showNotification(`Radar SP: ${incoming.cidade}`, {
                  body: `${incoming.titulo} (${incoming.status})`,
                  icon: './favicon.png',
                  badge: './favicon.png',
                  tag: `alerta_${incoming.id}`,
                  data: { url: './index.html' }
                });
              }).catch(() => {});
            }
          }
        }
      });

      salvarLocal();
      renderizarRadar();

      if (comFeedback) {
        mostrarToast('Dados sincronizados com o Supabase com sucesso!', 'success');
      }
    } else {
      if (comFeedback) {
        mostrarToast('Tabela de concursos conectada.', 'info');
      }
    }
  } catch (err) {
    console.warn('[Supabase Sync]', err);
    if (comFeedback) {
      mostrarToast('Falha na comunicação com o banco.', 'error');
    }
  }

  if (btn) btn.style.opacity = '1';
}

export async function testarConexaoSupabase(url, key) {
  if (!url || !key) {
    mostrarToast('Preencha a URL e a Anon Key do Supabase.', 'error');
    return false;
  }

  try {
    const client = window.supabase.createClient(url, key);
    const { data, error } = await client.from('concursos').select('id').limit(1);

    if (error) {
      mostrarToast('Falha na conexão: ' + error.message, 'error');
      return false;
    } else {
      mostrarToast('Conexão com o Supabase validada com sucesso!', 'success');
      return true;
    }
  } catch (e) {
    mostrarToast('Erro ao conectar: ' + e.message, 'error');
    return false;
  }
}

export function salvarConfiguracoes(url, key, geminiKey, braveKey) {
  state.config.supabaseUrl = url;
  state.config.supabaseKey = key;
  state.config.geminiKey = geminiKey;
  state.config.braveKey = braveKey || '';

  salvarLocal();
  iniciarSupabase();
  mostrarToast('Configurações salvas com sucesso!', 'success');
}
