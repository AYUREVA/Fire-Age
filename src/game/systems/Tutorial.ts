import Phaser from 'phaser';
import { Point } from '../fx';
import { Player } from '../objects/Player';
import { Backpack } from '../objects/Backpack';
import { ResourceNode } from '../objects/ResourceNode';
import { Rabbit } from '../objects/Rabbit';
import { ItemPile } from '../objects/ItemPile';
import { StoneTable } from '../objects/StoneTable';
import { TutorialHint } from '../ui/TutorialHint';
import { LevelStats } from '../analytics';

// =====================================================================
//  Обучение на первом уровне: шаги со стрелками-подсказками (раздел 4 плана).
//
//  Это функция, а не класс: подсказка и нужные объекты приходят аргументами,
//  своего состояния здесь нет. Номер шага хранит подсказка (TutorialHint).
//  GameScene вызывает updateTutorial каждый кадр, если на уровне есть обучение.
// =====================================================================

// Всё, на что смотрит обучение: где цели и выполнен ли шаг.
export type TutorialWorld = {
  player: Player;
  backpack: Backpack;
  bushes: ResourceNode[];
  rabbits: Rabbit[];
  woodpile: ItemPile;
  rawMeatPile: ItemPile;
  cookedMeatPile: ItemPile;
  table: StoneTable;
  stats: LevelStats;
};

// Шаг обучения: текст на плашке, куда показывает стрелка и когда шаг выполнен.
type TutorialStep = {
  text: string;
  target: (world: TutorialWorld) => Point;
  isDone: (world: TutorialWorld) => boolean;
};

// Шаги по порядку: «Сруби куст» → «Отнеси к костру» → «Поймай кролика»
// → «Пожарь мясо» → «Отнеси на стол» → «Собери клыки».
const STEPS: TutorialStep[] = [
  {
    text: 'Сруби куст',
    target: (world) => nearest(world.player, world.bushes.filter((bush) => bush.hasStock())),
    isDone: (world) => world.backpack.has('wood'),
  },
  {
    // Хворост на спине кончился — всё отнесено в поленницу.
    text: 'Отнеси хворост к костру',
    target: (world) => world.woodpile,
    isDone: (world) => !world.backpack.has('wood'),
  },
  {
    text: 'Поймай кролика',
    target: (world) => nearest(world.player, world.rabbits.filter((rabbit) => rabbit.isCatchable())),
    isDone: (world) => world.backpack.has('rawMeat'),
  },
  {
    // Пока мясо на спине — к куче сырого, потом — к куче жареного: ждать, пока пожарится.
    text: 'Пожарь мясо',
    target: (world) => (world.backpack.has('rawMeat') ? world.rawMeatPile : world.cookedMeatPile),
    isDone: (world) => world.stats.meatCooked > 0,
  },
  {
    // Пока жареного на спине нет — к куче жареного, потом — на площадку над столом.
    text: 'Отнеси мясо на стол',
    target: (world) => (world.backpack.has('cookedMeat') ? world.table.getZonePoint() : world.cookedMeatPile),
    isDone: (world) => world.table.has('cookedMeat') || world.stats.fed > 0,
  },
  {
    // Клыки летят в счётчик, пока вождь стоит на площадке над столом.
    text: 'Собери клыки',
    target: (world) => world.table.getZonePoint(),
    isDone: (world) => world.player.tusks > 0,
  },
];

// Шаг выполнен — следующий; иначе стрелка показывает на цель шага.
export function updateTutorial(hint: TutorialHint, world: TutorialWorld, delta: number): void {
  if (hint.isDone()) return;

  const step = STEPS[hint.step];
  if (step.isDone(world)) {
    hint.nextStep(STEPS.length);
    return;
  }
  hint.show(step.text, step.target(world), delta);
}

// Ближайшая к вождю точка из списка. Список пуст — вождь сам (стрелка над ним).
function nearest(player: Player, points: Point[]): Point {
  let best: Point = player;
  let bestDistance = Infinity;
  for (const point of points) {
    const distance = Phaser.Math.Distance.Between(player.x, player.y, point.x, point.y);
    if (distance < bestDistance) {
      best = point;
      bestDistance = distance;
    }
  }
  return best;
}
