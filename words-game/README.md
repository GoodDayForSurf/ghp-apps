# Slovar

Slovar (Словарь) is a letter game for one shared table in the browser. In every round the players take turns laying cards on the table, adding words to it across or down, crossword-style. Every letter has a price, like a Scrabble tile, and the player with the most points wins. There is no word list: the other players accept a string as a word or send it back.

The app is a single Node.js process. The table lives in memory. There is no database and no package install.

## Run

```bash
node server.js
```

Or `npm start`. The server listens on `0.0.0.0` and port `80` unless `PORT` is set. Open `http://localhost`, type a name, pick Russian or Spanish, and press Join. A second person opens the same address and joins the same table.

On Windows, `start-server.cmd` (a launcher for `start-server.ps1`) asks for administrator rights, opens the port in Windows Firewall for the local subnet, and starts the server. Every new client address is printed to the console once.

`npm test` runs `node test.js` against the rules engine.

Restarting the process wipes the current game. The page, stylesheet, and client script are read from disk on every request, so a browser refresh picks up client changes without a restart.

## Table

Two to four players sit. Anyone who joins while a game is in progress, or while four seats are taken, waits for the next game.

The first player to join is the admin, marked with a star (★) in the players line. There are no timers. Once two players sit, the admin sees **Deal** (Раздать), and the letters are dealt only when the admin presses it, also with four at the table. The others see who they are waiting for.

Each player is dealt six random letters. There is no deck and no trump. The player to the dealer's left starts the first round. The dealer moves clockwise at the start of each new game.

The game has no built-in end. Any seated player may press **Finish** (Закончить); the browser asks for confirmation first. The player with the most points wins, and equal top scores are a draw. A word that is still waiting to be accepted goes back to its owner and scores nothing. The game also ends when fewer than two players are left at the table.

**New game** (Новая игра) in the header is the admin's only, once letters are dealt; so is **One more game** (Ещё партию) after a game ends. It throws away the current game and its scores, seats whoever was waiting, and deals again at once. During a game the browser asks for confirmation first.

The admin can also throw any other player out: for the admin, the other names in the players line are buttons, and a click asks for confirmation. A thrown-out player leaves as with **Leave** (Выйти), and their session ends, so their page goes back to the join screen. If the admin leaves, the next player at the table becomes the admin.

Nobody's turn is taken over: a player who closed the page or lost the connection keeps their turn, and the others wait for them or press **Finish**. The server only marks a player who has not polled for 12 seconds as disconnected. A player who presses **Leave** (Выйти) during a game is out: their turns are skipped at once, nobody waits for their answer or their **New round**, and the game ends when fewer than two players are left.

## Letters and points

Every letter has a price, the same as its Scrabble tile: the rarer the letter, the higher the price. The price is printed in the corner of the card.

| Points | Russian | Spanish |
| --- | --- | --- |
| 1 | А, В, Е, И, Н, О, Р, С, Т | A, E, O, I, S, N, L, R, U, T |
| 2 | Д, К, Л, М, П, У | D, G |
| 3 | Б, Г, Ё, Ь, Я | C, B, M, P |
| 4 | Й, Ы | H, F, V, Y |
| 5 | Ж, З, Х, Ц, Ч | Q |
| 8 | Ш, Э, Ю | J, Ñ, X |
| 10 | Ф, Щ, Ъ | Z, K, W |

Spanish Scrabble has no K or W tiles; here they get the top price. Ё is not Е, and Ñ is not N. Accented vowels and Ü are not cards. CH, LL, and RR are two cards each.

Letters are dealt at random, one at a time. The cheaper a letter, the more likely it is: its weight is 1 divided by its price, so a 1-point letter comes ten times as often as a 10-point one.

A player's score is the sum of the prices of the cards that player used. Cards count at the moment the other players accept the word. A word that is rejected or taken back scores nothing, because the cards return to the hand. Points add up through the whole game. The header line **Играют:** lists every player with their points, in the order they move this round, starting with the player who began it; the player whose move it is is in bold. The number of cards in a hand is not shown.

## A round

Players move one after another, once each.

Every move is laid card by card straight onto the table, the first move of a round too. On an empty table the cards only have to touch each other; they may already make several words, across and down. When the player is done, they press **End turn** (Закончить ход). The other players press **Accept words** (Принять слова) or **Reject** (Не принять). Reject, or the player's own **Take back** (Забрать карты), returns the cards to the hand, and the same player moves again. Once the words are accepted, the turn passes to the next player.

The table is a grid, like a crossword. Players put their cards into empty cells next to the cards already there, so a new word may start from any card on the table, across or down, whoever laid it. Within one move a player may also build on their own new cards: for example a word down from a letter of the first word, then a word across from a letter of that new word. To fit a card in between, a move may push cards of the table aside; the other players see the table as it would be after the move. Every new card must touch the table, directly or through other new cards of the same move, and at least one card must be added. A move may make several words at once, including words formed where a new card happens to stand next to old ones; the other players see all of them and accept or reject the move as a whole.

