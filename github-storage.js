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
  const url = `${GITHUB_API_BASE}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${FILE_PATH}`;

  const res = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token.trim()}`,
      'Accept': 'application/vnd.github.v3+json'
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
  const items = await decryptData(parsedJson, pin);

  return {
    items: Array.isArray(items) ? items : (items?.items || []),
    sha: fileData.sha,
    exists: true,
    lastUpdated: fileData.commit ? new Date().toISOString() : null
  };
}

/**
 * Fusión inteligente de dos listas para evitar pérdida de datos si ambos modifican a la vez
 */
export function mergeLists(localItems, remoteItems) {
  const map = new Map();

  // Meter remotos primero
  for (const item of (remoteItems || [])) {
    if (item && item.id) {
      map.set(item.id, item);
    }
  }

  // Comparar con locales
  for (const localItem of (localItems || [])) {
    if (!localItem || !localItem.id) continue;
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

  return Array.from(map.values());
}

/**
 * Guarda y actualiza la lista de la compra en el repositorio de GitHub con control de conflictos
 */
export async function saveToGitHub(config, items, currentSha, retryCount = 0) {
  const { owner, repo, token, pin } = config;
  const url = `${GITHUB_API_BASE}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${FILE_PATH}`;

  // 1. Cifrar la lista si hay PIN
  const payloadToStore = await encryptData(items, pin);
  const jsonContent = JSON.stringify(payloadToStore, null, 2);
  const base64Content = utf8ToBase64(jsonContent);

  const bodyData = {
    message: 'Actualizar lista de la compra [sync]',
    content: base64Content
  };

  if (currentSha) {
    bodyData.sha = currentSha;
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

  // Si hay conflicto de concurrencia (409 Conflict): la otra persona guardó algo hace unos instantes
  if (res.status === 409 && retryCount < 3) {
    console.warn('Conflicto detectado en GitHub. Fusionando cambios automáticamente...');
    // Cargar la versión remota más reciente
    const remoteData = await loadFromGitHub(config);
    // Fusionar de forma inteligente
    const mergedItems = mergeLists(items, remoteData.items);
    // Reintentar guardando con el nuevo SHA
    return await saveToGitHub(config, mergedItems, remoteData.sha, retryCount + 1);
  }

  if (!res.ok) {
    const errorJson = await res.json().catch(() => ({}));
    throw new Error(errorJson.message || `Error al guardar en GitHub: HTTP ${res.status}`);
  }

  const result = await res.json();
  return {
    ok: true,
    sha: result.content.sha,
    items: items
  };
}
