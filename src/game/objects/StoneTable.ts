import Phaser from 'phaser';
import { DROP_RADIUS, TABLE_CAPACITY, WORLD_EDGE, WORLD_HEIGHT } from '../settings';
import { TEXTURES } from '../textures';
import { ITEMS, ItemType } from '../items';
import { flyArc, pop, Point, glowFrame, setGlow } from '../fx';

// ===== Площадка у стола =====

// Площадка лежит плоско на земле, как у куч (ItemPile.ts).
const FLAT_ON_GROUND_DEPTH = -100;
// Площадка — над столом (вождь подходит к столу сверху): на столько пикселей
// выше его основания.
const ZONE_OFFSET_Y = -175;
// Прозрачность и размер площадки: обычно и когда вождь стоит в зоне.
const PLATFORM_IDLE_ALPHA = 0.75;
const PLATFORM_ACTIVE_ALPHA = 1;
const PLATFORM_ACTIVE_SCALE = 1.06;
// За сколько мс площадка подсвечивается или гаснет.
const PLATFORM_TWEEN_TIME = 160;
// Бледная картинка жареного мяса на площадке: что сюда нести (как у куч).
const ICON_ALPHA = 0.4;
const ICON_SCALE = 1.2;

// ===== Еда на столе =====

// Еда лежит на шкуре двумя рядами: сколько в ряду, шаг по ряду и между рядами.
const FOOD_COLUMNS = 4;
const FOOD_COLUMN_STEP = 32;
const FOOD_ROW_STEP = 14;
// Низ дальнего ряда еды — на столько пикселей выше основания стола.
const FOOD_TOP_Y = 92;
// Еда лежит перед столом; каждый следующий кусок чуть ближе к нам.
const FOOD_DEPTH_SHIFT = 0.1;
const FOOD_DEPTH_STEP = 0.001;
// Сколько мс еда летит на стол и как высоко поднимается дуга.
const FOOD_FLY_TIME = 260;
const FOOD_FLY_ARC = 60;

// ===== Очередь путников =====

// Очередь стоит под столом столбиком вниз: первое место — сразу под столом.
const QUEUE_START_Y = 80;
const QUEUE_STEP = 100;
// Путники выходят из леса и уходят в лес у нижнего края мира, чуть за границей поля,
// и по горизонтали — не дальше этого от стола.
const FOREST_SHIFT_Y = 60;
const FOREST_SPREAD_X = 200;

// ===== Кучка клыков =====

// Клыки лежат кучкой на верхнем краю шкуры, слева — со стороны вождя.
const TUSK_PILE_OFFSET = { x: -86, y: -98 };
// Кучка: сколько клыков в ряду, шаг по ряду и между рядами.
const TUSK_COLUMNS = 3;
const TUSK_COLUMN_STEP = 12;
const TUSK_ROW_STEP = 6;
// Клыки лежат на шкуре набок (угол в градусах) и чуть меньше, чем в счётчике.
const TUSK_LYING_ANGLE = 75;
const TUSK_LYING_SCALE = 0.8;
// Клыки лежат на столе — чуть ближе к нам, чем сам стол.
const TUSK_DEPTH_SHIFT = 0.2;
// Клык летит от путника к кучке.
const TUSK_FLY_TIME = 420;
const TUSK_FLY_ARC = 70;
// Клыки на столе подпрыгивают — зовут их забрать: высота подскока (пиксели),
// длительность подскока (мс), пауза между подскоками (мс) и запаздывание соседнего клыка
// (мс) — по кучке бежит волна.
const TUSK_HOP_HEIGHT = 5;
const TUSK_HOP_TIME = 160;
const TUSK_HOP_PAUSE = 1400;
const TUSK_HOP_WAVE_STEP = 70;

// Еда на столе: картинка и что это за еда.
type Food = { image: Phaser.GameObjects.Image; type: ItemType };

/**
 * Каменный стол со шкурой — сюда вождь выкладывает жареную еду для путников.
 *
 * Над столом площадка: вождь подходит сверху, и еда со спины перелетает
 * на стол (systems/Serving.ts), а клыки с верхнего края стола — в счётчик.
 * Под столом столбиком стоит очередь путников, они приходят из леса снизу.
 * Про вождя и путников стол ничего не знает.
 */
