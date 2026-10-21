import Phaser from 'phaser';
import {
  CAMPFIRE_POSITION,
  RABBIT_CALM_DOWN_SHARE,
  RABBIT_CAMP_CLEAR_RADIUS,
  RABBIT_FLEE_RADIUS,
  RABBIT_FLEE_SPEED,
  RABBIT_RESPAWN_TIME,
  RABBIT_SIT_TIME_MAX,
  RABBIT_SIT_TIME_MIN,
  RABBIT_WANDER_RADIUS,
  RABBIT_WANDER_SPEED,
  WORLD_EDGE,
  WORLD_HEIGHT,
  WORLD_WIDTH,
} from '../settings';
import { COLORS } from '../palette';
import { TEXTURES } from '../textures';
import { Point, pop } from '../fx';

// ===== Прогулка =====

// Дошёл до точки прогулки, если ближе этого (пиксели).
const ARRIVE_DISTANCE = 4;

// ===== Вид =====

// Прыжки: высота подскока (пиксели) и скорость (радиан за мс).
const HOP_HEIGHT = 7;
const HOP_SPEED = 0.025;
// «Сжатие-растяжение»: в воздухе кролик вытягивается вверх, у земли сплющивается.
const HOP_STRETCH = 0.12;
const HOP_SQUASH = 0.1;
// Тень под кроликом: ширина и насколько она меньше в прыжке.
const SHADOW_WIDTH = 46;
const SHADOW_SHRINK_IN_JUMP = 0.25;
const SHADOW_DEPTH_SHIFT = -0.5;
// Откуда летит мясо (высота над землёй) и где вспыхивает «пуф».
const LOOT_HEIGHT = 24;
// «Пуф»: облачко снега и золотые звёздочки — мультяшно, без крови.
const POOF_SNOW_COUNT = 14;
const POOF_STAR_COUNT = 7;
const POOF_SNOW: Phaser.Types.GameObjects.Particles.ParticleEmitterConfig = {
  emitting: false,
  speed: { min: 50, max: 150 },
  lifespan: { min: 400, max: 700 },
  scale: { start: 1.6, end: 0 },
  alpha: { start: 1, end: 0 },
};
const POOF_STARS: Phaser.Types.GameObjects.Particles.ParticleEmitterConfig = {
  emitting: false,
  speed: { min: 80, max: 160 },
  angle: { min: 200, max: 340 },
  gravityY: 200,
  lifespan: 700,
  scale: { start: 1.8, end: 0.4 },
  alpha: { start: 1, end: 0 },
  tint: COLORS.plusOne,
};
// Частицы рисуются перед кроликом.
const POOF_DEPTH_SHIFT = 1;

// Что сейчас делает кролик.
// 'wander' — бродит, 'flee' — убегает от вождя, 'caught' — пойман (замер),
// 'gone' — исчез после «пуф» и ждёт, чтобы прибежать снова.
type RabbitState = 'wander' | 'flee' | 'caught' | 'gone';

/**
 * Кролик: бродит по полю, убегает от вождя, а пойманный исчезает
 * с мультяшным «пуф» и через RABBIT_RESPAWN_TIME выпрыгивает снова.
 *
 * Про вождя кролик знает только точку — сцена передаёт её в update().
 * Поймать кролика решает systems/Gathering.ts (updateHunting).
 */
export class Rabbit {
  // Где лапы кролика.
  x: number;
  y: number;

  private scene: Phaser.Scene;
  // Что кролик делает сейчас.
  private state: RabbitState = 'wander';
  // Место, вокруг которого он бродит, и точка, к которой он скачет.
  private home: Point;
  private target: Point;
  // Сколько мс ещё сидеть на месте, прежде чем скакать к новой точке.
  private sitTime = 0;
  // Сколько мс прошло после «пуф» — для появления заново.
  private goneTime = 0;
  // Фаза прыжков: из неё считается подскок.
  private hopTime = 0;
  // Куда смотрит: 1 — вправо, -1 — влево.
  private facing = 1;

  // Картинка, тень и частицы «пуф».
  private image: Phaser.GameObjects.Image;
  private shadow: Phaser.GameObjects.Image;
  private shadowScale: number;
  private poofSnow: Phaser.GameObjects.Particles.ParticleEmitter;
  private poofStars: Phaser.GameObjects.Particles.ParticleEmitter;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    const start = randomFieldPoint();
    this.x = start.x;
    this.y = start.y;
    this.home = start;
    this.target = start;

