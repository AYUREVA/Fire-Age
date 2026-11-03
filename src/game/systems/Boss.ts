import Phaser from 'phaser';
import {
  MAMMOTH_CHARGE_DISTANCE,
  MAMMOTH_CHARGE_OVERSHOOT,
  MAMMOTH_HIT_RADIUS,
  MAMMOTH_PILE_CHANCE,
  MAMMOTH_PREPARE_TIME,
  MAMMOTH_TIRED_TIME,
  WORLD_EDGE,
  WORLD_HEIGHT,
  WORLD_WIDTH,
} from '../settings';
import { Player } from '../objects/Player';
import { ItemPile } from '../objects/ItemPile';
import { Mammoth } from '../objects/Mammoth';
import { Point } from '../fx';

// =====================================================================
//  Финальный бой с мамонтом (с 0.9): мамонт выбирает цель, роет копытом,
//  таранит и устаёт; вождь бьёт уставшего мамонта.
//
//  Это функции, а не класс: нужные объекты приходят аргументами,
//  своего состояния здесь нет. Здоровье, состояние и таймер хранит сам мамонт.
//  GameScene вызывает эти функции каждый кадр.
// =====================================================================

// С чем мамонт имеет дело на поле: вождь и кучи у главного костра (его цели).
export type BossWorld = {
  player: Player;
  piles: ItemPile[];
};

// ===== Мамонт =====

// Автомат мамонта «идёт к цели → роет копытом → таранит → устал → снова идёт».
export function updateMammoth(mammoth: Mammoth, world: BossWorld, delta: number): void {
  mammoth.update(delta);

  switch (mammoth.getState()) {
    case 'wander':
      walkToAim(mammoth, world);
      break;
    case 'prepare':
      if (mammoth.stateTime >= MAMMOTH_PREPARE_TIME) mammoth.charge(chargeEnd(mammoth, aimPoint(mammoth, world)));
      break;
    case 'charge':
      if (mammoth.isArrived()) mammoth.tire();
      break;
    case 'tired':
      if (mammoth.stateTime >= MAMMOTH_TIRED_TIME) {
        chooseAim(mammoth, world);
        mammoth.wander();
      }
      break;
  }
}

// Идёт к цели. Цели-кучи больше нет (опустела) — выбирает новую.
// Подошёл на расстояние разгона — останавливается и роет копытом.
function walkToAim(mammoth: Mammoth, world: BossWorld): void {
  if (mammoth.aim >= 0 && world.piles[mammoth.aim].isEmpty()) chooseAim(mammoth, world);
  const aim = aimPoint(mammoth, world);
  if (Phaser.Math.Distance.Between(mammoth.x, mammoth.y, aim.x, aim.y) <= MAMMOTH_CHARGE_DISTANCE) {
    mammoth.prepare(aim.x);
  } else {
    mammoth.walkTo(aim);
  }
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
// но не за краем поля (там лес).
function chargeEnd(mammoth: Mammoth, aim: Point): Point {
  const distance = Math.max(1, Phaser.Math.Distance.Between(mammoth.x, mammoth.y, aim.x, aim.y));
  const length = distance + MAMMOTH_CHARGE_OVERSHOOT;
  const x = mammoth.x + ((aim.x - mammoth.x) / distance) * length;
  const y = mammoth.y + ((aim.y - mammoth.y) / distance) * length;
  return {
    x: Phaser.Math.Clamp(x, WORLD_EDGE, WORLD_WIDTH - WORLD_EDGE),
    y: Phaser.Math.Clamp(y, WORLD_EDGE, WORLD_HEIGHT - WORLD_EDGE),
  };
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
