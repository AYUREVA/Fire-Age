import Phaser from 'phaser';
import { DROP_RADIUS } from '../settings';
import { COLORS } from '../palette';
import { TEXTURES } from '../textures';
import { ITEMS, ItemType } from '../items';
import { floatText, flyArc, pop, Point, glowFrame, setGlow } from '../fx';

// ===== Площадка =====

// Площадка лежит плоско на земле, на одном слое со светом костра (Campfire.ts):
// выше декора земли (-200 в GameScene), ниже всего, что стоит (depth = y ≥ 0).
const FLAT_ON_GROUND_DEPTH = -100;
// Прозрачность и размер площадки: обычно и когда вождь стоит в зоне.
const PLATFORM_IDLE_ALPHA = 0.75;
const PLATFORM_ACTIVE_ALPHA = 1;
const PLATFORM_ACTIVE_SCALE = 1.06;
// За сколько мс площадка подсвечивается или гаснет.
const PLATFORM_TWEEN_TIME = 160;
// Бледная картинка своего ресурса посередине площадки: что сюда складывать.
const ICON_ALPHA = 0.4;
const ICON_SCALE = 1.2;

// ===== Куча =====

// Сколько предметов в одном ряду кучи. Сколько всего — capacity из конструктора.
const PILE_COLUMNS = 3;
// Расстояние между предметами в ряду и высота ряда.
const PILE_COLUMN_STEP = 50;
const PILE_ROW_STEP = 18;
// Нечётные ряды сдвинуты вбок — предметы лежат «кирпичиком».
const PILE_BRICK_SHIFT = 10;
// Низ кучи ниже середины площадки на столько пикселей.
const PILE_BASE_OFFSET_Y = 22;
// Каждый следующий предмет в куче чуть ближе к нам, чем предыдущий.
const PILE_DEPTH_STEP = 0.001;

// ===== Полёт предмета в кучу =====

// Сколько мс предмет летит в кучу и как высоко поднимается дуга.
const FLY_TIME = 300;
const FLY_ARC_HEIGHT = 70;
// «+1» появляется над предметом, который лёг в кучу.
const PLUS_ONE_OFFSET_Y = 30;

/**
 * Куча одного типа ресурса у костра с лимитом: поленница (хворост),
 * куча сырого мяса у вертела, куча жареного мяса.
 *
 * Площадка со светлой рамкой и бледной картинкой своего ресурса.
 * Предметы по дуге летят в аккуратную кучу (receive) и забираются
 * с верха (takeTop): хворост — в огонь, сырое мясо — на вертел,
 * жареное — вождю на спину. Куча принимает только свой тип —
 * за этим следят системы (systems/Gathering.ts, Fire.ts, Cooking.ts).
 * Про вождя, рюкзак и костёр куча ничего не знает.
 */
export class ItemPile {
  // Середина площадки.
  readonly x: number;
  readonly y: number;
  // Какой ресурс лежит в этой куче.
  readonly type: ItemType;
  // Сколько мс вождь уже стоит на площадке. Набралось DROP_INTERVAL — кладёт
  // или забирает предмет. Меняет его systems/Gathering.ts.
  dropTimer = 0;

  private scene: Phaser.Scene;
  // Сколько предметов помещается в кучу.
  private capacity: number;
  private platform: Phaser.GameObjects.Image;
  // Светящаяся рамка площадки для подсказки обучения (создаётся при первой подсказке).
  private hintFrame?: Phaser.GameObjects.Graphics;
  // Подсвечена ли площадка сейчас (вождь в зоне).
  private isHighlighted = false;
  // Связки, лежащие в куче (и те, что уже летят туда, — место для них занято).
  // [0] — нижняя, последняя — верхняя.
  private pile: Phaser.GameObjects.Image[] = [];
  // Связки, которые ещё летят в кучу. Их пока нельзя забрать.
  private flyingItems = new Set<Phaser.GameObjects.Image>();