    this.shadow = scene.add.image(this.x, this.y, TEXTURES.shadow);
    this.shadowScale = SHADOW_WIDTH / this.shadow.width;
    this.image = scene.add.image(this.x, this.y, TEXTURES.rabbit).setOrigin(0.5, 1);
    this.poofSnow = scene.add.particles(0, 0, TEXTURES.snowflake, POOF_SNOW);
    this.poofStars = scene.add.particles(0, 0, TEXTURES.spark, POOF_STARS);

    this.place(0);
  }

  // Кролика можно поймать: он бродит или убегает.
  isCatchable(): boolean {
    return this.state === 'wander' || this.state === 'flee';
  }

  // Вождь догнал кролика и замахивается: кролик замирает.
  catch(): void {
    this.state = 'caught';
  }

  // Откуда вылетает мясо.
  getLootPoint(): Point {
    return { x: this.x, y: this.y - LOOT_HEIGHT };
  }

  // Удар дубиной: облачко снега и звёздочки, кролик исчезает.
  poof(): void {
    const point = this.getLootPoint();
    const depth = this.y + POOF_DEPTH_SHIFT;
    this.poofSnow.setDepth(depth).explode(POOF_SNOW_COUNT, point.x, point.y);
    this.poofStars.setDepth(depth).explode(POOF_STAR_COUNT, point.x, point.y);

    this.state = 'gone';
    this.goneTime = 0;
    this.image.setVisible(false);
    this.shadow.setVisible(false);
  }

  // Вызывается сценой каждый кадр. (playerX, playerY) — где вождь,
  // speedMultiplier — во сколько раз меняется скорость (в метель кролики медленнее).
  update(delta: number, playerX: number, playerY: number, speedMultiplier: number): void {
    if (this.state === 'gone') {
      this.waitToRespawn(delta);
      return;
    }
    if (this.state === 'caught') return;

    const distance = Phaser.Math.Distance.Between(this.x, this.y, playerX, playerY);
    if (distance < RABBIT_FLEE_RADIUS) {
      this.state = 'flee';
    } else if (this.state === 'flee' && distance > RABBIT_FLEE_RADIUS * RABBIT_CALM_DOWN_SHARE) {
      // Убежал далеко — успокоился и бродит уже здесь.
      this.state = 'wander';
      this.home = { x: this.x, y: this.y };
      this.target = this.home;
    }

    const isMoving =
      this.state === 'flee' ? this.flee(delta, playerX, playerY, speedMultiplier) : this.wander(delta, speedMultiplier);
    this.place(isMoving ? delta : 0);
  }

  // ===== Движение =====

  // Бродит: скачет к точке рядом с домом, сидит, выбирает новую. Вернёт true, если двигался.
  private wander(delta: number, speedMultiplier: number): boolean {
    const distance = Phaser.Math.Distance.Between(this.x, this.y, this.target.x, this.target.y);
    if (distance < ARRIVE_DISTANCE) {
      this.sitTime -= delta;
      if (this.sitTime > 0) return false;

      // Насиделся — выбирает новую точку рядом с домом.
      this.sitTime = Phaser.Math.Between(RABBIT_SIT_TIME_MIN, RABBIT_SIT_TIME_MAX);
      this.target = clampToField({
        x: this.home.x + Phaser.Math.Between(-RABBIT_WANDER_RADIUS, RABBIT_WANDER_RADIUS),
        y: this.home.y + Phaser.Math.Between(-RABBIT_WANDER_RADIUS, RABBIT_WANDER_RADIUS),
      });
      return false;
    }

    this.moveTowards(this.target.x - this.x, this.target.y - this.y, RABBIT_WANDER_SPEED * speedMultiplier, delta);
    return true;
  }

  // Убегает прямо от вождя. Упрётся в край поля — скользит вдоль него.
  private flee(delta: number, playerX: number, playerY: number, speedMultiplier: number): boolean {
    this.moveTowards(this.x - playerX, this.y - playerY, RABBIT_FLEE_SPEED * speedMultiplier, delta);
    return true;
  }

  // Сдвинуться в направлении (dx, dy) со скоростью speed, не выходя за поле.
  private moveTowards(dx: number, dy: number, speed: number, delta: number): void {
    const direction = new Phaser.Math.Vector2(dx, dy).normalize();
    const step = (speed * delta) / 1000;
    const next = clampToField({ x: this.x + direction.x * step, y: this.y + direction.y * step });
    this.x = next.x;
    this.y = next.y;
    if (direction.x > 0) this.facing = 1;
    if (direction.x < 0) this.facing = -1;
  }

  // После «пуф» ждёт RABBIT_RESPAWN_TIME и выпрыгивает из леса у края поля.
  private waitToRespawn(delta: number): void {
    this.goneTime += delta;
    if (this.goneTime < RABBIT_RESPAWN_TIME) return;

    const start = randomEdgePoint();
    this.x = start.x;
    this.y = start.y;
    this.home = start;
    this.target = start;
    this.state = 'wander';
    this.image.setVisible(true);
    this.shadow.setVisible(true);
    this.place(0);
    pop(this.scene, this.image);
  }

  // ===== Вид =====

  // Ставит картинку и тень. На ходу кролик подпрыгивает, тень в прыжке меньше.
  private place(delta: number): void {
    this.hopTime = delta > 0 ? this.hopTime + delta : 0;
    // |sin| — подскок без «провала» вниз: каждый прыжок от земли.
    const lift = Math.abs(Math.sin(this.hopTime * HOP_SPEED)) * HOP_HEIGHT;

    // Доля высоты прыжка: 0 — на земле, 1 — в самой верхней точке.
    // На ходу у земли кролик сплющен (оттолкнулся/приземлился), в воздухе — вытянут.
    const air = lift / HOP_HEIGHT;
    const squash = delta > 0 ? HOP_SQUASH * (1 - air) : 0;
    const stretch = HOP_STRETCH * air;
    this.image
      .setPosition(this.x, this.y - lift)
      .setScale(1 + squash - stretch * 0.5, 1 - squash + stretch)
      .setFlipX(this.facing < 0)
      .setDepth(this.y);
    const shadowScale = this.shadowScale * (1 - (SHADOW_SHRINK_IN_JUMP * lift) / HOP_HEIGHT);
    this.shadow.setPosition(this.x, this.y).setScale(shadowScale).setDepth(this.y + SHADOW_DEPTH_SHIFT);
  }
}

