import Phaser from 'phaser';
import { CanStep, pop } from '../fx';
import { JOYSTICK_RADIUS, PLAYER_SPEED, WORLD_EDGE, WORLD_HEIGHT, WORLD_WIDTH } from '../settings';
import { TEXTURES, WEAPON_GRIP_FROM_BOTTOM } from '../textures';
import { WEAPONS, Weapon } from '../data/upgrades';

// ===== Слои вождя =====

// Тень и кольцо лежат на земле сразу под вождём. Ноги — чуть позади тела
// (подол шкуры закрывает бёдра), свободная рука и дубина — чуть впереди.
const SHADOW_DEPTH_SHIFT = -0.6;
const RING_DEPTH_SHIFT = -0.5;
const LEG_DEPTH_SHIFT = -0.05;
const ARM_DEPTH_SHIFT = 0.05;
const CLUB_DEPTH_SHIFT = 0.1;
// Джойстик рисуется поверх всего мира.
const JOYSTICK_DEPTH = 20000;

// ===== Внешний вид =====

// Ширина тени под ногами.
const SHADOW_WIDTH = 64;
// Прозрачность кольца под ногами и джойстика.
const RING_ALPHA = 0.75;
const JOYSTICK_ALPHA = 0.9;
// Кольцо под ногами мягко «дышит»: до какого размера и за сколько мс.
const RING_PULSE_SCALE = 1.08;
const RING_PULSE_TIME = 700;

// Где кулак с дубиной относительно ног (когда вождь смотрит вправо).
const HAND_OFFSET_X = 40;
const HAND_OFFSET_Y = -29;
// Угол дубины в покое: наклонена вперёд, от лица (0° — дубина стоит вертикально).
const CLUB_REST_ANGLE = 65;

// ===== Взмах дубиной: замах → удар → возврат =====

// На сколько градусов от угла покоя дубина отходит назад-вверх на замахе
// и на сколько уходит вперёд-вниз в момент удара по кусту.
const CLUB_WINDUP_ANGLE = -50;
const CLUB_STRIKE_ANGLE = 45;
// Какую долю всего взмаха занимает каждая фаза (в сумме 1):
// неспешный замах, резкий удар, возврат в покой с пружинкой.
// Весь взмах длится столько, сколько передали в swing() (интервал удара оружия),
// поэтому попадание (замах + удар = половина взмаха) всегда раньше следующего удара.
const SWING_WINDUP_SHARE = 0.3;
const SWING_STRIKE_SHARE = 0.2;
const SWING_RECOVER_SHARE = 0.5;
// Тело наклоняется вслед за дубиной: градусов наклона на градус взмаха
// (назад на замахе, вперёд при ударе).
const BODY_LEAN_PER_DEGREE = 0.08;

// Где спина — точка, от которой растёт стопка (когда вождь смотрит вправо).
const BACK_OFFSET_X = -16;
const BACK_OFFSET_Y = -58;

// ===== Ноги и свободная рука =====

// Бёдра — точки, вокруг которых качаются ноги (от ног вождя; левое и правое — ±HIP_OFFSET_X).
const HIP_OFFSET_X = 8;
const HIP_OFFSET_Y = -26;
// На картинке ноги бедро вверху: на этой доле высоты картинки.
const LEG_HIP_Y = 0.09;
// Плечо свободной руки (когда вождь смотрит вправо) и где плечо на картинке руки.
const SHOULDER_OFFSET_X = -30;
const SHOULDER_OFFSET_Y = -52;
const ARM_SHOULDER_Y = 0.22;
// В покое свободная рука висит чуть в сторону от тела, а не прямо вниз (градусы).
const ARM_REST_ANGLE = 12;

// ===== Бег: настоящие шаги =====

