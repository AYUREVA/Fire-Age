import Phaser from 'phaser';
import { COLORS, toCss } from '../palette';
import { FONT_FAMILY, TEXTURES } from '../textures';
import { pop } from '../fx';

// HUD рисуется поверх всего мира (джойстик — на том же уровне, см. Player.ts).
const HUD_DEPTH = 20000;
// Отступ плашки от левого верхнего угла экрана.
const PANEL_MARGIN = 16;
// Иконка связки на плашке: середина иконки от левого края плашки и её размер.
const ICON_X = 40;
const ICON_SCALE = 0.95;
// Где начинается число (от левого края плашки).
const COUNT_X = 76;
// Подсказка по управлению — у нижнего края экрана.
const HINT_MARGIN_BOTTOM = 12;
const HINT_TEXT = 'WASD, стрелки или зажми и веди мышь / палец — идти\nВстань у куста — рубить, у поленницы — сдать хворост';

/**
 * Интерфейс поверх игры: плашка «сколько хвороста сдано» и подсказка.
 * Всё в координатах экрана (scrollFactor 0) — не двигается вместе с камерой.
 */
export class Hud {
  private scene: Phaser.Scene;
  // Иконка связки и число сданного хвороста на плашке.
  private icon: Phaser.GameObjects.Image;
  private countText: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;

    const panel = scene.add.image(PANEL_MARGIN, PANEL_MARGIN, TEXTURES.hudPanel).setOrigin(0, 0);
    const panelCenterY = PANEL_MARGIN + panel.height / 2;

    this.icon = scene.add.image(PANEL_MARGIN + ICON_X, panelCenterY, TEXTURES.bundle).setScale(ICON_SCALE);

    this.countText = scene.add
      .text(PANEL_MARGIN + COUNT_X, panelCenterY, '0', {
        fontFamily: FONT_FAMILY,
        fontSize: '34px',
        fontStyle: 'bold',
        color: toCss(COLORS.hudText),
        stroke: toCss(COLORS.outline),
        strokeThickness: 6,
        resolution: 2,
      })
      .setOrigin(0, 0.5);

    const hint = scene.add
      .text(scene.scale.width / 2, scene.scale.height - HINT_MARGIN_BOTTOM, HINT_TEXT, {
        fontFamily: FONT_FAMILY,
        fontSize: '16px',
        fontStyle: 'bold',
        color: toCss(COLORS.hudText),
        stroke: toCss(COLORS.outline),
        strokeThickness: 4,
        align: 'center',
        lineSpacing: 2,
        resolution: 2,
      })
      .setOrigin(0.5, 1);

    // Всё в координатах экрана и поверх мира.
    for (const object of [panel, this.icon, this.countText, hint]) {
      object.setScrollFactor(0).setDepth(HUD_DEPTH);
    }
  }

  // Показать, сколько хвороста сдано. Число и иконка «пружинят».
  setWood(count: number): void {
    this.countText.setText(String(count));
    pop(this.scene, this.countText);
    pop(this.scene, this.icon, ICON_SCALE);
  }
}
