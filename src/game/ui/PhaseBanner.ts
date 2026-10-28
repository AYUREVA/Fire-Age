import Phaser from 'phaser';
import { COLORS, toCss } from '../palette';
import { FONT_FAMILY, TEXTURES, TITLE_FONT } from '../textures';
import { Point, pop } from '../fx';
import { formatTime } from '../objects/Hud';
import { addCarvedTitle } from './StoneTablet';

// ===== Табличка =====

// Баннер поверх всего мира, но под HUD (20000), — кнопка паузы остаётся доступной.
const BANNER_DEPTH = 19000;
// Где висит середина таблички (от верха экрана) и откуда она выезжает.
const BANNER_Y = 120;
const BANNER_HIDDEN_Y = -130;
// Табличка плавно выезжает, висит и уезжает обратно (мс). Без отскоков.
const BANNER_IN_TIME = 450;
const BANNER_HOLD_TIME = 2200;
const BANNER_OUT_TIME = 350;
// Плита в картинке ниже её середины (сверху лежит снег) — надпись тоже ниже.
// Надпись сдвинута вправо, чтобы не наезжать на иконку слева.
const TITLE_X = 28;
const TITLE_Y = 14;
const TITLE_FONT_SIZE = 36;
// Иконка луны или солнца слева на табличке.
const ICON_X = -206;
const ICON_Y = 14;
const ICON_SCALE = 1.3;

// ===== Плашки модификаторов под табличкой (ночью) =====

// Насколько ниже середины таблички висят плашки и как далеко друг от друга.
const CHIPS_Y = 108;
const CHIP_STEP = 216;
// Плашка — растянутая плашка HUD.
const CHIP_SCALE_X = 1.2;
const CHIP_SCALE_Y = 0.75;
// Иконка слева на плашке и начало надписи.
const CHIP_ICON_X = -80;
const CHIP_TEXT_X = -60;
// Иконки: пламя и нога в сапоге — уменьшенные картинки из игры.
const FLAME_ICON_SCALE = 0.36;
const BOOT_ICON_SCALE = 0.95;

// ===== Крупный таймер ночи =====

// Таймер «ДО РАССВЕТА 1:59» под плашками метели. Летит в плашку времени поверх HUD (20000).
const TIMER_DEPTH = 20001;
// Середина цифр — на такой высоте от верха экрана; подпись — выше цифр на столько пикселей.
const TIMER_Y = 330;
const TIMER_LABEL_Y = -52;
const TIMER_FONT_SIZE = 72;
const TIMER_LABEL = 'ДО РАССВЕТА';
// Появляется из такого размера, пока выезжает табличка.
const TIMER_START_SCALE = 0.6;
// Когда табличка уезжает, таймер за столько мс сжимается до размера цифр HUD (34px)
// и улетает в плашку времени.
const TIMER_FLY_TIME = 500;
const TIMER_END_SCALE = 34 / TIMER_FONT_SIZE;

// ===== Снежный вихрь =====

// Вихрь проносится по экрану слева направо за столько мс.
const SWIRL_TIME = 900;
// Путь вихря — волна: высота середины пути (доля экрана), размах и сколько волн.
const SWIRL_Y = 0.45;
const SWIRL_AMPLITUDE = 70;
const SWIRL_WAVES = 2;
// Вихрь начинается и кончается за краями экрана на столько пикселей.
const SWIRL_MARGIN = 40;
// Сколько снежинок вылетает за кадр.
const SWIRL_PER_FRAME = 3;
const SWIRL: Phaser.Types.GameObjects.Particles.ParticleEmitterConfig = {
  speed: { min: 40, max: 170 },
  angle: { min: 0, max: 360 },
  lifespan: { min: 600, max: 1100 },
  scale: { start: 1.5, end: 0 },
  alpha: { start: 1, end: 0 },
  emitting: false, // снежинки вылетают только по команде emitParticleAt
};

// Надписи (раздел 5 плана).
const NIGHT_TITLE = 'НОЧЬ';
const NIGHT_SUFFIX = ' · МЕТЕЛЬ!';
const MORNING_TITLE = 'РАССВЕТ · ДЕНЬ ';
const FIRE_CHIP_TEXT = 'горит быстрее';
const SPEED_CHIP_TEXT = 'идёшь медленнее';