// Как быстро идут шаги (радиан фазы шага на мс). Полный цикл — два шага.
const STEP_SPEED = 0.015;
// На сколько градусов нога отходит вперёд и назад от бедра.
const LEG_SWING_ANGLE = 28;
// На сколько пикселей приподнимается нога, которая идёт вперёд.
const LEG_LIFT = 4;
// Свободная рука машет в такт шагам — на сколько градусов вперёд-назад.
const ARM_SWING_ANGLE = 30;
// При взмахе дубиной свободная рука отходит для равновесия: градусов на градус взмаха.
const ARM_STRIKE_FACTOR = 0.5;
// Тело на каждом шаге чуть поднимается (пиксели) и наклоняется вперёд по ходу бега (градусы).
const RUN_BOB_HEIGHT = 2.5;
const RUN_LEAN = 5;
// Когда тело приподнято, тень становится меньше на эту долю.
const SHADOW_SHRINK_IN_JUMP = 0.1;
// «Дыхание» на месте: насколько вытягивается тело и как быстро.
const IDLE_BREATH = 0.025;
const IDLE_BREATH_SPEED = 0.004;
// На месте свободная рука и дубина мягко покачиваются в такт дыханию (градусы).
const ARM_IDLE_SWAY = 3;
const CLUB_IDLE_SWAY = 4;
// На бегу тяжёлая дубина покачивается в такт шагам (градусы).
const CLUB_RUN_SWAY = 6;

/**
 * Вождь племени.
 *
 * Ходит по миру (клавиатура или виртуальный джойстик): ноги шагают по очереди,
 * свободная рука машет в такт, тело чуть наклоняется вперёд. Разворачивается
 * по направлению и машет дубиной. Состоит из нескольких картинок: тень,
 * кольцо под ногами, две ноги, тело, свободная рука и дубина.
 * О кустах, стопке и поленнице вождь ничего не знает — этим занимается сцена.
 */
export class Player {
  // Позиция ног вождя в мире. За этой точкой следит камера.
  x: number;
  y: number;
  // Текущая скорость, пикселей в секунду. Сцена передаёт её стопке, чтобы та отставала.
  velocityX = 0;
  velocityY = 0;
  // Сколько мс вождь уже стоит у куста. Набрался интервал удара оружия — удар.
  // Меняет его systems/Gathering.ts.
  hitTimer = 0;
  // Сколько клыков собрал вождь (валюта; в уровне 1 — просто счёт).
  // Меняет systems/Serving.ts, HUD только показывает это число.
  tusks = 0;
  // Уровень оружия — номер в WEAPONS (data/upgrades.ts): 0 — дубина, 1 — топор, 2 — копьё.
  // Меняет upgradeWeapon(), его зовёт GameScene при покупке.
  weaponLevel = 0;

  // Куда смотрит вождь: 1 — вправо, -1 — влево.
  // Сцена передаёт это рюкзаку: колонки за спиной уходят в обратную сторону.
  facing = 1;

  private scene: Phaser.Scene;
  // Фаза шага (радианы): из неё считаются движения ног, руки и тела.
  private stepPhase = 0;
  // Куда сейчас отведены ноги: от -1 до 1 (0 — стоят ровно).
  private legSwing = 0;
  // Сколько мс вождь стоит — из этого считается «дыхание».
  private idleTime = 0;
  // Насколько тело сейчас подпрыгнуло вверх, в пикселях.
  private bob = 0;
  // Волна «дыхания» на месте: от -1 (выдох) до 1 (вдох). На бегу — 0.
  private breathWave = 0;
  // Взмах дубиной: на сколько градусов дубина сейчас отклонена от угла покоя.
  // Меняется цепочкой твинов в swing().
  private clubSwing = 0;
  // Наклон тела вперёд по ходу бега (градусы).
  private walkTilt = 0;
  // Во сколько раз растянута текстура тени, чтобы её ширина была SHADOW_WIDTH.
  private shadowScale = 1;

