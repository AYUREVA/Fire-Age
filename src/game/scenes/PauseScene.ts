import Phaser from 'phaser';
import { StoneTablet } from '../ui/StoneTablet';

/**
 * Пауза: табличка «ПАУЗА» с кнопками «Продолжить» и «Заново».
 *
 * GameScene ставит себя на паузу и запускает эту сцену поверх.
 * На паузе в GameScene стоит всё: вождь, жар, таймер, твины и частицы.
 * «Продолжить» (или P / Esc) — игра идёт дальше с того же места.
 * «Заново» — GameScene запускается с нуля.
 * Кнопка «В меню» появится в 0.7 вместе с меню.
 */
export class PauseScene extends Phaser.Scene {
  // Табличка «ПАУЗА».
  private tablet!: StoneTablet;
  // Табличка уже закрывается — повторные нажатия не считаем.
  private isClosing = false;

  constructor() {
    super('PauseScene');
  }

  create(): void {
    // При новом запуске сцены поля сохраняют старые значения — сбрасываем.
    this.isClosing = false;

    this.tablet = new StoneTablet(this, {
      title: 'ПАУЗА',
      buttons: [
        { label: 'Продолжить', onClick: () => this.resumeGame() },
        { label: 'Заново', onClick: () => this.restartGame() },
      ],
    });

    this.input.keyboard?.on('keydown-P', () => this.resumeGame());
    this.input.keyboard?.on('keydown-ESC', () => this.resumeGame());
  }

  // Табличка сжимается и тает, потом GameScene продолжает с того же места,
  // а эта сцена закрывается.
  private resumeGame(): void {
    if (this.isClosing) return;
    this.isClosing = true;

    this.tablet.close(() => {
      this.scene.resume('GameScene');
      this.scene.stop();
    });
  }

  // Новая игра: эта сцена закрывается, GameScene перезапускается с нуля.
  private restartGame(): void {
    this.scene.start('GameScene');
  }
}
