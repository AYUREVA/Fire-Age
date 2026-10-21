import Phaser from 'phaser';
import {
  WOLF_CARRY_SPEED,
  WOLF_FIRST_DELAY,
  WOLF_FLEE_SPEED,
  WOLF_HP,
  WOLF_KNOCKBACK,
  WOLF_RETURN_TIME_MAX,
  WOLF_RETURN_TIME_MIN,
  WOLF_SPEED,
  WOLF_STUN_TIME,
  WORLD_EDGE,
  WORLD_HEIGHT,
  WORLD_WIDTH,
} from '../settings';
import { TEXTURES } from '../textures';
import { ItemType } from '../items';
import { CanStep, flyArc, Point, shake } from '../fx';

// ===== Вид =====

// Тень под волком.
const SHADOW_WIDTH = 84;
const SHADOW_DEPTH_SHIFT = -0.5;
// Бег вприпрыжку: высота подскока (пиксели), скорость (радиан за мс)
// и наклон тела вверх-вниз на каждом скачке (градусы).
const RUN_BOB_HEIGHT = 4;
const RUN_BOB_SPEED = 0.02;
const RUN_TILT = 4;
// Где пасть волка, когда он смотрит вправо (от лап): туда летит и там висит добыча.
const MOUTH_X = 50;
const MOUTH_Y = -42;
// Добыча в зубах — чуть ближе к нам, чем волк.
const LOOT_DEPTH_SHIFT = 0.1;
// Сколько мс добыча летит со спины вождя в пасть и как высоко по дуге.
const LOOT_FLY_TIME = 220;
const LOOT_FLY_ARC = 30;
// Удар: волк трясётся (самый большой наклон, градусы).
const HIT_SHAKE_ANGLE = 14;
// Дошёл до точки, если ближе этого (пиксели).
const ARRIVE_DISTANCE = 6;

// Что сейчас делает волк.
// 'gone' — в лесу, ждёт, чтобы выйти; 'hunt' — бежит к вождю;
// 'stunned' — оглушён ударом, его отбрасывает; 'escape' — убегает в лес с добычей;
// 'flee' — отогнан или устал гоняться и убегает в лес.
type WolfState = 'gone' | 'hunt' | 'stunned' | 'escape' | 'flee';

// Добыча волка: картинка в зубах и что это за предмет.
export type Loot = { type: ItemType; image: Phaser.GameObjects.Image };

// Чем кончился удар: отогнан ли волк и что он выронил (если нёс добычу и отогнан).
export type WolfHit = { isDriven: boolean; loot?: Loot };

/**
 * Волк: выходит из леса, бежит к вождю, крадёт верхний предмет со спины
 * и убегает с ним в лес. Ударенный волк трясётся и отлетает назад;
 * кончилось здоровье — роняет добычу и удирает. Без крови: волк просто убегает.
 *
 * Про вождя волк знает только точку — её передаёт systems/Predators.ts.
 * Когда выйти, красть и бить, решает тоже Predators.ts.
 */
export class Wolf {
  // Где лапы волка.
  x = 0;
  y = 0;
  // Сколько мс ещё ждать в лесу, прежде чем выйти. Меняет systems/Predators.ts.
  returnTimer: number;
  // Сколько мс волк уже гонится за вождём. Набралось WOLF_GIVE_UP_TIME — уходит.
  huntTime = 0;
  // Здоровье: сколько урона ещё выдержит.
  hp = WOLF_HP;

  private scene: Phaser.Scene;
  // Что волк делает сейчас.
  private state: WolfState = 'gone';
  // Куда волк убегает в лес.
  private exit: Point = { x: 0, y: 0 };
  // Откуда пришёл последний удар: от этой точки волка отбрасывает.
  private hitFrom: Point = { x: 0, y: 0 };
  // Сколько мс ещё длится оглушение.
  private stunTime = 0;
  // Добыча в зубах (если есть) и долетела ли она уже до пасти.
  private loot?: Loot;
  private isLootInMouth = false;
  // Время бега — из него считаются подскоки.
  private runTime = 0;
  // Куда смотрит: 1 — вправо, -1 — влево.
  private facing = 1;
  // Проверка шага на этот кадр (её передаёт update()): частокол волков не пускает.
  private canStep: CanStep = () => true;

  private image: Phaser.GameObjects.Image;
  private shadow: Phaser.GameObjects.Image;

  // returnDelay — через сколько мс после начала игры этот волк выйдет впервые.
  constructor(scene: Phaser.Scene, returnDelay = WOLF_FIRST_DELAY) {
    this.scene = scene;
    this.returnTimer = returnDelay;
    this.shadow = scene.add.image(0, 0, TEXTURES.shadow).setVisible(false);
    this.shadow.setScale(SHADOW_WIDTH / this.shadow.width);
    this.image = scene.add.image(0, 0, TEXTURES.wolf).setOrigin(0.5, 1).setVisible(false);
  }

