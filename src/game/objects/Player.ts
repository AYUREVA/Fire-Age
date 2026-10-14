import Phaser from 'phaser';
import { JOYSTICK_RADIUS, PLAYER_SPEED, WORLD_EDGE, WORLD_HEIGHT, WORLD_WIDTH } from '../settings';
import { TEXTURES } from '../textures';

// ===== Слои вождя =====

// Тень и кольцо лежат на земле сразу под вождём, дубина — чуть впереди тела.
const SHADOW_DEPTH_SHIFT = -0.6;
const RING_DEPTH_SHIFT = -0.5;
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
const HAND_OFFSET_X = 24;
const HAND_OFFSET_Y = -32;
// Дубина вращается вокруг кулака. На картинке дубины кулак внизу:
// его центр на этой доле высоты картинки (0 — верх, 1 — низ).
const CLUB_GRIP_Y = 0.89;
// Угол дубины в покое: наклонена вперёд, от лица (0° — дубина стоит вертикально).
const CLUB_REST_ANGLE = 65;

// ===== Взмах дубиной: замах → удар → возврат =====

// На сколько градусов от угла покоя дубина отходит назад-вверх на замахе
// и на сколько уходит вперёд-вниз в момент удара по кусту.
const CLUB_WINDUP_ANGLE = -50;
const CLUB_STRIKE_ANGLE = 45;
// Длительность фаз, мс: неспешный замах, резкий удар, возврат в покой с пружинкой.
// Вместе они короче HIT_INTERVAL из settings.ts, поэтому взмахи не накладываются.
const SWING_WINDUP_TIME = 120;
const SWING_STRIKE_TIME = 80;
const SWING_RECOVER_TIME = 220;
// Тело наклоняется вслед за дубиной: градусов наклона на градус взмаха
// (назад на замахе, вперёд при ударе).
const BODY_LEAN_PER_DEGREE = 0.08;

// Где спина — точка, от которой растёт стопка (когда вождь смотрит вправо).
const BACK_OFFSET_X = -16;
const BACK_OFFSET_Y = -58;

// Пружинистая ходьба: высота подскока, частота шагов, наклон и сплющивание.
const WALK_BOB_HEIGHT = 6;
const WALK_BOB_SPEED = 0.018;
const WALK_TILT = 4;
const WALK_SQUASH = 0.06;
// В прыжке тень становится меньше на эту долю.
const SHADOW_SHRINK_IN_JUMP = 0.15;
// «Дыхание» на месте: насколько вытягивается тело и как быстро.
const IDLE_BREATH = 0.025;
const IDLE_BREATH_SPEED = 0.004;

/**
 * Вождь племени.
 *
 * Ходит по миру (клавиатура или виртуальный джойстик), пружинисто
 * подпрыгивает при ходьбе, разворачивается по направлению и машет дубиной.
 * Состоит из нескольких картинок: тень, кольцо под ногами, тело и дубина.
 * О кустах, стопке и поленнице вождь ничего не знает — этим занимается сцена.
 */
export class Player {
  // Позиция ног вождя в мире. За этой точкой следит камера.
  x: number;
  y: number;
  // Текущая скорость, пикселей в секунду. Сцена передаёт её стопке, чтобы та отставала.
  velocityX = 0;
  velocityY = 0;

  private scene: Phaser.Scene;
  // Куда смотрит вождь: 1 — вправо, -1 — влево.
  private facing = 1;
  // Сколько мс вождь идёт без остановки — из этого считаются шаги.
  private walkTime = 0;
  // Сколько мс вождь стоит — из этого считается «дыхание».
  private idleTime = 0;
  // Насколько тело сейчас подпрыгнуло вверх, в пикселях.
  private bob = 0;
  // Взмах дубиной: на сколько градусов дубина сейчас отклонена от угла покоя.
  // Меняется цепочкой твинов в swing().
  private clubSwing = 0;
  // Наклон тела от шагов (градусы).
  private walkTilt = 0;
  // Во сколько раз растянута текстура тени, чтобы её ширина была SHADOW_WIDTH.
  private shadowScale = 1;

  // Части вождя.
  private shadow: Phaser.GameObjects.Image;
  private ring: Phaser.GameObjects.Image;
  private bodyImage: Phaser.GameObjects.Image;
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
    // Точка опоры тела — середина нижнего края (ноги), дубины — кулак.
    this.bodyImage = scene.add.image(x, y, TEXTURES.player).setOrigin(0.5, 1);
    this.club = scene.add.image(x, y, TEXTURES.club).setOrigin(0.5, CLUB_GRIP_Y);

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
  update(delta: number): void {
    const direction = this.readInput();
    const isMoving = direction.length() > 0;

    this.move(direction, delta);
    this.animate(delta, isMoving);
    this.place();
  }

