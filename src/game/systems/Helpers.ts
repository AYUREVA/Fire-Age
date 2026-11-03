import Phaser from 'phaser';
import {
  DROP_INTERVAL,
  FENCE_RECT,
  HELPER_REACH,
  HUNTER_PATROL_POINTS,
  HUNTER_PATROL_RADIUS_X,
  HUNTER_PATROL_RADIUS_Y,
} from '../settings';
import { Point } from '../fx';
import { Helper } from '../objects/Helper';
import { ResourceNode } from '../objects/ResourceNode';
import { ItemPile } from '../objects/ItemPile';
import { Fence } from '../objects/Fence';
import { Wolf } from '../objects/Wolf';
import { Rabbit } from '../objects/Rabbit';
import { Backpack } from '../objects/Backpack';
import { Mammoth } from '../objects/Mammoth';
import { LevelStats } from '../analytics';

// =====================================================================
//  Помощники (с 0.8): сборщик рубит кусты и носит хворост в поленницу,
//  охотник обходит лагерь, гонит волков и носит мясо кроликов в кучу сырого мяса.
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
// backpack — спина вождя: туда летит добыча, которую волк уронил от удара охотника.
// mammoth — мамонт на уровне с боссом (с 0.9): охотник бьёт его, когда тот устал.
export type HelperWorld = {
  bushes: ResourceNode[];
  wolves: Wolf[];
  rabbits: Rabbit[];
  woodpile: ItemPile;
  rawMeatPile: ItemPile;
  backpack: Backpack;
  fence: Fence;
  stats: LevelStats;
  mammoth?: Mammoth;
};