// Точка внутри поля (не в лесу по краям мира).
function clampToField(point: Point): Point {
  return {
    x: Phaser.Math.Clamp(point.x, WORLD_EDGE, WORLD_WIDTH - WORLD_EDGE),
    y: Phaser.Math.Clamp(point.y, WORLD_EDGE, WORLD_HEIGHT - WORLD_EDGE),
  };
}

// Случайная точка у края поля, рядом с лесом: отсюда прибегает новый кролик.
function randomEdgePoint(): Point {
  const x = Phaser.Math.Between(WORLD_EDGE, WORLD_WIDTH - WORLD_EDGE);
  const y = Phaser.Math.Between(WORLD_EDGE, WORLD_HEIGHT - WORLD_EDGE);
  // Одна из четырёх сторон поля.
  switch (Phaser.Math.Between(0, 3)) {
    case 0:
      return { x, y: WORLD_EDGE };
    case 1:
      return { x, y: WORLD_HEIGHT - WORLD_EDGE };
    case 2:
      return { x: WORLD_EDGE, y };
    default:
      return { x: WORLD_WIDTH - WORLD_EDGE, y };
  }
}

// Случайная точка на поле подальше от костра — тут кролики сидят в начале игры.
function randomFieldPoint(): Point {
  while (true) {
    const point = {
      x: Phaser.Math.Between(WORLD_EDGE, WORLD_WIDTH - WORLD_EDGE),
      y: Phaser.Math.Between(WORLD_EDGE, WORLD_HEIGHT - WORLD_EDGE),
    };
    const toCamp = Phaser.Math.Distance.Between(point.x, point.y, CAMPFIRE_POSITION.x, CAMPFIRE_POSITION.y);
    if (toCamp > RABBIT_CAMP_CLEAR_RADIUS) return point;
  }
}
