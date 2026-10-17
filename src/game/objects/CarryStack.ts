import Phaser from 'phaser';
import { STACK_CAPACITY } from '../settings';
import { COLORS, toCss } from '../palette';
import { FONT_FAMILY } from '../textures';
import { flyArc, pop, Point } from '../fx';

// ===== Раскладка стопки =====

// На сколько пикселей каждый следующий предмет выше предыдущего.
const ITEM_STEP = 18;
// Стопка рисуется за спиной вождя: чуть дальше от нас, чем его тело.
const STACK_DEPTH_SHIFT = -0.2;
// Каждая следующая связка чуть ближе к нам, чем та, что под ней.
const ITEM_DEPTH_STEP = 0.001;
// Связки наклоняются вслед за изгибом стопки: градусов на пиксель сдвига.
const ITEM_TILT_PER_PIXEL = 0.5;

// ===== Наклон стопки при ходьбе — «пружина» =====

// На сколько пикселей отклоняется верх стопки на каждый пиксель/сек скорости вождя.
const LEAN_PER_SPEED = 0.09;
// Жёсткость пружины: больше — стопка быстрее догоняет нужный наклон.
const LEAN_STIFFNESS = 90;
// Затухание пружины: больше — стопка меньше раскачивается после остановки.
const LEAN_DAMPING = 9;
// Самый длинный шаг расчёта, секунды. Если кадр был очень долгим
// (например, вкладка была скрыта), пружина считает его как этот шаг и не «взрывается».
const MAX_STEP_SECONDS = 0.05;

// ===== Покачивание =====

// Размах покачивания самой верхней связки, пиксели.
const SWAY_AMPLITUDE = 3;
// Скорость покачивания (радиан за мс).
const SWAY_SPEED = 0.003;
// Сдвиг фазы между соседними связками: по стопке снизу вверх бежит волна.
const SWAY_PHASE_STEP = 0.35;

// ===== Полёт связки на стопку =====

// Сколько мс связка летит от куста до стопки.
const FLY_TIME = 380;
// На сколько пикселей дуга полёта поднимается над прямой.
const FLY_ARC_HEIGHT = 90;

// ===== Надпись «МАКС» =====

// Зазор между верхом стопки и надписью.
const MAX_LABEL_GAP = 14;
// Надпись пульсирует: до какого размера и как быстро.
const MAX_LABEL_PULSE = 1.12;
const MAX_LABEL_PULSE_TIME = 380;
// Надпись — над всеми предметами мира, но под летящими «+1».
const MAX_LABEL_DEPTH = 10500;

/**
 * Стопка одного типа ресурса за спиной вождя (хворост, сырое мясо…) —
 * одна колонка рюкзака (Backpack.ts). Главная механика игры.
 *
 * Что умеет:
 * - add(from)  — принять предмет: он по дуге прилетает на вершину;
 * - takeTop()  — отдать верхний предмет (например, куче у костра);
 * - isEmpty() / isFull() — пустая ли стопка / полная ли;
 * - update()   — каждый кадр разложить предметы над спиной, качнуть их
 *                и показать «МАКС», если стопка полная (STACK_CAPACITY).
 *
 * Про вождя стопка ничего не знает: рюкзак каждый кадр сообщает ей
 * точку на спине, скорость вождя и глубину.
 */
export class CarryStack {
  private scene: Phaser.Scene;
  // Картинка ресурса этой стопки.
  private texture: string;
  // Связки в стопке. [0] — нижняя, последняя — верхняя.
  private items: Phaser.GameObjects.Image[] = [];
  // Связки, которые ещё летят на своё место. Их двигает полёт, а не раскладка.
  private flyingItems = new Set<Phaser.GameObjects.Image>();

  // Точка на спине вождя, от которой растёт стопка (низ нижней связки).
  private anchor: Point = { x: 0, y: 0 };
  // Глубина нижней связки: сразу за спиной вождя.
  private baseDepth = 0;

  // Наклон: на сколько пикселей сейчас сдвинут верх стопки вбок.
  private lean = 0;
  // Скорость, с которой меняется наклон (пикселей в секунду) — у пружины есть инерция.
  private leanVelocity = 0;
  // Сколько мс прошло с начала игры — из этого считается покачивание.
  private swayTime = 0;

  // Надпись «МАКС» над полной стопкой.
  private maxLabel: Phaser.GameObjects.Text;

