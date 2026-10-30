import Phaser from 'phaser';
import {
  CAMPFIRE_POSITION,
  PLAYER_START,
  RABBIT_CALM_DOWN_SHARE,
  RABBIT_CAMP_CLEAR_RADIUS,
  RABBIT_FLEE_RADIUS,
  RABBIT_FLEE_SPEED,
  RABBIT_RESPAWN_TIME,
  RABBIT_SIT_TIME_MAX,
  RABBIT_SIT_TIME_MIN,
  RABBIT_SPAWN_RADIUS,
  RABBIT_WANDER_RADIUS,
  RABBIT_WANDER_SPEED,
  TABLE_POSITION,
  WORLD_EDGE,
  WORLD_HEIGHT,
  WORLD_WIDTH,
} from '../settings';
import { COLORS } from '../palette';
import { TEXTURES } from '../textures';
import { CanStep, Point, pop, setGlow } from '../fx';

// ===== Прогулка =====

// Дошёл до точки прогулки, если ближе этого (пиксели).
const ARRIVE_DISTANCE = 4;

// ===== Вид =====

// Прыжки: высота подскока (пиксели) и скорость (радиан за мс).
// Один прыжок длится π / HOP_SPEED мс: 0.012 — около 4 прыжков в секунду.
const HOP_HEIGHT = 7;
const HOP_SPEED = 0.012;
// «Сжатие-растяжение»: в воздухе кролик вытягивается вверх, у земли сплющивается.
const HOP_STRETCH = 0.12;
const HOP_SQUASH = 0.1;
// Сидя, кролик «принюхивается»: часто-часто чуть раздувается и сдувается
// (доля размера, радиан за мс), но не всё время — сериями: медленная волна
// SNIFF_PAUSE_SPEED включает и выключает принюхивание.
const SIT_BREATH = 0.035;
const SIT_BREATH_SPEED = 0.03;
const SNIFF_PAUSE_SPEED = 0.0016;
// В прыжке кролик наклоняется: взлетая — носом вверх, опускаясь — носом вниз (градусы).
const HOP_TILT = 9;
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
  // Фаза прыжков: из неё считается подскок. 0 — кролик сидит на земле.
  private hopTime = 0;
  // Время принюхивания сидя (мс). Начинается со случайного числа — кролики нюхают вразнобой.
  private breathTime = 0;
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
    // Вождь в начале игры стоит в PLAYER_START — кролик не садится у него под ногами.
    const start = randomSpawnPoint(PLAYER_START);
    this.x = start.x;
    this.y = start.y;
    this.home = start;
    this.target = start;
    this.breathTime = Phaser.Math.Between(0, 10000);

    this.shadow = scene.add.image(this.x, this.y, TEXTURES.shadow);
    this.shadowScale = SHADOW_WIDTH / this.shadow.width;
    this.image = scene.add.image(this.x, this.y, TEXTURES.rabbit).setOrigin(0.5, 1);
    this.poofSnow = scene.add.particles(0, 0, TEXTURES.snowflake, POOF_SNOW);
    this.poofStars = scene.add.particles(0, 0, TEXTURES.spark, POOF_STARS);

    this.place(0, false);
  }

  // Кролика можно поймать: он бродит или убегает.
  isCatchable(): boolean {
    return this.state === 'wander' || this.state === 'flee';
  }

  // Свечение-обводка кролика: сюда показывает подсказка обучения.
  setHintGlow(isOn: boolean): void {
    setGlow(this.scene, this.image, isOn);
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
  // speedMultiplier — во сколько раз меняется скорость (в метель кролики медленнее),
  // canStep — можно ли шагнуть из точки в точку (кролики не прыгают сквозь частокол).
  update(delta: number, playerX: number, playerY: number, speedMultiplier: number, canStep: CanStep): void {
    if (this.state === 'gone') {
      this.waitToRespawn(delta, { x: playerX, y: playerY });
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
      this.state === 'flee'
        ? this.flee(delta, playerX, playerY, speedMultiplier, canStep)
        : this.wander(delta, speedMultiplier, canStep);
    this.place(delta, isMoving);
  }

  // ===== Движение =====

  // Бродит: скачет к точке рядом с домом, сидит, выбирает новую. Вернёт true, если двигался.
  // Упёрся в стену — считает, что дошёл, сидит и выбирает новую точку.
  private wander(delta: number, speedMultiplier: number, canStep: CanStep): boolean {
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

    const speed = RABBIT_WANDER_SPEED * speedMultiplier;
    if (!this.moveTowards(this.target.x - this.x, this.target.y - this.y, speed, delta, canStep)) {
      this.target = { x: this.x, y: this.y };
      return false;
    }
    return true;
  }

  // Убегает прямо от вождя. Упрётся в край поля — скользит вдоль него.
  private flee(delta: number, playerX: number, playerY: number, speedMultiplier: number, canStep: CanStep): boolean {
    return this.moveTowards(this.x - playerX, this.y - playerY, RABBIT_FLEE_SPEED * speedMultiplier, delta, canStep);
  }

  // Сдвинуться в направлении (dx, dy) со скоростью speed, не выходя за поле.
  // Шаг по x и по y проверяется отдельно: в стену — нельзя, вдоль — можно.
  // Вернёт true, если хоть куда-то сдвинулся.
  private moveTowards(dx: number, dy: number, speed: number, delta: number, canStep: CanStep): boolean {
    const direction = new Phaser.Math.Vector2(dx, dy).normalize();
    const step = (speed * delta) / 1000;
    const next = clampToField({ x: this.x + direction.x * step, y: this.y + direction.y * step });
    const startX = this.x;
    const startY = this.y;
    if (canStep(this.x, this.y, next.x, this.y)) this.x = next.x;
    if (canStep(this.x, this.y, this.x, next.y)) this.y = next.y;
    if (direction.x > 0) this.facing = 1;
    if (direction.x < 0) this.facing = -1;
    return this.x !== startX || this.y !== startY;
  }

  // После «пуф» ждёт RABBIT_RESPAWN_TIME и выпрыгивает из сугроба недалеко от лагеря
  // (player — где сейчас вождь: рядом с ним кролик не появляется).
  private waitToRespawn(delta: number, player: Point): void {
    this.goneTime += delta;
    if (this.goneTime < RABBIT_RESPAWN_TIME) return;

    const start = randomSpawnPoint(player);
    this.x = start.x;
    this.y = start.y;
    this.home = start;
    this.target = start;
    this.state = 'wander';
    this.image.setVisible(true);
    this.shadow.setVisible(true);
    this.hopTime = 0;
    this.place(0, false);
    pop(this.scene, this.image);
    // Из сугроба взлетает облачко снега.
    const point = this.getLootPoint();
    this.poofSnow.setDepth(this.y + POOF_DEPTH_SHIFT).explode(POOF_SNOW_COUNT, point.x, point.y);
  }

  // ===== Вид =====

  // Ставит картинку и тень. На ходу кролик подпрыгивает, тень в прыжке меньше.
  // Остановился в воздухе — сначала долетает прыжок до земли, потом сидит и «дышит».
  private place(delta: number, isMoving: boolean): void {
    this.updateHopTime(delta, isMoving);
    this.breathTime += delta;
    // |sin| — подскок без «провала» вниз: каждый прыжок от земли.
    const lift = Math.abs(Math.sin(this.hopTime * HOP_SPEED)) * HOP_HEIGHT;

    // Доля высоты прыжка: 0 — на земле, 1 — в самой верхней точке.
    // В прыжках у земли кролик сплющен (оттолкнулся/приземлился), в воздухе — вытянут.
    // Сидит — то и дело принюхивается.
    const air = lift / HOP_HEIGHT;
    const isHopping = this.hopTime > 0;
    const squash = isHopping ? HOP_SQUASH * (1 - air) : 0;
    const stretch = HOP_STRETCH * air;
    const sniffing = Math.max(0, Math.sin(this.breathTime * SNIFF_PAUSE_SPEED));
    const breath = isHopping ? 0 : Math.sin(this.breathTime * SIT_BREATH_SPEED) * SIT_BREATH * sniffing;
    // Наклон по ходу прыжка: на подъёме носом вверх, на спуске носом вниз, у земли ровно
    // (sin двойной фазы проходит полный круг за один прыжок).
    const tilt = -Math.sin(this.hopTime * HOP_SPEED * 2) * HOP_TILT * this.facing;
    this.image
      .setPosition(this.x, this.y - lift)
      .setAngle(tilt)
      .setScale(1 + squash - stretch * 0.5 + breath * 0.5, 1 - squash + stretch + breath)
      .setFlipX(this.facing < 0)
      .setDepth(this.y);
    const shadowScale = this.shadowScale * (1 - (SHADOW_SHRINK_IN_JUMP * lift) / HOP_HEIGHT);
    this.shadow.setPosition(this.x, this.y).setScale(shadowScale).setDepth(this.y + SHADOW_DEPTH_SHIFT);
  }

  // Фаза прыжков. Скачет — растёт. Остановился — прыжок доигрывается до приземления
  // (до конца полупериода синуса), и фаза снова 0: кролик сидит.
  private updateHopTime(delta: number, isMoving: boolean): void {
    if (isMoving || this.hopTime === 0) {
      this.hopTime = isMoving ? this.hopTime + delta : 0;
      return;
    }
    // Один прыжок длится π / HOP_SPEED мс; номер прыжка сменился — значит, приземлился.
    const hopLength = Math.PI / HOP_SPEED;
    const next = this.hopTime + delta;
    this.hopTime = Math.floor(next / hopLength) > Math.floor(this.hopTime / hopLength) ? 0 : next;
  }
}

// Точка внутри поля (не в лесу по краям мира).
function clampToField(point: Point): Point {
  return {
    x: Phaser.Math.Clamp(point.x, WORLD_EDGE, WORLD_WIDTH - WORLD_EDGE),
    y: Phaser.Math.Clamp(point.y, WORLD_EDGE, WORLD_HEIGHT - WORLD_EDGE),
  };
}

// Случайная точка, где появляется кролик (в начале игры и после поимки):
// в кольце вокруг лагеря — от RABBIT_CAMP_CLEAR_RADIUS до RABBIT_SPAWN_RADIUS от костра,
// не у стола, не в лесу и не ближе RABBIT_FLEE_RADIUS к вождю (player).
// Берём случайную точку в квадрате вокруг костра, пока не подойдёт.
function randomSpawnPoint(player: Point): Point {
  while (true) {
    const point = {
      x: CAMPFIRE_POSITION.x + Phaser.Math.Between(-RABBIT_SPAWN_RADIUS, RABBIT_SPAWN_RADIUS),
      y: CAMPFIRE_POSITION.y + Phaser.Math.Between(-RABBIT_SPAWN_RADIUS, RABBIT_SPAWN_RADIUS),
    };
    const field = clampToField(point);
    const isInField = field.x === point.x && field.y === point.y;
    const toCamp = Phaser.Math.Distance.Between(point.x, point.y, CAMPFIRE_POSITION.x, CAMPFIRE_POSITION.y);
    const toTable = Phaser.Math.Distance.Between(point.x, point.y, TABLE_POSITION.x, TABLE_POSITION.y);
    const toPlayer = Phaser.Math.Distance.Between(point.x, point.y, player.x, player.y);
    const isInRing = toCamp >= RABBIT_CAMP_CLEAR_RADIUS && toCamp <= RABBIT_SPAWN_RADIUS;
    if (isInField && isInRing && toTable >= RABBIT_CAMP_CLEAR_RADIUS && toPlayer >= RABBIT_FLEE_RADIUS) {
      return point;
    }
  }
}
