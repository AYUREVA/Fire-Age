import Phaser from 'phaser';
import { TABLE_DROP_INTERVAL } from '../settings';
import { Player } from '../objects/Player';
import { Backpack } from '../objects/Backpack';
import { StoneTable } from '../objects/StoneTable';
import { Hud } from '../objects/Hud';

// =====================================================================
//  Стол и путники: вождь выкладывает еду на стол, путники едят
//  и оставляют клыки, вождь собирает клыки в счётчик.
//
//  Это функции, а не класс: нужные объекты приходят аргументами,
//  своего состояния здесь нет. Таймеры хранят стол и путники.
//  GameScene вызывает эти функции каждый кадр.
// =====================================================================

// ===== Еда на стол =====

// Вождь у стола — вся жареная еда со спины почти разом перелетает на стол
// (по куску каждые TABLE_DROP_INTERVAL мс), пока на столе есть место.
export function updateTable(player: Player, backpack: Backpack, table: StoneTable, delta: number): void {
  const isInZone = table.contains(player.x, player.y);
  const canDrop = isInZone && !table.isFull();
  table.setHighlighted(canDrop);

  // Вождь не у стола, стол полный или нести нечего — таймер не копится.
  if (!canDrop || !backpack.has('cookedMeat')) {
    table.dropTimer = 0;
    return;
  }

  table.dropTimer += delta;
  if (table.dropTimer < TABLE_DROP_INTERVAL) return;
  table.dropTimer -= TABLE_DROP_INTERVAL;

  // Верхний кусок может ещё лететь на спину — тогда его пока не отдаём.
  const item = backpack.takeTop('cookedMeat');
  if (!item) return;

  table.receive(item, 'cookedMeat');
}

// ===== Клыки в счётчик =====

// Вождь подбежал к кучке клыков — каждый клык летит в счётчик в HUD.
// Клык лежит в мире, а счётчик — на экране: из точки мира вычитаем
// левый верхний угол того, что видит камера, и получаем точку экрана.
export function updateTusks(player: Player, table: StoneTable, hud: Hud, camera: Phaser.Cameras.Scene2D.Camera): void {
  if (!table.isNearTusks(player.x, player.y)) return;

  for (const tusk of table.takeTusks()) {
    hud.flyTuskToCounter(tusk.x - camera.worldView.x, tusk.y - camera.worldView.y);
    tusk.destroy();
  }
}
