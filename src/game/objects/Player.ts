import Phaser from 'phaser';
import { CanStep, Point, pop } from '../fx';
import { JOYSTICK_RADIUS, PLAYER_SPEED, WORLD_EDGE, WORLD_HEIGHT, WORLD_WIDTH } from '../settings';
import { SOUNDS, SOUND_VOLUMES, playSound } from '../sounds';
import { TEXTURES, WEAPON_GRIP_FROM_BOTTOM } from '../textures';
import { WEAPONS, Weapon } from '../data/upgrades';

// ===== Слои вождя =====

// Тень и кольцо лежат на земле сразу под вождём. Ноги — чуть позади тела
// (подол шкуры закрывает бёдра), руки и дубина — чуть впереди; кулак на дубине —
// поверх запястья руки с оружием.
const SHADOW_DEPTH_SHIFT = -0.6;
const RING_DEPTH_SHIFT = -0.5;
const LEG_DEPTH_SHIFT = -0.05;
const ARM_DEPTH_SHIFT = 0.05;
const CLUB_ARM_DEPTH_SHIFT = 0.08;
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

// ===== Рука с оружием =====

// Плечо руки с оружием (когда вождь смотрит вправо) и где плечо на картинке этой руки.
const CLUB_SHOULDER_OFFSET_X = 30;
const CLUB_SHOULDER_OFFSET_Y = -52;
const CLUB_ARM_SHOULDER_Y = 0.2;
// От плеча до центра кулака, в пикселях: кулак на картинке оружия ложится на запястье.
const CLUB_ARM_LENGTH = 25;
// В покое рука с оружием отведена вперёд (0° — висит прямо вниз, минус — вперёд).
const CLUB_ARM_REST_ANGLE = -23.6;
// Угол дубины в покое: наклонена вперёд, от лица (0° — дубина стоит вертикально).
const CLUB_REST_ANGLE = 65;

// ===== Удар «мягкий хлёст»: замах → удар → возврат =====

