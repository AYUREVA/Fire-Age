import Phaser from 'phaser';
import { TEXTURES } from '../textures';
import { ITEMS } from '../items';
import { pop, Point } from '../fx';
import { HELPERS, HelperData, HelperRole } from '../data/upgrades';
import { CarryStack } from './CarryStack';

// ===== Вид =====

// Тень под ногами: ширина в пикселях и глубина — сразу под помощником.
const SHADOW_WIDTH = 52;
const SHADOW_DEPTH_SHIFT = -0.5;
// На ходу помощник подпрыгивает и покачивается (как путники, Traveler.ts).
const WALK_BOB_HEIGHT = 3;
const WALK_BOB_SPEED = 0.018;
const WALK_ROCK_ANGLE = 3;
// Взмах: на сколько градусов помощник наклоняется в сторону цели.
const SWING_ANGLE = 14;
// Стопка за спиной: точка на спине относительно ног (x — от середины в сторону спины).
const BACK_OFFSET_X = -16;
const BACK_OFFSET_Y = -58;

// Что делает помощник. Это конечный автомат (план, раздел 0.8):
//   'hidden'   — не нанят, его нет на поле;
//   'seeking'  — ищет цель (куст, добычу, точку обхода) — решает systems/Helpers.ts;
//   'walking'  — идёт к цели по маршруту;
//   'acting'   — действует: рубит куст, бьёт волка, ловит кролика;
//   'carrying' — несёт добытое в кучу у костра;
//   'dropping' — сдаёт в кучу по одному предмету.
// Из любого рабочего состояния можно вернуться в 'seeking' — цель пропала или работа сделана.
export type HelperState = 'hidden' | 'seeking' | 'walking' | 'acting' | 'carrying' | 'dropping';

/**
 * Помощник вождя (с 0.8): сборщик или охотник. Один класс, роль — из данных
 * (data/upgrades.ts, HELPERS). Нанимается на точке покупки и появляется на её месте.
 *
 * Помощник хранит своё состояние автомата, маршрут (точки, по которым идёт)
 * и стопку за спиной, и показывает себя. Какую цель выбрать и когда перейти
 * в следующее состояние, решает systems/Helpers.ts. Про кусты, зверей,
 * кучи и частокол помощник ничего не знает.
 */
export class Helper {
  // Где ноги помощника.
  x: number;
  y: number;
  // Роль и что она умеет.
  readonly role: HelperRole;
  readonly info: HelperData;
  // Сколько мс прошло с прошлого удара или сданного предмета. Меняет systems/Helpers.ts.
  actTimer = 0;
  // Номер следующей точки обхода вокруг лагеря (у охотника). Меняет systems/Helpers.ts.
  patrolIndex = 0;

  private scene: Phaser.Scene;
  // Состояние автомата. Меняют его только функции переходов ниже.
  private state: HelperState = 'hidden';
  // Точки, по которым он идёт: [0] — ближайшая, последняя — цель. Пусто — пришёл.
  private route: Point[] = [];
  // Куда смотрит: 1 — вправо, -1 — влево.
  private facing = 1;
  // Сколько мс он идёт — из этого считается покачивание.
  private walkTime = 0;
  // Машет ли он сейчас (взмах ещё не кончился).
  private isSwingingNow = false;
  // Картинка, тень и стопка за спиной.
  private image: Phaser.GameObjects.Image;
  private shadow: Phaser.GameObjects.Image;
  private carry: CarryStack;

  // role — сборщик или охотник, (x, y) — где он появится после найма.
  constructor(scene: Phaser.Scene, role: HelperRole, x: number, y: number) {
    this.scene = scene;
    this.role = role;
    this.info = HELPERS[role];
    this.x = x;
    this.y = y;

    this.shadow = scene.add.image(x, y, TEXTURES.shadow).setVisible(false);
    this.shadow.setScale(SHADOW_WIDTH / this.shadow.width);
    this.image = scene.add.image(x, y, this.info.texture).setOrigin(0.5, 1).setVisible(false);
    // Сборщик носит хворост, охотник — сырое мясо. «МАКС» у помощников не показываем.
    const loot = role === 'gatherer' ? ITEMS.wood.texture : ITEMS.rawMeat.texture;
    this.carry = new CarryStack(scene, loot, this.info.carry, false);
  }

  // ===== Состояние (спрашивает systems/Helpers.ts) =====

  // Нанят ли — работает на поле.
  isHired(): boolean {
    return this.state !== 'hidden';
  }

  // Что он делает сейчас.
  getState(): HelperState {
    return this.state;
  }

  // Дошёл ли до конца маршрута.
  isArrived(): boolean {
    return this.route.length === 0;
  }

  // Куда он идёт — последняя точка маршрута (пришёл — там, где стоит).
  getDestination(): Point {
    return this.route[this.route.length - 1] ?? { x: this.x, y: this.y };
  }

