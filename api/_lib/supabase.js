const DEFAULT_HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store'
};

function sendJson(res, status, payload) {
  res.statusCode = status;
  Object.entries(DEFAULT_HEADERS).forEach(([key, value]) => res.setHeader(key, value));
  res.end(JSON.stringify(payload));
}

function getBody(req) {
  if (req.body && typeof req.body === 'object') return Promise.resolve(req.body);
  if (typeof req.body === 'string') {
    try { return Promise.resolve(JSON.parse(req.body)); } catch (_) { return Promise.resolve({}); }
  }
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', chunk => {
      raw += chunk;
      if (raw.length > 100000) reject(new Error('La solicitud es demasiado grande.'));
    });
    req.on('end', () => {
      if (!raw) return resolve({});
      try { resolve(JSON.parse(raw)); } catch (_) { resolve({}); }
    });
    req.on('error', reject);
  });
}

function cleanText(value, maxLength = 180) {
  return String(value || '').trim().replace(/\s+/g, ' ').slice(0, maxLength);
}

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Falta configurar ${name}.`);
  return value.replace(/\/$/, '');
}

function keyHeaders(key) {
  const headers = { apikey: key };
  // Las claves legacy service_role son JWT. Las nuevas sb_secret_* van solo en apikey.
  if (!key.startsWith('sb_secret_')) headers.Authorization = `Bearer ${key}`;
  return headers;
}

async function supabaseRequest(path, options = {}) {
  const url = requiredEnv('SUPABASE_URL');
  const key = requiredEnv('SUPABASE_SECRET_KEY');
  const response = await fetch(`${url}/rest/v1/${path}`, {
    ...options,
    headers: {
      ...keyHeaders(key),
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });
  const text = await response.text();
  let data = null;
  if (text) {
    try { data = JSON.parse(text); } catch (_) { data = text; }
  }
  if (!response.ok) {
    const message = data && (data.message || data.error_description) || `Supabase respondió ${response.status}.`;
    const error = new Error(message);
    error.status = response.status;
    error.details = data;
    throw error;
  }
  return data;
}

async function storageRequest(path, options = {}) {
  const url = requiredEnv('SUPABASE_URL');
  const key = requiredEnv('SUPABASE_SECRET_KEY');
  const response = await fetch(`${url}/storage/v1/${path}`, {
    ...options,
    headers: {
      ...keyHeaders(key),
      ...(options.headers || {})
    }
  });
  if (options.raw && response.ok) return response;
  const text = await response.text();
  let data = null;
  if (text) {
    try { data = JSON.parse(text); } catch (_) { data = text; }
  }
  if (!response.ok) {
    const message = data && (data.message || data.error || data.error_description) || `Supabase Storage respondió ${response.status}.`;
    const error = new Error(message);
    error.status = response.status;
    error.details = data;
    throw error;
  }
  return data;
}

async function authRequest(path, options = {}) {
  const url = requiredEnv('SUPABASE_URL');
  const key = requiredEnv('SUPABASE_PUBLISHABLE_KEY');
  const response = await fetch(`${url}/auth/v1/${path}`, {
    ...options,
    headers: {
      apikey: key,
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });
  const text = await response.text();
  let data = null;
  if (text) {
    try { data = JSON.parse(text); } catch (_) { data = text; }
  }
  if (!response.ok) {
    const message = data && (data.msg || data.message || data.error_description) || 'No se pudo validar la sesión.';
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }
  return data;
}

async function requireAdmin(req) {
  const authorization = String(req.headers.authorization || '');
  if (!authorization.startsWith('Bearer ')) {
    const error = new Error('Debes iniciar sesión.');
    error.status = 401;
    throw error;
  }
  const user = await authRequest('user', { headers: { Authorization: authorization } });
  const allowedEmails = String(process.env.ADMIN_EMAILS || '')
    .split(',')
    .map(email => email.trim().toLowerCase())
    .filter(Boolean);
  const emailAllowed = allowedEmails.includes(String(user.email || '').toLowerCase());
  const metadataAllowed = user.app_metadata && user.app_metadata.role === 'admin';
  if (!emailAllowed && !metadataAllowed) {
    const error = new Error('Esta cuenta no tiene acceso al panel.');
    error.status = 403;
    throw error;
  }
  return user;
}

module.exports = {
  authRequest,
  cleanText,
  getBody,
  requireAdmin,
  sendJson,
  storageRequest,
  supabaseRequest
};
