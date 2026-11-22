'use strict';

const app = document.querySelector('#app');
const storeKey = 'slovoboy-token';

let token = localStorage.getItem(storeKey) || '';
let screen = token ? 'table' : 'join';
let state = null;
let lobby = null;
let error = '';
// Own cards put into cells of the table grid this move, {cardId, letter, x, y}.
let placed = [];
// Cards of the table this move pushed aside: card id -> {x, y}.
let shifted = {};
// Id of the focused table card; the lit edge (an index into DIRS) and the
// cards put from that edge in a row.
let selected = null;
let chain = null;
// Skipping: first a choice (plain skip or swap a letter), then, for a swap,
// a tap on the letter to swap.
let skipAsk = false;
let swapPick = false;
// The swap animation: while the letters spin nothing is redrawn (`freeze`).
// The new card then takes the old card's place in the hand (`pinned`) and
// glows for a moment (`glow`).
const SPIN_MS = 1000;
const GLOW_MS = 500;
let freeze = false;
let pinned = null;
let glow = null;
let menu = null;
let lastRevision = '';

// Edges of a card, clockwise from the top; a word grows out of the lit edge.
const DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]];
const EDGES = ['up', 'right', 'down', 'left'];
// Menu moves of an own new card: [index into DIRS, label].
const MOVES = [[0, 'Вверх'], [2, 'Вниз'], [1, 'Вправо'], [3, 'Влево']];
// Empty cells kept around the cards on the table, room for new words.
const MARGIN = 2;
const keyOf = (x, y) => `${x},${y}`;

function esc(value) {
  return String(value == null ? '' : value).replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[ch]));
}

async function api(path, options) {
  const response = await fetch(path, {
    method: options && options.method ? options.method : 'GET',
    headers: {
      'Content-Type': 'application/json',
      'X-Token': token || '',
    },
    body: options && options.body ? JSON.stringify(options.body) : undefined,
  });
  const data = await response.json().catch(() => ({}));
  if (response.status === 401) {
    token = '';
    localStorage.removeItem(storeKey);
    screen = 'join';
    state = null;
    lastRevision = '';
    const lost = new Error(data.error || 'Сначала Join');
    lost.session = true;
    throw lost;
  }
  if (!response.ok) throw new Error(data.error || 'Не вышло');
  return data;
}

function priceHTML(letter) {
  const price = state && state.prices ? state.prices[letter] : null;
  return price ? `<span class="pts p${price}">${price}</span>` : '';
}

function cardHTML(card, extra) {
  const cls = ['card'];
  if (extra && extra.playable) cls.push('playable');
  if (extra && extra.dim) cls.push('dim');
  const act = extra && extra.act ? ` data-act="${extra.act}"` : '';
  const id = card.id ? ` data-id="${esc(card.id)}"` : '';
  const at = extra && extra.at != null ? ` data-at="${extra.at}"` : '';
  const kind = extra && extra.kind ? ` data-kind="${extra.kind}"` : '';
  const disabled = extra && extra.disabled ? ' disabled' : '';
  return `<button class="${cls.join(' ')}"${act}${id}${at}${kind}${disabled}><span class="letter">${esc(card.letter)}</span>${priceHTML(card.letter)}</button>`;
}

function renderJoin() {
  if (app.dataset.screen !== 'join') {
    app.dataset.screen = 'join';
    app.innerHTML = `
      <main class="join">
        <section class="join-card">
          <p class="lede">Игроки по очереди выкладывают карты на стол, составляя слова вниз или вбок от любой буквы, как в кроссворде. У каждой буквы есть цена; побеждает тот, кто набрал больше очков.</p>
          <form id="join-form">
            <label for="name">Имя</label>
            <input id="name" name="name" type="text" maxlength="20" autocomplete="nickname" placeholder="Как к вам обращаться">
            <label>Колода</label>
            <div class="langs">
              <label><input type="radio" name="language" value="ru" checked> Русский</label>
              <label><input type="radio" name="language" value="es"> Español</label>
            </div>
            <button class="join-btn" type="submit">Join</button>
          </form>
          <p class="lobby-line" id="lobby-line"></p>
          <p class="rules-note">За столом от двух до четырёх. Слова могут быть любой длины — их принимают соперники. Ход можно пропустить и при этом сменить все свои буквы.</p>
        </section>
      </main>`;
    document.querySelector('#join-form').addEventListener('submit', onJoin);
  }
  const line = document.querySelector('#lobby-line');
  if (!line) return;
  if (!lobby || !lobby.players.length) {
    line.textContent = 'Стол свободен.';
    return;
  }
  const lang = lobby.language === 'es' ? 'испанская' : 'русская';
  const status = lobby.phase === 'playing' ? 'идёт партия' : 'ждут раздачи';
  line.textContent = `За столом (${lang}, ${status}): ${lobby.players.join(', ')}`;
}

