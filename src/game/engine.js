export const BOARD_SIZE = 4;
export const PIECES = Object.freeze({ guard: 1, queen: 2, king: 3 });
export const INITIAL_INVENTORY = Object.freeze({
  p1: { king: 1, queen: 2, guard: 4 },
  p2: { king: 1, queen: 2, guard: 4 },
});

const clone = value => structuredClone(value);
const other = player => player === 'p1' ? 'p2' : 'p1';
const inBounds = (row, col) => row >= 0 && col >= 0 && row < BOARD_SIZE && col < BOARD_SIZE;
export const topPiece = cell => cell.stack.at(-1) ?? null;

function randomObstacles(count = 2, rng = Math.random) {
  const result = new Set();
  while (result.size < count) result.add(Math.floor(rng() * BOARD_SIZE * BOARD_SIZE));
  return result;
}

export function createGame(rng = Math.random) {
  const obstacles = randomObstacles(2, rng);
  const board = Array.from({ length: BOARD_SIZE * BOARD_SIZE }, (_, i) => ({ obstacle: obstacles.has(i), stack: [] }));
  const openingCells = board.map((cell, index) => cell.obstacle ? null : index).filter(index => index !== null);
  const openingIndex = openingCells[Math.floor(rng() * openingCells.length)];
  board[openingIndex].stack.push({ player: 'p2', type: 'guard' });
  const inventory = clone(INITIAL_INVENTORY);
  inventory.p2.guard--;
  return {
    board,
    inventory,
    currentPlayer: 'p1',
    phase: 'main',
    bonusMaxRank: null,
    winner: null,
    turn: 1,
  };
}

export function canLand(game, index, piece, player = game.currentPlayer) {
  const cell = game.board[index];
  if (!cell || cell.obstacle) return false;
  const top = topPiece(cell);
  return !top || (top.player !== player && PIECES[piece] > PIECES[top.type]);
}

export function legalPlacements(game, piece) {
  if (!piece || game.inventory[game.currentPlayer][piece] <= 0) return [];
  if (game.phase === 'bonus' && PIECES[piece] >= game.bonusMaxRank) return [];
  return game.board.map((_, i) => i).filter(i => canLand(game, i, piece));
}

export function legalMoves(game, from) {
  const top = topPiece(game.board[from] ?? { stack: [] });
  if (!top || top.player !== game.currentPlayer) return [];
  if (game.phase === 'bonus' && PIECES[top.type] >= game.bonusMaxRank) return [];
  const row = Math.floor(from / BOARD_SIZE), col = from % BOARD_SIZE;
  return [[row-1,col],[row+1,col],[row,col-1],[row,col+1]]
    .filter(([r,c]) => inBounds(r,c))
    .map(([r,c]) => r * BOARD_SIZE + c)
    .filter(i => canLand(game, i, top.type));
}

function visibleLines(board, player) {
  const wins = [];
  const directions = [[0,1],[1,0],[1,1],[1,-1]];
  for (let r=0;r<BOARD_SIZE;r++) for (let c=0;c<BOARD_SIZE;c++) {
    for (const [dr,dc] of directions) {
      const cells = [[r,c],[r+dr,c+dc],[r+2*dr,c+2*dc]];
      if (!cells.every(([rr,cc]) => inBounds(rr,cc))) continue;
      const indices = cells.map(([rr,cc]) => rr*BOARD_SIZE+cc);
      if (indices.every(i => topPiece(board[i])?.player === player)) wins.push(indices);
    }
  }
  return wins;
}

export function findWinners(game) {
  return ['p1','p2'].filter(player => visibleLines(game.board, player).length > 0);
}

function finishAction(game, revealedPlayer = null) {
  const winners = findWinners(game);
  if (winners.length) {
    game.winner = winners.length === 1 ? winners[0] : (revealedPlayer && winners.includes(revealedPlayer) ? revealedPlayer : game.currentPlayer);
    return game;
  }
  if (game.phase === 'bonus') {
    game.phase = 'main'; game.bonusMaxRank = null;
    game.currentPlayer = other(game.currentPlayer); game.turn += 1;
  } else {
    game.currentPlayer = other(game.currentPlayer); game.turn += 1;
  }
  return game;
}

export function placePiece(state, piece, index) {
  const game = clone(state);
  if (game.winner || !legalPlacements(game, piece).includes(index)) throw new Error('该棋子不能放在这里');
  game.inventory[game.currentPlayer][piece]--;
  game.board[index].stack.push({ player: game.currentPlayer, type: piece });
  return finishAction(game);
}

export function movePiece(state, from, to) {
  const game = clone(state);
  if (game.winner || !legalMoves(game, from).includes(to)) throw new Error('该棋子不能移动到这里');
  const mover = game.board[from].stack.pop();
  const revealed = topPiece(game.board[from])?.player ?? null;
  game.board[to].stack.push(mover);
  return finishAction(game, revealed);
}

export function recyclePiece(state, index) {
  const game = clone(state);
  if (game.winner || game.phase !== 'main') throw new Error('现在不能回收');
  const piece = topPiece(game.board[index] ?? { stack: [] });
  if (!piece || piece.player !== game.currentPlayer) throw new Error('只能回收己方顶层棋子');
  game.board[index].stack.pop();
  game.inventory[game.currentPlayer][piece.type]++;
  const revealed = topPiece(game.board[index])?.player ?? null;
  const winners = findWinners(game);
  if (winners.length) {
    game.winner = winners.length === 1 ? winners[0] : (revealed && winners.includes(revealed) ? revealed : game.currentPlayer);
  } else if (PIECES[piece.type] > PIECES.guard) {
    game.phase = 'bonus'; game.bonusMaxRank = PIECES[piece.type];
  } else {
    game.currentPlayer = other(game.currentPlayer); game.turn += 1;
  }
  return game;
}

export function skipBonus(state) {
  const game = clone(state);
  if (game.phase !== 'bonus') throw new Error('当前没有追加行动');
  game.phase = 'main'; game.bonusMaxRank = null;
  game.currentPlayer = other(game.currentPlayer); game.turn += 1;
  return game;
}
