'use strict';

const ALPH = {
  ru: 'АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ'.split(''),
  es: 'ABCDEFGHIJKLMNÑOPQRSTUVWXYZ'.split(''),
};

// Letter prices follow Scrabble: the rarer the letter, the more it is worth.
// Spanish Scrabble has no K or W tiles; here they get the top price.
const PRICE_GROUPS = {
  ru: {
    1: 'АВЕИНОРСТ',
    2: 'ДКЛМПУ',
    3: 'БГЁЬЯ',
    4: 'ЙЫ',
    5: 'ЖЗХЦЧ',
    8: 'ШЭЮ',
    10: 'ФЩЪ',
  },
  es: {
    1: 'AEOISNLRUT',
    2: 'DG',
    3: 'CBMP',
    4: 'HFVY',
    5: 'Q',
    8: 'JÑX',
    10: 'ZKW',
  },
};

const PRICES = {};
Object.keys(PRICE_GROUPS).forEach((language) => {
  PRICES[language] = {};
  Object.entries(PRICE_GROUPS[language]).forEach(([points, letters]) => {
    letters.split('').forEach((letter) => {
      PRICES[language][letter] = Number(points);
    });
  });
});

const HAND = 6;
const MAX_SEATS = 4;
const DISCONNECT_MS = 12000;

class RuleError extends Error {
  constructor(message) {
    super(message);
    this.name = 'RuleError';
  }
}

let seq = 1;
function uid(prefix) {
  seq += 1;
  return prefix + seq.toString(36);
}

function fresh() {
  return {
    language: null,
    phase: 'waiting',
    players: [],
    deck: [],
    discard: 0,
    dealerId: null,
    adminId: null,
    starterId: null,
    turnId: null,
    moved: [],
    played: [],
    ready: [],
    stage: null,
    bout: null,
    result: null,
    winnerId: null,
    turnAt: 0,
    turnNo: 0,
    round: 0,
    log: [],
    revision: 1,
  };
}

function createTable() {
  return fresh();
}

function touch(game) {
  game.revision += 1;
}

function log(game, text) {
  game.log.push(text);
  if (game.log.length > 40) game.log.splice(0, game.log.length - 40);
}

function alphabet(game) {
  return ALPH[game.language] || ALPH.ru;
}

function player(game, id) {
  return game.players.find((p) => p.id === id) || null;
}

function priceOf(game, letter) {
  const table = PRICES[game.language] || PRICES.ru;
  return table[letter] || 0;
}

function isSeated(p) {
  return p && !p.queued && !p.abandoned;
}

function isActive(p) {
  return p && !p.queued && !p.abandoned;
}

function seated(game) {
  return game.players.filter((p) => !p.queued && !p.abandoned);
}

function nextId(game, fromId, pred) {
  const start = Math.max(0, game.players.findIndex((p) => p.id === fromId));
  const n = game.players.length;
  if (!n) return null;
  for (let step = 1; step <= n; step += 1) {
    const p = game.players[(start + step) % n];
    if (pred(p)) return p.id;
  }
  return null;
}

function nextActiveId(game, fromId) {
  return nextId(game, fromId, isActive);
}

// The table is a grid, like a crossword: every card lies in a cell {x, y},
// y grows downwards. `pending` is the move the other players have not
// accepted yet; its cards are still the mover's.
function emptyBout() {
  return {
    cells: [],
    pending: null,
  };
}

const cellKey = (x, y) => `${x},${y}`;
const SIDES = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const MAX_COORD = 60;

function cellMap(cells) {
  const map = new Map();
  cells.forEach((cell) => map.set(cellKey(cell.x, cell.y), cell));
  return map;
}

// The words a move makes: every horizontal and vertical run of two or more
// cards that goes through one of the new cards.
function wordsThrough(map, fresh) {
  const seen = new Set();
  const words = [];
  fresh.forEach((cell) => {
    [[1, 0], [0, 1]].forEach(([dx, dy]) => {
      let x = cell.x;
      let y = cell.y;
      while (map.has(cellKey(x - dx, y - dy))) {
        x -= dx;
        y -= dy;
      }
      const start = `${x},${y},${dx}`;
      if (seen.has(start)) return;
      seen.add(start);
      let text = '';
      while (map.has(cellKey(x, y))) {
        text += map.get(cellKey(x, y)).card.letter;
        x += dx;
        y += dy;
      }
      if (text.length > 1) words.push(text);
    });
  });
  return words;
}