export class StoneTable {
  // Основание стола (середина нижнего края).
  readonly x: number;
  readonly y: number;
  // Сколько мс вождь уже стоит у стола. Набралось TABLE_DROP_INTERVAL — кладёт кусок.
  // Меняет systems/Serving.ts.
  dropTimer = 0;
  // Сколько мс прошло с прихода последнего путника. Меняет systems/Serving.ts.
  spawnTimer = 0;
  // Номер талона для следующего путника: кто пришёл раньше — стоит ближе к столу.
  nextTicket = 1;

  private scene: Phaser.Scene;
  // Площадка перед столом и её середина.
  private platform: Phaser.GameObjects.Image;
  private zone: Point;
  // Светящаяся рамка площадки для подсказки обучения (создаётся при первой подсказке).
  private hintFrame?: Phaser.GameObjects.Graphics;
  // Подсвечена ли площадка сейчас.
  private isHighlighted = false;
  // Еда на столе (и та, что ещё летит туда). Еда, которая ещё летит.
  private food: Food[] = [];
  private flyingFood = new Set<Phaser.GameObjects.Image>();
  // Клыки в кучке (и те, что ещё летят туда). Клыки, которые ещё летят.
  private tusks: Phaser.GameObjects.Image[] = [];
  private flyingTusks = new Set<Phaser.GameObjects.Image>();

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.scene = scene;
    this.x = x;
    this.y = y;
    this.zone = { x, y: y + ZONE_OFFSET_Y };

