import Phaser from 'phaser';
import { COLORS, toCss } from '../palette';
import { STAR_HEAT_MARK } from '../settings';
import { FONT_FAMILY, STAR_PANEL_SIZE, TEXTURES } from '../textures';
import { pop } from '../fx';
import { SOUNDS, SOUND_VOLUMES, playSound } from '../sounds';
import { CARVED_TEXT_SHADOW } from './StoneTablet';

// ===== Раскладка (пиксели экрана) =====

// Плашка на уровне HUD (Hud.ts) — поверх мира и подсказок.
const GOALS_DEPTH = 20000;
// Правый край плашки — на таком отступе от правого края экрана, как кнопка паузы,
// верх — ниже кнопок паузы и звука (Hud.ts).
const PANEL_MARGIN = 16;
const PANEL_TOP = 88;
// Размер плашки и высота одной строки; середина первой строки — от верха плашки.
const PANEL_WIDTH = STAR_PANEL_SIZE.w;
const PANEL_HEIGHT = STAR_PANEL_SIZE.h;
const ROW_STEP = 32;
const FIRST_ROW_Y = 24;
// Звезда строки и начало текста — от левого края плашки.
const STAR_X = 26;
const STAR_SCALE = 0.55;
const TEXT_X = 46;
const FONT_SIZE = '17px';
// Цель провалена: строка бледнеет, звезда почти прозрачная, текст перечёркнут.
const LOST_ALPHA = 0.35;
const STRIKE_HEIGHT = 3;
// Плашка прячется и появляется плавно за столько мс (пока едет табличка дня или ночи).
const FADE_TIME = 250;

// Одна цель звезды: текст для плашки в игре, короткая подпись для итогов
// и выполнена ли она (получена ли звезда).
export type StarGoal = { text: string; short: string; isDone: boolean };

// Цели трёх звёзд по порядку (раздел 5 плана). Звёзды дают только за победу:
// ⭐ — дожил до рассвета; ⭐⭐ — жар ни разу не падал ниже засечки;
// ⭐⭐⭐ — накормлено не меньше starFed путников. Отсюда же считается число звёзд
// (GameScene) и подписи на итогах (ResultScene).
export function describeStarGoals(isWin: boolean, isHeatLost: boolean, fed: number, starFed: number): StarGoal[] {
  const fedShown = Math.min(fed, starFed) + '/' + starFed;
  return [
    { text: 'Доживи до рассвета', short: 'Рассвет', isDone: isWin },
    { text: 'Жар не ниже ' + STAR_HEAT_MARK + '%', short: 'Жар ≥ ' + STAR_HEAT_MARK + '%', isDone: isWin && !isHeatLost },
    { text: 'Накорми путников ' + fedShown, short: 'Путники ' + fedShown, isDone: isWin && fed >= starFed },
  ];
}

/**
 * Плашка «за что звёзды» во время игры: справа под кнопками паузы и звука,
 * три строки — «Доживи до рассвета», «Жар не ниже 25%», «Накорми путников 3/5».
 *
 * Звезда тёмная — цель ещё в процессе. Путников накормлено сколько нужно —
 * звезда загорается со звоном. Жар упал ниже засечки — строка бледнеет
 * и перечёркивается. Звёзды за рассвет и жар подтверждаются только на итогах:
 * до рассвета их ещё можно потерять.
 *
 * Что считать, решает GameScene: каждый кадр она зовёт update().
 */
export class StarGoals {
  private scene: Phaser.Scene;
  // Сколько путников нужно накормить для третьей звезды (из данных уровня).
  private starFed: number;
  // Всё, что на плашке: фон, звёзды, надписи, черта. Двигаем вместе при повороте экрана.
  private container: Phaser.GameObjects.Container;
  // Звезда и надпись каждой строки — по порядку целей.
  private stars: Phaser.GameObjects.Image[] = [];
  private labels: Phaser.GameObjects.Text[] = [];
  // Черта поверх надписи про жар — видна, когда цель провалена.
  private strike: Phaser.GameObjects.Rectangle;
  // Эффекты играют один раз: звезда за путников уже горит, цель про жар уже провалена.
  private isFedDone = false;
  private isHeatLost = false;

  constructor(scene: Phaser.Scene, starFed: number) {
    this.scene = scene;
    this.starFed = starFed;
    this.container = scene.add.container(0, 0).setScrollFactor(0).setDepth(GOALS_DEPTH);

    // Фон — каменная плашка, нарисованная сразу нужного размера (не растянутая картинка).
    this.container.add(scene.add.image(PANEL_WIDTH / 2, PANEL_HEIGHT / 2, TEXTURES.starPanel));
    describeStarGoals(false, false, 0, starFed).forEach((goal, index) => {
      const y = FIRST_ROW_Y + index * ROW_STEP;
      const star = scene.add.image(STAR_X, y, TEXTURES.star).setScale(STAR_SCALE).setTint(COLORS.starOff);
      const label = scene.add
        .text(TEXT_X, y, goal.text, {
          fontFamily: FONT_FAMILY,
          fontSize: FONT_SIZE,
          fontStyle: 'bold',
          color: toCss(COLORS.hudText),
          stroke: toCss(COLORS.outline),
          strokeThickness: 4,
          shadow: CARVED_TEXT_SHADOW,
          resolution: 2,
        })
        .setOrigin(0, 0.5);
      this.stars.push(star);
      this.labels.push(label);
      this.container.add([star, label]);
    });
    const heatLabel = this.labels[1];
    this.strike = scene.add
      .rectangle(TEXT_X, heatLabel.y, heatLabel.width, STRIKE_HEIGHT, COLORS.goalLost)
      .setOrigin(0, 0.5)
      .setVisible(false);
    this.container.add(this.strike);

    // Плашка прижата к правому краю: при повороте телефона её переставляем.
    // Подписка на событие всей игры: при выключении сцены её снимаем.
    this.layout();
    scene.scale.on(Phaser.Scale.Events.RESIZE, this.layout, this);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      scene.scale.off(Phaser.Scale.Events.RESIZE, this.layout, this);
    });
  }

  // Каждый кадр: fed — сколько путников накормлено, isHeatLost — жар хоть раз
  // опускался ниже засечки. Надпись перерисовывается, только если поменялась.
  update(fed: number, isHeatLost: boolean): void {
    const goals = describeStarGoals(false, isHeatLost, fed, this.starFed);
    this.labels[2].setText(goals[2].text);

    if (!this.isFedDone && fed >= this.starFed) {
      this.isFedDone = true;
      this.stars[2].setTint(COLORS.starOn);
      pop(this.scene, this.stars[2], STAR_SCALE);
      pop(this.scene, this.labels[2]);
      playSound(this.scene, SOUNDS.star, SOUND_VOLUMES.star);
    }
    if (!this.isHeatLost && isHeatLost) {
      this.isHeatLost = true;
      this.stars[1].setAlpha(LOST_ALPHA);
      this.labels[1].setAlpha(LOST_ALPHA);
      this.strike.setVisible(true);
      pop(this.scene, this.labels[1]);
    }
  }

  // Спрятать или показать плашку — плавно. Прячет сцена, пока едет табличка дня или ночи.
  setVisible(isVisible: boolean): void {
    this.scene.tweens.killTweensOf(this.container);
    this.scene.tweens.add({ targets: this.container, alpha: isVisible ? 1 : 0, duration: FADE_TIME });
  }

  // Правый верхний угол текущего экрана, под кнопками.
  private layout(): void {
    this.container.setPosition(this.scene.scale.width - PANEL_MARGIN - PANEL_WIDTH, PANEL_TOP);
  }
}
