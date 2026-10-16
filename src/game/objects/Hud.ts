import Phaser from 'phaser';
import { COLORS, toCss } from '../palette';
import { PHASES } from '../settings';
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
// Плашки ночных модификаторов под плашкой времени: зазор, размер плашки
// (уменьшенная плашка времени), расстояние между плашками.
const MODIFIER_GAP = 6;
const MODIFIER_SCALE_X = 0.5;
const MODIFIER_SCALE_Y = 0.62;
const MODIFIER_STEP = 92;
// Иконка и надпись на плашке модификатора (от её середины).
const MODIFIER_ICON_X = -22;
const MODIFIER_TEXT_X = -8;
// Иконки: пламя и нога в сапоге — уменьшенные картинки из игры.
const FLAME_ICON_SCALE = 0.28;
const BOOT_ICON_SCALE = 0.75;
// Кнопка паузы чуть темнее, при наведении — светлеет до настоящего цвета.
const PAUSE_IDLE_TINT = 0xdddddd;
const PAUSE_HOVER_TINT = 0xffffff;

/**
 * Интерфейс поверх игры: плашка «сколько осталось до конца дня или ночи»
 * (днём на ней солнце, ночью луна), под ней ночью — плашки модификаторов
 * («×1.6» огонь, «×0.75» скорость), и кнопка паузы в правом верхнем углу (для телефона).
 * Всё в координатах экрана (scrollFactor 0) — не двигается вместе с камерой.
 */
export class Hud {
  private scene: Phaser.Scene;
  // Солнце днём или луна ночью на плашке времени.
  private phaseIcon: Phaser.GameObjects.Image;
  // Время до конца дня или ночи на плашке, например «1:59».
  private timeText: Phaser.GameObjects.Text;
  // Плашки ночных модификаторов: видны только ночью.
  private modifiers: (Phaser.GameObjects.Image | Phaser.GameObjects.Text)[] = [];

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

    // Ночные модификаторы — числа из таблицы PHASES в settings.ts.
    const modifierY = PANEL_MARGIN + panel.height + MODIFIER_GAP + (panel.height * MODIFIER_SCALE_Y) / 2;
    const modifierX = PANEL_MARGIN + (panel.width * MODIFIER_SCALE_X) / 2;
    this.modifiers = [
      ...this.createModifier(modifierX, modifierY, TEXTURES.flame, FLAME_ICON_SCALE, PHASES.night.fireBurnMultiplier),
      ...this.createModifier(
        modifierX + MODIFIER_STEP,
        modifierY,
        TEXTURES.leg,
        BOOT_ICON_SCALE,
        PHASES.night.playerSpeedMultiplier,
      ),
    ];
    this.setModifiers(false);

    // Всё в координатах экрана и поверх мира.
    for (const object of [panel, this.phaseIcon, this.timeText, pauseButton, ...this.modifiers]) {
      object.setScrollFactor(0).setDepth(HUD_DEPTH);
    }
  }

  // Показать или спрятать плашки ночных модификаторов.
  setModifiers(visible: boolean): void {
    for (const object of this.modifiers) {
      object.setVisible(visible);
    }
  }

  // Ночь или день: на плашке луна или солнце.
  setPhase(isNight: boolean): void {
    this.phaseIcon.setTexture(isNight ? TEXTURES.moonIcon : TEXTURES.sunIcon);
    pop(this.scene, this.phaseIcon);
  }

  // Плашка модификатора: иконка и множитель, например «×1.6». (x, y) — середина плашки.
  private createModifier(
    x: number,
    y: number,
    icon: string,
    iconScale: number,
    multiplier: number,
  ): (Phaser.GameObjects.Image | Phaser.GameObjects.Text)[] {
    const plate = this.scene.add.image(x, y, TEXTURES.hudPanel).setScale(MODIFIER_SCALE_X, MODIFIER_SCALE_Y);
    const image = this.scene.add.image(x + MODIFIER_ICON_X, y, icon).setScale(iconScale);
    const label = this.scene.add
      .text(x + MODIFIER_TEXT_X, y, '×' + multiplier, {
        fontFamily: TITLE_FONT,
        fontSize: '20px',
        color: toCss(COLORS.hudText),
        stroke: toCss(COLORS.outline),
        strokeThickness: 4,
        resolution: 2,
      })
      .setOrigin(0, 0.5);
    return [plate, image, label];
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
