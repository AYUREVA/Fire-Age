import Phaser from 'phaser';
import { COLORS, toCss } from '../palette';
import { FONT_FAMILY, TEXTURES, TITLE_FONT, createTextures, loadFonts } from '../textures';
import { EPOCHS, LEVELS, LEVELS_PER_EPOCH } from '../data/levels';
import { buyMetaUpgrade, getProgress, getTotalStars, getAvailableStars, isLevelOpen } from '../save';
import { META_UPGRADES, MetaUpgrade } from '../data/metaUpgrades';
import { StoneTablet } from '../ui/StoneTablet';
import { pop, shake } from '../fx';
import { createSounds, toggleMute } from '../sounds';
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

// Какая табличка в меню: карта уровней или улучшения.
type MenuView = 'map' | 'upgrades';
// С какими данными запускается сцена: какую табличку показать (по умолчанию карту).
type MenuData = { view?: MenuView };

// Строка улучшения на табличке: что за улучшение и то, что меняется после покупки.
type UpgradeRow = {
  upgrade: MetaUpgrade;
  pips: Phaser.GameObjects.Arc[]; // точки уровней: купленные — золотые
  button: Phaser.GameObjects.Image; // кнопка покупки
  price: Phaser.GameObjects.Text; // цена следующего уровня или «Макс»
  priceStar: Phaser.GameObjects.Image; // звезда рядом с ценой
};

/**
 * Меню — карта эпох и уровней на большой каменной табличке «Fire Age».
 *
 * С неё начинается игра. Ряд из шести эпох: открыт только каменный век,
 * остальные — тёмные силуэты с замками и названиями. Ниже — пять уровней
 * каменного века: открытые с номером и звёздами, закрытые с замком.
 * Нажал открытый уровень — табличка закрывается, GameScene строит этот
 * уровень и ждёт старта (READY).
 *
 * Кнопка «Улучшения» открывает вторую табличку: мета-улучшения за звёзды
 * (data/metaUpgrades.ts). «Назад» возвращает к карте.
 *
 * Прогресс (звёзды, какие уровни открыты, что куплено) хранит save.ts:
 * меню читает его, а покупку делает функцией buyMetaUpgrade().
 */
export class MenuScene extends Phaser.Scene {
  // Табличка с картой.
  private tablet!: StoneTablet;
  // Снежная земля на весь экран под табличкой.
  private background!: Phaser.GameObjects.TileSprite;
  // Кнопка звука в правом верхнем углу (как в игре).
  private soundButton!: Phaser.GameObjects.Image;
  // Уровень уже выбран, табличка закрывается — повторные нажатия не считаем.
  private isClosing = false;
  // Какую табличку показать: карту или улучшения.
  private view: MenuView = 'map';
  // Строки улучшений и надпись «можно потратить» (на табличке «Улучшения»).
  private upgradeRows: UpgradeRow[] = [];
  private availableText?: Phaser.GameObjects.Text;

  constructor() {
    super('MenuScene');
  }

  // Перед create(): какую табличку показать.
  init(data: MenuData): void {
    this.view = data.view ?? 'map';
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
    } else {
      this.showMap();
    }
  }

  // Карта: эпохи, уровни открытой эпохи, звёзды и кнопка «Улучшения».
  private showMap(): void {
    this.tablet = new StoneTablet(this, {
      title: 'Fire Age',
      buttons: [{ label: 'Улучшения', onClick: () => this.switchView('upgrades') }],
      isLarge: true,
    });
    EPOCHS.forEach((epoch, index) => this.addEpoch(index, epoch.name, epoch.icon));
    this.tablet.add([this.addText(0, EPOCH_TITLE_Y, EPOCHS[0].name, 28, COLORS.titleAmber, TITLE_FONT)]);
    for (let i = 0; i < LEVELS_PER_EPOCH; i++) {
      this.addLevel(i);
    }
    this.addTotalStars();
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

  // ===== Улучшения =====

  // Табличка «Улучшения»: по строке на каждое мета-улучшение и сколько звёзд можно потратить.
  private showUpgrades(): void {
    this.tablet = new StoneTablet(this, {
      title: 'Улучшения',
      buttons: [{ label: 'Назад', onClick: () => this.switchView('map') }],
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
