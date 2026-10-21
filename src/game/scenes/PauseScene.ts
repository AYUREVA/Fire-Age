import Phaser from 'phaser';
import { StoneTablet } from '../ui/StoneTablet';

// С какими данными GameScene запускает эту сцену — её переходы:
// onResume — PAUSED → PLAYING, onRestart — PAUSED → READY.
export type PauseData = { onResume: () => void; onRestart: () => void };

/**
 * Пауза: табличка «ПАУЗА» с кнопками «Продолжить» и «Заново».
 *
 * GameScene ставит себя на паузу и запускает эту сцену поверх.
 * На паузе в GameScene стоит всё: вождь, жар, таймер, твины и частицы.
 * «Продолжить» (или P / Esc) — табличка закрывается, и игра идёт дальше
 * с того же места. «Заново» — игра создаётся с нуля.
 * Режим игры эта сцена не хранит и не меняет: она только зовёт переходы GameScene.
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

  create(data: PauseData): void {
    // При новом запуске сцены поля сохраняют старые значения — сбрасываем.
    this.isClosing = false;

    this.tablet = new StoneTablet(this, {
      title: 'ПАУЗА',
      buttons: [
        { label: 'Продолжить', onClick: () => this.resumeGame(data.onResume) },
        { label: 'Заново', onClick: data.onRestart },
      ],
    });

    this.input.keyboard?.on('keydown-P', () => this.resumeGame(data.onResume));
    this.input.keyboard?.on('keydown-ESC', () => this.resumeGame(data.onResume));
  }

  // Табличка сжимается и тает, потом GameScene продолжает с того же места.
  private resumeGame(onResume: () => void): void {
    if (this.isClosing) return;
    this.isClosing = true;

    this.tablet.close(onResume);
  }
}
