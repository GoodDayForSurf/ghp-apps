'use strict';

const assert = require('assert');
const g = require('./game');

// Every letter of both alphabets has a price.
['ru', 'es'].forEach((language) => {
  g.ALPH[language].forEach((letter) => {
    assert.ok(g.PRICES[language][letter] > 0, `нет цены у ${letter}`);
  });
});
assert.strictEqual(g.PRICES.ru['О'], 1);
assert.strictEqual(g.PRICES.ru['Ъ'], 10);
assert.strictEqual(g.PRICES.es['Ñ'], 8);

// Seats: the first player deals, so the second one starts.
function seat(names, language) {
  const table = g.createTable();
  const people = names.map((name, index) => g.join(table, { name, language: index ? undefined : language }));
  g.act(table, people[0].id, { type: 'start' });
  return { table, people };
}

const hand = (table, who) => g.view(table, who.id).you.hand;
const score = (table, who) => g.view(table, who.id).you.score;
const pick = (table, who, letter) => hand(table, who).find((card) => card.letter === letter).id;
// The round is over: every player presses "New round".
const nextRound = (table, people) => {
  assert.strictEqual(table.stage, 'round-over');
  people.forEach((p) => g.act(table, p.id, { type: 'next-round' }));
};
const word = (table, who, letters) => {
  const pool = hand(table, who).slice();
  return letters.split('').map((letter) => {
    const at = pool.findIndex((card) => card.letter === letter);
    assert.ok(at >= 0, `нет буквы ${letter}`);
    return pool.splice(at, 1)[0].id;
  });
};

{
  // The deal: six letters each, nothing hidden leaks, no deck and no trump.
  const { table, people: [a, b] } = seat(['Анна', 'Борис'], 'ru');
  const viewA = g.view(table, a.id);
  const viewB = g.view(table, b.id);
  assert.strictEqual(viewA.you.hand.length, 6);
  assert.strictEqual(viewB.you.hand.length, 6);
  viewA.you.hand.forEach((card) => assert.ok(g.ALPH.ru.includes(card.letter)));
  assert.strictEqual(viewA.stock, undefined);
  assert.strictEqual(viewA.trumpLetter, undefined);
  assert.strictEqual(viewA.players[0].handCount, undefined);
  // Quoted, so a short id like "co" does not match inside "connected".
  assert.ok(!JSON.stringify(viewA.players).includes(`"${viewB.you.hand[0].id}"`));
  // The player after the dealer starts.
  assert.strictEqual(table.turnId, b.id);
  assert.strictEqual(table.stage, 'attack');
  assert.strictEqual(viewB.you.attacker, true);
  assert.strictEqual(viewA.you.attacker, false);
}

{
  // Cheap letters are dealt more often than expensive ones.
  const count = {};
  for (let i = 0; i < 300; i += 1) {
    const { table, people: [a, b] } = seat(['Анна', 'Борис'], 'ru');
    hand(table, a).concat(hand(table, b)).forEach((card) => {
      count[card.letter] = (count[card.letter] || 0) + 1;
    });
  }
  const mean = (letters) => letters.split('').reduce((sum, letter) => sum + (count[letter] || 0), 0) / letters.length;
  assert.ok(mean('АВЕИНОРСТ') > 3 * mean('ФЩЪ'), 'дешёвые буквы должны выпадать чаще');
  assert.ok(mean('ДКЛМПУ') > mean('ЖЗХЦЧ'));
}

