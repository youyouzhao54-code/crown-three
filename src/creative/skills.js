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
    if(length>=2&&length<=5){const rewardLevel=length;actor.inventory[rewardLevel]++;messages.push(`【夺势】形成${length}连，获得1枚${rewardLevel}级棋子`)}
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
  if(actor.skillId==='zhang-fei'&&action==='place'&&Number(level)===1){
    const hand=[];for(let rank=1;rank<=6;rank++)for(let count=0;count<(actor.inventory[rank]??0);count++)hand.push(rank);
    if(hand.length){const rank=hand[Math.floor(Math.random()*hand.length)];actor.inventory[rank]--;actor.inventory[rank+1]++;messages.push(`【狂啸】手中一枚${rank}级棋子升至${rank+1}级`)}
    const enemy=player==='black'?'white':'black';
    if(visibleCreativeStats(game,player).count<visibleCreativeStats(game,enemy).count){game.pendingExtraAction=true;messages.push('【狂啸】盘面棋子较少，可以继续行动')}
  }
  if(actor.skillId==='cao-cao'&&actor.skillState.caoMode===3&&action==='place'){
    actor.skillState.caoPlacements=(actor.skillState.caoPlacements??0)+1;
    if(actor.skillState.caoPlacements===1){actor.skillState.caoFirstIndex=index;game.pendingCaoSecond=true;messages.push('【归心】可以在非相邻位置进行第二次放置')}
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
  if(game.players[player].skillId==='zhang-fei'&&piece.level>=2){returnedLevel=0;game.players[player].inventory[1]+=piece.level;game.lastEffect={player,skill:'zhang-fei',message:`【肃军】摧毁${piece.level}级棋子，获得${piece.level}枚1级棋子`}}
  return returnedLevel;
}

export function canCreativeSuppress(game,{player,level,target}){
  if(!target||target.player===player)return false;
  if(game.players[player].skillId==='cao-cao'&&game.players[player].skillState.caoMode===1)return false;
  if(game.players[target.player].skillId==='lu-xun'&&target.level%2===0&&level%2===1)return false;
  if(game.players[target.player].skillId==='lv-bu'&&level<target.level+2)return false;
  if(game.players[player].skillId==='lv-bu')return level>=target.level;
  if(game.players[player].skillId==='lu-xun'&&level%2===1&&target.level%2===0)return true;
  if(level<=target.level)return false;
  return true;
}

export function resolveCreativeSuppress(game,{player,index,piece,target}){
  const messages=[],stack=game.board[index].stack;
  if(game.players[target.player].skillId==='cao-cao'){
    const rewardLevel=Math.min(5,piece.level);game.players[target.player].inventory[rewardLevel]++;
    messages.push(`【奸雄】获得1枚${rewardLevel}级棋子`);
  }
  if(game.players[player].skillId==='cao-cao'){
    const targetIndex=stack.indexOf(target);
    if(targetIndex>=0)stack.splice(targetIndex,1);
    game.players[target.player].inventory[target.level]++;
    messages.push(`【奸雄】被压制的${target.level}级棋子返回对手手中`);
  }
  if(game.players[player].skillId==='lv-bu'){
    piece.level=Math.min(7,piece.level+1);target.level--;
    if(target.level<=0){const targetIndex=stack.indexOf(target);if(targetIndex>=0)stack.splice(targetIndex,1)}
    messages.push(`【霸关】压制成功，吕布棋子升至${piece.level}级，敌棋${target.level<=0?'消失':`降至${target.level}级`}`);
  }
  if(messages.length)game.lastEffect={player,skill:game.players[player].skillId,message:messages.join('；')};
}

export function visibleCreativeStats(game,player){
  const pieces=game.board.map(cell=>topPiece(cell)).filter(piece=>piece?.player===player);
  return {count:pieces.length,totalLevel:pieces.reduce((sum,piece)=>sum+piece.level,0)};
}

