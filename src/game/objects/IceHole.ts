import Phaser from 'phaser';
import { ICE_HOLE_RADIUS } from '../settings';
import { TEXTURES } from '../textures';
import { ITEMS } from '../items';
import { pop, Point } from '../fx';

// ===== Прорубь =====

// Прорубь лежит плоско на земле, на одном слое с площадками куч (ItemPile.ts).
const FLAT_ON_GROUND_DEPTH = -100;
// Прозрачность и размер проруби: обычно и когда вождь рыбачит.
const IDLE_ALPHA = 0.9;
const ACTIVE_ALPHA = 1;
const ACTIVE_SCALE = 1.06;
// За сколько мс прорубь подсвечивается или гаснет.
const HIGHLIGHT_TIME = 160;
// Бледная рыбка над водой: что здесь добывают. Она чуть покачивается.
const ICON_ALPHA = 0.45;
const ICON_SCALE = 1.1;
const ICON_BOB_HEIGHT = 4;
const ICON_BOB_TIME = 900;
// Середина воды — на столько пикселей ниже середины картинки (вода в картинке чуть ниже).
const WATER_OFFSET_Y = 4;

// ===== Всплеск =====

// Рыба клюнула — по воде расходится круг: растёт от и до, тает за столько мс.
const SPLASH_START_SCALE = 0.3;
const SPLASH_END_SCALE = 1.1;
const SPLASH_TIME = 450;
// Сила «пружинки» проруби при поклёвке (доля обычной, см. pop() в fx.ts).
const SPLASH_POP = 0.3;

/**
 * Прорубь: тёмная вода в ледяном ободке. Встал рядом — рыба через интервал
 * сама летит на стопку (раздел 4 плана, уровень 4).
 *
 * Прорубь только хранит таймер поклёвки и показывает себя: подсвечивается,
 * пока вождь рядом, и плещет при поклёвке. Когда клюёт и куда летит рыба,
 * решает systems/Gathering.ts. Про вождя и рюкзак прорубь ничего не знает.
 */
export class IceHole {
  // Середина проруби.
  readonly x: number;
  readonly y: number;
  // Сколько мс вождь уже рыбачит с прошлой поклёвки. Меняет systems/Gathering.ts.
  fishTimer = 0;

  private scene: Phaser.Scene;
  // Картинка проруби.
  private image: Phaser.GameObjects.Image;
  // Круг на воде при поклёвке.
  private ripple: Phaser.GameObjects.Image;
  // Подсвечена ли прорубь сейчас (вождь рядом).
  private isHighlighted = false;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.scene = scene;
    this.x = x;
    this.y = y;

    this.image = scene.add.image(x, y, TEXTURES.iceHole).setDepth(FLAT_ON_GROUND_DEPTH).setAlpha(IDLE_ALPHA);
    this.ripple = scene.add
      .image(x, y + WATER_OFFSET_Y, TEXTURES.ring)
      .setDepth(FLAT_ON_GROUND_DEPTH + 1)
      .setAlpha(0);
    // Рыбка над водой покачивается вверх-вниз: здесь ловят рыбу.
    const icon = scene.add
      .image(x, y + WATER_OFFSET_Y, ITEMS.rawFish.texture)
      .setScale(ICON_SCALE)
      .setAlpha(ICON_ALPHA)
      .setDepth(FLAT_ON_GROUND_DEPTH + 1);
    scene.tweens.add({
      targets: icon,
      y: icon.y - ICON_BOB_HEIGHT,
      duration: ICON_BOB_TIME,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  // Стоит ли точка (x, y) так близко к проруби, что можно рыбачить.
  contains(x: number, y: number): boolean {
    return Phaser.Math.Distance.Between(x, y, this.x, this.y) <= ICE_HOLE_RADIUS;
  }

  // Откуда вылетает пойманная рыба — из середины воды.
  getLootPoint(): Point {
    return { x: this.x, y: this.y + WATER_OFFSET_Y };
  }

  // Подсветка, пока вождь рыбачит. Сцена вызывает это каждый кадр.
  setHighlighted(isOn: boolean): void {
    // Твин запускаем, только когда подсветка меняется, а не каждый кадр.
    if (this.isHighlighted === isOn) return;
    this.isHighlighted = isOn;

    this.scene.tweens.add({
      targets: this.image,
      alpha: isOn ? ACTIVE_ALPHA : IDLE_ALPHA,
      scale: isOn ? ACTIVE_SCALE : 1,
      duration: HIGHLIGHT_TIME,
      ease: 'Sine.easeOut',
    });
  }

  // Поклёвка: по воде расходится круг, прорубь чуть пружинит.
  splash(): void {
    this.scene.tweens.killTweensOf(this.ripple);
    this.ripple.setScale(SPLASH_START_SCALE).setAlpha(1);
    this.scene.tweens.add({
      targets: this.ripple,
      scale: SPLASH_END_SCALE,
      alpha: 0,
      duration: SPLASH_TIME,
      ease: 'Sine.easeOut',
    });
    pop(this.scene, this.image, this.isHighlighted ? ACTIVE_SCALE : 1, SPLASH_POP);
  }
}
