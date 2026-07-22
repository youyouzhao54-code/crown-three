import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame } from '../src/game/engine.js';
import { applyAction, chooseCourtAction, chooseNoviceAction, listLegalActions } from '../src/game/ai.js';

const rng = () => { const xs=[0,.99]; let i=0; return()=>xs[i++%2]; };
const emptyGame = () => { const g=createGame(rng()); g.board.forEach(c=>{c.obstacle=false;c.stack=[]}); return g; };

test('AI 可以列出开局全部合法放置行动',()=>{
  const game=emptyGame(); const actions=listLegalActions(game);
  assert.equal(actions.filter(a=>a.type==='place').length,48);
});

test('见习 AI 优先选择立即获胜行动',()=>{
  const game=emptyGame(); game.currentPlayer='p2';
  game.board[0].stack.push({player:'p2',type:'guard'});
  game.board[1].stack.push({player:'p2',type:'guard'});
  const action=chooseNoviceAction(game,()=>0);
  const next=applyAction(game,action);
  assert.equal(next.winner,'p2');
});

test('宫廷 AI 会阻止玩家下一步直接三连',()=>{
  const game=emptyGame(); game.currentPlayer='p2';
  game.board[0].stack.push({player:'p1',type:'guard'});
  game.board[1].stack.push({player:'p1',type:'guard'});
  const action=chooseCourtAction(game,{budgetMs:1500,maxDepth:2});
  const next=applyAction(game,action);
  const immediateWins=listLegalActions(next).filter(reply=>applyAction(next,reply).winner==='p1');
  assert.equal(immediateWins.length,0);
});