function setStage(game, stage) {
  game.stage = stage;
  game.turnAt = Date.now();
}

// A random letter: the cheaper the letter, the more likely it is.
// The weight of a letter is 1 / price.
function randomLetter(language, except) {
  const prices = PRICES[language];
  if (!prices) throw new RuleError('Неизвестный набор букв');
  const letters = ALPH[language].filter((letter) => letter !== except);
  const total = letters.reduce((sum, letter) => sum + 1 / prices[letter], 0);
  let roll = Math.random() * total;
  for (let i = 0; i < letters.length; i += 1) {
    roll -= 1 / prices[letters[i]];
    if (roll < 0) return letters[i];
  }
  return letters[letters.length - 1];
}

// game.deck is normally empty; tests queue letters there to fix the deal.
function drawOne(game, p) {
  const card = game.deck.length
    ? game.deck.pop()
    : { id: uid('c'), letter: randomLetter(game.language) };
  p.hand.push(card);
}

function topUp(game, p) {
  while (p.hand.length < HAND) drawOne(game, p);
}

// ---------------------------------------------------------------- rounds --

// Whose turn it is. On an empty table the player lays horizontal words
// ("attack"); otherwise the player builds vertical words on them ("defend").
function setTurn(game, id) {
  game.turnId = id;
  game.turnNo += 1;
  const laid = game.bout && game.bout.cells.length > 0;
  setStage(game, laid ? 'defend' : 'attack');
  log(game, `Ходит ${player(game, id).name}`);
  touch(game);
}

function startRound(game, starterId) {
  game.starterId = starterId;
  game.moved = [];
  game.played = [];
  game.ready = [];
  game.bout = emptyBout();
  setTurn(game, starterId);
}

// Everyone has moved or skipped: the table is cleared, hands are topped up
// and the next player in order starts a new round.
function endRound(game) {
  const cards = collectCards(game.bout);
  game.discard += cards.length;
  game.bout = null;
  game.players.forEach((p) => {
    if (isActive(p)) topUp(game, p);
  });
  if (endIfNeeded(game)) return;
  const starter = nextActiveId(game, game.starterId) || game.players.find(isActive).id;
  log(game, 'Новый раунд');
  startRound(game, starter);
}

// The player whose turn it was is done for this round.
// `played`: the turn ended with words the others accepted, not a skip.
function endTurn(game, played) {
  if (!game.moved.includes(game.turnId)) game.moved.push(game.turnId);
  if (played && !game.played.includes(game.turnId)) game.played.push(game.turnId);
  if (endIfNeeded(game)) return;
  const next = nextId(game, game.turnId, (p) => isActive(p) && !game.moved.includes(p.id));
  if (next) setTurn(game, next);
  // The next round starts at once when there is nothing to look at: everyone
  // skipped, or only one player laid words and that was the last turn, so the
  // others have just accepted them.
  else if (!game.played.length || (played && game.played.length === 1)) endRound(game);
  else roundOver(game);
}

// Everyone has moved: the table stays as it is until every player presses
// "New round".
function roundOver(game) {
  game.turnId = null;
  game.ready = [];
  setStage(game, 'round-over');
  log(game, 'Раунд окончен');
  touch(game);
}

function everyoneReady(game) {
  return game.players.filter(isActive).every((p) => game.ready.includes(p.id));
}

function nextRound(game, playerId) {
  if (game.phase !== 'playing' || game.stage !== 'round-over') throw new RuleError('Раунд ещё идёт');
  const p = player(game, playerId);
  if (!isActive(p)) throw new RuleError('Вы не в этой партии');
  if (!game.ready.includes(playerId)) {
    game.ready.push(playerId);
    log(game, `${p.name} готов`);
  }
  if (everyoneReady(game)) endRound(game);
  touch(game);
}

