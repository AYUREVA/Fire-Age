import Phaser from 'phaser';
import { ITEM_ORDER, ITEMS, ItemType } from '../items';
import { Point } from '../fx';
import { CarryStack } from './CarryStack';

// ===== Колонки =====

// Расстояние между соседними колонками за спиной (пиксели).
const COLUMN_STEP = 34;
// Каждая следующая колонка чуть дальше от нас, чем предыдущая.
const COLUMN_DEPTH_STEP = -0.05;

/**
 * Рюкзак — всё, что вождь несёт за спиной: по колонке на каждый тип
 * ресурса (хворост, сырое мясо, жареное мясо). Каждая колонка — CarryStack.
 *
 * Колонки стоят рядом друг с другом за спиной в порядке ITEM_ORDER.
 * Пустая колонка не видна и не занимает места. У каждой колонки свой
 * одинаковый лимит STACK_CAPACITY; полная колонка показывает «МАКС» сама.
 * Про вождя рюкзак ничего не знает: сцена каждый кадр сообщает точку
 * на спине, скорость, глубину и куда смотрит вождь.
 */
export class Backpack {
  // По стопке на каждый тип ресурса.
  private stacks: Record<ItemType, CarryStack>;

  constructor(scene: Phaser.Scene) {
    this.stacks = {
      wood: new CarryStack(scene, ITEMS.wood.texture),
      rawMeat: new CarryStack(scene, ITEMS.rawMeat.texture),
      cookedMeat: new CarryStack(scene, ITEMS.cookedMeat.texture),
    };
  }

  // Колонка этого типа полная: таких предметов больше не взять.
  isFull(type: ItemType): boolean {
    return this.stacks[type].isFull();
  }

  // Есть ли за спиной хоть один предмет этого типа.
  has(type: ItemType): boolean {
    return !this.stacks[type].isEmpty();
  }

  // Принять предмет типа type, который вылетает из точки from. В полную колонку не берём.
  add(type: ItemType, from: Point): void {
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
  }
}