{
  // A round of three on a grid: lay, build down, build across from any card.
  const { table, people: [a, b, c] } = seat(['Анна', 'Борис', 'Вера'], 'ru');
  g.debug.setHand(table, a.id, ['А', 'Й', 'С', 'П', 'У', 'Х']);
  g.debug.setHand(table, b.id, ['К', 'О', 'Т', 'Ф', 'М', 'Д']);
  g.debug.setHand(table, c.id, ['Р', 'Е', 'Н', 'И', 'Л', 'В']);
  g.debug.forceTurn(table, b.id);
  const at = (card, x, y) => ({ cardId: card, x, y });

  assert.throws(() => g.act(table, a.id, { type: 'attack', cardId: pick(table, a, 'А') }), /не ваш ход/);
  assert.throws(() => g.act(table, b.id, { type: 'propose', cells: [] }), /хотя бы одну свою/);

  // Борис lays КОТ; a rejected word scores nothing and comes back.
  g.act(table, b.id, { type: 'attack', rows: [word(table, b, 'КОТ')] });
  assert.strictEqual(table.stage, 'confirm-attack');
  assert.strictEqual(g.view(table, a.id).table.pending.text, 'КОТ');
  assert.throws(() => g.act(table, b.id, { type: 'accept' }), /соперник/);
  g.act(table, c.id, { type: 'reject' });
  assert.strictEqual(table.stage, 'attack');
  assert.strictEqual(table.turnId, b.id);
  assert.strictEqual(hand(table, b).length, 6);
  assert.strictEqual(score(table, b), 0);
  assert.strictEqual(g.view(table, a.id).table.cells.length, 0);

  // Taken back by the player, then laid again and accepted: К2 + О1 + Т1.
  g.act(table, b.id, { type: 'attack', rows: [word(table, b, 'КОТ')] });
  g.act(table, b.id, { type: 'retract' });
  assert.strictEqual(hand(table, b).length, 6);
  g.act(table, b.id, { type: 'attack', rows: [word(table, b, 'КОТ')] });
  g.act(table, a.id, { type: 'accept' });
  assert.strictEqual(score(table, b), 4);
  assert.strictEqual(hand(table, b).length, 3);
  // К О Т lie at x 0, 1, 2 on the line y 0.
  assert.deepStrictEqual(g.view(table, a.id).table.cells.map((cell) => [cell.letter, cell.x, cell.y]),
    [['К', 0, 0], ['О', 1, 0], ['Т', 2, 0]]);

  // Now Вера builds. Nothing, a taken place, a loose card: not a move.
  assert.strictEqual(table.turnId, c.id);
  assert.strictEqual(table.stage, 'defend');
  assert.strictEqual(g.view(table, c.id).you.defender, true);
  assert.throws(() => g.act(table, c.id, { type: 'propose', cells: [] }), /хотя бы одну свою/);
  assert.throws(() => g.act(table, c.id, { type: 'propose', cells: [at(pick(table, c, 'Р'), 1, 0)] }), /занято/);
  assert.throws(() => g.act(table, c.id, { type: 'propose', cells: [at(pick(table, c, 'Р'), 5, 5)] }), /примыкать/);
  assert.throws(() => g.act(table, c.id, { type: 'propose', cells: [at(pick(table, a, 'А'), 1, 1)] }), /нет в руке/);
  assert.throws(() => g.act(table, c.id, { type: 'propose', cells: [at(pick(table, c, 'Р'), 1.5, 1)] }), /Неверное место/);

  // РОВ down through О: Р above it, В below. Р1 + В1.
  g.act(table, c.id, {
    type: 'propose',
    cells: [at(pick(table, c, 'Р'), 1, -1), at(pick(table, c, 'В'), 1, 1)],
  });
  assert.strictEqual(table.stage, 'confirm');
  assert.strictEqual(g.view(table, a.id).table.pending.text, 'РОВ');
  assert.strictEqual(g.view(table, a.id).table.cells.filter((cell) => cell.fresh).length, 2);
  g.act(table, b.id, { type: 'accept' });
  assert.strictEqual(score(table, c), 2);

  // Анна builds across, starting from В that Вера put there: ВУ. The У also
  // stands under Т, so ТУ is a word of this move too.
  assert.strictEqual(table.turnId, a.id);
  g.act(table, a.id, { type: 'propose', cells: [at(pick(table, a, 'У'), 2, 1)] });
  assert.strictEqual(g.view(table, b.id).table.pending.text, 'ВУ · ТУ');

  // She takes it back and goes on down from В instead. Х touches only her
  // own new А, not the table: that is fine, the move as a whole touches it.
  g.act(table, a.id, { type: 'retract' });
  assert.strictEqual(hand(table, a).length, 6);
  g.act(table, a.id, {
    type: 'propose',
    cells: [at(pick(table, a, 'А'), 1, 2), at(pick(table, a, 'Х'), 1, 3)],
  });
  assert.strictEqual(g.view(table, b.id).table.pending.text, 'РОВАХ');
  g.debug.setDeck(table, ['Я', 'Я', 'Я', 'Я', 'Я', 'Я']);
  g.act(table, c.id, { type: 'accept' });
  assert.strictEqual(score(table, a), 1 + 5);

  // Everyone has moved: the round waits, the table stays, nobody moves.
  assert.strictEqual(table.stage, 'round-over');
  assert.strictEqual(g.view(table, a.id).table.cells.length, 7);
  assert.strictEqual(hand(table, a).length, 4);
  assert.deepStrictEqual([a, b, c].map((p) => g.view(table, p.id).actions.nextRound), [true, true, true]);
  [a, b, c].forEach((p) => assert.strictEqual(g.view(table, p.id).actions.propose, false));
  assert.throws(() => g.act(table, a.id, { type: 'skip' }), /только свой ход/);
  g.act(table, a.id, { type: 'next-round' });
  g.act(table, a.id, { type: 'next-round' });
  assert.strictEqual(table.stage, 'round-over');
  assert.strictEqual(g.view(table, a.id).actions.nextRound, false);
  assert.deepStrictEqual(g.view(table, b.id).players.map((p) => p.ready), [true, false, false]);
  g.act(table, b.id, { type: 'next-round' });
  assert.strictEqual(table.stage, 'round-over');
  g.act(table, c.id, { type: 'next-round' });

  // All ready: table cleared, hands back to six, and the turn goes on round
  // the table: Анна moved last, so Борис starts.
  assert.strictEqual(g.view(table, a.id).table.cells.length, 0);
  [a, b, c].forEach((p) => assert.strictEqual(hand(table, p).length, 6));
  assert.strictEqual(table.turnId, b.id);
  assert.strictEqual(table.stage, 'attack');
  assert.deepStrictEqual(g.view(table, a.id).players.map((p) => p.moved), [false, false, false]);
  // Points stay for the whole game.
  assert.deepStrictEqual([a, b, c].map((p) => score(table, p)), [6, 4, 2]);
}

{
  // One move: a word down through a letter of the first word, then a word
  // across from the mover's own new letter.
  const { table, people: [a, b] } = seat(['Анна', 'Борис'], 'ru');
  g.debug.setHand(table, a.id, ['С', 'Т', 'О', 'Л', 'А', 'Е']);
  g.debug.setHand(table, b.id, ['Д', 'О', 'М', 'Е', 'Р', 'Н']);
  g.debug.forceTurn(table, b.id);
  g.act(table, b.id, { type: 'attack', rows: [word(table, b, 'ДОМ')] });
  g.act(table, a.id, { type: 'accept' });
  // СТОЛ down through О (x 1), then ЛА across from her Л. А stands under М,
  // so МА is a word of this move as well.
  g.act(table, a.id, {
    type: 'propose',
    cells: [
      { cardId: pick(table, a, 'С'), x: 1, y: -2 },
      { cardId: pick(table, a, 'Т'), x: 1, y: -1 },
      { cardId: pick(table, a, 'Л'), x: 1, y: 1 },
      { cardId: pick(table, a, 'А'), x: 2, y: 1 },
    ],
  });
  assert.strictEqual(g.view(table, b.id).table.pending.text, 'СТОЛ · ЛА · МА');
  g.act(table, b.id, { type: 'accept' });
  assert.strictEqual(score(table, a), 1 + 1 + 2 + 1);
}

