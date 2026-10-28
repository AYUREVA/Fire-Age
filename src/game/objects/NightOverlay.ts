import Phaser from 'phaser';
import { SUNSET_TIME, WORLD_HEIGHT, WORLD_WIDTH } from '../settings';
import { COLORS } from '../palette';
import { TEXTURES } from '../textures';

// ===== Слои =====

// Розовый закат и ночная тьма — выше летящих связок (10000) и «+1» (11000),
// но ниже падающего снега (12000, GameScene) и HUD (20000).
const SUNSET_DEPTH = 11400;
const DARKNESS_DEPTH = 11500;
// Метель — поверх обычного снега.
const BLIZZARD_DEPTH = 12100;

// ===== Закат и ночь =====

// Насколько розовеет экран на закате (0 — никак, 1 — совсем розовый).
const SUNSET_ALPHA = 0.22;
// Насколько темно ночью вдали от костра.
const NIGHT_ALPHA = 0.62;
// За сколько мс наступает темнота и за сколько уходит утром.
const NIGHT_FADE_TIME = 2500;
const DAY_FADE_TIME = 2500;

// ===== Светлое пятно у костра =====

// Середина пятна — на костре. Ширина пятна при полном жаре (вся картинка,
// светлая середина — примерно треть): светло у костра и куч, а край света
// достаёт до стола под костром — там полутьма.
const LIGHT_WIDTH = 1600;
// Пятно чуть сплюснуто, как круг света на снегу: мы смотрим сверху под углом.
const LIGHT_FLATTEN = 0.85;
// При слабом жаре пятно сжимается до этой доли — стол уходит в темноту.
const LIGHT_MIN_SIZE = 0.45;

// ===== Метель =====

// Снег ночью гуще и летит косо — ветер дует справа налево.
// Снежинок не больше 110 сразу: игра должна идти плавно на слабом ноутбуке.
const BLIZZARD: Phaser.Types.GameObjects.Particles.ParticleEmitterConfig = {
  speedX: { min: -320, max: -200 },
  speedY: { min: 90, max: 170 },
  lifespan: { min: 1800, max: 2600 },
  scale: { min: 0.4, max: 0.95 },
  alpha: { values: [0, 0.95, 0.95, 0] }, // появляется, летит, тает
  frequency: 20, // новая снежинка раз в 20 мс
  maxAliveParticles: 110,
  emitting: false, // включается ночью
};
// Снежинки рождаются в прямоугольнике размером с экран, сдвинутом вправо:
// ветер сносит их влево, и они пролетают через весь экран.
const BLIZZARD_SPAWN_SHIFT_X = 300;

/**
 * Вид ночи: розовый закат, тьма со светлым пятном у костра и метель.
 *
 * Только оформление — на правила игры не влияет (ночные правила —
 * таблица PHASES в settings.ts). Про костёр ничего не знает: сцена каждый
 * кадр сообщает, где огонь и сколько у него жара. Переходы — твины сцены,
 * поэтому на паузе они замирают.
 */
export class NightOverlay {
  private scene: Phaser.Scene;
  // Розовая пелена заката на весь экран.
  private sunset: Phaser.GameObjects.Rectangle;
  // Тьма: светлое пятно и четыре тёмных прямоугольника вокруг него до краёв мира.
  // Всё в одном контейнере — прозрачность общая.
  private darkness: Phaser.GameObjects.Container;
  private light: Phaser.GameObjects.Image;
  private shadeLeft: Phaser.GameObjects.Rectangle;
  private shadeRight: Phaser.GameObjects.Rectangle;
  private shadeTop: Phaser.GameObjects.Rectangle;
  private shadeBottom: Phaser.GameObjects.Rectangle;
  // Метель: включается ночью, выключается утром.
  private blizzard: Phaser.GameObjects.Particles.ParticleEmitter;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    const { width, height } = scene.scale;

    // Закат — в координатах экрана, сначала невидим.
    this.sunset = scene.add
      .rectangle(0, 0, width, height, COLORS.sunsetGlow)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(SUNSET_DEPTH)
      .setAlpha(0);

    // Тьма — в координатах мира: пятно стоит на костре, прямоугольники закрывают остальное.
    this.light = scene.add.image(0, 0, TEXTURES.nightLight).setTint(COLORS.nightShade);
    this.shadeLeft = this.createShade();
    this.shadeRight = this.createShade();
    this.shadeTop = this.createShade();
    this.shadeBottom = this.createShade();
    this.darkness = scene.add
      .container(0, 0, [this.light, this.shadeLeft, this.shadeRight, this.shadeTop, this.shadeBottom])
      .setDepth(DARKNESS_DEPTH)
      .setAlpha(0);

    this.blizzard = this.createBlizzard();

