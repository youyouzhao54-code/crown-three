import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, placePiece, movePiece, recyclePiece, topPiece } from '../src/game/engine.js';

const obstacleRng = () => { const xs=[0,.99]; let i=0; return()=>xs[i++%2]; };
test('开局生成两个不同障碍',()=>{const g=createGame(obstacleRng());assert.equal(g.board.filter(c=>c.obstacle).length,2)});
test('双方基础库存相同且后手随机预置一个护卫',()=>{
  const g=createGame(obstacleRng());
  const openingGuards=g.board.filter(cell=>cell.stack.at(-1)?.player==='p2'&&cell.stack.at(-1)?.type==='guard');
  assert.equal(openingGuards.length,1);
  assert.equal(openingGuards[0].obstacle,false);
  assert.deepEqual(g.inventory.p1,{king:1,queen:2,guard:4});
  assert.deepEqual(g.inventory.p2,{king:1,queen:2,guard:3});
  assert.equal(g.currentPlayer,'p1'); assert.equal(g.turn,1);
});
test('高级棋可以压制低级敌棋并在离开后显露',()=>{
  let g=createGame(obstacleRng()); g.board.forEach(c=>c.obstacle=false);
  g=placePiece(g,'guard',5); g=placePiece(g,'queen',5);
  assert.equal(g.board[5].stack.length,2); assert.equal(topPiece(g.board[5]).player,'p2');
  g.currentPlayer='p2';
  g=movePiece(g,5,6); assert.equal(topPiece(g.board[5]).player,'p1');
});
test('回收王后进入低级棋追加行动阶段',()=>{
  let g=createGame(obstacleRng()); g.board.forEach(c=>c.obstacle=false); g.currentPlayer='p1';
  g.board[5].stack.push({player:'p1',type:'queen'}); g=recyclePiece(g,5);
  assert.equal(g.phase,'bonus'); assert.equal(g.bonusMaxRank,2);
});
test('回收后的追加行动结束后立即切换对方',()=>{
  let g=createGame(obstacleRng()); g.board.forEach(c=>c.obstacle=false); g.currentPlayer='p1';
  g.board[5].stack.push({player:'p1',type:'queen'}); g.inventory.p1.guard=4;
  g=recyclePiece(g,5);
  assert.equal(g.phase,'bonus'); assert.equal(g.currentPlayer,'p1');
  g=placePiece(g,'guard',6);
  assert.equal(g.phase,'main'); assert.equal(g.currentPlayer,'p2'); assert.equal(g.turn,2);
});
