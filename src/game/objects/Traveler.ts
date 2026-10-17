import Phaser from 'phaser';
import { TRAVELER_PATIENCE, TRAVELER_SPEED } from '../settings';
import { COLORS, mixColors, toCss } from '../palette';
import { TEXTURES, TITLE_FONT } from '../textures';
import { ITEMS, ItemType } from '../items';
import { flyArc, Point, pop } from '../fx';

// ===== Вид =====

// Тень под путником.
const SHADOW_WIDTH = 52;
const SHADOW_DEPTH_SHIFT = -0.5;
// Ходьба: путник покачивается вверх-вниз (пиксели) с такой скоростью (радиан за мс).
const WALK_BOB_HEIGHT = 3;
const WALK_BOB_SPEED = 0.018;
// Еда: путник «жуёт» — немного сжимается и вытягивается.
const CHEW_SQUASH = 0.06;
const CHEW_SPEED = 0.02;
// Куда летит еда — ко рту (высота над ногами), за сколько мс и как высоко по дуге.
const MOUTH_HEIGHT = 70;
const FOOD_FLY_TIME = 300;
const FOOD_FLY_ARC = 40;
// Дошёл до места, если ближе этого (пиксели).
const ARRIVE_DISTANCE = 3;

// ===== Над головой =====

// Пузырь, надписи и шкала — поверх всех стоящих предметов (как шкала жара костра).
const OVERHEAD_DEPTH = 9000;
// Пузырь «что хочу»: середина над ногами на такой высоте; иконка и число внутри.
const BUBBLE_Y = 124;
const BUBBLE_ICON_X = -14;
const BUBBLE_ICON_SCALE = 0.62;
const BUBBLE_TEXT_X = 6;
// Шкала терпения — под пузырём, уменьшенная шкала жара.
const PATIENCE_Y = 96;
const PATIENCE_SCALE = 0.5;
// Заливка шкалы начинается на столько пикселей левее середины (у полной шкалы — 52).
const PATIENCE_FILL_LEFT = 52 * PATIENCE_SCALE;
// Голодный путник уходит с красным «!» над головой.
const ANGRY_Y = 108;

// Что сейчас делает путник.
// 'gone' — его нет на поле (ждёт, когда позовут), 'walking' — идёт к месту в очереди,
// 'waiting' — стоит на месте в очереди, 'eating' — ест, 'leaving' — уходит в лес.
type TravelerState = 'gone' | 'walking' | 'waiting' | 'eating' | 'leaving';

/**
 * Путник: выходит из леса, встаёт в очередь у стола и ждёт еду.
 *
 * Над головой пузырь «что и сколько хочу» и шкала терпения.
 * Наелся — жуёт и уходит; терпение кончилось — уходит голодным с «!».
 * Путник только хранит своё состояние и показывает его. Кто первый в очереди,
 * когда брать еду и когда уходить, решает systems/Serving.ts.
 * Про стол и вождя путник ничего не знает.
 */
export class Traveler {
  // Где ноги путника.
  x = 0;
  y = 0;
  // Номер талона: кто пришёл раньше, стоит ближе к столу.
  ticket = 0;
  // Сколько кусков еды хочет и сколько уже взял.
  order = 0;
  received = 0;
  // Сколько мс терпения осталось. Меняет systems/Serving.ts.
  patience = TRAVELER_PATIENCE;
  // Сколько мс прошло с прошлого взятого куска. Меняет systems/Serving.ts.
  takeTimer = 0;
  // Сколько мс путник уже ест. Меняет systems/Serving.ts.
  eatTime = 0;

  private scene: Phaser.Scene;
  // Что путник делает сейчас.
  private state: TravelerState = 'gone';
  // Куда он идёт: место в очереди или точка в лесу.
  private target: Point = { x: 0, y: 0 };
  // Время для покачивания при ходьбе и «жевания».
  private animTime = 0;
  // Какую еду хочет (пока только жареное мясо; рыба — в версии 0.8).
  private wantedType: ItemType = 'cookedMeat';

  // Картинка, тень, пузырь с иконкой и числом, шкала терпения, «!».
  private image: Phaser.GameObjects.Image;
  private shadow: Phaser.GameObjects.Image;
  private bubble: Phaser.GameObjects.Image;
  private bubbleIcon: Phaser.GameObjects.Image;
  private bubbleText: Phaser.GameObjects.Text;
  private patienceBack: Phaser.GameObjects.Image;
  private patienceFill: Phaser.GameObjects.Image;
  private angryMark: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;

