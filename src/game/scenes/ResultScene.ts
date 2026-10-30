import Phaser from 'phaser';
import { COLORS, toCss } from '../palette';
import { FONT_FAMILY, TEXTURES } from '../textures';
import { LevelStats } from '../analytics';
import { CARVED_TEXT_SHADOW, StoneTablet, TabletButton } from '../ui/StoneTablet';
import { pop } from '../fx';
import { SOUNDS, SOUND_VOLUMES, playSound } from '../sounds';
import { StarGoal } from '../ui/StarGoals';

// Надписи на табличке (раздел 5 плана).
const WIN_TITLE = 'РАССВЕТ!';
const WIN_SUBTITLE = 'Племя пережило ночь';
const LOSE_TITLE = 'КОСТЁР ПОГАС';
const LOSE_SUBTITLE = 'Племя замёрзло…';

// ===== Раскладка (от середины большой таблички, пиксели) =====

// Ряд из трёх звёзд под подзаголовком. Под каждой — подпись: за что звезда и выполнено ли.
const STARS_Y = -88;
const STAR_STEP = 150;
const STAR_SCALE = 1.6;
const CAPTION_Y = -46;
const CAPTION_FONT_SIZE = 18;
// Подпись невыполненной цели бледнее.
const CAPTION_MISSED_ALPHA = 0.6;
// Строки статистики: где первая, расстояние между строками,
// где начинается название и где кончается число.
const ROWS_Y = -8;
const ROW_STEP = 27;
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
// isWin — победа или поражение, starGoals — цели трёх звёзд и выполнена ли каждая,
// stats — статистика уровня, days — сколько суток пережито, hasWolves — были ли волки на уровне.
// Переходы делает GameScene: onRestart — RESULT → READY того же уровня,
// onMenu — RESULT → меню, onNext — RESULT → READY следующего уровня
// (его нет, если уровень проигран или он последний).
export type ResultData = {
  isWin: boolean;
  starGoals: StarGoal[];
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

    this.addStars(data.starGoals);
    this.addRows(data);
  }

  // ===== Звёзды =====

  // Три места для звёзд — по одному на цель. Звёзды выполненных целей по одной падают
  // на своё место из большого размера и «пружинят»; остальные остаются тёмными.
  // Под каждой звездой — подпись цели: «✓ Рассвет» (янтарная) или «✗ Путники 4/5» (бледная).
  private addStars(goals: StarGoal[]): void {
    for (let i = 0; i < goals.length; i++) {
      const goal = goals[i];
      const x = (i - (goals.length - 1) / 2) * STAR_STEP;
      const slot = this.add.image(x, STARS_Y, TEXTURES.star).setScale(STAR_SCALE).setTint(COLORS.starOff);
      const caption = this.addRowText(x, CAPTION_Y, (goal.isDone ? '✓ ' : '✗ ') + goal.short)
        .setOrigin(0.5)
        .setFontSize(CAPTION_FONT_SIZE)
        .setColor(toCss(goal.isDone ? COLORS.starOn : COLORS.hudText))
        .setAlpha(goal.isDone ? 1 : CAPTION_MISSED_ALPHA);
      this.tablet.add([slot, caption]);
      if (!goal.isDone) continue;

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
        // Звезда впечаталась: «пружинка» и звон.
        onComplete: () => {
          pop(this, star, STAR_SCALE);
          playSound(this, SOUNDS.star, SOUND_VOLUMES.star);
        },
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
      shadow: CARVED_TEXT_SHADOW,
      resolution: 2,
    });
  }
}