  // Машет ли он сейчас.
  isSwinging(): boolean {
    return this.isSwingingNow;
  }

  // Стопка за спиной полная или пустая.
  isCarryFull(): boolean {
    return this.carry.isFull();
  }

  isCarryEmpty(): boolean {
    return this.carry.isEmpty();
  }

  // ===== Переходы автомата (зовёт systems/Helpers.ts) =====

  // hidden → seeking: наняли — появляется на месте точки найма и сразу ищет работу.
  hire(): void {
    if (this.state !== 'hidden') return;
    this.state = 'seeking';
    this.image.setVisible(true);
    this.shadow.setVisible(true);
    pop(this.scene, this.image);
  }

  // → seeking: искать новую цель.
  seek(): void {
    this.state = 'seeking';
    this.route = [];
  }

  // → walking: идти по маршруту route к цели.
  walkTo(route: Point[]): void {
    this.state = 'walking';
    this.route = route;
  }

  // Цель сдвинулась (зверь бежит) — последняя точка маршрута переезжает к ней,
  // точки калитки на пути остаются.
  retarget(to: Point): void {
    if (this.route.length === 0) {
      this.route = [to];
    } else {
      this.route[this.route.length - 1] = to;
    }
  }

  // → acting: пришёл к цели — действует.
  act(): void {
    this.state = 'acting';
    this.route = [];
    this.actTimer = 0;
  }

  // → carrying: нести добытое по маршруту route к куче.
  carryTo(route: Point[]): void {
    this.state = 'carrying';
    this.route = route;
  }

  // → dropping: пришёл к куче — сдаёт по одному.
  drop(): void {
    this.state = 'dropping';
    this.route = [];
    this.actTimer = 0;
  }

  // ===== Действия =====

  // Взмах в сторону targetX: наклон к цели и обратно за duration мс.
  // onImpact — в момент удара (в самом низу наклона).
  swing(targetX: number, duration: number, onImpact: () => void): void {
    this.isSwingingNow = true;
    this.facing = targetX >= this.x ? 1 : -1;
    this.image.setFlipX(this.facing < 0);
    this.scene.tweens.add({
      targets: this.image,
      angle: SWING_ANGLE * this.facing,
      duration: duration / 4,
      yoyo: true,
      ease: 'Sine.easeIn',
      onYoyo: onImpact,
      onComplete: () => {
        this.isSwingingNow = false;
      },
    });
  }

  // Положить в стопку предмет, который вылетает из точки from.
  addToCarry(from: Point): void {
    this.carry.add(from);
  }

  // Взять верхний предмет из стопки (сдать в кучу). undefined — пусто или он ещё летит.
  takeFromCarry(): Phaser.GameObjects.Image | undefined {
    return this.carry.takeTop();
  }

  // ===== Каждый кадр =====

  // Вызывается systems/Helpers.ts каждый кадр: идёт по маршруту и показывает себя.
  update(delta: number): void {
    if (this.state === 'hidden') return;

    const startX = this.x;
    const isMoving = this.walk(delta);
    const velocityX = ((this.x - startX) * 1000) / Math.max(delta, 1);

    // Покачивание на ходу; пока машет — наклоном управляет взмах.
    this.walkTime = isMoving ? this.walkTime + delta : 0;
    const bob = isMoving ? Math.abs(Math.sin(this.walkTime * WALK_BOB_SPEED)) * WALK_BOB_HEIGHT : 0;
    if (!this.isSwingingNow) {
      this.image.setAngle(isMoving ? Math.sin(this.walkTime * WALK_BOB_SPEED) * WALK_ROCK_ANGLE : 0);
    }
    this.image.setPosition(this.x, this.y - bob).setDepth(this.y);
    this.shadow.setPosition(this.x, this.y).setDepth(this.y + SHADOW_DEPTH_SHIFT);
    this.carry.update(
      delta,
      { x: this.x + BACK_OFFSET_X * this.facing, y: this.y + BACK_OFFSET_Y - bob },
      velocityX,
      this.y,
    );
  }

  // Шаг по маршруту: к ближайшей точке со своей скоростью. Дошёл до точки — следующая.
  // Вернёт true, если он сдвинулся.
  private walk(delta: number): boolean {
    const next = this.route[0];
    if (!next) return false;

    const step = (this.info.speed * delta) / 1000;
    const distance = Phaser.Math.Distance.Between(this.x, this.y, next.x, next.y);
    if (distance <= step) {
      this.x = next.x;
      this.y = next.y;
      this.route.shift();
    } else {
      this.x += ((next.x - this.x) / distance) * step;
      this.y += ((next.y - this.y) / distance) * step;
    }

    // Смотрит туда, куда идёт (если идёт заметно вбок).
    if (Math.abs(next.x - this.x) > 1 && !this.isSwingingNow) {
      this.facing = next.x > this.x ? 1 : -1;
      this.image.setFlipX(this.facing < 0);
    }
    return true;
  }
}
