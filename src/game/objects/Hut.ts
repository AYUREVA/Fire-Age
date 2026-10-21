import Phaser from 'phaser';
import { TEXTURES } from '../textures';

// ===== Вид =====

// Тень под хижиной: ширина и глубина (сразу под хижиной).
const SHADOW_WIDTH = 150;
const SHADOW_DEPTH_SHIFT = -0.5;
// Постройка: хижина вырастает из этого размера за столько мс с лёгким отскоком.
const BUILD_START_SCALE = 0.3;
const BUILD_TIME = 500;
// Из-под хижины взлетает снег.
const BUILD_SNOW_COUNT = 24;
const BUILD_SNOW: Phaser.Types.GameObjects.Particles.ParticleEmitterConfig = {
  emitting: false,
  speed: { min: 60, max: 180 },
  angle: { min: 190, max: 350 },
  gravityY: 220,
  lifespan: { min: 500, max: 900 },
  scale: { start: 1.6, end: 0.3 },
  alpha: { start: 1, end: 0 },
};
// Снег вылетает чуть выше земли и рисуется перед хижиной.
const SNOW_OFFSET_Y = -20;
const SNOW_DEPTH_SHIFT = 1;

/**
 * Хижина-шалаш. Стоит на месте своей точки покупки и сначала не видна.
 * Купили — хижина вырастает из сугроба. Каждая построенная хижина
 * ускоряет приход путников (это считает systems/Serving.ts).
 * Про путников и точку покупки хижина ничего не знает.
 */
export class Hut {
  // Где стоит хижина (середина нижнего края).
  readonly x: number;
  readonly y: number;

  private scene: Phaser.Scene;
  // Построена ли хижина.
  private isBuiltNow = false;
  private image: Phaser.GameObjects.Image;
  private shadow: Phaser.GameObjects.Image;
  private snow: Phaser.GameObjects.Particles.ParticleEmitter;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.scene = scene;
    this.x = x;
    this.y = y;

    this.shadow = scene.add.image(x, y, TEXTURES.shadow).setDepth(y + SHADOW_DEPTH_SHIFT).setVisible(false);
    this.shadow.setScale(SHADOW_WIDTH / this.shadow.width);
    this.image = scene.add.image(x, y, TEXTURES.hut).setOrigin(0.5, 1).setDepth(y).setVisible(false);
    this.snow = scene.add
      .particles(x, y + SNOW_OFFSET_Y, TEXTURES.snowflake, BUILD_SNOW)
      .setDepth(y + SNOW_DEPTH_SHIFT);
  }

  // Построена ли хижина.
  isBuilt(): boolean {
    return this.isBuiltNow;
  }

  // Построить: хижина вырастает из сугроба, взлетает снег.
  build(): void {
    if (this.isBuiltNow) return;
    this.isBuiltNow = true;

    this.shadow.setVisible(true);
    this.image.setVisible(true).setScale(BUILD_START_SCALE);
    this.scene.tweens.add({ targets: this.image, scale: 1, duration: BUILD_TIME, ease: 'Back.easeOut' });
    this.snow.explode(BUILD_SNOW_COUNT);
  }
}
