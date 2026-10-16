import Phaser from 'phaser';
import { DROP_RADIUS, WOODPILE_CAPACITY } from '../settings';
import { COLORS } from '../palette';
import { TEXTURES } from '../textures';
import { floatText, flyArc, pop, Point } from '../fx';

// ===== Площадка поленницы =====

// Площадка лежит плоско на земле, на одном слое со светом костра (Campfire.ts):
// выше декора земли (-200 в GameScene), ниже всего, что стоит (depth = y ≥ 0).
const FLAT_ON_GROUND_DEPTH = -100;
// Прозрачность и размер площадки: обычно и когда вождь стоит в зоне.
const PLATFORM_IDLE_ALPHA = 0.75;
const PLATFORM_ACTIVE_ALPHA = 1;
const PLATFORM_ACTIVE_SCALE = 1.06;
// За сколько мс площадка подсвечивается или гаснет.
const PLATFORM_TWEEN_TIME = 160;

// ===== Куча хвороста =====

// Сколько связок в одном ряду кучи. Сколько всего — WOODPILE_CAPACITY в settings.ts.
const PILE_COLUMNS = 3;
// Расстояние между связками в ряду и высота ряда.
const PILE_COLUMN_STEP = 50;
const PILE_ROW_STEP = 18;
// Нечётные ряды сдвинуты вбок — связки лежат «кирпичиком».
const PILE_BRICK_SHIFT = 10;
// Низ кучи ниже середины площадки на столько пикселей.
const PILE_BASE_OFFSET_Y = 22;
// Каждая следующая связка в куче чуть ближе к нам, чем предыдущая.
const PILE_DEPTH_STEP = 0.001;

// ===== Полёт связки в кучу =====

// Сколько мс связка летит со стопки в кучу и как высоко поднимается дуга.
const FLY_TIME = 300;
const FLY_ARC_HEIGHT = 70;
// «+1» появляется над связкой, которая легла в кучу.
const PLUS_ONE_OFFSET_Y = 30;

/**
 * Поленница у костра — точка сдачи хвороста.
 *
 * Площадка со светлой рамкой: вождь встаёт в её зону, и сцена передаёт
 * сюда связки со стопки по одной. Каждая связка по дуге летит в аккуратную
 * кучу, куча растёт до WOODPILE_CAPACITY. Слева от поленницы горит костёр
 * (Campfire.ts) — он забирает связки с верха кучи через takeTop().
 * Про вождя, стопку и костёр поленница ничего не знает.
 */
export class DropZone {
  // Середина площадки.
  readonly x: number;
  readonly y: number;
  // Сколько мс вождь уже стоит на поленнице. Набралось DROP_INTERVAL — сдаёт связку.
  // Меняет его systems/Gathering.ts.
  dropTimer = 0;

  private scene: Phaser.Scene;
  private platform: Phaser.GameObjects.Image;
  // Подсвечена ли площадка сейчас (вождь в зоне).
  private isHighlighted = false;
  // Связки, лежащие в куче (и те, что уже летят туда, — место для них занято).
  // [0] — нижняя, последняя — верхняя.
  private pile: Phaser.GameObjects.Image[] = [];
  // Связки, которые ещё летят в кучу. Их пока нельзя забрать.
  private flyingItems = new Set<Phaser.GameObjects.Image>();

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.scene = scene;
    this.x = x;
    this.y = y;

    this.platform = scene.add
      .image(x, y, TEXTURES.dropZone)
      .setDepth(FLAT_ON_GROUND_DEPTH)
      .setAlpha(PLATFORM_IDLE_ALPHA);
  }

  // Стоит ли точка (x, y) в зоне сдачи.
  contains(x: number, y: number): boolean {
    return Phaser.Math.Distance.Between(x, y, this.x, this.y) <= DROP_RADIUS;
  }

  // Поленница полная: больше связок не принять.
  isFull(): boolean {
    return this.pile.length >= WOODPILE_CAPACITY;
  }

  // Подсветка площадки, пока вождь в зоне. Сцена вызывает это каждый кадр.
  setHighlighted(isOn: boolean): void {
    // Твин запускаем, только когда подсветка меняется, а не каждый кадр.
    if (this.isHighlighted === isOn) return;
    this.isHighlighted = isOn;

    this.scene.tweens.add({
      targets: this.platform,
      alpha: isOn ? PLATFORM_ACTIVE_ALPHA : PLATFORM_IDLE_ALPHA,
      scale: isOn ? PLATFORM_ACTIVE_SCALE : 1,
      duration: PLATFORM_TWEEN_TIME,
      ease: 'Sine.easeOut',
    });
  }

  // Принять связку со стопки: она летит по дуге в кучу.
  // Сцена зовёт это, только когда поленница не полная.
  receive(item: Phaser.GameObjects.Image): void {
    // В стопке связка могла быть наклонена — выпрямляем.
    item.setAngle(0);

    // Место в куче занимаем сразу, пока связка ещё летит, — как в стопке за спиной.
    const slotIndex = this.pile.length;
    this.pile.push(item);
    this.flyingItems.add(item);
    const slot = this.getPileSlot(slotIndex);

    flyArc(this.scene, item, {
      from: { x: item.x, y: item.y },
      target: () => slot,
      duration: FLY_TIME,
      height: FLY_ARC_HEIGHT,
      onLand: () => this.store(item, slotIndex),
    });
  }

  // Забрать верхнюю связку (её заберёт костёр). Дальше её двигает тот, кто забрал.
  // Вернёт undefined, если куча пуста или верхняя связка ещё летит.
  takeTop(): Phaser.GameObjects.Image | undefined {
    const top = this.pile[this.pile.length - 1];
    if (!top || this.flyingItems.has(top)) return undefined;

    this.pile.pop();
    return top;
  }

  // ===== Куча =====

  // Связка легла в кучу: «пружинка» и «+1».
  private store(item: Phaser.GameObjects.Image, slotIndex: number): void {
    this.flyingItems.delete(item);
    floatText(this.scene, item.x, item.y - PLUS_ONE_OFFSET_Y, '+1', COLORS.plusOne);
    item.setDepth(this.getPileDepth(slotIndex));
    pop(this.scene, item);
  }

  // Где лежит связка номер index в куче (точка низа связки).
  private getPileSlot(index: number): Point {
    const row = Math.floor(index / PILE_COLUMNS);
    const column = index % PILE_COLUMNS;
    // Нечётные ряды сдвинуты вбок — «кирпичиком».
    const brickShift = row % 2 === 1 ? PILE_BRICK_SHIFT : 0;
    // column − середина ряда: у левой связки −1, у средней 0, у правой +1.
    const columnFromCenter = column - (PILE_COLUMNS - 1) / 2;

    return {
      x: this.x + columnFromCenter * PILE_COLUMN_STEP + brickShift,
      y: this.y + PILE_BASE_OFFSET_Y - row * PILE_ROW_STEP,
    };
  }

  // Глубина связки в куче: вся куча стоит на одной линии, каждая следующая связка чуть ближе.
  private getPileDepth(index: number): number {
    return this.y + PILE_BASE_OFFSET_Y + index * PILE_DEPTH_STEP;
  }
}
