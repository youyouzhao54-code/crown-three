import { PIECES, findWinners, legalMoves, legalPlacements, movePiece, placePiece, recyclePiece, skipBonus, topPiece } from './engine.js';

const TYPES = ['king', 'queen', 'guard'];

export function listLegalActions(game) {
  if (game.winner) return [];
  const actions = [];
  for (const piece of TYPES) {
    for (const to of legalPlacements(game, piece)) actions.push({ type: 'place', piece, to });
  }
  game.board.forEach((cell, from) => {
    const top = topPiece(cell);
    if (!top || top.player !== game.currentPlayer) return;
    for (const to of legalMoves(game, from)) actions.push({ type: 'move', from, to });
    if (game.phase === 'main') actions.push({ type: 'recycle', from });
  });
  if (game.phase === 'bonus') actions.push({ type: 'skip' });
  return actions;
}

export function applyAction(game, action) {
  if (action.type === 'place') return placePiece(game, action.piece, action.to);
  if (action.type === 'move') return movePiece(game, action.from, action.to);
  if (action.type === 'recycle') return recyclePiece(game, action.from);
  if (action.type === 'skip') return skipBonus(game);
  throw new Error('未知 AI 行动');
}

function opponentWinCount(state, aiPlayer) {
  if (state.winner || state.currentPlayer === aiPlayer) return 0;
  return listLegalActions(state).reduce((count, action) => {
    try { return count + (applyAction(state, action).winner === state.currentPlayer ? 1 : 0); }
    catch { return count; }
  }, 0);
}

function positionalScore(action) {
  const index = action.to ?? action.from ?? -1;
  if ([5,6,9,10].includes(index)) return 3;
  if ([0,3,12,15].includes(index)) return 1;
  return 2;
}

export function chooseNoviceAction(game, rng = Math.random) {
  const player = game.currentPlayer;
  const actions = listLegalActions(game);
  if (!actions.length) return null;
  const evaluated = actions.map(action => {
    const next = applyAction(game, action);
    const winsNow = next.winner === player;
    const threat = opponentWinCount(next, player);
    const recyclePenalty = action.type === 'recycle' ? 2 : 0;
    const pieceValue = action.piece ? PIECES[action.piece] * .15 : 0;
    return { action, winsNow, score: positionalScore(action) + pieceValue - threat * 20 - recyclePenalty };
  });
  const winners = evaluated.filter(item => item.winsNow);
  if (winners.length) return winners[Math.floor(rng() * winners.length)].action;
  const best = Math.max(...evaluated.map(item => item.score));
  const pool = evaluated.filter(item => item.score >= best - 1.2);
  return pool[Math.floor(rng() * pool.length)].action;
}

function linePotential(game, player) {
  const directions = [[0,1],[1,0],[1,1],[1,-1]];
  let score = 0;
  for (let row=0;row<4;row++) for (let col=0;col<4;col++) for (const [dr,dc] of directions) {
    const cells = [[row,col],[row+dr,col+dc],[row+2*dr,col+2*dc]];
    if (!cells.every(([r,c])=>r>=0&&c>=0&&r<4&&c<4)) continue;
    const tops = cells.map(([r,c])=>topPiece(game.board[r*4+c]));
    if (tops.some(piece=>piece?.player && piece.player!==player)) continue;
    const own = tops.filter(piece=>piece?.player===player).length;
    if (own===2) score += 34;
    else if (own===1) score += 6;
  }
  return score;
}

function evaluate(game, aiPlayer) {
  const enemy = aiPlayer === 'p1' ? 'p2' : 'p1';
  if (game.winner === aiPlayer) return 100000;
  if (game.winner === enemy) return -100000;
  let score = linePotential(game, aiPlayer) - linePotential(game, enemy) * 1.14;
  const pieceWorth = { king: 10, queen: 6, guard: 3 };
  game.board.forEach((cell,index)=>{
    const top=topPiece(cell); if(!top)return;
    const sign=top.player===aiPlayer?1:-1;
    score += sign * pieceWorth[top.type];
    if ([5,6,9,10].includes(index)) score += sign * 3;
    if (cell.stack.length>1) score += sign * (cell.stack.length-1) * 2;
  });
  for (const type of TYPES) score += (game.inventory[aiPlayer][type]-game.inventory[enemy][type]) * pieceWorth[type] * .35;
  if (game.phase==='bonus') score += game.currentPlayer===aiPlayer ? 4 : -4;
  return score;
}

function actionPriority(game, action) {
  let score = positionalScore(action);
  if (action.type==='place') score += PIECES[action.piece] * 2;
  if (action.type==='move') score += 3;
  if (action.type==='recycle') score -= 2;
  try { if (applyAction(game,action).winner===game.currentPlayer) score += 10000; } catch {}
  return score;
}

function orderedActions(game, limit=24) {
  return listLegalActions(game)
    .map(action=>({action,priority:actionPriority(game,action)}))
    .sort((a,b)=>b.priority-a.priority)
    .slice(0,limit)
    .map(item=>item.action);
}

function search(state, depth, alpha, beta, aiPlayer, deadline) {
  if (performance.now() >= deadline) throw new Error('AI_TIMEOUT');
  if (depth<=0 || state.winner) return evaluate(state,aiPlayer);
  const maximizing=state.currentPlayer===aiPlayer;
  const actions=orderedActions(state,depth>=3?18:24);
  if(!actions.length)return evaluate(state,aiPlayer);
  let best=maximizing?-Infinity:Infinity;
  for(const action of actions){
    const next=applyAction(state,action);
    const consumesTurn=next.currentPlayer!==state.currentPlayer;
    const nextDepth=depth-(consumesTurn?1:0);
    const value=search(next,nextDepth,alpha,beta,aiPlayer,deadline);
    if(maximizing){best=Math.max(best,value);alpha=Math.max(alpha,best)}
    else{best=Math.min(best,value);beta=Math.min(beta,best)}
    if(beta<=alpha)break;
  }
  return best;
}

export function chooseCourtAction(game, options={}) {
  const budgetMs=options.budgetMs??850;
  const maxDepth=options.maxDepth??3;
  const deadline=performance.now()+budgetMs;
  const aiPlayer=game.currentPlayer;
  const rootActions=orderedActions(game,32);
  if(!rootActions.length)return null;
  let bestAction=rootActions[0];
  let completedDepth=0;
  for(let depth=1;depth<=maxDepth;depth++){
    let roundBest=bestAction,roundScore=-Infinity;
    try{
      for(const action of rootActions){
        const next=applyAction(game,action);
        const consumesTurn=next.currentPlayer!==game.currentPlayer;
        const value=search(next,depth-(consumesTurn?1:0),-Infinity,Infinity,aiPlayer,deadline);
        if(value>roundScore){roundScore=value;roundBest=action}
      }
      bestAction=roundBest;completedDepth=depth;
    }catch(error){if(error.message!=='AI_TIMEOUT')throw error;break}
  }
  return {...bestAction,_depth:completedDepth};
}
