export const CREATIVE_SIZE = 9;
export const CREATIVE_LEVELS = Object.freeze([1,2,3,4,5,6,7]);
import { canCreativeSuppress, resolveCreativeAfterAction, resolveCreativeRecycle, resolveCreativeSuppress, resolveCreativeTurnEnd, resolveCreativeTurnStart, resolveZhaoSevenMove } from './skills.js';
const clone = value => structuredClone(value);
const other = player => player === 'black' ? 'white' : 'black';
export const topCreativePiece = cell => cell.stack.at(-1) ?? null;
export function changeCreativePieceLevel(game,index,delta){const cell=game.board[index],piece=topCreativePiece(cell??{stack:[]});if(!piece)return null;piece.level=Math.min(7,piece.level+Number(delta));if(piece.level<=0){cell.stack.pop();return null}return piece}

export function createCreativeGame(blackRole, whiteRole) {
  const inventoryOf=role=>Object.fromEntries(CREATIVE_LEVELS.map(level=>[level,Number(role.inventory[level]??0)]));
  const game={
    board: Array.from({length:CREATIVE_SIZE*CREATIVE_SIZE},()=>({stack:[]})),
    players: {
      black: { roleId:blackRole.id, skillId:blackRole.skill.id, skillState:{placedByLevel:{},chargeByLevel:Object.fromEntries(CREATIVE_LEVELS.map(level=>[level,0])),fury:blackRole.skill.id==='lv-bu'?1:0,actionPaid:false,turnsStarted:0,caoMode:null,caoPlacements:0,caoFirstIndex:null,caoGuixinActive:true,caoEndDraws:0}, inventory:inventoryOf(blackRole) },
      white: { roleId:whiteRole.id, skillId:whiteRole.skill.id, skillState:{placedByLevel:{},chargeByLevel:Object.fromEntries(CREATIVE_LEVELS.map(level=>[level,0])),fury:whiteRole.skill.id==='lv-bu'?1:0,actionPaid:false,turnsStarted:0,caoMode:null,caoPlacements:0,caoFirstIndex:null,caoGuixinActive:true,caoEndDraws:0}, inventory:inventoryOf(whiteRole) },
    },
    currentPlayer:'black', turn:1, phase:'main', bonusMaxRank:null, winner:null, winningLine:[], history:[], lastEffect:null,
  };
  game.gameStartQueue=['black','white'].filter(side=>game.players[side].skillId==='cao-cao');
  if(game.gameStartQueue.length){game.currentPlayer=game.gameStartQueue[0];game.phase='game-start-choice'}
  else resolveCreativeTurnStart(game);
  return game;
}

function payCreativeAction(game){const actor=game.players[game.currentPlayer];if(actor.skillId!=='lv-bu'||actor.skillState.actionPaid)return;if(actor.skillState.fury<2)throw new Error('霸气不足2点，本回合无法行动');actor.skillState.fury-=2;actor.skillState.actionPaid=true}

export function canCreativeLand(game,index,level,player=game.currentPlayer) {
  const cell=game.board[index], rank=Number(level);
  if(!cell || !CREATIVE_LEVELS.includes(rank) || game.players[player].inventory[rank]<=0) return false;
  const actor=game.players[player];
  if(actor.skillId==='duo-shi'&&rank>1&&(actor.skillState.chargeByLevel[rank]??0)<rank-1)return false;
  if(actor.skillId==='cao-cao'&&game.phase==='cao-second'&&actor.skillState.caoFirstIndex!==null){
    const firstRow=Math.floor(actor.skillState.caoFirstIndex/CREATIVE_SIZE),firstCol=actor.skillState.caoFirstIndex%CREATIVE_SIZE,row=Math.floor(index/CREATIVE_SIZE),col=index%CREATIVE_SIZE;
    if(Math.abs(row-firstRow)<=1&&Math.abs(col-firstCol)<=1)return false;
  }
  const top=topCreativePiece(cell);
  if(actor.skillId==='zhang-fei'&&rank===1&&top?.player===player)return top.level<7&&!top.suJunBoosted;
  if(actor.skillId==='cao-cao'&&actor.skillState.caoMode===1&&top?.player!==undefined&&top.player!==player)return false;
  return !top || canCreativeSuppress(game,{player,level:rank,target:top});
}

