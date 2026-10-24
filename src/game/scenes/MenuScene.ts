import Phaser from 'phaser';
import { COLORS, toCss } from '../palette';
import { FONT_FAMILY, TEXTURES, TITLE_FONT, createTextures, loadFonts } from '../textures';
import { EPOCHS, LEVELS, LEVELS_PER_EPOCH } from '../data/levels';
import { getProgress, getTotalStars, getAvailableStars, isLevelOpen } from '../save';
import { StoneTablet } from '../ui/StoneTablet';
import { shake } from '../fx';
import { GameData } from './GameScene';

// ===== Раскладка карты (от середины большой таблички, пиксели) =====

// Ряд эпох: где стоят камни эпох, расстояние между ними, где подписи.
const EPOCHS_Y = -112;
const EPOCH_STEP = 94;
const EPOCH_NAME_Y = -62;
// Подпись эпохи переносится на вторую строку, если шире этого.
const EPOCH_NAME_WIDTH = 90;
// Камень эпохи чуть меньше камня уровня, иконка на нём — тоже.
const EPOCH_STONE_SCALE = 0.9;
const EPOCH_ICON_SCALE = 0.85;
// Замок у закрытой эпохи — в правом нижнем углу камня.
const EPOCH_LOCK_SHIFT = 26;
// Название открытой эпохи — над рядом её уровней.
const EPOCH_TITLE_Y = 0;
// Ряд уровней открытой эпохи и звёзды под каждым уровнем.
const LEVELS_Y = 68;
const LEVEL_STEP = 104;
const LEVEL_STARS_Y = 116;
const LEVEL_STAR_STEP = 22;
const LEVEL_STAR_SCALE = 0.55;
// Сколько звёзд можно получить за уровень.
const STARS_PER_LEVEL = 3;
// Строка «сколько звёзд получено и сколько можно потратить».
const TOTAL_STARS_Y = 160;
const TOTAL_STAR_SCALE = 0.75;
// Звезда и надпись сдвинуты от середины на столько: звезда влево, надпись вправо.
const TOTAL_STAR_SHIFT = 14;
// Закрытый уровень или эпоха при нажатии качается: угол (градусы) и время (мс).
const LOCKED_SHAKE_ANGLE = 8;
const LOCKED_SHAKE_TIME = 400;

/**
 * Меню — карта эпох и уровней на большой каменной табличке «Fire Age».
 *
 * С неё начинается игра. Ряд из шести эпох: открыт только каменный век,
 * остальные — тёмные силуэты с замками и названиями. Ниже — пять уровней
 * каменного века: открытые с номером и звёздами, закрытые с замком.
 * Нажал открытый уровень — табличка закрывается, GameScene строит этот
 * уровень и ждёт старта (READY).
 *
 * Прогресс (звёзды, какие уровни открыты) хранит save.ts — меню только читает.
 */
export class MenuScene extends Phaser.Scene {
  // Табличка с картой.
  private tablet!: StoneTablet;
  // Снежная земля на весь экран под табличкой.
  private background!: Phaser.GameObjects.TileSprite;
  // Уровень уже выбран, табличка закрывается — повторные нажатия не считаем.
  private isClosing = false;

  constructor() {
    super('MenuScene');
  }

  // Загрузка перед create(): шрифт заголовков.
  preload(): void {
    loadFonts(this);
  }

  create(): void {
    // При новом запуске сцены поля сохраняют старые значения — сбрасываем.
    this.isClosing = false;
    // Картинки общие для всей игры: если меню открылось первым, рисуем их здесь.
    createTextures(this);

    this.background = this.add.tileSprite(0, 0, this.scale.width, this.scale.height, TEXTURES.snowTile).setOrigin(0, 0);
    this.scale.on(Phaser.Scale.Events.RESIZE, this.layout, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off(Phaser.Scale.Events.RESIZE, this.layout, this);
    });

