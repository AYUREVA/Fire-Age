import Phaser from 'phaser';
import { MAMMOTH_CHARGE_SPEED, MAMMOTH_HP, MAMMOTH_SPEED } from '../settings';
import { COLORS } from '../palette';
import { TEXTURES } from '../textures';
import { pop, Point } from '../fx';

// ===== Вид =====

// Тень под ногами: ширина в пикселях и глубина — сразу под мамонтом.
const SHADOW_WIDTH = 230;
const SHADOW_DEPTH_SHIFT = -0.5;
// На ходу мамонт тяжело покачивается вверх-вниз и с боку на бок.
const WALK_BOB_HEIGHT = 4;
const WALK_BOB_SPEED = 0.008;
const WALK_ROCK_ANGLE = 2;
// Роет землю копытом: быстро качается на столько градусов.
const PREPARE_ROCK_ANGLE = 4;
const PREPARE_ROCK_SPEED = 0.04;
// Таран: наклоняется вперёд на столько градусов.
const CHARGE_LEAN_ANGLE = 7;
// Устал: опускает голову (наклон вперёд-вниз) и над головой кружатся звёздочки.
const TIRED_LEAN_ANGLE = 10;
const TIRED_STAR_COUNT = 3;
const TIRED_STAR_SCALE = 0.45;
const TIRED_STAR_RADIUS_X = 38;
const TIRED_STAR_RADIUS_Y = 12;
const TIRED_STAR_SPEED = 0.005;
// Где звёздочки: над головой — от ног вперёд и вверх (картинка мамонта смотрит вправо).
const HEAD_OFFSET_X = 76;
const HEAD_OFFSET_Y = -210;
// Удар по мамонту: он на миг белеет и чуть пружинит.
const HIT_FLASH_TIME = 90;
const HIT_POP = 0.25;
// Падение: заваливается на бок и тает за FALL_TIME мс, потом на его месте — гора окороков
// (итоги показываются через MAMMOTH_FALL_TIME, settings.ts).
const FALL_ANGLE = 80;
const FALL_TIME = 700;

// Что делает мамонт. Это конечный автомат (план, раздел 4, «Финальный бой»):
//   'hidden'  — его ещё нет на поле (до дня боя);
//   'wander'  — идёт к цели: к вождю или к куче у костра;
//   'prepare' — роет землю копытом: сейчас будет таран;
//   'charge'  — таранит по прямой;
//   'tired'   — устал и стоит: окно для ударов;
//   'fallen'  — повержен.
// Когда переходить в следующее состояние, решает systems/Boss.ts.
export type MammothState = 'hidden' | 'wander' | 'prepare' | 'charge' | 'tired' | 'fallen';

/**
 * Мамонт — финальный босс каменного века (с 0.9).
 *
 * Мамонт хранит здоровье, состояние автомата, сколько он уже в этом
 * состоянии и куда идёт, и показывает себя. Какую цель выбрать, когда
 * таранить и что он задел, решает systems/Boss.ts. Про вождя, кучи
 * и частокол мамонт ничего не знает.
 */
export class Mammoth {
  // Где ноги мамонта.
  x = 0;
  y = 0;
  // Здоровье: 0 — повержен.
  hp = MAMMOTH_HP;
  // Сколько мс мамонт в текущем состоянии.
  stateTime = 0;
  // Цель: -1 — вождь, иначе номер кучи у костра. Выбирает systems/Boss.ts.
  aim = -1;
  // Задел ли этот таран вождя: за один таран вождь отлетает один раз. Меняет systems/Boss.ts.
  hasRammedPlayer = false;

