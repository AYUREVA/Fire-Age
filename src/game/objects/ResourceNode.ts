import Phaser from 'phaser';
import { BUSH_REGROW_TIME, BUSH_STOCK } from '../settings';
import { TEXTURES } from '../textures';
import { Point, pop, setGlow, shakeAngle } from '../fx';

// ===== Внешний вид куста =====

// Тень лежит сразу под кустом, частицы летят перед ним.
const SHADOW_DEPTH_SHIFT = -0.5;
const PARTICLES_DEPTH_SHIFT = 1;
// Ширина тени под кустом и под пеньком.
const BUSH_SHADOW_WIDTH = 100;
const STUMP_SHADOW_WIDTH = 64;

// Куст редеет: с полным запасом его размер 1, с последней связкой — эта доля.
const MIN_BUSH_SCALE = 0.75;
// За сколько мс куст «худеет» после удара.
const THIN_OUT_TIME = 220;
// От удара куст сначала сплющивается (шире и ниже, доли размера), потом с отскоком «худеет».
const HIT_SQUASH_X = 1.1;
const HIT_SQUASH_Y = 0.86;
// Встряска при ударе: самый большой наклон (градусы) и длительность (мс).
const HIT_SHAKE_ANGLE = 9;
const HIT_SHAKE_TIME = 320;
// Качание на ветру: самый большой наклон (градусы) и скорость (радиан за мс).
// Пенёк не качается.
const BREEZE_ANGLE = 1.5;
const BREEZE_SPEED = 0.0022;
// На какой высоте над землёй из куста вылетает связка и сыплются частицы.
const LOOT_HEIGHT = 50;
// Отрастание: с какого размера куст вырастает и за сколько мс.
const REGROW_START_SCALE = 0.3;
const REGROW_ANIMATION_TIME = 600;

// Сколько снежинок и щепок вылетает при ударе.
const SNOW_BURST_COUNT = 7;
const CHIP_BURST_COUNT = 5;

// Снег на кусте лежит чуть впереди листвы.
const SNOW_LAYER_DEPTH_SHIFT = 0.1;
// Первый удар стряхивает снег: за сколько мс он слетает,
// на сколько пикселей сползает вниз и вбок и сколько снежинок взлетает.
const SNOW_SHAKE_OFF_TIME = 350;
const SNOW_SHAKE_OFF_DROP = 14;
const SNOW_SHAKE_OFF_SIDE = 6;
const SNOW_SHAKE_OFF_BURST = 16;

// Снег из куста: разлетается вверх и в стороны, медленно падает и тает.
// Углы в Phaser: 0° — вправо, 90° — вниз, 270° — вверх.
const SNOW_BURST: Phaser.Types.GameObjects.Particles.ParticleEmitterConfig = {
  emitting: false, // сам не сыплет — только по команде explode()
  speed: { min: 40, max: 120 },
  angle: { min: 200, max: 340 },
  gravityY: 160,
  lifespan: { min: 400, max: 700 },
  scale: { start: 1, end: 0.3 },
  alpha: { start: 1, end: 0 },
};

// Щепки: летят быстрее и выше, крутятся и падают тяжелее снега.
const CHIP_BURST: Phaser.Types.GameObjects.Particles.ParticleEmitterConfig = {
  emitting: false,
  speed: { min: 80, max: 170 },
  angle: { min: 220, max: 320 },
  gravityY: 500,
  lifespan: 600,
  rotate: { min: 0, max: 360 },
  alpha: { start: 1, end: 0 },
};

/**
 * Куст хвороста.
 *
 * Куст стоит присыпанный снегом. Первый удар стряхивает снег.
 * В кусте запас связок. Каждый удар забирает одну: куст трясётся,
 * сыплет снег и щепки и становится меньше. Запас кончился — куст
 * превращается в пенёк и через время отрастает снова.
 * Про вождя и стопку куст ничего не знает — удар наносит сцена.
 */
export class ResourceNode {
  // Где стоит куст (точка у земли).
  readonly x: number;
  readonly y: number;

  private scene: Phaser.Scene;
  // Сколько связок ещё можно добыть из куста.
  private stock = BUSH_STOCK;
  // Сколько мс осталось до отрастания. 0 — куст не пенёк и ничего не ждёт.
  private regrowTimeLeft = 0;
  // Лежит ли ещё снег на кусте. Первый удар его стряхивает.
  private isSnowy = true;
  // Время качания на ветру (мс). Начинается со случайного числа — кусты качаются вразнобой.
  private breezeTime = 0;
  // Сколько мс ещё длится встряска от удара (0 — куст не трясётся).
  private shakeTimeLeft = 0;

  private image: Phaser.GameObjects.Image;
  // Снег на кроне — отдельная картинка поверх куста.
  private snowLayer: Phaser.GameObjects.Image;
  private shadow: Phaser.GameObjects.Image;
  private snowBurst: Phaser.GameObjects.Particles.ParticleEmitter;
  private chipBurst: Phaser.GameObjects.Particles.ParticleEmitter;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.scene = scene;
    this.x = x;
    this.y = y;
    this.breezeTime = Phaser.Math.Between(0, 10000);

    this.shadow = scene.add.image(x, y, TEXTURES.shadow).setDepth(y + SHADOW_DEPTH_SHIFT);
    this.setShadowWidth(BUSH_SHADOW_WIDTH);
    // Точка опоры — середина нижнего края: куст стоит на земле и качается от корня.
    this.image = scene.add.image(x, y, TEXTURES.bush).setOrigin(0.5, 1).setDepth(y);
    this.snowLayer = scene.add
      .image(x, y, TEXTURES.bushSnow)
      .setOrigin(0.5, 1)
      .setDepth(y + SNOW_LAYER_DEPTH_SHIFT);