  // type — какой ресурс лежит в куче, capacity — сколько предметов помещается.
  constructor(scene: Phaser.Scene, x: number, y: number, type: ItemType, capacity: number) {
    this.scene = scene;
    this.x = x;
    this.y = y;
    this.type = type;
    this.capacity = capacity;

    this.platform = scene.add
      .image(x, y, TEXTURES.dropZone)
      .setDepth(FLAT_ON_GROUND_DEPTH)
      .setAlpha(PLATFORM_IDLE_ALPHA);
    // Иконка лежит на площадке, поверх рамки, но под предметами кучи.
    scene.add
      .image(x, y, ITEMS[type].texture)
      .setScale(ICON_SCALE)
      .setAlpha(ICON_ALPHA)
      .setDepth(FLAT_ON_GROUND_DEPTH + 1);
  }

  // Стоит ли точка (x, y) в зоне сдачи.
  contains(x: number, y: number): boolean {
    return Phaser.Math.Distance.Between(x, y, this.x, this.y) <= DROP_RADIUS;
  }

  // Куча полная: больше предметов не принять.
  isFull(): boolean {
    return this.pile.length >= this.capacity;
  }

  // В куче нет ни одного предмета.
  isEmpty(): boolean {
    return this.pile.length === 0;
  }

  // Свечение-обводка по краю площадки: сюда показывает подсказка обучения.
  setHintGlow(isOn: boolean): void {
    this.hintFrame ??= glowFrame(this.scene, this.platform);
    this.hintFrame.setVisible(isOn);
    setGlow(this.scene, this.hintFrame, isOn);
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

  // Принять предмет (со спины или с вертела): он летит по дуге в кучу.
  // Системы зовут это, только когда куча не полная.
  receive(item: Phaser.GameObjects.Image): void {
    // В стопке предмет мог быть наклонён — выпрямляем.
    item.setAngle(0);

    // Место в куче занимаем сразу, пока предмет ещё летит, — как в стопке за спиной.
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

  // Положить в кучу count предметов сразу, без полёта (стартовый запас уровня).
  // Больше, чем помещается, не кладём.
  fill(count: number): void {
    const total = Math.min(count, this.capacity - this.pile.length);
    for (let i = 0; i < total; i++) {
      const slotIndex = this.pile.length;
      const slot = this.getPileSlot(slotIndex);
      const item = this.scene.add
        .image(slot.x, slot.y, ITEMS[this.type].texture)
        .setOrigin(0.5, 1)
        .setDepth(this.getPileDepth(slotIndex));
      this.pile.push(item);
    }
  }

  // Забрать верхний предмет (в огонь, на вертел или на спину). Дальше его двигает тот, кто забрал.
  // Вернёт undefined, если куча пуста или верхний предмет ещё летит.
  takeTop(): Phaser.GameObjects.Image | undefined {
    const top = this.pile[this.pile.length - 1];
    if (!top || this.flyingItems.has(top)) return undefined;

    this.pile.pop();
    // «Пружинка» после приземления могла ещё идти — останавливаем её.
    this.scene.tweens.killTweensOf(top);
    top.setScale(1);
    return top;
  }

  // ===== Куча =====

  // Предмет лёг в кучу: «пружинка» и «+1».
  private store(item: Phaser.GameObjects.Image, slotIndex: number): void {
    this.flyingItems.delete(item);
    floatText(this.scene, item.x, item.y - PLUS_ONE_OFFSET_Y, '+1', COLORS.plusOne);
    item.setDepth(this.getPileDepth(slotIndex));
    pop(this.scene, item);
  }

  // Где лежит предмет номер index в куче (точка низа предмета).
  private getPileSlot(index: number): Point {
    const row = Math.floor(index / PILE_COLUMNS);
    const column = index % PILE_COLUMNS;
    // Нечётные ряды сдвинуты вбок — «кирпичиком».
    const brickShift = row % 2 === 1 ? PILE_BRICK_SHIFT : 0;
    // column − середина ряда: у левого предмета −1, у среднего 0, у правого +1.
    const columnFromCenter = column - (PILE_COLUMNS - 1) / 2;

    return {
      x: this.x + columnFromCenter * PILE_COLUMN_STEP + brickShift,
      y: this.y + PILE_BASE_OFFSET_Y - row * PILE_ROW_STEP,
    };
  }

  // Глубина предмета в куче: вся куча стоит на одной линии, каждый следующий чуть ближе.
  private getPileDepth(index: number): number {
    return this.y + PILE_BASE_OFFSET_Y + index * PILE_DEPTH_STEP;
  }
}
