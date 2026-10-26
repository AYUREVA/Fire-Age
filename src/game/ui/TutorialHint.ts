import Phaser from 'phaser';
import { COLORS, toCss } from '../palette';
import { TEXTURES, TITLE_FONT } from '../textures';
import { Point, pop } from '../fx';

// Подсказка поверх мира, но под HUD (20000, Hud.ts).
const HINT_DEPTH = 19000;
// Стрелка висит над целью на такой высоте и покачивается вверх-вниз: на сколько пикселей и за сколько мс.
const ARROW_LIFT = 110;
const ARROW_BOB = 14;
const ARROW_BOB_TIME = 450;
// Цель за краем экрана — стрелка стоит у края, отступив от него на столько пикселей:
// по бокам, сверху (ниже плашек HUD) и снизу (выше плашки с текстом).
const EDGE_MARGIN_SIDE = 56;
const EDGE_MARGIN_TOP = 140;
const EDGE_MARGIN_BOTTOM = 150;
// Плашка с текстом — внизу экрана, её середина на столько выше нижнего края.
const PLATE_BOTTOM = 70;
// Плашка шире текста на столько пикселей (по бокам) и такой высоты.
const PLATE_PADDING = 48;
const PLATE_HEIGHT = 58;

/**
 * Подсказка обучения на первом уровне: прыгающая стрелка над целью
 * и плашка с текстом шага внизу экрана («Сруби куст»).
 *
 * Хранит номер шага. Что считается выполненным и куда показывать, решает
 * systems/Tutorial.ts: каждый кадр он зовёт show() или nextStep().
 * Если цель за краем экрана, стрелка стоит у края и смотрит в её сторону.
 */
export class TutorialHint {
  // Номер текущего шага (с нуля). Меняет только nextStep().
  step = 0;

  private scene: Phaser.Scene;
  // Стрелка над целью в мире.
  private arrow: Phaser.GameObjects.Image;
  // Стрелка у края экрана, когда цель не видна.
  private edgeArrow: Phaser.GameObjects.Image;
  // Плашка и текст шага внизу экрана.
  private plate: Phaser.GameObjects.Image;
  private label: Phaser.GameObjects.Text;
  // Сколько мс идёт подсказка — из этого считается покачивание стрелки.
  private time = 0;
  // Все шаги пройдены — подсказка спрятана.
  private isFinished = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.arrow = scene.add.image(0, 0, TEXTURES.tutorialArrow).setOrigin(0.5, 1).setDepth(HINT_DEPTH);
    this.edgeArrow = scene.add.image(0, 0, TEXTURES.tutorialArrow).setScrollFactor(0).setDepth(HINT_DEPTH);
    this.plate = scene.add.image(0, 0, TEXTURES.hudPanel).setScrollFactor(0).setDepth(HINT_DEPTH);
    this.label = scene.add
      .text(0, 0, '', {
        fontFamily: TITLE_FONT,
        fontSize: '28px',
        color: toCss(COLORS.titleAmber),
        stroke: toCss(COLORS.outline),
        strokeThickness: 5,
        resolution: 2,
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(HINT_DEPTH);
    this.edgeArrow.setVisible(false);
  }

  // Все шаги пройдены.
  isDone(): boolean {
    return this.isFinished;
  }

  // Перейти к следующему шагу. Шагов всего stepCount: после последнего подсказка исчезает.
  nextStep(stepCount: number): void {
    this.step += 1;
    if (this.step < stepCount) {
      pop(this.scene, this.label);
      return;
    }
    this.isFinished = true;
    for (const part of [this.arrow, this.edgeArrow, this.plate, this.label]) part.destroy();
  }

  // Показать шаг: текст на плашке и стрелку над целью target (точка мира).
  // Вызывается каждый кадр — текст перерисовывается, только если поменялся.
  show(text: string, target: Point, delta: number): void {
    this.time += delta;
    const { width, height } = this.scene.scale;

    this.label.setText(text).setPosition(width / 2, height - PLATE_BOTTOM);
    this.plate
      .setPosition(width / 2, height - PLATE_BOTTOM)
      .setDisplaySize(this.label.width + PLATE_PADDING, PLATE_HEIGHT);

    // Покачивание: синус от 0 до 1 — стрелка «кивает» на цель.
    const bob = ((1 - Math.cos((this.time / ARROW_BOB_TIME) * Math.PI)) / 2) * ARROW_BOB;
    const view = this.scene.cameras.main.worldView;
    const isVisible = view.contains(target.x, target.y - ARROW_LIFT);
    this.arrow.setVisible(isVisible).setPosition(target.x, target.y - ARROW_LIFT + bob);
    this.edgeArrow.setVisible(!isVisible);
    if (!isVisible) this.pointFromEdge(target, view);
  }

  // Цель за краем экрана: стрелка у края экрана на линии «середина экрана → цель», остриём к цели.
  private pointFromEdge(target: Point, view: Phaser.Geom.Rectangle): void {
    const { width, height } = this.scene.scale;
    const dx = target.x - view.centerX;
    const dy = target.y - view.centerY;
    // Сколько от середины экрана до рамки, на которой стоит стрелка, в сторону цели.
    const toSide = width / 2 - EDGE_MARGIN_SIDE;
    const toTopOrBottom = dy > 0 ? height / 2 - EDGE_MARGIN_BOTTOM : height / 2 - EDGE_MARGIN_TOP;
    // Во сколько раз уменьшить (dx, dy), чтобы точка встала на эту рамку.
    const shrink = Math.max(Math.abs(dx) / toSide, Math.abs(dy) / toTopOrBottom, 1);
    this.edgeArrow.setPosition(width / 2 + dx / shrink, height / 2 + dy / shrink);
    // Картинка смотрит вниз (90°), а нужно — в сторону цели.
    this.edgeArrow.setRotation(Math.atan2(dy, dx) - Math.PI / 2);
  }
}
