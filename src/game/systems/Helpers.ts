import Phaser from 'phaser';
import { DROP_INTERVAL, HELPER_REACH } from '../settings';
import { Point } from '../fx';
import { Helper } from '../objects/Helper';
import { ResourceNode } from '../objects/ResourceNode';
import { ItemPile } from '../objects/ItemPile';
import { Fence } from '../objects/Fence';
import { LevelStats } from '../analytics';

// =====================================================================
//  Помощники (с 0.8): сборщик рубит кусты и носит хворост в поленницу.
//
//  Это функции, а не класс: помощники и всё, с чем они работают, приходят
//  аргументами, своего состояния здесь нет. Состояние автомата, маршрут,
//  таймер ударов и стопку хранит сам помощник (Helper).
//  Каждый кадр для каждого нанятого помощника: по его состоянию решаем,
//  что делать дальше, и зовём переход автомата.
//    ищет → идёт → действует → несёт → сдаёт → снова ищет.
// =====================================================================

// Сдавая в кучу, помощник встаёт чуть ниже её середины — перед кучей, а не в ней.
const PILE_STAND_SHIFT_Y = 40;

// С чем работают помощники. GameScene собирает это каждый кадр.
export type HelperWorld = {
  bushes: ResourceNode[];
  woodpile: ItemPile;
  fence: Fence;
  stats: LevelStats;
};

// Каждый кадр: автомат каждого нанятого помощника, потом его шаг и вид.
export function updateHelpers(helpers: Helper[], world: HelperWorld, delta: number): void {
  for (const helper of helpers) {
    if (!helper.isHired()) continue;
    updateGatherer(helper, world, delta);
    helper.update(delta);
  }
}

// ===== Сборщик =====

// Сборщик: ближайший куст с хворостом → рубит, пока стопка не полная или куст не кончился →
// несёт в главную поленницу → сдаёт по одной связке → снова ищет.
function updateGatherer(helper: Helper, world: HelperWorld, delta: number): void {
  switch (helper.getState()) {
    case 'seeking': {
      const bush = findBush(helper, world.bushes);
      // Стопка полная — или кустов с хворостом нет, а что-то уже набрано, — несёт сдавать.
      if (helper.isCarryFull() || (!bush && !helper.isCarryEmpty())) {
        helper.carryTo(world.fence.getRoute(helper, pileStandPoint(world.woodpile)));
      } else if (bush) {
        helper.walkTo(world.fence.getRoute(helper, standPoint(bush, helper)));
      }
      return;
    }
    case 'walking': {
      // Куст, к которому он идёт, могли вырубить (вождь) — ищет другой.
      const bush = world.bushes.find((each) => each.hasStock() && isNear(each, helper.getDestination()));
      if (!bush) {
        helper.seek();
      } else if (helper.isArrived()) {
        helper.act();
      }
      return;
    }
    case 'acting':
      chopBush(helper, world, delta);
      return;
    case 'carrying':
      if (helper.isArrived()) helper.drop();
      return;
    case 'dropping':
      dropInto(helper, world.woodpile, delta);
      return;
  }
}

// Рубит куст рядом: раз в свой интервал удара — взмах, связка летит в его стопку.
// Куст кончился или стопка полная — снова ищет (а там — несёт сдавать).
function chopBush(helper: Helper, world: HelperWorld, delta: number): void {
  const bush = world.bushes.find((each) => each.hasStock() && isNear(each, helper));
  if (!bush || helper.isCarryFull()) {
    helper.seek();
    return;
  }

  helper.actTimer += delta;
  if (helper.actTimer < helper.info.hitInterval || helper.isSwinging()) return;
  helper.actTimer = 0;

  helper.swing(bush.x, helper.info.hitInterval, () => {
    // Пока он замахивался, куст мог вырубить вождь.
    if (!bush.hasStock()) return;
    bush.hit();
    helper.addToCarry(bush.getLootPoint());
    world.stats.woodGathered += 1;
  });
}

// ===== Общее для всех помощников =====

// Сдаёт добытое в кучу: раз в DROP_INTERVAL мс верхний предмет летит из стопки в кучу.
// Куча полная — ждёт рядом. Стопка опустела — снова ищет работу.
function dropInto(helper: Helper, pile: ItemPile, delta: number): void {
  if (helper.isCarryEmpty()) {
    helper.seek();
    return;
  }

  helper.actTimer += delta;
  if (helper.actTimer < DROP_INTERVAL || pile.isFull()) return;
  helper.actTimer = 0;

  // Верхний предмет может ещё лететь на спину — тогда сдаст в следующий раз.
  const item = helper.takeFromCarry();
  if (item) pile.receive(item);
}

// Где встать, чтобы сдавать в кучу pile.
function pileStandPoint(pile: ItemPile): Point {
  return { x: pile.x, y: pile.y + PILE_STAND_SHIFT_Y };
}

// Ближайший к помощнику куст с хворостом, не дальше того, что он видит. Нет — undefined.
function findBush(helper: Helper, bushes: ResourceNode[]): ResourceNode | undefined {
  let nearest: ResourceNode | undefined;
  let nearestDistance = helper.info.sight;
  for (const bush of bushes) {
    if (!bush.hasStock()) continue;
    const distance = Phaser.Math.Distance.BetweenPoints(helper, bush);
    if (distance <= nearestDistance) {
      nearest = bush;
      nearestDistance = distance;
    }
  }
  return nearest;
}

// Где встать, чтобы работать с целью target: на расстоянии HELPER_REACH от неё,
// со стороны, откуда помощник подходит.
function standPoint(target: Point, helper: Point): Point {
  const angle = Phaser.Math.Angle.BetweenPoints(target, helper);
  return { x: target.x + Math.cos(angle) * HELPER_REACH, y: target.y + Math.sin(angle) * HELPER_REACH };
}

// Достаёт ли помощник до цели из точки point (с небольшим запасом).
function isNear(target: Point, point: Point): boolean {
  return Phaser.Math.Distance.BetweenPoints(target, point) <= HELPER_REACH + 1;
}
