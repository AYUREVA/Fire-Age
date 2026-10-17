import Phaser from 'phaser';
import { DROP_INTERVAL, GATHER_RADIUS, HIT_INTERVAL } from '../settings';
import { Player } from '../objects/Player';
import { Backpack } from '../objects/Backpack';
import { ResourceNode } from '../objects/ResourceNode';
import { ItemPile } from '../objects/ItemPile';

// =====================================================================
//  Добыча и сдача хвороста.
//
//  Это функции, а не класс: нужные объекты приходят аргументами,
//  своего состояния здесь нет. Таймеры хранят сами объекты:
//  hitTimer — вождь (Player), dropTimer — куча у костра (ItemPile).
//  GameScene вызывает эти функции каждый кадр.
// =====================================================================

// ===== Добыча хвороста =====

// Вождь рядом с кустом — бьёт его каждые HIT_INTERVAL мс,
// и связка хвороста летит из куста на стопку.
export function updateGathering(player: Player, backpack: Backpack, bushes: ResourceNode[], delta: number): void {
  const bush = findBushNear(player, bushes);

  // Рядом нет куста с хворостом или спина полная — удары не копятся.
  if (!bush || backpack.isFull()) {
    player.hitTimer = 0;
    return;
  }

  player.hitTimer += delta;
  if (player.hitTimer < HIT_INTERVAL) return;
  player.hitTimer -= HIT_INTERVAL;

  // Удар засчитывается, когда дубина долетает до куста, а не в начале замаха.
  // Весь взмах укладывается в HIT_INTERVAL — до следующего удара.
  player.swing(bush.x, HIT_INTERVAL, () => {
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
