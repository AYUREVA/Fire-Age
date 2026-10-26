import Phaser from 'phaser';
import { COLORS, toCss } from '../palette';
import { FONT_FAMILY, TEXTURES, TITLE_FONT } from '../textures';

// ===== Затемнение =====

// Насколько затемняется игра под табличкой и за сколько мс.
const OVERLAY_ALPHA = 0.55;
const OVERLAY_FADE_TIME = 250;

// ===== Раскладка таблички (от её середины, пиксели) =====

// Где заголовок, подзаголовок и ряд кнопок. Плита в картинке чуть ниже её середины:
// сверху место занимает снег.
const TITLE_Y = -60;
const SUBTITLE_Y = -2;
const BUTTONS_Y = 62;
// На большой табличке (меню, итоги) заголовок наверху, кнопки внизу,
// а между ними место для того, что кладёт сцена (add()).
const LARGE_TITLE_Y = -200;
const LARGE_SUBTITLE_Y = -146;
const LARGE_BUTTONS_Y = 212;
// Расстояние между серединами соседних кнопок.
const BUTTON_STEP = 228;
// Три кнопки в ряд не помещаются на табличку — они меньше и стоят теснее.
const THREE_BUTTONS_STEP = 186;
const THREE_BUTTONS_SCALE = 0.82;
// Блик над заголовком и тень под ним сдвинуты на столько пикселей.
const TITLE_HIGHLIGHT_SHIFT = 2;
const TITLE_SHADOW_SHIFT = 4;
// Размер заголовка на табличке паузы и итогов.
const TITLE_FONT_SIZE = 52;

// ===== Появление и закрытие =====

// Табличка появляется: вырастает из этого размера и прозрачности до полного.
const SHOW_START_SCALE = 0.85;
// За сколько мс. Ease 'Back.easeOut' чуть проскакивает полный размер (примерно 103%)
// и возвращается — получается мягкий «поп» без долгих отскоков.
const SHOW_TIME = 300;
const SHOW_EASE = 'Back.easeOut';
// Табличка закрывается: сжимается до этого размера и тает за столько мс.
const CLOSE_SCALE = 0.9;
const CLOSE_TIME = 150;

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
  buttons: TabletButton[]; // кнопки в ряд внизу (не больше трёх)
  isLarge?: boolean; // большая табличка: меню и итоги
};

