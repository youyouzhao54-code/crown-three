import { createGame, legalPlacements, legalMoves, placePiece, movePiece, recyclePiece, skipBonus, topPiece, PIECES } from './game/engine.js';
import { applyAction, chooseCourtAction, chooseNoviceAction } from './game/ai.js';

const labels = { p1: '先手 · 金曜', p2: '后手 · 月影', king: '国王', queen: '王后', guard: '护卫' };
const pieceSvg = type => {
  const paths = {
    king: `<path d="M17 39h30l-2.5-18-8.5 8-4-17-4 17-8.5-8L17 39Z"/><path d="M19 43h26l-2 7H21l-2-7Z"/><circle cx="32" cy="8" r="3"/>`,
    queen: `<path d="M32 8 44 25 32 43 20 25 32 8Z"/><path d="M20 25 12 20l5 17 15 8 15-8 5-17-8 5"/><path d="M20 46h24l3 6H17l3-6Z"/><path class="queen-cut" d="m32 16 6 9-6 10-6-10 6-9Z"/>`,
    guard: `<path d="M32 9 48 15v14c0 11-6.5 18-16 23-9.5-5-16-12-16-23V15l16-6Z"/><path class="glyph-cut" d="M32 17v27M23 26h18"/>`,
  };
  return `<svg class="piece-glyph" viewBox="0 0 64 64" aria-hidden="true">${paths[type]}</svg>`;
};
const obstacleSvg = `<svg class="obstacle-glyph" viewBox="0 0 64 64" aria-hidden="true"><path d="M9 47 15 25l11-5 7-13 10 15 10 5 4 20-13 8H20L9 47Z"/><path class="rune" d="m28 22 9 9-8 9m-8-7h20"/></svg>`;
let game = createGame();
let mode = 'place';
let selectedPiece = null;
let selectedFrom = null;
let menuIntroPlayed = false;
let matchMode = 'pvp';
let humanPlayer = null;
let aiThinking = false;
let aiTimer = null;
let aiLevel = 'novice';

const boardEl = document.querySelector('#board');
const statusEl = document.querySelector('#status');
const toastEl = document.querySelector('#toast');
const skipEl = document.querySelector('#skip-bonus');
const menuEl = document.querySelector('#main-menu');
const gameScreenEl = document.querySelector('#game-screen');

function notify(message) {
  toastEl.textContent = message; toastEl.classList.add('show');
  setTimeout(() => toastEl.classList.remove('show'), 1700);
}

function resetSelection() { selectedPiece = null; selectedFrom = null; }
const isAiTurn = () => matchMode === 'pve' && game.currentPlayer !== humanPlayer && !game.winner;
const aiName = () => aiLevel === 'court' ? '宫廷棋手' : '见习棋手';

function scheduleAiTurn() {
  clearTimeout(aiTimer);
  if (!isAiTurn()) { aiThinking = false; return; }
  aiThinking = true; resetSelection(); render();
  aiTimer = setTimeout(() => {
    const action = aiLevel === 'court' ? chooseCourtAction(game) : chooseNoviceAction(game);
    if (!action) { aiThinking = false; return; }
    game = applyAction(game, action);
    aiThinking = false; render();
    if (isAiTurn()) scheduleAiTurn();
  }, 650 + Math.random() * 450);
}

function afterHumanAction() {
  render();
  if (isAiTurn()) scheduleAiTurn();
}
function allowedTargets() {
  if (mode === 'place') return legalPlacements(game, selectedPiece);
  if (mode === 'move' && selectedFrom !== null) return legalMoves(game, selectedFrom);
  return [];
}

function renderInventory(player) {
  const panel = document.querySelector(`#${player}-panel`);
  const active = game.currentPlayer === player && !game.winner;
  panel.classList.toggle('active', active);
  panel.innerHTML = `<div class="player-title"><span>${labels[player]}</span>${active ? '<b>行动中</b>' : ''}</div>
    <div class="inventory">${['king','queen','guard'].map(type => {
      const disabled = game.inventory[player][type] <= 0 || player !== game.currentPlayer || isAiTurn() || (game.phase === 'bonus' && PIECES[type] >= game.bonusMaxRank);
      return `<button class="piece-card ${selectedPiece===type&&player===game.currentPlayer?'selected':''}" data-piece="${type}" data-player="${player}" ${disabled?'disabled':''}>
        <span class="piece-symbol">${pieceSvg(type)}</span><span>${labels[type]}</span><strong>× ${game.inventory[player][type]}</strong></button>`;
    }).join('')}</div>`;
}

function render() {
  gameScreenEl.classList.toggle('turn-p1', game.currentPlayer === 'p1' && !game.winner);
  gameScreenEl.classList.toggle('turn-p2', game.currentPlayer === 'p2' && !game.winner);
  gameScreenEl.classList.toggle('game-finished', Boolean(game.winner));
  renderInventory('p2'); renderInventory('p1');
  const targets = new Set(allowedTargets());
  boardEl.innerHTML = game.board.map((cell, index) => {
    const top = topPiece(cell); const depth = cell.stack.length;
    return `<button class="cell ${cell.obstacle?'obstacle':''} ${targets.has(index)?'target':''} ${selectedFrom===index?'selected-source':''}" data-index="${index}" aria-label="第${Math.floor(index/4)+1}行第${index%4+1}列">
      ${cell.obstacle ? `<span class="rock">${obstacleSvg}</span>` : top ? `<span class="token ${top.player} ${top.type}">${pieceSvg(top.type)}</span>${depth>1?`<small class="depth">${depth}</small>`:''}` : ''}
    </button>`;
  }).join('');
  document.querySelectorAll('[data-mode]').forEach(btn => btn.classList.toggle('selected', btn.dataset.mode===mode));
  skipEl.hidden = game.phase !== 'bonus';
  statusEl.textContent = game.winner ? `${labels[game.winner]} 获胜！` : game.phase === 'bonus'
    ? `${aiThinking ? `${aiName()}正在思考` : labels[game.currentPlayer]}：选择一枚更低级棋子行动，或放弃`
    : aiThinking ? `第 ${game.turn} 回合 · ${aiName()}正在思考…`
    : `第 ${game.turn} 回合 · ${labels[game.currentPlayer]}行动 · ${mode==='place'?'放置':mode==='move'?'移动':'回收'}`;
  document.querySelector('.game-screen .eyebrow').textContent = matchMode === 'pve' ? `人机对战 · ${aiName()}` : '4 × 4 策略棋盘';
}

