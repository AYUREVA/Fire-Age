import Phaser from 'phaser';
import { COLORS, toCss } from '../palette';
import { FONT_FAMILY, TEXTURES, TITLE_FONT } from '../textures';

// ===== Затемнение =====

// Насколько затемняется игра под табличкой и за сколько мс.
const OVERLAY_ALPHA = 0.55;
const OVERLAY_FADE_TIME = 250;

// ===== Раскладка таблички (от её середины, пиксели) =====

// Где заголовок, подзаголовок и ряд кнопок.
const TITLE_Y = -70;
const SUBTITLE_Y = -12;
const BUTTONS_Y = 52;
// Расстояние между серединами соседних кнопок.
const BUTTON_STEP = 228;
// Блик над заголовком и тень под ним сдвинуты на столько пикселей.
const TITLE_HIGHLIGHT_SHIFT = 2;
const TITLE_SHADOW_SHIFT = 4;

// ===== Появление =====

// Табличка падает сверху и отскакивает от «земли».
const DROP_TIME = 800;
// Ease 'Bounce.easeOut' первый раз касается цели на 1/2.75 всего времени —
// в этот миг из-под таблички вылетает облачко.
const FIRST_BOUNCE_SHARE = 1 / 2.75;
// Облачко снега и каменной пыли: сколько частиц с каждого угла.
const DUST_COUNT = 10;
// Насколько ниже середины таблички её нижний край, где вылетает облачко.
const DUST_OFFSET_Y = 135;
// Насколько левее и правее середины углы, откуда вылетает облачко.
const DUST_OFFSET_X = 220;
const DUST: Phaser.Types.GameObjects.Particles.ParticleEmitterConfig = {
  speed: { min: 60, max: 180 },
  angle: { min: 190, max: 350 }, // вверх и в стороны
  lifespan: { min: 400, max: 750 },
  scale: { start: 1.2, end: 0 },
  alpha: { start: 0.9, end: 0 },
  gravityY: 260,
  tint: [COLORS.snowLight, COLORS.snowShade, COLORS.tabletLight],
  emitting: false, // частицы вылетают только по команде explode
};

// ===== Кнопки =====

// Кнопка обычно чуть темнее, при наведении — светлеет до настоящего цвета.
const BUTTON_IDLE_TINT = 0xd8d8d8;
const BUTTON_HOVER_TINT = 0xffffff;
// Нажатая кнопка «вдавливается»: уменьшается и опускается.
const BUTTON_PRESS_SCALE = 0.95;
const BUTTON_PRESS_SHIFT = 3;
// Надпись на кнопке чуть выше середины картинки: снизу у кнопки тёмный «торец».
const BUTTON_LABEL_Y = -3;

// Кнопка на табличке: надпись и что делать по нажатию.
export type TabletButton = { label: string; onClick: () => void };

// Что показать на табличке.
export type TabletContent = {
  title: string; // крупный «высеченный» заголовок
  subtitle?: string; // строка под заголовком (может не быть)
  buttons: TabletButton[]; // кнопки в ряд внизу
};

/**
 * Каменная табличка — общее окно игры (пауза, итоги).
 *
 * Затемняет экран и падает сверху с отскоком: в момент касания
 * из-под неё вылетает облачко снега. Заголовок «высечен» в камне:
 * янтарный, со светлым бликом сверху и тёмной тенью снизу.
 * Кнопки — каменные плашки: светлеют при наведении, «вдавливаются» при нажатии.
 *
 * Табличка живёт в своей сцене (PauseScene, ResultScene), поэтому
 * координаты — экранные. Сама ничего не решает: по нажатию зовёт onClick.
 */
export class StoneTablet {
  private scene: Phaser.Scene;
  // Всё, что лежит на табличке: камень, надписи, кнопки. Двигаются вместе.
  private container: Phaser.GameObjects.Container;

  constructor(scene: Phaser.Scene, content: TabletContent) {
    this.scene = scene;
    const { width, height } = scene.scale;
    const centerX = width / 2;
    const centerY = height / 2;

    // Затемнение под табличкой плавно проявляется.
    const overlay = scene.add.rectangle(0, 0, width, height, COLORS.overlay).setOrigin(0, 0).setAlpha(0);
    scene.tweens.add({ targets: overlay, alpha: OVERLAY_ALPHA, duration: OVERLAY_FADE_TIME });

    // Табличка начинает выше экрана.
    this.container = scene.add.container(centerX, -height / 2);
    this.container.add(scene.add.image(0, 0, TEXTURES.stoneTablet));
    this.addTitle(content.title);
    if (content.subtitle) this.addSubtitle(content.subtitle);
    content.buttons.forEach((button, index) => {
      // Кнопки стоят в ряд по центру: для двух кнопок — по половине шага влево и вправо.
      const x = (index - (content.buttons.length - 1) / 2) * BUTTON_STEP;
      this.addButton(x, BUTTONS_Y, button);
    });

    this.drop(centerX, centerY);
  }