// Крупный таймер ночи: сколько осталось (спрашиваем каждый кадр — время идёт),
// куда улететь (середина цифр времени в HUD) и что сделать, когда долетел.
export type NightTimer = { getTimeLeft: () => number; target: Point; onLand: () => void };

/**
 * Уведомление о смене фазы суток.
 *
 * Ночью: по экрану проносится снежный вихрь, сверху выезжает каменная
 * табличка «НОЧЬ 1 · МЕТЕЛЬ!» с луной, под ней — плашки «горит быстрее»
 * и «идёшь медленнее», ещё ниже — крупный таймер «ДО РАССВЕТА 1:59».
 * Табличка уезжает — таймер улетает в плашку времени HUD.
 * Утром — «РАССВЕТ · ДЕНЬ 2» с солнцем.
 *
 * Игра в это время идёт, поэтому табличка не в центре и не модальная:
 * выезжает сверху и уезжает обратно. Всё сделано твинами и частицами
 * игровой сцены — на паузе уведомление замирает вместе с игрой.
 */
export class PhaseBanner {
  private scene: Phaser.Scene;
  // Снежинки вихря.
  private swirl: Phaser.GameObjects.Particles.ParticleEmitter;
  // Текущая табличка (если показана): её убирают, когда она уехала.
  private banner?: Phaser.GameObjects.Container;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.swirl = scene.add
      .particles(0, 0, TEXTURES.snowflake, SWIRL)
      .setScrollFactor(0)
      .setDepth(BANNER_DEPTH);
  }

  // Наступила ночь номер day: вихрь, табличка с луной и плашками, под ними — крупный
  // таймер до рассвета (timer). onDone вызывается, когда табличка уехала
  // (сцена покажет модификаторы в HUD).
  showNight(day: number, timer: NightTimer, onDone: () => void): void {
    this.showTimer(timer);
    this.playSwirl();
    const banner = this.createBanner(TEXTURES.moonIcon, NIGHT_TITLE + ' ' + day + NIGHT_SUFFIX);
    banner.add([
      ...this.createChip(-CHIP_STEP / 2, TEXTURES.flame, FLAME_ICON_SCALE, FIRE_CHIP_TEXT),
      ...this.createChip(CHIP_STEP / 2, TEXTURES.leg, BOOT_ICON_SCALE, SPEED_CHIP_TEXT),
    ]);
    this.slide(banner, onDone);
  }

  // Наступило утро дня номер day: табличка с солнцем. onDone — когда табличка уехала.
  showMorning(day: number, onDone?: () => void): void {
    const banner = this.createBanner(TEXTURES.sunIcon, MORNING_TITLE + day);
    this.slide(banner, onDone);
  }

  // ===== Крупный таймер ночи =====

  // «ДО РАССВЕТА» и идущее время посередине экрана. Появляется вместе с табличкой,
  // висит, пока она висит, а когда она уезжает — сжимается и улетает в плашку времени HUD.
  private showTimer(timer: NightTimer): void {
    const label = this.scene.add
      .text(0, TIMER_LABEL_Y, TIMER_LABEL, {
        fontFamily: FONT_FAMILY,
        fontSize: '24px',
        fontStyle: 'bold',
        color: toCss(COLORS.titleAmber),
        stroke: toCss(COLORS.outline),
        strokeThickness: 5,
        resolution: 2,
      })
      .setOrigin(0.5);
    const digits = this.scene.add
      .text(0, 0, formatTime(timer.getTimeLeft()), {
        fontFamily: TITLE_FONT,
        fontSize: TIMER_FONT_SIZE + 'px',
        color: toCss(COLORS.hudText),
        stroke: toCss(COLORS.outline),
        strokeThickness: 10,
        resolution: 2,
      })
      .setOrigin(0.5);
    const box = this.scene.add
      .container(this.scene.scale.width / 2, TIMER_Y, [label, digits])
      .setScrollFactor(0, 0, true)
      .setDepth(TIMER_DEPTH)
      .setScale(TIMER_START_SCALE)
      .setAlpha(0);

    // Время идёт каждый кадр, пока таймер на экране.
    const tick = (): void => {
      digits.setText(formatTime(timer.getTimeLeft()));
    };
    this.scene.events.on(Phaser.Scenes.Events.UPDATE, tick);
    box.once(Phaser.GameObjects.Events.DESTROY, () => this.scene.events.off(Phaser.Scenes.Events.UPDATE, tick));

    // Подпись тает, когда таймер улетает: в плашке HUD её нет.
    this.scene.tweens.add({
      targets: label,
      alpha: 0,
      delay: BANNER_IN_TIME + BANNER_HOLD_TIME,
      duration: TIMER_FLY_TIME / 2,
    });
    this.scene.tweens.chain({
      targets: box,
      tweens: [
        { scale: 1, alpha: 1, duration: BANNER_IN_TIME, ease: 'Back.easeOut' },
        {
          x: timer.target.x,
          y: timer.target.y,
          scale: TIMER_END_SCALE,
          delay: BANNER_HOLD_TIME,
          duration: TIMER_FLY_TIME,
          ease: 'Cubic.easeIn',
        },
      ],
      onComplete: () => {
        box.destroy();
        timer.onLand();
      },
    });
  }

  // ===== Табличка =====

  // Каменная табличка с иконкой и «высеченной» надписью. Сначала — за верхним краем экрана.
  private createBanner(icon: string, title: string): Phaser.GameObjects.Container {
    // Прошлая табличка ещё не уехала — убираем её сразу вместе с её твинами:
    // иначе в конце старого твина сработал бы его onDone (ночные модификаторы утром).
    if (this.banner) this.scene.tweens.killTweensOf(this.banner);
    this.banner?.destroy();

    const banner = this.scene.add.container(this.scene.scale.width / 2, BANNER_HIDDEN_Y, [
      this.scene.add.image(0, 0, TEXTURES.stoneBanner),
      this.scene.add.image(ICON_X, ICON_Y, icon).setScale(ICON_SCALE),
      ...addCarvedTitle(this.scene, TITLE_X, TITLE_Y, title, TITLE_FONT_SIZE),
    ]);
    banner.setDepth(BANNER_DEPTH);
    this.banner = banner;
    return banner;
  }

  // Плашка под табличкой: иконка и надпись. x — середина плашки.
  private createChip(x: number, icon: string, iconScale: number, text: string): Phaser.GameObjects.GameObject[] {
    const plate = this.scene.add.image(x, CHIPS_Y, TEXTURES.hudPanel).setScale(CHIP_SCALE_X, CHIP_SCALE_Y);
    const image = this.scene.add.image(x + CHIP_ICON_X, CHIPS_Y, icon).setScale(iconScale);
    const label = this.scene.add
      .text(x + CHIP_TEXT_X, CHIPS_Y, text, {
        fontFamily: FONT_FAMILY,
        fontSize: '17px',
        fontStyle: 'bold',
        color: toCss(COLORS.hudText),
        stroke: toCss(COLORS.outline),
        strokeThickness: 4,
        resolution: 2,
      })
      .setOrigin(0, 0.5);
    return [plate, image, label];
  }

  // Табличка плавно выезжает сверху, висит и уезжает обратно, потом исчезает.
  private slide(banner: Phaser.GameObjects.Container, onDone?: () => void): void {
    // Все части таблички — в координатах экрана (не едут вместе с камерой).
    banner.setScrollFactor(0, 0, true);

    this.scene.tweens.chain({
      targets: banner,
      tweens: [
        { y: BANNER_Y, duration: BANNER_IN_TIME, ease: 'Cubic.easeOut' },
        { y: BANNER_HIDDEN_Y, duration: BANNER_OUT_TIME, ease: 'Cubic.easeIn', delay: BANNER_HOLD_TIME },
      ],
      onComplete: () => {
        banner.destroy();
        if (this.banner === banner) this.banner = undefined;
        onDone?.();
      },
    });
  }

  // ===== Снежный вихрь =====

  // Точка проносится по экрану слева направо волной и по пути сыплет снежинками.
  private playSwirl(): void {
    const { width, height } = this.scene.scale;
    this.scene.tweens.addCounter({
      from: 0,
      to: 1,
      duration: SWIRL_TIME,
      ease: 'Sine.easeInOut',
      onUpdate: (tween) => {
        const t = tween.getValue() ?? 0;
        const x = Phaser.Math.Linear(-SWIRL_MARGIN, width + SWIRL_MARGIN, t);
        const y = height * SWIRL_Y + Math.sin(t * Math.PI * 2 * SWIRL_WAVES) * SWIRL_AMPLITUDE;
        this.swirl.emitParticleAt(x, y, SWIRL_PER_FRAME);
      },
    });
  }
}