// "Играют:" and every player with their points, in the order they move this
// round; the one whose move it is in bold.
function playersLine() {
  const list = (state.players || []).slice();
  const first = list.findIndex((p) => p.starter);
  const ordered = first > 0 ? list.slice(first).concat(list.slice(0, first)) : list;
  if (!ordered.length) return '';
  // The admin is marked with a star. For the admin, the other players' names
  // are buttons that throw that player out of the game.
  const canKick = state.actions && state.actions.kick;
  const names = ordered.map((p) => {
    const star = p.admin ? '<span class="admin-mark" title="Админ">★</span>' : '';
    let text = `${esc(p.name)}${star} ${p.score}`;
    if (p.abandoned) return `<span class="gone">${text}</span>`;
    if (canKick && !p.you) {
      text = `<button type="button" class="kick" data-act="kick" data-id="${esc(p.id)}" data-name="${esc(p.name)}" title="Выкинуть из игры">${text}</button>`;
    }
    return p.attacker || p.defender ? `<b>${text}</b>` : text;
  });
  return `Играют: ${names.join(', ')}`;
}



// ------------------------------------------------------------- the grid --

// It is your move: you put cards on the table, empty or not.
function building() {
  return !!(state && state.actions && state.actions.propose);
}

function boardCells() {
  const cells = ((state.table && state.table.cells) || []).map((cell) => ({ ...cell, ...(shifted[cell.id] || {}), own: false }));
  placed.forEach((item) => cells.push({ id: item.cardId, letter: item.letter, x: item.x, y: item.y, own: true }));
  return cells;
}

function mapOf(cells) {
  const map = new Map();
  cells.forEach((cell) => map.set(keyOf(cell.x, cell.y), cell));
  return map;
}

const SIDES = DIRS;

// The first click on a card lights its top edge; each next click on the same
// card moves the light clockwise. Cards already put from the old edge stay.
function pickCell(id) {
  const again = selected === id && chain;
  const edge = again ? (chain.edge + 1) % DIRS.length : 0;
  selected = id;
  chain = { edge, dx: DIRS[edge][0], dy: DIRS[edge][1], ids: [] };
  menu = placed.some((item) => item.cardId === id) ? { kind: 'cell', at: id } : null;
}

function setPlace(id, x, y) {
  const own = placed.find((item) => item.cardId === id);
  if (own) {
    own.x = x;
    own.y = y;
  } else {
    shifted[id] = { x, y };
  }
}

// The part of the table beyond a line that moves when a card goes in or
// comes out there. It starts at `start` and takes the cards touching it that
// lie beyond `origin` in the direction (dx, dy). Cards on the near side never
// move. A card that touches the moving part from the side, not along the
// direction, goes along only if it does not also hold on to the near side:
// a word hanging off a moved card moves with it, but a word that lies along
// the line and is fixed to the near side stays.
function partBeyond(map, start, origin, dx, dy) {
  const beyond = (cell) => (cell.x - origin.x) * dx + (cell.y - origin.y) * dy >= 1;
  const heldNear = (cell) => SIDES.some(([sx, sy]) => {
    const next = map.get(keyOf(cell.x + sx, cell.y + sy));
    return next && !beyond(next);
  });
  const part = new Set([start.id]);
  const queue = [start];
  while (queue.length) {
    const cell = queue.shift();
    SIDES.forEach(([sx, sy]) => {
      const next = map.get(keyOf(cell.x + sx, cell.y + sy));
      if (!next || !beyond(next) || part.has(next.id)) return;
      const along = sx * dy - sy * dx === 0;
      if (!along && heldNear(next)) return;
      part.add(next.id);
      queue.push(next);
    });
  }
  return part;
}

