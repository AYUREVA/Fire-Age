import Phaser from 'phaser';
import { CATCH_RADIUS, DROP_INTERVAL, GATHER_RADIUS } from '../settings';
import { Player } from '../objects/Player';
import { Backpack } from '../objects/Backpack';
import { ResourceNode } from '../objects/ResourceNode';
import { ItemPile } from '../objects/ItemPile';
import { Rabbit } from '../objects/Rabbit';

// =====================================================================
//  Добыча (кусты, кролики), сдача в кучи у костра и жареное мясо на спину.
//
//  Это функции, а не класс: нужные объекты приходят аргументами,
//  своего состояния здесь нет. Таймеры хранят сами объекты:
//  hitTimer — вождь (Player), dropTimer — куча у костра (ItemPile).
//  GameScene вызывает эти функции каждый кадр.
// =====================================================================

// ===== Добыча хвороста =====

// Вождь рядом с кустом — бьёт его раз в интервал удара своего оружия
// (дубина — HIT_INTERVAL, топор и копьё чаще), и связка хвороста летит из куста на стопку.
export function updateGathering(player: Player, backpack: Backpack, bushes: ResourceNode[], delta: number): void {
  const bush = findBushNear(player, bushes);

  // Рядом нет куста с хворостом или колонка хвороста полная — удары не копятся.
  if (!bush || backpack.isFull('wood')) {
    player.hitTimer = 0;
    return;
  }

  const hitInterval = player.getWeapon().hitInterval;
  player.hitTimer += delta;
  if (player.hitTimer < hitInterval) return;
  // Вождь ещё машет (например, бьёт волка) — по кусту ударит, как только закончит.
  if (player.isSwinging()) {
    player.hitTimer = hitInterval;
    return;
  }
  player.hitTimer -= hitInterval;

  // Удар засчитывается, когда оружие долетает до куста, а не в начале замаха.
  // Весь взмах укладывается в интервал удара — до следующего удара.
  player.swing(bush.x, hitInterval, () => {
    bush.hit();
    backpack.add('wood', bush.getLootPoint());
  });
}

// Ближайший к вождю куст с хворостом не дальше GATHER_RADIUS. Если такого нет — undefined.
function findBushNear(player: Player, bushes: ResourceNode[]): ResourceNode | undefined {
  let nearest: ResourceNode | undefined;
  let nearestDistance = GATHER_RADIUS;

  for (const bush of bushes) {
    if (!bush.hasStock()) continue;

    const distance = Phaser.Math.Distance.Between(player.x, player.y, bush.x, bush.y);
    if (distance <= nearestDistance) {
      nearest = bush;
      nearestDistance = distance;
    }
  }

  return nearest;
}

// ===== Охота =====

// Вождь догнал кролика — замах дубиной, кролик исчезает с «пуф»,
// кусок сырого мяса летит на спину.
export function updateHunting(player: Player, backpack: Backpack, rabbits: Rabbit[]): void {
  // Колонка сырого мяса полная или вождь уже машет дубиной (например, по кусту) — не ловим.
  if (backpack.isFull('rawMeat') || player.isSwinging()) return;

  const rabbit = rabbits.find(
    (each) => each.isCatchable() && Phaser.Math.Distance.Between(player.x, player.y, each.x, each.y) <= CATCH_RADIUS,
  );
  if (!rabbit) return;

  // Кролик замирает, вождь замахивается. В момент удара — «пуф» и мясо на спину.
  rabbit.catch();
  player.swing(rabbit.x, player.getWeapon().hitInterval, () => {
    rabbit.poof();
    backpack.add('rawMeat', rabbit.getLootPoint());
  });
}

// ===== Сдача в кучи у костра =====

// Вождь сдаёт ресурсы в кучи у костра: каждая куча принимает только свой тип
// (поленница — хворост, куча у вертела — сырое мясо).
export function updateDropping(player: Player, backpack: Backpack, piles: ItemPile[], delta: number): void {
  for (const pile of piles) {
    dropIntoPile(player, backpack, pile, delta);
  }
}

// Вождь в зоне кучи — каждые DROP_INTERVAL мс верхний предмет её типа
// улетает со спины в кучу, пока куча не полная.
function dropIntoPile(player: Player, backpack: Backpack, pile: ItemPile, delta: number): void {
  const isInZone = pile.contains(player.x, player.y);
  const canDrop = isInZone && !pile.isFull();
  // Полная куча не подсвечивается: сюда пока нельзя.
  pile.setHighlighted(canDrop);

  // Вождь не в зоне, куча полная или нести нечего — таймер не копится.
  if (!canDrop || !backpack.has(pile.type)) {
    pile.dropTimer = 0;
    return;
  }

  pile.dropTimer += delta;
  if (pile.dropTimer < DROP_INTERVAL) return;
  pile.dropTimer -= DROP_INTERVAL;

  // Верхний предмет может ещё лететь на спину — тогда его пока не отдаём.
  const item = backpack.takeTop(pile.type);
  if (!item) return;

  pile.receive(item);
}

// ===== Забрать жареное мясо =====

// Вождь стоит на куче жареного мяса — каждые DROP_INTERVAL мс верхний кусок
// улетает из кучи ему на спину, пока колонка жареного не полная.
export function updatePickup(player: Player, backpack: Backpack, pile: ItemPile, delta: number): void {
  const isInZone = pile.contains(player.x, player.y);
  const canTake = isInZone && !pile.isEmpty() && !backpack.isFull(pile.type);
  pile.setHighlighted(canTake);

  // Вождь не в зоне, куча пустая или колонка полная — таймер не копится.
  if (!canTake) {
    pile.dropTimer = 0;
    return;
  }

  pile.dropTimer += delta;
  if (pile.dropTimer < DROP_INTERVAL) return;
  pile.dropTimer -= DROP_INTERVAL;

  // Верхний кусок может ещё лететь в кучу — тогда его пока не берём.
  const item = pile.takeTop();
  if (!item) return;

  // Кусок из кучи исчезает, а на спину по дуге летит такой же — с того же места.
  const from = { x: item.x, y: item.y };
  item.destroy();
  backpack.add(pile.type, from);
}
