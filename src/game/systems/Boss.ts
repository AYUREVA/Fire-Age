import Phaser from 'phaser';
import {
  MAMMOTH_CHARGE_DISTANCE,
  MAMMOTH_CHARGE_OVERSHOOT,
  MAMMOTH_HIT_RADIUS,
  MAMMOTH_HP,
  MAMMOTH_PILE_CHANCE,
  MAMMOTH_PREPARE_TIME,
  MAMMOTH_RAGE_PREPARE_TIME,
  MAMMOTH_RAGE_SHARE,
  MAMMOTH_RAGE_TIME,
  MAMMOTH_RAM_RADIUS,
  MAMMOTH_STOMP_EVERY,
  MAMMOTH_STOMP_RADIUS,
  MAMMOTH_STOMP_RANGE,
  MAMMOTH_STOMP_RECOVER,
  MAMMOTH_STOMP_WINDUP,
  MAMMOTH_TIRED_TIME,
  SPILL_PICKUP_RADIUS,
  SPILL_RADIUS,
  WORLD_EDGE,
  WORLD_HEIGHT,
  WORLD_WIDTH,
} from '../settings';
import { ITEM_ORDER, ItemType } from '../items';
import { Player } from '../objects/Player';
import { Backpack } from '../objects/Backpack';
import { ItemPile } from '../objects/ItemPile';
import { Fence } from '../objects/Fence';
import { Mammoth } from '../objects/Mammoth';
import { Loot } from '../objects/Wolf';
import { Point, flyArc } from '../fx';
import { LevelStats } from '../analytics';

// Предмет разлетается по снегу за столько мс и взлетает на такую высоту.
const SPILL_FLY_TIME = 450;
const SPILL_FLY_HEIGHT = 70;
// Ближе этого к месту удара предмет не падает — иначе он лёг бы прямо под ноги.
const SPILL_MIN_DISTANCE = 40;
// Кучу у костра таран задевает чуть дальше, чем вождя: куча широкая.
const PILE_RAM_EXTRA = 40;
// Таран кончается не ближе этого к краю поля: мамонт большой и иначе зашёл бы в ели.
const CHARGE_EDGE_MARGIN = 120;

// =====================================================================
//  Финальный бой с мамонтом (с 0.9): мамонт выбирает цель, роет копытом,
//  таранит и устаёт; вождь бьёт уставшего мамонта.
//  С 0.9.1: каждая вторая атака на вождя вблизи — топот; на половине здоровья —
//  ярость, после неё таран двойной.
//
//  Это функции, а не класс: нужные объекты приходят аргументами,
//  своего состояния здесь нет. Здоровье, состояние и таймер хранит сам мамонт.
//  GameScene вызывает эти функции каждый кадр.
// =====================================================================

// С чем мамонт имеет дело на поле: вождь и его рюкзак, кучи у главного костра (цели),
// частокол (мамонт его ломает), список предметов, рассыпанных по снегу (его хранит GameScene),
// и статистика уровня (туда считается время боя).
export type BossWorld = {
  player: Player;
  backpack: Backpack;
  piles: ItemPile[];
  fence: Fence;
  spilled: Loot[];
  stats: LevelStats;
};

// ===== Мамонт =====

// Автомат мамонта «идёт к цели → роет копытом → таранит → устал → снова идёт».
export function updateMammoth(mammoth: Mammoth, world: BossWorld, delta: number): void {
  const from = { x: mammoth.x, y: mammoth.y };
  mammoth.update(delta);
  if (mammoth.isActive()) world.stats.bossTime += delta;
  // Прошёл сквозь частокол — пролом. Таран о стену кончается: мамонт устал.
  const isWallBroken = mammoth.isActive() && world.fence.breakThrough(from, mammoth);
  if (isWallBroken && mammoth.getState() === 'charge') {
    mammoth.isSecondCharge = false;
    mammoth.tire();
  }

  switch (mammoth.getState()) {
    case 'wander':
      walkToAim(mammoth, world);
      break;
    case 'prepare': {
      const prepareTime = mammoth.isSecondCharge ? MAMMOTH_RAGE_PREPARE_TIME : MAMMOTH_PREPARE_TIME;
      if (mammoth.stateTime >= prepareTime) mammoth.charge(mammoth.chargeTo);
      break;
    }
    case 'charge':
      ram(mammoth, world);
      if (mammoth.isArrived()) endCharge(mammoth, world);
      break;
    case 'stomp':
      updateStomp(mammoth, world);
      break;
    case 'tired':
      // Здоровье упало до половины — ярость (один раз за бой).
      if (!mammoth.isEnraged && mammoth.hp <= MAMMOTH_HP * MAMMOTH_RAGE_SHARE) {
        mammoth.enrage();
      } else if (mammoth.stateTime >= MAMMOTH_TIRED_TIME) {
        chooseAim(mammoth, world);
        mammoth.wander();
      }
      break;
    case 'rage':
      if (mammoth.stateTime >= MAMMOTH_RAGE_TIME) {
        chooseAim(mammoth, world);
        mammoth.wander();
      }
      break;
  }
}