// Puts a hand card against the lit edge. Down and right a word goes on from
// its last card; up and left each new card goes right at the focused card,
// so the word still reads in the order of the taps. If the place is taken,
// the card there moves one step on, together with every card that touches
// it, and with any card that stands in the way of those.
function putCard(card) {
  const cells = boardCells();
  const byId = new Map(cells.map((cell) => [cell.id, cell]));
  const map = mapOf(cells);
  const forward = chain.dx + chain.dy > 0;
  const behind = byId.get(forward && chain.ids.length ? chain.ids[chain.ids.length - 1] : selected);
  if (!behind) return 'Нажмите на букву на столе, к которой приставить карту.';
  const x = behind.x + chain.dx;
  const y = behind.y + chain.dy;
  const blocker = map.get(keyOf(x, y));
  if (blocker) {
    const moving = partBeyond(map, blocker, behind, chain.dx, chain.dy);
    let grew = true;
    while (grew) {
      grew = false;
      [...moving].forEach((id) => {
        const cell = byId.get(id);
        const next = map.get(keyOf(cell.x + chain.dx, cell.y + chain.dy));
        if (next && !moving.has(next.id)) {
          moving.add(next.id);
          grew = true;
        }
      });
    }
    moving.forEach((id) => {
      const cell = byId.get(id);
      setPlace(id, cell.x + chain.dx, cell.y + chain.dy);
    });
  }
  placed.push({ cardId: card.id, letter: card.letter, x, y });
  chain.ids.push(card.id);
  return '';
}

function boardHTML() {
  const cells = boardCells();
  if (!cells.length) return '';
  const map = mapOf(cells);
  // The frame follows the cards that came from the server, so it does not
  // jump while you add your own letters; it only grows when they go past it.
  const base = (state.table && state.table.cells && state.table.cells.length) ? state.table.cells : cells;
  let minX = Math.min(...base.map((cell) => cell.x)) - MARGIN;
  let maxX = Math.max(...base.map((cell) => cell.x)) + MARGIN;
  let minY = Math.min(...base.map((cell) => cell.y)) - MARGIN;
  let maxY = Math.max(...base.map((cell) => cell.y)) + MARGIN;
  cells.forEach((cell) => {
    minX = Math.min(minX, cell.x);
    maxX = Math.max(maxX, cell.x);
    minY = Math.min(minY, cell.y);
    maxY = Math.max(maxY, cell.y);
  });
  const live = building();
  const pos = (cell) => `grid-column:${cell.x - minX + 1};grid-row:${cell.y - minY + 1}`;
  const items = cells.map((cell) => {
    const cls = ['card'];
    if (cell.fresh) cls.push('fresh');
    if (cell.own) cls.push('own');
    const isPicked = live && selected === cell.id;
    if (isPicked) cls.push('focus', `edge-${EDGES[chain.edge]}`);
    const act = live ? ` data-act="pick" data-id="${esc(cell.id)}"` : ' disabled';
    const card = `<button class="${cls.join(' ')}"${act}><span class="letter">${esc(cell.letter)}</span>${priceHTML(cell.letter)}</button>`;
    // Your own new card: move it (swap places with your own new card next
    // to it on that side, if there is one) or take it off.
    const moves = MOVES.map(([dir, label]) => {
      const [dx, dy] = DIRS[dir];
      const next = map.get(keyOf(cell.x + dx, cell.y + dy));
      const there = !!(next && next.own);
      return `<button type="button" data-act="menu-move" data-dir="${dir}"${there ? '' : ' disabled'}>${label}</button>`;
    }).join('');
    const mini = isPicked && menu && menu.kind === 'cell'
      ? `<div class="mini below">${moves}<button type="button" data-act="menu-hand">Убрать</button></div>`
      : '';
    return `<div class="piece" style="${pos(cell)}">${card}${mini}</div>`;
  });
  return `<div class="board" style="--cols:${maxX - minX + 1};--rows:${maxY - minY + 1}">${items.join('')}</div>`;
}

function wordsHTML() {
  return boardHTML();
}

function usedIds() {
  return new Set(placed.map((item) => item.cardId));
}


