import Phaser from 'phaser';
import { COLORS, toCss } from '../palette';
import { TEXTURES, TITLE_FONT } from '../textures';
import { pop } from '../fx';

// HUD рисуется поверх всего мира (джойстик — на том же уровне, см. Player.ts).
const HUD_DEPTH = 20000;
// Отступ плашки от левого верхнего угла экрана (и кнопки паузы — от правого).
const PANEL_MARGIN = 16;
// Иконка солнца или луны на плашке: середина иконки от левого края плашки.
const ICON_X = 38;
// Где начинается время (от левого края плашки).
const TIME_X = 68;
// Кнопка паузы чуть темнее, при наведении — светлеет до настоящего цвета.
const PAUSE_IDLE_TINT = 0xdddddd;
const PAUSE_HOVER_TINT = 0xffffff;

/**
 * Интерфейс поверх игры: плашка «сколько осталось до конца дня или ночи»
 * (днём на ней солнце, ночью луна) и кнопка паузы в правом верхнем углу (для телефона).
 * Всё в координатах экрана (scrollFactor 0) — не двигается вместе с камерой.
 */
export class Hud {
  private scene: Phaser.Scene;
  // Солнце днём или луна ночью на плашке времени.
  private phaseIcon: Phaser.GameObjects.Image;
  // Время до конца дня или ночи на плашке, например «1:59».
  private timeText: Phaser.GameObjects.Text;

  // onPause — что сделать, когда нажали кнопку паузы (сцена ставит игру на паузу).
  constructor(scene: Phaser.Scene, onPause: () => void) {
    this.scene = scene;
    const panel = scene.add.image(PANEL_MARGIN, PANEL_MARGIN, TEXTURES.hudPanel).setOrigin(0, 0);
    const panelCenterY = PANEL_MARGIN + panel.height / 2;

    this.phaseIcon = scene.add.image(PANEL_MARGIN + ICON_X, panelCenterY, TEXTURES.sunIcon);

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

    const pauseButton = scene.add.image(0, 0, TEXTURES.pauseButton).setTint(PAUSE_IDLE_TINT);
    pauseButton.setPosition(
      scene.scale.width - PANEL_MARGIN - pauseButton.width / 2,
      PANEL_MARGIN + pauseButton.height / 2,
    );
    pauseButton.setInteractive({ useHandCursor: true });
    pauseButton.on('pointerover', () => pauseButton.setTint(PAUSE_HOVER_TINT));
    pauseButton.on('pointerout', () => pauseButton.setTint(PAUSE_IDLE_TINT));
    pauseButton.on('pointerdown', onPause);

    // Всё в координатах экрана и поверх мира.
    for (const object of [panel, this.phaseIcon, this.timeText, pauseButton]) {
      object.setScrollFactor(0).setDepth(HUD_DEPTH);
    }
  }

  // Ночь или день: на плашке луна или солнце.
  setPhase(isNight: boolean): void {
    this.phaseIcon.setTexture(isNight ? TEXTURES.moonIcon : TEXTURES.sunIcon);
    pop(this.scene, this.phaseIcon);
  }

  // Показать, сколько мс осталось до конца дня или ночи, в виде «минуты:секунды».
  setTimeLeft(ms: number): void {
    // Округляем вверх: в начале видно «2:00», а «0:00» — только когда время вышло.
    const totalSeconds = Math.ceil(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    // setText перерисовывает надпись, только если текст изменился, — раз в секунду.
    this.timeText.setText(minutes + ':' + String(seconds).padStart(2, '0'));
  }
}