// Каждый кадр: автомат каждого нанятого помощника, потом его шаг и вид.
export function updateHelpers(helpers: Helper[], world: HelperWorld, delta: number): void {
  for (const helper of helpers) {
    if (!helper.isHired()) continue;
    if (helper.role === 'gatherer') {
      updateGatherer(helper, world, delta);
    } else {
      updateHunter(helper, world, delta);
    }
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

// ===== Охотник =====

// Добыча отбежала дальше HELPER_REACH × это число — охотник перестаёт бить и снова догоняет.
const STRIKE_REACH_SHARE = 1.5;

// Середина обхода — середина частокола (двора), даже если частокол ещё не построен.
const PATROL_CENTER: Point = {
  x: (FENCE_RECT.left + FENCE_RECT.right) / 2,
  y: (FENCE_RECT.top + FENCE_RECT.bottom) / 2,
};

// Охотник: видит волка — бежит и бьёт его; видит кролика — ловит и несёт мясо
// в кучу сырого мяса. Никого не видно — обходит лагерь по овалу, от точки к точке.
// Враги (уставший мамонт и волк) важнее всего: на них охотник бросается, даже если несёт мясо.
function updateHunter(helper: Helper, world: HelperWorld, delta: number): void {
  switch (helper.getState()) {
    case 'seeking': {
      const prey = findPrey(helper, world);
      // Есть мясо в стопке, а врагов рядом нет — сначала отнести.
      if (!helper.isCarryEmpty() && !isFoe(prey)) {
        helper.carryTo(world.fence.getRoute(helper, pileStandPoint(world.rawMeatPile)));
        return;
      }
      if (prey) {
        helper.walkTo(world.fence.getRoute(helper, standPoint(prey, helper)));
        return;
      }
      // Обход: следующая точка овала вокруг лагеря.
      helper.walkTo(world.fence.getRoute(helper, patrolPoint(helper.patrolIndex)));
      helper.patrolIndex = (helper.patrolIndex + 1) % HUNTER_PATROL_POINTS;
      return;
    }
    case 'walking': {
      const prey = findPrey(helper, world);
      if (!prey) {
        // Добычи не видно — идёт по обходу; дошёл до точки — выбирает следующую.
        if (helper.isArrived()) helper.seek();
      } else if (isNear(prey, helper)) {
        helper.act();
      } else {
        // Зверь бежит — цель маршрута едет за ним.
        helper.retarget(standPoint(prey, helper));
      }
      return;
    }
    case 'acting':
      strike(helper, world, delta);
      return;
    case 'carrying':
      // Несёт мясо, но рядом враг — бросается на него (потом донесёт).
      if (isFoe(findPrey(helper, world))) {
        helper.seek();
      } else if (helper.isArrived()) {
        helper.drop();
      }
      return;
    case 'dropping':
      dropInto(helper, world.rawMeatPile, delta);
      return;
  }
}

// Охотник рядом с добычей: раз в свой интервал удара — взмах.
// Волк отлетает, а когда отогнан — уходит в лес и роняет добычу, она летит вождю на спину.
// Кролик — «пуф», мясо летит охотнику в стопку. Добыча убежала или стопка полная — снова ищет.
function strike(helper: Helper, world: HelperWorld, delta: number): void {
  const prey = findPrey(helper, world);
  const isTooFar = !prey || Phaser.Math.Distance.BetweenPoints(helper, prey) > HELPER_REACH * STRIKE_REACH_SHARE;
  if (!prey || isTooFar) {
    helper.seek();
    return;
  }

  helper.actTimer += delta;
  if (helper.actTimer < helper.info.hitInterval || helper.isSwinging()) return;
  helper.actTimer = 0;

  if (prey instanceof Wolf) {
    helper.swing(prey.x, helper.info.hitInterval, () => hitWolf(helper, prey, world));
    return;
  }
  // Мамонт: урон охотника (пока охотник замахивался, мамонт мог отдохнуть — hit() это проверит).
  if (prey instanceof Mammoth) {
    helper.swing(prey.x, helper.info.hitInterval, () => prey.hit(helper.info.damage));
    return;
  }
  // Кролик замирает, охотник замахивается. В момент удара — «пуф» и мясо в стопку.
  prey.catch();
  helper.swing(prey.x, helper.info.hitInterval, () => {
    prey.poof();
    helper.addToCarry(prey.getLootPoint());
  });
}

// Удар охотника по волку — так же, как удар вождя (systems/Predators.ts).
function hitWolf(helper: Helper, wolf: Wolf, world: HelperWorld): void {
  // Пока охотник замахивался, волк мог уже убежать в лес.
  if (!wolf.canBeHit()) return;

  const result = wolf.hit(helper.info.damage, helper.x, helper.y);
  if (result.loot) {
    const from = { x: result.loot.image.x, y: result.loot.image.y };
    result.loot.image.destroy();
    world.backpack.add(result.loot.type, from);
  }
  if (result.isDriven) world.stats.wolvesDriven += 1;
}

// Кого охотник видит: уставшего мамонта, потом ближайшего волка, которого можно ударить,
// а если волков нет — ближайшего кролика, которого можно поймать (если в стопке есть место).
// Не дальше sight. Никого — undefined.
function findPrey(helper: Helper, world: HelperWorld): Wolf | Rabbit | Mammoth | undefined {
  const mammoth = world.mammoth;
  if (mammoth?.canBeHit() && Phaser.Math.Distance.BetweenPoints(helper, mammoth) <= helper.info.sight) return mammoth;
  const wolf = nearest(helper, world.wolves.filter((each) => each.canBeHit()));
  if (wolf || helper.isCarryFull()) return wolf;
  return nearest(helper, world.rabbits.filter((each) => each.isCatchable()));
}

// Враг ли добыча: волк или мамонт — на них охотник бросается, даже если несёт мясо.
function isFoe(prey: Wolf | Rabbit | Mammoth | undefined): boolean {
  return prey instanceof Wolf || prey instanceof Mammoth;
}

// Ближайшая к помощнику цель из списка, не дальше того, что он видит.
function nearest<T extends Point>(helper: Helper, targets: T[]): T | undefined {
  let found: T | undefined;
  let foundDistance = helper.info.sight;
  for (const target of targets) {
    const distance = Phaser.Math.Distance.BetweenPoints(helper, target);
    if (distance <= foundDistance) {
      found = target;
      foundDistance = distance;
    }
  }
  return found;
}

// Точка обхода номер index на овале вокруг лагеря (по часовой стрелке от правой).
function patrolPoint(index: number): Point {
  const angle = (index / HUNTER_PATROL_POINTS) * Math.PI * 2;
  return {
    x: PATROL_CENTER.x + Math.cos(angle) * HUNTER_PATROL_RADIUS_X,
    y: PATROL_CENTER.y + Math.sin(angle) * HUNTER_PATROL_RADIUS_Y,
  };
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
  return nearest(helper, bushes.filter((bush) => bush.hasStock()));
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
