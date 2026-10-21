import Phaser from 'phaser';
import { BUY_INTERVAL } from '../settings';
import { Player } from '../objects/Player';
import { BuyZone } from '../objects/BuyZone';
import { Hud } from '../objects/Hud';

// =====================================================================
//  Покупки: вождь стоит на точке покупки — клыки по одному летят
//  из счётчика HUD в точку. Набралась цена — покупка готова.
//
//  Это функции, а не класс: нужные объекты приходят аргументами,
//  своего состояния здесь нет. Сколько внесено, хранит точка (BuyZone),
//  сколько клыков у вождя — Player.tusks. Что именно купили, решает GameScene.
// =====================================================================

// Каждый кадр: оплата на всех открытых точках.
// Вернёт точку, на которой покупка только что готова (все клыки долетели), иначе undefined.
export function updatePurchases(
  player: Player,
  zones: BuyZone[],
  hud: Hud,
  camera: Phaser.Cameras.Scene2D.Camera,
  delta: number,
): BuyZone | undefined {
  let completed: BuyZone | undefined;
  for (const zone of zones) {
    if (!zone.isOpen()) continue;
    if (zone.isComplete()) {
      completed = zone;
      continue;
    }
    payInto(player, zone, hud, camera, delta);
  }
  return completed;
}

// Вождь на круге, у него есть клыки и цена ещё не набрана — раз в BUY_INTERVAL мс
// один клык уходит из счётчика и летит в точку. Сошёл — внесённое остаётся.
// Клык вылетает из иконки счётчика на экране: к точке экрана прибавляем
// левый верхний угол того, что видит камера, и получаем точку мира.
function payInto(
  player: Player,
  zone: BuyZone,
  hud: Hud,
  camera: Phaser.Cameras.Scene2D.Camera,
  delta: number,
): void {
  const isInZone = zone.contains(player.x, player.y);
  zone.setHighlighted(isInZone);

  const canPay = isInZone && player.tusks > 0 && !zone.isFullyPaid();
  if (!canPay) {
    zone.payTimer = 0;
    return;
  }

  zone.payTimer += delta;
  if (zone.payTimer < BUY_INTERVAL) return;
  zone.payTimer -= BUY_INTERVAL;

  player.tusks -= 1;
  const from = hud.spendTusk(player.tusks);
  zone.pay({ x: from.x + camera.worldView.x, y: from.y + camera.worldView.y });
}