// Поза удара — на сколько всё отклонено от покоя (когда вождь смотрит вправо):
// armSwing — рука от плеча (минус — вперёд-вверх), wristSwing — дубина в кисти
// (минус — запрокинута назад, плюс — «хлещет» вперёд), swingLean — наклон тела
// (минус — откинулся назад), swingSquash — сжатие тела (плюс — присел),
// freeArmSwing — отвод свободной руки (минус — назад).
type SwingPose = { armSwing: number; wristSwing: number; swingLean: number; swingSquash: number; freeArmSwing: number };
// Замах: рука поднимает дубину вперёд-вверх, кисть чуть отстаёт, тело откидывается.
const SWING_WINDUP: SwingPose = { armSwing: -100, wristSwing: -5, swingLean: -5, swingSquash: -0.03, freeArmSwing: 8 };
// Удар: рука опускается вперёд, кисть «хлещет» дубиной, тело наклоняется и чуть приседает.
const SWING_STRIKE: SwingPose = { armSwing: 10, wristSwing: 22, swingLean: 7, swingSquash: 0.05, freeArmSwing: -10 };
const SWING_REST: SwingPose = { armSwing: 0, wristSwing: 0, swingLean: 0, swingSquash: 0, freeArmSwing: 0 };
// Какую долю всего удара занимает каждая фаза (в сумме 1): мягкий замах,
// плавный разгон до попадания, спокойный возврат без пружинки.
// Весь удар длится столько, сколько передали в swing() (интервал удара оружия),
// поэтому попадание (замах + удар = 0.6 удара) всегда раньше следующего удара.
const SWING_WINDUP_SHARE = 0.36;
const SWING_STRIKE_SHARE = 0.24;
const SWING_RECOVER_SHARE = 0.4;
// Присев делает тело ниже и чуть шире: ширина меняется на эту долю от высоты.
const SQUASH_WIDEN = 0.6;

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
 * по направлению и бьёт дубиной от плеча. Состоит из нескольких картинок: тень,
 * кольцо под ногами, две ноги, тело, свободная рука, рука с оружием и оружие.
 * Обе руки прикреплены к плечам и двигаются вместе с телом.
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
  // Поза удара (см. SwingPose): рука, кисть, наклон и сжатие тела, свободная рука.
  // Меняется цепочкой твинов в swing(), в покое — нули.
  private armSwing = 0;
  private wristSwing = 0;
  private swingLean = 0;
  private swingSquash = 0;
  private freeArmSwing = 0;
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
  // Рука с оружием: вращается от плеча, на её конце — кулак с оружием.
  private clubArm: Phaser.GameObjects.Image;
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
    // обеих рук — плечо, дубины — кулак.
    this.bodyImage = scene.add.image(x, y, TEXTURES.player).setOrigin(0.5, 1);
    this.legs = [
      scene.add.image(x, y, TEXTURES.leg).setOrigin(0.5, LEG_HIP_Y),
      scene.add.image(x, y, TEXTURES.leg).setOrigin(0.5, LEG_HIP_Y),
    ];
    this.freeArm = scene.add.image(x, y, TEXTURES.arm).setOrigin(0.5, ARM_SHOULDER_Y);
    this.clubArm = scene.add.image(x, y, TEXTURES.clubArm).setOrigin(0.5, CLUB_ARM_SHOULDER_Y);
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

  // Удар дубиной: вождь поворачивается к цели (кусту), замахивается и бьёт.
  // duration — сколько мс длится весь удар, onImpact вызывается в момент,
  // когда дубина попадает по цели.
  swing(targetX: number, duration: number, onImpact: () => void): void {
    this.facing = targetX >= this.x ? 1 : -1;

    // Если прошлый удар ещё идёт — останавливаем его, чтобы два удара не спорили.
    this.scene.tweens.killTweensOf(this);

    // Цепочка из трёх твинов, они идут друг за другом. Каждый меняет числа позы удара
    // (armSwing, wristSwing и др.), а place() превращает их в углы рук, дубины и тела.
    this.scene.tweens.chain({
      targets: this,
      tweens: [
        // 1. Замах: рука плавно поднимает дубину вперёд-вверх, кисть чуть отстаёт.
        { ...SWING_WINDUP, duration: duration * SWING_WINDUP_SHARE, ease: 'Sine.easeInOut' },
        // 2. Удар: плавный разгон вниз-вперёд, кисть «хлещет» дубиной. В конце — попадание.
        {
          ...SWING_STRIKE,
          duration: duration * SWING_STRIKE_SHARE,
          ease: 'Sine.easeIn',
          onComplete: () => {
            playSound(this.scene, SOUNDS.hit, SOUND_VOLUMES.hit);
            onImpact();
          },
        },
        // 3. Спокойный возврат в покой.
        { ...SWING_REST, duration: duration * SWING_RECOVER_SHARE, ease: 'Sine.easeOut' },
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

  // Идёт ли сейчас удар дубиной (тогда новый удар оборвал бы его).
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
    } else {
      this.stepPhase = 0;
      this.legSwing = 0;
      this.idleTime += delta;
      this.bob = 0;
      this.walkTilt = 0;
      // Медленное «дыхание»: тело чуть вытягивается и возвращается (см. place()).
      this.breathWave = Math.sin(this.idleTime * IDLE_BREATH_SPEED);
    }
  }

  // На сколько пикселей сейчас поднялась точка тела на высоте height над ногами.
  // Картинка тела «дышит», растягиваясь от ног вверх: чем выше точка, тем сильнее
  // она поднимается. Плюс подъём тела на шагах (bob). По этой высоте ставится
  // стопка на спине, чтобы она двигалась вместе с телом.
  private bodyLiftAt(height: number): number {
    return height * this.breathWave * IDLE_BREATH + this.bob;
  }

  // Точка на теле: (offsetX, offsetY) от ног, когда вождь смотрит вправо и стоит ровно.
  // Тело растянуто в scaleX × scaleY раз и наклонено на angle градусов вокруг ног,
  // поэтому точка (например, плечо) поворачивается и сжимается вместе с ним.
  private pointOnBody(offsetX: number, offsetY: number, angle: number, scaleX: number, scaleY: number): Point {
    const localX = offsetX * this.facing * scaleX;
    const localY = offsetY * scaleY;
    const rad = Phaser.Math.DegToRad(angle);
    return {
      x: this.x + localX * Math.cos(rad) - localY * Math.sin(rad),
      y: this.y - this.bob + localX * Math.sin(rad) + localY * Math.cos(rad),
    };
  }

  // Расставляет все части вождя вокруг точки ног (x, y).
  // Глубина = y: кто ниже на экране, тот рисуется впереди.
  private place(): void {
    const isLeft = this.facing < 0;

    this.shadow.setPosition(this.x, this.y).setDepth(this.y + SHADOW_DEPTH_SHIFT);
    // Чем выше подпрыгнуло тело, тем меньше тень.
    this.shadow.setScale(this.shadowScale * (1 - (this.bob / RUN_BOB_HEIGHT) * SHADOW_SHRINK_IN_JUMP));
    this.ring.setPosition(this.x, this.y).setDepth(this.y + RING_DEPTH_SHIFT);

    // Тело: наклон от шагов и от удара (зеркально, если вождь смотрит влево),
    // «дыхание» на месте и присед при ударе.
    const bodyAngle = this.walkTilt + this.swingLean * this.facing;
    const breath = this.breathWave * IDLE_BREATH;
    const scaleX = (1 - breath / 2) * (1 + this.swingSquash * SQUASH_WIDEN);
    const scaleY = (1 + breath) * (1 - this.swingSquash);
    this.bodyImage
      .setPosition(this.x, this.y - this.bob)
      .setAngle(bodyAngle)
      .setScale(scaleX, scaleY)
      .setDepth(this.y)
      .setFlipX(isLeft);

    this.placeLegs(isLeft);

    // Свободная рука держится за плечо тела и наклоняется вместе с ним.
    // На месте она чуть покачивается в такт дыханию, на бегу машет в такт шагам
    // (в паре с ногой на той же стороне — в противофазе), при ударе отходит для равновесия.
    const freeShoulder = this.pointOnBody(SHOULDER_OFFSET_X, SHOULDER_OFFSET_Y, bodyAngle, scaleX, scaleY);
    const freeArmAngle =
      ARM_REST_ANGLE + this.breathWave * ARM_IDLE_SWAY + this.legSwing * ARM_SWING_ANGLE + this.freeArmSwing;
    this.freeArm
      .setPosition(freeShoulder.x, freeShoulder.y)
      .setAngle(freeArmAngle * this.facing + bodyAngle)
      .setFlipX(isLeft)
      .setDepth(this.y + ARM_DEPTH_SHIFT);

    // Рука с оружием вращается от плеча; кулак с оружием — на её конце.
    const clubShoulder = this.pointOnBody(CLUB_SHOULDER_OFFSET_X, CLUB_SHOULDER_OFFSET_Y, bodyAngle, scaleX, scaleY);
    const clubArmAngle = (CLUB_ARM_REST_ANGLE + this.armSwing) * this.facing + bodyAngle;
    this.clubArm
      .setPosition(clubShoulder.x, clubShoulder.y)
      .setAngle(clubArmAngle)
      .setFlipX(isLeft)
      .setDepth(this.y + CLUB_ARM_DEPTH_SHIFT);
    // Картинка руки висит вниз: поворот на угол уводит кисть от плеча в сторону (−sin, cos).
    const armRad = Phaser.Math.DegToRad(clubArmAngle);
    const handX = clubShoulder.x - Math.sin(armRad) * CLUB_ARM_LENGTH;
    const handY = clubShoulder.y + Math.cos(armRad) * CLUB_ARM_LENGTH;

    // Дубина в кулаке поворачивается вместе с рукой и ещё в кисти: на месте покачивается
    // в такт дыханию, на бегу — в такт шагам, при ударе кисть отстаёт и «хлещет».
    // Когда вождь смотрит влево, всё зеркально: и место, и угол.
    const clubAngle =
      CLUB_REST_ANGLE + this.armSwing + this.wristSwing + this.breathWave * CLUB_IDLE_SWAY + this.legSwing * CLUB_RUN_SWAY;
    this.club
      .setPosition(handX, handY)
      .setAngle(clubAngle * this.facing + bodyAngle)
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
