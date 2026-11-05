import Phaser from 'phaser';
import { COLORS, toCss } from '../palette';
import { FONT_FAMILY, TEXTURES } from '../textures';
import { CARVED_TEXT_SHADOW, addCarvedTitle } from './StoneTablet';

// Киношные экраны — поверх всего, и HUD тоже (на время сценки HUD прячется).
const CINEMA_DEPTH = 21000;
// Чёрные полосы сверху и снизу: высота, цвет, за сколько мс выезжают и уезжают.
const BAR_HEIGHT = 80;
const BAR_COLOR = 0x0a0c12;
const BAR_TIME = 500;
// Табличка с именем: где её середина (от низа экрана), откуда выезжает (за левым краем),
// за сколько мс выезжает и уезжает.
const NAME_FROM_BOTTOM = 190;
// Табличка с именем чуть меньше обычной — над ней должен поместиться мамонт.
const NAME_SCALE = 0.8;
const NAME_HIDDEN_SHIFT = 420;
const NAME_IN_TIME = 450;
const NAME_OUT_TIME = 350;
// Надписи на табличке: имя (высечено), прозвище под ним, плашка «Победи его до заката» ниже таблички.
const NAME_TITLE_Y = 0;
const NAME_TITLE_SIZE = 52;
const NAME_SUB_Y = 46;
const NAME_CHIP_Y = 112;
// Печать «ПОВЕРЖЕН!»: середина выше середины экрана, вылетает из такого размера.
const STAMP_SHIFT_Y = -60;
const STAMP_TITLE_Y = 14;
const STAMP_TITLE_SIZE = 56;
const STAMP_START_SCALE = 2.2;
const STAMP_TIME = 300;
// Звёзды разлетаются от печати.
const STAMP_STARS = 28;
const STARS: Phaser.Types.GameObjects.Particles.ParticleEmitterConfig = {
  emitting: false,
  speed: { min: 220, max: 520 },
  gravityY: 600,
  lifespan: 1500,
  scale: { start: 0.7, end: 0.25 },
  rotate: { start: 0, end: 360 },
  tint: COLORS.starOn,
};
// С деревьев сыплется снег: снежинки вылетают вдоль верхнего края экрана через столько пикселей.
const TREE_SNOW_STEP = 24;
const TREE_SNOW_PER_POINT = 2;
const TREE_SNOW: Phaser.Types.GameObjects.Particles.ParticleEmitterConfig = {
  speedX: { min: -30, max: 30 },
  speedY: { min: 60, max: 220 },
  gravityY: 260,
  lifespan: { min: 1200, max: 2000 },
  scale: { start: 1.6, end: 0.6 },
  alpha: { start: 1, end: 0 },
  emitting: false,
};

// Надписи.
const NAME_TITLE = 'МАМОНТ';
const NAME_SUB = 'ГРОЗА ЛЕДНИКА';
const NAME_CHIP = 'Победи его до заката';
const STAMP_TITLE = 'ПОВЕРЖЕН!';

/**
 * Киношные экраны боя с мамонтом (с 0.9.1): чёрные полосы и табличка
 * «МАМОНТ / ГРОЗА ЛЕДНИКА» на выходе босса, снег с деревьев, печать
 * «ПОВЕРЖЕН!» на добивании. Всё в координатах экрана.
 *
 * Только показывает. Когда что показать (и что делают камера и мамонт),
 * решает GameScene.
 */
