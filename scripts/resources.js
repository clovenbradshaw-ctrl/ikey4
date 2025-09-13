const RESOURCE_CITY = new URLSearchParams(window.location.search).get('city') || 'nashville';

async function loadResource(type) {
  const ext = type === 'dispatch' ? 'json' : 'html';
  const url = `resources/${RESOURCE_CITY}/${type}.${ext}`;
  const resp = await fetch(url);
  if (!resp.ok) {
    throw new Error(`Failed to load ${type}`);
  }
  return ext === 'json' ? resp.json() : resp.text();
}

// --- Client-side encryption helpers ---
const enc = new TextEncoder();
const dec = new TextDecoder();
let cachedPassword = null;

function bufToB64(buf) {
  return btoa(String.fromCharCode(...new Uint8Array(buf)));
}

function b64ToBuf(b64) {
  return Uint8Array.from(atob(b64), c => c.charCodeAt(0)).buffer;
}

async function getKey(password, salt) {
  const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

async function encrypt(password, data) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await getKey(password, salt);
  const encoded = enc.encode(data);
  const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded);
  return { c: bufToB64(cipher), i: bufToB64(iv), s: bufToB64(salt) };
}

async function decrypt(password, payload) {
  const key = await getKey(password, b64ToBuf(payload.s));
  const data = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: b64ToBuf(payload.i) },
    key,
    b64ToBuf(payload.c)
  );
  return dec.decode(data);
}

async function promptPassword(messageKey) {
  if (!cachedPassword) {
    const msg = typeof t === 'function' ? t(messageKey, 'Enter password') : 'Enter password';
    cachedPassword = prompt(msg) || '';
  }
  return cachedPassword;
}

async function secureSet(key, value) {
  const pw = await promptPassword('security.set');
  const payload = await encrypt(pw, JSON.stringify(value));
  localStorage.setItem(key, JSON.stringify(payload));
}

async function secureGet(key) {
  const item = localStorage.getItem(key);
  if (!item) return null;
  const pw = await promptPassword('security.prompt');
  try {
    const data = await decrypt(pw, JSON.parse(item));
    return JSON.parse(data);
  } catch (e) {
    alert(typeof t === 'function' ? t('security.invalid', 'Incorrect password') : 'Incorrect password');
    return null;
  }
}

window.resourceLoader = { city: RESOURCE_CITY, loadResource };
window.secureStore = { get: secureGet, set: secureSet };