{
  // A card put between two cards of the table pushes the far one aside,
  // together with the word that hangs on it.
  const { table, people: [a, b, c] } = seat(['Анна', 'Борис', 'Вера'], 'ru');
  g.debug.setHand(table, a.id, ['А', 'Р', 'Ы', 'С', 'Е', 'Л']);
  g.debug.setHand(table, b.id, ['К', 'О', 'Т', 'Д', 'М', 'Н']);
  g.debug.setHand(table, c.id, ['У', 'Р', 'Е', 'Н', 'И', 'Л']);
  g.debug.forceTurn(table, b.id);
  g.act(table, b.id, { type: 'attack', rows: [word(table, b, 'КОТ')] });
  g.act(table, a.id, { type: 'accept' });
  // Вера hangs ТУ down from Т.
  g.act(table, c.id, { type: 'propose', cells: [{ cardId: pick(table, c, 'У'), x: 2, y: 1 }] });
  g.act(table, a.id, { type: 'accept' });

  const ids = Object.fromEntries(g.view(table, a.id).table.cells.map((cell) => [cell.letter, cell.id]));
  const place = (id, x, y) => ({ cardId: id, x, y });
  // А between О and Т: without pushing Т the place is taken.
  assert.throws(() => g.act(table, a.id, { type: 'propose', cells: [place(pick(table, a, 'А'), 2, 0)] }), /занято/);
  assert.throws(() => g.act(table, a.id, {
    type: 'propose',
    cells: [place(pick(table, a, 'А'), 2, 0)],
    moved: [place(ids['Т'], 1, 0)],
  }), /друг на друга/);
  assert.throws(() => g.act(table, a.id, {
    type: 'propose',
    cells: [place(pick(table, a, 'А'), 2, 0)],
    moved: [place(pick(table, a, 'Р'), 3, 0)],
  }), /нет на столе/);
  // Т moves one step right, and У under it goes along.
  g.act(table, a.id, {
    type: 'propose',
    cells: [place(pick(table, a, 'А'), 2, 0)],
    moved: [place(ids['Т'], 3, 0), place(ids['У'], 3, 1)],
  });
  const seen = g.view(table, b.id).table;
  assert.strictEqual(seen.pending.text, 'КОАТ · ТУ');
  assert.deepStrictEqual(seen.cells.map((cell) => `${cell.letter}${cell.x},${cell.y}${cell.fresh ? '*' : ''}`),
    ['К0,0', 'О1,0', 'Т3,0', 'У3,1', 'А2,0*']);
  // Rejected: the table goes back as it was.
  g.act(table, b.id, { type: 'reject' });
  assert.deepStrictEqual(g.view(table, b.id).table.cells.map((cell) => `${cell.letter}${cell.x},${cell.y}`),
    ['К0,0', 'О1,0', 'Т2,0', 'У2,1']);
  assert.strictEqual(hand(table, a).length, 6);
  // Sent again and accepted: the cards stay where they were pushed.
  g.act(table, a.id, {
    type: 'propose',
    cells: [place(pick(table, a, 'А'), 2, 0)],
    moved: [place(ids['Т'], 3, 0), place(ids['У'], 3, 1)],
  });
  g.act(table, b.id, { type: 'accept' });
  const cells = table.bout.cells;
  assert.deepStrictEqual(cells.map((cell) => `${cell.card.letter}${cell.x},${cell.y}`),
    ['К0,0', 'О1,0', 'Т3,0', 'У3,1', 'А2,0']);
  assert.strictEqual(score(table, a), 1);
}

{
  // The first move of a round is laid card by card on the empty table, like
  // any other move: one word across and one down from its letter, at once.
  const { table, people: [a, b] } = seat(['Анна', 'Борис'], 'ru');
  g.debug.setHand(table, a.id, ['А', 'Й', 'С', 'П', 'У', 'Х']);
  g.debug.setHand(table, b.id, ['К', 'О', 'Т', 'Ф', 'М', 'Д']);
  g.debug.forceTurn(table, b.id);
  assert.strictEqual(table.stage, 'attack');
  assert.strictEqual(g.view(table, b.id).actions.propose, true);
  const at = (letter, x, y) => ({ cardId: pick(table, b, letter), x, y });
  // Cards that do not touch each other are not a move.
  assert.throws(() => g.act(table, b.id, { type: 'propose', cells: [at('К', 0, 0), at('О', 2, 0)] }), /друг к другу/);
  g.act(table, b.id, {
    type: 'propose',
    cells: [at('К', 0, 0), at('О', 1, 0), at('Т', 2, 0), at('М', 1, 1)],
  });
  assert.strictEqual(table.stage, 'confirm');
  assert.strictEqual(g.view(table, a.id).table.pending.text, 'КОТ · ОМ');
  assert.strictEqual(g.view(table, a.id).actions.accept, true);
  // Taken back: the table is empty again and it is still his move.
  g.act(table, b.id, { type: 'retract' });
  assert.strictEqual(table.stage, 'attack');
  assert.strictEqual(hand(table, b).length, 6);
  g.act(table, b.id, { type: 'propose', cells: [at('К', 0, 0), at('О', 1, 0), at('Т', 2, 0)] });
  g.act(table, a.id, { type: 'accept' });
  assert.strictEqual(score(table, b), 4);
  // Now it is Анна's move, on the same table.
  assert.strictEqual(table.turnId, a.id);
  assert.strictEqual(table.stage, 'defend');
  g.act(table, a.id, { type: 'propose', cells: [{ cardId: pick(table, a, 'А'), x: 1, y: 1 }] });
  assert.strictEqual(g.view(table, b.id).table.pending.text, 'ОА');
}

