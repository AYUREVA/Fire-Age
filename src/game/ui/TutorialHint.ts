import Phaser from 'phaser';
import { COLORS, toCss } from '../palette';
import { TEXTURES, TITLE_FONT, drawStonePlate } from '../textures';
import { Point, pop, setGlow } from '../fx';

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
// Плашка «дышит»: плавно увеличивается до такого размера и обратно за столько мс.
const PLATE_BREATH_SCALE = 1.06;
const PLATE_BREATH_TIME = 700;
// Сменился текст шага — ширина плашки плавно догоняет новую примерно за столько мс.
const PLATE_RESIZE_TIME = 160;
// Плашка рисуется кодом в эту текстуру под ширину текста и показывается картинкой
// (свечение-фильтр правильно работает на картинке, прикреплённой к экрану).
const PLATE_TEXTURE = 'tutorial-plate';

// То, что подсказка может подсветить: куст, кролик, куча, стол.
export type Glowing = { setHintGlow(isOn: boolean): void };

/**
 * Подсказка обучения на первом уровне: прыгающая стрелка над целью,
 * свечение-обводка самой цели и плашка с текстом шага внизу экрана
 * («Сруби куст»). Плашка тоже светится и «дышит», чтобы её заметили.
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
  // Плашка и текст шага внизу экрана. Плашка рисуется кодом под ширину текста.
  private plate: Phaser.GameObjects.Image;
  private label: Phaser.GameObjects.Text;
  // Чем рисуется плашка (на экран не добавлен — только рисует текстуру PLATE_TEXTURE).
  private painter: Phaser.GameObjects.Graphics;
  // Ширина, на которую плашка нарисована сейчас (0 — ещё не рисовали).
  private plateWidth = 0;
  // Сколько мс идёт подсказка — из этого считается покачивание стрелки.
  private time = 0;
  // Все шаги пройдены — подсказка спрятана.
  private isFinished = false;
  // Что сейчас светится. Сменилась цель — старая гаснет, новая загорается.
  private glowing?: Glowing;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.arrow = scene.add.image(0, 0, TEXTURES.tutorialArrow).setOrigin(0.5, 1).setDepth(HINT_DEPTH);
    this.edgeArrow = scene.add.image(0, 0, TEXTURES.tutorialArrow).setScrollFactor(0).setDepth(HINT_DEPTH);
    this.painter = scene.make.graphics({}, false);
    this.plate = scene.add.image(0, 0, TEXTURES.hudPanel).setScrollFactor(0).setDepth(HINT_DEPTH).setVisible(false);
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
    setGlow(scene, this.plate, true);
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
    this.setGlowing(undefined);
    setGlow(this.scene, this.plate, false);
    for (const part of [this.arrow, this.edgeArrow, this.plate, this.label, this.painter]) part.destroy();
  }

  // Показать шаг: текст на плашке, стрелку над целью target (точка мира)
  // и свечение того, что подсвечивается (glow; нет — ничего не светится).
  // Вызывается каждый кадр — текст перерисовывается, только если поменялся.
  show(text: string, target: Point, glow: Glowing | undefined, delta: number): void {
    this.time += delta;
    const { width, height } = this.scene.scale;
    this.setGlowing(glow);

    // «Дыхание» плашки: синус от 0 до 1, как покачивание стрелки ниже.
    const breath = 1 + (PLATE_BREATH_SCALE - 1) * ((1 - Math.cos((this.time / PLATE_BREATH_TIME) * Math.PI)) / 2);
    this.label.setText(text).setPosition(width / 2, height - PLATE_BOTTOM).setScale(breath);
    this.resizePlate(this.label.width + PLATE_PADDING, delta);
    this.plate.setPosition(width / 2, height - PLATE_BOTTOM).setScale(breath).setVisible(true);

    // Покачивание: синус от 0 до 1 — стрелка «кивает» на цель.
    const bob = ((1 - Math.cos((this.time / ARROW_BOB_TIME) * Math.PI)) / 2) * ARROW_BOB;
    const view = this.scene.cameras.main.worldView;
    const isVisible = view.contains(target.x, target.y - ARROW_LIFT);
    this.arrow.setVisible(isVisible).setPosition(target.x, target.y - ARROW_LIFT + bob);
    this.edgeArrow.setVisible(!isVisible);
    if (!isVisible) this.pointFromEdge(target, view);
  }

  // Ширина плашки плавно догоняет нужную (target). Перерисовываем, только пока ширина меняется:
  // плашка рисуется заново под новую ширину, углы и кромка остаются прежними.
  // Текстура другого размера — новая: старую удаляем и рисуем заново.
  private resizePlate(target: number, delta: number): void {
    if (Math.abs(target - this.plateWidth) < 0.5) return;
    const step = this.plateWidth === 0 ? 1 : Math.min(1, delta / PLATE_RESIZE_TIME);
    this.plateWidth += (target - this.plateWidth) * step;
    if (Math.abs(target - this.plateWidth) < 0.5) this.plateWidth = target;

    const width = Math.ceil(this.plateWidth);
    this.painter.clear();
    drawStonePlate(this.painter, 0, 0, width, PLATE_HEIGHT);
    if (this.scene.textures.exists(PLATE_TEXTURE)) this.scene.textures.remove(PLATE_TEXTURE);
    this.painter.generateTexture(PLATE_TEXTURE, width, PLATE_HEIGHT);
    this.plate.setTexture(PLATE_TEXTURE);
  }

  // Подсветить glow, а то, что светилось раньше, — погасить.
  private setGlowing(glow: Glowing | undefined): void {
    if (glow === this.glowing) return;
    this.glowing?.setHintGlow(false);
    glow?.setHintGlow(true);
    this.glowing = glow;
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
