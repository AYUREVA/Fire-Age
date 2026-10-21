import Phaser from 'phaser';
import {
  TABLE_DROP_INTERVAL,
  HUT_SPAWN_FACTOR,
  TRAVELER_EAT_TIME,
  TRAVELER_FIRST_DELAY,
  TRAVELER_ORDER_MAX,
  TRAVELER_ORDER_MIN,
  TRAVELER_SPAWN_INTERVAL,
  TRAVELER_TAKE_DELAY,
  TUSKS_PER_FOOD,
} from '../settings';
import { Player } from '../objects/Player';
import { Backpack } from '../objects/Backpack';
import { StoneTable } from '../objects/StoneTable';
import { Hud } from '../objects/Hud';
import { Traveler } from '../objects/Traveler';
import { Hut } from '../objects/Hut';
import { LevelStats } from '../analytics';

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

// ===== Путники =====

// Путники: приход из леса, очередь у стола, первый в очереди берёт еду,
// ест, оставляет клыки и уходит. Нет нужной еды — убывает его терпение.
// huts — хижины: каждая построенная ускоряет приход путников.
// stats — статистика уровня: сюда считаются накормленные и голодные.
export function updateTravelers(
  table: StoneTable,
  travelers: Traveler[],
  huts: Hut[],
  stats: LevelStats,
  delta: number,
): void {
  callTraveler(table, travelers, huts, delta);

  // Очередь — путники по порядку талонов: кто пришёл раньше, тот ближе к столу.
  const queue = travelers.filter((traveler) => traveler.isInQueue()).sort((a, b) => a.ticket - b.ticket);
  // Пузырь «что хочу» и шкала терпения — только у первого: остальные пока просто ждут.
  queue.forEach((traveler, index) => {
    traveler.setSlot(table.getQueueSlot(index));
    traveler.setFront(index === 0);
  });

  if (queue.length > 0) serveFirst(table, queue[0], stats, delta);
}

// Раз в TRAVELER_SPAWN_INTERVAL (первый — через TRAVELER_FIRST_DELAY) из леса выходит
// новый путник, если в очереди есть место. Путники созданы заранее — зовём свободного.
// Каждая построенная хижина умножает интервал на HUT_SPAWN_FACTOR — путники приходят чаще.
function callTraveler(table: StoneTable, travelers: Traveler[], huts: Hut[], delta: number): void {
  const builtHuts = huts.filter((hut) => hut.isBuilt()).length;
  const spawnInterval = TRAVELER_SPAWN_INTERVAL * Math.pow(HUT_SPAWN_FACTOR, builtHuts);
  const interval = table.nextTicket === 1 ? TRAVELER_FIRST_DELAY : spawnInterval;
  // Очередь полная — таймер не копится дальше: путник придёт сразу, как освободится место.
  table.spawnTimer = Math.min(table.spawnTimer + delta, interval);
  if (table.spawnTimer < interval) return;

  const free = travelers.find((traveler) => traveler.isGone());
  if (!free) return;

  table.spawnTimer = 0;
  const order = Phaser.Math.Between(TRAVELER_ORDER_MIN, TRAVELER_ORDER_MAX);
  free.arrive(table.nextTicket, order, table.getForestPoint());
  table.nextTicket += 1;
}

// Первый в очереди у стола: берёт нужную еду по куску, ест, платит и уходит.
// Нужной еды на столе нет — ждёт, и его терпение убывает; кончилось — уходит голодным.
function serveFirst(table: StoneTable, first: Traveler, stats: LevelStats, delta: number): void {
  // Ест: доел — клыки летят на край стола, путник уходит.
  if (first.isEating()) {
    first.eatTime += delta;
    if (first.eatTime < TRAVELER_EAT_TIME) return;
    table.addTusks(first.order * TUSKS_PER_FOOD, first.getMouthPoint());
    first.leave(true, table.getForestPoint());
    stats.fed += 1;
    return;
  }

  // Ещё идёт к столу — ждём.
  if (!first.isWaiting()) return;

  const want = first.wants();
  // Взял всё, что хотел, — ест.
  if (want.count === 0) {
    first.startEating();
    return;
  }

  // Нужной еды на столе нет — терпение убывает.
  if (!table.has(want.type)) {
    first.takeTimer = 0;
    first.patience -= delta;
    if (first.patience <= 0) {
      first.leave(false, table.getForestPoint());
      stats.hungry += 1;
    }
    return;
  }

  // Еда есть — берёт по куску раз в TRAVELER_TAKE_DELAY.
  first.takeTimer += delta;
  if (first.takeTimer < TRAVELER_TAKE_DELAY) return;
  first.takeTimer -= TRAVELER_TAKE_DELAY;

  const item = table.takeFood(want.type);
  if (item) first.takeOne(item);
}

// ===== Клыки в счётчик =====

// Вождь стоит в зоне над столом — клыки с края стола сразу становятся его (player.tusks),
// а в HUD каждый клык летит в счётчик и показывает новое число, когда долетит.
// Клык лежит в мире, а счётчик — на экране: из точки мира вычитаем
// левый верхний угол того, что видит камера, и получаем точку экрана.
export function updateTusks(
  player: Player,
  table: StoneTable,
  hud: Hud,
  stats: LevelStats,
  camera: Phaser.Cameras.Scene2D.Camera,
): void {
  if (!table.contains(player.x, player.y)) return;

  for (const tusk of table.takeTusks()) {
    player.tusks += 1;
    stats.tusksEarned += 1;
    hud.flyTuskToCounter(tusk.x - camera.worldView.x, tusk.y - camera.worldView.y, player.tusks);
    tusk.destroy();
  }
}