{
  // Skipping, plain or with one letter of your choice swapped.
  const { table, people: [a, b, c] } = seat(['Анна', 'Борис', 'Вера'], 'ru');
  g.debug.setHand(table, b.id, ['Ъ', 'Ъ', 'Ъ', 'Ъ', 'Ъ', 'Ъ']);
  g.debug.forceTurn(table, b.id);
  assert.strictEqual(g.view(table, b.id).actions.skip, true);
  assert.strictEqual(g.view(table, a.id).actions.skip, false);
  assert.throws(() => g.act(table, a.id, { type: 'skip' }), /не ваш ход/);

  // Борис skips and swaps one Ъ: only that card changes, into another letter.
  const old = hand(table, b).map((card) => card.id);
  assert.throws(() => g.act(table, b.id, { type: 'skip', swap: 'nope' }), /нет в руке/);
  assert.strictEqual(table.turnId, b.id);
  g.act(table, b.id, { type: 'skip', swap: old[2] });
  const after = hand(table, b);
  assert.strictEqual(after.length, 6);
  assert.strictEqual(after.filter((card) => card.letter === 'Ъ').length, 5);
  assert.strictEqual(after.filter((card) => !old.includes(card.id)).length, 1);
  assert.ok(!after.some((card) => card.id === old[2]));
  assert.strictEqual(score(table, b), 0);

  // The table is still empty, so Вера lays; a plain skip keeps the hand.
  assert.strictEqual(table.turnId, c.id);
  assert.strictEqual(table.stage, 'attack');
  const kept = hand(table, c).map((card) => card.id).join();
  g.act(table, c.id, { type: 'skip' });
  assert.strictEqual(hand(table, c).map((card) => card.id).join(), kept);

  // Анна is the last one. Everyone skipped: the next round starts at once,
  // with the player after Анна: Борис.
  assert.strictEqual(table.turnId, a.id);
  g.act(table, a.id, { type: 'skip' });
  assert.notStrictEqual(table.stage, 'round-over');
  assert.strictEqual(table.turnId, b.id);
  assert.strictEqual(table.stage, 'attack');

  // A word that already lies there waiting cannot be skipped.
  g.act(table, b.id, { type: 'attack', cardId: hand(table, b)[0].id });
  assert.throws(() => g.act(table, b.id, { type: 'skip' }), /только свой ход/);
}

{
  // A swapped letter is never the same letter again.
  const { table, people } = seat(['Анна', 'Борис'], 'ru');
  for (let i = 0; i < 200; i += 1) {
    if (table.stage === 'round-over') nextRound(table, people);
    const mover = people.find((p) => p.id === table.turnId);
    g.debug.setHand(table, mover.id, ['О', 'О', 'О', 'О', 'О', 'О']);
    g.act(table, mover.id, { type: 'skip', swap: hand(table, mover)[0].id });
    const letters = hand(table, mover).map((card) => card.letter);
    assert.strictEqual(letters.filter((letter) => letter === 'О').length, 5);
  }
}

{
  // Two players: lay, build; the new round goes on round the table, so the
  // one who built last does not move again at once.
  const { table, people: [a, b] } = seat(['Анна', 'Борис'], 'ru');
  g.debug.setHand(table, a.id, ['А', 'Й', 'С', 'П', 'У', 'Х']);
  g.debug.setHand(table, b.id, ['О', 'Н', 'Ф', 'Т', 'М', 'Д']);
  g.debug.forceTurn(table, b.id);
  // Words of any length, one letter next to a longer one included.
  g.act(table, b.id, { type: 'attack', rows: [word(table, b, 'ОН'), [pick(table, b, 'Ф')]] });
  g.act(table, a.id, { type: 'accept' });
  assert.strictEqual(score(table, b), 12);
  // О Н at x 0, 1; Ф at x 3 after one empty cell. НА down from Н.
  assert.deepStrictEqual(g.view(table, a.id).table.cells.map((cell) => cell.x), [0, 1, 3]);
  g.act(table, a.id, { type: 'propose', cells: [{ cardId: pick(table, a, 'А'), x: 1, y: 1 }] });
  assert.strictEqual(g.view(table, b.id).table.pending.text, 'НА');
  g.act(table, b.id, { type: 'accept' });
  assert.strictEqual(score(table, a), 1);
  nextRound(table, [a, b]);
  assert.strictEqual(table.turnId, b.id);
  assert.strictEqual(table.stage, 'attack');
  assert.strictEqual(hand(table, a).length, 6);
  assert.strictEqual(hand(table, b).length, 6);
  assert.strictEqual(table.discard, 4);

  // Finish: the player with the most points wins.
  assert.strictEqual(g.view(table, a.id).actions.finish, true);
  g.act(table, a.id, { type: 'finish' });
  assert.strictEqual(table.phase, 'finished');
  assert.strictEqual(table.result, 'win');
  assert.strictEqual(g.view(table, a.id).winnerId, b.id);
  assert.strictEqual(g.view(table, a.id).actions.finish, false);
  assert.throws(() => g.act(table, a.id, { type: 'finish' }), /не идёт/);
}

