import Phaser from 'phaser';
import { COLORS, toCss } from '../palette';
import { FONT_FAMILY, TEXTURES } from '../textures';
import { LevelStats } from '../analytics';
import { StoneTablet, TabletButton } from '../ui/StoneTablet';
import { pop } from '../fx';

// Надписи на табличке (раздел 5 плана).
const WIN_TITLE = 'РАССВЕТ!';
const WIN_SUBTITLE = 'Племя пережило ночь';
const LOSE_TITLE = 'КОСТЁР ПОГАС';
const LOSE_SUBTITLE = 'Племя замёрзло…';

// ===== Раскладка (от середины большой таблички, пиксели) =====

// Ряд из трёх звёзд под подзаголовком.
const STARS_Y = -88;
const STAR_STEP = 74;
const STAR_SCALE = 1.6;
// Сколько звёзд можно получить за уровень.
const MAX_STARS = 3;
// Строки статистики: где первая, расстояние между строками,
// где начинается название и где кончается число.
const ROWS_Y = -28;
const ROW_STEP = 29;
const ROW_LABEL_X = -210;
const ROW_VALUE_X = 210;

// ===== Анимация =====

// Числа набегают от нуля за столько мс.
const COUNT_UP_TIME = 700;
// Звёзды «впечатываются» по одной: первая — через столько мс после появления таблички,
// следующие — через STAR_STAMP_STEP. Звезда падает из большого размера за STAR_STAMP_TIME.
const STAR_FIRST_DELAY = 500;
const STAR_STAMP_STEP = 380;
const STAR_STAMP_TIME = 260;
const STAR_STAMP_START_SCALE = 3.2;

// С какими данными GameScene запускает эту сцену.
// isWin — победа или поражение, stars — сколько звёзд получено (0–3),
// stats — статистика уровня, days — сколько суток пережито, hasWolves — были ли волки на уровне.
// Переходы делает GameScene: onRestart — RESULT → READY того же уровня,
// onMenu — RESULT → меню, onNext — RESULT → READY следующего уровня
// (его нет, если уровень проигран или он последний).
export type ResultData = {
  isWin: boolean;
  stars: number;
  stats: LevelStats;
  days: number;
  hasWolves: boolean;
  onRestart: () => void;
  onMenu: () => void;
  onNext?: () => void;
};

/**
 * Итог уровня на большой каменной табличке: «РАССВЕТ!» или «КОСТЁР ПОГАС»,
 * звёзды и мини-статистика (раздел 5 плана).
 *
 * GameScene ставит себя на паузу и запускает эту сцену поверх
 * (её видно под затемнением). Числа набегают от нуля, звёзды «впечатываются»
 * по одной. Кнопки: «Дальше» (только после победы, если есть следующий уровень),
 * «Заново» и «В меню».
 * Режим игры эта сцена не хранит и не меняет: если кнопку нажали дважды,
 * второй раз переход уже недопустим и ничего не делает.
 */
export class ResultScene extends Phaser.Scene {
  // Табличка итогов.
  private tablet!: StoneTablet;

  constructor() {
    super('ResultScene');
  }

  create(data: ResultData): void {
    const buttons: TabletButton[] = [];
    if (data.onNext) buttons.push({ label: 'Дальше', onClick: data.onNext });
    buttons.push({ label: 'Заново', onClick: data.onRestart });
    buttons.push({ label: 'В меню', onClick: data.onMenu });

    this.tablet = new StoneTablet(this, {
      title: data.isWin ? WIN_TITLE : LOSE_TITLE,
      subtitle: data.isWin ? WIN_SUBTITLE : LOSE_SUBTITLE,
      buttons,
      isLarge: true,
    });

    this.addStars(data.stars);
    this.addRows(data);
  }

  // ===== Звёзды =====

  // Три места для звёзд. Полученные по одной падают на своё место из большого
  // размера и «пружинят»; остальные остаются тёмными.
  private addStars(stars: number): void {
    for (let i = 0; i < MAX_STARS; i++) {
      const x = (i - (MAX_STARS - 1) / 2) * STAR_STEP;
      const slot = this.add.image(x, STARS_Y, TEXTURES.star).setScale(STAR_SCALE).setTint(COLORS.starOff);
      this.tablet.add([slot]);
      if (i >= stars) continue;

      const star = this.add
        .image(x, STARS_Y, TEXTURES.star)
        .setScale(STAR_STAMP_START_SCALE)
        .setAlpha(0)
        .setTint(COLORS.starOn);
      this.tablet.add([star]);
      this.tweens.add({
        targets: star,
        scale: STAR_SCALE,
        alpha: 1,
        delay: STAR_FIRST_DELAY + i * STAR_STAMP_STEP,
        duration: STAR_STAMP_TIME,
        ease: 'Quad.easeIn',
        onComplete: () => pop(this, star, STAR_SCALE),
      });
    }
  }

  // ===== Статистика =====

  // Строки статистики: название слева, число справа. Числа набегают от нуля.
  // «Отогнано волков» — только на уровнях с волками.
  private addRows(data: ResultData): void {
    const { stats } = data;
    const rows: [string, number][] = [
      ['Пережито суток', data.days],
      ['Добыто хвороста', stats.woodGathered],
      ['Пожарено мяса', stats.meatCooked],
      ['Накормлено путников', stats.fed],
      ['Ушло голодными', stats.hungry],
      ['Заработано клыков', stats.tusksEarned],
    ];
    if (data.hasWolves) rows.push(['Отогнано волков', stats.wolvesDriven]);

    rows.forEach(([name, value], index) => {
      const y = ROWS_Y + index * ROW_STEP;
      const label = this.addRowText(ROW_LABEL_X, y, name).setOrigin(0, 0.5);
      const number = this.addRowText(ROW_VALUE_X, y, '0').setOrigin(1, 0.5);
      this.tablet.add([label, number]);
      this.tweens.addCounter({
        from: 0,
        to: value,
        duration: COUNT_UP_TIME,
        onUpdate: (tween) => number.setText(String(Math.round(tween.getValue() ?? 0))),
      });
    });
  }

  // Надпись строки статистики.
  private addRowText(x: number, y: number, text: string): Phaser.GameObjects.Text {
    return this.add.text(x, y, text, {
      fontFamily: FONT_FAMILY,
      fontSize: '21px',
      fontStyle: 'bold',
      color: toCss(COLORS.hudText),
      stroke: toCss(COLORS.outline),
      strokeThickness: 4,
      resolution: 2,
    });
  }
}
