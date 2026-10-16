import {
  EMBER_TIME,
  FIRE_BURN_TIME,
  FIRE_FEED_BELOW,
  FIRE_FEED_INTERVAL,
  FIRE_MAX_HEAT,
  HEAT_PER_BUNDLE,
} from '../settings';
import { Campfire } from '../objects/Campfire';
import { DropZone } from '../objects/DropZone';

// =====================================================================
//  Огонь: жар, угли и подкормка из поленницы.
//
//  Это функции, а не класс: костёр и поленница приходят аргументами,
//  своего состояния здесь нет. Жар, время углей и таймер подкормки
//  хранит сам костёр (Campfire). GameScene вызывает updateFire каждый кадр.
// =====================================================================

// Огонь горит: жар убывает, поленница подкармливает огонь.
// burnMultiplier — во сколько раз быстрее прогорает костёр (ночью — быстрее).
// Вернёт true, если костёр погас: угли тлели EMBER_TIME мс, а топлива не было.
export function updateFire(fire: Campfire, woodpile: DropZone, delta: number, burnMultiplier: number): boolean {
  burn(fire, delta, burnMultiplier);
  feedFromWoodpile(fire, woodpile, delta);
  return fire.emberTime >= EMBER_TIME;
}

// Жар убывает с постоянной скоростью: полный костёр сгорает за FIRE_BURN_TIME мс,
// а с множителем burnMultiplier — во столько раз быстрее.
// Когда жар на нуле, костёр тлеет углями — копится время углей.
function burn(fire: Campfire, delta: number, burnMultiplier: number): void {
  if (fire.isEmbers()) {
    fire.emberTime += delta;
    return;
  }

  fire.heat = Math.max(0, fire.heat - (delta * burnMultiplier * FIRE_MAX_HEAT) / FIRE_BURN_TIME);
}

// Жар ниже FIRE_FEED_BELOW — верхняя связка из поленницы сама летит в огонь,
// не чаще одной за FIRE_FEED_INTERVAL мс. Упала в огонь — жар растёт.
function feedFromWoodpile(fire: Campfire, woodpile: DropZone, delta: number): void {
  // Жара хватает — подкармливать не нужно. Таймер держим полным,
  // чтобы первая связка полетела сразу, как только жар опустится.
  if (fire.heat >= FIRE_FEED_BELOW) {
    fire.feedTimer = FIRE_FEED_INTERVAL;
    return;
  }

  fire.feedTimer += delta;
  if (fire.feedTimer < FIRE_FEED_INTERVAL) return;

  // В поленнице пусто или верхняя связка ещё летит туда — ждём.
  // Таймер остаётся полным: связка полетит в огонь, как только появится.
  const bundle = woodpile.takeTop();
  if (!bundle) return;

  fire.feedTimer = 0;
  fire.receive(bundle, () => fire.addHeat(HEAT_PER_BUNDLE));
}
