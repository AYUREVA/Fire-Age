import Phaser from 'phaser';
import { StoneTablet } from '../ui/StoneTablet';

// Надписи на табличке (раздел 5 плана).
const WIN_TITLE = 'РАССВЕТ!';
const WIN_SUBTITLE = 'Племя пережило ночь';
const LOSE_TITLE = 'КОСТЁР ПОГАС';
const LOSE_SUBTITLE = 'Племя замёрзло…';

// Через сколько мс после появления таблички клик или клавиша перезапускают игру.
// Пока табличка падает, ввод не принимаем: иначе мышь, зажатая как джойстик
// в момент конца игры, сразу перезапустила бы её.
const RESULT_INPUT_DELAY = 700;

// С какими данными GameScene запускает эту сцену.
export type ResultData = { isWin: boolean };

/**
 * Итог ночи: «Рассвет!» или «Костёр погас» на каменной табличке.
 *
 * GameScene ставит себя на паузу и запускает эту сцену поверх
 * (её видно под затемнением). Рестарт — кнопка «Заново», пробел, Enter
 * или клик в любом месте: GameScene запускается заново с нуля.
 */
export class ResultScene extends Phaser.Scene {
  constructor() {
    super('ResultScene');
  }

  create(data: ResultData): void {
    new StoneTablet(this, {
      title: data.isWin ? WIN_TITLE : LOSE_TITLE,
      subtitle: data.isWin ? WIN_SUBTITLE : LOSE_SUBTITLE,
      buttons: [{ label: 'Заново', onClick: () => this.restartGame() }],
    });

    // Клик в любом месте, пробел или Enter — тоже «Заново», но не сразу.
    this.time.delayedCall(RESULT_INPUT_DELAY, () => {
      this.input.once('pointerdown', () => this.restartGame());
      this.input.keyboard?.once('keydown-SPACE', () => this.restartGame());
      this.input.keyboard?.once('keydown-ENTER', () => this.restartGame());
    });
  }

  // Новая игра: эта сцена закрывается, GameScene перезапускается с нуля.
  private restartGame(): void {
    this.scene.start('GameScene');
  }
}