// The row of buttons above the hand for whoever moves: the move itself, and
// skipping it, with the skip choice taking the place of the move buttons.
function builderHTML() {
  if (!building()) return '';
  let buttons;
  if (swapPick) {
    buttons = [
      '<span class="pick-note">Нажмите на букву, которую заменить</span>',
      '<button class="btn ghost" data-act="skip-cancel">Отмена</button>',
    ];
  } else if (skipAsk) {
    buttons = [
      '<button class="btn" data-act="skip-keep">Пропустить</button>',
      '<button class="btn gold" data-act="skip-swap">Заменить букву</button>',
      '<button class="btn ghost" data-act="skip-cancel">Отмена</button>',
    ];
  } else {
    buttons = [
      '<button class="btn ghost" data-act="builder-clear">Сбросить</button>',
      '<button class="btn gold" data-act="propose">Закончить ход</button>',
      '<button class="btn ghost" data-act="skip">Пропустить ход</button>',
    ];
  }
  return `<div class="builder">${buttons.join('')}</div>`;
}

// The hand as it is shown: sorted as the server sends it, except that a
// card that came from a swap keeps the place of the card it replaced.
function handCards() {
  const used = usedIds();
  const cards = state.you.hand.filter((card) => !used.has(card.id));
  if (!pinned) return cards;
  const at = cards.findIndex((card) => card.id === pinned.id);
  if (at < 0) {
    pinned = null;
    return cards;
  }
  const [card] = cards.splice(at, 1);
  cards.splice(Math.min(pinned.index, cards.length), 0, card);
  return cards;
}

