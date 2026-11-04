import { LevelOutcome, LevelStats } from '../analytics';

// =====================================================================
//  Достижения (с 0.9). Это данные для гейм-дизайнера, как settings.ts:
//  название, за что оно и условие. Условие проверяется в конце уровня
//  (GameScene, переход PLAYING → RESULT). Полученные достижения хранит save.ts.
// =====================================================================

// Чем кончился уровень — по этому проверяются условия достижений.
// levelIndex — номер уровня в LEVELS (с нуля), outcome — итог, stats — статистика уровня,
// hasWolves — были ли на уровне волки.
export type LevelEnd = { levelIndex: number; outcome: LevelOutcome; stats: LevelStats; hasWolves: boolean };

// Одно достижение: id (хранится в сохранении — не менять!), название на плашке,
// за что оно и условие получения.
export type Achievement = { id: string; name: string; text: string; isEarned: (end: LevelEnd) => boolean };

// «Рыбак»: сколько путников накормить рыбой за один уровень.
export const FISHER_COUNT = 5;

// Победа на уровне — рассвет после последней ночи или мамонт повержен.
function isWin(end: LevelEnd): boolean {
  return end.outcome === 'dawn' || end.outcome === 'bossDefeated';
}

// Достижения каменного века (раздел 5 плана).
export const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'firstSupper',
    name: 'Первый ужин',
    text: 'Пройди уровень 1',
    isEarned: (end) => isWin(end) && end.levelIndex === 0,
  },
  {
    id: 'noCrumbsForWolves',
    name: 'Ни крошки волкам',
    text: 'Пройди уровень с волками без единой кражи',
    isEarned: (end) => isWin(end) && end.hasWolves && end.stats.itemsStolen === 0,
  },
  {
    id: 'fisher',
    name: 'Рыбак',
    text: 'Накорми рыбой ' + FISHER_COUNT + ' путников за уровень',
    isEarned: (end) => end.stats.fishFed >= FISHER_COUNT,
  },
  {
    id: 'mammothSlayer',
    name: 'Победитель мамонта',
    text: 'Победи мамонта',
    isEarned: (end) => end.outcome === 'bossDefeated',
  },
];