{
  // Equal points: a draw. A word still waiting goes back to the hand.
  const { table, people: [a, b] } = seat(['Анна', 'Борис'], 'ru');
  g.act(table, b.id, { type: 'attack', cardId: hand(table, b)[0].id });
  g.act(table, a.id, { type: 'finish' });
  assert.strictEqual(table.result, 'draw');
  assert.strictEqual(g.view(table, a.id).winnerId, null);
  assert.strictEqual(hand(table, b).length, 6);
}

{
  // No timers: nothing is dealt until a player presses "Deal", however long
  // they wait, and even with four at the table. Spanish letters.
  const table = g.createTable();
  const a = g.join(table, { name: 'Анна', language: 'es' });
  ['Борис', 'Вера', 'Глеб'].forEach((name) => g.join(table, { name }));
  g.tick(table, Date.now() + 3600000);
  assert.strictEqual(table.phase, 'waiting');
  assert.strictEqual(g.view(table, a.id).actions.start, true);
  assert.throws(() => g.act(table, a.id, { type: 'hold' }), /Неизвестное действие/);
  g.act(table, a.id, { type: 'start' });
  assert.strictEqual(table.phase, 'playing');
  hand(table, a).forEach((card) => assert.ok(g.ALPH.es.includes(card.letter)));
}

{
  // New game: queued players sit down, scores and the table start over.
  const table = g.createTable();
  const a = g.join(table, { name: 'Анна', language: 'ru' });
  const b = g.join(table, { name: 'Борис' });
  assert.strictEqual(g.view(table, a.id).actions.restart, false);
  assert.throws(() => g.act(table, a.id, { type: 'restart' }), /не началась/);
  g.act(table, a.id, { type: 'start' });
  const c = g.join(table, { name: 'Вера' });
  assert.strictEqual(c.queued, true);
  assert.strictEqual(g.view(table, c.id).actions.restart, false);
  assert.throws(() => g.act(table, c.id, { type: 'restart' }), /не за столом/);

  g.act(table, b.id, { type: 'attack', cardId: hand(table, b)[0].id });
  g.act(table, a.id, { type: 'accept' });
  assert.ok(score(table, b) > 0);
  const round = g.view(table, a.id).round;
  // Only the admin, the first to join, starts a new game.
  assert.strictEqual(g.view(table, b.id).actions.restart, false);
  assert.throws(() => g.act(table, b.id, { type: 'restart' }), /только админ/);
  g.act(table, a.id, { type: 'restart' });

  assert.strictEqual(table.phase, 'playing');
  assert.strictEqual(table.stage, 'attack');
  assert.strictEqual(g.view(table, a.id).round, round + 1);
  assert.strictEqual(g.view(table, a.id).table.cells.length, 0);
  [a, b, c].forEach((p) => {
    assert.strictEqual(g.view(table, p.id).you.queued, false);
    assert.strictEqual(hand(table, p).length, 6);
    assert.strictEqual(score(table, p), 0);
  });
}

{
  // A player who leaves: the game goes on without them, or ends with one left.
  const { table, people: [a, b, c] } = seat(['Анна', 'Борис', 'Вера'], 'ru');
  assert.strictEqual(table.turnId, b.id);
  g.leave(table, b.id);
  assert.strictEqual(table.phase, 'playing');
  assert.strictEqual(table.turnId, c.id);
  g.leave(table, c.id);
  assert.strictEqual(table.phase, 'finished');
  assert.strictEqual(g.view(table, a.id).actions.again, true);
}

{
  // While the round waits, a player who left is not waited for; one who
  // stopped answering is waited for, however long.
  const { table, people: [a, b, c] } = seat(['Анна', 'Борис', 'Вера'], 'ru');
  const people = [a, b, c];
  // The mover lays two letters and someone else accepts them.
  const layNow = () => {
    const mover = people.find((p) => p.id === table.turnId);
    const judge = people.find((p) => p.id !== mover.id && !p.gone);
    const h = hand(table, mover);
    g.act(table, mover.id, { type: 'propose', cells: [{ cardId: h[0].id, x: 0, y: 0 }, { cardId: h[1].id, x: 1, y: 0 }] });
    g.act(table, judge.id, { type: 'accept' });
  };
  // One player laid words, the others skipped after: the popup waits.
  layNow();
  g.act(table, table.turnId, { type: 'skip' });
  g.act(table, table.turnId, { type: 'skip' });
  assert.strictEqual(table.stage, 'round-over');
  g.act(table, a.id, { type: 'next-round' });
  g.act(table, b.id, { type: 'next-round' });
  g.leave(table, c.id);
  c.gone = true;
  assert.strictEqual(table.stage, 'attack');

  layNow();
  g.act(table, table.turnId, { type: 'skip' });
  assert.strictEqual(table.stage, 'round-over');
  g.act(table, a.id, { type: 'next-round' });
  const later = Date.now() + 3600000;
  g.seen(table, a.id, later);
  g.tick(table, later);
  assert.strictEqual(table.stage, 'round-over');
  g.act(table, b.id, { type: 'next-round' });
  assert.strictEqual(table.stage, 'attack');
}

