import Phaser from 'phaser';
import { COLORS, toCss } from '../palette';
import { FONT_FAMILY, TEXTURES, TITLE_FONT, createTextures, loadFonts } from '../textures';
import { EPOCHS, LEVELS, LEVELS_PER_EPOCH, LevelData } from '../data/levels';
import { buyMetaUpgrade, getProgress, getTotalStars, getAvailableStars, isLevelOpen } from '../save';
import { META_UPGRADES, MetaUpgrade } from '../data/metaUpgrades';
import { StoneTablet } from '../ui/StoneTablet';
import { pop, shake } from '../fx';
import { createSounds, toggleMute } from '../sounds';
import { GameData } from './GameScene';

// ===== Табличка «Fire Age»: выбор эпохи (от середины большой таблички, пиксели) =====

// Эпохи сеткой: столько в ряду, шаг по ряду и между рядами, где середина первого ряда.
const EPOCH_COLUMNS = 3;
const EPOCH_STEP_X = 172;
const EPOCH_STEP_Y = 148;
const EPOCH_FIRST_Y = -68;
// Камень эпохи и иконка на нём.
const EPOCH_STONE_SCALE = 1.1;
const EPOCH_ICON_SCALE = 1.05;
// Под камнем: название и строка ниже («★ 3 из 9» или «Скоро»).
const EPOCH_NAME_SHIFT = 56;
const EPOCH_NOTE_SHIFT = 78;
// Замок у закрытой эпохи — в правом нижнем углу камня.
const EPOCH_LOCK_SHIFT = 32;
// Название закрытой эпохи чуть прозрачнее открытой.
const EPOCH_LOCKED_NAME_ALPHA = 0.8;
// Тёплое свечение под открытой эпохой: размер (пиксели), прозрачность, «дыхание» (мс).
const EPOCH_GLOW_SIZE = 150;
const EPOCH_GLOW_ALPHA = 0.55;
const EPOCH_GLOW_PULSE_TIME = 900;
// Звезда в строке «★ 3 из 9» и её отступ от надписи.
const NOTE_STAR_SCALE = 0.5;
const NOTE_STAR_GAP = 4;

// ===== Табличка эпохи: выбор уровня =====

// Уровни стоят тропой-зигзагом: шаг по ширине, высота верхних и нижних камней.
const LEVEL_STEP_X = 110;
const LEVEL_HIGH_Y = -34;
const LEVEL_LOW_Y = 52;
// Под камнем: название уровня (переносится, если шире), под ним — звёзды с таким зазором.
const LEVEL_NAME_SHIFT = 50;
const LEVEL_NAME_WIDTH = 104;
const LEVEL_STARS_GAP = 14;
const LEVEL_STAR_STEP = 22;
const LEVEL_STAR_SCALE = 0.55;
// Сколько звёзд можно получить за уровень.
const STARS_PER_LEVEL = 3;
// Тропа между уровнями: точки через столько пикселей, такого радиуса.
// До открытых уровней тропа золотая, дальше — тёмная.
const TRAIL_DOT_STEP = 13;
const TRAIL_DOT_RADIUS = 3;
// Тропа начинается и кончается у края камня, а не в его середине.
const TRAIL_STONE_GAP = 46;
// Новый, ещё не пройденный уровень «дышит», чтобы было видно, куда идти.
const NEXT_LEVEL_PULSE_SCALE = 1.07;
const NEXT_LEVEL_PULSE_TIME = 650;

// Нажатый закрытый уровень или эпоха качается: угол (градусы) и время (мс).
const LOCKED_SHAKE_ANGLE = 8;
const LOCKED_SHAKE_TIME = 400;

// Кнопка звука — в правом верхнем углу экрана, с таким отступом от краёв.
const SOUND_BUTTON_MARGIN = 16;

// ===== Раскладка таблички «Улучшения» =====

