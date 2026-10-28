import Phaser from 'phaser';
import { COLORS, toCss } from './palette';
import { DROP_ZONE_INSET, DROP_ZONE_RADIUS, FONT_FAMILY } from './textures';

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

// Свечение-обводка: сила свечения «дышит» от GLOW_MIN до GLOW_MAX и обратно за GLOW_PULSE_TIME мс.
const GLOW_MIN = 2;
const GLOW_MAX = 6;
const GLOW_PULSE_TIME = 600;
// Светящаяся рамка площадки: толщина линии.
const GLOW_FRAME_WIDTH = 5;

// «Пружинка»: насколько объект сплющивается (шире и ниже) и за сколько мс возвращается.
const POP_SQUASH_X = 1.3;
const POP_SQUASH_Y = 0.7;
const POP_TIME = 260;

// Точка на карте.
export type Point = { x: number; y: number };

// Можно ли шагнуть из точки (fromX, fromY) в точку (toX, toY).
// Такую проверку сцена передаёт тем, кто ходит (вождь, кролики, волки):
// сами они про частокол ничего не знают.
export type CanStep = (fromX: number, fromY: number, toX: number, toY: number) => boolean;

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

// Свечение-обводка вокруг картинки (подсказка обучения): тёплый ореол по контуру,
// сила которого «дышит». isOn = false — свечение снимается.
// Это фильтр WebGL: без WebGL (Canvas) картинка просто не светится.
export function setGlow(
  scene: Phaser.Scene,
  object: Phaser.GameObjects.Image | Phaser.GameObjects.Graphics,
  isOn: boolean,
): void {
  if (!isOn) {
    for (const filter of object.filters?.internal.list ?? []) scene.tweens.killTweensOf(filter);
    object.filters?.internal.clear();
    return;
  }
  if (!object.filters) object.enableFilters();
  // Нет WebGL — фильтров нет; уже светится — второй раз не добавляем.
  if (!object.filters || object.filters.internal.list.length > 0) return;
  const glow = object.filters.internal.addGlow(COLORS.hintGlow, GLOW_MIN);
  scene.tweens.add({
    targets: glow,
    outerStrength: GLOW_MAX,
    duration: GLOW_PULSE_TIME,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.easeInOut',
  });
}

// Рамка по краю площадки кучи или стола — для свечения подсказки.
// Саму площадку подсвечивать нельзя: у неё полупрозрачная середина, и свечение
// залило бы её целиком. Рамка лежит поверх площадки и сначала спрятана.
export function glowFrame(scene: Phaser.Scene, platform: Phaser.GameObjects.Image): Phaser.GameObjects.Graphics {
  const width = platform.width - DROP_ZONE_INSET * 2;
  const height = platform.height - DROP_ZONE_INSET * 2;
  return scene.add
    .graphics({ x: platform.x, y: platform.y })
    .lineStyle(GLOW_FRAME_WIDTH, COLORS.hintGlow, 1)
    .strokeRoundedRect(-width / 2, -height / 2, width, height, DROP_ZONE_RADIUS)
    .setDepth(platform.depth + 2)
    .setVisible(false);
}