    this.tablet = new StoneTablet(this, { title: 'Fire Age', buttons: [], isLarge: true });
    EPOCHS.forEach((epoch, index) => this.addEpoch(index, epoch.name, epoch.icon));
    this.tablet.add([this.addText(0, EPOCH_TITLE_Y, EPOCHS[0].name, 28, COLORS.titleAmber, TITLE_FONT)]);
    for (let i = 0; i < LEVELS_PER_EPOCH; i++) {
      this.addLevel(i);
    }
    this.addTotalStars();
  }

  // Экран поменял размер — снег снова на весь экран (табличку переставляет она сама).
  private layout(): void {
    this.background.setSize(this.scale.width, this.scale.height);
  }

  // ===== Эпохи =====

  // Камень эпохи номер index в ряду: иконка и название под ним.
  // Открыт только каменный век (первая эпоха); у остальных — силуэт и замок.
  private addEpoch(index: number, name: string, icon: string): void {
    const x = (index - (EPOCHS.length - 1) / 2) * EPOCH_STEP;
    const isOpen = index === 0;

    const stone = this.add.image(x, EPOCHS_Y, TEXTURES.roundStone).setScale(EPOCH_STONE_SCALE);
    const image = this.add.image(x, EPOCHS_Y, icon).setScale(EPOCH_ICON_SCALE);
    const label = this.addText(x, EPOCH_NAME_Y, name, 13, isOpen ? COLORS.titleAmber : COLORS.hudText, FONT_FAMILY);
    label.setWordWrapWidth(EPOCH_NAME_WIDTH).setAlign('center').setOrigin(0.5, 0);
    if (isOpen) {
      this.tablet.add([stone, image, label]);
      return;
    }

    stone.setTint(COLORS.lockedStone);
    image.setTint(COLORS.lockedTint);
    const lock = this.add.image(x + EPOCH_LOCK_SHIFT, EPOCHS_Y + EPOCH_LOCK_SHIFT, TEXTURES.lock);
    // Нажали закрытую эпоху — камень с иконкой качается: «пока нельзя».
    stone.setInteractive({ useHandCursor: true });
    stone.on('pointerdown', () => {
      shake(this, stone, LOCKED_SHAKE_ANGLE, LOCKED_SHAKE_TIME);
      shake(this, image, LOCKED_SHAKE_ANGLE, LOCKED_SHAKE_TIME);
    });
    this.tablet.add([stone, image, label, lock]);
  }

  // ===== Уровни =====

  // Камень уровня номер index (с нуля) открытой эпохи.
  // Открытый — номер и три места для звёзд, нажатие запускает уровень.
  // Закрытый (предыдущий не пройден или уровень ещё не вышел) — замок, нажатие качает камень.
  private addLevel(index: number): void {
    const x = (index - (LEVELS_PER_EPOCH - 1) / 2) * LEVEL_STEP;
    const stone = this.add.image(x, LEVELS_Y, TEXTURES.roundStone).setInteractive({ useHandCursor: true });
    const isOpen = index < LEVELS.length && isLevelOpen(index);

    if (!isOpen) {
      const lock = this.add.image(x, LEVELS_Y, TEXTURES.lock);
      stone.setTint(COLORS.lockedStone);
      stone.on('pointerdown', () => {
        shake(this, stone, LOCKED_SHAKE_ANGLE, LOCKED_SHAKE_TIME);
        shake(this, lock, LOCKED_SHAKE_ANGLE, LOCKED_SHAKE_TIME);
      });
      this.tablet.add([stone, lock]);
      return;
    }

    const number = this.addText(x, LEVELS_Y - 3, String(index + 1), 36, COLORS.hudText, TITLE_FONT);
    stone.on('pointerup', () => this.startLevel(index));
    this.tablet.add([stone, number]);

    // Звёзды под уровнем: полученные — золотые, остальные — тёмные места.
    const stars = getProgress().stars[index] ?? 0;
    for (let i = 0; i < STARS_PER_LEVEL; i++) {
      const starX = x + (i - (STARS_PER_LEVEL - 1) / 2) * LEVEL_STAR_STEP;
      const star = this.add
        .image(starX, LEVEL_STARS_Y, TEXTURES.star)
        .setScale(LEVEL_STAR_SCALE)
        .setTint(i < stars ? COLORS.starOn : COLORS.starOff);
      this.tablet.add([star]);
    }
  }

  // Табличка закрывается, и GameScene строит выбранный уровень (меню → READY).
  private startLevel(levelIndex: number): void {
    if (this.isClosing) return;
    this.isClosing = true;

    const data: GameData = { levelIndex };
    this.tablet.close(() => this.scene.start('GameScene', data));
  }

  // ===== Звёзды =====

  // Строка внизу: звезда, сколько получено из скольких и сколько можно потратить на улучшения.
  private addTotalStars(): void {
    const maxStars = LEVELS.length * STARS_PER_LEVEL;
    const text = getTotalStars() + ' из ' + maxStars + '  ·  можно потратить: ' + getAvailableStars();
    const label = this.addText(0, TOTAL_STARS_Y, text, 20, COLORS.hudText, FONT_FAMILY);
    // Звезда слева от надписи; вместе они стоят по середине таблички.
    const star = this.add
      .image(-label.width / 2 - TOTAL_STAR_SHIFT, TOTAL_STARS_Y, TEXTURES.star)
      .setScale(TOTAL_STAR_SCALE)
      .setTint(COLORS.starOn);
    label.setX(TOTAL_STAR_SHIFT);
    this.tablet.add([star, label]);
  }

  // Надпись с тёмной обводкой; (x, y) — её середина.
  private addText(
    x: number,
    y: number,
    text: string,
    fontSize: number,
    color: number,
    fontFamily: string,
  ): Phaser.GameObjects.Text {
    return this.add
      .text(x, y, text, {
        fontFamily,
        fontSize: fontSize + 'px',
        fontStyle: fontFamily === FONT_FAMILY ? 'bold' : 'normal',
        color: toCss(color),
        stroke: toCss(COLORS.outline),
        strokeThickness: 4,
        resolution: 2,
      })
      .setOrigin(0.5);
  }
}