// Строки улучшений: где первая и расстояние между ними.
const UPGRADES_Y = -112;
const UPGRADE_STEP = 96;
// В строке слева направо: иконка, название с описанием, точки уровней, кнопка покупки.
const UPGRADE_ICON_X = -232;
const UPGRADE_ICON_SIZE = 56;
const UPGRADE_TEXT_X = -190;
const UPGRADE_NAME_SHIFT_Y = -15;
const UPGRADE_INFO_SHIFT_Y = 15;
const UPGRADE_PIPS_X = 60;
const UPGRADE_PIP_STEP = 22;
const UPGRADE_PIP_RADIUS = 8;
const UPGRADE_BUTTON_X = 196;
const UPGRADE_BUTTON_SCALE = 0.6;
// Звезда на кнопке покупки — левее цены, между ними такой зазор.
const UPGRADE_PRICE_GAP = 6;
const UPGRADE_PRICE_STAR_SCALE = 0.6;
// Купленная точка уровня вырастает из такого размера за столько мс.
const UPGRADE_PIP_POP_SCALE = 1.8;
const UPGRADE_PIP_POP_TIME = 250;
// Кнопка покупки, на которую не хватает звёзд или которая уже не нужна, — темнее.
const UPGRADE_DISABLED_TINT = 0x9a9a9a;
// Строка «сколько звёзд можно потратить» под улучшениями.
const UPGRADES_STARS_Y = 158;

// Какая табличка в меню: выбор эпохи, уровни эпохи или улучшения.
type MenuView = 'epochs' | 'levels' | 'upgrades';
// С какими данными запускается сцена: какую табличку показать (по умолчанию выбор эпохи).
export type MenuData = { view?: MenuView };

// Строка улучшения на табличке: что за улучшение и то, что меняется после покупки.
type UpgradeRow = {
  upgrade: MetaUpgrade;
  pips: Phaser.GameObjects.Arc[]; // точки уровней: купленные — золотые
  button: Phaser.GameObjects.Image; // кнопка покупки
  price: Phaser.GameObjects.Text; // цена следующего уровня или «Макс»
  priceStar: Phaser.GameObjects.Image; // звезда рядом с ценой
};

/**
 * Меню на больших каменных табличках. С него начинается игра.
 *
 * 1. «Fire Age» — выбор эпохи: шесть эпох сеткой. Открыт только каменный век
 *    (светится, под ним — сколько звёзд собрано), остальные — тёмные силуэты
 *    с замками и «Скоро». Нажал открытую эпоху — табличка её уровней.
 * 2. Уровни эпохи — тропа из пяти камней: открытые с номером, названием
 *    и звёздами, закрытые с замком. Нажал открытый уровень — табличка
 *    закрывается, GameScene строит этот уровень и ждёт старта (READY).
 *    «Назад» — к эпохам. Из игры («В меню») сцена открывается сразу здесь.
 * 3. «Улучшения» (кнопка на первой табличке) — мета-улучшения за звёзды
 *    (data/metaUpgrades.ts). «Назад» — к эпохам.
 *
 * Прогресс (звёзды, какие уровни открыты, что куплено) хранит save.ts:
 * меню читает его, а покупку делает функцией buyMetaUpgrade().
 */
export class MenuScene extends Phaser.Scene {
  // Табличка, которая сейчас открыта.
  private tablet!: StoneTablet;
  // Снежная земля на весь экран под табличкой.
  private background!: Phaser.GameObjects.TileSprite;
  // Кнопка звука в правом верхнем углу (как в игре).
  private soundButton!: Phaser.GameObjects.Image;
  // Уровень уже выбран, табличка закрывается — повторные нажатия не считаем.
  private isClosing = false;
  // Какую табличку показать: выбор эпохи, уровни эпохи или улучшения.
  private view: MenuView = 'epochs';
  // Строки улучшений и надпись «можно потратить» (на табличке «Улучшения»).
  private upgradeRows: UpgradeRow[] = [];
  private availableText?: Phaser.GameObjects.Text;

  constructor() {
    super('MenuScene');
  }

  // Перед create(): какую табличку показать.
  init(data: MenuData): void {
    this.view = data.view ?? 'epochs';
  }