  // Взмах дубиной: вождь поворачивается к цели (кусту), замахивается и бьёт.
  // onImpact вызывается в момент, когда дубина попадает по цели.
  swing(targetX: number, onImpact: () => void): void {
    this.facing = targetX >= this.x ? 1 : -1;

    // Если прошлый взмах ещё идёт — останавливаем его, чтобы два взмаха не спорили.
    this.scene.tweens.killTweensOf(this);

    // Цепочка из трёх твинов, они идут друг за другом. Каждый меняет число clubSwing,
    // а place() превращает его в угол дубины и наклон тела.
    this.scene.tweens.chain({
      targets: this,
      tweens: [
        // 1. Замах: дубина плавно отходит назад-вверх.
        { clubSwing: CLUB_WINDUP_ANGLE, duration: SWING_WINDUP_TIME, ease: 'Sine.easeOut' },
        // 2. Удар: резко вперёд-вниз, с разгоном. В конце — попадание.
        { clubSwing: CLUB_STRIKE_ANGLE, duration: SWING_STRIKE_TIME, ease: 'Quad.easeIn', onComplete: onImpact },
        // 3. Возврат в покой: Back.easeOut чуть проскакивает — получается пружинка.
        { clubSwing: 0, duration: SWING_RECOVER_TIME, ease: 'Back.easeOut' },
      ],
    });
  }

  // Точка на спине, от которой растёт стопка. Спина — со стороны, противоположной взгляду.
  // Точка подпрыгивает вместе с телом, поэтому стопка тоже «шагает».
  getBackPoint(): { x: number; y: number } {
    return {
      x: this.x + BACK_OFFSET_X * this.facing,
      y: this.y + BACK_OFFSET_Y - this.bob,
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

  // Двигает вождя: скорость = направление × PLAYER_SPEED.
  private move(direction: Phaser.Math.Vector2, delta: number): void {
    const seconds = delta / 1000;
    this.velocityX = direction.x * PLAYER_SPEED;
    this.velocityY = direction.y * PLAYER_SPEED;

    // Вождь не уходит в лес по краям мира.
    this.x = Phaser.Math.Clamp(this.x + this.velocityX * seconds, WORLD_EDGE, WORLD_WIDTH - WORLD_EDGE);
    this.y = Phaser.Math.Clamp(this.y + this.velocityY * seconds, WORLD_EDGE, WORLD_HEIGHT - WORLD_EDGE);

    // Разворот: смотрим туда, куда идём по горизонтали.
    if (this.velocityX > 0) this.facing = 1;
    if (this.velocityX < 0) this.facing = -1;
  }

  // Пружинистая ходьба или «дыхание» на месте.
  private animate(delta: number, isMoving: boolean): void {
    if (isMoving) {
      this.idleTime = 0;
      this.walkTime += delta;
      // step качается от -1 до 1. |step| — подскок: каждый шаг тело взлетает и опускается.
      const step = Math.sin(this.walkTime * WALK_BOB_SPEED);
      this.bob = Math.abs(step) * WALK_BOB_HEIGHT;
      // На каждом шаге тело наклоняется то вправо, то влево.
      this.walkTilt = step * WALK_TILT;
      // Внизу шага тело чуть сплющено, вверху — вытянуто.
      const stretch = (Math.abs(step) * 2 - 1) * WALK_SQUASH;
      this.bodyImage.setScale(1 - stretch, 1 + stretch);
    } else {
      this.walkTime = 0;
      this.idleTime += delta;
      this.bob = 0;
      this.walkTilt = 0;
      // Медленное «дыхание»: тело чуть вытягивается и возвращается.
      const breath = Math.sin(this.idleTime * IDLE_BREATH_SPEED) * IDLE_BREATH;
      this.bodyImage.setScale(1 - breath / 2, 1 + breath);
    }
  }

  // Расставляет все части вождя вокруг точки ног (x, y).
  // Глубина = y: кто ниже на экране, тот рисуется впереди.
  private place(): void {
    const isLeft = this.facing < 0;

    this.shadow.setPosition(this.x, this.y).setDepth(this.y + SHADOW_DEPTH_SHIFT);
    // Чем выше подпрыгнуло тело, тем меньше тень.
    this.shadow.setScale(this.shadowScale * (1 - (this.bob / WALK_BOB_HEIGHT) * SHADOW_SHRINK_IN_JUMP));
    this.ring.setPosition(this.x, this.y).setDepth(this.y + RING_DEPTH_SHIFT);

    // Наклон тела: от шагов и вслед за взмахом дубины (зеркально, если вождь смотрит влево).
    const lean = this.clubSwing * BODY_LEAN_PER_DEGREE * this.facing;
    this.bodyImage
      .setPosition(this.x, this.y - this.bob)
      .setAngle(this.walkTilt + lean)
      .setDepth(this.y)
      .setFlipX(isLeft);

    // Дубина в кулаке. Когда вождь смотрит влево, всё зеркально: и место, и угол.
    this.club
      .setPosition(this.x + HAND_OFFSET_X * this.facing, this.y + HAND_OFFSET_Y - this.bob)
      .setAngle((CLUB_REST_ANGLE + this.clubSwing) * this.facing)
      .setFlipX(isLeft)
      .setDepth(this.y + CLUB_DEPTH_SHIFT);
  }
}