  // texture — картинка ресурса этой стопки (у каждого типа своя стопка).
  constructor(scene: Phaser.Scene, texture: string) {
    this.scene = scene;
    this.texture = texture;

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

  // Стопка полная: больше предметов не взять.
  isFull(): boolean {
    return this.items.length >= STACK_CAPACITY;
  }

  // В стопке нет ни одной связки.
  isEmpty(): boolean {
    return this.items.length === 0;
  }

  // Принять предмет, который вылетает из точки from (например, из куста).
  add(from: Point): void {
    if (this.isFull()) return;

    // 1. Создаём связку там, откуда она вылетает.
    const item = this.scene.add.image(from.x, from.y, this.texture).setOrigin(0.5, 1);

    // 2. Сразу кладём её в стопку — место наверху занято, пока она летит.
    //    Так вместимость считается честно: две связки не займут одно место.
    this.items.push(item);
    this.flyingItems.add(item);

    // 3. Связка летит по дуге в свою ячейку. Ячейка двигается вместе с вождём,
    //    поэтому её позицию спрашиваем каждый кадр полёта.
    flyArc(this.scene, item, {
      from,
      target: () => this.getSlotPosition(this.items.indexOf(item)),
      duration: FLY_TIME,
      height: FLY_ARC_HEIGHT,
      onLand: () => this.land(item),
    });
  }

  // Забрать верхнюю связку. Её дальше двигает тот, кто забрал (например, поленница).
  // Вернёт undefined, если стопка пуста или верхняя связка ещё летит.
  takeTop(): Phaser.GameObjects.Image | undefined {
    const top = this.items[this.items.length - 1];
    if (!top || this.flyingItems.has(top)) return undefined;

    this.items.pop();
    return top;
  }

  // Вызывается сценой каждый кадр.
  // anchor — точка на спине вождя, velocityX — его скорость по горизонтали,
  // depth — его глубина (стопка рисуется сразу за ним).
  update(delta: number, anchor: Point, velocityX: number, depth: number): void {
    this.anchor = anchor;
    this.baseDepth = depth + STACK_DEPTH_SHIFT;
    this.swayTime += delta;

    this.updateLean(velocityX, Math.min(delta / 1000, MAX_STEP_SECONDS));
    this.layoutItems();
    this.updateMaxLabel();
  }

  // ===== Внутренняя работа стопки =====

  // Связка долетела: теперь её ставит раскладка, а сама она «пружинит».
  private land(item: Phaser.GameObjects.Image): void {
    this.flyingItems.delete(item);
    pop(this.scene, item);
  }

  // Пружина наклона: верх стопки отстаёт от вождя и покачивается после остановки.
  private updateLean(velocityX: number, seconds: number): void {
    // Шаг 1. Куда должен отклониться верх стопки: в сторону, противоположную движению.
    const targetLean = -velocityX * LEAN_PER_SPEED;

    // Шаг 2. Сила пружины: тянет наклон к цели и гасит лишнюю скорость (затухание).
    const force = (targetLean - this.lean) * LEAN_STIFFNESS - this.leanVelocity * LEAN_DAMPING;

    // Шаг 3. Сила меняет скорость наклона, а скорость меняет сам наклон.
    //        Из-за инерции стопка проскакивает цель и пару раз качается — как пружинка.
    this.leanVelocity += force * seconds;
    this.lean += this.leanVelocity * seconds;
  }

  // Ставит каждую приземлившуюся связку в её ячейку.
  private layoutItems(): void {
    this.items.forEach((item, index) => {
      // Летящую связку двигает полёт — раскладка её не трогает.
      if (this.flyingItems.has(item)) return;

      const slot = this.getSlotPosition(index);
      item.setPosition(slot.x, slot.y);
      // Связка наклоняется вслед за изгибом стопки.
      item.setAngle((slot.x - this.anchor.x) * ITEM_TILT_PER_PIXEL);
      item.setDepth(this.baseDepth + index * ITEM_DEPTH_STEP);
    });
  }

  // Где должна стоять связка номер index (0 — нижняя). Возвращает точку низа связки.
  private getSlotPosition(index: number): Point {
    // Высота ячейки как доля: 0 у нижней связки, 1 у самой верхней возможной.
    const height = index / Math.max(1, STACK_CAPACITY - 1);

    // Наклон растёт как квадрат высоты: низ почти не сдвигается,
    // верх сдвигается сильнее всего — стопка гнётся дугой, как удочка.
    const leanOffset = this.lean * height * height;

    // Покачивание: синус, у каждой связки свой сдвиг фазы — по стопке бежит волна.
    // Внизу размах маленький, наверху — SWAY_AMPLITUDE.
    const swayOffset = Math.sin(this.swayTime * SWAY_SPEED - index * SWAY_PHASE_STEP) * SWAY_AMPLITUDE * height;

    return {
      x: this.anchor.x + leanOffset + swayOffset,
      y: this.anchor.y - index * ITEM_STEP,
    };
  }

  // «МАКС» виден только у полной стопки и висит прямо над её верхом.
  private updateMaxLabel(): void {
    const isFull = this.isFull();
    this.maxLabel.setVisible(isFull);
    if (!isFull) return;

    // Ячейка над самым верхним предметом — там и ставим надпись.
    const top = this.getSlotPosition(STACK_CAPACITY);
    this.maxLabel.setPosition(top.x, top.y - MAX_LABEL_GAP);
  }
}