{
  // Cards on the table: the popup always waits, so the admin can continue.
  // Only one player laid words and that was the last turn of the round.
  const { table, people: [a, b, c] } = seat(['Анна', 'Борис', 'Вера'], 'ru');
  const lay = (who) => {
    const h = hand(table, who);
    g.act(table, who.id, { type: 'propose', cells: [{ cardId: h[0].id, x: 0, y: 0 }, { cardId: h[1].id, x: 1, y: 0 }] });
  };
  assert.strictEqual(table.turnId, b.id);
  g.act(table, b.id, { type: 'skip' });
  g.act(table, c.id, { type: 'skip' });
  lay(a);
  g.act(table, b.id, { type: 'accept' });
  assert.strictEqual(table.stage, 'round-over');
  assert.ok(score(table, a) > 0);
  nextRound(table, [a, b, c]);
  assert.strictEqual(table.stage, 'attack');
  // Анна moved last, so Борис starts: turns go strictly round the table.
  assert.strictEqual(table.turnId, b.id);
  assert.strictEqual(g.view(table, a.id).table.cells.length, 0);
  [a, b, c].forEach((p) => assert.strictEqual(hand(table, p).length, 6));

  // One player laid words, but the last turn was a skip: the popup waits.
  lay(b);
  g.act(table, c.id, { type: 'accept' });
  g.act(table, c.id, { type: 'skip' });
  g.act(table, a.id, { type: 'skip' });
  assert.strictEqual(table.stage, 'round-over');
  nextRound(table, [a, b, c]);

  // Two players laid words, the last one included: the popup waits too.
  assert.strictEqual(table.turnId, b.id);
  lay(b);
  g.act(table, c.id, { type: 'accept' });
  g.act(table, c.id, { type: 'skip' });
  const h = hand(table, a);
  g.act(table, a.id, { type: 'propose', cells: [{ cardId: h[0].id, x: 0, y: 1 }] });
  g.act(table, b.id, { type: 'accept' });
  assert.strictEqual(table.stage, 'round-over');

  // A move that was rejected and then skipped does not count as laid: with
  // everyone skipping, the next round starts at once.
  nextRound(table, [a, b, c]);
  assert.strictEqual(table.turnId, b.id);
  lay(b);
  g.act(table, a.id, { type: 'reject' });
  g.act(table, b.id, { type: 'skip' });
  g.act(table, c.id, { type: 'skip' });
  g.act(table, a.id, { type: 'skip' });
  assert.strictEqual(table.stage, 'attack');
  assert.strictEqual(table.turnId, b.id);
}

{
  // A player who stopped answering keeps their turn: nobody moves for them.
  const { table, people: [a, b] } = seat(['Анна', 'Борис'], 'ru');
  const later = Date.now() + 3600000;
  assert.strictEqual(table.turnId, b.id);
  g.seen(table, a.id, later);
  g.tick(table, later);
  assert.strictEqual(table.turnId, b.id);
  assert.strictEqual(table.stage, 'attack');
  assert.strictEqual(g.view(table, a.id).players.find((p) => p.id === b.id).connected, false);
}

{
  // The first player to join is the admin: only the admin deals, starts a new
  // game or the next one, and throws players out.
  const table = g.createTable();
  const a = g.join(table, { name: 'Анна', language: 'ru' });
  const b = g.join(table, { name: 'Борис' });
  const c = g.join(table, { name: 'Вера' });
  const view = (who) => g.view(table, who.id);
  assert.strictEqual(view(a).you.admin, true);
  assert.strictEqual(view(b).you.admin, false);
  assert.deepStrictEqual(view(b).players.map((p) => p.admin), [true, false, false]);
  assert.strictEqual(view(a).actions.start, true);
  assert.strictEqual(view(b).actions.start, false);
  assert.strictEqual(view(a).actions.kick, true);
  assert.strictEqual(view(b).actions.kick, false);
  assert.match(view(b).prompt, /Анна раздаст/);
  assert.throws(() => g.act(table, b.id, { type: 'start' }), /только админ/);
  g.act(table, a.id, { type: 'start' });

  // Kicking: only the admin, never themselves, never someone not there.
  assert.throws(() => g.act(table, b.id, { type: 'kick', playerId: c.id }), /только админ/);
  assert.throws(() => g.act(table, a.id, { type: 'kick', playerId: a.id }), /Себя/);
  assert.throws(() => g.act(table, a.id, { type: 'kick', playerId: 'nobody' }), /нет/);
  // Борис is to move; thrown out, his turn passes and his session ends.
  assert.strictEqual(table.turnId, b.id);
  g.act(table, a.id, { type: 'kick', playerId: b.id });
  assert.strictEqual(table.turnId, c.id);
  assert.strictEqual(b.token, null);
  assert.strictEqual(view(a).players.find((p) => p.id === b.id).abandoned, true);
  assert.throws(() => g.act(table, a.id, { type: 'kick', playerId: b.id }), /нет/);

  // When the admin leaves, the next player at the table takes over.
  g.leave(table, a.id);
  assert.strictEqual(table.phase, 'finished');
  assert.strictEqual(view(c).you.admin, true);
  assert.strictEqual(view(c).actions.again, true);
  g.act(table, c.id, { type: 'again' });
  assert.strictEqual(table.phase, 'waiting');
}

{
  // Before the deal a kicked player simply leaves the table.
  const table = g.createTable();
  const a = g.join(table, { name: 'Анна', language: 'ru' });
  const b = g.join(table, { name: 'Борис' });
  g.act(table, a.id, { type: 'kick', playerId: b.id });
  assert.deepStrictEqual(g.view(table, a.id).players.map((p) => p.name), ['Анна']);
  assert.strictEqual(g.view(table, a.id).actions.start, false);
  // Someone who joins later is not the admin.
  const c = g.join(table, { name: 'Вера' });
  assert.strictEqual(g.view(table, c.id).you.admin, false);
  assert.strictEqual(g.view(table, a.id).actions.start, true);
}