function beginDeal(game) {
  const people = seated(game);
  if (people.length < 2) throw new RuleError('Нужны хотя бы двое');
  if (people.length > MAX_SEATS) throw new RuleError('Слишком много игроков');
  if (!game.language) game.language = 'ru';
  game.deck = [];
  people.forEach((p) => {
    p.hand = [];
    p.score = 0;
    topUp(game, p);
  });
  game.discard = 0;
  game.result = null;
  game.winnerId = null;
  game.phase = 'playing';
  game.round = (game.round || 0) + 1;
  game.log = [];
  if (!game.dealerId || !player(game, game.dealerId)) game.dealerId = people[0].id;
  startRound(game, nextActiveId(game, game.dealerId) || people[0].id);
  touch(game);
}


function cleanName(name, fallback) {
  const text = String(name || '').replace(/\s+/g, ' ').replace(/[<>]/g, '').trim().slice(0, 20);
  return text || fallback;
}

function join(game, { name, language, now }) {
  const lang = language === 'es' ? 'es' : 'ru';
  if (!game.players.length) {
    game.language = lang;
  }
  const person = {
    id: uid('p'),
    token: uid('t'),
    name: cleanName(name, `Игрок ${game.players.length + 1}`),
    hand: [],
    score: 0,
    queued: false,
    abandoned: false,
    connected: true,
    lastSeen: now || Date.now(),
  };
  const playing = game.phase === 'playing';
  const seats = seated(game).length;
  if (playing || seats >= MAX_SEATS) {
    const waiting = game.players.filter((p) => p.queued).length;
    if (waiting >= MAX_SEATS) throw new RuleError('Стол полон');
    person.queued = true;
    game.players.push(person);
    log(game, `${person.name} ждёт следующую партию`);
  } else {
    game.players.push(person);
    if (!game.dealerId) game.dealerId = person.id;
    log(game, `${person.name} садится за стол`);
  }
  if (!game.adminId) game.adminId = person.id;
  touch(game);
  return person;
}

function isAdmin(game, playerId) {
  return !!playerId && game.adminId === playerId;
}

function requireAdmin(game, playerId) {
  if (!isAdmin(game, playerId)) throw new RuleError('Это может сделать только админ');
}

// Keeps an admin at the table: when the admin is gone, the first player who
// is still there takes over.
function checkAdmin(game) {
  const admin = player(game, game.adminId);
  if (admin && !admin.abandoned) return;
  const next = game.players.find((p) => !p.abandoned && !p.queued) || game.players.find((p) => !p.abandoned);
  game.adminId = next ? next.id : null;
  if (next) log(game, `Админ теперь ${next.name}`);
}

function removePlayer(game, id) {
  game.players = game.players.filter((p) => p.id !== id);
  if (game.dealerId === id) game.dealerId = game.players[0] ? game.players[0].id : null;
}

function reset(game) {
  const next = fresh();
  Object.keys(game).forEach((key) => delete game[key]);
  Object.assign(game, next);
}

function leave(game, playerId) {
  const p = player(game, playerId);
  if (!p) return;
  if (game.phase === 'playing' && !p.queued) {
    p.abandoned = true;
    p.connected = false;
    p.lastSeen = 0;
    log(game, `${p.name} вышел`);
    if (!endIfNeeded(game)) autoAbandoned(game);
    const humans = game.players.filter((item) => !item.queued && !item.abandoned);
    if (!humans.length) reset(game);
  } else {
    removePlayer(game, playerId);
    if (!game.players.length) reset(game);
  }
  if (game.players.length) checkAdmin(game);
  touch(game);
}

// The admin throws a player out: the player leaves the game as with "Leave",
// and their session ends, so their page goes back to the join screen.
function kick(game, adminId, targetId) {
  requireAdmin(game, adminId);
  if (targetId === adminId) throw new RuleError('Себя выкинуть нельзя: нажмите «Выйти»');
  const target = player(game, targetId);
  if (!target || target.abandoned) throw new RuleError('Такого игрока за столом нет');
  log(game, `${player(game, adminId).name} выкидывает из игры: ${target.name}`);
  target.token = null;
  leave(game, targetId);
}