export function legalCreativePlacements(game,level) {
  if(['cao-choice','game-start-choice'].includes(game.phase))return [];
  const rank=Number(level);
  const actor=game.players[game.currentPlayer];
  if(actor.skillId==='cao-cao'&&actor.skillState.caoMode===0){
    const max=game.phase==='bonus'?game.bonusMaxRank:8,hasHand=CREATIVE_LEVELS.some(candidate=>candidate<max&&actor.inventory[candidate]>0),hasEmpty=game.board.some(cell=>cell.stack.length===0);
    return hasHand&&hasEmpty?game.board.map((_,index)=>index):[];
  }
  if(game.phase==='bonus' && rank>=game.bonusMaxRank) return [];
  return game.board.map((_,index)=>index).filter(index=>canCreativeLand(game,index,rank));
}

export function legalCreativeMoves(game,from) {
  if(['cao-choice','game-start-choice'].includes(game.phase))return [];
  if(game.players[game.currentPlayer].skillId==='cao-cao'&&game.players[game.currentPlayer].skillState.caoMode===3)return [];
  const piece=topCreativePiece(game.board[from]??{stack:[]});
  if(!piece || piece.player!==game.currentPlayer) return [];
  if(game.phase==='bonus' && piece.level>=game.bonusMaxRank) return [];
  const row=Math.floor(from/CREATIVE_SIZE),col=from%CREATIVE_SIZE,result=[];
  for(const [dr,dc] of [[-1,0],[1,0],[0,-1],[0,1]]) for(let step=1;;step++){
    const r=row+dr*step,c=col+dc*step;
    if(r<0||c<0||r>=CREATIVE_SIZE||c>=CREATIVE_SIZE) break;
    const index=r*CREATIVE_SIZE+c,top=topCreativePiece(game.board[index]);
    if(!top){result.push(index);continue}
    if(canCreativeSuppress(game,{player:piece.player,level:piece.level,target:top})) result.push(index);
    break;
  }
  return result;
}

export function findCreativeWin(board,player,required=5) {
  const dirs=[[0,1],[1,0],[1,1],[1,-1]];
  for(let r=0;r<CREATIVE_SIZE;r++) for(let c=0;c<CREATIVE_SIZE;c++) for(const [dr,dc] of dirs){
    const line=[];
    for(let step=0;step<required;step++){
      const rr=r+dr*step,cc=c+dc*step;
      if(rr<0||cc<0||rr>=CREATIVE_SIZE||cc>=CREATIVE_SIZE) break;
      const index=rr*CREATIVE_SIZE+cc;
      if(topCreativePiece(board[index])?.player!==player) break;
      line.push(index);
    }
    if(line.length===required) return line;
  }
  return [];
}

export function placeCreativePiece(state,index,level) {
  const game=clone(state),rank=Number(level),player=game.currentPlayer;
  if(game.phase==='cao-choice')throw new Error('请先完成【归心】抉择');
  if(game.phase==='game-start-choice')throw new Error('请先完成【吐哺】抉择');
  if(game.players[player].skillId==='cao-cao'&&game.players[player].skillState.caoMode===0)return placeCaoRandomPiece(game);
  if(game.winner || !legalCreativePlacements(game,rank).includes(index)) throw new Error('该等级棋子不能落在这里');
  payCreativeAction(game);
  const target=topCreativePiece(game.board[index]);
  game.players[player].inventory[rank]--;
  if(game.players[player].skillId==='duo-shi'){
    const charges=game.players[player].skillState.chargeByLevel;
    charges[rank]-=Math.max(0,rank-1);
    for(let higher=rank+1;higher<=7;higher++)charges[higher]++;
  }
  const suJunBoost=game.players[player].skillId==='zhang-fei'&&rank===1&&target?.player===player;
  const piece=suJunBoost?target:{player,level:rank};
  if(suJunBoost){target.level++;target.suJunBoosted=true}else game.board[index].stack.push(piece);
  game.history.push({type:'place',player,index,level:rank});
  resolveCreativeAfterAction(game,{player,index,action:'place',level:rank});
  if(target&&!suJunBoost)resolveCreativeSuppress(game,{player,index,piece,target});
  return finishCreativeAction(game);
}