    this.shadow = scene.add.image(0, 0, TEXTURES.shadow);
    this.shadow.setScale(SHADOW_WIDTH / this.shadow.width);
    this.image = scene.add.image(0, 0, TEXTURES.traveler).setOrigin(0.5, 1);

    this.bubble = scene.add.image(0, 0, TEXTURES.bubble).setDepth(OVERHEAD_DEPTH);
    this.bubbleIcon = scene.add.image(0, 0, ITEMS.cookedMeat.texture).setScale(BUBBLE_ICON_SCALE);
    this.bubbleIcon.setDepth(OVERHEAD_DEPTH + 0.1);
    this.bubbleText = scene.add
      .text(0, 0, '', {
        fontFamily: TITLE_FONT,
        fontSize: '18px',
        color: toCss(COLORS.outline),
        resolution: 2,
      })
      .setOrigin(0, 0.5)
      .setDepth(OVERHEAD_DEPTH + 0.1);
    this.patienceBack = scene.add.image(0, 0, TEXTURES.heatBarBack).setScale(PATIENCE_SCALE);
    this.patienceBack.setDepth(OVERHEAD_DEPTH);
    this.patienceFill = scene.add.image(0, 0, TEXTURES.heatBarFill).setOrigin(0, 0.5);
    this.patienceFill.setDepth(OVERHEAD_DEPTH + 0.1);
    this.angryMark = scene.add
      .text(0, 0, '!', {
        fontFamily: TITLE_FONT,
        fontSize: '34px',
        color: toCss(COLORS.maxText),
        stroke: toCss(COLORS.outline),
        strokeThickness: 6,
        resolution: 2,
      })
      .setOrigin(0.5, 1)
      .setDepth(OVERHEAD_DEPTH);

