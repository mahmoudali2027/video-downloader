import { randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { homedir } from 'node:os';
import { join } from 'node:path';

const page = readFileSync(new URL('./index.html', import.meta.url));
const dataDir = process.env.DATA_DIR || join(process.env.LOCALAPPDATA || homedir(), '.birlikte-al');
const listRoute = /^\/api\/lists\/([a-f0-9-]{36})(?:\/(items|bought)(?:\/([a-f0-9-]{36}))?)?$/;
mkdirSync(dataDir, { recursive: true });

function send(response, status, value) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(value));
}

class InputError extends Error {}

async function body(request) {
  let size = 0;
  const chunks = [];
  for await (const chunk of request) {
    size += chunk.length;
    if (size > 8192) throw new InputError('The request is too large.');
    chunks.push(chunk);
  }
  let value;
  try {
    value = JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw new InputError('The request could not be read.');
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new InputError('The request could not be read.');
  }
  return value;
}

function field(value, label, max, required = true) {
  if (typeof value !== 'string') throw new InputError(label + ' is invalid.');
  const cleaned = value.trim().replace(/\s+/g, ' ');
  if (required && !cleaned) throw new InputError(label + ' is required.');
  if (cleaned.length > max) throw new InputError(label + ' must be at most ' + max + ' characters.');
  return cleaned;
}

function save(list) {
  const path = join(dataDir, list.id + '.json');
  writeFileSync(path + '.tmp', JSON.stringify(list), { mode: 0o600 });
  renameSync(path + '.tmp', path);
}

function load(id) {
  const path = join(dataDir, id + '.json');
  return existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : null;
}

function update(list, action, itemId, method, data) {
  if (action === 'items' && method === 'POST' && !itemId) {
    if (list.items.length >= 150) throw new InputError('This list can hold up to 150 requests.');
    if (!Number.isInteger(data.quantity) || data.quantity < 1 || data.quantity > 99) {
      throw new InputError('Quantity must be a whole number from 1 to 99.');
    }
    list.items.push({
      id: randomUUID(),
      person: field(data.person, 'Name', 32),
      product: field(data.product, 'Item name', 60),
      quantity: data.quantity,
      preference: field(data.preference ?? '', 'Preference', 60, false),
      bought: false,
    });
    return true;
  }
  if (action === 'items' && method === 'DELETE' && itemId) {
    list.items = list.items.filter((item) => item.id !== itemId);
    return true;
  }
  if (action === 'bought' && method === 'PATCH' && !itemId) {
    if (!Array.isArray(data.ids) || data.ids.length > 150 || typeof data.bought !== 'boolean') {
      throw new InputError('The item selection is invalid.');
    }
    const ids = new Set(data.ids);
    for (const item of list.items) {
      if (ids.has(item.id)) item.bought = data.bought;
    }
    return true;
  }
  return false;
}

const port = Number(process.env.PORT ?? 3000);
createServer(async (request, response) => {
  response.setHeader('Cache-Control', 'no-store');
  response.setHeader('Referrer-Policy', 'no-referrer');
  const url = URL.parse(request.url, 'http://localhost');
  const method = request.method;
  if (!url) return send(response, 400, { error: 'Invalid request.' });
  if (method === 'GET' && url.pathname === '/') {
    response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    return response.end(page);
  }
  try {
    if (method === 'POST' && url.pathname === '/api/lists') {
      const data = await body(request);
      const list = { id: randomUUID(), title: field(data.title, 'List name', 60), items: [] };
      save(list);
      return send(response, 201, list);
    }
    const route = listRoute.exec(url.pathname);
    if (!route) return send(response, 404, { error: 'Page not found.' });
    const [, id, action, itemId] = route;
    // Read the body before loading so concurrent requests cannot overwrite newer changes.
    const data = ['POST', 'PATCH'].includes(method) ? await body(request) : {};
    const list = load(id);
    if (!list) return send(response, 404, { error: 'This shopping list could not be found.' });
    if (method === 'GET' && !action) return send(response, 200, list);
    if (!update(list, action, itemId, method, data)) {
      return send(response, 405, { error: 'This action is not supported.' });
    }
    save(list);
    return send(response, 200, list);
  } catch (error) {
    if (error instanceof InputError) return send(response, 400, { error: error.message });
    console.error(error);
    return send(response, 500, { error: 'Could not save the list. Try again.' });
  }
}).listen(port, process.env.BIND_HOST ?? '127.0.0.1', () => {
  console.log('Shared Basket is ready. http://localhost:' + port);
});