  // ===== Надписи =====

  // Заголовок «высечен» в камне: снизу блик, сверху янтарный текст с тёмной тенью.
  private addTitle(text: string): void {
    const style: Phaser.Types.GameObjects.Text.TextStyle = {
      fontFamily: TITLE_FONT,
      fontSize: '52px',
      color: toCss(COLORS.titleHighlight),
      resolution: 2,
    };
    // Блик: светлая копия чуть выше — как свет на верхнем крае выбитых букв.
    const highlight = this.scene.add.text(0, TITLE_Y - TITLE_HIGHLIGHT_SHIFT, text, style).setOrigin(0.5);
    const title = this.scene.add
      .text(0, TITLE_Y, text, {
        ...style,
        color: toCss(COLORS.titleAmber),
        stroke: toCss(COLORS.outline),
        strokeThickness: 6,
        shadow: {
          offsetY: TITLE_SHADOW_SHIFT,
          color: toCss(COLORS.outline),
          fill: true,
          stroke: true,
        },
      })
      .setOrigin(0.5);
    this.container.add([highlight, title]);
  }

  // Строка под заголовком — обычным шрифтом, светлая.
  private addSubtitle(text: string): void {
    const subtitle = this.scene.add
      .text(0, SUBTITLE_Y, text, {
        fontFamily: FONT_FAMILY,
        fontSize: '24px',
        fontStyle: 'bold',
        color: toCss(COLORS.hudText),
        stroke: toCss(COLORS.outline),
        strokeThickness: 5,
        resolution: 2,
      })
      .setOrigin(0.5);
    this.container.add(subtitle);
  }

  // ===== Кнопки =====

  // Каменная кнопка с надписью. onClick сработает, только если кнопку нажали
  // и отпустили на ней: просто отпущенная над кнопкой мышь её не нажимает.
  private addButton(x: number, y: number, button: TabletButton): void {
    const image = this.scene.add.image(x, y, TEXTURES.stoneButton).setTint(BUTTON_IDLE_TINT);
    const label = this.scene.add
      .text(x, y + BUTTON_LABEL_Y, button.label, {
        fontFamily: TITLE_FONT,
        fontSize: '26px',
        color: toCss(COLORS.hudText),
        stroke: toCss(COLORS.outline),
        strokeThickness: 5,
        resolution: 2,
      })
      .setOrigin(0.5);
    this.container.add([image, label]);

    // Нажата ли кнопка сейчас (палец или мышь опущены на ней).
    let isPressed = false;
    // Показать кнопку нажатой или отпущенной: и картинка, и надпись двигаются вместе.
    const setPressed = (pressed: boolean): void => {
      isPressed = pressed;
      const scale = pressed ? BUTTON_PRESS_SCALE : 1;
      const shift = pressed ? BUTTON_PRESS_SHIFT : 0;
      image.setScale(scale).setY(y + shift);
      label.setScale(scale).setY(y + BUTTON_LABEL_Y + shift);
    };

    image.setInteractive({ useHandCursor: true });
    image.on('pointerover', () => image.setTint(BUTTON_HOVER_TINT));
    image.on('pointerout', () => {
      image.setTint(BUTTON_IDLE_TINT);
      setPressed(false);
    });
    image.on('pointerdown', () => setPressed(true));
    image.on('pointerup', () => {
      if (!isPressed) return;
      setPressed(false);
      button.onClick();
    });
  }

  // ===== Появление =====

  // Табличка падает в середину экрана с отскоком, при касании — облачко снега.
  private drop(centerX: number, centerY: number): void {
    this.scene.tweens.add({
      targets: this.container,
      y: centerY,
      duration: DROP_TIME,
      ease: 'Bounce.easeOut',
    });

    const dust = this.scene.add.particles(0, 0, TEXTURES.snowflake, DUST);
    this.scene.time.delayedCall(DROP_TIME * FIRST_BOUNCE_SHARE, () => {
      dust.explode(DUST_COUNT, centerX - DUST_OFFSET_X, centerY + DUST_OFFSET_Y);
      dust.explode(DUST_COUNT, centerX + DUST_OFFSET_X, centerY + DUST_OFFSET_Y);
    });
  }
}