export function resolveCreativeTurnStart(game,rng=Math.random){
  const player=game.currentPlayer,actor=game.players[player];
  actor.skillState.actionPaid=false;
  actor.skillState.turnsStarted=(actor.skillState.turnsStarted??0)+1;
  if(actor.skillId==='zhao-yun'&&actor.skillState.turnsStarted===1&&!game.winner){
    const empty=game.board.map((cell,index)=>cell.stack.length===0?index:null).filter(index=>index!==null);
    if(empty.length){const index=empty[Math.floor(rng()*empty.length)];game.board[index].stack.push({player,level:7});const message=`【携幼】在第${Math.floor(index/CREATIVE_SIZE)+1}行第${index%CREATIVE_SIZE+1}列生成7级棋子`;game.lastEffect=game.lastEffect?{player,skill:'zhao-yun',message:`${game.lastEffect.message}；${message}`}:{player,skill:'zhao-yun',message}}
  }
  if(actor.skillId==='cao-cao'&&actor.skillState.caoGuixinActive!==false&&!game.winner){
    const fiveCount=actor.inventory[5]??0,mode=Math.min(5,fiveCount);
    actor.skillState.caoMode=mode;actor.skillState.caoPlacements=0;actor.skillState.caoFirstIndex=null;
    const messages=[`【归心】手中有${fiveCount}枚5级棋子`];
    if(mode===2){actor.inventory[1]++;messages.push('获得1枚1级棋子')}
    if(mode===4){
      if(actor.inventory[1]>0){actor.inventory[1]--;messages.push('失去1枚1级棋子')}
      const highest=[4,3,2,1].find(level=>actor.inventory[level]>0);
      if(highest){actor.inventory[highest]--;actor.inventory[highest+1]++;messages.push(`手中一枚${highest}级棋子升至${highest+1}级`)}
    }
    if(mode===5){const count=actor.inventory[5];actor.inventory[5]=0;actor.inventory[6]+=count;actor.skillState.caoFinalTriggered=true;messages.push(`${count}枚5级棋子全部升为6级`)}
    game.lastEffect={player,skill:'cao-cao',message:messages.join('；')};
    if(actor.skillState.caoFinalTriggered&&actor.skillState.caoCuanHanActive!==false&&!actor.skillState.caoCuanHanResolved)game.phase='cao-choice';
  }
  if(actor.skillId==='lv-bu'&&!game.winner){
    actor.skillState.fury=Math.min(3,(actor.skillState.fury??1)+1);
    if(actor.skillState.fury<2)game.phase=game.board.some(cell=>{const piece=topPiece(cell);return piece?.player===player&&piece.level>=5})?'lvbu-end':'no-action';
    const message=`【单三】回合开始，霸气恢复至${actor.skillState.fury}点`;
    game.lastEffect=game.lastEffect?{player,skill:'lv-bu',message:`${game.lastEffect.message}；${message}`}:{player,skill:'lv-bu',message};
    return game;
  }
  if(actor.skillId!=='lu-xun'||game.winner)return game;
  const oddTurn=actor.skillState.turnsStarted%2===1,level=oddTurn?1:2,amount=oddTurn?2:1;
  actor.inventory[level]+=amount;
  const message=`【谦节】第${actor.skillState.turnsStarted}个己方回合，获得${amount}枚${level}级棋子`;
  game.lastEffect=game.lastEffect?{player,skill:'lu-xun',message:`${game.lastEffect.message}；${message}`}:{player,skill:'lu-xun',message};
  return game;
}

export function resolveCreativeTurnEnd(game,rng=Math.random){
  const player=game.currentPlayer,actor=game.players[player];
  if(actor.skillId==='cao-cao'&&actor.skillState.caoMode===3&&!game.winner){
    const visible=game.board.map((cell,index)=>({piece:topPiece(cell),index})).filter(item=>item.piece?.player===player);
    if(visible.length){const highest=Math.max(...visible.map(item=>item.piece.level)),candidates=visible.filter(item=>item.piece.level===highest),chosen=candidates[Math.floor(rng()*candidates.length)];game.board[chosen.index].stack.pop();actor.inventory[highest]++;const message=`【归心】回合结束，随机收回1枚${highest}级棋子`;game.lastEffect=game.lastEffect?{player,skill:'cao-cao',message:`${game.lastEffect.message}；${message}`}:{player,skill:'cao-cao',message}}
    return game;
  }
  if(actor.skillId!=='lu-xun'||game.winner)return game;
  const enemy=player==='black'?'white':'black',mine=visibleCreativeStats(game,player),theirs=visibleCreativeStats(game,enemy);
  const needsPiece=mine.count<theirs.count,needsLevel=mine.totalLevel<theirs.totalLevel,messages=[];
  if(needsPiece){
    const empty=game.board.map((cell,index)=>cell.stack.length===0?index:null).filter(index=>index!==null);
    const hand=[];for(let level=1;level<=7;level++)for(let count=0;count<(actor.inventory[level]??0);count++)hand.push(level);
    if(empty.length&&hand.length){const level=hand[Math.floor(rng()*hand.length)],index=empty[Math.floor(rng()*empty.length)];actor.inventory[level]--;game.board[index].stack.push({player,level});messages.push(`将手中${level}级棋子置入第${Math.floor(index/CREATIVE_SIZE)+1}行第${index%CREATIVE_SIZE+1}列`)}
  }
  if(needsLevel){
    const hand=[];for(let level=1;level<=6;level++)for(let count=0;count<(actor.inventory[level]??0);count++)hand.push(level);
    if(hand.length){const level=hand[Math.floor(rng()*hand.length)];actor.inventory[level]--;actor.inventory[level+1]++;messages.push(`手中一枚${level}级棋子升至${level+1}级`)}
  }
  if(messages.length){const message=`【逊礼】${messages.join('；')}`;game.lastEffect=game.lastEffect?{player,skill:'lu-xun',message:`${game.lastEffect.message}；${message}`}:{player,skill:'lu-xun',message}}
  return game;
}

export function resolveZhaoSevenMove(game,{player,from}){
  if(game.players[player].skillId!=='zhao-yun')return game;
  const revealed=topPiece(game.board[from]);
  if(!revealed){
    game.board[from].stack.push({player,level:1});
    resolveCreativeAfterAction(game,{player,index:from,action:'place',level:1});
    const message='【携幼】原位置为空，放置1级棋子';
    game.lastEffect=game.lastEffect?{player,skill:'zhao-yun',message:`${game.lastEffect.message}；${message}`}:{player,skill:'zhao-yun',message};
  }else{
    game.board[from].stack.pop();revealed.level=Math.min(7,revealed.level+1);game.players[revealed.player].inventory[revealed.level]++;
    game.lastEffect={player,skill:'zhao-yun',message:`【携幼】显露棋子升至${revealed.level}级并返回${revealed.player==='black'?'黑方':'白方'}手中`};
  }
  return game;
}