  private scene: Phaser.Scene;
  // Состояние автомата. Меняют его только функции переходов ниже.
  private state: MammothState = 'hidden';
  // Куда идёт или таранит.
  private target: Point = { x: 0, y: 0 };
  // Куда смотрит: 1 — вправо, -1 — влево.
  private facing = 1;
  // Сколько мс он идёт — из этого считается покачивание.
  private walkTime = 0;
  // Картинка, тень и звёздочки над головой, когда устал.
  private image: Phaser.GameObjects.Image;
  private shadow: Phaser.GameObjects.Image;
  private stars: Phaser.GameObjects.Image[] = [];

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.shadow = scene.add.image(0, 0, TEXTURES.shadow).setVisible(false);
    this.shadow.setScale(SHADOW_WIDTH / this.shadow.width);
    this.image = scene.add.image(0, 0, TEXTURES.mammoth).setOrigin(0.5, 1).setVisible(false);
    for (let i = 0; i < TIRED_STAR_COUNT; i++) {
      this.stars.push(
        scene.add.image(0, 0, TEXTURES.star).setScale(TIRED_STAR_SCALE).setTint(COLORS.starOn).setVisible(false),
      );
    }
  }

  // ===== Состояние (спрашивает systems/Boss.ts) =====

  getState(): MammothState {
    return this.state;
  }

  // На поле ли он и ещё не повержен.
  isActive(): boolean {
    return this.state !== 'hidden' && this.state !== 'fallen';
  }

  // Можно ли ударить: только уставшего.
  canBeHit(): boolean {
    return this.state === 'tired';
  }

  // Дошёл ли до точки, к которой идёт или таранит.
  isArrived(): boolean {
    return this.x === this.target.x && this.y === this.target.y;
  }

  // ===== Переходы автомата (зовёт systems/Boss.ts) =====

  // hidden → wander: выходит из леса в точке from.
  appear(from: Point): void {
    if (this.state !== 'hidden') return;
    this.x = from.x;
    this.y = from.y;
    this.target = { ...from };
    this.image.setVisible(true);
    this.shadow.setVisible(true);
    this.enter('wander');
  }

  // Идти к точке to (цель сдвинулась — точка переезжает).
  walkTo(to: Point): void {
    this.target = { ...to };
  }

  // tired → wander: отдохнул — снова ищет цель.
  wander(): void {
    this.enter('wander');
  }

  // wander → prepare: остановился и роет землю копытом в сторону toX.
  prepare(toX: number): void {
    this.target = { x: this.x, y: this.y };
    this.face(toX);
    this.enter('prepare');
  }

  // prepare → charge: таран по прямой до точки to.
  charge(to: Point): void {
    this.target = { ...to };
    this.hasRammedPlayer = false;
    this.face(to.x);
    this.enter('charge');
  }

  // charge → tired: таран кончился (добежал или врезался) — стоит уставший.
  tire(): void {
    this.target = { x: this.x, y: this.y };
    this.enter('tired');
  }

  // Удар на damage. Здоровье кончилось — мамонт повержен.
  hit(damage: number): void {
    if (!this.canBeHit()) return;
    this.hp = Math.max(0, this.hp - damage);
    this.image.setTint(COLORS.white).setTintMode(Phaser.TintModes.FILL);
    this.scene.time.delayedCall(HIT_FLASH_TIME, () => this.image.clearTint());
    pop(this.scene, this.image, 1, HIT_POP);
    if (this.hp === 0) this.fall();
  }

  // → fallen: заваливается на бок и тает, на его месте вырастает гора окороков (мультяшная декорация).
  private fall(): void {
    this.enter('fallen');
    this.scene.tweens.add({
      targets: this.image,
      angle: FALL_ANGLE * this.facing,
      alpha: 0,
      duration: FALL_TIME,
      ease: 'Quad.easeIn',
      onComplete: () => {
        this.image.setVisible(false);
        this.shadow.setVisible(false);
        const mountain = this.scene.add.image(this.x, this.y, TEXTURES.meatMountain).setOrigin(0.5, 1).setDepth(this.y);
        pop(this.scene, mountain);
      },
    });
  }

  // Новое состояние: время в нём — с нуля, звёздочки — только у уставшего.
  private enter(state: MammothState): void {
    this.state = state;
    this.stateTime = 0;
    for (const star of this.stars) star.setVisible(state === 'tired');
  }

  // Повернуться к точке с координатой x.
  private face(x: number): void {
    if (Math.abs(x - this.x) < 1) return;
    this.facing = x > this.x ? 1 : -1;
    this.image.setFlipX(this.facing < 0);
  }

  // ===== Каждый кадр =====

  // Вызывается systems/Boss.ts каждый кадр: идёт к цели и показывает себя.
  update(delta: number): void {
    if (this.state === 'hidden') return;
    this.stateTime += delta;
    if (this.state === 'fallen') return;

    const isMoving = this.state === 'wander' || this.state === 'charge';
    if (isMoving) this.move(delta, this.state === 'charge' ? MAMMOTH_CHARGE_SPEED : MAMMOTH_SPEED);
    this.walkTime = isMoving ? this.walkTime + delta : 0;

    const wave = Math.sin(this.walkTime * WALK_BOB_SPEED);
    const bob = this.state === 'wander' ? Math.abs(wave) * WALK_BOB_HEIGHT : 0;
    this.image.setAngle(this.getAngle(wave));
    this.image.setPosition(this.x, this.y - bob).setDepth(this.y);
    this.shadow.setPosition(this.x, this.y).setDepth(this.y + SHADOW_DEPTH_SHIFT);
    this.placeStars();
  }

  // Наклон картинки в этом состоянии (положительный угол — вперёд по взгляду).
  private getAngle(wave: number): number {
    switch (this.state) {
      case 'wander':
        return wave * WALK_ROCK_ANGLE;
      case 'prepare':
        return Math.sin(this.stateTime * PREPARE_ROCK_SPEED) * PREPARE_ROCK_ANGLE;
      case 'charge':
        return CHARGE_LEAN_ANGLE * this.facing;
      case 'tired':
        return TIRED_LEAN_ANGLE * this.facing;
      default:
        return 0;
    }
  }

  // Шаг к цели со скоростью speed. Дошёл — встаёт точно в неё.
  private move(delta: number, speed: number): void {
    const step = (speed * delta) / 1000;
    const distance = Phaser.Math.Distance.Between(this.x, this.y, this.target.x, this.target.y);
    if (distance <= step) {
      this.x = this.target.x;
      this.y = this.target.y;
      return;
    }
    this.face(this.target.x);
    this.x += ((this.target.x - this.x) / distance) * step;
    this.y += ((this.target.y - this.y) / distance) * step;
  }

  // Звёздочки кружатся над головой уставшего мамонта.
  private placeStars(): void {
    if (this.state !== 'tired') return;
    const headX = this.x + HEAD_OFFSET_X * this.facing;
    const headY = this.y + HEAD_OFFSET_Y;
    this.stars.forEach((star, index) => {
      const angle = this.stateTime * TIRED_STAR_SPEED + (index * Math.PI * 2) / this.stars.length;
      star
        .setPosition(headX + Math.cos(angle) * TIRED_STAR_RADIUS_X, headY + Math.sin(angle) * TIRED_STAR_RADIUS_Y)
        .setDepth(this.y + 1);
    });
  }
}