Instead of moving, a player may press **Skip turn** (Пропустить ход) and then choose: **Skip** (Пропустить), or **Swap a letter** (Заменить букву) and tap one card in the hand. That card is replaced by a random letter, never the same letter again; the rest of the hand stays. A whole hand cannot be swapped. Cards already laid on the table in this move go back to the hand. If the first player skips, the table is still empty and the next player lays the first words.

When every player has moved or skipped, the round ends. The next round starts at once when there is nothing to look at: everyone skipped, or only one player laid words this round and that was the last turn, so the others have just accepted them. A move that was rejected or taken back does not count as laid. Otherwise the next one does not start by itself. A popup shows the scores and a **New round** (Новый раунд) button, and the table stays in view under it. Every player has to press the button; the popup shows who is ready. A player who has left is not waited for. Then all letters are cleared from the table, every hand is topped up to six with random letters, and a new round begins. It is started by the next player in order after the one who started the previous round.

## How to lay cards

There is no separate place to build a word: you put cards straight onto the table. On an empty table the first card from your hand lies in the middle, already in focus with its right edge lit, so the next cards make a word across.

When you build, the cards on the table stay where they lie. A click on any card of the table, your own new ones included, puts it in focus and lights its top edge with a blue bar. Each further click on the same card moves the light to the next edge clockwise: top, right, bottom, left, and back to top. A click on a card in your hand puts it against the lit edge. Further cards continue the same way: down and right the word grows away from the focused card; up and left your cards move outwards, so the word still reads in the order you tapped. If the cell by the lit edge is taken, the new card goes there anyway: the card that stood there moves one step on, so you can slide a letter into the middle of a word. Only cards beyond the focused card move: the card in the way, the cards further along that line, and words that hang off them. The focused card and everything on its side stay put, and a word that lies alongside the moving cards but is fixed to that side stays too. A click on one of your own new cards also opens a menu. **Up**, **Down**, **Right**, **Left** (Вверх, Вниз, Вправо, Влево) swap it with the card next to it on that side, but only with another of your own new cards: other players' cards never change places this way, and a direction without your own card next to it is greyed out. **Remove** (Убрать) returns the card to your hand. A card can be removed if it has a single neighbour on any side, or neighbours only on opposite sides: left and right, or above and below. A card that touches cards on two neighbouring sides, say above and to the right, stays. When the removed card had cards on both sides, the two parts close up: the left part stays and the right part moves to it; in a column the upper part stays and the lower part moves up. **Reset** (Сбросить) returns all of them. When at least one of your cards is on the table, press **End turn** (Закончить ход).

## Implementation

```
server.js          Node http server, one in-memory table
game.js            Rules: deal, rounds, scoring, disconnects
public/index.html  Page shell
public/client.js   Table UI, polls every 800ms
public/style.css   Felt table and letter cards
test.js            Rules tests, no browser
start-server.ps1   Windows launcher: firewall rule, then the server
```

`server.js` uses only the built-in `http`, `fs`, `os`, and `path` modules. It keeps one `createTable()` object and ticks it once a second; the tick only marks who is connected and never makes a move. Static files are sent with `Cache-Control: no-store`.

The client stores its session token in `localStorage` under `slovoboy-token` and sends it as `X-Token`. A `401` clears the token and returns to Join.

| Method | Path | Body |
| --- | --- | --- |
| GET | `/api/lobby` | Who is seated, language, phase |
| POST | `/api/join` | `{ name, language }` → `{ token, state }` |
| GET | `/api/state` | Private view for the token |
| POST | `/api/action` | `{ type, ... }` |
| POST | `/api/leave` | Drop this seat |

Action types are `start`, `again`, `restart`, `finish`, `propose`, `skip`, `next-round`, `kick` (with `playerId`; admin only), `accept`, `reject`, and `retract`. `propose` puts cards on the grid, on an empty table too, and sends `cells`, each `{ cardId, x, y }`, and `moved`, the new places of table cards it pushed aside, in the same shape; `y` grows downwards, and the first move of a round lies on `y = 0`, starting at `x = 0`, one empty cell between words. `skip` takes an optional `swap`, the id of the card to swap.

The cards the player is still laying stay in the browser until **End turn**. The server does not see a letter until that commit. Polls do not clear them.

In `game.js` a round moves between four stages. `attack` and `defend` wait for the player whose turn it is: `attack` on an empty table, `defend` once words lie there. `confirm-attack` and `confirm` wait for the other players to accept or reject what was just laid. The table is `game.bout`: `cells` are the accepted cards with their grid positions, and `pending` is the move that is not accepted yet, with its cells and the words it makes. `game.moved` lists who has already moved in the round.
