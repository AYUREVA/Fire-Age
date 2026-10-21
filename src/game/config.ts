import Phaser from 'phaser';
import { GameScene } from './scenes/GameScene';
import { ReadyScene } from './scenes/ReadyScene';
import { PauseScene } from './scenes/PauseScene';
import { ResultScene } from './scenes/ResultScene';

// ===== Размер экрана =====

// Короткая сторона экрана всегда показывает столько игровых пикселей —
// на телефоне и на компьютере, в портрете и в альбоме. Поэтому вождь
// и интерфейс всегда одного размера, а длинная сторона показывает больше мира.
const SCREEN_SHORT_SIDE = 640;
// На компьютере длинная сторона не больше чем в 2 раза длиннее короткой
// (требование Яндекс Игр 1.6.2.2 — оно только для десктопа). Окно ещё шире — по бокам полосы.
// У телефонов экран вытянутее 2:1, поэтому на сенсорном экране ограничения нет: игра на весь экран.
const MAX_ASPECT = 2;
const IS_TOUCH_SCREEN = navigator.maxTouchPoints > 0;

// Размер игры для окна parentWidth × parentHeight: те же пропорции, что у окна
// (на компьютере — не вытянутее 2:1), короткая сторона — SCREEN_SHORT_SIDE.
function screenSize(parentWidth: number, parentHeight: number): { width: number; height: number } {
  const windowAspect = parentWidth / Math.max(1, parentHeight);
  const aspect = IS_TOUCH_SCREEN ? windowAspect : Phaser.Math.Clamp(windowAspect, 1 / MAX_ASPECT, MAX_ASPECT);
  if (aspect >= 1) {
    return { width: Math.round(SCREEN_SHORT_SIDE * aspect), height: SCREEN_SHORT_SIDE };
  }
  return { width: SCREEN_SHORT_SIDE, height: Math.round(SCREEN_SHORT_SIDE / aspect) };
}

export function createGame(parent: string): Phaser.Game {
  const element = document.getElementById(parent);
  if (!element) {
    throw new Error('Game container not found: ' + parent);
  }
  const size = screenSize(element.clientWidth, element.clientHeight);

  const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    parent,
    width: size.width,
    height: size.height,
    backgroundColor: '#0f172a',
    // Первая сцена в списке запускается сама. ReadyScene, PauseScene и ResultScene
    // рисуются поверх GameScene: экран старта, пауза и итог ночи.
    scene: [GameScene, ReadyScene, PauseScene, ResultScene],
    // Долгое нажатие или правый клик не открывают меню браузера (требование 1.6.1.8).
    disableContextMenu: true,
    // По умолчанию Phaser первые 120 кадров после старта считает каждый кадр
    // не длиннее 1/60 секунды. Если компьютер в начале не успевает выдать 60 FPS,
    // вождь и все анимации первые секунды идут медленнее. panicMax: 0 отключает
    // это: с первого кадра время считается честно. От очень длинных кадров
    // (больше 200 мс) Phaser всё равно защищается сам.
    fps: {
      panicMax: 0,
    },
    // FIT растягивает игру на весь контейнер. Пропорции игры совпадают с окном,
    // поэтому полос нет (кроме окон шире 2:1).
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
  };

  const game = new Phaser.Game(config);

  // Окно поменяло размер или телефон повернули — подбираем новый размер игры.
  // Сцены узнают об этом из события 'resize' и переставляют интерфейс.
  window.addEventListener('resize', () => {
    const next = screenSize(element.clientWidth, element.clientHeight);
    game.scale.setGameSize(next.width, next.height);
  });

  return game;
}
