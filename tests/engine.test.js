import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, placePiece, movePiece, recyclePiece, topPiece } from '../src/game/engine.js';

const obstacleRng = () => { const xs=[0,.99]; let i=0; return()=>xs[i++%2]; };
test('开局生成两个不同障碍',()=>{const g=createGame(obstacleRng());assert.equal(g.board.filter(c=>c.obstacle).length,2)});
test('先手第一手随机放置任意一枚库存棋子，随后轮到后手',()=>{
  const xs=[0,.99,.5,.2]; let i=0;
  const g=createGame(()=>xs[i++]);
  const openingPieces=g.board.filter(cell=>cell.stack.at(-1)?.player==='p1');
  assert.equal(openingPieces.length,1);
  assert.equal(openingPieces[0].obstacle,false);
  assert.equal(openingPieces[0].stack.at(-1).type,'queen');
  assert.deepEqual(g.inventory.p1,{king:1,queen:1,guard:4});
  assert.deepEqual(g.inventory.p2,{king:1,queen:2,guard:4});
  assert.equal(g.currentPlayer,'p2'); assert.equal(g.turn,2);
});
test('高级棋可以压制低级敌棋并在离开后显露',()=>{
  let g=createGame(obstacleRng()); g.board.forEach(c=>c.obstacle=false); g.currentPlayer='p1';
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
  const startingTurn=g.turn;
  g=recyclePiece(g,5);
  assert.equal(g.phase,'bonus'); assert.equal(g.currentPlayer,'p1');
  g=placePiece(g,'guard',6);
  assert.equal(g.phase,'main'); assert.equal(g.currentPlayer,'p2'); assert.equal(g.turn,startingTurn+1);
});
