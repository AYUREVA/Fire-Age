import Phaser from 'phaser';
import { COLORS, toCss } from '../palette';
import { ACHIEVEMENT_PLATE_SIZE, FONT_FAMILY, TEXTURES, TITLE_FONT } from '../textures';
import { pop } from '../fx';
import { SOUNDS, SOUND_VOLUMES, playSound } from '../sounds';
import { CARVED_TEXT_SHADOW } from './StoneTablet';

// ===== Раскладка (пиксели экрана) =====

// Плашка поверх таблички итогов.
const TOAST_DEPTH = 100;
// Плашка стоит у правого края экрана с таким отступом, верх — на такой высоте.
const MARGIN = 16;
const TOP = 16;
// Внутри плашки (от её середины): медальон слева, заголовок и название правее.
const MEDAL_X = -124;
const TEXT_X = -90;
const TITLE_Y = -14;
const NAME_Y = 14;

// ===== Анимация =====

// Плашка выезжает из-за правого края за столько мс, висит и уезжает обратно.
const SLIDE_IN_TIME = 400;
const HOLD_TIME = 2400;
const SLIDE_OUT_TIME = 300;
// Первая плашка выезжает, когда звёзды на итогах уже «впечатались».
const FIRST_DELAY = 1500;

// Надпись (раздел 5 плана).
const TOAST_TITLE = 'НОВОЕ ДОСТИЖЕНИЕ';

/**
 * Плашка «Новое достижение» (с 0.9): медальон, «НОВОЕ ДОСТИЖЕНИЕ» и название.
 * Сбоку выезжает поверх таблички итогов, висит и уезжает. Если достижений
 * несколько — выезжают по очереди.
 *
 * Какие достижения новые, решает GameScene (условия — data/achievements.ts,
 * полученные хранит save.ts). Плашка только показывает названия.
 */
export class AchievementToast {
  private scene: Phaser.Scene;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  // Показать по очереди плашки с названиями names.
  showAll(names: string[]): void {
    names.forEach((name, index) => {
      const delay = FIRST_DELAY + index * (SLIDE_IN_TIME + HOLD_TIME + SLIDE_OUT_TIME);
      this.scene.time.delayedCall(delay, () => this.show(name));
    });
  }

  // Одна плашка: выезжает справа, медальон «пружинит» со звоном, плашка висит и уезжает.
  private show(name: string): void {
    const { width } = this.scene.scale;
    const half = ACHIEVEMENT_PLATE_SIZE.w / 2;
    const medal = this.scene.add.image(MEDAL_X, 0, TEXTURES.achievementMedal);
    const toast = this.scene.add
      .container(width + half, TOP + ACHIEVEMENT_PLATE_SIZE.h / 2, [
        this.scene.add.image(0, 0, TEXTURES.achievementPlate),
        medal,
        this.addText(TITLE_Y, TOAST_TITLE, 16, COLORS.titleAmber, FONT_FAMILY),
        this.addText(NAME_Y, name, 20, COLORS.hudText, TITLE_FONT),
      ])
      .setDepth(TOAST_DEPTH);

    this.scene.tweens.chain({
      targets: toast,
      tweens: [
        {
          x: width - MARGIN - half,
          duration: SLIDE_IN_TIME,
          ease: 'Back.easeOut',
          onComplete: () => {
            pop(this.scene, medal);
            playSound(this.scene, SOUNDS.star, SOUND_VOLUMES.star);
          },
        },
        { x: width + half, duration: SLIDE_OUT_TIME, ease: 'Cubic.easeIn', delay: HOLD_TIME },
      ],
      onComplete: () => toast.destroy(),
    });
  }

  // Надпись на плашке: левый край — TEXT_X, середина по высоте — y.
  private addText(y: number, text: string, fontSize: number, color: number, fontFamily: string): Phaser.GameObjects.Text {
    return this.scene.add
      .text(TEXT_X, y, text, {
        fontFamily,
        fontSize: fontSize + 'px',
        fontStyle: fontFamily === FONT_FAMILY ? 'bold' : 'normal',
        color: toCss(color),
        stroke: toCss(COLORS.outline),
        strokeThickness: 4,
        shadow: CARVED_TEXT_SHADOW,
        resolution: 2,
      })
      .setOrigin(0, 0.5);
  }
}