  // Части вождя.
  private shadow: Phaser.GameObjects.Image;
  private ring: Phaser.GameObjects.Image;
  private bodyImage: Phaser.GameObjects.Image;
  private legs: Phaser.GameObjects.Image[];
  private freeArm: Phaser.GameObjects.Image;
  // Оружие в руке: дубина, топор или копьё (картинка с кулаком внизу).
  private club: Phaser.GameObjects.Image;

  // Джойстик: круг-основа и ручка. Видны, только пока зажата мышь или палец.
  private joystickBase: Phaser.GameObjects.Image;
  private joystickKnob: Phaser.GameObjects.Image;

  // Клавиши: стрелки и WASD.
  private cursors: Phaser.Types.Input.Keyboard.CursorKeys;
  private keyW: Phaser.Input.Keyboard.Key;
  private keyA: Phaser.Input.Keyboard.Key;
  private keyS: Phaser.Input.Keyboard.Key;
  private keyD: Phaser.Input.Keyboard.Key;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.scene = scene;
    this.x = x;
    this.y = y;

    this.shadow = scene.add.image(x, y, TEXTURES.shadow);
    this.shadowScale = SHADOW_WIDTH / this.shadow.width;
    this.ring = scene.add.image(x, y, TEXTURES.ring).setAlpha(RING_ALPHA);
    scene.tweens.add({
      targets: this.ring,
      scale: RING_PULSE_SCALE,
      duration: RING_PULSE_TIME,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
    // Точка опоры тела — середина нижнего края (ноги), ног — бедро,
    // свободной руки — плечо, дубины — кулак.
    this.bodyImage = scene.add.image(x, y, TEXTURES.player).setOrigin(0.5, 1);
    this.legs = [
      scene.add.image(x, y, TEXTURES.leg).setOrigin(0.5, LEG_HIP_Y),
      scene.add.image(x, y, TEXTURES.leg).setOrigin(0.5, LEG_HIP_Y),
    ];
    this.freeArm = scene.add.image(x, y, TEXTURES.arm).setOrigin(0.5, ARM_SHOULDER_Y);
    this.club = scene.add.image(x, y, TEXTURES.club);
    this.setGripOrigin();

    // Джойстик живёт в координатах экрана: scrollFactor 0 — не едет вместе с камерой.
    this.joystickBase = this.createJoystickPart(TEXTURES.joystickBase);
    this.joystickBase.setDisplaySize(JOYSTICK_RADIUS * 2, JOYSTICK_RADIUS * 2);
    this.joystickKnob = this.createJoystickPart(TEXTURES.joystickKnob);

    if (!scene.input.keyboard) {
      throw new Error('Keyboard input is unavailable.');
    }
    // Phaser смотрит на физическую клавишу, поэтому WASD работают и в русской раскладке.
    this.cursors = scene.input.keyboard.createCursorKeys();
    this.keyW = scene.input.keyboard.addKey('W');
    this.keyA = scene.input.keyboard.addKey('A');
    this.keyS = scene.input.keyboard.addKey('S');
    this.keyD = scene.input.keyboard.addKey('D');

    this.place();
  }

  // Вызывается сценой каждый кадр. delta — сколько мс прошло с прошлого кадра.
  // speedMultiplier — во сколько раз меняется скорость (ночью вождь идёт медленнее).
  // canStep — можно ли шагнуть из точки в точку (сцена не пускает сквозь частокол).
  update(delta: number, speedMultiplier: number, canStep: CanStep): void {
    const direction = this.readInput();
    const isMoving = direction.length() > 0;

    this.move(direction, delta, speedMultiplier, canStep);
    this.animate(delta, isMoving);
    this.place();
  }

  // Взмах дубиной: вождь поворачивается к цели (кусту), замахивается и бьёт.
  // duration — сколько мс длится весь взмах, onImpact вызывается в момент,
  // когда дубина попадает по цели.
  swing(targetX: number, duration: number, onImpact: () => void): void {
    this.facing = targetX >= this.x ? 1 : -1;

    // Если прошлый взмах ещё идёт — останавливаем его, чтобы два взмаха не спорили.
    this.scene.tweens.killTweensOf(this);

    // Цепочка из трёх твинов, они идут друг за другом. Каждый меняет число clubSwing,
    // а place() превращает его в угол дубины и наклон тела.
    this.scene.tweens.chain({
      targets: this,
      tweens: [
        // 1. Замах: дубина плавно отходит назад-вверх.
        { clubSwing: CLUB_WINDUP_ANGLE, duration: duration * SWING_WINDUP_SHARE, ease: 'Sine.easeOut' },
        // 2. Удар: резко вперёд-вниз, с разгоном. В конце — попадание.
        {
          clubSwing: CLUB_STRIKE_ANGLE,
          duration: duration * SWING_STRIKE_SHARE,
          ease: 'Quad.easeIn',
          onComplete: onImpact,
        },
        // 3. Возврат в покой: Back.easeOut чуть проскакивает — получается пружинка.
        { clubSwing: 0, duration: duration * SWING_RECOVER_SHARE, ease: 'Back.easeOut' },
      ],
    });
  }

  // Оружие, которое сейчас в руке: скорость удара и урон.
  getWeapon(): Weapon {
    return WEAPONS[this.weaponLevel];
  }

  // Купили следующее оружие: оно появляется в руке с «пружинкой».
  upgradeWeapon(): void {
    if (this.weaponLevel >= WEAPONS.length - 1) return;
    this.weaponLevel += 1;
    this.club.setTexture(this.getWeapon().texture);
    this.setGripOrigin();
    pop(this.scene, this.club);
  }

  // Точка вращения оружия — центр кулака. У всего оружия кулак на одной высоте
  // от низа картинки, а картинки разной длины — долю считаем по высоте картинки.
  private setGripOrigin(): void {
    this.club.setOrigin(0.5, 1 - WEAPON_GRIP_FROM_BOTTOM / this.club.height);
  }

  // Идёт ли сейчас взмах дубиной (тогда новый взмах оборвал бы удар).
  isSwinging(): boolean {
    return this.scene.tweens.isTweening(this);
  }

  // Точка на спине, от которой растёт стопка. Спина — со стороны, противоположной взгляду.
  // Точка подпрыгивает вместе с телом, поэтому стопка тоже «шагает».
  getBackPoint(): { x: number; y: number } {
    return {
      x: this.x + BACK_OFFSET_X * this.facing,
      y: this.y + BACK_OFFSET_Y - this.bodyLiftAt(-BACK_OFFSET_Y),
    };
  }

  // ===== Ввод =====

  // Читает клавиатуру и джойстик и возвращает направление движения.
  // Длина направления — от 0 (стоим) до 1 (полная скорость).
  private readInput(): Phaser.Math.Vector2 {
    const direction = new Phaser.Math.Vector2(0, 0);

    // Каждая нажатая клавиша добавляет шаг в свою сторону.
    if (this.cursors.left.isDown || this.keyA.isDown) direction.x -= 1;
    if (this.cursors.right.isDown || this.keyD.isDown) direction.x += 1;
    if (this.cursors.up.isDown || this.keyW.isDown) direction.y -= 1;
    if (this.cursors.down.isDown || this.keyS.isDown) direction.y += 1;

    direction.add(this.readJoystick());

    // По диагонали длина была бы больше 1 — ограничиваем, чтобы вождь не бегал быстрее.
    return direction.limit(1);
  }

  // Виртуальный джойстик: где нажал — там центр, куда ведёшь — туда идёшь.
  // Опрашиваем указатель (мышь или палец) каждый кадр, без обработчиков событий.
  private readJoystick(): Phaser.Math.Vector2 {
    const pointer = this.scene.input.activePointer;

    this.joystickBase.setVisible(pointer.isDown);
    this.joystickKnob.setVisible(pointer.isDown);
    if (!pointer.isDown) return new Phaser.Math.Vector2(0, 0);

    // Насколько палец ушёл от точки нажатия. Дальше радиуса ручка не уходит.
    const offset = new Phaser.Math.Vector2(pointer.x - pointer.downX, pointer.y - pointer.downY);
    offset.limit(JOYSTICK_RADIUS);

    this.joystickBase.setPosition(pointer.downX, pointer.downY);
    this.joystickKnob.setPosition(pointer.downX + offset.x, pointer.downY + offset.y);

    // Делим на радиус: ручка на краю круга — полная скорость (1).
    return offset.scale(1 / JOYSTICK_RADIUS);
  }

  // Создаёт часть джойстика: в координатах экрана, поверх мира, сначала скрыта.
  private createJoystickPart(texture: string): Phaser.GameObjects.Image {
    return this.scene.add
      .image(0, 0, texture)
      .setScrollFactor(0)
      .setDepth(JOYSTICK_DEPTH)
      .setAlpha(JOYSTICK_ALPHA)
      .setVisible(false);
  }

  // ===== Движение и анимация =====

  // Двигает вождя: скорость = направление × PLAYER_SPEED × множитель фазы суток.
  // Шаг по x и по y проверяется отдельно: упёрся в стену — скользит вдоль неё.
  private move(direction: Phaser.Math.Vector2, delta: number, speedMultiplier: number, canStep: CanStep): void {
    const seconds = delta / 1000;
    const speed = PLAYER_SPEED * speedMultiplier;
    this.velocityX = direction.x * speed;
    this.velocityY = direction.y * speed;

    // Вождь не уходит в лес по краям мира.
    const nextX = Phaser.Math.Clamp(this.x + this.velocityX * seconds, WORLD_EDGE, WORLD_WIDTH - WORLD_EDGE);
    if (canStep(this.x, this.y, nextX, this.y)) this.x = nextX;
    const nextY = Phaser.Math.Clamp(this.y + this.velocityY * seconds, WORLD_EDGE, WORLD_HEIGHT - WORLD_EDGE);
    if (canStep(this.x, this.y, this.x, nextY)) this.y = nextY;

    // Разворот: смотрим туда, куда идём по горизонтали.
    if (this.velocityX > 0) this.facing = 1;
    if (this.velocityX < 0) this.facing = -1;
  }

  // Бег настоящими шагами или «дыхание» на месте.
  private animate(delta: number, isMoving: boolean): void {
    if (isMoving) {
      this.idleTime = 0;
      this.stepPhase += delta * STEP_SPEED;
      // legSwing качается от -1 до 1: одна нога вперёд, другая назад, потом наоборот.
      this.legSwing = Math.sin(this.stepPhase);
      // Тело выше всего, когда ноги проходят под ним (|cos| — два подъёма за цикл, по одному на шаг).
      this.bob = Math.abs(Math.cos(this.stepPhase)) * RUN_BOB_HEIGHT;
      // Тело наклонено вперёд по ходу бега.
      this.walkTilt = RUN_LEAN * this.facing;
      this.breathWave = 0;
      this.bodyImage.setScale(1);
    } else {
      this.stepPhase = 0;
      this.legSwing = 0;
      this.idleTime += delta;
      this.bob = 0;
      this.walkTilt = 0;
      // Медленное «дыхание»: тело чуть вытягивается и возвращается.
      this.breathWave = Math.sin(this.idleTime * IDLE_BREATH_SPEED);
      const breath = this.breathWave * IDLE_BREATH;
      this.bodyImage.setScale(1 - breath / 2, 1 + breath);
    }
  }

  // На сколько пикселей сейчас поднялась точка тела на высоте height над ногами.
  // Картинка тела «дышит», растягиваясь от ног вверх: чем выше точка, тем сильнее
  // она поднимается. Плюс подъём тела на шагах (bob). По этой высоте ставятся
  // отдельные картинки — свободная рука, дубина и стопка, — чтобы они двигались вместе с телом.
  private bodyLiftAt(height: number): number {
    return height * this.breathWave * IDLE_BREATH + this.bob;
  }

  // Расставляет все части вождя вокруг точки ног (x, y).
  // Глубина = y: кто ниже на экране, тот рисуется впереди.
  private place(): void {
    const isLeft = this.facing < 0;

    this.shadow.setPosition(this.x, this.y).setDepth(this.y + SHADOW_DEPTH_SHIFT);
    // Чем выше подпрыгнуло тело, тем меньше тень.
    this.shadow.setScale(this.shadowScale * (1 - (this.bob / RUN_BOB_HEIGHT) * SHADOW_SHRINK_IN_JUMP));
    this.ring.setPosition(this.x, this.y).setDepth(this.y + RING_DEPTH_SHIFT);

    // Наклон тела: от шагов и вслед за взмахом дубины (зеркально, если вождь смотрит влево).
    const lean = this.clubSwing * BODY_LEAN_PER_DEGREE * this.facing;
    this.bodyImage
      .setPosition(this.x, this.y - this.bob)
      .setAngle(this.walkTilt + lean)
      .setDepth(this.y)
      .setFlipX(isLeft);

    this.placeLegs(isLeft);

    // Свободная рука держится за плечо тела и двигается вместе с ним.
    // На месте она чуть покачивается в такт дыханию, на бегу машет в такт шагам
    // (в паре с ногой на той же стороне — в противофазе), при ударе отходит назад для равновесия.
    const armAngle =
      ARM_REST_ANGLE +
      this.breathWave * ARM_IDLE_SWAY +
      this.legSwing * ARM_SWING_ANGLE +
      this.clubSwing * ARM_STRIKE_FACTOR;
    this.freeArm
      .setPosition(
        this.x + SHOULDER_OFFSET_X * this.facing,
        this.y + SHOULDER_OFFSET_Y - this.bodyLiftAt(-SHOULDER_OFFSET_Y),
      )
      .setAngle(armAngle * this.facing)
      .setFlipX(isLeft)
      .setDepth(this.y + ARM_DEPTH_SHIFT);

    // Дубина в кулаке: кулак двигается вместе с телом. Дубина покачивается на месте
    // в такт дыханию и на бегу в такт шагам, а при взмахе к этому добавляется clubSwing.
    // Когда вождь смотрит влево, всё зеркально: и место, и угол.
    const clubAngle =
      CLUB_REST_ANGLE + this.breathWave * CLUB_IDLE_SWAY + this.legSwing * CLUB_RUN_SWAY + this.clubSwing;
    this.club
      .setPosition(this.x + HAND_OFFSET_X * this.facing, this.y + HAND_OFFSET_Y - this.bodyLiftAt(-HAND_OFFSET_Y))
      .setAngle(clubAngle * this.facing)
      .setFlipX(isLeft)
      .setDepth(this.y + CLUB_DEPTH_SHIFT);
  }

  // Ноги качаются вокруг бёдер в противофазе: одна вперёд, другая назад.
  // Нога, которая идёт вперёд, чуть приподнимается — получается шаг, а не скольжение.
  private placeLegs(isLeft: boolean): void {
    this.legs.forEach((leg, index) => {
      // Левая нога (index 0) — на −HIP_OFFSET_X, правая — на +HIP_OFFSET_X.
      const side = index === 0 ? -1 : 1;
      // Для левой ноги шаг = legSwing, для правой — наоборот.
      const swing = index === 0 ? this.legSwing : -this.legSwing;
      const lift = Math.max(0, swing) * LEG_LIFT;
      leg
        .setPosition(this.x + side * HIP_OFFSET_X, this.y + HIP_OFFSET_Y - this.bob - lift)
        // Нога висит вниз; поворот против часовой (минус) уносит ступню вперёд-вправо.
        .setAngle(-swing * LEG_SWING_ANGLE * this.facing)
        .setFlipX(isLeft)
        .setDepth(this.y + LEG_DEPTH_SHIFT);
    });
  }
}