    // Экран поменял размер (повернули телефон) — закат снова на весь экран.
    // Подписка на событие всей игры: при выключении сцены её снимаем.
    scene.scale.on(Phaser.Scale.Events.RESIZE, this.layout, this);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      scene.scale.off(Phaser.Scale.Events.RESIZE, this.layout, this);
    });
  }

  // Розовая пелена заката — размером с текущий экран.
  private layout(): void {
    this.sunset.setSize(this.scene.scale.width, this.scene.scale.height);
  }

  // Закат: экран за SUNSET_TIME плавно розовеет.
  startSunset(): void {
    this.fade(this.sunset, SUNSET_ALPHA, SUNSET_TIME);
  }

  // Ночь: закат тает, наступает тьма, начинается метель.
  startNight(): void {
    this.fade(this.sunset, 0, NIGHT_FADE_TIME);
    this.fade(this.darkness, NIGHT_ALPHA, NIGHT_FADE_TIME);
    this.blizzard.start();
  }

  // Утро: тьма уходит, метель стихает (уже летящие снежинки долетают).
  startDay(): void {
    this.fade(this.sunset, 0, DAY_FADE_TIME);
    this.fade(this.darkness, 0, DAY_FADE_TIME);
    this.blizzard.stop();
  }

  // Вызывается сценой каждый кадр: светлое пятно стоит на огне (x, y)
  // и тем больше, чем больше жара (heatShare: 0 — угли, 1 — полный костёр).
  update(x: number, y: number, heatShare: number): void {
    // Днём тьмы не видно — пятно и прямоугольники можно не двигать.
    if (this.darkness.alpha === 0) return;

    // Числа округляем до целых пикселей: тогда между пятном и прямоугольниками нет щелей.
    const lightWidth = Math.round(LIGHT_WIDTH * Phaser.Math.Linear(LIGHT_MIN_SIZE, 1, heatShare) / 2) * 2;
    const lightHeight = Math.round(lightWidth * LIGHT_FLATTEN / 2) * 2;
    const lightX = Math.round(x);
    const centerY = Math.round(y);
    this.light.setPosition(lightX, centerY).setDisplaySize(lightWidth, lightHeight);

    // Края пятна. Прямоугольники закрывают всё, что вокруг, до краёв мира.
    const left = lightX - lightWidth / 2;
    const right = lightX + lightWidth / 2;
    const top = centerY - lightHeight / 2;
    const bottom = centerY + lightHeight / 2;
    this.placeShade(this.shadeLeft, 0, 0, left, WORLD_HEIGHT);
    this.placeShade(this.shadeRight, right, 0, WORLD_WIDTH - right, WORLD_HEIGHT);
    this.placeShade(this.shadeTop, left, 0, lightWidth, top);
    this.placeShade(this.shadeBottom, left, bottom, lightWidth, WORLD_HEIGHT - bottom);
  }

  // ===== Внутреннее =====

  // Тёмный прямоугольник тьмы. Его место задаёт update().
  private createShade(): Phaser.GameObjects.Rectangle {
    return this.scene.add.rectangle(0, 0, 1, 1, COLORS.nightShade).setOrigin(0, 0);
  }

  // Поставить прямоугольник тьмы: левый верхний угол (x, y), ширина и высота.
  // Если пятно у края мира, размер может выйти отрицательным — тогда 0.
  private placeShade(shade: Phaser.GameObjects.Rectangle, x: number, y: number, width: number, height: number): void {
    shade.setPosition(x, y).setSize(Math.max(0, width), Math.max(0, height));
  }

  // Плавно поменять прозрачность объекта. Прошлый переход этого объекта отменяется.
  private fade(target: Phaser.GameObjects.Rectangle | Phaser.GameObjects.Container, alpha: number, duration: number): void {
    this.scene.tweens.killTweensOf(target);
    this.scene.tweens.add({ targets: target, alpha, duration, ease: 'Sine.easeInOut' });
  }

  // Метель: снежинки рождаются в видимой части мира и правее неё
  // (прямоугольник едет вместе с камерой, как обычный снег в GameScene).
  // Размер экрана берём каждый раз заново: телефон могли повернуть.
  private createBlizzard(): Phaser.GameObjects.Particles.ParticleEmitter {
    const scale = this.scene.scale;
    return this.scene.add
      .particles(0, 0, TEXTURES.snowflake, {
        ...BLIZZARD,
        emitZone: {
          type: 'random',
          source: {
            getRandomPoint: (point) => {
              point.x = Phaser.Math.Between(0, scale.width + BLIZZARD_SPAWN_SHIFT_X);
              point.y = Phaser.Math.Between(-scale.height / 2, scale.height);
            },
          },
        },
        follow: this.scene.cameras.main.worldView,
      })
      .setDepth(BLIZZARD_DEPTH);
  }
}