function collectCards(bout) {
  return bout ? bout.cells.map((cell) => cell.card) : [];
}

// Cards of a move that was not accepted go back to the player who laid them.
function returnPending(game) {
  const owner = player(game, game.turnId);
  const pending = game.bout && game.bout.pending;
  if (!pending) return;
  if (owner) pending.cells.forEach((cell) => owner.hand.push(cell.card));
  game.bout.pending = null;
}

// The game is over: whoever has the most points wins.
function finishGame(game) {
  if (game.bout) returnPending(game);
  game.phase = 'finished';
  game.stage = 'over';
  game.bout = null;
  game.turnId = null;
  const people = game.players.filter((p) => !p.queued);
  const best = Math.max(0, ...people.map((p) => p.score || 0));
  const leaders = people.filter((p) => (p.score || 0) === best);
  if (leaders.length === 1) {
    game.winnerId = leaders[0].id;
    game.result = 'win';
    log(game, `Победа: ${leaders[0].name}, ${best} оч.`);
  } else {
    game.winnerId = null;
    game.result = 'draw';
    log(game, `Ничья: по ${best} оч.`);
  }
  touch(game);
}

// The game ends only when a player ends it, or when too few players are left.
function endIfNeeded(game) {
  if (game.phase !== 'playing') return true;
  if (game.players.filter(isActive).length >= 2) return false;
  finishGame(game);
  return true;
}

function finish(game, playerId) {
  if (game.phase !== 'playing') throw new RuleError('Партия не идёт');
  const p = player(game, playerId);
  if (!isSeated(p)) throw new RuleError('Вы не за столом');
  log(game, `${p.name} заканчивает игру`);
  finishGame(game);
}

// ----------------------------------------------------------------- moves --

function scoreCards(game, p, cards) {
  const points = cards.reduce((sum, card) => sum + priceOf(game, card.letter), 0);
  p.score = (p.score || 0) + points;
  log(game, `${p.name} +${points} оч.`);
}

function requireTurn(game, playerId, stage, message) {
  if (game.phase !== 'playing' || game.stage !== stage) throw new RuleError(message);
  if (playerId !== game.turnId) throw new RuleError('Сейчас не ваш ход');
}

// First move of a round: horizontal words of any length on one line,
// one empty cell between words.
function playAttack(game, playerId, action) {
  requireTurn(game, playerId, 'attack', 'Сейчас нельзя класть слова');
  const layer = player(game, playerId);
  let rows = action && action.rows;
  if (!rows && action && action.cardId) rows = [[action.cardId]];
  if (!Array.isArray(rows) || !rows.length) throw new RuleError('Положите карты');

  const used = new Set();
  const cells = [];
  let x = 0;
  const texts = rows.map((row) => {
    if (!Array.isArray(row) || !row.length) throw new RuleError('Пустое слово');
    let text = '';
    row.forEach((item) => {
      const cardId = typeof item === 'string' ? item : item && item.cardId;
      if (used.has(cardId)) throw new RuleError('Карта повторяется');
      const card = layer.hand.find((handCard) => handCard.id === cardId);
      if (!card) throw new RuleError('Такой карты нет в руке');
      used.add(cardId);
      cells.push({ card, x, y: 0 });
      text += card.letter;
      x += 1;
    });
    x += 1;
    return text;
  });

  layer.hand = layer.hand.filter((card) => !used.has(card.id));
  game.bout.pending = { cells, words: texts };
  log(game, `${layer.name} кладёт ${texts.join(' · ')}`);
  setStage(game, 'confirm-attack');
  touch(game);
}

