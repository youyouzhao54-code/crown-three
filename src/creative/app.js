import { CREATIVE_ROLES, getRole } from './roles.js';
import { CREATIVE_LEVELS, createCreativeGame, legalCreativeMoves, legalCreativePlacements, moveCreativePiece, placeCreativePiece, recycleCreativePiece, resolveCaoGuixinChoice, resolveCaoTuBu, resolveLvBuEnd, skipCaoSecond, skipCreativeBonus, skipLvBuNoAction, skipZhangFeiBonus, topCreativePiece } from './engine.js';
import { isCreativeAudioEnabled, playCreativePlace, setCreativeAudioEnabled, startCreativeAudio } from './audio.js';

let selections={black:CREATIVE_ROLES[0].id,white:CREATIVE_ROLES[1].id};
let game=null,selectedLevel=1,mode='place',selectedFrom=null;
let draftSide='black',draftLocked={black:false,white:false};
const $=selector=>document.querySelector(selector);

function inventoryText(role){
  const stock=CREATIVE_LEVELS.filter(level=>role.inventory[level]>0).map(level=>`${level}级×${role.inventory[level]}`);
  return stock.length?stock.join(' · '):'无初始棋子';
}
const avatarMarkup=(role,className='')=>role.art?.avatar?`<img class="${className}" src="${role.art.avatar}" alt="${role.name}头像">`:`<span class="${className} generic-avatar" aria-label="${role.name}暂无头像">将</span>`;
function draftSideCard(side){
  const role=getRole(selections[side]),active=draftSide===side&&!draftLocked[side],locked=draftLocked[side];
  return `<div class="draft-side-label"><span>${side==='black'?'PLAYER 1 · 先手':'PLAYER 2 · 后手'}</span><strong>${locked?'已锁定':active?'选择中':'等待中'}</strong></div><div class="draft-portrait">${avatarMarkup(role)}<span>${role.name}</span></div><h3>${role.name}</h3><p>${role.faction} · ${role.title}</p><p>${role.description}</p>${locked?'<span class="draft-lock-state">GENERAL LOCKED</span>':''}`;
}
function renderRoles(){
  $('#role-pool').innerHTML=CREATIVE_ROLES.map(role=>`<button class="pool-role ${selections[draftSide]===role.id?'selected':''} ${draftLocked.black&&selections.black===role.id?'locked-black':''} ${draftLocked.white&&selections.white===role.id?'locked-white':''}" data-role-id="${role.id}">${avatarMarkup(role)}<b>${role.name}</b><small>${role.faction} · ${role.title}</small></button>`).join('');
  for(const side of ['black','white']){
    const panel=$(`#${side}-draft`);
    panel.classList.toggle('active',draftSide===side&&!draftLocked[side]);
    panel.classList.toggle('locked',draftLocked[side]);
    panel.innerHTML=draftSideCard(side);
  }
  const role=getRole(selections[draftSide]);
  $('#role-detail').innerHTML=`<div class="role-detail-summary"><h3>${role.name}</h3><p>${role.faction} · ${role.title}</p><p class="role-inventory">${inventoryText(role)}</p></div><div class="role-detail-skill"><b>${role.skill.name}</b><p>${role.skill.description}</p></div>`;
  $('#draft-prompt').textContent=draftSide==='black'?'先手玩家正在选择':'后手玩家正在选择';
  $('#lock-role').textContent=`${draftSide==='black'?'黑方':'白方'}确认武将`;
}
function renderPlayer(side){
  const role=getRole(game.players[side].roleId),active=game.currentPlayer===side&&!game.winner;
  const state=game.players[side].skillState;
  const special=role.id==='lv-bu'?`<div class="role-state fury"><b>霸气</b><span>${[1,2,3].map(n=>`<i class="${n<=state.fury?'filled':''}"></i>`).join('')}</span><small>${state.fury}/3</small></div>`:role.id==='zhao-yun'?`<div class="role-state zhao"><b>愈厉累计</b><span>${CREATIVE_LEVELS.map(level=>`<i>${level}级 ${state.placedByLevel[level]??0}/2</i>`).join('')}</span></div>`:role.id==='liu-san-dao'?`<div class="role-state zhao"><b>蓄势充能</b><span>${CREATIVE_LEVELS.map(level=>`<i>${level}级 ${state.chargeByLevel[level]??0}${level===1?'（免充能）':`/${level-1}`}</i>`).join('')}</span></div>`:role.id==='cao-cao'?`<div class="role-state zhao"><b>归心</b><span><i>手中5级 ×${game.players[side].inventory[5]}</i><i>归心 ${state.caoGuixinActive?'有效':'已失去'}</i><i>回合末随机获取 ×${state.caoEndDraws??0}</i></span></div>`:'';
  $(`#${side}-player`).classList.toggle('active',active);
  $(`#${side}-player`).innerHTML=`<div class="player-identity">${avatarMarkup(role)}<div class="player-head"><span><b>${side==='black'?'黑方':'白方'} · ${role.name}</b><small>${role.skill.name}</small></span>${active?'<strong>行动中</strong>':''}</div></div><p class="player-skill">${role.skill.description}</p>${special}<div class="level-stock">${CREATIVE_LEVELS.map(level=>`<button data-level="${level}" ${side!==game.currentPlayer||game.players[side].inventory[level]<=0||game.winner||game.phase==='lvbu-end'||['cao-choice','game-start-choice'].includes(game.phase)||game.phase==='bonus'&&level>=game.bonusMaxRank?'disabled':''} class="${side===game.currentPlayer&&mode==='place'&&selectedLevel===level?'selected':''}"><i>${level}</i><span>×${game.players[side].inventory[level]}</span></button>`).join('')}</div>`;
}
function renderGame(){
  const caoPlaceOnly=game.players[game.currentPlayer].skillId==='cao-cao'&&game.players[game.currentPlayer].skillState.caoMode===3;
  if(caoPlaceOnly&&mode!=='place'){mode='place';selectedFrom=null}
  renderPlayer('white');renderPlayer('black');
  const targets=new Set(mode==='place'?legalCreativePlacements(game,selectedLevel):mode==='move'&&selectedFrom!==null?legalCreativeMoves(game,selectedFrom):[]);
  $('#creative-board').innerHTML=game.board.map((cell,index)=>{const top=topCreativePiece(cell),depth=cell.stack.length;return `<button data-cell="${index}" class="creative-cell ${game.winningLine.includes(index)?'winning':''} ${targets.has(index)?'target':''} ${selectedFrom===index?'source':''}" aria-label="第${Math.floor(index/9)+1}行第${index%9+1}列">${top?`<span class="number-piece ${top.player}">${top.level}</span>${depth>1?`<small>${depth}</small>`:''}`:''}</button>`}).join('');
  document.querySelectorAll('[data-creative-mode]').forEach(btn=>{btn.classList.toggle('selected',btn.dataset.creativeMode===mode);btn.disabled=['cao-choice','game-start-choice'].includes(game.phase)||caoPlaceOnly&&btn.dataset.creativeMode!=='place'});
  $('#creative-skip').hidden=game.phase!=='bonus';
  $('#lvbu-skip').hidden=game.phase!=='lvbu-end';
  $('#lvbu-pass').hidden=game.phase!=='no-action';
  $('#zhangfei-skip').hidden=game.phase!=='zhangfei-bonus';
  $('#cao-skip').hidden=game.phase!=='cao-second';
  $('#cao-abandon').hidden=game.phase!=='cao-choice';
  $('#cao-promote').hidden=game.phase!=='cao-choice';
  $('#cao-tubu-five').hidden=game.phase!=='game-start-choice';
  $('#cao-tubu-fours').hidden=game.phase!=='game-start-choice';
  const action=mode==='place'?'放置':mode==='move'?'移动':'回收';
  const effect=game.lastEffect?`${game.lastEffect.message} · `:'';
  const winCount=Object.values(game.players).some(player=>player.skillId==='lv-bu')?'六':'五';
  $('#creative-status').textContent=game.winner?`${effect}${game.winner==='black'?'黑方':'白方'}${winCount}子连珠，获得胜利`:game.phase==='game-start-choice'?`${effect}${game.currentPlayer==='black'?'先手':'后手'}曹操发动【吐哺】：选择获得1枚5级或2枚4级棋子`:game.phase==='cao-choice'?`${effect}【归心】必须抉择：失去全部1～4级手牌并永久失去归心，或将当前全部5级棋子升为6级`:game.phase==='no-action'?`${effect}霸气不足2点，本回合不能行动`:game.phase==='lvbu-end'?`${effect}【单三】点击己方一枚5级以上棋子发动，或选择不发动`:game.phase==='cao-second'?`${effect}【归心】在与第一次落点不相邻的位置进行第二次放置，或放弃`:game.phase==='zhangfei-bonus'?`${effect}【狂啸】可以继续行动，或主动结束追加行动`:game.phase==='bonus'?`${effect}${game.currentPlayer==='black'?'黑方':'白方'}：操作一枚低于 ${game.bonusMaxRank} 级的棋子，或放弃`:`${effect}第 ${game.turn} 回合 · ${game.currentPlayer==='black'?'黑方':'白方'}行动 · ${action}`;
}
function start(){startCreativeAudio();game=createCreativeGame(getRole(selections.black),getRole(selections.white));selectedLevel=1;selectedFrom=null;mode='place';$('#role-select').hidden=true;$('#creative-game').hidden=false;renderGame()}
function resetDraft(){draftSide='black';draftLocked={black:false,white:false};selections={black:CREATIVE_ROLES[0].id,white:CREATIVE_ROLES[1].id};renderRoles()}
function nearestIntersection(event){const cells=[...document.querySelectorAll('.creative-cell')];if(cells.length!==81)return null;const first=cells[0].getBoundingClientRect(),last=cells[80].getBoundingClientRect(),startX=first.left+first.width/2,startY=first.top+first.height/2,stepX=(last.left+last.width/2-startX)/8,stepY=(last.top+last.height/2-startY)/8,col=Math.max(0,Math.min(8,Math.round((event.clientX-startX)/stepX))),row=Math.max(0,Math.min(8,Math.round((event.clientY-startY)/stepY)));return row*9+col}
document.addEventListener('click',e=>{
  const roleButton=e.target.closest('[data-role-id]');if(roleButton&&!draftLocked[draftSide]){selections[draftSide]=roleButton.dataset.roleId;renderRoles();return}
  const level=e.target.closest('[data-level]');if(level){selectedLevel=Number(level.dataset.level);selectedFrom=null;mode='place';renderGame();return}
  const modeButton=e.target.closest('[data-creative-mode]');if(modeButton){mode=modeButton.dataset.creativeMode;selectedFrom=null;renderGame();return}
  const boardHit=e.target.closest('#creative-board');if(boardHit&&game){const index=nearestIntersection(e);try{if(game.phase==='lvbu-end'){game=resolveLvBuEnd(game,index)}else if(mode==='place'){const player=game.currentPlayer;game=placeCreativePiece(game,index,selectedLevel);playCreativePlace(selectedLevel,player)}else if(mode==='move'){if(selectedFrom===null){const top=topCreativePiece(game.board[index]);if(!top||top.player!==game.currentPlayer)throw new Error('请先选择己方顶层棋子');if(game.phase==='bonus'&&top.level>=game.bonusMaxRank)throw new Error('追加行动必须使用更低等级棋子');selectedFrom=index;renderGame();return}else{const mover=topCreativePiece(game.board[selectedFrom]);game=moveCreativePiece(game,selectedFrom,index);playCreativePlace(mover.level,mover.player)}}else game=recycleCreativePiece(game,index);selectedFrom=null;if(game.phase==='bonus')mode='place';renderGame()}catch(err){$('#creative-status').textContent=err.message}}
});
$('#lock-role').addEventListener('click',()=>{draftLocked[draftSide]=true;if(draftSide==='black'){draftSide='white';renderRoles()}else start()});
$('#creative-restart').addEventListener('click',start);$('#creative-audio').addEventListener('click',()=>{const next=setCreativeAudioEnabled(!isCreativeAudioEnabled());$('#creative-audio').textContent=`声音：${next?'开启':'关闭'}`});$('#creative-cancel').addEventListener('click',()=>{selectedFrom=null;renderGame()});$('#creative-skip').addEventListener('click',()=>{game=skipCreativeBonus(game);selectedFrom=null;mode='place';renderGame()});$('#creative-change-role').addEventListener('click',()=>{$('#creative-game').hidden=true;$('#role-select').hidden=false;resetDraft()});
$('#lvbu-skip').addEventListener('click',()=>{game=resolveLvBuEnd(game);selectedFrom=null;mode='place';renderGame()});
$('#lvbu-pass').addEventListener('click',()=>{game=skipLvBuNoAction(game);selectedFrom=null;mode='place';renderGame()});
$('#zhangfei-skip').addEventListener('click',()=>{game=skipZhangFeiBonus(game);selectedFrom=null;mode='place';renderGame()});
$('#cao-skip').addEventListener('click',()=>{game=skipCaoSecond(game);selectedFrom=null;mode='place';renderGame()});
$('#cao-abandon').addEventListener('click',()=>{game=resolveCaoGuixinChoice(game,'abandon');selectedFrom=null;mode='place';renderGame()});
$('#cao-promote').addEventListener('click',()=>{game=resolveCaoGuixinChoice(game,'promote');selectedFrom=null;mode='place';renderGame()});
$('#cao-tubu-five').addEventListener('click',()=>{game=resolveCaoTuBu(game,'five');selectedFrom=null;mode='place';renderGame()});
$('#cao-tubu-fours').addEventListener('click',()=>{game=resolveCaoTuBu(game,'fours');selectedFrom=null;mode='place';renderGame()});
renderRoles();
