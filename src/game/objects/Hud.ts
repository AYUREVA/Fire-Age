import Phaser from 'phaser';
import { COLORS, toCss } from '../palette';
import { PHASES } from '../settings';
import { TEXTURES, TITLE_FONT } from '../textures';
import { flyArc, pop } from '../fx';
import { SOUNDS, SOUND_VOLUMES, playSound, toggleMute } from '../sounds';
import { getProgress } from '../save';

// HUD рисуется поверх всего мира (джойстик — на том же уровне, см. Player.ts).
const HUD_DEPTH = 20000;
// Отступ плашки от левого верхнего угла экрана (и кнопки паузы — от правого).
const PANEL_MARGIN = 16;
// Иконка солнца или луны на плашке: середина иконки от левого края плашки.
const ICON_X = 38;
// Где начинается время (от левого края плашки). Так же — число на плашке клыков.
const TIME_X = 68;
// Плашка клыков стоит справа от плашки времени с таким зазором.
const PANEL_GAP = 10;
// Клык летит в счётчик за столько мс по дуге такой высоты.
const TUSK_FLY_TIME = 450;
const TUSK_FLY_ARC = 80;
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
// Кнопка звука стоит левее кнопки паузы с таким зазором.
const SOUND_BUTTON_GAP = 10;
// Кнопка паузы чуть темнее, при наведении — светлеет до настоящего цвета.
const PAUSE_IDLE_TINT = 0xdddddd;
const PAUSE_HOVER_TINT = 0xffffff;

/**
 * Интерфейс поверх игры: плашка «сколько осталось до конца дня или ночи»
 * (днём на ней солнце, ночью луна), справа от неё — счётчик клыков,
 * под ней ночью — плашки модификаторов
 * (огонь и скорость вождя, числа из таблицы PHASES), и кнопка паузы в правом верхнем углу (для телефона).
 * Всё в координатах экрана (scrollFactor 0) — не двигается вместе с камерой.
 */
export class Hud {
  private scene: Phaser.Scene;
  // Солнце днём или луна ночью на плашке времени.
  private phaseIcon: Phaser.GameObjects.Image;
  // Время до конца дня или ночи на плашке, например «1:59».
  private timeText: Phaser.GameObjects.Text;
  // Иконка клыка и число на плашке клыков. Само число хранит вождь (Player.tusks).
  private tuskIcon: Phaser.GameObjects.Image;
  private tuskText: Phaser.GameObjects.Text;
  // Кнопка паузы в правом верхнем углу.
  private pauseButton: Phaser.GameObjects.Image;
  // Кнопка звука левее паузы: включить или выключить звук (запоминается в сохранении).
  private soundButton: Phaser.GameObjects.Image;
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

    // Плашка клыков справа от плашки времени.
    const tuskPanelX = PANEL_MARGIN + panel.width + PANEL_GAP;
    const tuskPanel = scene.add.image(tuskPanelX, PANEL_MARGIN, TEXTURES.hudPanel).setOrigin(0, 0);
    this.tuskIcon = scene.add.image(tuskPanelX + ICON_X, panelCenterY, TEXTURES.tusk);
    this.tuskText = scene.add
      .text(tuskPanelX + TIME_X, panelCenterY, '0', {
        fontFamily: TITLE_FONT,
        fontSize: '34px',
        color: toCss(COLORS.hudText),
        stroke: toCss(COLORS.outline),
        strokeThickness: 6,
        resolution: 2,
      })
      .setOrigin(0, 0.5);

    const pauseButton = scene.add.image(0, 0, TEXTURES.pauseButton).setTint(PAUSE_IDLE_TINT);
    this.pauseButton = pauseButton;
    pauseButton.setInteractive({ useHandCursor: true });
    pauseButton.on('pointerover', () => pauseButton.setTint(PAUSE_HOVER_TINT));
    pauseButton.on('pointerout', () => pauseButton.setTint(PAUSE_IDLE_TINT));
    pauseButton.on('pointerdown', onPause);

    const soundButton = scene.add
      .image(0, 0, getProgress().isMuted ? TEXTURES.soundOffButton : TEXTURES.soundOnButton)
      .setTint(PAUSE_IDLE_TINT);
    this.soundButton = soundButton;
    soundButton.setInteractive({ useHandCursor: true });
    soundButton.on('pointerover', () => soundButton.setTint(PAUSE_HOVER_TINT));
    soundButton.on('pointerout', () => soundButton.setTint(PAUSE_IDLE_TINT));
    soundButton.on('pointerdown', () => {
      const isMuted = toggleMute(scene);
      soundButton.setTexture(isMuted ? TEXTURES.soundOffButton : TEXTURES.soundOnButton);
      pop(scene, soundButton);
    });

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
    const parts = [panel, this.phaseIcon, this.timeText, tuskPanel, this.tuskIcon, this.tuskText, pauseButton, soundButton];
    for (const object of [...parts, ...this.modifiers]) {
      object.setScrollFactor(0).setDepth(HUD_DEPTH);
    }

    // Плашка времени прижата к левому верхнему углу и от размера экрана не зависит,
    // а кнопка паузы — к правому: при повороте телефона её переставляем.
    // Подписка на событие всей игры: при выключении сцены её снимаем.
    this.layout();
    scene.scale.on(Phaser.Scale.Events.RESIZE, this.layout, this);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      scene.scale.off(Phaser.Scale.Events.RESIZE, this.layout, this);
    });
  }

  // Кнопка паузы — в правом верхнем углу текущего экрана, кнопка звука — левее неё.
  private layout(): void {
    this.pauseButton.setPosition(
      this.scene.scale.width - PANEL_MARGIN - this.pauseButton.width / 2,
      PANEL_MARGIN + this.pauseButton.height / 2,
    );
    this.soundButton.setPosition(
      this.pauseButton.x - this.pauseButton.width / 2 - SOUND_BUTTON_GAP - this.soundButton.width / 2,
      this.pauseButton.y,
    );
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

  // Клык летит из точки экрана (screenX, screenY) в счётчик. Долетел — счётчик
  // показывает total (сколько клыков у вождя вместе с этим) и «пружинит».
  flyTuskToCounter(screenX: number, screenY: number, total: number): void {
    const tusk = this.scene.add.image(screenX, screenY, TEXTURES.tusk).setScrollFactor(0);
    flyArc(this.scene, tusk, {
      from: { x: screenX, y: screenY },
      target: () => ({ x: this.tuskIcon.x, y: this.tuskIcon.y }),
      duration: TUSK_FLY_TIME,
      height: TUSK_FLY_ARC,
      onLand: () => {
        tusk.destroy();
        playSound(this.scene, SOUNDS.tusk, SOUND_VOLUMES.tusk);
        this.tuskText.setText(String(total));
        pop(this.scene, this.tuskText);
        pop(this.scene, this.tuskIcon);
      },
    });
    // flyArc ставит летящим предметам глубину мира — клык должен лететь поверх HUD.
    tusk.setDepth(HUD_DEPTH + 1);
  }

  // Клык уходит из счётчика на покупку: счётчик сразу показывает total
  // (сколько клыков осталось у вождя). Вернёт точку экрана, откуда клык вылетает.
  spendTusk(total: number): { x: number; y: number } {
    this.tuskText.setText(String(total));
    pop(this.scene, this.tuskIcon);
    playSound(this.scene, SOUNDS.tusk, SOUND_VOLUMES.tusk);
    return { x: this.tuskIcon.x, y: this.tuskIcon.y };
  }

  // Плашка модификатора: иконка и множитель, например «×2». (x, y) — середина плашки.
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
