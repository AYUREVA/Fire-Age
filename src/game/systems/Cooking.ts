import { COOK_TIME } from '../settings';
import { Campfire } from '../objects/Campfire';
import { ItemPile } from '../objects/ItemPile';
import { Spit } from '../objects/Spit';

// =====================================================================
//  Кухня у костра: куча сырого мяса → вертел → куча жареного мяса.
//
//  Это функция, а не класс: костёр, кучи и вертел приходят аргументами,
//  своего состояния здесь нет. Сколько жарится кусок, хранит вертел (Spit).
//  GameScene вызывает updateCooking каждый кадр.
// =====================================================================

// Мясо жарится по одному и только пока огонь горит (в углях — нет).
// Готовый кусок падает в кучу жареного; если она полная — вертел ждёт.
export function updateCooking(fire: Campfire, rawPile: ItemPile, spit: Spit, cookedPile: ItemPile, delta: number): void {
  // Огонь в углях — ничего не жарится и на вертел не кладём.
  if (fire.isEmbers()) return;

  // Вертел пуст — верхний кусок из кучи сырого летит на вертел (если он есть).
  if (spit.isEmpty()) {
    const raw = rawPile.takeTop();
    if (raw) spit.receive(raw);
    return;
  }

  // Кусок ещё летит к вертелу — ждём.
  if (!spit.isLoaded()) return;

  // Жарим. Готово, и в куче жареного есть место — кусок летит туда.
  spit.cookTime = Math.min(COOK_TIME, spit.cookTime + delta);
  if (spit.cookTime < COOK_TIME || cookedPile.isFull()) return;

  const cooked = spit.takeCooked();
  if (cooked) cookedPile.receive(cooked);
}
