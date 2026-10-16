import Phaser from 'phaser';
import { COLORS, toCss } from '../palette';
import { FONT_FAMILY, TEXTURES, TITLE_FONT } from '../textures';

// HUD рисуется поверх всего мира (джойстик — на том же уровне, см. Player.ts).
const HUD_DEPTH = 20000;
// Отступ плашки от левого верхнего угла экрана.
const PANEL_MARGIN = 16;
// Иконка луны на плашке: середина иконки от левого края плашки.
const ICON_X = 38;
// Где начинается время (от левого края плашки).
const TIME_X = 68;
// Подсказка по управлению — у нижнего края экрана.
const HINT_MARGIN_BOTTOM = 12;
const HINT_TEXT = 'WASD, стрелки или зажми и веди мышь / палец — идти\nВстань у куста — рубить, у поленницы — сдать хворост';

/**
 * Интерфейс поверх игры: плашка «сколько осталось до рассвета» и подсказка.
 * Всё в координатах экрана (scrollFactor 0) — не двигается вместе с камерой.
 */
export class Hud {
  // Время до рассвета на плашке, например «1:59».
  private timeText: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene) {
    const panel = scene.add.image(PANEL_MARGIN, PANEL_MARGIN, TEXTURES.hudPanel).setOrigin(0, 0);
    const panelCenterY = PANEL_MARGIN + panel.height / 2;

    const icon = scene.add.image(PANEL_MARGIN + ICON_X, panelCenterY, TEXTURES.moonIcon);

    this.timeText = scene.add
      .text(PANEL_MARGIN + TIME_X, panelCenterY, '', {
        fontFamily: TITLE_FONT,
        fontSize: '34px',
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
    for (const object of [panel, icon, this.timeText, hint]) {
      object.setScrollFactor(0).setDepth(HUD_DEPTH);
    }
  }

  // Показать, сколько мс осталось до рассвета, в виде «минуты:секунды».
  setTimeLeft(ms: number): void {
    // Округляем вверх: в начале видно «2:00», а «0:00» — только когда время вышло.
    const totalSeconds = Math.ceil(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    // setText перерисовывает надпись, только если текст изменился, — раз в секунду.
    this.timeText.setText(minutes + ':' + String(seconds).padStart(2, '0'));
  }
}