// Later moves: new cards go into cells next to the cards on the table, so
// that new words start from any card there, the mover's own included, across
// or down. To fit a card in between, the move may push cards of the table
// aside (`moved`: their new places). Cards may also hang on other new cards,
// as long as the whole move touches the table. The other players see the
// table as it will be and accept or reject the move as a whole.
function propose(game, playerId, action) {
  if (game.phase !== 'playing' || (game.stage !== 'attack' && game.stage !== 'defend')) {
    throw new RuleError('Сейчас нельзя класть карты');
  }
  if (playerId !== game.turnId) throw new RuleError('Сейчас не ваш ход');
  const bout = game.bout;
  const specs = action && action.cells;
  if (!Array.isArray(specs) || !specs.length) throw new RuleError('Добавьте хотя бы одну свою букву');
  const builder = player(game, playerId);
  const place = (spec) => {
    const x = spec && spec.x;
    const y = spec && spec.y;
    if (!Number.isInteger(x) || !Number.isInteger(y) || Math.abs(x) > MAX_COORD || Math.abs(y) > MAX_COORD) {
      throw new RuleError('Неверное место на столе');
    }
    return { x, y };
  };

  // Cards already on the table, at their places after this move.
  const shifts = new Map();
  (Array.isArray(action.moved) ? action.moved : []).forEach((spec) => {
    const cardId = spec && spec.cardId;
    if (!bout.cells.some((cell) => cell.card.id === cardId)) throw new RuleError('Такой карты нет на столе');
    if (shifts.has(cardId)) throw new RuleError('Карта повторяется');
    shifts.set(cardId, place(spec));
  });
  const old = bout.cells.map((cell) => ({ card: cell.card, ...(shifts.get(cell.card.id) || { x: cell.x, y: cell.y }) }));
  const table = new Map();
  old.forEach((cell) => {
    if (table.has(cellKey(cell.x, cell.y))) throw new RuleError('Карты на столе легли друг на друга');
    table.set(cellKey(cell.x, cell.y), cell);
  });

  const map = new Map(table);
  const used = new Set();
  const fresh = specs.map((spec) => {
    const { x, y } = place(spec);
    if (map.has(cellKey(x, y))) throw new RuleError('Это место уже занято');
    const cardId = spec.cardId;
    if (used.has(cardId)) throw new RuleError('Карта повторяется');
    const card = builder.hand.find((item) => item.id === cardId);
    if (!card) throw new RuleError('Такой карты нет в руке');
    used.add(cardId);
    const cell = { card, x, y };
    map.set(cellKey(x, y), cell);
    return cell;
  });

  const freshMap = cellMap(fresh);
  const touches = (cell, where) => SIDES.some(([dx, dy]) => where.has(cellKey(cell.x + dx, cell.y + dy)));
  const reached = new Set();
  // On an empty table the move only has to hold together.
  const queue = table.size ? fresh.filter((cell) => touches(cell, table)) : [fresh[0]];
  queue.forEach((cell) => reached.add(cellKey(cell.x, cell.y)));
  while (queue.length) {
    const cell = queue.shift();
    SIDES.forEach(([dx, dy]) => {
      const key = cellKey(cell.x + dx, cell.y + dy);
      if (freshMap.has(key) && !reached.has(key)) {
        reached.add(key);
        queue.push(freshMap.get(key));
      }
    });
  }
  if (reached.size !== fresh.length) {
    throw new RuleError(table.size
      ? 'Новые буквы должны примыкать к буквам на столе'
      : 'Буквы первого хода должны примыкать друг к другу');
  }

  builder.hand = builder.hand.filter((card) => !used.has(card.id));
  const moved = old.filter((cell) => shifts.has(cell.card.id));
  const words = wordsThrough(map, fresh.concat(moved));
  bout.pending = { cells: fresh, moved, words };
  setStage(game, 'confirm');
  log(game, `${builder.name}: ${words.join(' · ') || fresh.map((cell) => cell.card.letter).join('')}`);
  touch(game);
}

function accept(game, playerId) {
  const actor = player(game, playerId);
  if (!isActive(actor)) throw new RuleError('Вы не в этой партии');
  if (game.stage !== 'confirm-attack' && game.stage !== 'confirm') {
    throw new RuleError('Нет слова, которое нужно принять');
  }
  if (playerId === game.turnId) throw new RuleError('Своё слово принимает соперник');
  const owner = player(game, game.turnId);
  const bout = game.bout;
  const { cells, moved } = bout.pending;
  log(game, `${actor.name} принимает`);
  (moved || []).forEach((shift) => {
    const cell = bout.cells.find((item) => item.card.id === shift.card.id);
    cell.x = shift.x;
    cell.y = shift.y;
  });
  cells.forEach((cell) => bout.cells.push(cell));
  bout.pending = null;
  scoreCards(game, owner, cells.map((cell) => cell.card));
  endTurn(game, true);
  touch(game);
}

