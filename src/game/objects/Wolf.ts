import Phaser from 'phaser';
import { SOUNDS, SOUND_VOLUMES, playSound } from '../sounds';
import {
  WOLF_CARRY_SPEED,
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
import { CanStep, flyArc, Point } from '../fx';

// ===== Части волка =====
// Волк собран из картинок, как вождь (Player.ts). Все точки — от лап волка,
// когда он смотрит вправо, в пикселях картинок до уменьшения на WOLF_SCALE.

// Весь волк чуть меньше своих картинок.
const WOLF_SCALE = 1;
// Середина туловища.
const BODY_X = 0;
const BODY_Y = -69;
// Плечо (сюда крепится передняя лапа) и бедро (задняя лапа).
const SHOULDER = { x: 30, y: -49 };
const HIP = { x: -30, y: -53 };
// Дальние лапы чуть впереди и выше ближних — мы видим волка немного сверху.
const FAR_LEG_SHIFT = { x: 7, y: -2 };
// Шея (сюда крепится голова) и основание хвоста.
const NECK = { x: 54, y: -93 };
const TAIL_BASE = { x: -46, y: -65 };
// Точки вращения на самих картинках (доли ширины и высоты картинки):
// голова — у шеи слева, хвост — у основания справа, лапы — вверху.
const HEAD_ORIGIN = { x: 10 / 76, y: 28 / 52 };
const TAIL_ORIGIN = { x: 64 / 70, y: 12 / 34 };
const FRONT_LEG_ORIGIN_Y = 8 / 62;
const BACK_LEG_ORIGIN_Y = 8 / 64;
// Пасть — от шеи: туда летит и там висит добыча.
const MOUTH = { x: 40, y: 10 };
// Дальние лапы темнее ближних.
const FAR_LEG_TINT = 0xa9b0bd;
// Слои: дальние лапы и хвост — дальше всего, ближние лапы — за туловищем
// (оно закрывает верх лап), голова — перед туловищем.
const FAR_LEG_DEPTH_SHIFT = -0.06;
const TAIL_DEPTH_SHIFT = -0.04;
const NEAR_LEG_DEPTH_SHIFT = -0.02;
const HEAD_DEPTH_SHIFT = 0.05;
const LOOT_DEPTH_SHIFT = 0.07;
const SHADOW_DEPTH_SHIFT = -0.5;
// Тень под волком.
const SHADOW_WIDTH = 116;

// ===== Бег =====

// Длина шага (пиксели пути): за столько пикселей лапы делают полный цикл.
// Фаза шага растёт от пройденного пути — лапы бегут со скоростью волка
// и замирают, когда он стоит (например, упёрся в частокол).
const STRIDE_LENGTH = 64;
// Стоит на месте — лапы плавно встают ровно: какую долю пути до ровной стойки
// проходят за кадр.
const STAND_EASE = 0.2;
// На сколько градусов лапа отходит вперёд и назад от вертикали.
const LEG_SWING = 34;
// Тело на каждом шаге приподнимается (пиксели) и чуть качается (градусы).
const RUN_BOB_HEIGHT = 4;
const RUN_TILT = 2.5;
// Голова кивает в такт бегу (градусы); с добычей задрана выше.
const HEAD_NOD = 4;
const HEAD_LOOT_LIFT = -8;
// Хвост развевается за спиной (градусы).
const TAIL_SWAY = 8;
// И ещё сам по себе виляет — быстро и чуть-чуть, даже когда волк стоит (градусы, радиан за мс).
const TAIL_WAG = 5;
const TAIL_WAG_SPEED = 0.012;
// Удирая с добычей, волк виляет хвостом радостнее: во столько раз сильнее.
const TAIL_WAG_LOOT = 2.2;
// Оглушённый волк качается из стороны в сторону (градусы и скорость, радиан за мс),
// а лапы расставлены (градусы).
const STUN_WOBBLE = 7;
const STUN_WOBBLE_SPEED = 0.05;
const STUN_LEG_SPREAD = 14;
// Сколько мс добыча летит со спины вождя в пасть и как высоко по дуге.
const LOOT_FLY_TIME = 220;
const LOOT_FLY_ARC = 30;
// Дошёл до точки, если ближе этого (пиксели).
const ARRIVE_DISTANCE = 6;
// Морда волка впереди лап на столько пикселей: шаг вбок проверяется по ней,
// чтобы голова не влезала в частокол.
const BODY_REACH = 100;

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
  // Фаза шага (радианы): из неё считаются лапы, подъём тела, кивок и хвост.
  private stridePhase = 0;
  // Сколько мс волк на поле — из этого считается виляние хвоста.
  private wagTime = 0;
  // Куда смотрит: 1 — вправо, -1 — влево.
  private facing = 1;
  // Проверка шага на этот кадр (её передаёт update()): частокол волков не пускает.
  private canStep: CanStep = () => true;

  // Части волка.
  private shadow: Phaser.GameObjects.Image;
  private body: Phaser.GameObjects.Image;
  private head: Phaser.GameObjects.Image;
  private tail: Phaser.GameObjects.Image;
  private nearFrontLeg: Phaser.GameObjects.Image;
  private nearBackLeg: Phaser.GameObjects.Image;
  private farFrontLeg: Phaser.GameObjects.Image;
  private farBackLeg: Phaser.GameObjects.Image;

  // returnDelay — через сколько мс после начала игры этот волк выйдет впервые.
  constructor(scene: Phaser.Scene, returnDelay: number) {
    this.scene = scene;
    this.returnTimer = returnDelay;
    this.shadow = scene.add.image(0, 0, TEXTURES.shadow);
    this.shadow.setScale(SHADOW_WIDTH / this.shadow.width);
    this.farBackLeg = scene.add.image(0, 0, TEXTURES.wolfBackLeg).setOrigin(0.5, BACK_LEG_ORIGIN_Y);
    this.farFrontLeg = scene.add.image(0, 0, TEXTURES.wolfFrontLeg).setOrigin(0.5, FRONT_LEG_ORIGIN_Y);
    this.farBackLeg.setTint(FAR_LEG_TINT);
    this.farFrontLeg.setTint(FAR_LEG_TINT);
    this.tail = scene.add.image(0, 0, TEXTURES.wolfTail).setOrigin(TAIL_ORIGIN.x, TAIL_ORIGIN.y);
    this.body = scene.add.image(0, 0, TEXTURES.wolfBody);
    this.nearBackLeg = scene.add.image(0, 0, TEXTURES.wolfBackLeg).setOrigin(0.5, BACK_LEG_ORIGIN_Y);
    this.nearFrontLeg = scene.add.image(0, 0, TEXTURES.wolfFrontLeg).setOrigin(0.5, FRONT_LEG_ORIGIN_Y);
    this.head = scene.add.image(0, 0, TEXTURES.wolfHead).setOrigin(HEAD_ORIGIN.x, HEAD_ORIGIN.y);
    for (const part of this.getParts()) part.setScale(WOLF_SCALE);
    this.setVisible(false);
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
    this.setVisible(true);
    this.place();
    // Волк выходит из леса — слышен вой.
    playSound(this.scene, SOUNDS.howl, SOUND_VOLUMES.howl);
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
    this.wagTime += delta;
    const startX = this.x;
    const startY = this.y;

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

    // Лапы шагают на столько, сколько волк пробежал (отлетая от удара, не шагают).
    // Стоит (например, упёрся в частокол) — лапы плавно встают ровно.
    if (this.state !== 'stunned') {
      const moved = Phaser.Math.Distance.Between(startX, startY, this.x, this.y);
      if (moved > 0) {
        this.stridePhase += (moved / STRIDE_LENGTH) * Math.PI * 2;
      } else {
        const standPhase = Math.round(this.stridePhase / Math.PI) * Math.PI;
        this.stridePhase = Phaser.Math.Linear(this.stridePhase, standPhase, STAND_EASE);
      }
    }
    this.place();
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
  // Откуда — всегда лапы; куда вбок — проверяем по морде (она впереди лап),
  // вверх-вниз — по лапам.
  private stepTo(x: number, y: number): void {
    const reach = Math.sign(x - this.x) * BODY_REACH;
    if (this.canStep(this.x, this.y, x + reach, this.y)) this.x = x;
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
    this.setVisible(false);
    return hadLoot;
  }

  // ===== Вид =====

  // Все части волка (кроме тени).
  private getParts(): Phaser.GameObjects.Image[] {
    return [this.farBackLeg, this.farFrontLeg, this.tail, this.body, this.nearBackLeg, this.nearFrontLeg, this.head];
  }

  // Показать или спрятать волка целиком.
  private setVisible(visible: boolean): void {
    this.shadow.setVisible(visible);
    for (const part of this.getParts()) part.setVisible(visible);
  }

  // Точка части волка в мире. (localX, localY) — от лап, когда волк смотрит вправо;
  // lift — на сколько тело приподнято, tilt — наклон тела (градусы).
  // Смотрит влево — всё зеркально.
  private toWorld(localX: number, localY: number, lift: number, tilt: number): Point {
    const angle = Phaser.Math.DegToRad(tilt);
    const x = localX * Math.cos(angle) - localY * Math.sin(angle);
    const y = localX * Math.sin(angle) + localY * Math.cos(angle);
    return { x: this.x + x * WOLF_SCALE * this.facing, y: this.y + (y - lift) * WOLF_SCALE };
  }

  // Где пасть волка в мире: от шеи, с кивком головы.
  private getMouthPoint(): Point {
    const neck = this.toWorld(NECK.x, NECK.y, 0, 0);
    return { x: neck.x + MOUTH.x * WOLF_SCALE * this.facing, y: neck.y + MOUTH.y * WOLF_SCALE };
  }

  // Ставит все части волка вокруг точки лап. На бегу лапы шагают по диагонали
  // (ближняя передняя — с дальней задней), тело приподнимается и качается,
  // голова кивает, хвост развевается. Оглушённый — качается, лапы расставлены.
  private place(): void {
    const isLeft = this.facing < 0;
    const swing = Math.sin(this.stridePhase);
    const isStunned = this.state === 'stunned';

    const lift = isStunned ? 0 : Math.abs(Math.cos(this.stridePhase)) * RUN_BOB_HEIGHT;
    const tilt = isStunned
      ? Math.sin(this.stunTime * STUN_WOBBLE_SPEED) * STUN_WOBBLE * (this.stunTime / WOLF_STUN_TIME)
      : swing * RUN_TILT;
    // Минус поворачивает лапу против часовой: при взгляде вправо ступня уходит вперёд.
    const pairA = isStunned ? -STUN_LEG_SPREAD : -swing * LEG_SWING;
    const pairB = isStunned ? STUN_LEG_SPREAD : swing * LEG_SWING;

    const setPart = (part: Phaser.GameObjects.Image, local: Point, angle: number, depthShift: number): void => {
      const point = this.toWorld(local.x, local.y, lift, tilt);
      part
        .setPosition(point.x, point.y)
        .setAngle((angle + tilt) * this.facing)
        .setFlipX(isLeft)
        .setDepth(this.y + depthShift);
    };
    const far = (point: Point): Point => ({ x: point.x + FAR_LEG_SHIFT.x, y: point.y + FAR_LEG_SHIFT.y });

    // Phaser отражает картинку внутри её рамки, а точку вращения не трогает.
    // У головы и хвоста она сбоку — при взгляде влево отражаем её сами.
    this.head.setOrigin(isLeft ? 1 - HEAD_ORIGIN.x : HEAD_ORIGIN.x, HEAD_ORIGIN.y);
    this.tail.setOrigin(isLeft ? 1 - TAIL_ORIGIN.x : TAIL_ORIGIN.x, TAIL_ORIGIN.y);

    setPart(this.farFrontLeg, far(SHOULDER), pairB, FAR_LEG_DEPTH_SHIFT);
    setPart(this.farBackLeg, far(HIP), pairA, FAR_LEG_DEPTH_SHIFT);
    const wag = Math.sin(this.wagTime * TAIL_WAG_SPEED) * TAIL_WAG * (this.loot ? TAIL_WAG_LOOT : 1);
    setPart(this.tail, TAIL_BASE, swing * TAIL_SWAY + wag, TAIL_DEPTH_SHIFT);
    setPart(this.body, { x: BODY_X, y: BODY_Y }, 0, 0);
    setPart(this.nearFrontLeg, SHOULDER, pairA, NEAR_LEG_DEPTH_SHIFT);
    setPart(this.nearBackLeg, HIP, pairB, NEAR_LEG_DEPTH_SHIFT);
    const headAngle = Math.sin(this.stridePhase * 2) * HEAD_NOD + (this.loot ? HEAD_LOOT_LIFT : 0);
    setPart(this.head, NECK, headAngle, HEAD_DEPTH_SHIFT);
    this.shadow.setPosition(this.x, this.y).setDepth(this.y + SHADOW_DEPTH_SHIFT);

    if (this.loot && this.isLootInMouth) {
      const mouth = this.getMouthPoint();
      this.loot.image.setPosition(mouth.x, mouth.y - lift * WOLF_SCALE).setDepth(this.y + LOOT_DEPTH_SHIFT);
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
