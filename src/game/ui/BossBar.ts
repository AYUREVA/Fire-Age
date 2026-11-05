import Phaser from 'phaser';
import { COLORS, toCss } from '../palette';
import { MAMMOTH_HP } from '../settings';
import { BOSS_BAR_SIZE, FONT_FAMILY, TEXTURES } from '../textures';
import { CARVED_TEXT_SHADOW } from './StoneTablet';

// ===== Раскладка (пиксели экрана) =====

// Полоса на уровне HUD (Hud.ts) — поверх мира.
const BAR_DEPTH = 20000;
// Отступ от краёв экрана и от плашек HUD — как у HUD (Hud.ts).
const MARGIN = 16;
const GAP = 10;
// Сколько места по ширине занимают плашки HUD слева (время и клыки)
// и кнопки справа (звук и пауза) — между ними полоса встаёт в верхний ряд.
const HUD_LEFT_WIDTH = 350;
const HUD_RIGHT_WIDTH = 130;
// Если в верхнем ряду места нет (узкий экран), полоса встаёт слева под плашками HUD
// (время и под ним жар, с 0.9.1): её верх — на такой высоте.
const UNDER_HUD_TOP = 168;
// Внутри плашки (от её середины): иконка мамонта, подпись и сама полоса.
const ICON_X = -112;
const ICON_SCALE = 0.62;
const LABEL_X = -78;
const LABEL_Y = -11;
const BAR_X = -78;
const BAR_Y = 12;
const BAR_WIDTH = 210;
const BAR_HEIGHT = 12;
// Удар по мамонту: полоса вздрагивает — сдвиг вбок (пиксели) и время (мс).
const HIT_SHAKE_SHIFT = 4;
const HIT_SHAKE_TIME = 60;
// Кусок полосы, который отлетает при уроне (с 0.9.1): падает на столько пикселей,
// поворачивается на столько градусов и тает за столько мс.
const CHUNK_FALL = 26;
const CHUNK_TURN = 25;
const CHUNK_TIME = 450;
// Полоса появляется плавно за столько мс.
const FADE_TIME = 250;
// Ярость (с 0.9.1): подпись меняется и мигает столько раз, по столько мс.
const RAGE_LABEL = 'Мамонт в ярости!';
const RAGE_BLINKS = 4;
const RAGE_BLINK_TIME = 120;

/**
 * Полоса здоровья мамонта (с 0.9): каменная плашка «Мамонт» вверху экрана.
 *
 * Здоровье хранит мамонт (Mammoth.hp). Полоса его только показывает:
 * сцена каждый кадр передаёт число в update(). Здоровье убыло — полоса вздрагивает.
 * Мамонт в ярости — заливка темнеет, подпись краснеет и мигает.
 * На широком экране полоса в верхнем ряду между плашками HUD и кнопками,
 * на узком — слева под плашками HUD.
 */
export class BossBar {
  private scene: Phaser.Scene;
  // Плашка, подпись, иконка и полоса — двигаются вместе.
  private container: Phaser.GameObjects.Container;
  // Заливка полосы: её ширина — доля здоровья.
  private fill: Phaser.GameObjects.Rectangle;
  // Подпись «Мамонт» (в ярости меняется).
  private label: Phaser.GameObjects.Text;
  // Показана ли уже ярость.
  private isRage = false;
  // Здоровье, которое полоса показывает сейчас (чтобы заметить удар).
  private shownHp = MAMMOTH_HP;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.label = scene.add
      .text(LABEL_X, LABEL_Y, 'Мамонт', {
        fontFamily: FONT_FAMILY,
        fontSize: '17px',
        fontStyle: 'bold',
        color: toCss(COLORS.hudText),
        stroke: toCss(COLORS.outline),
        strokeThickness: 4,
        shadow: CARVED_TEXT_SHADOW,
        resolution: 2,
      })
      .setOrigin(0, 0.5);
    const back = scene.add
      .rectangle(BAR_X, BAR_Y, BAR_WIDTH, BAR_HEIGHT, COLORS.heatBarBack)
      .setOrigin(0, 0.5)
      .setStrokeStyle(2, COLORS.outline);
    this.fill = scene.add.rectangle(BAR_X, BAR_Y, BAR_WIDTH, BAR_HEIGHT, COLORS.bossBar).setOrigin(0, 0.5);
    this.container = scene.add
      .container(0, 0, [
        scene.add.image(0, 0, TEXTURES.bossBarPlate),
        scene.add.image(ICON_X, 0, TEXTURES.mammothIcon).setScale(ICON_SCALE),
        this.label,
        back,
        this.fill,
      ])
      .setScrollFactor(0)
      .setDepth(BAR_DEPTH)
      .setAlpha(0)
      .setVisible(false);