// The cards go back to the hand; the same player moves again or skips.
function takeBack(game) {
  returnPending(game);
  setStage(game, game.bout.cells.length ? 'defend' : 'attack');
  touch(game);
}

function reject(game, playerId) {
  const actor = player(game, playerId);
  if (!isActive(actor)) throw new RuleError('Вы не в этой партии');
  if (game.stage !== 'confirm-attack' && game.stage !== 'confirm') {
    throw new RuleError('Нет слова, которое можно оспорить');
  }
  if (playerId === game.turnId) throw new RuleError('Своё слово оспаривает соперник');
  log(game, `${actor.name} не принимает`);
  takeBack(game);
}

function retract(game, playerId) {
  if (game.stage !== 'confirm-attack' && game.stage !== 'confirm') {
    throw new RuleError('Слово уже не лежит');
  }
  if (playerId !== game.turnId) throw new RuleError('Забрать слово может только тот, кто его положил');
  log(game, `${player(game, playerId).name} забирает слово назад`);
  takeBack(game);
}

// Skip the turn. With `swap` (a card id) that one card of the hand is
// replaced by a random letter, never the same letter again.
function skip(game, playerId, action) {
  if (game.phase !== 'playing' || (game.stage !== 'attack' && game.stage !== 'defend')) {
    throw new RuleError('Пропустить можно только свой ход');
  }
  if (playerId !== game.turnId) throw new RuleError('Сейчас не ваш ход');
  const p = player(game, playerId);
  const swapId = action && action.swap;
  if (swapId) {
    const index = p.hand.findIndex((card) => card.id === swapId);
    if (index < 0) throw new RuleError('Такой карты нет в руке');
    const old = p.hand[index];
    // Tests may queue the next letter in game.deck.
    const queued = game.deck.length ? game.deck.pop() : null;
    const letter = queued && queued.letter !== old.letter ? queued.letter : randomLetter(game.language, old.letter);
    p.hand[index] = { id: uid('c'), letter };
    log(game, `${p.name} пропускает ход и меняет одну букву`);
  } else {
    log(game, `${p.name} пропускает ход`);
  }
  endTurn(game);
  touch(game);
}

function clearRound(game) {
  game.players = game.players.filter((item) => !item.abandoned);
  game.players.forEach((item, index) => {
    item.hand = [];
    item.abandoned = false;
    item.queued = index >= MAX_SEATS;
  });
  game.phase = 'waiting';
  game.deck = [];
  game.discard = 0;
  game.turnId = null;
  game.starterId = null;
  game.moved = [];
  game.played = [];
  game.ready = [];
  game.stage = null;
  game.bout = null;
  game.result = null;
  game.winnerId = null;
  const previous = game.dealerId;
  const nextDealer = previous ? nextId(game, previous, (item) => !item.queued) : null;
  game.dealerId = nextDealer || (game.players[0] && game.players[0].id) || null;
}

function again(game, playerId) {
  const p = player(game, playerId);
  if (!p) throw new RuleError('Вас нет за столом');
  requireAdmin(game, playerId);
  if (game.phase !== 'finished') throw new RuleError('Партия ещё идёт');
  clearRound(game);
  log(game, 'Новая партия');
  touch(game);
}

function restart(game, playerId) {
  const p = player(game, playerId);
  if (!isSeated(p)) throw new RuleError('Вы не за столом');
  requireAdmin(game, playerId);
  if (game.phase === 'waiting') throw new RuleError('Партия ещё не началась');
  clearRound(game);
  if (seated(game).length >= 2) beginDeal(game);
  log(game, `${p.name} начинает новую игру`);
  touch(game);
}


