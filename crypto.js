// crypto.js - Cifrado y descifrado de extremo a extremo (E2EE) con Web Crypto API (AES-GCM 256-bit)

function bufToHex(buffer) {
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

function hexToBuf(hexString) {
  const bytes = new Uint8Array(hexString.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hexString.substr(i * 2, 2), 16);
  }
  return bytes.buffer;
}

function checkCryptoSupport() {
  if (!window.crypto || !window.crypto.subtle) {
    if (window.location.protocol === 'http:' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
      throw new Error('REQUIRE_HTTPS: Los navegadores bloquean el cifrado en páginas sin HTTPS. Accede usando el enlace con candado seguro (https://).');
    }
    throw new Error('NO_CRYPTO: Tu navegador no tiene habilitada la API de cifrado Web Crypto.');
  }
}

/**
 * Deriva una clave criptográfica AES-GCM de 256 bits a partir de una contraseña/PIN usando PBKDF2
 */
async function deriveKey(pin, salt) {
  checkCryptoSupport();
  const enc = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    enc.encode(pin),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Cifra un objeto o string con una contraseña/PIN usando AES-GCM
 * @param {any} data - Datos a cifrar
 * @param {string} pin - PIN o clave familiar
 * @returns {Promise<object>} Objeto cifrado listo para guardarse
 */
export async function encryptData(data, pin) {
  if (!pin || pin.trim() === '') {
    // Si no hay PIN configurado, devuelve los datos en claro con indicador
    return {
      version: 1,
      encrypted: false,
      payload: data
    };
  }

  checkCryptoSupport();
  const salt = window.crypto.getRandomValues(new Uint8Array(16));
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(pin.trim(), salt);

  const enc = new TextEncoder();
  const encodedData = enc.encode(JSON.stringify(data));

  const encryptedBuffer = await window.crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv
    },
    key,
    encodedData
  );

  return {
    version: 1,
    encrypted: true,
    salt: bufToHex(salt),
    iv: bufToHex(iv),
    ciphertext: bufToHex(encryptedBuffer)
  };
}

/**
 * Descifra el objeto proveniente de GitHub usando el PIN configurado
 * @param {object} payload - Objeto cargado de GitHub
 * @param {string} pin - PIN familiar
 * @returns {Promise<any>} Datos descifrados originales
 */
export async function decryptData(payload, pin) {
  if (!payload) return null;

  // Si no está cifrado, devolver la carga útil directamente
  if (!payload.encrypted) {
    return payload.payload !== undefined ? payload.payload : payload;
  }

  if (!pin || pin.trim() === '') {
    throw new Error('MISSING_PIN: Los datos están cifrados y se requiere el PIN familiar.');
  }

  checkCryptoSupport();

  try {
    const salt = hexToBuf(payload.salt);
    const iv = hexToBuf(payload.iv);
    const ciphertext = hexToBuf(payload.ciphertext);

    const key = await deriveKey(pin.trim(), salt);

    const decryptedBuffer = await window.crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv
      },
      key,
      ciphertext
    );

    const dec = new TextDecoder();
    return JSON.parse(dec.decode(decryptedBuffer));
  } catch (err) {
    throw new Error('INVALID_PIN: El PIN o contraseña introducida no es correcta.');
  }
}