// «Высеченный» заголовок — один стиль для всех табличек (пауза, итоги, баннеры фаз):
// снизу светлая копия чуть выше (блик на верхнем крае выбитых букв),
// сверху янтарный текст с тёмной обводкой и тенью. (x, y) — середина надписи.
// Возвращает обе надписи — их кладут в контейнер таблички.
export function addCarvedTitle(
  scene: Phaser.Scene,
  x: number,
  y: number,
  text: string,
  fontSize: number,
): Phaser.GameObjects.Text[] {
  const style: Phaser.Types.GameObjects.Text.TextStyle = {
    fontFamily: TITLE_FONT,
    fontSize: fontSize + 'px',
    color: toCss(COLORS.titleHighlight),
    resolution: 2,
  };
  const highlight = scene.add.text(x, y - TITLE_HIGHLIGHT_SHIFT, text, style).setOrigin(0.5);
  const title = scene.add
    .text(x, y, text, {
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
  return [highlight, title];
}

/**
 * Каменная табличка — общее окно игры (старт уровня, пауза, итоги, меню).
 *
 * Затемняет экран и мягко «выпрыгивает» в середине: вырастает
 * с маленьким перелётом. close() — сжимается и тает. Заголовок «высечен» в камне:
 * янтарный, со светлым бликом сверху и тёмной тенью снизу.
 * Кнопки — каменные плашки: светлеют при наведении, «вдавливаются» при нажатии.
 *
 * Табличка живёт в своей сцене (PauseScene, ResultScene), поэтому
 * координаты — экранные. Сама ничего не решает: по нажатию зовёт onClick.
 */
export class StoneTablet {
  private scene: Phaser.Scene;
  // Затемнение экрана под табличкой.
  private overlay: Phaser.GameObjects.Rectangle;
  // Всё, что лежит на табличке: камень, надписи, кнопки. Двигаются вместе.
  private container: Phaser.GameObjects.Container;
  // Кнопки таблички и всё, что можно нажать на ней (add()), — при закрытии
  // их выключаем, чтобы не нажать дважды.
  private buttons: Phaser.GameObjects.GameObject[] = [];

  constructor(scene: Phaser.Scene, content: TabletContent) {
    this.scene = scene;
    const { width, height } = scene.scale;

    // Затемнение под табличкой плавно проявляется.
    this.overlay = scene.add.rectangle(0, 0, width, height, COLORS.overlay).setOrigin(0, 0).setAlpha(0);
    scene.tweens.add({ targets: this.overlay, alpha: OVERLAY_ALPHA, duration: OVERLAY_FADE_TIME });

    // Табличка сразу в середине экрана, но пока маленькая и прозрачная.
    // Контейнер масштабируется от своей точки — от середины таблички.
    this.container = scene.add
      .container(width / 2, height / 2)
      .setScale(SHOW_START_SCALE)
      .setAlpha(0);
    const isLarge = content.isLarge === true;
    this.container.add(scene.add.image(0, 0, isLarge ? TEXTURES.stoneTabletLarge : TEXTURES.stoneTablet));
    this.container.add(addCarvedTitle(scene, 0, isLarge ? LARGE_TITLE_Y : TITLE_Y, content.title, TITLE_FONT_SIZE));
    if (content.subtitle) this.addSubtitle(content.subtitle, isLarge ? LARGE_SUBTITLE_Y : SUBTITLE_Y);
    const isThree = content.buttons.length >= 3;
    const step = isThree ? THREE_BUTTONS_STEP : BUTTON_STEP;
    const scale = isThree ? THREE_BUTTONS_SCALE : 1;
    content.buttons.forEach((button, index) => {
      // Кнопки стоят в ряд по центру: для двух кнопок — по половине шага влево и вправо.
      const x = (index - (content.buttons.length - 1) / 2) * step;
      this.addButton(x, isLarge ? LARGE_BUTTONS_Y : BUTTONS_Y, button, scale);
    });

    // Мягкий «поп»: табличка вырастает до полного размера и проявляется.
    scene.tweens.add({
      targets: this.container,
      scale: 1,
      alpha: 1,
      duration: SHOW_TIME,
      ease: SHOW_EASE,
    });

    // Экран поменял размер (повернули телефон) — затемнение снова на весь экран,
    // табличка снова в середине. Подписка на событие всей игры: при выключении сцены её снимаем.
    scene.scale.on(Phaser.Scale.Events.RESIZE, this.layout, this);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      scene.scale.off(Phaser.Scale.Events.RESIZE, this.layout, this);
    });
  }

  // Затемнение — на весь текущий экран, табличка — в его середине.
  private layout(): void {
    const { width, height } = this.scene.scale;
    this.overlay.setSize(width, height);
    this.container.setPosition(width / 2, height / 2);
  }

  // Положить на табличку свои картинки и надписи (меню, итоги). Координаты —
  // от середины таблички; они двигаются и масштабируются вместе с ней.
  // Если среди них есть кнопки (setInteractive), при закрытии они выключатся.
  add(objects: Phaser.GameObjects.GameObject[]): void {
    this.container.add(objects);
    this.buttons.push(...objects.filter((object) => object.input !== null));
  }

  // Закрыть табличку: она сжимается и тает вместе с затемнением,
  // потом вызывается onClosed (например, игра продолжается).
  close(onClosed: () => void): void {
    for (const button of this.buttons) {
      button.disableInteractive();
    }

    this.scene.tweens.add({ targets: this.overlay, alpha: 0, duration: CLOSE_TIME });
    this.scene.tweens.add({
      targets: this.container,
      scale: CLOSE_SCALE,
      alpha: 0,
      duration: CLOSE_TIME,
      ease: 'Sine.easeIn',
      onComplete: onClosed,
    });
  }

  // ===== Надписи =====

  // Строка под заголовком — обычным шрифтом, светлая.
  private addSubtitle(text: string, y: number): void {
    const subtitle = this.scene.add
      .text(0, y, text, {
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
  // baseScale — размер кнопки (три кнопки в ряд меньше).
  private addButton(x: number, y: number, button: TabletButton, baseScale: number): void {
    const image = this.scene.add.image(x, y, TEXTURES.stoneButton).setTint(BUTTON_IDLE_TINT).setScale(baseScale);
    const label = this.scene.add
      .text(x, y + BUTTON_LABEL_Y, button.label, {
        fontFamily: TITLE_FONT,
        fontSize: '26px',
        color: toCss(COLORS.hudText),
        stroke: toCss(COLORS.outline),
        strokeThickness: 5,
        resolution: 2,
      })
      .setOrigin(0.5)
      .setScale(baseScale);
    this.container.add([image, label]);
    this.buttons.push(image);

    // Нажата ли кнопка сейчас (палец или мышь опущены на ней).
    let isPressed = false;
    // Показать кнопку нажатой или отпущенной: и картинка, и надпись двигаются вместе.
    const setPressed = (pressed: boolean): void => {
      isPressed = pressed;
      const scale = baseScale * (pressed ? BUTTON_PRESS_SCALE : 1);
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
}
