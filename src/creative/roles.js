export const CREATIVE_ROLES = Object.freeze([
  {
    id: 'liu-san-dao', name: '刘三刀', title: '悍将', faction: '群雄',
    art: { avatar:'./public/images/generals/avatars/liu-san-dao-v1.png', skin:'./public/images/generals/skins/liu-san-dao-v1.png' },
    description: '我部悍将刘三刀，擅长通过快速获取高级棋子形成突破胜利。',
    inventory: { 1: 16, 2: 8, 3: 4, 4: 2, 5: 1, 6: 0, 7: 0 },
    skill: { id: 'duo-shi', name: '夺势 · 蓄势', description: '【夺势】放置或移动形成二、三、四、五连时，分别获得一枚2、3、4、5级棋子；同时形成多种连线时只取最高。【蓄势】1级无需充能；放置N级棋子需要并消耗N-1点对应等级充能，随后所有更高等级各获得1点充能。各等级充能独立且无上限。', hooks: { afterPlace:true, afterMove:true, canPlace:true } },
  },
  {
    id: 'zhao-yun', name: '赵云', title: '常山龙胆', faction: '蜀',
    art: { avatar:'./public/images/generals/avatars/zhao-yun-v1.png', skin:'./public/images/generals/skins/zhao-yun-v1.png' },
    description: '擅长防守反击，深入敌营，一击制胜。',
    inventory: { 1: 64, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0 },
    skill: { id: 'zhao-yun', name: '陷阵 · 愈厉 · 携幼', description: '【陷阵】放置后按周围敌棋数升级；回收时降2级。【愈厉】每累计放置两枚同级棋子，获得一枚高一级棋子。【携幼】首回合在随机空位生成己方7级棋子；移动该棋子后，原位为空则放置1级棋子，否则令显露棋子+1级并返回其拥有者手中。', hooks: { afterPlace:true, afterMove:true, onRecycle:true, onTurnStart:true } },
  },
  {
    id: 'lu-xun', name: '陆逊', title: '儒将', faction: '吴',
    art: { avatar:'./public/images/generals/avatars/lu-xun-v1.png', skin:'./public/images/generals/skins/lu-xun-v1.png' },
    description: '东隅已逝，桑榆非晚。',
    inventory: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0 },
    skill: { id: 'lu-xun', name: '谦节 · 逊礼', description: '【谦节】自己的奇数回合获得两枚1级棋子，偶数回合获得一枚2级棋子；奇数棋可无视等级压制敌方偶数棋，偶数棋不能被敌方奇数棋压制。【逊礼】回合结束时，若可见棋子数量落后，则随机将一枚手中棋子置入随机空位（不算放置）；若可见等级总和落后，则随机使手中一枚不高于6级的棋子+1级。', hooks: { canSuppress:true, onTurnStart:true, onTurnEnd:true } },
  },
  {
    id: 'lv-bu', name: '吕布', title: '飞将', faction: '群雄',
    art: { avatar:'./public/images/generals/avatars/lv-bu-v1.png', skin:'./public/images/generals/skins/lv-bu-v1.png' },
    description: '虎牢霸关，举世无双。以霸气驱动强攻，在压制中愈战愈强。',
    inventory: { 1: 0, 2: 2, 3: 3, 4: 4, 5: 0, 6: 0, 7: 0 },
    skill: { id: 'lv-bu', name: '霸关 · 单三', description: '【霸关】本局双方需要六连才能胜利；吕布可压制同级棋子，压制后己方+1级、敌方-1级，敌棋须高2级才能压制吕布。【单三】回合结束或霸气不足时，可摧毁己方一整叠5级以上顶层棋子；若其等级为X，获得两枚X-4级棋子并恢复1点霸气。', hooks: { canSuppress:true, afterSuppress:true, onTurnStart:true, onTurnEnd:true } },
  },
  {
    id: 'zhang-fei', name: '张飞', title: '燕人', faction: '蜀',
    art: { avatar:'./public/images/generals/avatars/zhang-fei-v1.png', skin:'./public/images/generals/skins/zhang-fei-v1.png' },
    description: '一声狂啸震军心，进退之间自有章法。',
    inventory: { 1: 12, 2: 3, 3: 1, 4: 0, 5: 1, 6: 0, 7: 0 },
    skill: { id: 'zhang-fei', name: '狂啸 · 肃军', description: '【狂啸】放置1级棋子后，随机使手中一枚棋子+1级；若己方可见棋子数较少，可继续行动。【肃军】回收2级以上棋子时将其摧毁并获得等同其等级数量的1级棋子；1级棋子可强化己方棋子使其+1级，每枚盘面棋子仅限一次。', hooks: { afterPlace:true, onRecycle:true, canPlace:true } },
  },
  {
    id: 'cao-cao', name: '曹操', title: '魏武', faction: '魏',
    art: { avatar:'./public/images/generals/avatars/cao-cao-v1.png', skin:'./public/images/generals/skins/cao-cao-v1.png' },
    description: '治世之能臣，乱世之奸雄。善借敌势，因心而变。',
    inventory: { 1: 18, 2: 6, 3: 0, 4: 0, 5: 1, 6: 0, 7: 0 },
    skill: { id: 'cao-cao', name: '奸雄 · 归心 · 吐哺', description: '【奸雄】己方棋子被压制时，获得一枚与压制棋子同级的棋子（最高按5级）；曹操压制敌棋时，被压制棋子返回对手手中。【归心】回合开始按手中5级棋子数改变规则：0枚随机放置，回合末升级1～4级中最高者；1枚不能通过放置压制；2枚获得1级；3枚可放置两次且回合末收回最高盘面棋；4枚失去1级并升级1～4级中最低者；5枚以上使永久回合末随机获取次数+1，并选择失去全部1～4级与归心，或将全部5级升为6级。【吐哺】对局开始时选择获得一枚5级或两枚4级棋子。', hooks: { canSuppress:true, afterSuppress:true, onGameStart:true, onTurnStart:true, onTurnEnd:true } },
  },
]);

export const getRole = id => CREATIVE_ROLES.find(role => role.id === id);