// Идёт к цели. Цели-кучи больше нет (опустела) — выбирает новую.
// Подошёл на расстояние атаки — атакует. На вождя каждая вторая атака (MAMMOTH_STOMP_EVERY) —
// топот: для него мамонт подходит ближе (MAMMOTH_STOMP_RANGE). Остальные атаки — таран.
function walkToAim(mammoth: Mammoth, world: BossWorld): void {
  if (mammoth.aim >= 0 && world.piles[mammoth.aim].isEmpty()) chooseAim(mammoth, world);
  const aim = aimPoint(mammoth, world);
  const isStompTurn = mammoth.aim < 0 && mammoth.attacks % MAMMOTH_STOMP_EVERY === MAMMOTH_STOMP_EVERY - 1;
  const range = isStompTurn ? MAMMOTH_STOMP_RANGE : MAMMOTH_CHARGE_DISTANCE;
  if (Phaser.Math.Distance.Between(mammoth.x, mammoth.y, aim.x, aim.y) > range) {
    mammoth.walkTo(aim);
    return;
  }
  if (mammoth.aim < 0) mammoth.attacks++;
  if (isStompTurn) {
    mammoth.stomp(aim.x);
  } else {
    startCharge(mammoth, world);
  }
}

// Роет копытом: цель тарана выбирается сейчас и больше не двигается — по ней на снегу
// рисуется дорожка. Дорожка идёт через вождя — над ним «!».
function startCharge(mammoth: Mammoth, world: BossWorld): void {
  const to = chargeEnd(mammoth, aimPoint(mammoth, world));
  const { player } = world;
  if (distanceToLane(player, mammoth, to) <= MAMMOTH_RAM_RADIUS) {
    mammoth.warn(player);
  }
  mammoth.prepare(to);
}

// Таран добежал. В ярости после первого тарана — сразу второй (короткое «роет»), потом устал.
function endCharge(mammoth: Mammoth, world: BossWorld): void {
  if (mammoth.isEnraged && !mammoth.isSecondCharge) {
    mammoth.isSecondCharge = true;
    startCharge(mammoth, world);
    return;
  }
  mammoth.isSecondCharge = false;
  mammoth.tire();
}

// Сколько от точки до дорожки тарана (отрезок от мамонта до to): ближайшая точка отрезка
// — проекция точки на него, обрезанная концами (share от 0 до 1).
function distanceToLane(point: Point, mammoth: Mammoth, to: Point): number {
  const dx = to.x - mammoth.x;
  const dy = to.y - mammoth.y;
  const lengthSquared = Math.max(1, dx * dx + dy * dy);
  const share = Phaser.Math.Clamp(((point.x - mammoth.x) * dx + (point.y - mammoth.y) * dy) / lengthSquared, 0, 1);
  return Phaser.Math.Distance.Between(point.x, point.y, mammoth.x + dx * share, mammoth.y + dy * share);
}

// Топот: красный круг растёт MAMMOTH_STOMP_WINDUP мс, потом удар — вождь в круге отлетает
// (стопки на спине не рассыпаются: топот мягче тарана). Ещё миг — и мамонт устал.
function updateStomp(mammoth: Mammoth, world: BossWorld): void {
  if (!mammoth.hasStomped && mammoth.stateTime >= MAMMOTH_STOMP_WINDUP) {
    mammoth.slam();
    const center = mammoth.getStompCenter();
    const { player } = world;
    if (Phaser.Math.Distance.Between(center.x, center.y, player.x, player.y) <= MAMMOTH_STOMP_RADIUS) player.knockBack(center);
  }
  if (mammoth.stateTime >= MAMMOTH_STOMP_WINDUP + MAMMOTH_STOMP_RECOVER) mammoth.tire();
}

// Выбрать цель: чаще вождь, иногда (MAMMOTH_PILE_CHANCE) — случайная непустая куча у костра.
export function chooseAim(mammoth: Mammoth, world: BossWorld): void {
  const full = world.piles.map((pile, index) => (pile.isEmpty() ? -1 : index)).filter((index) => index >= 0);
  const isPile = full.length > 0 && Math.random() < MAMMOTH_PILE_CHANCE;
  mammoth.aim = isPile ? Phaser.Utils.Array.GetRandom(full) : -1;
}

// Где цель сейчас: вождь или куча.
function aimPoint(mammoth: Mammoth, world: BossWorld): Point {
  const target = mammoth.aim >= 0 ? world.piles[mammoth.aim] : world.player;
  return { x: target.x, y: target.y };
}