    // Экран повернули — полоса переезжает. Подписка на событие всей игры: при выключении сцены снимаем.
    this.layout();
    scene.scale.on(Phaser.Scale.Events.RESIZE, this.layout, this);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      scene.scale.off(Phaser.Scale.Events.RESIZE, this.layout, this);
    });
  }

  // Показать полосу (когда кончилась сценка выхода мамонта).
  show(): void {
    this.container.setVisible(true);
    this.scene.tweens.add({ targets: this.container, alpha: 1, duration: FADE_TIME });
  }

  // Спрятать полосу (мамонт повержен — идёт добивание).
  hide(): void {
    this.scene.tweens.add({ targets: this.container, alpha: 0, duration: FADE_TIME });
  }

  // Каждый кадр: hp — здоровье мамонта, isEnraged — в ярости ли он.
  // Убыло здоровье — полоса короче и вздрагивает.
  update(hp: number, isEnraged: boolean): void {
    if (isEnraged && !this.isRage) this.showRage();
    if (hp === this.shownHp) return;
    const lostWidth = (BAR_WIDTH * (this.shownHp - hp)) / MAMMOTH_HP;
    this.shownHp = hp;
    this.fill.width = (BAR_WIDTH * hp) / MAMMOTH_HP;
    this.breakChunk(BAR_X + this.fill.width, lostWidth);
    this.layout();
    this.scene.tweens.add({
      targets: this.container,
      x: this.container.x + HIT_SHAKE_SHIFT,
      duration: HIT_SHAKE_TIME,
      yoyo: true,
    });
  }

  // От полосы отлетает кусок ширины width (x — его левый край): падает, крутится и тает.
  private breakChunk(x: number, width: number): void {
    const chunk = this.scene.add.rectangle(x, BAR_Y, width, BAR_HEIGHT, this.fill.fillColor).setOrigin(0, 0.5);
    this.container.add(chunk);
    this.scene.tweens.add({
      targets: chunk,
      y: BAR_Y + CHUNK_FALL,
      angle: CHUNK_TURN,
      alpha: 0,
      duration: CHUNK_TIME,
      ease: 'Quad.easeIn',
      onComplete: () => chunk.destroy(),
    });
  }

  // Ярость: заливка темнеет, подпись краснеет и мигает.
  private showRage(): void {
    this.isRage = true;
    this.fill.setFillStyle(COLORS.bossBarRage);
    this.label.setText(RAGE_LABEL).setColor(toCss(COLORS.heatLow));
    this.scene.tweens.add({
      targets: this.label,
      alpha: 0.2,
      duration: RAGE_BLINK_TIME,
      yoyo: true,
      repeat: RAGE_BLINKS - 1,
    });
  }

  // Где стоит полоса: в верхнем ряду, если там хватает места, иначе — под плашками HUD слева.
  private layout(): void {
    const { width } = this.scene.scale;
    const freeLeft = MARGIN + HUD_LEFT_WIDTH + GAP;
    const freeRight = width - MARGIN - HUD_RIGHT_WIDTH - GAP;
    if (freeRight - freeLeft >= BOSS_BAR_SIZE.w) {
      this.container.setPosition((freeLeft + freeRight) / 2, MARGIN + BOSS_BAR_SIZE.h / 2);
    } else {
      this.container.setPosition(MARGIN + BOSS_BAR_SIZE.w / 2, UNDER_HUD_TOP + BOSS_BAR_SIZE.h / 2);
    }
  }
}
