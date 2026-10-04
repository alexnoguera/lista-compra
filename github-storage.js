// github-storage.js - Conexión directa con la API de GitHub para sincronización privada

import { encryptData, decryptData } from './crypto.js';

const GITHUB_API_BASE = 'https://api.github.com';
const FILE_PATH = 'data/shopping_list.json';

// Codificación y decodificación UTF-8 segura en Base64
function utf8ToBase64(str) {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToUtf8(b64) {
  // Limpiar saltos de línea de GitHub si vienen incluidos
  const cleanB64 = b64.replace(/\s/g, '');
  const binary = atob(cleanB64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}

/**
 * Valida las credenciales de GitHub comprobando acceso al repositorio
 */
export async function testGitHubConnection(config) {
  const { owner, repo, token } = config;
  if (!owner || !repo || !token) {
    throw new Error('Faltan datos de configuración (Usuario, Repositorio o Token).');
  }

  const url = `${GITHUB_API_BASE}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`;
  const res = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token.trim()}`,
      'Accept': 'application/vnd.github.v3+json'
    }
  });

  if (res.status === 401) {
    throw new Error('Token de GitHub no válido o caducado. Comprueba tus permisos.');
  }
  if (res.status === 404) {
    throw new Error(`No se encontró el repositorio "${owner}/${repo}". Asegúrate de haberlo creado y de que el token tenga permiso.`);
  }
  if (!res.ok) {
    throw new Error(`Error de conexión con GitHub: HTTP ${res.status}`);
  }

  const repoInfo = await res.json();
  return {
    ok: true,
    fullName: repoInfo.full_name,
    isPrivate: repoInfo.private,
    defaultBranch: repoInfo.default_branch
  };
}

/**
 * Carga el archivo de la lista de la compra desde el repositorio de GitHub
 */
export async function loadFromGitHub(config) {
  const { owner, repo, token, pin } = config;
  const cacheBuster = Date.now();
  const url = `${GITHUB_API_BASE}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${FILE_PATH}?ref=main&_cb=${cacheBuster}`;

  const res = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token.trim()}`,
      'Accept': 'application/vnd.github.v3+json',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache'
    },
    cache: 'no-store'
  });

  if (res.status === 404) {
    // El archivo aún no existe en el repositorio (primera ejecución)
    return {
      items: [],
      sha: null,
      exists: false
    };
  }

  if (!res.ok) {
    throw new Error(`Error al leer desde GitHub: HTTP ${res.status}`);
  }

  const fileData = await res.json();
  const rawText = base64ToUtf8(fileData.content);
  const parsedJson = JSON.parse(rawText);

  // Descifrar si tiene cifrado
  const decrypted = await decryptData(parsedJson, pin);

  let items = [];
  let deletedIds = [];

  if (Array.isArray(decrypted)) {
    items = decrypted;
  } else if (decrypted && typeof decrypted === 'object') {
    items = decrypted.items || [];
    deletedIds = decrypted.deletedIds || [];
  }

  return {
    items,
    deletedIds,
    sha: fileData.sha,
    exists: true,
    lastUpdated: fileData.commit ? new Date().toISOString() : null
  };
}

/**
 * Fusión inteligente de dos listas para evitar pérdida de datos si ambos modifican a la vez
 */
export function mergeLists(localItems, remoteItems, deletedIds = []) {
  const deletedSet = new Set(deletedIds || []);
  const map = new Map();

  // Meter remotos primero (ignorando los eliminados localmente)
  for (const item of (remoteItems || [])) {
    if (item && item.id && !deletedSet.has(item.id)) {
      map.set(item.id, item);
    }
  }

  // Comparar con locales
  for (const localItem of (localItems || [])) {
    if (!localItem || !localItem.id) continue;
    if (deletedSet.has(localItem.id)) continue;

    if (!map.has(localItem.id)) {
      // Elemento nuevo añadido en local
      map.set(localItem.id, localItem);
    } else {
      const remote = map.get(localItem.id);
      const localTime = new Date(localItem.updatedAt || localItem.createdAt || 0).getTime();
      const remoteTime = new Date(remote.updatedAt || remote.createdAt || 0).getTime();

      // Quedarse con la versión más reciente
      if (localTime >= remoteTime) {
        map.set(localItem.id, localItem);
      }
    }
  }

  return Array.from(map.values()).filter(item => !deletedSet.has(item.id));
}

/**
 * Guarda y actualiza la lista de la compra en el repositorio de GitHub con control de conflictos y auto-recuperación de SHA
 */
export async function saveToGitHub(config, items, currentSha, deletedIds = [], retryCount = 0) {
  const { owner, repo, token, pin } = config;
  const url = `${GITHUB_API_BASE}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${FILE_PATH}`;

  let shaToUse = currentSha;

  // Si no tenemos el SHA localmente, consultamos GitHub para no fallar con HTTP 422
  if (!shaToUse) {
    try {
      const existing = await loadFromGitHub(config);
      if (existing.exists && existing.sha) {
        shaToUse = existing.sha;
        const combinedDeleted = Array.from(new Set([...deletedIds, ...(existing.deletedIds || [])])).slice(-100);
        items = mergeLists(items, existing.items, combinedDeleted);
        deletedIds = combinedDeleted;
      }
    } catch (e) {
      console.warn('No se pudo verificar SHA previo, intentando guardar directamente:', e);
    }
  }

  // 1. Cifrar la lista y los IDs eliminados
  const dataToStore = {
    items: items,
    deletedIds: (deletedIds || []).slice(-100)
  };

  const payloadToStore = await encryptData(dataToStore, pin);
  const jsonContent = JSON.stringify(payloadToStore, null, 2);
  const base64Content = utf8ToBase64(jsonContent);

  const bodyData = {
    message: 'Actualizar lista de la compra [sync]',
    content: base64Content,
    branch: 'main'
  };

  if (shaToUse) {
    bodyData.sha = shaToUse;
  }

  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token.trim()}`,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(bodyData)
  });

  // Si hay conflicto (409) o falta/desajuste de SHA (422), reintentar automáticamente obteniendo el SHA fresco
  if ((res.status === 409 || res.status === 422) && retryCount < 3) {
    console.warn(`Conflicto o SHA desactualizado (HTTP ${res.status}). Obteniendo versión remota fresca y fusionando...`);
    await new Promise(r => setTimeout(r, 250 * (retryCount + 1)));
    const remoteData = await loadFromGitHub(config);
    const combinedDeleted = Array.from(new Set([...deletedIds, ...(remoteData.deletedIds || [])])).slice(-100);
    const mergedItems = mergeLists(items, remoteData.items, combinedDeleted);
    return await saveToGitHub(config, mergedItems, remoteData.sha, combinedDeleted, retryCount + 1);
  }

  if (!res.ok) {
    const errorJson = await res.json().catch(() => ({}));
    throw new Error(errorJson.message || `Error al guardar en GitHub: HTTP ${res.status}`);
  }

  const result = await res.json();
  return {
    ok: true,
    sha: result.content.sha,
    items: items,
    deletedIds: deletedIds
  };
}