function placeCaoRandomPiece(game){
  const player=game.currentPlayer,actor=game.players[player],max=game.phase==='bonus'?game.bonusMaxRank:8,hand=[];
  for(const level of CREATIVE_LEVELS)if(level<max)for(let count=0;count<actor.inventory[level];count++)hand.push(level);
  const empty=game.board.map((cell,index)=>cell.stack.length===0?index:null).filter(index=>index!==null);
  if(game.winner||!hand.length||!empty.length)throw new Error('【归心】没有可随机放置的手牌或空位');
  const level=hand[Math.floor(Math.random()*hand.length)],index=empty[Math.floor(Math.random()*empty.length)];
  actor.inventory[level]--;game.board[index].stack.push({player,level});game.history.push({type:'place',player,index,level,randomByCao:true});
  resolveCreativeAfterAction(game,{player,index,action:'place',level});
  const message=`【归心】随机将${level}级棋子放在第${Math.floor(index/CREATIVE_SIZE)+1}行第${index%CREATIVE_SIZE+1}列`;
  game.lastEffect=game.lastEffect?{player,skill:'cao-cao',message:`${game.lastEffect.message}；${message}`}:{player,skill:'cao-cao',message};
  return finishCreativeAction(game);
}

function creativeWinners(game){const required=Object.values(game.players).some(player=>player.skillId==='lv-bu')?6:5;return ['black','white'].map(player=>({player,line:findCreativeWin(game.board,player,required)})).filter(x=>x.line.length)}
function finishCreativeAction(game,revealedPlayer=null){let winners=creativeWinners(game);if(winners.length){const chosen=winners.find(x=>x.player===revealedPlayer)??winners.find(x=>x.player===game.currentPlayer)??winners[0];game.winner=chosen.player;game.winningLine=chosen.line;return game}game.phase='main';game.bonusMaxRank=null;const actor=game.players[game.currentPlayer];if(actor.skillId==='lv-bu'&&game.board.some(cell=>{const p=topCreativePiece(cell);return p?.player===game.currentPlayer&&p.level>=5})){game.phase='lvbu-end';return game}if(game.pendingCaoSecond){game.pendingCaoSecond=false;game.phase='cao-second';return game}if(game.pendingExtraAction){game.pendingExtraAction=false;game.phase='zhangfei-bonus';return game}resolveCreativeTurnEnd(game);winners=creativeWinners(game);if(winners.length){const chosen=winners.find(x=>x.player===game.currentPlayer)??winners[0];game.winner=chosen.player;game.winningLine=chosen.line;return game}return advanceCreativeTurn(game)}
function advanceCreativeTurn(game){game.phase='main';game.currentPlayer=other(game.currentPlayer);game.turn++;resolveCreativeTurnStart(game);return game}
export function moveCreativePiece(state,from,to){const game=clone(state);if(game.winner||!legalCreativeMoves(game,from).includes(to))throw new Error('只能沿无阻挡的横线或竖线移动');payCreativeAction(game);const target=topCreativePiece(game.board[to]);const mover=game.board[from].stack.pop(),movedLevel=mover.level,revealedPlayer=topCreativePiece(game.board[from])?.player??null;game.board[to].stack.push(mover);game.history.push({type:'move',player:game.currentPlayer,from,to,level:mover.level});resolveCreativeAfterAction(game,{player:game.currentPlayer,index:to,action:'move'});if(target)resolveCreativeSuppress(game,{player:game.currentPlayer,index:to,piece:mover,target});if(movedLevel===7)resolveZhaoSevenMove(game,{player:game.currentPlayer,from});return finishCreativeAction(game,revealedPlayer)}
export function recycleCreativePiece(state,index){const game=clone(state),actor=game.players[game.currentPlayer];if(actor.skillId==='cao-cao'&&actor.skillState.caoMode===3)throw new Error('【归心】本回合不能移动或回收');if(game.winner||!['main','zhangfei-bonus'].includes(game.phase))throw new Error('现在不能回收');const piece=topCreativePiece(game.board[index]??{stack:[]});if(!piece||piece.player!==game.currentPlayer)throw new Error('只能回收己方顶层棋子');payCreativeAction(game);game.board[index].stack.pop();const returnedLevel=resolveCreativeRecycle(game,{player:game.currentPlayer,piece});if(returnedLevel>0)game.players[game.currentPlayer].inventory[Math.min(7,returnedLevel)]++;game.history.push({type:'recycle',player:game.currentPlayer,index,level:piece.level,returnedLevel});const revealedPlayer=topCreativePiece(game.board[index])?.player??null,winners=creativeWinners(game);if(winners.length){const chosen=winners.find(x=>x.player===revealedPlayer)??winners[0];game.winner=chosen.player;game.winningLine=chosen.line}else if(piece.level>1){game.phase='bonus';game.bonusMaxRank=piece.level}else finishCreativeAction(game);return game}
export function skipCreativeBonus(state){const game=clone(state);if(game.phase!=='bonus')throw new Error('当前没有追加行动');return finishCreativeAction(game)}
export function skipZhangFeiBonus(state){const game=clone(state);if(game.phase!=='zhangfei-bonus')throw new Error('当前没有狂啸追加行动');resolveCreativeTurnEnd(game);return advanceCreativeTurn(game)}
export function skipCaoSecond(state){const game=clone(state);if(game.phase!=='cao-second'||game.players[game.currentPlayer].skillId!=='cao-cao')throw new Error('当前没有曹操的第二次放置');resolveCreativeTurnEnd(game);return advanceCreativeTurn(game)}
export function resolveCaoGuixinChoice(state,choice){
  const game=clone(state),actor=game.players[game.currentPlayer];
  if(game.phase!=='cao-choice'||actor.skillId!=='cao-cao')throw new Error('当前没有【归心】抉择');
  if(choice==='abandon'){
    for(let level=1;level<=4;level++)actor.inventory[level]=0;
    actor.skillState.caoGuixinActive=false;
    actor.skillState.caoMode=null;
    game.lastEffect={player:game.currentPlayer,skill:'cao-cao',message:'【归心】失去手中全部1～4级棋子，并永久失去【归心】'};
  }else if(choice==='promote'){
    const count=actor.inventory[5];actor.inventory[5]=0;actor.inventory[6]+=count;
    game.lastEffect={player:game.currentPlayer,skill:'cao-cao',message:`【归心】将手中${count}枚5级棋子全部升为6级`};
  }else throw new Error('无效的【归心】抉择');
  game.phase='main';
  return game;
}
export function resolveCaoTuBu(state,choice){
  const game=clone(state),actor=game.players[game.currentPlayer];
  if(game.phase!=='game-start-choice'||actor.skillId!=='cao-cao')throw new Error('当前没有【吐哺】抉择');
  if(choice==='five')actor.inventory[5]++;
  else if(choice==='fours')actor.inventory[4]+=2;
  else throw new Error('无效的【吐哺】抉择');
  game.lastEffect={player:game.currentPlayer,skill:'cao-cao',message:choice==='five'?'【吐哺】获得1枚5级棋子':'【吐哺】获得2枚4级棋子'};
  game.gameStartQueue.shift();
  if(game.gameStartQueue.length){game.currentPlayer=game.gameStartQueue[0];game.phase='game-start-choice'}
  else{game.currentPlayer='black';game.phase='main';resolveCreativeTurnStart(game)}
  return game;
}
export function resolveLvBuEnd(state,index=null){const game=clone(state),actor=game.players[game.currentPlayer];if(game.phase!=='lvbu-end'||actor.skillId!=='lv-bu')throw new Error('当前不能发动单三');if(index!==null){const piece=topCreativePiece(game.board[index]??{stack:[]});if(!piece||piece.player!==game.currentPlayer||piece.level<5)throw new Error('请选择己方一枚5级以上顶层棋子');const destroyedLevel=piece.level,rewardLevel=destroyedLevel-4;game.board[index].stack.length=0;actor.inventory[rewardLevel]+=2;actor.skillState.fury=Math.min(3,actor.skillState.fury+1);game.lastEffect={player:game.currentPlayer,skill:'lv-bu',message:`【单三】摧毁整叠${destroyedLevel}级顶层棋子，获得两枚${rewardLevel}级棋子，霸气恢复至${actor.skillState.fury}点`}}return advanceCreativeTurn(game)}
export function skipLvBuNoAction(state){const game=clone(state);if(game.phase!=='no-action'||game.players[game.currentPlayer].skillId!=='lv-bu')throw new Error('当前无需结束空回合');return advanceCreativeTurn(game)}
