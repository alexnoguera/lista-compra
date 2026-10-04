// app.js - Lógica principal de la aplicación Lista de la Compra

import { CATEGORIES, QUICK_SUGGESTIONS, detectCategory } from './categories.js';
import { loadFromGitHub, saveToGitHub, testGitHubConnection } from './github-storage.js';

// Claves de almacenamiento local
const STORAGE_ITEMS_KEY = 'lista_compra_items_v1';
const STORAGE_SETTINGS_KEY = 'lista_compra_settings_v1';
const STORAGE_SHA_KEY = 'lista_compra_sha_v1';

// Estado global de la aplicación
const state = {
  items: [],
  currentFilter: 'all',
  settings: {
    owner: 'alexnoguera',
    repo: 'lista-compra',
    token: '',
    pin: '',
    theme: 'system',
    syncInterval: '30',
    haptics: true
  },
  currentSha: null,
  isSyncing: false,
  syncTimer: null,
  isCompletedCollapsed: false
};

// Generador de identificadores únicos
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
}

// ================= GESTIÓN DEL ALMACENAMIENTO LOCAL =================

const INITIAL_ITEMS = [
  { id: 'init_1', name: 'Leche', quantity: '2', category: 'lacteos_huevos', completed: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'init_2', name: 'Huevos', quantity: '1 docena', category: 'lacteos_huevos', completed: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'init_3', name: 'Plátanos', quantity: '1 kg', category: 'frutas_verduras', completed: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'init_4', name: 'Pan', quantity: '1 barra', category: 'panaderia_cereales', completed: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
];

function loadLocalData() {
  try {
    const rawItems = localStorage.getItem(STORAGE_ITEMS_KEY);
    if (rawItems) {
      state.items = JSON.parse(rawItems);
    } else {
      state.items = INITIAL_ITEMS;
      saveLocalData();
    }

    const rawSettings = localStorage.getItem(STORAGE_SETTINGS_KEY);
    if (rawSettings) {
      state.settings = { ...state.settings, ...JSON.parse(rawSettings) };
    }

    state.currentSha = localStorage.getItem(STORAGE_SHA_KEY) || null;
  } catch (e) {
    console.error('Error al cargar datos locales:', e);
  }
}

function saveLocalData() {
  try {
    localStorage.setItem(STORAGE_ITEMS_KEY, JSON.stringify(state.items));
    if (state.currentSha) {
      localStorage.setItem(STORAGE_SHA_KEY, state.currentSha);
    }
  } catch (e) {
    console.error('Error al guardar datos locales:', e);
  }
}

function saveLocalSettings() {
  try {
    localStorage.setItem(STORAGE_SETTINGS_KEY, JSON.stringify(state.settings));
  } catch (e) {
    console.error('Error al guardar ajustes locales:', e);
  }
}

// ================= GESTIÓN DEL ENLACE MÁGICO / INVITACIÓN =================

function checkMagicLink() {
  const hash = window.location.hash;
  if (!hash || !hash.includes('setup=')) return;

  try {
    const params = new URLSearchParams(hash.substring(1));
    const setupB64 = params.get('setup');
    if (setupB64) {
      const decodedJson = atob(setupB64);
      const parsedConfig = JSON.parse(decodedJson);

      const owner = parsedConfig.o || parsedConfig.owner;
      const repo = parsedConfig.r || parsedConfig.repo || 'lista-compra';
      const token = parsedConfig.t || parsedConfig.token;
      const pin = parsedConfig.p || parsedConfig.pin || '';

      if (owner && repo && token) {
        state.settings.owner = owner;
        state.settings.repo = repo;
        state.settings.token = token;
        state.settings.pin = pin;

        saveLocalSettings();
        showToast('🎉 ¡Conectado con éxito a la lista compartida!');

        // Limpiar el hash de la barra de direcciones por seguridad
        window.history.replaceState(null, '', window.location.pathname);
      }
    }
  } catch (e) {
    console.error('Error al procesar enlace mágico:', e);
    showToast('⚠️ No se pudo procesar el enlace de configuración.');
  }
}

function generateMagicLinkUrl() {
  if (!state.settings.owner || !state.settings.token) return null;

  // Claves compactas para reducir drásticamente el tamaño del código QR
  const payload = {
    o: state.settings.owner.trim(),
    r: state.settings.repo.trim(),
    t: state.settings.token.trim()
  };

  if (state.settings.pin) {
    payload.p = state.settings.pin.trim();
  }

  const b64 = btoa(JSON.stringify(payload));
  const baseUrl = window.location.origin + window.location.pathname;
  return `${baseUrl}#setup=${b64}`;
}

// ================= SINCRONIZACIÓN CON GITHUB =================

function setSyncState(status, text) {
  const el = document.getElementById('syncStatus');
  const syncBtn = document.querySelector('.icon-sync');
  if (!el) return;

  el.className = `sync-status status-${status}`;
  el.querySelector('.status-text').textContent = text;

  if (status === 'syncing') {
    syncBtn?.classList.add('spinning');
  } else {
    syncBtn?.classList.remove('spinning');
  }
}

async function syncWithGitHub(forcePush = false) {
  if (!state.settings.owner || !state.settings.token) {
    setSyncState('local', 'Modo Local');
    return;
  }

  if (state.isSyncing) return;
  state.isSyncing = true;
  setSyncState('syncing', 'Sincronizando...');

  try {
    if (forcePush) {
      // Guardar lista local en GitHub
      const result = await saveToGitHub(state.settings, state.items, state.currentSha);
      if (result.ok) {
        state.currentSha = result.sha;
        saveLocalData();
        setSyncState('synced', 'Sincronizado');
      }
    } else {
      // Descargar cambios más recientes de GitHub
      const remote = await loadFromGitHub(state.settings);

      if (remote.exists) {
        state.currentSha = remote.sha;
        // Si hay cambios en los elementos remotos, actualizar
        if (JSON.stringify(remote.items) !== JSON.stringify(state.items)) {
          state.items = remote.items;
          saveLocalData();
          renderItems();
        }
        setSyncState('synced', 'Sincronizado');
      } else {
        // El archivo aún no existe en GitHub, lo creamos con los datos locales
        const result = await saveToGitHub(state.settings, state.items, null);
        state.currentSha = result.sha;
        saveLocalData();
        setSyncState('synced', 'Sincronizado');
      }
    }
  } catch (err) {
    console.error('Error de sincronización:', err);
    if (err.message?.includes('INVALID_PIN')) {
      setSyncState('error', 'PIN incorrecto');
      showToast('🔒 El PIN familiar no coincide con los datos cifrados.');
    } else {
      setSyncState('error', 'Sin conexión');
    }
  } finally {
    state.isSyncing = false;
  }
}

function startAutoSync() {
  if (state.syncTimer) clearInterval(state.syncTimer);

  const seconds = parseInt(state.settings.syncInterval, 10);
  if (!isNaN(seconds) && seconds > 0) {
    state.syncTimer = setInterval(() => {
      if (document.visibilityState === 'visible') {
        syncWithGitHub(false);
      }
    }, seconds * 1000);
  }
}

// ================= RENDERIZADO DE LA INTERFAZ =================

function renderQuickChips() {
  const container = document.getElementById('quickChipsContainer');
  if (!container) return;

  container.innerHTML = '';
  QUICK_SUGGESTIONS.forEach(sug => {
    const cat = CATEGORIES[sug.category] || CATEGORIES.otros;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'chip-btn';
    btn.innerHTML = `<span>${cat.emoji}</span><span>${sug.name}</span>`;
    btn.addEventListener('click', () => {
      quickAddItem(sug.name, sug.category, sug.quantity);
    });
    container.appendChild(btn);
  });
}

function renderItems() {
  const container = document.getElementById('itemsContainer');
  const emptyState = document.getElementById('emptyState');
  const completedSection = document.getElementById('completedSection');
  const completedContainer = document.getElementById('completedContainer');
  const completedCountEl = document.getElementById('completedCount');
  const countAllEl = document.getElementById('countAll');

  if (!container) return;

  container.innerHTML = '';
  completedContainer.innerHTML = '';

  const activeItems = state.items.filter(i => !i.completed);
  const completedItems = state.items.filter(i => i.completed);

  // Contador total pendientes
  if (countAllEl) countAllEl.textContent = activeItems.length;

  // Filtrar según categoría seleccionada
  let visibleActive = activeItems;
  if (state.currentFilter !== 'all') {
    visibleActive = activeItems.filter(i => i.category === state.currentFilter);
  }

  // Estado vacío
  if (visibleActive.length === 0 && completedItems.length === 0) {
    emptyState.classList.remove('hidden');
  } else {
    emptyState.classList.add('hidden');
  }

  // Agrupar elementos activos por categoría
  const groups = {};
  visibleActive.forEach(item => {
    const catId = item.category || 'otros';
    if (!groups[catId]) groups[catId] = [];
    groups[catId].push(item);
  });

  // Renderizar grupos
  Object.keys(CATEGORIES).forEach(catId => {
    const groupItems = groups[catId];
    if (!groupItems || groupItems.length === 0) return;

    const catData = CATEGORIES[catId];
    const groupEl = document.createElement('div');
    groupEl.className = 'category-group';

    const headerEl = document.createElement('div');
    headerEl.className = 'category-group-header';
    headerEl.innerHTML = `
      <span>${catData.emoji} ${catData.name}</span>
      <span class="group-count">${groupItems.length}</span>
    `;
    groupEl.appendChild(headerEl);

    groupItems.forEach(item => {
      groupEl.appendChild(createItemCard(item));
    });

    container.appendChild(groupEl);
  });

  // Sección de Comprados
  if (completedItems.length > 0) {
    completedSection.classList.remove('hidden');
    completedCountEl.textContent = completedItems.length;
    completedItems.forEach(item => {
      completedContainer.appendChild(createItemCard(item));
    });
  } else {
    completedSection.classList.add('hidden');
  }

  // Actualizar banner si no está configurado GitHub
  const banner = document.getElementById('unconfiguredBanner');
  const settingsBadge = document.getElementById('settingsBadge');
  const isConfigured = Boolean(state.settings.owner && state.settings.token);

  if (banner) banner.classList.toggle('hidden', isConfigured);
  if (settingsBadge) settingsBadge.classList.toggle('visible', !isConfigured);
}

function createItemCard(item) {
  const card = document.createElement('div');
  card.className = `item-card ${item.completed ? 'completed' : ''}`;
  card.dataset.id = item.id;

  const catData = CATEGORIES[item.category] || CATEGORIES.otros;

  card.innerHTML = `
    <div class="item-left">
      <div class="custom-checkbox" aria-label="${item.completed ? 'Desmarcar' : 'Comprar'}">
        <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="3" fill="none">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
      </div>
      <div class="item-info">
        <div class="item-name-row">
          <span class="item-name">${escapeHtml(item.name)}</span>
          ${item.quantity && item.quantity !== '1' ? `<span class="item-qty-badge">${escapeHtml(item.quantity)}</span>` : ''}
        </div>
        <div class="item-meta">
          <span class="item-cat-tag">${catData.emoji} ${catData.name}</span>
        </div>
      </div>
    </div>
    <div class="item-actions">
      <button class="btn-item-delete" title="Eliminar producto" aria-label="Eliminar">
        <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none">
          <polyline points="3 6 5 6 21 6"></polyline>
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
        </svg>
      </button>
    </div>
  `;

  // Marcar / desmarcar al hacer clic en el checkbox o en el texto
  const leftSide = card.querySelector('.item-left');
  leftSide.addEventListener('click', () => toggleItem(item.id));

  // Borrar producto
  const btnDelete = card.querySelector('.btn-item-delete');
  btnDelete.addEventListener('click', (e) => {
    e.stopPropagation();
    deleteItem(item.id);
  });

  return card;
}

// ================= ACCIONES DE PRODUCTOS =================

function quickAddItem(name, category, quantity = '1') {
  // Evitar duplicados exactos si ya está en la lista pendiente
  const existing = state.items.find(i => !i.completed && i.name.toLowerCase() === name.toLowerCase());
  if (existing) {
    showToast(`"${name}" ya está en tu lista`);
    return;
  }

  const newItem = {
    id: generateId(),
    name: name.trim(),
    quantity: quantity.trim(),
    category: category || detectCategory(name),
    completed: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  state.items.unshift(newItem);
  saveLocalData();
  renderItems();
  triggerVibration(25);
  showToast(`Añadido: ${newItem.name}`);

  // Sincronizar en segundo plano
  syncWithGitHub(true);
}

function addItemFromForm(e) {
  e.preventDefault();
  const inputName = document.getElementById('inputItemName');
  const inputQty = document.getElementById('inputQuantity');
  const selectCat = document.getElementById('selectCategory');

  const name = inputName.value.trim();
  if (!name) return;

  const quantity = inputQty.value.trim() || '1';
  let category = selectCat.value;
  if (category === 'auto') {
    category = detectCategory(name);
  }

  quickAddItem(name, category, quantity);

  // Reset de formulario
  inputName.value = '';
  inputQty.value = '1';
  selectCat.value = 'auto';
  updateCategoryPreview('');
  inputName.focus();
}

function toggleItem(id) {
  const item = state.items.find(i => i.id === id);
  if (!item) return;

  item.completed = !item.completed;
  item.updatedAt = new Date().toISOString();

  saveLocalData();
  renderItems();

  if (item.completed) {
    triggerVibration(45);
  }

  syncWithGitHub(true);
}

function deleteItem(id) {
  state.items = state.items.filter(i => i.id !== id);
  saveLocalData();
  renderItems();
  triggerVibration(20);
  syncWithGitHub(true);
}

function clearCompletedItems() {
  if (!confirm('¿Quieres eliminar todos los productos comprados de la lista?')) return;
  state.items = state.items.filter(i => !i.completed);
  saveLocalData();
  renderItems();
  showToast('Comprados eliminados');
  syncWithGitHub(true);
}

function updateCategoryPreview(text) {
  const previewEmoji = document.getElementById('previewEmoji');
  const previewName = document.getElementById('previewName');
  const selectCat = document.getElementById('selectCategory');

  if (!previewEmoji || !previewName) return;

  let catId = selectCat.value;
  if (catId === 'auto') {
    catId = text.trim() ? detectCategory(text) : 'otros';
  }

  const catData = CATEGORIES[catId] || CATEGORIES.otros;
  previewEmoji.textContent = catData.emoji;
  previewName.textContent = catData.name;
}

// ================= UTILIDADES =================

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function showToast(msg) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = msg;
  toast.classList.remove('hidden');
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => {
    toast.classList.add('hidden');
  }, 2800);
}

