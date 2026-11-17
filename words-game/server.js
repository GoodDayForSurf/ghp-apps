'use strict';

const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');
const game = require('./game');

const PORT = Number(process.env.PORT) || 80;
const ROOT = path.join(__dirname, 'public');
const table = game.createTable();

const FILES = {
  '/': { file: 'index.html', type: 'text/html; charset=utf-8' },
  '/index.html': { file: 'index.html', type: 'text/html; charset=utf-8' },
  '/style.css': { file: 'style.css', type: 'text/css; charset=utf-8' },
  '/client.js': { file: 'client.js', type: 'text/javascript; charset=utf-8' },
};

function send(res, status, body, type) {
  const payload = typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': type || 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  res.end(payload);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > 100000) {
        reject(new Error('too big'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      if (!chunks.length) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

function tokenOf(req) {
  const header = req.headers['x-token'];
  return typeof header === 'string' ? header : '';
}

function playerByToken(token) {
  if (!token) return null;
  return table.players.find((p) => p.token === token) || null;
}

async function handle(req, res) {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const now = Date.now();

  try {
    if (req.method === 'GET' && url.pathname === '/api/lobby') {
      game.tick(table, now);
      send(res, 200, game.lobby(table));
      return;
    }

    if (req.method === 'GET' && url.pathname === '/api/state') {
      game.tick(table, now);
      const person = playerByToken(tokenOf(req));
      if (!person) {
        send(res, 401, { error: 'Сначала Join' });
        return;
      }
      game.seen(table, person.id, now);
      send(res, 200, game.view(table, person.id));
      return;
    }

    if (req.method === 'POST' && url.pathname === '/api/join') {
      game.tick(table, now);
      const body = await readBody(req);
      const person = game.join(table, { name: body.name, language: body.language, now });
      console.log(`${person.name} joined (${person.queued ? 'queue' : 'seat'})`);
      send(res, 200, { token: person.token, state: game.view(table, person.id) });
      return;
    }

    if (req.method === 'POST' && (url.pathname === '/api/action' || url.pathname === '/api/leave')) {
      game.tick(table, now);
      const person = playerByToken(tokenOf(req));
      if (!person) {
        send(res, 401, { error: 'Сначала Join' });
        return;
      }
      game.seen(table, person.id, now);
      if (url.pathname === '/api/leave') {
        game.leave(table, person.id);
        send(res, 200, { ok: true });
        return;
      }
      const body = await readBody(req);
      game.act(table, person.id, body);
      send(res, 200, game.view(table, person.id));
      return;
    }

    if (req.method === 'GET' && url.pathname === '/favicon.ico') {
      send(res, 204, '', 'image/x-icon');
      return;
    }

    if (req.method === 'GET' && FILES[url.pathname]) {
      const item = FILES[url.pathname];
      const data = fs.readFileSync(path.join(ROOT, item.file));
      send(res, 200, data, item.type);
      return;
    }

    send(res, 404, { error: 'Не найдено' });
  } catch (err) {
    if (err instanceof game.RuleError) {
      send(res, 400, { error: err.message });
      return;
    }
    console.error(err);
    send(res, 500, { error: 'Сбой сервера' });
  }
}

const server = http.createServer(handle);

// Print each new client address once, so it is visible from the console
// whether a phone or another computer actually reaches this machine.
const clients = new Set();
server.on('connection', (socket) => {
  const address = String(socket.remoteAddress || '').replace(/^::ffff:/, '');
  if (!address || clients.has(address)) return;
  clients.add(address);
  console.log(`Подключение с ${address}`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') console.error(`Порт ${PORT} уже занят другой программой.`);
  else if (err.code === 'EACCES') console.error(`Нет прав на порт ${PORT}.`);
  else console.error(err);
  process.exit(1);
});

setInterval(() => game.tick(table, Date.now()), 1000);

server.listen(PORT, '0.0.0.0', () => {
  const suffix = PORT === 80 ? '' : `:${PORT}`;
  console.log(`Словарь: http://localhost${suffix}`);
  Object.values(os.networkInterfaces()).forEach((list) => {
    (list || []).forEach((net) => {
      const v4 = net.family === 'IPv4' || net.family === 4;
      if (v4 && !net.internal) console.log(`В сети: http://${net.address}${suffix}`);
    });
  });
});