// Куда кончится таран: по прямой от мамонта через цель и дальше на MAMMOTH_CHARGE_OVERSHOOT,
// но не ближе CHARGE_EDGE_MARGIN к краю поля (там лес).
function chargeEnd(mammoth: Mammoth, aim: Point): Point {
  const edge = WORLD_EDGE + CHARGE_EDGE_MARGIN;
  const distance = Math.max(1, Phaser.Math.Distance.Between(mammoth.x, mammoth.y, aim.x, aim.y));
  const length = distance + MAMMOTH_CHARGE_OVERSHOOT;
  const x = mammoth.x + ((aim.x - mammoth.x) / distance) * length;
  const y = mammoth.y + ((aim.y - mammoth.y) / distance) * length;
  return {
    x: Phaser.Math.Clamp(x, edge, WORLD_WIDTH - edge),
    y: Phaser.Math.Clamp(y, edge, WORLD_HEIGHT - edge),
  };
}

// ===== Таран =====

// Таран задел вождя (за один таран — один раз) — тот отлетает, а всё со спины разлетается по снегу.
// Задел непустую кучу у костра — она разлетается так же.
function ram(mammoth: Mammoth, world: BossWorld): void {
  const { player, backpack } = world;
  const isPlayerHit = Phaser.Math.Distance.Between(mammoth.x, mammoth.y, player.x, player.y) <= MAMMOTH_RAM_RADIUS;
  if (isPlayerHit && !mammoth.hasRammedPlayer) {
    mammoth.hasRammedPlayer = true;
    player.knockBack(mammoth);
    for (const type of ITEM_ORDER) {
      for (let image = backpack.takeTop(type); image; image = backpack.takeTop(type)) spill(type, image, player, world);
    }
  }

  for (const pile of world.piles) {
    const isPileHit = Phaser.Math.Distance.Between(mammoth.x, mammoth.y, pile.x, pile.y) <= MAMMOTH_RAM_RADIUS + PILE_RAM_EXTRA;
    if (!isPileHit) continue;
    for (let image = pile.takeTop(); image; image = pile.takeTop()) spill(pile.type, image, pile, world);
  }
}

// Предмет type вылетает из точки center и падает на снег в случайном месте рядом.
// Когда упал — попадает в список рассыпанного: теперь вождь может его подобрать.
function spill(type: ItemType, image: Phaser.GameObjects.Image, center: Point, world: BossWorld): void {
  const angle = Math.random() * Math.PI * 2;
  const distance = Phaser.Math.Between(SPILL_MIN_DISTANCE, SPILL_RADIUS);
  const spot = {
    x: Phaser.Math.Clamp(center.x + Math.cos(angle) * distance, WORLD_EDGE, WORLD_WIDTH - WORLD_EDGE),
    y: Phaser.Math.Clamp(center.y + Math.sin(angle) * distance, WORLD_EDGE, WORLD_HEIGHT - WORLD_EDGE),
  };
  flyArc(image.scene, image, {
    from: { x: image.x, y: image.y },
    target: () => spot,
    duration: SPILL_FLY_TIME,
    height: SPILL_FLY_HEIGHT,
    onLand: () => {
      image.setDepth(spot.y);
      world.spilled.push({ type, image });
    },
  });
}

// Вождь проходит рядом с рассыпанным предметом — тот летит обратно на спину,
// если колонка этого типа не полная.
export function updateSpilled(player: Player, backpack: Backpack, spilled: Loot[]): void {
  for (let i = spilled.length - 1; i >= 0; i--) {
    const { type, image } = spilled[i];
    if (backpack.isFull(type)) continue;
    if (Phaser.Math.Distance.Between(player.x, player.y, image.x, image.y) > SPILL_PICKUP_RADIUS) continue;

    const from = { x: image.x, y: image.y };
    image.destroy();
    backpack.add(type, from);
    spilled.splice(i, 1);
  }
}

// ===== Вождь бьёт мамонта =====

// Мамонт устал и рядом, а вождь не машет оружием — удар. Урон — урон оружия,
// дальность — MAMMOTH_HIT_RADIUS × дальность оружия.
export function updateMammothFight(player: Player, mammoth: Mammoth): void {
  if (player.isSwinging() || !mammoth.canBeHit()) return;
  const weapon = player.getWeapon();
  if (Phaser.Math.Distance.Between(player.x, player.y, mammoth.x, mammoth.y) > MAMMOTH_HIT_RADIUS * weapon.reach) return;

  // Пока вождь замахивался, мамонт мог отдохнуть — тогда удар мимо (hit() это проверит).
  player.swing(mammoth.x, weapon.hitInterval, () => mammoth.hit(weapon.damage));
}
