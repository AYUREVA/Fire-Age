import Phaser from 'phaser';
import { Point } from '../fx';
import { Player } from '../objects/Player';
import { Backpack } from '../objects/Backpack';
import { ResourceNode } from '../objects/ResourceNode';
import { Rabbit } from '../objects/Rabbit';
import { ItemPile } from '../objects/ItemPile';
import { StoneTable } from '../objects/StoneTable';
import { Glowing, TutorialHint } from '../ui/TutorialHint';
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

// Куда показывает подсказка: точка для стрелки и что светится обводкой
// (glow нет — ничего не светится, например когда кустов с хворостом не осталось).
type HintTarget = { point: Point; glow?: Glowing };

// Шаг обучения: текст на плашке, куда показывает подсказка и когда шаг выполнен.
type TutorialStep = {
  text: string;
  target: (world: TutorialWorld) => HintTarget;
  isDone: (world: TutorialWorld) => boolean;
};

// Шаги по порядку: «Сруби куст» → «Отнеси к костру» → «Поймай кролика»
// → «Пожарь мясо» → «Отнеси на стол» → «Собери клыки».
const STEPS: TutorialStep[] = [
  {
    text: 'Сруби куст',
    target: (world) => aim(world, nearest(world.player, world.bushes.filter((bush) => bush.hasStock()))),
    isDone: (world) => world.backpack.has('wood'),
  },
  {
    // Хворост на спине кончился — всё отнесено в поленницу.
    text: 'Отнеси хворост к костру',
    target: (world) => aim(world, world.woodpile),
    isDone: (world) => !world.backpack.has('wood'),
  },
  {
    text: 'Поймай кролика',
    target: (world) => aim(world, nearest(world.player, world.rabbits.filter((rabbit) => rabbit.isCatchable()))),
    isDone: (world) => world.backpack.has('rawMeat'),
  },
  {
    // Пока мясо на спине — к куче сырого, потом — к куче жареного: ждать, пока пожарится.
    text: 'Пожарь мясо',
    target: (world) => aim(world, world.backpack.has('rawMeat') ? world.rawMeatPile : world.cookedMeatPile),
    isDone: (world) => world.stats.meatCooked > 0,
  },
  {
    // Пока жареного на спине нет — к куче жареного, потом — на площадку над столом.
    text: 'Отнеси мясо на стол',
    target: (world) => (world.backpack.has('cookedMeat') ? aimTable(world) : aim(world, world.cookedMeatPile)),
    isDone: (world) => world.table.has('cookedMeat') || world.stats.fed > 0,
  },
  {
    // Клыки летят в счётчик, пока вождь стоит на площадке над столом.
    text: 'Собери клыки',
    target: (world) => aimTable(world),
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
  const target = step.target(world);
  hint.show(step.text, target.point, target.glow, delta);
}

// Показать на предмет и подсветить его. Предмета нет — стрелка над вождём, ничего не светится.
function aim(world: TutorialWorld, object: (Point & Glowing) | undefined): HintTarget {
  return object ? { point: object, glow: object } : { point: world.player };
}

// Стрелка — над площадкой перед столом, светится та же площадка.
function aimTable(world: TutorialWorld): HintTarget {
  return { point: world.table.getZonePoint(), glow: world.table };
}

// Ближайший к вождю предмет из списка. Список пуст — undefined.
function nearest<T extends Point>(player: Player, points: T[]): T | undefined {
  let best: T | undefined;
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
