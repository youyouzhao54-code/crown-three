import { CREATIVE_ROLES, getRole } from './roles.js';
import { CREATIVE_LEVELS, createCreativeGame, legalCreativeMoves, legalCreativePlacements, moveCreativePiece, placeCreativePiece, recycleCreativePiece, resolveLvBuEnd, skipCreativeBonus, skipLvBuNoAction, topCreativePiece } from './engine.js';
import { isCreativeAudioEnabled, playCreativePlace, setCreativeAudioEnabled, startCreativeAudio } from './audio.js';

let selections={black:CREATIVE_ROLES[0].id,white:CREATIVE_ROLES[1].id};
let game=null,selectedLevel=1,mode='place',selectedFrom=null;
const $=selector=>document.querySelector(selector);

function roleCard(role,side){
  const checked=selections[side]===role.id?'checked':'';
  return `<label class="role-card"><input type="radio" name="${side}-role" value="${role.id}" ${checked}><span class="role-seal">将</span><span><b>${role.name}</b><small>${role.title} · ${role.faction}</small><em>${role.description}</em><i>${role.skill.name}</i><span class="role-skill-desc">${role.skill.description}</span></span></label>`;
}
function renderRoles(){
  $('#black-roles').innerHTML=CREATIVE_ROLES.map(r=>roleCard(r,'black')).join('');
  $('#white-roles').innerHTML=CREATIVE_ROLES.map(r=>roleCard(r,'white')).join('');
}
function renderPlayer(side){
  const role=getRole(game.players[side].roleId),active=game.currentPlayer===side&&!game.winner;
  const state=game.players[side].skillState;
  const special=role.id==='lv-bu'?`<div class="role-state fury"><b>霸气</b><span>${[1,2,3].map(n=>`<i class="${n<=state.fury?'filled':''}"></i>`).join('')}</span><small>${state.fury}/3</small></div>`:role.id==='zhao-yun'?`<div class="role-state zhao"><b>愈厉累计</b><span>${CREATIVE_LEVELS.map(level=>`<i>${level}级 ${state.placedByLevel[level]??0}/2</i>`).join('')}</span></div>`:role.id==='liu-san-dao'?`<div class="role-state zhao"><b>连势进度</b><span>${CREATIVE_LEVELS.slice(0,-1).map(level=>`<i>${level+1}级 ${Math.min(level,state.placedByLevel[level]??0)}/${level}</i>`).join('')}</span></div>`:'';
  $(`#${side}-player`).classList.toggle('active',active);
  $(`#${side}-player`).innerHTML=`<div class="player-head"><span><b>${side==='black'?'黑方':'白方'} · ${role.name}</b><small>${role.skill.name}</small></span>${active?'<strong>行动中</strong>':''}</div><p class="player-skill">${role.skill.description}</p>${special}<div class="level-stock">${CREATIVE_LEVELS.map(level=>`<button data-level="${level}" ${side!==game.currentPlayer||game.players[side].inventory[level]<=0||game.winner||game.phase==='lvbu-end'||game.phase==='bonus'&&level>=game.bonusMaxRank?'disabled':''} class="${side===game.currentPlayer&&mode==='place'&&selectedLevel===level?'selected':''}"><i>${level}</i><span>×${game.players[side].inventory[level]}</span></button>`).join('')}</div>`;
}
function renderGame(){
  renderPlayer('white');renderPlayer('black');
  const targets=new Set(mode==='place'?legalCreativePlacements(game,selectedLevel):mode==='move'&&selectedFrom!==null?legalCreativeMoves(game,selectedFrom):[]);
  $('#creative-board').innerHTML=game.board.map((cell,index)=>{const top=topCreativePiece(cell),depth=cell.stack.length;return `<button data-cell="${index}" class="creative-cell ${game.winningLine.includes(index)?'winning':''} ${targets.has(index)?'target':''} ${selectedFrom===index?'source':''}" aria-label="第${Math.floor(index/9)+1}行第${index%9+1}列">${top?`<span class="number-piece ${top.player}">${top.level}</span>${depth>1?`<small>${depth}</small>`:''}`:''}</button>`}).join('');
  document.querySelectorAll('[data-creative-mode]').forEach(btn=>btn.classList.toggle('selected',btn.dataset.creativeMode===mode));
  $('#creative-skip').hidden=game.phase!=='bonus';
  $('#lvbu-skip').hidden=game.phase!=='lvbu-end';
  $('#lvbu-pass').hidden=game.phase!=='no-action';
  const action=mode==='place'?'放置':mode==='move'?'移动':'回收';
  const effect=game.lastEffect?`${game.lastEffect.message} · `:'';
  const winCount=Object.values(game.players).some(player=>player.skillId==='lv-bu')?'六':'五';
  $('#creative-status').textContent=game.winner?`${effect}${game.winner==='black'?'黑方':'白方'}${winCount}子连珠，获得胜利`:game.phase==='no-action'?`${effect}霸气不足2点，本回合不能行动`:game.phase==='lvbu-end'?`${effect}【单三】点击己方一枚5级棋子发动，或选择不发动`:game.phase==='bonus'?`${effect}${game.currentPlayer==='black'?'黑方':'白方'}：操作一枚低于 ${game.bonusMaxRank} 级的棋子，或放弃`:`${effect}第 ${game.turn} 回合 · ${game.currentPlayer==='black'?'黑方':'白方'}行动 · ${action}`;
}
function start(){startCreativeAudio();game=createCreativeGame(getRole(selections.black),getRole(selections.white));selectedLevel=1;selectedFrom=null;mode='place';$('#role-select').hidden=true;$('#creative-game').hidden=false;renderGame()}
function nearestIntersection(event){const cells=[...document.querySelectorAll('.creative-cell')];if(cells.length!==81)return null;const first=cells[0].getBoundingClientRect(),last=cells[80].getBoundingClientRect(),startX=first.left+first.width/2,startY=first.top+first.height/2,stepX=(last.left+last.width/2-startX)/8,stepY=(last.top+last.height/2-startY)/8,col=Math.max(0,Math.min(8,Math.round((event.clientX-startX)/stepX))),row=Math.max(0,Math.min(8,Math.round((event.clientY-startY)/stepY)));return row*9+col}
document.addEventListener('change',e=>{if(e.target.name==='black-role')selections.black=e.target.value;if(e.target.name==='white-role')selections.white=e.target.value});
document.addEventListener('click',e=>{
  const level=e.target.closest('[data-level]');if(level){selectedLevel=Number(level.dataset.level);selectedFrom=null;mode='place';renderGame();return}
  const modeButton=e.target.closest('[data-creative-mode]');if(modeButton){mode=modeButton.dataset.creativeMode;selectedFrom=null;renderGame();return}
  const boardHit=e.target.closest('#creative-board');if(boardHit&&game){const index=nearestIntersection(e);try{if(game.phase==='lvbu-end'){game=resolveLvBuEnd(game,index)}else if(mode==='place'){const player=game.currentPlayer;game=placeCreativePiece(game,index,selectedLevel);playCreativePlace(selectedLevel,player)}else if(mode==='move'){if(selectedFrom===null){const top=topCreativePiece(game.board[index]);if(!top||top.player!==game.currentPlayer)throw new Error('请先选择己方顶层棋子');if(game.phase==='bonus'&&top.level>=game.bonusMaxRank)throw new Error('追加行动必须使用更低等级棋子');selectedFrom=index;renderGame();return}else{const mover=topCreativePiece(game.board[selectedFrom]);game=moveCreativePiece(game,selectedFrom,index);playCreativePlace(mover.level,mover.player)}}else game=recycleCreativePiece(game,index);selectedFrom=null;if(game.phase==='bonus')mode='place';renderGame()}catch(err){$('#creative-status').textContent=err.message}}
});
$('#start-creative').addEventListener('click',start);$('#creative-restart').addEventListener('click',start);$('#creative-audio').addEventListener('click',()=>{const next=setCreativeAudioEnabled(!isCreativeAudioEnabled());$('#creative-audio').textContent=`声音：${next?'开启':'关闭'}`});$('#creative-cancel').addEventListener('click',()=>{selectedFrom=null;renderGame()});$('#creative-skip').addEventListener('click',()=>{game=skipCreativeBonus(game);selectedFrom=null;mode='place';renderGame()});$('#creative-change-role').addEventListener('click',()=>{$('#creative-game').hidden=true;$('#role-select').hidden=false});
$('#lvbu-skip').addEventListener('click',()=>{game=resolveLvBuEnd(game);selectedFrom=null;mode='place';renderGame()});
$('#lvbu-pass').addEventListener('click',()=>{game=skipLvBuNoAction(game);selectedFrom=null;mode='place';renderGame()});
renderRoles();
