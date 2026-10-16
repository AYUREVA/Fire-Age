import Phaser from 'phaser';
import { DROP_INTERVAL, GATHER_RADIUS, HIT_INTERVAL } from '../settings';
import { Player } from '../objects/Player';
import { CarryStack } from '../objects/CarryStack';
import { ResourceNode } from '../objects/ResourceNode';
import { DropZone } from '../objects/DropZone';

// =====================================================================
//  Добыча и сдача хвороста.
//
//  Это функции, а не класс: нужные объекты приходят аргументами,
//  своего состояния здесь нет. Таймеры хранят сами объекты:
//  hitTimer — вождь (Player), dropTimer — поленница (DropZone).
//  GameScene вызывает эти функции каждый кадр.
// =====================================================================

// ===== Добыча хвороста =====

// Вождь рядом с кустом — бьёт его каждые HIT_INTERVAL мс,
// и связка хвороста летит из куста на стопку.
export function updateGathering(player: Player, stack: CarryStack, bushes: ResourceNode[], delta: number): void {
  const bush = findBushNear(player, bushes);

  // Рядом нет куста с хворостом или стопка полная — удары не копятся.
  if (!bush || stack.isFull()) {
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
    stack.add(bush.getLootPoint());
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

// ===== Сдача хвороста =====

// Вождь в зоне поленницы — каждые DROP_INTERVAL мс верхняя связка
// улетает со стопки в кучу на поленнице, пока поленница не полная.
export function updateDropping(player: Player, stack: CarryStack, woodpile: DropZone, delta: number): void {
  const isInZone = woodpile.contains(player.x, player.y);
  const canDrop = isInZone && !woodpile.isFull();
  // Полная поленница не подсвечивается: сюда пока нельзя.
  woodpile.setHighlighted(canDrop);

  // Вождь не в зоне, поленница полная или нести нечего — таймер не копится.
  if (!canDrop || stack.isEmpty()) {
    woodpile.dropTimer = 0;
    return;
  }

  woodpile.dropTimer += delta;
  if (woodpile.dropTimer < DROP_INTERVAL) return;
  woodpile.dropTimer -= DROP_INTERVAL;

  // Верхняя связка может ещё лететь на стопку — тогда её пока не отдаём.
  const item = stack.takeTop();
  if (!item) return;

  woodpile.receive(item);
}