function handHTML() {
  if (!state.you || state.you.queued) return '<div class="hand"></div>';
  const playable = new Set(state.actions.playable || []);
  const glowing = glow && Date.now() - glow.at < GLOW_MS ? glow : null;
  return `<div class="hand${swapPick ? ' swapping' : ''}">${handCards().map((card) => {
    const enabled = building() && playable.has(card.id);
    let html = cardHTML(card, {
      act: enabled ? (swapPick ? 'swap-card' : 'builder-add') : '',
      playable: enabled,
      dim: !enabled && state.phase === 'playing',
      disabled: !enabled,
    });
    if (glowing && glowing.id === card.id) {
      // A redraw in the middle of the glow carries on where it was.
      html = html.replace('<button class="card', `<button style="animation-delay:-${Date.now() - glowing.at}ms" class="card glow`);
    }
    return html;
  }).join('')}</div>`;
}

// Swaps one card of the hand: its letter spins for a second while the server
// answers, then the new card shows in the same place and its glow fades.
async function swapCard(id) {
  const shown = handCards();
  const index = shown.findIndex((card) => card.id === id);
  const el = app.querySelector(`.hand .card[data-id="${id}"]`);
  if (index < 0 || !el) return;
  const before = state.you.hand.map((card) => card.id);
  freeze = true;
  el.classList.add('spinning');
  app.querySelectorAll('.hand .card, .builder .btn').forEach((node) => { node.disabled = true; });
  const letter = el.querySelector('.letter');
  const pts = el.querySelector('.pts');
  if (pts) pts.textContent = '';
  const letters = state.alphabet && state.alphabet.length ? state.alphabet : ['?'];
  const timer = setInterval(() => {
    letter.textContent = letters[Math.floor(Math.random() * letters.length)];
  }, 70);
  const answer = api('/api/action', { method: 'POST', body: { type: 'skip', swap: id } })
    .then((data) => ({ data }), (err) => ({ err }));
  await new Promise((resolve) => setTimeout(resolve, SPIN_MS));
  const result = await answer;
  clearInterval(timer);
  freeze = false;
  if (result.err) {
    error = result.err.message;
    render();
    return;
  }
  state = result.data;
  lastRevision = JSON.stringify(state);
  resetBuilder();
  error = '';
  const fresh = state.you.hand.find((card) => !before.includes(card.id));
  if (fresh) {
    pinned = { id: fresh.id, index };
    glow = { id: fresh.id, at: Date.now() };
  }
  render();
}

// Before the deal: how many letters each player gets. The admin changes it,
// the others only see it.
function handSizeHTML() {
  if (state.phase !== 'waiting' || !state.you || state.you.queued) return '';
  const n = state.handSize;
  if (!(state.actions && state.actions.handSize)) return `<div class="hand-size">Букв на руке: <b>${n}</b></div>`;
  return `<div class="hand-size">Букв на руке:
    <button type="button" class="btn ghost step" data-act="hand-size" data-size="${n - 1}"${n <= state.handMin ? ' disabled' : ''}>−</button>
    <b>${n}</b>
    <button type="button" class="btn ghost step" data-act="hand-size" data-size="${n + 1}"${n >= state.handMax ? ' disabled' : ''}>+</button>
  </div>`;
}

function actionsHTML() {
  const a = state.actions || {};
  const buttons = [handSizeHTML()];
  if (a.start) buttons.push('<button class="btn gold" data-act="start">Раздать</button>');
  if (a.accept) buttons.push('<button class="btn gold" data-act="accept">Принять слова</button>');
  if (a.reject) buttons.push('<button class="btn danger" data-act="reject">Не принять</button>');
  if (a.retract) buttons.push('<button class="btn ghost" data-act="retract">Забрать карты</button>');
  if (a.again) buttons.push('<button class="btn gold" data-act="again">Ещё партию</button>');
  return buttons.join('');
}

function scoresHTML() {
  const rows = (state.players || []).slice().sort((a, b) => b.score - a.score);
  return `<ol class="scores">${rows.map((p) => `<li><span>${esc(p.name)}</span><span>${p.score}</span></li>`).join('')}</ol>`;
}

// Between rounds: the table stays in view under a popup, and the next round
// starts once every player has pressed "New round".
function roundOverHTML() {
  if (state.phase !== 'playing' || state.stage !== 'round-over') return '';
  const rows = (state.players || []).filter((p) => !p.abandoned).slice().sort((a, b) => b.score - a.score);
  const ready = rows.filter((p) => p.ready).length;
  const button = state.actions && state.actions.nextRound
    ? '<button class="btn gold" data-act="next-round">Новый раунд</button>'
    : `<p class="waiting">Ждём остальных: готовы ${ready} из ${rows.length}</p>`;
  // The admin may instead keep the table and go on with a new round on it.
  const continueBtn = state.actions && state.actions.continueRound
    ? '<button class="btn ghost" data-act="continue-round">Продолжить на этом столе</button>'
    : '';
  return `<div class="overlay" role="dialog" aria-modal="true" aria-label="Раунд окончен">
    <div class="dialog">
      <strong>Раунд окончен</strong>
      <ol class="scores">${rows.map((p) => `<li class="${p.ready ? 'ready' : ''}"><span>${esc(p.name)}${p.you ? ' (вы)' : ''}</span><span>${p.ready ? '✓ ' : ''}${p.score}</span></li>`).join('')}</ol>
      ${button}
      ${continueBtn}
    </div>
  </div>`;
}

function renderTable() {
  app.dataset.screen = 'table';
  const you = state.you;
  const role = you && (you.attacker || you.defender) ? 'ваш ход' : '';
  const banner = state.phase === 'finished'
    ? `<div class="banner"><strong>${state.result === 'draw' ? 'Ничья' : 'Победа'}</strong><div>${esc(state.prompt)}</div>${scoresHTML()}</div>`
    : '';
  app.innerHTML = `
    <div class="table-page">
      <header class="top">
        <div class="meta">${playersLine()}</div>
        <div class="top-actions">
          ${state.actions && state.actions.finish ? '<button class="btn ghost" data-act="finish">Закончить</button>' : ''}
          ${state.actions && state.actions.restart ? '<button class="btn ghost" data-act="restart">Новая игра</button>' : ''}
          <button class="btn ghost" data-act="leave">Выйти</button>
        </div>
      </header>
      <section class="felt">
        <div class="center">
          <div class="play">
            ${wordsHTML()}
            ${state.phase === 'waiting' ? `<p class="prompt">${esc(state.prompt)}</p>` : ''}
            ${banner}
          </div>
        </div>
      </section>
      <section class="dock">
        <div class="you-line">
          <span>${you ? esc(you.name) : ''}${role ? ` · ${role}` : ''}${you && you.queued ? ' · очередь' : ''}</span>
          <span>${you && !you.queued ? `очки ${you.score}` : ''}</span>
        </div>
        ${builderHTML()}
        ${handHTML()}
        <div class="actions">${actionsHTML()}</div>
        <p class="error">${esc(error)}</p>
      </section>
      <aside class="log-panel">
        <h2>Стол</h2>
        <ol>${(state.log || []).map((line) => `<li>${esc(line)}</li>`).join('')}</ol>
        ${state.queue && state.queue.length ? `<p class="help">Ждут: ${esc(state.queue.join(', '))}</p>` : ''}
      </aside>
    </div>
    ${roundOverHTML()}`;
}

function render() {
  if (freeze) return;
  if (screen === 'join') renderJoin();
  else if (state) renderTable();
}

// Changes whenever the turn moves on, also when the stage name stays the
// same (a skipped turn, a new deal).
function turnSig(snapshot) {
  if (!snapshot) return '';
  const you = snapshot.you || {};
  return [snapshot.stage, snapshot.round, snapshot.turn, !!you.attacker, !!you.defender].join('|');
}

function tableSig(snapshot) {
  if (!snapshot || !snapshot.table) return '';
  return snapshot.table.cells.map((cell) => cell.id).join(',');
}

function resetBuilder() {
  placed = [];
  shifted = {};
  selected = null;
  chain = null;
  skipAsk = false;
  swapPick = false;
  menu = null;
}

async function refresh() {
  if (screen === 'join') {
    lobby = await api('/api/lobby');
    render();
    return;
  }
  const next = await api('/api/state');
  const key = JSON.stringify(next);
  const stageChanged = !state || turnSig(state) !== turnSig(next);
  const tableChanged = state && next.stage === 'defend' && tableSig(state) !== tableSig(next);
  state = next;
  if (stageChanged || tableChanged) resetBuilder();
  if (key !== lastRevision) {
    lastRevision = key;
    error = '';
    render();
  }
}

async function onJoin(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const name = form.name.value;
  const language = form.language.value;
  error = '';
  try {
    const data = await api('/api/join', { method: 'POST', body: { name, language } });
    token = data.token;
    localStorage.setItem(storeKey, token);
    state = data.state;
    screen = 'table';
    lastRevision = JSON.stringify(state);
    resetBuilder();
    render();
  } catch (err) {
    const line = document.querySelector('#lobby-line');
    if (line) line.textContent = err.message;
  }
}

async function send(body) {
  try {
    error = '';
    const turn = turnSig(state);
    const cards = tableSig(state);
    state = await api('/api/action', { method: 'POST', body });
    lastRevision = JSON.stringify(state);
    if (turnSig(state) !== turn || (state.stage === 'defend' && tableSig(state) !== cards)) resetBuilder();
    render();
  } catch (err) {
    error = err.message;
    render();
  }
}

function addToBuilder(card) {
  menu = null;
  if (!building() || placed.some((item) => item.cardId === card.id)) return;
  // The first card on an empty table: it lies in the middle and is in focus,
  // with the right edge lit, as words are usually laid across first.
  if (!boardCells().length) {
    placed.push({ cardId: card.id, letter: card.letter, x: 0, y: 0 });
    selected = card.id;
    chain = { edge: 1, dx: DIRS[1][0], dy: DIRS[1][1], ids: [] };
    error = '';
    render();
    return;
  }
  if (!chain) {
    error = 'Нажмите на букву на столе, к которой приставить карту.';
    render();
    return;
  }
  error = putCard(card);
  render();
}


// Takes one of your new cards off the table. A card can go if it has one
// neighbour, or neighbours only on opposite sides (left and right, or above
// and below). In the second case the parts close up: the left (upper) part
// stays, the right (lower) part moves to it. Returns an error message, or ''.
// Moves the focused own card one step: it swaps places with the card next to
// it on that side, only if that one is also your own new card; other
// players' cards never change places this way. The card stays in focus.
function movePicked(dir) {
  const cells = boardCells();
  const target = cells.find((cell) => cell.id === selected);
  if (!target || !target.own) return;
  const [dx, dy] = DIRS[dir];
  const other = mapOf(cells).get(keyOf(target.x + dx, target.y + dy));
  if (!other || !other.own) return;
  setPlace(target.id, other.x, other.y);
  setPlace(other.id, target.x, target.y);
  // A word that was growing from here starts again from the new place.
  if (chain) chain.ids = [];
}

function removePicked() {
  if (!selected || !placed.some((item) => item.cardId === selected)) return '';
  const cells = boardCells();
  const byId = new Map(cells.map((cell) => [cell.id, cell]));
  const target = byId.get(selected);
  const map = mapOf(cells.filter((cell) => cell !== target));
  // DIRS: up, right, down, left.
  const near = DIRS.map(([dx, dy]) => map.get(keyOf(target.x + dx, target.y + dy)));
  const across = near[1] || near[3];
  const down = near[0] || near[2];
  if (across && down) return 'Эту карту не убрать: к ней примыкают карты с соседних сторон.';

  // The neighbours on both ends of the gap: [before, after, step from after to before].
  let ends = null;
  if (near[3] && near[1]) ends = [near[3], near[1], [-1, 0]];
  if (near[0] && near[2]) ends = [near[0], near[2], [0, -1]];
  const moves = [];
  if (ends) {
    const [, after, [dx, dy]] = ends;
    const tail = partBeyond(map, after, target, -dx, -dy);
    const blocked = [...tail].some((id) => {
      const cell = byId.get(id);
      const there = map.get(keyOf(cell.x + dx, cell.y + dy));
      return there && !tail.has(there.id);
    });
    if (blocked) return 'Эту карту не убрать: при склейке карты легли бы на другие карты.';
    tail.forEach((id) => {
      const cell = byId.get(id);
      moves.push([id, cell.x + dx, cell.y + dy]);
    });
  }
  placed = placed.filter((item) => item.cardId !== selected);
  moves.forEach(([id, x, y]) => setPlace(id, x, y));
  // The focused card is gone: so is the word that was growing from it.
  selected = null;
  chain = null;
  return '';
}


app.addEventListener('click', (event) => {
  if (freeze) return;
  const target = event.target.closest('[data-act]');
  if (!target) {
    if (menu) {
      menu = null;
      render();
    }
    return;
  }
  const act = target.dataset.act;
  if (act === 'start') send({ type: 'start' });
  else if (act === 'hand-size') send({ type: 'hand-size', size: Number(target.dataset.size) });
  else if (act === 'skip') {
    // Skipping drops whatever was laid on the table this move.
    resetBuilder();
    skipAsk = true;
    render();
  } else if (act === 'skip-cancel') {
    skipAsk = false;
    swapPick = false;
    render();
  } else if (act === 'skip-keep') send({ type: 'skip' });
  else if (act === 'skip-swap') {
    swapPick = true;
    render();
  } else if (act === 'swap-card') swapCard(target.dataset.id);
  else if (act === 'again') send({ type: 'again' });
  else if (act === 'next-round') send({ type: 'next-round' });
  else if (act === 'continue-round') send({ type: 'continue-round' });
  else if (act === 'kick') {
    if (window.confirm(`Выкинуть из игры: ${target.dataset.name}?`)) send({ type: 'kick', playerId: target.dataset.id });
  }
  else if (act === 'finish') {
    if (window.confirm('Закончить игру и подвести итог по очкам?')) send({ type: 'finish' });
  } else if (act === 'restart') {
    const running = state && state.phase === 'playing';
    if (!running || window.confirm('Начать новую игру? Текущая партия будет сброшена для всех.')) {
      send({ type: 'restart' });
    }
  } else if (act === 'accept') send({ type: 'accept' });
  else if (act === 'reject') send({ type: 'reject' });
  else if (act === 'retract') send({ type: 'retract' });
  else if (act === 'builder-add') {
    const card = state.you.hand.find((item) => item.id === target.dataset.id);
    if (card) addToBuilder(card);
  } else if (act === 'pick') {
    pickCell(target.dataset.id);
    render();
  } else if (act === 'menu-move') {
    movePicked(Number(target.dataset.dir));
    render();
  } else if (act === 'menu-hand') {
    if (menu && menu.kind === 'cell') error = removePicked();
    menu = null;
    render();
  } else if (act === 'builder-clear') {
    placed = [];
    shifted = {};
    selected = null;
    chain = null;
    menu = null;
    render();
  } else if (act === 'propose') {
    if (!placed.length) {
      error = 'Положите на стол хотя бы одну карту.';
      render();
      return;
    }
    send({
      type: 'propose',
      cells: placed.map((item) => ({ cardId: item.cardId, x: item.x, y: item.y })),
      moved: Object.keys(shifted).map((cardId) => ({ cardId, x: shifted[cardId].x, y: shifted[cardId].y })),
    });
  } else if (act === 'leave') {
    api('/api/leave', { method: 'POST', body: {} }).catch(() => {}).finally(() => {
      token = '';
      localStorage.removeItem(storeKey);
      state = null;
      screen = 'join';
      lastRevision = '';
      render();
    });
  }
});

async function poll() {
  try {
    await refresh();
  } catch (err) {
    if (err.session || screen === 'join') {
      render();
      return;
    }
    error = err.message;
    if (app.dataset.screen === 'table') {
      const node = document.querySelector('.error');
      if (node) node.textContent = error;
    } else render();
  }
}

render();
poll();
setInterval(poll, 800);