    this.hide();
  }

  // ===== Состояние (спрашивает и меняет systems/Serving.ts) =====

  // Путника нет на поле — его можно позвать.
  isGone(): boolean {
    return this.state === 'gone';
  }

  // Путник в очереди: идёт к месту, стоит или ест.
  isInQueue(): boolean {
    return this.state === 'walking' || this.state === 'waiting' || this.state === 'eating';
  }

  // Стоит на своём месте и ждёт еду.
  isWaiting(): boolean {
    return this.state === 'waiting';
  }

  // Ест.
  isEating(): boolean {
    return this.state === 'eating';
  }

  // Какую еду хочет и сколько ещё кусков нужно.
  wants(): { type: ItemType; count: number } {
    return { type: this.wantedType, count: this.order - this.received };
  }

  // Куда летят еда и клыки — к лицу путника.
  getMouthPoint(): Point {
    return { x: this.x, y: this.y - MOUTH_HEIGHT };
  }

  // Позвать путника: он выходит из леса в точке from и хочет order кусков.
  arrive(ticket: number, order: number, from: Point): void {
    this.ticket = ticket;
    this.order = order;
    this.received = 0;
    this.patience = TRAVELER_PATIENCE;
    this.takeTimer = 0;
    this.eatTime = 0;
    this.x = from.x;
    this.y = from.y;
    this.target = from;
    this.state = 'walking';

    for (const part of [this.image, this.shadow, this.bubble, this.bubbleIcon, this.bubbleText]) {
      part.setVisible(true);
    }
    this.patienceBack.setVisible(true);
    this.patienceFill.setVisible(true);
    this.angryMark.setVisible(false);
    // У каждого путника свой оттенок плаща.
    this.image.setTint(Phaser.Utils.Array.GetRandom(COLORS.travelerTints));
    this.updateBubble();
  }

  // Место в очереди: если оно сменилось (очередь сдвинулась), путник идёт туда.
  setSlot(slot: Point): void {
    if (slot.x === this.target.x && slot.y === this.target.y) return;
    this.target = slot;
    if (this.state === 'waiting') this.state = 'walking';
  }

  // Взять кусок со стола: он по дуге летит к путнику и исчезает.
  takeOne(item: Phaser.GameObjects.Image): void {
    this.received += 1;
    this.updateBubble();
    flyArc(this.scene, item, {
      from: { x: item.x, y: item.y },
      target: () => this.getMouthPoint(),
      duration: FOOD_FLY_TIME,
      height: FOOD_FLY_ARC,
      onLand: () => item.destroy(),
    });
  }

  // Получил всё — ест. Пузырь прячется.
  startEating(): void {
    this.state = 'eating';
    this.eatTime = 0;
    this.bubble.setVisible(false);
    this.bubbleIcon.setVisible(false);
    this.bubbleText.setVisible(false);
    this.patienceBack.setVisible(false);
    this.patienceFill.setVisible(false);
  }

  // Уйти в лес вправо. Голодный (isFed = false) уходит с красным «!».
  leave(isFed: boolean, exitX: number): void {
    this.state = 'leaving';
    this.target = { x: exitX, y: this.y };
    this.bubble.setVisible(false);
    this.bubbleIcon.setVisible(false);
    this.bubbleText.setVisible(false);
    this.patienceBack.setVisible(false);
    this.patienceFill.setVisible(false);
    this.angryMark.setVisible(!isFed);
    if (!isFed) pop(this.scene, this.angryMark);
  }

  // ===== Каждый кадр =====

  // Вызывается сценой каждый кадр: путник идёт к цели и показывает себя.
  update(delta: number): void {
    if (this.state === 'gone') return;
    this.animTime += delta;

    const isMoving = this.state === 'walking' || this.state === 'leaving';
    if (isMoving) this.walk(delta);
    this.place(isMoving);
  }

  // Шаг к цели. Дошёл до места в очереди — стоит; дошёл до леса — исчезает.
  private walk(delta: number): void {
    const distance = Phaser.Math.Distance.Between(this.x, this.y, this.target.x, this.target.y);
    const step = (TRAVELER_SPEED * delta) / 1000;

    if (distance <= Math.max(step, ARRIVE_DISTANCE)) {
      this.x = this.target.x;
      this.y = this.target.y;
      if (this.state === 'leaving') {
        this.hide();
      } else {
        this.state = 'waiting';
      }
      return;
    }

    const direction = new Phaser.Math.Vector2(this.target.x - this.x, this.target.y - this.y).normalize();
    this.x += direction.x * step;
    this.y += direction.y * step;
    // Картинка смотрит влево; идёт вправо — отражаем.
    this.image.setFlipX(direction.x > 0);
  }

  // Ставит картинку, тень и всё, что над головой.
  private place(isMoving: boolean): void {
    if (this.state === 'gone') return;

    const bob = isMoving ? Math.abs(Math.sin(this.animTime * WALK_BOB_SPEED)) * WALK_BOB_HEIGHT : 0;
    const chew = this.state === 'eating' ? Math.sin(this.animTime * CHEW_SPEED) * CHEW_SQUASH : 0;
    this.image.setPosition(this.x, this.y - bob).setScale(1 + chew, 1 - chew).setDepth(this.y);
    this.shadow.setPosition(this.x, this.y).setDepth(this.y + SHADOW_DEPTH_SHIFT);
    if (!isMoving && this.state !== 'eating') this.image.setFlipX(false);

    const bubbleY = this.y - BUBBLE_Y;
    this.bubble.setPosition(this.x, bubbleY);
    this.bubbleIcon.setPosition(this.x + BUBBLE_ICON_X, bubbleY - 4);
    this.bubbleText.setPosition(this.x + BUBBLE_TEXT_X, bubbleY - 5);

    // Шкала терпения: заливка короче и краснее, чем меньше терпения.
    const patienceShare = Phaser.Math.Clamp(this.patience / TRAVELER_PATIENCE, 0, 1);
    const barY = this.y - PATIENCE_Y;
    this.patienceBack.setPosition(this.x, barY);
    this.patienceFill
      .setPosition(this.x - PATIENCE_FILL_LEFT, barY)
      .setScale(patienceShare * PATIENCE_SCALE, PATIENCE_SCALE)
      .setTint(mixColors(COLORS.patienceLow, COLORS.patienceFull, patienceShare));

    this.angryMark.setPosition(this.x, this.y - ANGRY_Y);
  }

  // Число в пузыре: сколько кусков ещё нужно.
  private updateBubble(): void {
    this.bubbleText.setText('×' + (this.order - this.received));
  }

  // Убрать путника с поля — он ждёт, когда его позовут снова.
  private hide(): void {
    this.state = 'gone';
    for (const part of [this.image, this.shadow, this.bubble, this.bubbleIcon, this.bubbleText]) {
      part.setVisible(false);
    }
    this.patienceBack.setVisible(false);
    this.patienceFill.setVisible(false);
    this.angryMark.setVisible(false);
  }
}