    const loot = this.getLootPoint();
    this.snowBurst = scene.add
      .particles(loot.x, loot.y, TEXTURES.snowflake, SNOW_BURST)
      .setDepth(y + PARTICLES_DEPTH_SHIFT);
    this.chipBurst = scene.add
      .particles(loot.x, loot.y, TEXTURES.chip, CHIP_BURST)
      .setDepth(y + PARTICLES_DEPTH_SHIFT);
  }

  // Есть ли в кусте хворост. У пенька — нет.
  hasStock(): boolean {
    return this.stock > 0;
  }

  // Свечение-обводка куста: сюда показывает подсказка обучения.
  setHintGlow(isOn: boolean): void {
    setGlow(this.scene, this.image, isOn);
  }

  // Точка, из которой вылетает связка хвороста.
  getLootPoint(): Point {
    return { x: this.x, y: this.y - LOOT_HEIGHT };
  }

  // Удар дубиной: −1 связка, куст трясётся и сыплет снег и щепки.
  hit(): void {
    if (!this.hasStock()) return;

    this.stock -= 1;
    if (this.isSnowy) {
      this.shakeOffSnow();
    }
    this.shakeTimeLeft = HIT_SHAKE_TIME;
    this.snowBurst.explode(SNOW_BURST_COUNT);
    this.chipBurst.explode(CHIP_BURST_COUNT);

    if (this.stock === 0) {
      this.becomeStump();
    } else {
      this.thinOut();
    }
  }

  // Вызывается сценой каждый кадр: качает куст и отсчитывает время до отрастания.
  update(delta: number): void {
    this.updateSway(delta);
    if (this.regrowTimeLeft <= 0) return;

    this.regrowTimeLeft -= delta;
    if (this.regrowTimeLeft <= 0) {
      this.regrow();
    }
  }

  // Наклон куста: лёгкое качание на ветру плюс встряска от удара.
  // Снег на кроне наклоняется вместе с кустом.
  private updateSway(delta: number): void {
    this.breezeTime += delta;
    this.shakeTimeLeft = Math.max(0, this.shakeTimeLeft - delta);
    const breeze = this.hasStock() ? Math.sin(this.breezeTime * BREEZE_SPEED) * BREEZE_ANGLE : 0;
    // Доля прошедшей встряски: 0 — только что ударили, 1 — встряска кончилась.
    const shakeShare = 1 - this.shakeTimeLeft / HIT_SHAKE_TIME;
    const angle = breeze + shakeAngle(shakeShare, HIT_SHAKE_ANGLE);
    this.image.setAngle(angle);
    this.snowLayer.setAngle(angle);
  }

  // Снег слетает с куста: сползает вниз и вбок и тает, вверх взлетают снежинки.
  private shakeOffSnow(): void {
    this.isSnowy = false;
    this.snowBurst.explode(SNOW_SHAKE_OFF_BURST);
    this.scene.tweens.add({
      targets: this.snowLayer,
      y: this.y + SNOW_SHAKE_OFF_DROP,
      x: this.x + SNOW_SHAKE_OFF_SIDE,
      alpha: 0,
      duration: SNOW_SHAKE_OFF_TIME,
      ease: 'Cubic.easeIn',
      onComplete: () => this.snowLayer.setVisible(false),
    });
  }

  // Куст редеет: чем меньше в нём хвороста, тем он меньше.
  private thinOut(): void {
    // stock / BUSH_STOCK — доля оставшегося хвороста (от 1 до почти 0).
    const scale = Phaser.Math.Linear(MIN_BUSH_SCALE, 1, this.stock / BUSH_STOCK);
    // Убираем прошлые твины размера, чтобы они не спорили с новым.
    this.scene.tweens.killTweensOf(this.image);
    this.image.setScale(this.image.scaleX * HIT_SQUASH_X, this.image.scaleY * HIT_SQUASH_Y);
    // Ширину и высоту ведём отдельно: после сплющивания они разные.
    this.scene.tweens.add({
      targets: this.image,
      scaleX: scale,
      scaleY: scale,
      duration: THIN_OUT_TIME,
      ease: 'Back.easeOut',
    });
  }

  // Хворост кончился: на месте куста — пенёк, запускаем отсчёт до отрастания.
  private becomeStump(): void {
    this.scene.tweens.killTweensOf(this.image);
    this.image.setTexture(TEXTURES.stump);
    pop(this.scene, this.image);
    this.setShadowWidth(STUMP_SHADOW_WIDTH);
    this.regrowTimeLeft = BUSH_REGROW_TIME;
  }

  // Пенёк снова становится кустом: вырастает из маленького с лёгким отскоком.
  private regrow(): void {
    this.stock = BUSH_STOCK;
    this.regrowTimeLeft = 0;

    this.image.setTexture(TEXTURES.bush).setScale(REGROW_START_SCALE);
    // Куст вырастает снова заснеженным.
    this.isSnowy = true;
    this.snowLayer.setPosition(this.x, this.y).setAlpha(1).setVisible(true).setScale(REGROW_START_SCALE);
    this.setShadowWidth(BUSH_SHADOW_WIDTH);
    this.scene.tweens.add({
      targets: [this.image, this.snowLayer],
      scale: 1,
      duration: REGROW_ANIMATION_TIME,
      ease: 'Back.easeOut',
    });
    // Немного снега взлетает — куст «вынырнул» из сугроба.
    this.snowBurst.explode(SNOW_BURST_COUNT);
  }

  // Растягивает текстуру тени до нужной ширины.
  private setShadowWidth(width: number): void {
    this.shadow.setScale(width / this.shadow.width);
  }
}