function triggerVibration(pattern) {
  if (state.settings.haptics && navigator.vibrate) {
    try {
      navigator.vibrate(pattern);
    } catch (_) {}
  }
}

function applyTheme(theme) {
  const root = document.documentElement;
  if (theme === 'dark') {
    root.setAttribute('data-theme', 'dark');
  } else if (theme === 'light') {
    root.removeAttribute('data-theme');
  } else {
    // Modo del sistema
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (prefersDark) {
      root.setAttribute('data-theme', 'dark');
    } else {
      root.removeAttribute('data-theme');
    }
  }
}

// ================= GESTIÓN DEL MODAL DE AJUSTES =================

function openModal(defaultTab = 'tab-share') {
  const modal = document.getElementById('settingsModal');
  if (!modal) return;

  // Llenar formulario de GitHub con datos actuales
  document.getElementById('cfgOwner').value = state.settings.owner || '';
  document.getElementById('cfgRepo').value = state.settings.repo || 'lista-compra';
  document.getElementById('cfgToken').value = state.settings.token || '';
  document.getElementById('cfgPin').value = state.settings.pin || '';

  // Llenar preferencias
  document.getElementById('selectTheme').value = state.settings.theme;
  document.getElementById('selectSyncInterval').value = state.settings.syncInterval;
  document.getElementById('chkHaptics').checked = state.settings.haptics;

  // Activar pestaña solicitada
  switchModalTab(defaultTab);
  updateShareTab();

  modal.classList.remove('hidden');
}