  // Загрузка перед create(): шрифт заголовков.
  preload(): void {
    loadFonts(this);
  }

  create(): void {
    // При новом запуске сцены поля сохраняют старые значения — сбрасываем.
    this.isClosing = false;
    this.upgradeRows = [];
    this.availableText = undefined;
    // Картинки общие для всей игры: если меню открылось первым, рисуем их здесь.
    createTextures(this);
    createSounds(this);

    this.background = this.add.tileSprite(0, 0, this.scale.width, this.scale.height, TEXTURES.snowTile).setOrigin(0, 0);
    this.scale.on(Phaser.Scale.Events.RESIZE, this.layout, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off(Phaser.Scale.Events.RESIZE, this.layout, this);
    });

    this.addSoundButton();
    this.layout();

    if (this.view === 'upgrades') {
      this.showUpgrades();
    } else if (this.view === 'levels') {
      this.showLevels();
    } else {
      this.showEpochs();
    }
  }

  // Табличка «Fire Age»: выбор эпохи и кнопка «Улучшения».
  private showEpochs(): void {
    this.tablet = new StoneTablet(this, {
      title: 'Fire Age',
      subtitle: 'Выбери эпоху',
      buttons: [{ label: 'Улучшения', onClick: () => this.switchView('upgrades') }],
      isLarge: true,
    });
    EPOCHS.forEach((epoch, index) => this.addEpoch(index, epoch.name, epoch.icon));
  }

  // Табличка открытой эпохи (каменного века): тропа из её уровней и «Назад».
  private showLevels(): void {
    this.tablet = new StoneTablet(this, {
      title: EPOCHS[0].name,
      subtitle: 'Выбери уровень',
      buttons: [{ label: 'Назад', onClick: () => this.switchView('epochs') }],
      isLarge: true,
    });
    this.addTrail();
    for (let i = 0; i < LEVELS_PER_EPOCH; i++) {
      this.addLevel(i);
    }
  }

  // Табличка закрывается, и сцена открывается снова — уже с другой табличкой.
  private switchView(view: MenuView): void {
    if (this.isClosing) return;
    this.isClosing = true;

    const data: MenuData = { view };
    this.tablet.close(() => this.scene.restart(data));
  }

  // Экран поменял размер — снег снова на весь экран, кнопка звука — в правом верхнем углу
  // (табличку переставляет она сама).
  private layout(): void {
    this.background.setSize(this.scale.width, this.scale.height);
    this.soundButton.setPosition(
      this.scale.width - SOUND_BUTTON_MARGIN - this.soundButton.width / 2,
      SOUND_BUTTON_MARGIN + this.soundButton.height / 2,
    );
  }

  // Кнопка звука: выключить или включить звук во всей игре (запоминается в сохранении).
  // Она поверх затемнения таблички — её можно нажать, пока открыта карта.
  private addSoundButton(): void {
    const button = this.add
      .image(0, 0, getProgress().isMuted ? TEXTURES.soundOffButton : TEXTURES.soundOnButton)
      .setDepth(1)
      .setInteractive({ useHandCursor: true });
    button.on('pointerdown', () => {
      const isMuted = toggleMute(this);
      button.setTexture(isMuted ? TEXTURES.soundOffButton : TEXTURES.soundOnButton);
      pop(this, button);
    });
    this.soundButton = button;
  }

  // ===== Эпохи =====

  // Камень эпохи номер index в сетке: иконка, название и строка под ним.
  // Открыт только каменный век (первая эпоха): он светится, нажатие открывает его уровни.
  // У остальных — тёмный силуэт, замок и «Скоро», нажатие качает камень.
  private addEpoch(index: number, name: string, icon: string): void {
    const column = index % EPOCH_COLUMNS;
    const row = Math.floor(index / EPOCH_COLUMNS);
    const x = (column - (EPOCH_COLUMNS - 1) / 2) * EPOCH_STEP_X;
    const y = EPOCH_FIRST_Y + row * EPOCH_STEP_Y;
    const isOpen = index === 0;

    const stone = this.add
      .image(x, y, TEXTURES.roundStone)
      .setScale(EPOCH_STONE_SCALE)
      .setInteractive({ useHandCursor: true });
    const image = this.add.image(x, y, icon).setScale(EPOCH_ICON_SCALE);
    const label = this.addText(x, y + EPOCH_NAME_SHIFT, name, 17, isOpen ? COLORS.titleAmber : COLORS.hudText, TITLE_FONT);

    if (isOpen) {
      // Тёплое свечение под камнем медленно «дышит».
      const glow = this.add.image(x, y, TEXTURES.glow).setTint(COLORS.fireGlow).setAlpha(EPOCH_GLOW_ALPHA);
      glow.setScale(EPOCH_GLOW_SIZE / glow.width);
      this.tweens.add({
        targets: glow,
        alpha: EPOCH_GLOW_ALPHA / 2,
        duration: EPOCH_GLOW_PULSE_TIME,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
      stone.on('pointerdown', () => {
        pop(this, stone, EPOCH_STONE_SCALE);
        pop(this, image, EPOCH_ICON_SCALE);
      });
      stone.on('pointerup', () => this.switchView('levels'));
      this.tablet.add([glow, stone, image, label, ...this.addEpochStars(x, y + EPOCH_NOTE_SHIFT)]);
      return;
    }

    stone.setTint(COLORS.lockedStone);
    image.setTint(COLORS.lockedTint);
    label.setAlpha(EPOCH_LOCKED_NAME_ALPHA);
    const lock = this.add.image(x + EPOCH_LOCK_SHIFT, y + EPOCH_LOCK_SHIFT, TEXTURES.lock);
    const note = this.addText(x, y + EPOCH_NOTE_SHIFT, 'Скоро', 15, COLORS.tabletLight, FONT_FAMILY);
    // Нажали закрытую эпоху — камень с иконкой и замком качается: «пока нельзя».
    stone.on('pointerdown', () => {
      for (const part of [stone, image, lock]) shake(this, part, LOCKED_SHAKE_ANGLE, LOCKED_SHAKE_TIME);
    });
    this.tablet.add([stone, image, lock, label, note]);
  }

  // Строка «★ 3 из 9» под открытой эпохой: сколько звёзд собрано из возможных.
  // Звезда и надпись вместе стоят по середине под камнем.
  private addEpochStars(x: number, y: number): Phaser.GameObjects.GameObject[] {
    const maxStars = LEVELS.length * STARS_PER_LEVEL;
    const label = this.addText(x, y, getTotalStars() + ' из ' + maxStars, 16, COLORS.hudText, FONT_FAMILY);
    const star = this.add.image(0, y, TEXTURES.star).setScale(NOTE_STAR_SCALE).setTint(COLORS.starOn);
    const width = star.displayWidth + NOTE_STAR_GAP + label.width;
    star.setX(x - width / 2 + star.displayWidth / 2);
    label.setX(x + width / 2 - label.width / 2);
    return [star, label];
  }

  // ===== Уровни =====

  // Где стоит камень уровня номер index: тропа идёт зигзагом — вверх, вниз, вверх…
  private getLevelPoint(index: number): { x: number; y: number } {
    return {
      x: (index - (LEVELS_PER_EPOCH - 1) / 2) * LEVEL_STEP_X,
      y: index % 2 === 0 ? LEVEL_HIGH_Y : LEVEL_LOW_Y,
    };
  }

  // Открыт ли уровень номер index: он есть в игре и предыдущий пройден.
  private isOpen(index: number): boolean {
    return index < LEVELS.length && isLevelOpen(index);
  }

  // Тропа из точек между камнями уровней. Отрезок до открытого уровня — золотой, дальше — тёмный.
  private addTrail(): void {
    const trail = this.add.graphics();
    for (let i = 1; i < LEVELS_PER_EPOCH; i++) {
      const from = this.getLevelPoint(i - 1);
      const to = this.getLevelPoint(i);
      const length = Phaser.Math.Distance.Between(from.x, from.y, to.x, to.y);
      trail.fillStyle(this.isOpen(i) ? COLORS.starOn : COLORS.tabletDark, 1);
      for (let d = TRAIL_STONE_GAP; d <= length - TRAIL_STONE_GAP; d += TRAIL_DOT_STEP) {
        const t = d / length;
        trail.fillCircle(Phaser.Math.Linear(from.x, to.x, t), Phaser.Math.Linear(from.y, to.y, t), TRAIL_DOT_RADIUS);
      }
    }
    this.tablet.add([trail]);
  }

  // Камень уровня номер index (с нуля) открытой эпохи, название и звёзды под ним.
  // Открытый — номер на камне, нажатие запускает уровень; новый, ещё не пройденный, «дышит».
  // Закрытый — замок; уровни, которых ещё нет в игре, подписаны «Скоро». Нажатие качает камень.
  private addLevel(index: number): void {
    const { x, y } = this.getLevelPoint(index);
    const stone = this.add.image(x, y, TEXTURES.roundStone).setInteractive({ useHandCursor: true });
    const level = LEVELS[index] as LevelData | undefined;
    const nameText = level ? level.name : 'Скоро';
    const name = this.addText(x, y + LEVEL_NAME_SHIFT, nameText, 15, COLORS.hudText, FONT_FAMILY);
    name.setWordWrapWidth(LEVEL_NAME_WIDTH).setAlign('center').setOrigin(0.5, 0);

    if (!this.isOpen(index)) {
      const lock = this.add.image(x, y, TEXTURES.lock);
      stone.setTint(COLORS.lockedStone);
      name.setColor(toCss(COLORS.tabletLight));
      stone.on('pointerdown', () => {
        shake(this, stone, LOCKED_SHAKE_ANGLE, LOCKED_SHAKE_TIME);
        shake(this, lock, LOCKED_SHAKE_ANGLE, LOCKED_SHAKE_TIME);
      });
      this.tablet.add([stone, lock, name]);
      return;
    }

    const stars = getProgress().stars[index] ?? 0;
    const number = this.addText(x, y - 3, String(index + 1), 36, COLORS.hudText, TITLE_FONT);
    stone.on('pointerdown', () => pop(this, stone));
    stone.on('pointerup', () => this.startLevel(index));
    this.tablet.add([stone, number, name]);

    // Новый уровень (открыт, но звёзд ещё нет) «дышит» — сюда идти дальше.
    if (stars === 0) {
      this.tweens.add({
        targets: [stone, number],
        scale: NEXT_LEVEL_PULSE_SCALE,
        duration: NEXT_LEVEL_PULSE_TIME,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }

    // Звёзды сразу под названием (оно в одну или две строки): полученные — золотые, остальные — тёмные.
    const starsY = name.y + name.height + LEVEL_STARS_GAP;
    for (let i = 0; i < STARS_PER_LEVEL; i++) {
      const starX = x + (i - (STARS_PER_LEVEL - 1) / 2) * LEVEL_STAR_STEP;
      const star = this.add
        .image(starX, starsY, TEXTURES.star)
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

  // ===== Улучшения =====

  // Табличка «Улучшения»: по строке на каждое мета-улучшение и сколько звёзд можно потратить.
  private showUpgrades(): void {
    this.tablet = new StoneTablet(this, {
      title: 'Улучшения',
      buttons: [{ label: 'Назад', onClick: () => this.switchView('epochs') }],
      isLarge: true,
    });
    META_UPGRADES.forEach((upgrade, index) => this.addUpgradeRow(upgrade, UPGRADES_Y + index * UPGRADE_STEP));

    this.availableText = this.addText(0, UPGRADES_STARS_Y, '', 22, COLORS.hudText, FONT_FAMILY);
    this.tablet.add([this.availableText]);
    this.refreshUpgrades();
  }

  // Строка улучшения на высоте y: иконка, название, что даёт, точки уровней и кнопка с ценой.
  private addUpgradeRow(upgrade: MetaUpgrade, y: number): void {
    const icon = this.add.image(UPGRADE_ICON_X, y, upgrade.icon);
    icon.setScale(UPGRADE_ICON_SIZE / Math.max(icon.width, icon.height));
    const name = this.addText(UPGRADE_TEXT_X, y + UPGRADE_NAME_SHIFT_Y, upgrade.name, 24, COLORS.titleAmber, TITLE_FONT);
    const info = this.addText(UPGRADE_TEXT_X, y + UPGRADE_INFO_SHIFT_Y, upgrade.text, 17, COLORS.hudText, FONT_FAMILY);
    name.setOrigin(0, 0.5);
    info.setOrigin(0, 0.5);

    const pips = upgrade.prices.map((_price, index) =>
      this.add
        .circle(UPGRADE_PIPS_X + index * UPGRADE_PIP_STEP, y, UPGRADE_PIP_RADIUS, COLORS.starOff)
        .setStrokeStyle(2, COLORS.outline),
    );

    const button = this.add
      .image(UPGRADE_BUTTON_X, y, TEXTURES.stoneButton)
      .setScale(UPGRADE_BUTTON_SCALE)
      .setInteractive({ useHandCursor: true });
    const price = this.addText(UPGRADE_BUTTON_X, y - 2, '', 24, COLORS.hudText, TITLE_FONT).setOrigin(0, 0.5);
    const priceStar = this.add.image(0, y - 2, TEXTURES.star).setScale(UPGRADE_PRICE_STAR_SCALE).setTint(COLORS.starOn);

    const row: UpgradeRow = { upgrade, pips, button, price, priceStar };
    button.on('pointerup', () => this.buy(row));
    this.upgradeRows.push(row);
    this.tablet.add([icon, name, info, ...pips, button, price, priceStar]);
  }

  // Купить следующий уровень улучшения. Всё куплено — ничего не происходит;
  // звёзд не хватает — кнопка качается: «пока нельзя».
  private buy(row: UpgradeRow): void {
    const level = getProgress().meta[row.upgrade.id];
    const price = row.upgrade.prices[level];
    if (price === undefined) return;
    if (!buyMetaUpgrade(row.upgrade.id, price)) {
      shake(this, row.button, LOCKED_SHAKE_ANGLE, LOCKED_SHAKE_TIME);
      return;
    }

    this.refreshUpgrades();
    const pip = row.pips[level];
    this.tweens.add({
      targets: pip,
      scale: { from: UPGRADE_PIP_POP_SCALE, to: 1 },
      duration: UPGRADE_PIP_POP_TIME,
      ease: 'Back.easeOut',
    });
    if (this.availableText) pop(this, this.availableText);
  }

  // Показать на строках, что куплено, сколько стоит следующий уровень и хватает ли звёзд.
  private refreshUpgrades(): void {
    const available = getAvailableStars();
    for (const row of this.upgradeRows) {
      const level = getProgress().meta[row.upgrade.id];
      const price = row.upgrade.prices[level];
      row.pips.forEach((pip, index) => pip.setFillStyle(index < level ? COLORS.starOn : COLORS.starOff));

      // Всё куплено — на кнопке «Макс» без звезды.
      const isMax = price === undefined;
      row.price.setText(isMax ? 'Макс' : String(price));
      row.priceStar.setVisible(!isMax);
      // Звезда и цена вместе стоят по середине кнопки.
      const starWidth = isMax ? 0 : row.priceStar.displayWidth + UPGRADE_PRICE_GAP;
      const left = UPGRADE_BUTTON_X - (starWidth + row.price.width) / 2;
      row.priceStar.setX(left + row.priceStar.displayWidth / 2);
      row.price.setX(left + starWidth);
      const canBuy = !isMax && price <= available;
      row.button.setTint(canBuy ? COLORS.white : UPGRADE_DISABLED_TINT);
    }
    this.availableText?.setText('Можно потратить звёзд: ' + available);
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