    this.platform = scene.add
      .image(this.zone.x, this.zone.y, TEXTURES.dropZone)
      .setDepth(FLAT_ON_GROUND_DEPTH)
      .setAlpha(PLATFORM_IDLE_ALPHA);
    scene.add
      .image(this.zone.x, this.zone.y, ITEMS.cookedMeat.texture)
      .setScale(ICON_SCALE)
      .setAlpha(ICON_ALPHA)
      .setDepth(FLAT_ON_GROUND_DEPTH + 1);
    scene.add.image(x, y, TEXTURES.stoneTable).setOrigin(0.5, 1).setDepth(y);
  }

  // ===== Площадка и еда =====

  // Середина площадки над столом: сюда вождь встаёт, чтобы выложить еду и собрать клыки.
  getZonePoint(): Point {
    return this.zone;
  }

  // Стоит ли точка (x, y) на площадке перед столом.
  contains(x: number, y: number): boolean {
    return Phaser.Math.Distance.Between(x, y, this.zone.x, this.zone.y) <= DROP_RADIUS;
  }

  // Свечение-обводка по краю площадки над столом: сюда показывает подсказка обучения.
  setHintGlow(isOn: boolean): void {
    this.hintFrame ??= glowFrame(this.scene, this.platform);
    this.hintFrame.setVisible(isOn);
    setGlow(this.scene, this.hintFrame, isOn);
  }

  // Подсветка площадки, пока вождь на ней. Твин — только когда подсветка меняется.
  setHighlighted(isOn: boolean): void {
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

  // На столе больше нет места.
  isFull(): boolean {
    return this.food.length >= TABLE_CAPACITY;
  }

  // Лежит ли на столе (уже не в полёте) еда этого типа.
  has(type: ItemType): boolean {
    return this.food.some((food) => food.type === type && !this.flyingFood.has(food.image));
  }

  // Принять еду типа type: она по дуге летит на свободное место на шкуре.
  receive(item: Phaser.GameObjects.Image, type: ItemType): void {
    item.setAngle(0);
    const food = { image: item, type };
    this.food.push(food);
    this.flyingFood.add(item);

    flyArc(this.scene, item, {
      from: { x: item.x, y: item.y },
      // Место ищем каждый кадр: пока кусок летит, другие могли забрать.
      target: () => this.getFoodSlot(this.food.indexOf(food)),
      duration: FOOD_FLY_TIME,
      height: FOOD_FLY_ARC,
      onLand: () => {
        this.flyingFood.delete(item);
        this.layoutFood();
        pop(this.scene, item);
      },
    });
  }

  // Забрать со стола кусок еды типа type (его заберёт путник).
  // Вернёт undefined, если такой еды на столе нет.
  takeFood(type: ItemType): Phaser.GameObjects.Image | undefined {
    const index = this.food.findIndex((food) => food.type === type && !this.flyingFood.has(food.image));
    if (index < 0) return undefined;

    const [food] = this.food.splice(index, 1);
    this.scene.tweens.killTweensOf(food.image);
    food.image.setScale(1);
    // Остальная еда сдвигается, чтобы на столе не было дырок.
    this.layoutFood();
    return food.image;
  }

  // Место путника номер index в очереди (0 — первый, сразу под столом).
  getQueueSlot(index: number): Point {
    return { x: this.x, y: this.y + QUEUE_START_Y + index * QUEUE_STEP };
  }

  // Случайная точка в лесу внизу, недалеко от стола: отсюда путники приходят и сюда уходят.
  getForestPoint(): Point {
    return {
      x: this.x + Phaser.Math.Between(-FOREST_SPREAD_X, FOREST_SPREAD_X),
      y: WORLD_HEIGHT - WORLD_EDGE + FOREST_SHIFT_Y,
    };
  }

  // ===== Клыки =====

  // Накормленный путник оставляет count клыков: они летят из точки from в кучку на верхнем краю стола.
  addTusks(count: number, from: Point): void {
    for (let i = 0; i < count; i++) {
      const tusk = this.scene.add.image(from.x, from.y, TEXTURES.tusk).setOrigin(0.5, 1);
      const slot = this.getTuskSlot(this.tusks.length);
      this.tusks.push(tusk);
      this.flyingTusks.add(tusk);

      flyArc(this.scene, tusk, {
        from,
        target: () => slot,
        duration: TUSK_FLY_TIME,
        height: TUSK_FLY_ARC,
        onLand: () => {
          this.flyingTusks.delete(tusk);
          tusk.setDepth(this.y + TUSK_DEPTH_SHIFT).setAngle(TUSK_LYING_ANGLE);
          pop(this.scene, tusk, TUSK_LYING_SCALE);
          this.startTuskHops(tusk, slot);
        },
      });
    }
  }

  // Клык на столе подпрыгивает снова и снова, пока его не заберут (takeTusks
  // останавливает твин). Клыки с бо́льшим номером прыгают чуть позже — бежит волна.
  private startTuskHops(tusk: Phaser.GameObjects.Image, slot: Point): void {
    const index = this.tusks.indexOf(tusk);
    this.scene.tweens.add({
      targets: tusk,
      y: slot.y - TUSK_HOP_HEIGHT,
      duration: TUSK_HOP_TIME,
      ease: 'Sine.easeOut',
      yoyo: true,
      repeat: -1,
      repeatDelay: TUSK_HOP_PAUSE,
      delay: TUSK_HOP_PAUSE / 2 + index * TUSK_HOP_WAVE_STEP,
    });
  }

  // Забрать из кучки все клыки, которые уже долетели. Их дальше двигает тот, кто забрал.
  takeTusks(): Phaser.GameObjects.Image[] {
    const landed = this.tusks.filter((tusk) => !this.flyingTusks.has(tusk));
    this.tusks = this.tusks.filter((tusk) => this.flyingTusks.has(tusk));
    for (const tusk of landed) {
      this.scene.tweens.killTweensOf(tusk);
    }
    return landed;
  }

  // ===== Раскладка =====

  // Где лежит кусок еды номер index (точка низа куска): два ряда на шкуре.
  private getFoodSlot(index: number): Point {
    const row = Math.floor(index / FOOD_COLUMNS);
    const column = index % FOOD_COLUMNS;
    // column − середина ряда: у крайних кусков ±1.5, у средних ±0.5.
    const columnFromCenter = column - (FOOD_COLUMNS - 1) / 2;
    return {
      x: this.x + columnFromCenter * FOOD_COLUMN_STEP,
      y: this.y - FOOD_TOP_Y + row * FOOD_ROW_STEP,
    };
  }

  // Ставит каждый долетевший кусок на его место и глубину.
  private layoutFood(): void {
    this.food.forEach((food, index) => {
      if (this.flyingFood.has(food.image)) return;
      const slot = this.getFoodSlot(index);
      food.image.setPosition(slot.x, slot.y).setDepth(this.y + FOOD_DEPTH_SHIFT + index * FOOD_DEPTH_STEP);
    });
  }

  // Где лежит клык номер index в кучке (точка низа клыка).
  private getTuskSlot(index: number): Point {
    const row = Math.floor(index / TUSK_COLUMNS);
    const column = index % TUSK_COLUMNS;
    // Нечётные ряды сдвинуты на полшага — клыки лежат горкой.
    const shift = row % 2 === 1 ? TUSK_COLUMN_STEP / 2 : 0;
    return {
      x: this.x + TUSK_PILE_OFFSET.x + (column - (TUSK_COLUMNS - 1) / 2) * TUSK_COLUMN_STEP + shift,
      y: this.y + TUSK_PILE_OFFSET.y - row * TUSK_ROW_STEP,
    };
  }
}