function closeModal() {
  const modal = document.getElementById('settingsModal');
  if (modal) modal.classList.add('hidden');
}

function switchModalTab(tabId) {
  document.querySelectorAll('.modal-tab').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tabId);
  });
  document.querySelectorAll('.tab-pane').forEach(pane => {
    pane.classList.toggle('active', pane.id === tabId);
  });
}

function updateShareTab() {
  const qrWrapper = document.getElementById('qrCodeWrapper');
  const magicUrl = generateMagicLinkUrl();

  if (!qrWrapper) return;

  if (magicUrl) {
    if (window.createQRCodeSVG) {
      qrWrapper.innerHTML = window.createQRCodeSVG(magicUrl, 200);
    } else {
      qrWrapper.innerHTML = `<p class="qr-placeholder">${magicUrl}</p>`;
    }
  } else {
    qrWrapper.innerHTML = `
      <div class="qr-placeholder">
        Para compartir la lista, primero configura tu Usuario y Token de GitHub en la pestaña <strong>GitHub</strong>.
      </div>
    `;
  }
}

// ================= INICIALIZACIÓN Y EVENT LISTENERS =================

function setupEventListeners() {
  // Formulario añadir
  const addForm = document.getElementById('addForm');
  addForm?.addEventListener('submit', addItemFromForm);

  const inputItemName = document.getElementById('inputItemName');
  inputItemName?.addEventListener('input', (e) => {
    updateCategoryPreview(e.target.value);
  });

  const selectCat = document.getElementById('selectCategory');
  selectCat?.addEventListener('change', () => {
    updateCategoryPreview(inputItemName?.value || '');
  });

  // Botones de cantidad (+ / -)
  const inputQty = document.getElementById('inputQuantity');
  document.getElementById('btnQtyMinus')?.addEventListener('click', () => {
    let val = parseInt(inputQty.value, 10);
    if (!isNaN(val) && val > 1) {
      inputQty.value = val - 1;
    }
  });
  document.getElementById('btnQtyPlus')?.addEventListener('click', () => {
    let val = parseInt(inputQty.value, 10);
    if (!isNaN(val)) {
      inputQty.value = val + 1;
    } else {
      inputQty.value = '2';
    }
  });

  // Filtros de categoría
  document.querySelectorAll('.filter-pill').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-pill').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.currentFilter = btn.dataset.category;
      renderItems();
    });
  });

  // Desplegable de Comprados
  document.getElementById('btnToggleCompleted')?.addEventListener('click', (e) => {
    if (e.target.id === 'btnClearCompleted') return;
    const sec = document.getElementById('completedSection');
    sec.classList.toggle('collapsed');
  });

  document.getElementById('btnClearCompleted')?.addEventListener('click', (e) => {
    e.stopPropagation();
    clearCompletedItems();
  });

  // Botón Sincronizar manual
  document.getElementById('btnSyncNow')?.addEventListener('click', () => {
    syncWithGitHub(false);
  });

  // Botones Modal
  document.getElementById('btnOpenSettings')?.addEventListener('click', () => openModal('tab-share'));
  document.getElementById('btnQuickConfig')?.addEventListener('click', () => openModal('tab-github'));
  document.getElementById('btnCloseModal')?.addEventListener('click', closeModal);

  document.querySelectorAll('.modal-tab').forEach(btn => {
    btn.addEventListener('click', () => switchModalTab(btn.dataset.tab));
  });

  // Probar conexión GitHub
  document.getElementById('btnTestGithub')?.addEventListener('click', async () => {
    const feedback = document.getElementById('githubTestFeedback');
    feedback.className = 'test-feedback';
    feedback.style.display = 'block';
    feedback.textContent = 'Comprobando conexión con GitHub...';

    const testCfg = {
      owner: document.getElementById('cfgOwner').value.trim(),
      repo: document.getElementById('cfgRepo').value.trim(),
      token: document.getElementById('cfgToken').value.trim()
    };

    try {
      const res = await testGitHubConnection(testCfg);
      feedback.className = 'test-feedback success';
      feedback.textContent = `✅ Conexión con GitHub verificada (${res.fullName}). ¡Todo listo!`;
    } catch (err) {
      feedback.className = 'test-feedback error';
      feedback.textContent = `❌ ${err.message}`;
    }
  });

  // Guardar configuración GitHub
  document.getElementById('githubConfigForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    state.settings.owner = document.getElementById('cfgOwner').value.trim();
    state.settings.repo = document.getElementById('cfgRepo').value.trim() || 'lista-compra';
    state.settings.token = document.getElementById('cfgToken').value.trim();
    state.settings.pin = document.getElementById('cfgPin').value.trim();

    saveLocalSettings();
    showToast('Ajustes de GitHub guardados');
    updateShareTab();
    closeModal();

    // Intentar sincronizar
    await syncWithGitHub(false);
    startAutoSync();
  });

  // Compartir: Copiar Enlace Mágico
  document.getElementById('btnCopyMagicLink')?.addEventListener('click', async () => {
    const url = generateMagicLinkUrl();
    if (!url) {
      showToast('⚠️ Configura primero tu GitHub para generar el enlace.');
      return;
    }

    try {
      await navigator.clipboard.writeText(url);
      showToast('📋 ¡Enlace copiado al portapapeles!');
    } catch (_) {
      prompt('Copia este enlace para enviárselo a tu mujer:', url);
    }
  });

  // Compartir: WhatsApp
  document.getElementById('btnShareWhatsApp')?.addEventListener('click', () => {
    const url = generateMagicLinkUrl();
    if (!url) {
      showToast('⚠️ Configura primero tu GitHub para generar el enlace.');
      return;
    }
    const msg = `¡Hola cariño! Aquí tienes el enlace para conectarte a nuestra lista de la compra compartida:\n${url}`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`, '_blank');
  });

  // Guardar preferencias generales
  document.getElementById('selectTheme')?.addEventListener('change', (e) => {
    state.settings.theme = e.target.value;
    saveLocalSettings();
    applyTheme(e.target.value);
  });

  document.getElementById('selectSyncInterval')?.addEventListener('change', (e) => {
    state.settings.syncInterval = e.target.value;
    saveLocalSettings();
    startAutoSync();
  });

  document.getElementById('chkHaptics')?.addEventListener('change', (e) => {
    state.settings.haptics = e.target.checked;
    saveLocalSettings();
  });

  // Exportar / Importar JSON
  document.getElementById('btnExportJson')?.addEventListener('click', () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state.items, null, 2));
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute("href", dataStr);
    dlAnchor.setAttribute("download", `lista_compra_backup_${new Date().toISOString().slice(0,10)}.json`);
    dlAnchor.click();
  });

  document.getElementById('fileImportJson')?.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target.result);
        if (Array.isArray(imported)) {
          state.items = imported;
          saveLocalData();
          renderItems();
          showToast('Lista importada con éxito');
          syncWithGitHub(true);
        }
      } catch (err) {
        showToast('Error al importar el archivo JSON');
      }
    };
    reader.readAsText(file);
  });

  // Reset total
  document.getElementById('btnResetAll')?.addEventListener('click', () => {
    if (confirm('¿Estás seguro de que quieres borrar todos los datos locales y la configuración?')) {
      localStorage.clear();
      window.location.reload();
    }
  });

  // Sincronizar automáticamente cuando el usuario regresa a la pestaña
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      syncWithGitHub(false);
    }
  });
}

// Inicialización de la aplicación
function init() {
  loadLocalData();
  checkMagicLink();
  applyTheme(state.settings.theme);
  renderQuickChips();
  renderItems();
  setupEventListeners();

  if (state.settings.owner && state.settings.token) {
    syncWithGitHub(false);
    startAutoSync();
  } else {
    setSyncState('local', 'Modo Local');
  }

  // Registrar Service Worker para PWA si está soportado
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(err => {
      console.log('Service Worker no registrado:', err);
    });
  }
}

// Iniciar al cargar el DOM
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