  // ===== Состояние (спрашивает и меняет systems/Predators.ts) =====

  // Волк в лесу.
  isGone(): boolean {
    return this.state === 'gone';
  }

  // Волк бежит к вождю (может украсть).
  isHunting(): boolean {
    return this.state === 'hunt';
  }

  // Волка можно ударить: он на поле и ещё не отогнан.
  canBeHit(): boolean {
    return this.state === 'hunt' || this.state === 'stunned' || this.state === 'escape';
  }

  // Выйти из леса в точке from и бежать к вождю.
  comeOut(from: Point): void {
    this.x = from.x;
    this.y = from.y;
    this.state = 'hunt';
    this.hp = WOLF_HP;
    this.huntTime = 0;
    this.image.setVisible(true).setAngle(0);
    this.shadow.setVisible(true);
    this.place(0);
  }

  // Схватить добычу: она летит со спины вождя в пасть, волк убегает в лес.
  grab(loot: Loot): void {
    this.loot = loot;
    this.isLootInMouth = false;
    this.state = 'escape';
    this.exit = nearestForestPoint(this.x, this.y);
    loot.image.setAngle(0).setOrigin(0.5, 0.5);

    flyArc(this.scene, loot.image, {
      from: { x: loot.image.x, y: loot.image.y },
      target: () => this.getMouthPoint(),
      duration: LOOT_FLY_TIME,
      height: LOOT_FLY_ARC,
      onLand: () => {
        // Пока добыча летела, волка могли отогнать — тогда она уже не его.
        if (this.loot !== loot) return;
        this.isLootInMouth = true;
      },
    });
  }

  // Удар оружием с уроном damage, вождь в точке (fromX, fromY).
  // Волк трясётся и отлетает. Кончилось здоровье — отогнан: роняет добычу и удирает.
  hit(damage: number, fromX: number, fromY: number): WolfHit {
    this.hp -= damage;
    this.hitFrom = { x: fromX, y: fromY };
    shake(this.scene, this.image, HIT_SHAKE_ANGLE, WOLF_STUN_TIME);

    if (this.hp > 0) {
      this.state = 'stunned';
      this.stunTime = WOLF_STUN_TIME;
      return { isDriven: false };
    }

    const loot = this.loot;
    this.loot = undefined;
    this.runAway();
    return { isDriven: true, loot };
  }

  // Устал гоняться (или красть нечего) — убегает в лес.
  giveUp(): void {
    this.runAway();
  }

  // ===== Каждый кадр =====

  // Вызывается systems/Predators.ts каждый кадр. (playerX, playerY) — где вождь,
  // canStep — можно ли шагнуть из точки в точку (сквозь частокол волки не ходят).
  // Вернёт true, если волк только что убежал в лес с добычей (предмет пропал).
  update(delta: number, playerX: number, playerY: number, canStep: CanStep): boolean {
    if (this.state === 'gone') return false;
    this.canStep = canStep;
    this.runTime += delta;

    switch (this.state) {
      case 'hunt':
        this.huntTime += delta;
        this.moveTowards(playerX, playerY, WOLF_SPEED, delta);
        break;
      case 'stunned':
        this.updateStun(delta);
        break;
      case 'escape':
        if (this.moveTowards(this.exit.x, this.exit.y, WOLF_CARRY_SPEED, delta)) return this.hide();
        break;
      case 'flee':
        if (this.moveTowards(this.exit.x, this.exit.y, WOLF_FLEE_SPEED, delta)) return this.hide();
        break;
    }

    this.place(this.state === 'stunned' ? 0 : delta);
    return false;
  }

  // Оглушён: отлетает от удара, потом снова бежит — к вождю или с добычей в лес.
  private updateStun(delta: number): void {
    const knockSpeed = (WOLF_KNOCKBACK * 1000) / WOLF_STUN_TIME;
    const away = new Phaser.Math.Vector2(this.x - this.hitFrom.x, this.y - this.hitFrom.y).normalize();
    this.moveTowards(this.x + away.x * WOLF_KNOCKBACK, this.y + away.y * WOLF_KNOCKBACK, knockSpeed, delta, false);

    this.stunTime -= delta;
    if (this.stunTime > 0) return;
    this.state = this.loot ? 'escape' : 'hunt';
  }