{
  // When a round is over, the admin may continue it: the table stays, every
  // hand is topped up, and the next player starts a round on the same table.
  const { table, people: [a, b, c] } = seat(['Анна', 'Борис', 'Вера'], 'ru');
  const view = (who) => g.view(table, who.id);
  const h = hand(table, b);
  g.act(table, b.id, { type: 'propose', cells: [{ cardId: h[0].id, x: 0, y: 0 }, { cardId: h[1].id, x: 1, y: 0 }] });
  g.act(table, a.id, { type: 'accept' });
  g.act(table, c.id, { type: 'skip' });
  g.act(table, a.id, { type: 'skip' });
  assert.strictEqual(table.stage, 'round-over');
  assert.strictEqual(view(a).actions.continueRound, true);
  assert.strictEqual(view(b).actions.continueRound, false);
  assert.throws(() => g.act(table, b.id, { type: 'continue-round' }), /только админ/);
  const before = view(a).table.cells.map((cell) => cell.id).join();
  const score = view(b).you.score;

  g.act(table, a.id, { type: 'continue-round' });
  // No "New round" from the others; the same cards lie where they were.
  assert.strictEqual(table.stage, 'defend');
  assert.strictEqual(view(a).table.cells.map((cell) => cell.id).join(), before);
  [a, b, c].forEach((p) => assert.strictEqual(hand(table, p).length, 6));
  assert.strictEqual(view(b).you.score, score);
  // Анна moved last, so Борис starts this one, building on the same cards.
  assert.strictEqual(table.turnId, b.id);
  assert.deepStrictEqual(view(a).players.map((p) => p.moved), [false, false, false]);
  const v = hand(table, b);
  g.act(table, b.id, { type: 'propose', cells: [{ cardId: v[0].id, x: 0, y: 1 }] });
  g.act(table, c.id, { type: 'accept' });
  assert.strictEqual(view(a).table.cells.length, 3);
  assert.throws(() => g.act(table, a.id, { type: 'continue-round' }), /Раунд ещё идёт/);
  // Everyone skips the rest: the cards are still there, so the popup waits.
  g.act(table, c.id, { type: 'skip' });
  g.act(table, a.id, { type: 'skip' });
  assert.strictEqual(table.stage, 'round-over');
  g.act(table, a.id, { type: 'continue-round' });
  assert.strictEqual(view(a).table.cells.length, 3);
  [a, b, c].forEach((p) => g.act(table, table.turnId, { type: 'skip' }));
  assert.strictEqual(table.stage, 'round-over');
}

{
  // Before the deal the admin sets how many letters each hand gets.
  const table = g.createTable();
  const a = g.join(table, { name: 'Анна', language: 'ru' });
  const b = g.join(table, { name: 'Борис' });
  const view = (who) => g.view(table, who.id);
  assert.strictEqual(view(b).handSize, 6);
  assert.strictEqual(view(a).actions.handSize, true);
  assert.strictEqual(view(b).actions.handSize, false);
  assert.throws(() => g.act(table, b.id, { type: 'hand-size', size: 8 }), /только админ/);
  assert.throws(() => g.act(table, a.id, { type: 'hand-size', size: g.HAND_MAX + 1 }), /от/);
  assert.throws(() => g.act(table, a.id, { type: 'hand-size', size: g.HAND_MIN - 1 }), /от/);
  g.act(table, a.id, { type: 'hand-size', size: 9 });
  assert.strictEqual(view(b).handSize, 9);
  g.act(table, a.id, { type: 'start' });
  [a, b].forEach((p) => assert.strictEqual(hand(table, p).length, 9));
  assert.strictEqual(view(a).actions.handSize, false);
  assert.throws(() => g.act(table, a.id, { type: 'hand-size', size: 4 }), /до раздачи/);
  // Top-ups after a move use it too.
  const h = hand(table, b);
  g.act(table, b.id, { type: 'propose', cells: [{ cardId: h[0].id, x: 0, y: 0 }, { cardId: h[1].id, x: 1, y: 0 }] });
  g.act(table, a.id, { type: 'accept' });
  g.act(table, a.id, { type: 'skip' });
  g.act(table, a.id, { type: 'next-round' });
  g.act(table, b.id, { type: 'next-round' });
  [a, b].forEach((p) => assert.strictEqual(hand(table, p).length, 9));
  // "New game" keeps the choice.
  g.act(table, a.id, { type: 'restart' });
  [a, b].forEach((p) => assert.strictEqual(hand(table, p).length, 9));
}