function act(game, playerId, action) {
  const p = player(game, playerId);
  if (!p) throw new RuleError('Вас нет за столом');
  if (p.abandoned) throw new RuleError('Вы вышли из партии');
  const type = action && action.type;
  if (type === 'start') {
    if (p.queued) throw new RuleError('Вы ждёте следующую партию');
    requireAdmin(game, playerId);
    beginDeal(game);
    return;
  }
  if (type === 'kick') return kick(game, playerId, action.playerId);
  if (type === 'again') return again(game, playerId);
  if (type === 'restart') return restart(game, playerId);
  if (type === 'finish') return finish(game, playerId);
  if (type === 'attack') return playAttack(game, playerId, action);
  if (type === 'propose') return propose(game, playerId, action);
  if (type === 'skip') return skip(game, playerId, action);
  if (type === 'next-round') return nextRound(game, playerId);
  if (type === 'accept') return accept(game, playerId);
  if (type === 'reject') return reject(game, playerId);
  if (type === 'retract') return retract(game, playerId);
  throw new RuleError('Неизвестное действие');
}

// ------------------------------------------------------------------ view --

function sortHand(hand, language) {
  const alpha = ALPH[language] || ALPH.ru;
  return hand.slice().sort((a, b) => alpha.indexOf(a.letter) - alpha.indexOf(b.letter));
}

function actionsFor(game, p) {
  const actions = {
    start: false,
    attack: false,
    propose: false,
    skip: false,
    accept: false,
    reject: false,
    retract: false,
    again: false,
    restart: false,
    kick: false,
    finish: false,
    nextRound: false,
    playable: [],
  };
  if (!p || p.abandoned) return actions;
  // Starting a game, a new one or the next one, and throwing players out are
  // the admin's.
  const admin = isAdmin(game, p.id);
  actions.restart = admin && !p.queued && game.phase !== 'waiting';
  actions.kick = admin;
  actions.finish = !p.queued && game.phase === 'playing';
  actions.nextRound = game.phase === 'playing' && game.stage === 'round-over'
    && isActive(p) && !game.ready.includes(p.id);
  if (p.queued) {
    actions.again = admin && game.phase === 'finished';
    return actions;
  }
  if (game.phase === 'waiting') {
    const n = seated(game).length;
    actions.start = admin && n >= 2;
    return actions;
  }
  if (game.phase === 'finished') {
    actions.again = admin;
    return actions;
  }
  const mine = p.id === game.turnId;
  const confirming = game.stage === 'confirm-attack' || game.stage === 'confirm';
  // Whoever moves puts cards on the table, empty or not, or skips.
  if (mine && (game.stage === 'attack' || game.stage === 'defend')) {
    actions.propose = true;
    actions.skip = true;
    actions.playable = p.hand.map((card) => card.id);
  }
  if (confirming && mine) actions.retract = true;
  if (confirming && !mine) {
    actions.accept = true;
    actions.reject = true;
  }
  return actions;
}

function promptFor(game, p) {
  if (p && p.queued) return 'Вы ждёте следующую партию.';
  if (game.phase === 'waiting') {
    const n = seated(game).length;
    if (n < 2) return 'Ждём второго игрока. Откройте эту страницу на другом устройстве и нажмите Join.';
    if (p && isAdmin(game, p.id)) return 'Стол готов. Раздайте буквы.';
    const admin = player(game, game.adminId);
    return admin ? `Ждём, когда ${admin.name} раздаст буквы.` : 'Стол готов.';
  }
  if (game.phase === 'finished') {
    const winner = player(game, game.winnerId);
    if (winner) return `${winner.name} — ${winner.score || 0} оч.`;
    return game.result === 'draw' ? 'Ничья.' : 'Игра окончена.';
  }
  if (game.stage === 'round-over') return 'Раунд окончен.';
  const turn = player(game, game.turnId);
  return turn ? `Ходит ${turn.name}.` : '';
}

