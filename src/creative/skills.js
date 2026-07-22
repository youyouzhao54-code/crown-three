const CREATIVE_SIZE=9;
const topPiece=cell=>cell.stack.at(-1)??null;

function contiguousLength(board,index,player,[dr,dc]){
  const row=Math.floor(index/CREATIVE_SIZE),col=index%CREATIVE_SIZE;
  let total=1;
  for(const sign of [-1,1]) for(let step=1;;step++){
    const r=row+dr*step*sign,c=col+dc*step*sign;
    if(r<0||c<0||r>=CREATIVE_SIZE||c>=CREATIVE_SIZE)break;
    if(topPiece(board[r*CREATIVE_SIZE+c])?.player!==player)break;
    total++;
  }
  return total;
}

export function longestLineThrough(board,index,player){
  return Math.max(...[[0,1],[1,0],[1,1],[1,-1]].map(direction=>contiguousLength(board,index,player,direction)));
}

export function resolveCreativeAfterAction(game,{player,index,action,level}){
  game.lastEffect=null;
  const actor=game.players[player],messages=[];
  if(actor.skillId==='duo-shi'&&['place','move'].includes(action)){
    const length=longestLineThrough(game.board,index,player);
    const lvBuBattle=Object.values(game.players).some(contender=>contender.skillId==='lv-bu');
    if(length>=2&&(length<=4||length===5&&lvBuBattle)){const rewardLevel=length-1;actor.inventory[rewardLevel]++;messages.push(`【夺势】形成${length}连，获得1枚${rewardLevel}级棋子`)}
  }
  if(actor.skillId==='zhao-yun'&&action==='place'){
    const row=Math.floor(index/CREATIVE_SIZE),col=index%CREATIVE_SIZE;
    let enemies=0;
    for(let dr=-1;dr<=1;dr++)for(let dc=-1;dc<=1;dc++)if(dr||dc){const r=row+dr,c=col+dc;if(r>=0&&c>=0&&r<CREATIVE_SIZE&&c<CREATIVE_SIZE&&topPiece(game.board[r*CREATIVE_SIZE+c])?.player!==undefined&&topPiece(game.board[r*CREATIVE_SIZE+c])?.player!==player)enemies++}
    const placed=topPiece(game.board[index]),before=placed.level;
    placed.level=Math.min(7,placed.level+enemies);
    if(placed.level>before)messages.push(`【陷阵】邻近${enemies}枚敌棋，${before}级升至${placed.level}级`);
    const counts=actor.skillState.placedByLevel,placedLevel=Number(level);
    counts[placedLevel]=(counts[placedLevel]??0)+1;
    if(counts[placedLevel]>=2){counts[placedLevel]-=2;if(placedLevel<7){actor.inventory[placedLevel+1]++;messages.push(`【愈厉】累计放置两枚${placedLevel}级棋子，获得1枚${placedLevel+1}级棋子`)}}
  }
  if(messages.length)game.lastEffect={player,skill:actor.skillId,messages,message:messages.join('；')};
  return game;
}

export function resolveCreativeRecycle(game,{player,piece}){
  game.lastEffect=null;
  let returnedLevel=piece.level;
  if(game.players[player].skillId==='zhao-yun'){
    returnedLevel=piece.level-2;
    game.lastEffect={player,skill:'zhao-yun',message:returnedLevel<=0?`【陷阵】${piece.level}级棋子回收后降至${returnedLevel}级并消失`:`【陷阵】${piece.level}级棋子回收后变为${returnedLevel}级`};
  }
  return returnedLevel;
}

export function canCreativeSuppress(game,{player,level,target}){
  if(!target||target.player===player)return false;
  if(game.players[target.player].skillId==='lv-bu'&&level<target.level+2)return false;
  if(game.players[player].skillId==='lv-bu')return level>=target.level;
  if(level<=target.level)return false;
  if(game.players[player].skillId==='lu-xun'&&level%2===1)return false;
  if(game.players[target.player].skillId==='lu-xun'&&target.level%2===0)return false;
  return true;
}

export function resolveCreativeSuppress(game,{player,index,piece,target}){
  if(game.players[player].skillId!=='lv-bu')return;
  piece.level=Math.min(7,piece.level+1);
  target.level--;
  if(target.level<=0){
    const stack=game.board[index].stack,indexOfTarget=stack.indexOf(target);
    if(indexOfTarget>=0)stack.splice(indexOfTarget,1);
  }
  game.lastEffect={player,skill:'lv-bu',message:`【霸关】压制成功，吕布棋子升至${piece.level}级，敌棋${target.level<=0?'消失':`降至${target.level}级`}`};
}

export function visibleCreativeStats(game,player){
  const pieces=game.board.map(cell=>topPiece(cell)).filter(piece=>piece?.player===player);
  return {count:pieces.length,totalLevel:pieces.reduce((sum,piece)=>sum+piece.level,0)};
}

export function resolveCreativeTurnStart(game,rng=Math.random){
  const player=game.currentPlayer,actor=game.players[player];
  actor.skillState.actionPaid=false;
  if(actor.skillId==='lv-bu'&&!game.winner){
    actor.skillState.fury=Math.min(3,(actor.skillState.fury??1)+1);
    if(actor.skillState.fury<2)game.phase='no-action';
    const message=`【单三】回合开始，霸气恢复至${actor.skillState.fury}点`;
    game.lastEffect=game.lastEffect?{player,skill:'lv-bu',message:`${game.lastEffect.message}；${message}`}:{player,skill:'lv-bu',message};
    return game;
  }
  if(actor.skillId!=='lu-xun'||game.winner)return game;
  const enemy=player==='black'?'white':'black',mine=visibleCreativeStats(game,player),theirs=visibleCreativeStats(game,enemy),rewards=[];
  if(mine.count<theirs.count){const pool=[1,3,5],level=pool[Math.floor(rng()*pool.length)];actor.inventory[level]++;rewards.push(`${level}级奇数棋子`)}
  if(mine.totalLevel<theirs.totalLevel){const pool=[2,4],level=pool[Math.floor(rng()*pool.length)];actor.inventory[level]++;rewards.push(`${level}级偶数棋子`)}
  if(rewards.length){const message=`【逊礼】盘面处于劣势，获得${rewards.join('与')}`;game.lastEffect=game.lastEffect?{player,skill:'lu-xun',message:`${game.lastEffect.message}；${message}`}:{player,skill:'lu-xun',message}}
  return game;
}
