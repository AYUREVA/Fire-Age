import Phaser from 'phaser';
import { GameScene } from './scenes/GameScene';
import { PauseScene } from './scenes/PauseScene';
import { ResultScene } from './scenes/ResultScene';

export function createGame(parent: string): Phaser.Game {
  const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    parent,
    width: 960,
    height: 640,
    backgroundColor: '#0f172a',
    // Первая сцена в списке запускается сама. PauseScene и ResultScene
    // рисуются поверх GameScene: пауза и итог ночи.
    scene: [GameScene, PauseScene, ResultScene],
    // По умолчанию Phaser первые 120 кадров после старта считает каждый кадр
    // не длиннее 1/60 секунды. Если компьютер в начале не успевает выдать 60 FPS,
    // вождь и все анимации первые секунды идут медленнее. panicMax: 0 отключает
    // это: с первого кадра время считается честно. От очень длинных кадров
    // (больше 200 мс) Phaser всё равно защищается сам.
    fps: {
      panicMax: 0,
    },
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
  };

  return new Phaser.Game(config);
}