document.addEventListener('click', event => {
  if (isAiTurn() || aiThinking) return;
  const pieceBtn = event.target.closest('[data-piece]');
  if (pieceBtn && pieceBtn.dataset.player === game.currentPlayer) {
    mode = 'place'; selectedPiece = pieceBtn.dataset.piece; selectedFrom = null; render(); return;
  }
  const modeBtn = event.target.closest('[data-mode]');
  if (modeBtn) {
    mode = modeBtn.dataset.mode; resetSelection(); render(); return;
  }
  const cellBtn = event.target.closest('[data-index]');
  if (!cellBtn || game.winner) return;
  const index = Number(cellBtn.dataset.index);
  try {
    if (mode === 'place') {
      if (!selectedPiece) return notify('请先从库存选择棋子');
      game = placePiece(game, selectedPiece, index); resetSelection();
    } else if (mode === 'move') {
      if (selectedFrom === null) {
        const top = topPiece(game.board[index]);
        if (!top || top.player !== game.currentPlayer) return notify('请选择己方顶层棋子');
        if (game.phase === 'bonus' && PIECES[top.type] >= game.bonusMaxRank) return notify('追加行动只能使用更低级棋子');
        selectedFrom = index;
      } else { game = movePiece(game, selectedFrom, index); resetSelection(); }
    } else {
      game = recyclePiece(game, index); resetSelection(); mode = game.phase === 'bonus' ? 'place' : 'recycle';
    }
    afterHumanAction();
  } catch (error) { notify(error.message); }
});

document.querySelector('#cancel').addEventListener('click', () => { if(!isAiTurn()){resetSelection(); render();} });
document.querySelector('#restart').addEventListener('click', () => { clearTimeout(aiTimer); game=createGame(); mode='place'; resetSelection(); aiThinking=false; render(); if(isAiTurn())scheduleAiTurn(); });
document.querySelector('#back-menu').addEventListener('click', () => {
  gameScreenEl.classList.add('screen-leaving');
  setTimeout(() => {
    gameScreenEl.hidden = true; gameScreenEl.classList.remove('screen-leaving');
    menuEl.hidden = false; menuEl.classList.add('menu-return');
    requestAnimationFrame(() => menuEl.classList.add('is-visible'));
  }, 260);
});
skipEl.addEventListener('click', () => { if(isAiTurn())return; game=skipBonus(game); mode='place'; resetSelection(); afterHumanAction(); });
const dialog=document.querySelector('#rules-dialog');
document.querySelector('#rules').addEventListener('click',()=>dialog.showModal());
document.querySelector('#close-rules').addEventListener('click',()=>dialog.close());
const settingsDialog=document.querySelector('#settings-dialog');
const pveDialog=document.querySelector('#pve-dialog');
document.querySelector('#close-settings').addEventListener('click',()=>settingsDialog.close());
document.querySelector('#close-pve').addEventListener('click',()=>pveDialog.close());
document.querySelector('#start-pve').addEventListener('click',()=>{
  matchMode='pve'; humanPlayer=document.querySelector('input[name="human-side"]:checked').value;
  aiLevel=document.querySelector('input[name="ai-level"]:checked').value;
  clearTimeout(aiTimer); game=createGame(); mode='place'; resetSelection(); aiThinking=false;
  pveDialog.close(); menuEl.classList.add('menu-leaving');
  setTimeout(()=>{menuEl.hidden=true;menuEl.classList.remove('menu-leaving','is-visible');gameScreenEl.hidden=false;render();if(isAiTurn())scheduleAiTurn();},420);
});
document.querySelectorAll('[data-menu-action]').forEach(button => button.addEventListener('click', () => {
  const action=button.dataset.menuAction;
  if(action==='pvp'){
    matchMode='pvp'; humanPlayer=null; clearTimeout(aiTimer); aiThinking=false;
    menuEl.classList.add('menu-leaving');
    setTimeout(() => {
      menuEl.hidden=true; menuEl.classList.remove('menu-leaving','is-visible');
      gameScreenEl.hidden=false; gameScreenEl.classList.add('screen-entering');
      game=createGame(); mode='place'; resetSelection(); render();
      requestAnimationFrame(() => gameScreenEl.classList.remove('screen-entering'));
    }, 420);
  } else if(action==='pve') pveDialog.showModal();
  else if(action==='settings') settingsDialog.showModal();
  else if(action==='exit') notify('网页游戏无法主动关闭窗口，请直接关闭当前页面');
  else notify('创意模式正在筹备中');
}));
render();
requestAnimationFrame(() => {
  menuEl.classList.add('is-visible');
  menuIntroPlayed = true;
});