export class BossCinema {
  private scene: Phaser.Scene;
  // Чёрные полосы сверху и снизу.
  private bars: Phaser.GameObjects.Rectangle[];
  // Табличка с именем (пока видна).
  private namePlate?: Phaser.GameObjects.Container;
  // Снег с деревьев и звёзды от печати.
  private treeSnow: Phaser.GameObjects.Particles.ParticleEmitter;
  private stars: Phaser.GameObjects.Particles.ParticleEmitter;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    const { width, height } = scene.scale;
    this.bars = [0, 1].map((i) =>
      scene.add
        .rectangle(0, i ? height : 0, width, BAR_HEIGHT, BAR_COLOR)
        .setOrigin(0, i ? 0 : 1)
        .setScrollFactor(0)
        .setDepth(CINEMA_DEPTH),
    );
    this.treeSnow = scene.add.particles(0, 0, TEXTURES.snowflake, TREE_SNOW).setScrollFactor(0).setDepth(CINEMA_DEPTH);
    this.stars = scene.add.particles(0, 0, TEXTURES.star, STARS).setScrollFactor(0).setDepth(CINEMA_DEPTH + 2);
  }

  // Чёрные полосы выезжают (isOn) или уезжают за край экрана.
  setBars(isOn: boolean): void {
    const { width, height } = this.scene.scale;
    this.bars.forEach((bar, i) => {
      bar.setSize(width, BAR_HEIGHT);
      const shown = i ? height - BAR_HEIGHT : BAR_HEIGHT;
      const hidden = i ? height : 0;
      this.scene.tweens.add({ targets: bar, y: isOn ? shown : hidden, duration: BAR_TIME, ease: 'Cubic.easeOut' });
    });
  }

  // С деревьев сыплется снег — по всему верхнему краю экрана.
  shakeSnowFromTrees(): void {
    for (let x = 0; x <= this.scene.scale.width; x += TREE_SNOW_STEP) {
      this.treeSnow.emitParticleAt(x, 0, TREE_SNOW_PER_POINT);
    }
  }

  // Табличка «МАМОНТ / ГРОЗА ЛЕДНИКА» и плашка «Победи его до заката» выезжают слева.
  showName(): void {
    const { width, height } = this.scene.scale;
    const x = width / 2;
    const plate = this.scene.add.container(x - width / 2 - NAME_HIDDEN_SHIFT, height - NAME_FROM_BOTTOM, [
      this.scene.add.image(0, 0, TEXTURES.stoneBanner),
      ...addCarvedTitle(this.scene, 0, NAME_TITLE_Y, NAME_TITLE, NAME_TITLE_SIZE),
      this.label(0, NAME_SUB_Y, NAME_SUB, '20px', COLORS.ice),
      this.scene.add.image(0, NAME_CHIP_Y, TEXTURES.bossChip),
      this.label(0, NAME_CHIP_Y, NAME_CHIP, '17px', COLORS.hudText),
    ]);
    plate.setScrollFactor(0, 0, true).setDepth(CINEMA_DEPTH + 1).setScale(NAME_SCALE);
    this.namePlate = plate;
    this.scene.tweens.add({ targets: plate, x, duration: NAME_IN_TIME, ease: 'Back.easeOut' });
  }

  // Табличка с именем уезжает вправо и исчезает.
  hideName(): void {
    const plate = this.namePlate;
    if (!plate) return;
    this.namePlate = undefined;
    this.scene.tweens.add({
      targets: plate,
      x: this.scene.scale.width + NAME_HIDDEN_SHIFT,
      duration: NAME_OUT_TIME,
      ease: 'Sine.easeIn',
      onComplete: () => plate.destroy(),
    });
  }

  // Печать «ПОВЕРЖЕН!»: каменная табличка падает из большого размера, разлетаются звёзды.
  // Висит до итогов (итоги закрывают сцену).
  showStamp(): void {
    const { width, height } = this.scene.scale;
    const x = width / 2;
    const y = height / 2 + STAMP_SHIFT_Y;
    const stamp = this.scene.add.container(x, y, [
      this.scene.add.image(0, 0, TEXTURES.stoneBanner),
      ...addCarvedTitle(this.scene, 0, STAMP_TITLE_Y, STAMP_TITLE, STAMP_TITLE_SIZE),
    ]);
    stamp.setScrollFactor(0, 0, true).setDepth(CINEMA_DEPTH + 1).setScale(STAMP_START_SCALE).setAlpha(0);
    this.scene.tweens.add({ targets: stamp, scale: 1, alpha: 1, duration: STAMP_TIME, ease: 'Back.easeOut' });
    this.stars.explode(STAMP_STARS, x, y);
  }

  private label(x: number, y: number, text: string, fontSize: string, color: number): Phaser.GameObjects.Text {
    return this.scene.add
      .text(x, y, text, {
        fontFamily: FONT_FAMILY,
        fontSize,
        fontStyle: 'bold',
        color: toCss(color),
        stroke: toCss(COLORS.outline),
        strokeThickness: 4,
        shadow: CARVED_TEXT_SHADOW,
        resolution: 2,
      })
      .setOrigin(0.5);
  }
}
