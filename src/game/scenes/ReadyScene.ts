import Phaser from 'phaser';
import { StoneTablet } from '../ui/StoneTablet';

// Подзаголовок таблички (раздел 5 плана). Заголовок — название уровня.
const SUBTITLE = 'Нажми, чтобы начать';

// Через сколько мс после начала показа касание, клик или клавиша запускают игру.
// Пока табличка появляется, ввод не принимаем: иначе палец или Enter,
// которыми только что нажали «Заново», сразу запустили бы новую игру.
const READY_INPUT_DELAY = 500;

// С какими данными GameScene запускает эту сцену.
// title — название уровня, onStart — переход READY → PLAYING (его делает GameScene).
export type ReadyData = { title: string; onStart: () => void };

/**
 * Экран старта (режим READY): табличка с названием уровня и «Нажми, чтобы начать».
 *
 * GameScene строит мир, ставит себя на паузу и запускает эту сцену поверх:
 * мир виден, но стоит — время суток, жар и путники не идут.
 * Касание, клик или любая клавиша — табличка закрывается, и сцена зовёт
 * onStart. Режим игры эта сцена не хранит и не меняет — это делает GameScene.
 */
export class ReadyScene extends Phaser.Scene {
  // Табличка с названием уровня.
  private tablet!: StoneTablet;
  // Табличка уже закрывается — повторные нажатия не считаем.
  private isClosing = false;

  constructor() {
    super('ReadyScene');
  }

  create(data: ReadyData): void {
    // При новом запуске сцены поля сохраняют старые значения — сбрасываем.
    this.isClosing = false;

    this.tablet = new StoneTablet(this, { title: data.title, subtitle: SUBTITLE, buttons: [] });

    // Касание, клик или любая клавиша — старт, но не сразу.
    this.time.delayedCall(READY_INPUT_DELAY, () => {
      this.input.once('pointerdown', () => this.start(data.onStart));
      this.input.keyboard?.once('keydown', () => this.start(data.onStart));
    });
  }

  // Табличка сжимается и тает, потом GameScene начинает игру.
  private start(onStart: () => void): void {
    if (this.isClosing) return;
    this.isClosing = true;

    this.tablet.close(onStart);
  }
}
