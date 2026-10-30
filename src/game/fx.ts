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
// В полёте предмет наклоняется по ходу полёта (градусы в верхней точке дуги),
// к приземлению снова ровный.
const FLY_TILT = 14;

// Всплывающие надписи («+1») — ещё выше летящих предметов.
const FLOAT_TEXT_DEPTH = 11000;
// Надпись выскакивает за столько мс, поднимается на столько пикселей
// за столько мс и тает во второй половине пути.
const FLOAT_TEXT_APPEAR_TIME = 180;
const FLOAT_TEXT_RISE = 46;
const FLOAT_TEXT_TIME = 750;
// Надпись чуть сносит вбок — на случайное число пикселей до этого (влево или вправо),
// чтобы несколько «+1» подряд не вставали ровно друг на друга.
const FLOAT_TEXT_DRIFT = 10;
// Надпись выскакивает чуть наклонённой (градусы) и с отскоком выпрямляется.
const FLOAT_TEXT_TILT = 12;

// Встряска: сколько раз объект качнётся туда-обратно.
const SHAKE_SWINGS = 3;

// Качание на ветру (ели): самый большой наклон (градусы) и сколько мс длится
// один наклон в сторону — у каждого дерева своё время, чтобы лес не качался строем.
const SWAY_ANGLE = 1.2;
const SWAY_TIME_MIN = 1800;
const SWAY_TIME_MAX = 2800;

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

  // Куда летит предмет по горизонтали: 1 — вправо, -1 — влево. Туда он и наклоняется.
  const direction = flight.target().x >= flight.from.x ? 1 : -1;

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
      object.setAngle(FLY_TILT * arc * direction);
    },
    onComplete: () => {
      // Ставим точно в цель: последний кадр полёта мог чуть не дотянуть.
      const target = flight.target();
      object.setPosition(target.x, target.y);
      object.setScale(1);
      object.setAngle(0);
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

  // Выскакивает из точки с отскоком и выпрямляется из наклона.
  label.setAngle(Phaser.Math.Between(-FLOAT_TEXT_TILT, FLOAT_TEXT_TILT));
  scene.tweens.add({ targets: label, scale: 1, angle: 0, duration: FLOAT_TEXT_APPEAR_TIME, ease: 'Back.easeOut' });
  // Поднимается вверх, замедляясь, чуть уходит вбок и в конце удаляется.
  scene.tweens.add({
    targets: label,
    y: y - FLOAT_TEXT_RISE,
    x: x + Phaser.Math.Between(-FLOAT_TEXT_DRIFT, FLOAT_TEXT_DRIFT),
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
    onUpdate: (tween) => object.setAngle(shakeAngle(tween.getValue() ?? 0, angle)),
  });
}

// Угол встряски в момент t (от 0 — начало до 1 — конец), angle — самый большой угол.
// sin — качание туда-обратно, (1 − t) — затухание: к концу угол становится 0.
// Отдельной функцией — чтобы куст мог сложить встряску со своим качанием на ветру.
export function shakeAngle(t: number, angle: number): number {
  return Math.sin(t * Math.PI * 2 * SHAKE_SWINGS) * angle * (1 - t);
}

// Качание на ветру: объект медленно наклоняется туда-обратно от точки опоры
// (у ели — от комля). Твин бесконечный, у каждого объекта своя скорость и начало.
export function sway(scene: Phaser.Scene, object: Phaser.GameObjects.Image): void {
  const duration = Phaser.Math.Between(SWAY_TIME_MIN, SWAY_TIME_MAX);
  object.setAngle(-SWAY_ANGLE);
  scene.tweens.add({
    targets: object,
    angle: SWAY_ANGLE,
    duration,
    delay: Phaser.Math.Between(0, duration),
    yoyo: true,
    repeat: -1,
    ease: 'Sine.easeInOut',
  });
}

// «Пружинка»: объект сплющивается и с отскоком возвращается к своему размеру.
// baseScale — обычный размер объекта (если он и так увеличен или уменьшен),
// strength — сила сплющивания: 1 — обычная, 0.3 — лёгкий «тычок».
export function pop(
  scene: Phaser.Scene,
  object: Phaser.GameObjects.Image | Phaser.GameObjects.Text,
  baseScale = 1,
  strength = 1,
): void {
  const squashX = 1 + (POP_SQUASH_X - 1) * strength;
  const squashY = 1 + (POP_SQUASH_Y - 1) * strength;
  object.setScale(baseScale * squashX, baseScale * squashY);
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
  // У фильтров Phaser 4 по умолчанию нет запаса места вокруг картинки, и свечение
  // обрезалось бы по её прямоугольнику. null — пусть Glow сам добавит запас на ширину ореола.
  glow.setPaddingOverride(null);
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
