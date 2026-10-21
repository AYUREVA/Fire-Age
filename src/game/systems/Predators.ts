import Phaser from 'phaser';
import { WOLF_GIVE_UP_TIME, WOLF_HIT_RADIUS, WOLF_STEAL_RADIUS } from '../settings';
import { ITEM_ORDER } from '../items';
import { Player } from '../objects/Player';
import { Backpack } from '../objects/Backpack';
import { Wolf, randomForestPoint } from '../objects/Wolf';
import { LevelStats } from '../analytics';
import { CanStep } from '../fx';

// =====================================================================
//  Звери: волки выходят из леса, крадут со спины, вождь отбивается.
//
//  Это функции, а не класс: нужные объекты приходят аргументами,
//  своего состояния здесь нет. Таймеры и здоровье хранят сами волки.
//  GameScene вызывает эти функции каждый кадр.
// =====================================================================

// ===== Волки =====

// Волки: выход из леса, бег к вождю, кража и побег в лес.
// maxCount — сколько волков может быть на поле сейчас (днём меньше, ночью больше).
// stats — статистика уровня: сюда считаются украденные предметы.
// canStep — можно ли волку шагнуть из точки в точку (частокол и калитки волков не пускают).
export function updateWolves(
  wolves: Wolf[],
  player: Player,
  backpack: Backpack,
  stats: LevelStats,
  maxCount: number,
  canStep: CanStep,
  delta: number,
): void {
  callWolves(wolves, maxCount, delta);

  for (const wolf of wolves) {
    // Убежал в лес с добычей — предмет пропал.
    if (wolf.update(delta, player.x, player.y, canStep)) stats.itemsStolen += 1;
    if (!wolf.isHunting()) continue;

    // Долго не может добраться (например, вождь за частоколом) — уходит.
    if (wolf.huntTime >= WOLF_GIVE_UP_TIME) {
      wolf.giveUp();
    } else if (Phaser.Math.Distance.Between(wolf.x, wolf.y, player.x, player.y) <= WOLF_STEAL_RADIUS) {
      steal(wolf, backpack);
    }
  }
}

// Волк в лесу отсчитывает время до выхода. Время вышло и на поле ещё есть место
// (волков меньше maxCount) — выходит из случайного места в лесу.
function callWolves(wolves: Wolf[], maxCount: number, delta: number): void {
  let onField = wolves.filter((wolf) => !wolf.isGone()).length;

  for (const wolf of wolves) {
    if (!wolf.isGone()) continue;
    wolf.returnTimer -= delta;
    if (wolf.returnTimer > 0 || onField >= maxCount) continue;

    wolf.comeOut(randomForestPoint());
    onField += 1;
  }
}

// Волк добежал до вождя — хватает верхний предмет из случайной непустой колонки.
// Клыки в HUD волки не трогают. Красть нечего — волк уходит ни с чем.
function steal(wolf: Wolf, backpack: Backpack): void {
  const types = ITEM_ORDER.filter((type) => backpack.has(type));
  if (types.length === 0) {
    wolf.giveUp();
    return;
  }

  const type = Phaser.Utils.Array.GetRandom(types);
  // Верхний предмет может ещё лететь на спину — тогда волк схватит в следующем кадре.
  const image = backpack.takeTop(type);
  if (image) wolf.grab({ type, image });
}

// ===== Вождь бьёт волка =====

// Волк рядом и вождь не машет оружием — удар по ближайшему волку.
// Это вызывается раньше добычи кустов: волк важнее куста.
// В момент попадания волк трясётся и отлетает; отогнан — роняет добычу,
// и она летит обратно на спину.
export function updateWolfFight(player: Player, backpack: Backpack, wolves: Wolf[], stats: LevelStats): void {
  if (player.isSwinging()) return;

  const wolf = findWolfNear(player, wolves);
  if (!wolf) return;

  const weapon = player.getWeapon();
  player.swing(wolf.x, weapon.hitInterval, () => {
    // Пока вождь замахивался, волк мог уже убежать в лес.
    if (!wolf.canBeHit()) return;

    const result = wolf.hit(weapon.damage, player.x, player.y);
    if (result.loot) {
      const from = { x: result.loot.image.x, y: result.loot.image.y };
      result.loot.image.destroy();
      backpack.add(result.loot.type, from);
    }
    if (result.isDriven) stats.wolvesDriven += 1;
  });
}

// Ближайший к вождю волк, которого можно ударить, не дальше WOLF_HIT_RADIUS.
function findWolfNear(player: Player, wolves: Wolf[]): Wolf | undefined {
  let nearest: Wolf | undefined;
  let nearestDistance = WOLF_HIT_RADIUS;

  for (const wolf of wolves) {
    if (!wolf.canBeHit()) continue;
    const distance = Phaser.Math.Distance.Between(player.x, player.y, wolf.x, wolf.y);
    if (distance <= nearestDistance) {
      nearest = wolf;
      nearestDistance = distance;
    }
  }

  return nearest;
}