{
  // Letters come out of a bag with a fixed number of each: a letter that is
  // out never comes out more often than the bag holds it.
  const full = Object.values(g.BAG.ru).reduce((x, y) => x + y, 0);
  for (let round = 0; round < 50; round += 1) {
    const table = g.createTable();
    const people = ['Анна', 'Борис', 'Вера', 'Глеб'].map((name, i) => g.join(table, { name, language: i ? undefined : 'ru' }));
    g.act(table, people[0].id, { type: 'hand-size', size: 12 });
    g.act(table, people[0].id, { type: 'start' });
    const counts = {};
    people.forEach((p) => hand(table, p).forEach((card) => { counts[card.letter] = (counts[card.letter] || 0) + 1; }));
    Object.keys(counts).forEach((letter) => assert.ok(counts[letter] <= g.BAG.ru[letter], letter));
    const left = g.bagLeft(table);
    assert.strictEqual(Object.values(left).reduce((x, y) => x + y, 0), full - 48);
    Object.keys(left).forEach((letter) => assert.strictEqual(left[letter] + (counts[letter] || 0), g.BAG.ru[letter]));
  }

  // The table takes letters out of the bag; clearing it puts them back.
  const { table, people: [a, b] } = seat(['Анна', 'Борис'], 'ru');
  const total = () => Object.values(g.bagLeft(table)).reduce((x, y) => x + y, 0);
  assert.strictEqual(total(), full - 12);
  const h = hand(table, b);
  g.act(table, b.id, { type: 'propose', cells: [{ cardId: h[0].id, x: 0, y: 0 }, { cardId: h[1].id, x: 1, y: 0 }] });
  assert.strictEqual(total(), full - 12);
  g.act(table, a.id, { type: 'accept' });
  g.act(table, a.id, { type: 'skip' });
  assert.strictEqual(table.stage, 'round-over');
  assert.strictEqual(g.view(table, a.id).table.cells.length, 2);
  assert.strictEqual(total(), full - 12);
  nextRound(table, [a, b]);
  assert.strictEqual(g.view(table, a.id).table.cells.length, 0);
  assert.strictEqual(total(), full - 12);

  // A swap puts the old letter back and draws another: the only Ъ in the
  // bag, once swapped away, can come back out again.
  g.debug.setHand(table, table.turnId, ['Ъ', 'А', 'А', 'А', 'А', 'А']);
  const mover = table.turnId;
  g.act(table, mover, { type: 'skip', swap: hand(table, { id: mover })[0].id });
  assert.strictEqual(g.bagLeft(table)['Ъ'] + hand(table, { id: mover }).filter((c) => c.letter === 'Ъ').length, 1);
}

{
  // The bag never runs empty: with most of a set out, another set is poured
  // in, and swaps and top-ups still work.
  const { table, people: [a, b] } = seat(['Анна', 'Борис'], 'ru');
  const sum = () => Object.values(g.bagLeft(table)).reduce((x, y) => x + y, 0);
  const full = Object.values(g.BAG.ru).reduce((x, y) => x + y, 0);
  const rest = [];
  Object.entries(g.bagLeft(table)).forEach(([letter, n]) => { for (let i = 0; i < n; i += 1) rest.push(letter); });
  g.debug.setHand(table, a.id, hand(table, a).map((c) => c.letter).concat(rest));
  assert.ok(sum() >= full / 2);
  // All the О of the first set are out, but more come with the second.
  assert.ok(g.bagLeft(table)['О'] > 0);
  const h = hand(table, b);
  g.act(table, b.id, { type: 'skip', swap: h[0].id });
  assert.strictEqual(hand(table, b).length, 6);
  g.act(table, a.id, { type: 'skip' });
  assert.strictEqual(hand(table, b).length, 6);
}

{
  // Russian has no Ё card: Е stands for both, at Е's price, as common as both.
  assert.ok(!('Ё' in g.BAG.ru));
  assert.strictEqual(g.BAG.ru['Е'], 9);
  const { table, people: [a] } = seat(['Анна', 'Борис'], 'ru');
  assert.ok(!g.view(table, a.id).alphabet.includes('Ё'));
  assert.strictEqual(g.view(table, a.id).prices['Е'], 1);
  assert.ok(!('Ё' in g.view(table, a.id).prices));
}

{
  // Turns go strictly round the table, across rounds too: whatever happens
  // (moves, skips, new rounds, continuing on the same table), nobody gets two
  // turns in a row, except after their own move was rejected or taken back.
  [2, 3, 4].forEach((n) => {
    for (let game = 0; game < 30; game += 1) {
      const { table, people } = seat(['Анна', 'Борис', 'Вера', 'Глеб'].slice(0, n), 'ru');
      const turns = [table.turnId];
      let turnNo = table.turnNo;
      let again = false;
      for (let step = 0; step < 120; step += 1) {
        const r = Math.random();
        const mover = people.find((p) => p.id === table.turnId);
        if (table.stage === 'round-over') {
          if (r < 0.4) g.act(table, people[0].id, { type: 'continue-round' });
          else nextRound(table, people);
        } else if (table.stage === 'confirm' || table.stage === 'confirm-attack') {
          const judge = people.find((p) => p.id !== mover.id);
          if (r < 0.8) g.act(table, judge.id, { type: 'accept' });
          else { g.act(table, judge.id, { type: 'reject' }); again = true; }
        } else if (r < 0.4) {
          g.act(table, mover.id, { type: 'skip' });
        } else {
          const cells = g.view(table, mover.id).table.cells;
          const taken = new Set(cells.map((c) => c.x + ',' + c.y));
          let spot = { x: 0, y: 0 };
          cells.some((c) => [[1, 0], [0, 1], [-1, 0], [0, -1]].some(([dx, dy]) => {
            if (taken.has((c.x + dx) + ',' + (c.y + dy))) return false;
            spot = { x: c.x + dx, y: c.y + dy };
            return true;
          }));
          g.act(table, mover.id, { type: 'propose', cells: [{ cardId: hand(table, mover)[0].id, ...spot }] });
        }
        if (table.turnId && table.turnNo !== turnNo) {
          if (!again) assert.notStrictEqual(table.turnId, turns[turns.length - 1], `${n} players`);
          turns.push(table.turnId);
          turnNo = table.turnNo;
          again = false;
        }
      }
    }
  });
}

console.log('ok');
