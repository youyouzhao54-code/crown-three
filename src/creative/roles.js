export const CREATIVE_ROLES = Object.freeze([
  {
    id: 'liu-san-dao', name: '刘三刀', title: '悍将', faction: '群雄',
    description: '我部悍将刘三刀，擅长通过快速获取高级棋子形成突破胜利。',
    inventory: { 1: 16, 2: 8, 3: 4, 4: 2, 5: 1, 6: 0, 7: 0 },
    skill: { id: 'duo-shi', name: '夺势 · 连势', description: '【夺势】放置或移动形成二、三、四、五连时，分别获得一枚2、3、4、5级棋子；同时形成多种连线时只取最高。【连势】累计放置1枚1级棋子后才能放置2级，放置2枚2级后才能放置3级，依此类推。', hooks: { afterPlace:true, afterMove:true, canPlace:true } },
  },
  {
    id: 'zhao-yun', name: '赵云', title: '常山龙胆', faction: '蜀',
    description: '擅长防守反击，深入敌营，一击制胜。',
    inventory: { 1: 64, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 1 },
    skill: { id: 'zhao-yun', name: '陷阵 · 愈厉', description: '【陷阵】放置后按周围敌棋数升级；回收时降2级。【愈厉】每累计放置两枚同级棋子，获得一枚高一级棋子。', hooks: { afterPlace:true, onRecycle:true } },
  },
  {
    id: 'lu-xun', name: '陆逊', title: '儒将', faction: '吴',
    description: '东隅已逝，桑榆非晚。',
    inventory: { 1: 3, 2: 2, 3: 1, 4: 0, 5: 0, 6: 0, 7: 0 },
    skill: { id: 'lu-xun', name: '谦节 · 逊礼', description: '【谦节】奇数棋子不能压制，偶数棋子不能被压制。【逊礼】回合开始时，盘面数量或等级总和落后便获得对应随机棋子。', hooks: { canSuppress:true, onTurnStart:true } },
  },
  {
    id: 'lv-bu', name: '吕布', title: '飞将', faction: '群雄',
    description: '虎牢霸关，举世无双。以霸气驱动强攻，在压制中愈战愈强。',
    inventory: { 1: 0, 2: 2, 3: 3, 4: 4, 5: 0, 6: 0, 7: 0 },
    skill: { id: 'lv-bu', name: '霸关 · 单三', description: '【霸关】本局双方需要六连才能胜利；吕布可压制同级棋子，压制后己方+1级、敌方-1级，敌棋须高2级才能压制吕布。【单三】行动消耗2点霸气；回合末可摧毁一枚5级棋子，获得两枚1级棋子及1点霸气。', hooks: { canSuppress:true, afterSuppress:true, onTurnStart:true, onTurnEnd:true } },
  },
]);

export const getRole = id => CREATIVE_ROLES.find(role => role.id === id);