  // Шаг к точке (targetX, targetY) со скоростью speed. Вернёт true, если дошёл.
  // Шаг по x и по y проверяется отдельно: упёрся в частокол — скользит вдоль него.
  // turn — поворачиваться ли мордой по ходу (отлетая от удара, волк не поворачивается).
  private moveTowards(targetX: number, targetY: number, speed: number, delta: number, turn = true): boolean {
    const distance = Phaser.Math.Distance.Between(this.x, this.y, targetX, targetY);
    const step = (speed * delta) / 1000;
    if (distance <= Math.max(step, ARRIVE_DISTANCE)) {
      this.stepTo(targetX, targetY);
      return this.x === targetX && this.y === targetY;
    }

    const direction = new Phaser.Math.Vector2(targetX - this.x, targetY - this.y).normalize();
    this.stepTo(this.x + direction.x * step, this.y + direction.y * step);
    if (turn && direction.x !== 0) this.facing = direction.x > 0 ? 1 : -1;
    return false;
  }

  // Шагнуть в точку (x, y), если частокол пускает: отдельно по x и по y.
  private stepTo(x: number, y: number): void {
    if (this.canStep(this.x, this.y, x, this.y)) this.x = x;
    if (this.canStep(this.x, this.y, this.x, y)) this.y = y;
  }

  // Удирает в ближайший лес (отогнан или устал).
  private runAway(): void {
    this.state = 'flee';
    this.exit = nearestForestPoint(this.x, this.y);
  }

  // Добежал до леса: исчезает и через случайное время выйдет снова.
  // Вернёт true, если унёс добычу (она пропадает).
  private hide(): boolean {
    const hadLoot = this.loot !== undefined;
    this.loot?.image.destroy();
    this.loot = undefined;
    this.state = 'gone';
    this.returnTimer = Phaser.Math.Between(WOLF_RETURN_TIME_MIN, WOLF_RETURN_TIME_MAX);
    this.image.setVisible(false);
    this.shadow.setVisible(false);
    return hadLoot;
  }

  // ===== Вид =====

  // Где пасть волка в мире.
  private getMouthPoint(): Point {
    return { x: this.x + MOUTH_X * this.facing, y: this.y + MOUTH_Y };
  }

  // Ставит картинку, тень и добычу в зубах. На бегу волк скачет и качается.
  private place(delta: number): void {
    const wave = delta > 0 ? Math.sin(this.runTime * RUN_BOB_SPEED) : 0;
    const bob = Math.abs(wave) * RUN_BOB_HEIGHT;
    this.image
      .setPosition(this.x, this.y - bob)
      .setFlipX(this.facing < 0)
      .setDepth(this.y);
    // Наклон на скачке — только на бегу; оглушённого волка качает встряска.
    if (this.state !== 'stunned') this.image.setAngle(wave * RUN_TILT * this.facing);
    this.shadow.setPosition(this.x, this.y).setDepth(this.y + SHADOW_DEPTH_SHIFT);

    if (this.loot && this.isLootInMouth) {
      const mouth = this.getMouthPoint();
      this.loot.image.setPosition(mouth.x, mouth.y - bob).setDepth(this.y + LOOT_DEPTH_SHIFT);
    }
  }
}

// ===== Лес вокруг поля =====

// Середина полосы леса по краю мира: отсюда волки выходят и сюда убегают.
const FOREST_MIDDLE = WORLD_EDGE / 2;

// Случайная точка в лесу на одной из четырёх сторон мира: отсюда выходит волк.
export function randomForestPoint(): Point {
  const x = Phaser.Math.Between(WORLD_EDGE, WORLD_WIDTH - WORLD_EDGE);
  const y = Phaser.Math.Between(WORLD_EDGE, WORLD_HEIGHT - WORLD_EDGE);
  switch (Phaser.Math.Between(0, 3)) {
    case 0:
      return { x, y: FOREST_MIDDLE };
    case 1:
      return { x, y: WORLD_HEIGHT - FOREST_MIDDLE };
    case 2:
      return { x: FOREST_MIDDLE, y };
    default:
      return { x: WORLD_WIDTH - FOREST_MIDDLE, y };
  }
}

// Ближайшая к точке (x, y) точка в лесу: туда волк убегает.
function nearestForestPoint(x: number, y: number): Point {
  const toLeft = x;
  const toRight = WORLD_WIDTH - x;
  const toTop = y;
  const toBottom = WORLD_HEIGHT - y;
  const nearest = Math.min(toLeft, toRight, toTop, toBottom);
  if (nearest === toLeft) return { x: FOREST_MIDDLE, y };
  if (nearest === toRight) return { x: WORLD_WIDTH - FOREST_MIDDLE, y };
  if (nearest === toTop) return { x, y: FOREST_MIDDLE };
  return { x, y: WORLD_HEIGHT - FOREST_MIDDLE };
}