function view(game, playerId) {
  const you = player(game, playerId);
  const bout = game.bout;
  const laying = game.stage === 'attack' || game.stage === 'confirm-attack';
  const building = game.stage === 'defend' || game.stage === 'confirm';
  let table = null;
  if (bout) {
    const pending = bout.pending ? bout.pending.cells : [];
    const shifts = new Map(((bout.pending && bout.pending.moved) || []).map((item) => [item.card.id, item]));
    const cell = (item, fresh) => ({ id: item.card.id, letter: item.card.letter, x: item.x, y: item.y, fresh });
    table = {
      cells: bout.cells.map((item) => cell(shifts.get(item.card.id) || item, false))
        .concat(pending.map((item) => cell(item, true))),
      pending: bout.pending ? { text: bout.pending.words.join(' · ') } : null,
    };
  }
  const role = (id) => ({
    attacker: id === game.turnId && laying,
    defender: id === game.turnId && building,
  });
  return {
    revision: game.revision,
    round: game.round || 0,
    turn: game.turnNo || 0,
    language: game.language,
    alphabet: game.language ? alphabet(game) : [],
    prices: PRICES[game.language] || PRICES.ru,
    phase: game.phase,
    stage: game.stage,
    prompt: promptFor(game, you),
    result: game.result,
    winnerId: game.winnerId || null,
    you: you
      ? {
        id: you.id,
        name: you.name,
        score: you.score || 0,
        admin: isAdmin(game, you.id),
        queued: you.queued,
        ...role(you.id),
        hand: sortHand(you.hand, game.language).map((card) => ({ id: card.id, letter: card.letter })),
      }
      : null,
    players: game.players.filter((p) => !p.queued).map((p) => ({
      id: p.id,
      name: p.name,
      score: p.score || 0,
      ...role(p.id),
      moved: game.phase === 'playing' && game.moved.includes(p.id),
      starter: game.phase === 'playing' && p.id === game.starterId,
      admin: isAdmin(game, p.id),
      ready: game.phase === 'playing' && game.stage === 'round-over' && game.ready.includes(p.id),
      connected: p.connected,
      abandoned: p.abandoned,
      you: p.id === playerId,
    })),
    queue: game.players.filter((p) => p.queued).map((p) => p.name),
    table,
    actions: actionsFor(game, you),
    log: game.log.slice(-12),
  };
}

function lobby(game) {
  return {
    language: game.language,
    phase: game.phase,
    players: seated(game).map((p) => p.name),
    queue: game.players.filter((p) => p.queued).map((p) => p.name),
    seats: seated(game).length,
  };
}

// --------------------------------------------------- absent players, time --



function autoAbandoned(game) {
  for (let guard = 0; guard < 16; guard += 1) {
    if (game.phase !== 'playing') return;
    if (game.stage === 'round-over') {
      if (everyoneReady(game)) endRound(game);
      return;
    }
    const turn = player(game, game.turnId);
    if ((game.stage === 'attack' || game.stage === 'defend') && turn && turn.abandoned) {
      endTurn(game);
      continue;
    }
    if (game.stage === 'confirm-attack' || game.stage === 'confirm') {
      if (turn && turn.abandoned) {
        takeBack(game);
        continue;
      }
      // Nobody is left to judge the word: it stands.
      return;
    }
    return;
  }
}

function seen(game, playerId, now) {
  const p = player(game, playerId);
  if (!p) return;
  p.lastSeen = now;
  p.connected = true;
}

// Marks who is connected. There are no timers: nothing is dealt, skipped or
// accepted for anyone by itself.
function tick(game, now) {
  const stamp = now || Date.now();
  game.players.forEach((p) => {
    if (!p.abandoned) p.connected = stamp - p.lastSeen < DISCONNECT_MS;
  });
}

const debug = {
  setHand(game, playerId, letters) {
    player(game, playerId).hand = letters.map((letter) => ({ id: uid('c'), letter }));
  },
  // Letters that will be dealt next, in this order, before random ones.
  setDeck(game, letters) {
    game.deck = letters.slice().reverse().map((letter) => ({ id: uid('c'), letter }));
  },
  // Start a fresh round with this player to move.
  forceTurn(game, playerId) {
    game.phase = 'playing';
    startRound(game, playerId);
  },
};

module.exports = {
  ALPH,
  PRICES,
  HAND,
  RuleError,
  createTable,
  join,
  leave,
  act,
  view,
  lobby,
  tick,
  seen,
  debug,
};
