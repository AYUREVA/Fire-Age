import Phaser from 'phaser';
import { COLORS, toCss } from './palette';
import { FONT_FAMILY } from './textures';

// =====================================================================
//  Простые эффекты. Это функции, а не классы: вызвал — эффект сыграл.
//  Все эффекты сделаны твинами — плавной сменой чисел во времени.
// =====================================================================

// Летящие предметы рисуются поверх всего мира
// (у стоящих предметов глубина = y, а y не бывает больше высоты мира).
const FLY_DEPTH = 10000;
// В верхней точке дуги предмет чуть крупнее — будто ближе к нам.
const FLY_APEX_GROW = 0.2;

// Всплывающие надписи («+1») — ещё выше летящих предметов.
const FLOAT_TEXT_DEPTH = 11000;
// Надпись выскакивает за столько мс, поднимается на столько пикселей
// за столько мс и тает во второй половине пути.
const FLOAT_TEXT_APPEAR_TIME = 180;
const FLOAT_TEXT_RISE = 46;
const FLOAT_TEXT_TIME = 750;

// Встряска: сколько раз объект качнётся туда-обратно.
const SHAKE_SWINGS = 3;

// «Пружинка»: насколько объект сплющивается (шире и ниже) и за сколько мс возвращается.
const POP_SQUASH_X = 1.3;
const POP_SQUASH_Y = 0.7;
const POP_TIME = 260;

// Точка на карте.
export type Point = { x: number; y: number };

// Настройки полёта по дуге.
export type ArcFlight = {
  from: Point; // откуда летит
  target: () => Point; // куда летит: спрашиваем каждый кадр, цель может двигаться
  duration: number; // сколько мс длится полёт
  height: number; // на сколько пикселей дуга поднимается над прямой линией
  onLand: () => void; // что сделать, когда долетел
};

// Полёт объекта по дуге. Цель спрашиваем каждый кадр, поэтому предмет
// догоняет и движущуюся цель — например, стопку за спиной идущего вождя.
export function flyArc(scene: Phaser.Scene, object: Phaser.GameObjects.Image, flight: ArcFlight): void {
  object.setDepth(FLY_DEPTH);

  // Твин числа t от 0 до 1. Само число мы каждый кадр превращаем в позицию.
  scene.tweens.addCounter({
    from: 0,
    to: 1,
    duration: flight.duration,
    ease: 'Sine.easeIn',
    onUpdate: (tween) => {
      const t = tween.getValue() ?? 0;
      const target = flight.target();
      // 4·t·(1−t) равно 0 в начале и в конце пути и 1 — ровно посередине.
      const arc = 4 * t * (1 - t);
      // Точка на прямой от старта к цели, поднятая вверх по дуге.
      const x = Phaser.Math.Linear(flight.from.x, target.x, t);
      const y = Phaser.Math.Linear(flight.from.y, target.y, t) - flight.height * arc;
      object.setPosition(x, y);
      object.setScale(1 + FLY_APEX_GROW * arc);
    },
    onComplete: () => {
      // Ставим точно в цель: последний кадр полёта мог чуть не дотянуть.
      const target = flight.target();
      object.setPosition(target.x, target.y);
      object.setScale(1);
      flight.onLand();
    },
  });
}

// Всплывающая надпись (например, «+1»): выскакивает, поднимается и тает.
export function floatText(scene: Phaser.Scene, x: number, y: number, text: string, color: number): void {
  const label = scene.add
    .text(x, y, text, {
      fontFamily: FONT_FAMILY,
      fontSize: '28px',
      fontStyle: 'bold',
      color: toCss(color),
      stroke: toCss(COLORS.outline),
      strokeThickness: 6,
      resolution: 2,
    })
    .setOrigin(0.5)
    .setDepth(FLOAT_TEXT_DEPTH)
    .setScale(0);

  // Выскакивает из точки с отскоком.
  scene.tweens.add({ targets: label, scale: 1, duration: FLOAT_TEXT_APPEAR_TIME, ease: 'Back.easeOut' });
  // Поднимается вверх, замедляясь, и в конце удаляется.
  scene.tweens.add({
    targets: label,
    y: y - FLOAT_TEXT_RISE,
    duration: FLOAT_TEXT_TIME,
    ease: 'Cubic.easeOut',
    onComplete: () => label.destroy(),
  });
  // Тает во второй половине пути.
  scene.tweens.add({ targets: label, alpha: 0, delay: FLOAT_TEXT_TIME / 2, duration: FLOAT_TEXT_TIME / 2 });
}

// Встряска: объект качается из стороны в сторону, и качание затухает.
// angle — самый большой угол наклона в градусах.
export function shake(scene: Phaser.Scene, object: Phaser.GameObjects.Image, angle: number, duration: number): void {
  scene.tweens.addCounter({
    from: 0,
    to: 1,
    duration,
    onUpdate: (tween) => {
      const t = tween.getValue() ?? 0;
      // sin — качание туда-обратно, (1 − t) — затухание: к концу угол становится 0.
      object.setAngle(Math.sin(t * Math.PI * 2 * SHAKE_SWINGS) * angle * (1 - t));
    },
  });
}

// «Пружинка»: объект сплющивается и с отскоком возвращается к своему размеру.
// baseScale — обычный размер объекта (если он и так увеличен или уменьшен).
export function pop(
  scene: Phaser.Scene,
  object: Phaser.GameObjects.Image | Phaser.GameObjects.Text,
  baseScale = 1,
): void {
  object.setScale(baseScale * POP_SQUASH_X, baseScale * POP_SQUASH_Y);
  scene.tweens.add({
    targets: object,
    scaleX: baseScale,
    scaleY: baseScale,
    duration: POP_TIME,
    // Back.easeOut чуть проскакивает нужный размер и возвращается — получается пружинка.
    ease: 'Back.easeOut',
  });
}
