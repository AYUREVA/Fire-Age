import Phaser from 'phaser';
import { BACKPACK_CAPACITY } from '../settings';
import { COLORS, toCss } from '../palette';
import { FONT_FAMILY } from '../textures';
import { ITEM_ORDER, ITEMS, ItemType } from '../items';
import { Point } from '../fx';
import { CarryStack } from './CarryStack';

// ===== Колонки =====

// Расстояние между соседними колонками за спиной (пиксели).
const COLUMN_STEP = 34;
// Каждая следующая колонка чуть дальше от нас, чем предыдущая.
const COLUMN_DEPTH_STEP = -0.05;

// ===== Надпись «МАКС» =====

// Зазор между верхом самой высокой колонки и надписью.
const MAX_LABEL_GAP = 14;
// Надпись пульсирует: до какого размера и как быстро.
const MAX_LABEL_PULSE = 1.12;
const MAX_LABEL_PULSE_TIME = 380;
// Надпись — над всеми предметами мира, но под летящими «+1».
const MAX_LABEL_DEPTH = 10500;

/**
 * Рюкзак — всё, что вождь несёт за спиной: по колонке на каждый тип
 * ресурса (хворост, сырое мясо, жареное мясо). Каждая колонка — CarryStack.
 *
 * Колонки стоят рядом друг с другом за спиной в порядке ITEM_ORDER.
 * Пустая колонка не видна и не занимает места. Лимит BACKPACK_CAPACITY
 * общий на все колонки; когда спина полная, над ней горит «МАКС».
 * Про вождя рюкзак ничего не знает: сцена каждый кадр сообщает точку
 * на спине, скорость, глубину и куда смотрит вождь.
 */
export class Backpack {
  // По стопке на каждый тип ресурса.
  private stacks: Record<ItemType, CarryStack>;
  // Надпись «МАКС» над полной спиной.
  private maxLabel: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene) {
    this.stacks = {
      wood: new CarryStack(scene, ITEMS.wood.texture),
      rawMeat: new CarryStack(scene, ITEMS.rawMeat.texture),
      cookedMeat: new CarryStack(scene, ITEMS.cookedMeat.texture),
    };

    this.maxLabel = scene.add
      .text(0, 0, 'МАКС', {
        fontFamily: FONT_FAMILY,
        fontSize: '26px',
        fontStyle: 'bold',
        color: toCss(COLORS.maxText),
        stroke: toCss(COLORS.outline),
        strokeThickness: 6,
        resolution: 2,
      })
      .setOrigin(0.5, 1)
      .setDepth(MAX_LABEL_DEPTH)
      .setVisible(false);

    // Пульсация идёт всегда, но видна, только когда надпись показана.
    scene.tweens.add({
      targets: this.maxLabel,
      scale: MAX_LABEL_PULSE,
      duration: MAX_LABEL_PULSE_TIME,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  // Сколько всего предметов за спиной (во всех колонках).
  count(): number {
    return ITEM_ORDER.reduce((sum, type) => sum + this.stacks[type].count(), 0);
  }

  // Спина полная: больше ничего не взять.
  isFull(): boolean {
    return this.count() >= BACKPACK_CAPACITY;
  }

  // Есть ли за спиной хоть один предмет этого типа.
  has(type: ItemType): boolean {
    return !this.stacks[type].isEmpty();
  }

  // Принять предмет типа type, который вылетает из точки from. На полную спину не берём.
  add(type: ItemType, from: Point): void {
    if (this.isFull()) return;
    this.stacks[type].add(from);
  }

  // Забрать верхний предмет типа type. Вернёт undefined, если таких нет
  // или верхний ещё летит на спину.
  takeTop(type: ItemType): Phaser.GameObjects.Image | undefined {
    return this.stacks[type].takeTop();
  }

  // Вызывается сценой каждый кадр.
  // anchor — точка на спине, velocityX — скорость вождя, depth — его глубина,
  // facing — куда он смотрит (1 — вправо, -1 — влево): колонки уходят в обратную сторону.
  update(delta: number, anchor: Point, velocityX: number, depth: number, facing: number): void {
    // Номер места для следующей непустой колонки: 0 — у самой спины.
    let column = 0;

    for (const type of ITEM_ORDER) {
      const stack = this.stacks[type];
      const columnAnchor = { x: anchor.x - column * COLUMN_STEP * facing, y: anchor.y };
      stack.update(delta, columnAnchor, velocityX, depth + column * COLUMN_DEPTH_STEP);
      // Пустая колонка места не занимает — следующая встанет на её место.
      if (!stack.isEmpty()) column += 1;
    }

    this.updateMaxLabel();
  }

  // «МАКС» виден только у полной спины и висит над самой высокой колонкой.
  private updateMaxLabel(): void {
    const isFull = this.isFull();
    this.maxLabel.setVisible(isFull);
    if (!isFull) return;

    let tallest = this.stacks[ITEM_ORDER[0]];
    for (const type of ITEM_ORDER) {
      if (this.stacks[type].count() > tallest.count()) tallest = this.stacks[type];
    }
    const top = tallest.getTopPoint();
    this.maxLabel.setPosition(top.x, top.y - MAX_LABEL_GAP);
  }
}
