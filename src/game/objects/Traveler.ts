import Phaser from 'phaser';
import { TRAVELER_PATIENCE, TRAVELER_SPEED } from '../settings';
import { COLORS, mixColors, toCss } from '../palette';
import { TEXTURES, TITLE_FONT } from '../textures';
import { ITEMS, ItemType } from '../items';
import { flyArc, Point, pop, shakeAngle } from '../fx';

// ===== Вид =====

// Тень под путником.
const SHADOW_WIDTH = 52;
const SHADOW_DEPTH_SHIFT = -0.5;
// Ходьба: путник покачивается вверх-вниз (пиксели) с такой скоростью (радиан за мс).
const WALK_BOB_HEIGHT = 3;
const WALK_BOB_SPEED = 0.018;
// На каждом шаге путник переваливается с ноги на ногу — наклон в градусах.
const WALK_ROCK_ANGLE = 3;
// Стоя в очереди, путник «дышит» (чуть вытягивается) и покачивается (градусы).
const IDLE_BREATH = 0.02;
const IDLE_BREATH_SPEED = 0.0035;
const IDLE_SWAY_ANGLE = 1.5;
const IDLE_SWAY_SPEED = 0.0015;
// Примерно за столько мс походка сменяется стойкой и обратно — без рывка.
const POSE_BLEND_TIME = 120;
// Еда: путник «жуёт» — немного сжимается и вытягивается.
const CHEW_SQUASH = 0.06;
const CHEW_SPEED = 0.02;
// Куда летит еда — ко рту (высота над ногами), за сколько мс и как высоко по дуге.
const MOUTH_HEIGHT = 70;
const FOOD_FLY_TIME = 300;
const FOOD_FLY_ARC = 40;
// Короткие движения-отклики (см. Reaction): сколько мс длится каждое,
// насколько путник приседает, дойдя до места (доля высоты), на сколько пикселей
// подпрыгивает от радости, наевшись, и на сколько градусов качается от злости, уходя голодным.
const REACTION_TIME = 380;
const SETTLE_SQUASH = 0.08;
const HAPPY_JUMP_HEIGHT = 16;
const ANGRY_SHAKE_ANGLE = 8;
// Дошёл до места, если ближе этого (пиксели).
const ARRIVE_DISTANCE = 3;
// Уходя, путник сначала отходит вбок на столько пикселей — чтобы не идти сквозь очередь.
const LEAVE_STEP_ASIDE = 130;

// ===== Над головой =====

// Пузырь, надписи и шкала — поверх всех стоящих предметов (как шкала жара костра).
const OVERHEAD_DEPTH = 9000;
// Пузырь «что хочу» — справа от головы (над путником стоит стол): сдвиг середины
// пузыря вправо и вверх от ног; иконка и число внутри.
const BUBBLE_X = 78;
const BUBBLE_Y = 100;
const BUBBLE_ICON_X = -14;
const BUBBLE_ICON_SCALE = 0.62;
const BUBBLE_TEXT_X = 6;
// Иконка и число чуть выше середины пузыря: внизу у пузыря хвостик.
const BUBBLE_ICON_Y = -4;
const BUBBLE_TEXT_Y = -5;
// Шкала терпения — под пузырём, уменьшенная шкала жара.
const PATIENCE_Y = 68;
const PATIENCE_SCALE = 0.5;
// Заливка шкалы начинается на столько пикселей левее середины (у полной шкалы — 52).
const PATIENCE_FILL_LEFT = 52 * PATIENCE_SCALE;
// Голодный путник уходит с красным «!» над головой.
const ANGRY_Y = 108;

// Виды путников: картинка со спины (идёт к столу, стоит в очереди) и спереди (уходит).
// Кто придёт — охотник, старец или девушка — выбирается случайно.
const LOOKS = [
  { back: TEXTURES.hunterBack, front: TEXTURES.hunterFront },
  { back: TEXTURES.elderBack, front: TEXTURES.elderFront },
  { back: TEXTURES.girlBack, front: TEXTURES.girlFront },
];

// Что сейчас делает путник.
// 'gone' — его нет на поле (ждёт, когда позовут), 'walking' — идёт к месту в очереди,
// 'waiting' — стоит на месте в очереди, 'eating' — ест, 'leaving' — уходит в лес.
type TravelerState = 'gone' | 'walking' | 'waiting' | 'eating' | 'leaving';

// Короткое движение-отклик: 'settle' — присел, дойдя до места в очереди;
// 'jump' — подпрыгнул от радости (наелся); 'angry' — затрясся от злости (ушёл голодным).
type Reaction = 'settle' | 'jump' | 'angry';

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
  // Куда путник уходит в лес (после шага в сторону) — пока не дошёл, undefined.
  private exit?: Point;
  // Время для покачивания при ходьбе, «дыхания» и «жевания».
  // Начинается со случайного числа, чтобы путники в очереди дышали вразнобой.
  private animTime = 0;
  // Насколько путник сейчас идёт: 0 — стоит, 1 — идёт. Меняется плавно (POSE_BLEND_TIME).
  private walkBlend = 0;
  // Какой отклик сейчас играет и сколько мс ему ещё осталось (0 — никакого).
  private reaction: Reaction = 'settle';
  private reactionTimeLeft = 0;
  // Какую еду хочет (пока только жареное мясо; рыба — в версии 0.8).
  private wantedType: ItemType = 'cookedMeat';
  // Как выглядит этот путник (один из LOOKS).
  private look = LOOKS[0];

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
    this.image = scene.add.image(0, 0, this.look.back).setOrigin(0.5, 1);

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
    this.animTime = Phaser.Math.Between(0, 10000);
    this.walkBlend = 1;
    this.reactionTimeLeft = 0;

    this.image.setVisible(true);
    this.shadow.setVisible(true);
    // Пузырь и шкала появятся, когда путник станет первым в очереди (setFront).
    this.showOverhead(false);
    this.angryMark.setVisible(false);
    // Кто пришёл — охотник, старец или девушка; иногда отражён — палка в другой руке.
    this.look = Phaser.Utils.Array.GetRandom(LOOKS);
    this.image.setFlipX(Math.random() < 0.5);
    this.updateBubble();
  }

  // Место в очереди: если оно сменилось (очередь сдвинулась), путник идёт туда.
  setSlot(slot: Point): void {
    if (slot.x === this.target.x && slot.y === this.target.y) return;
    this.target = slot;
    if (this.state === 'waiting') this.state = 'walking';
  }

  // Первый в очереди показывает над головой пузырь «что хочу» и шкалу терпения.
  // Остальные стоят без пузыря — иначе в очереди столбиком пузыри налезали бы на головы.
  setFront(isFront: boolean): void {
    if (this.state === 'eating') return;
    this.showOverhead(isFront);
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
    this.showOverhead(false);
  }

  // Уйти в лес — в точку exit. Голодный (isFed = false) уходит с красным «!».
  // Сначала отходит вбок — в ту сторону, где лес выхода, — потом идёт к лесу.
  leave(isFed: boolean, exit: Point): void {
    this.state = 'leaving';
    this.exit = exit;
    const side = exit.x >= this.x ? 1 : -1;
    this.target = { x: this.x + side * LEAVE_STEP_ASIDE, y: this.y };
    this.showOverhead(false);
    this.angryMark.setVisible(!isFed);
    if (!isFed) pop(this.scene, this.angryMark);
    this.react(isFed ? 'jump' : 'angry');
  }

  // ===== Каждый кадр =====

  // Вызывается сценой каждый кадр: путник идёт к цели и показывает себя.
  update(delta: number): void {
    if (this.state === 'gone') return;
    this.animTime += delta;
    this.reactionTimeLeft = Math.max(0, this.reactionTimeLeft - delta);

    const isMoving = this.state === 'walking' || this.state === 'leaving';
    if (isMoving) this.walk(delta);
    this.walkBlend = Phaser.Math.Linear(this.walkBlend, isMoving ? 1 : 0, Math.min(1, delta / POSE_BLEND_TIME));
    this.place();
  }

  // Шаг к цели. Дошёл до места в очереди — стоит; дошёл до леса — исчезает.
  private walk(delta: number): void {
    const distance = Phaser.Math.Distance.Between(this.x, this.y, this.target.x, this.target.y);
    const step = (TRAVELER_SPEED * delta) / 1000;

    if (distance <= Math.max(step, ARRIVE_DISTANCE)) {
      this.x = this.target.x;
      this.y = this.target.y;
      if (this.state === 'leaving' && this.exit) {
        // Шаг в сторону сделан — теперь в лес.
        this.target = this.exit;
        this.exit = undefined;
      } else if (this.state === 'leaving') {
        this.hide();
      } else {
        this.state = 'waiting';
        this.react('settle');
      }
      return;
    }

    const direction = new Phaser.Math.Vector2(this.target.x - this.x, this.target.y - this.y).normalize();
    this.x += direction.x * step;
    this.y += direction.y * step;
  }

  // Ставит картинку, тень и всё, что над головой.
  private place(): void {
    if (this.state === 'gone') return;

    // Походка: подпрыгивание и переваливание с ноги на ногу (sin меняет знак каждый шаг).
    const step = Math.sin(this.animTime * WALK_BOB_SPEED);
    const bob = Math.abs(step) * WALK_BOB_HEIGHT * this.walkBlend;
    const rock = step * WALK_ROCK_ANGLE * this.walkBlend;
    // Стойка: «дыхание» и медленное покачивание. Пока ест — вместо дыхания «жуёт».
    const standShare = 1 - this.walkBlend;
    const breath = Math.sin(this.animTime * IDLE_BREATH_SPEED) * IDLE_BREATH * standShare;
    const idleSway = Math.sin(this.animTime * IDLE_SWAY_SPEED) * IDLE_SWAY_ANGLE * standShare;
    const isEating = this.state === 'eating';
    const chew = isEating ? Math.sin(this.animTime * CHEW_SPEED) * CHEW_SQUASH : 0;
    // Насколько путник сейчас шире (widen) и выше (stretch) обычного: доли размера.
    const reaction = this.getReactionPose();
    const widen = (isEating ? chew : -breath / 2) + reaction.squash / 2;
    const stretch = (isEating ? -chew : breath) - reaction.squash;
    // К столу путник идёт и стоит спиной к нам, уходит — лицом к нам.
    const texture = this.state === 'leaving' ? this.look.front : this.look.back;
    if (this.image.texture.key !== texture) this.image.setTexture(texture);
    this.image
      .setPosition(this.x, this.y - bob - reaction.lift)
      .setScale(1 + widen, 1 + stretch)
      .setAngle(rock + idleSway + reaction.angle)
      .setDepth(this.y);
    this.shadow.setPosition(this.x, this.y).setDepth(this.y + SHADOW_DEPTH_SHIFT);

    const bubbleY = this.y - BUBBLE_Y;
    const bubbleX = this.x + BUBBLE_X;
    this.bubble.setPosition(bubbleX, bubbleY);
    this.bubbleIcon.setPosition(bubbleX + BUBBLE_ICON_X, bubbleY + BUBBLE_ICON_Y);
    this.bubbleText.setPosition(bubbleX + BUBBLE_TEXT_X, bubbleY + BUBBLE_TEXT_Y);

    // Шкала терпения: заливка короче и краснее, чем меньше терпения.
    const patienceShare = Phaser.Math.Clamp(this.patience / TRAVELER_PATIENCE, 0, 1);
    const barY = this.y - PATIENCE_Y;
    this.patienceBack.setPosition(bubbleX, barY);
    this.patienceFill
      .setPosition(bubbleX - PATIENCE_FILL_LEFT, barY)
      .setScale(patienceShare * PATIENCE_SCALE, PATIENCE_SCALE)
      .setTint(mixColors(COLORS.patienceLow, COLORS.patienceFull, patienceShare));

    this.angryMark.setPosition(this.x, this.y - ANGRY_Y);
  }

  // Начать короткое движение-отклик.
  private react(reaction: Reaction): void {
    this.reaction = reaction;
    this.reactionTimeLeft = REACTION_TIME;
  }

  // Поза отклика в этот миг: подъём (пиксели), приседание (доля высоты) и наклон (градусы).
  // progress — доля прошедшего отклика (1 — кончился, тогда поза ровная),
  // wave — дуга от 0 через 1 обратно к 0 за время отклика.
  private getReactionPose(): { lift: number; squash: number; angle: number } {
    const progress = 1 - this.reactionTimeLeft / REACTION_TIME;
    const wave = Math.sin(progress * Math.PI);
    switch (this.reaction) {
      case 'settle':
        return { lift: 0, squash: wave * SETTLE_SQUASH, angle: 0 };
      case 'jump':
        // В прыжке чуть вытягивается вверх (минус приседания).
        return { lift: wave * HAPPY_JUMP_HEIGHT, squash: -wave * SETTLE_SQUASH, angle: 0 };
      case 'angry':
        return { lift: 0, squash: 0, angle: shakeAngle(progress, ANGRY_SHAKE_ANGLE) };
    }
  }

  // Число в пузыре: сколько кусков ещё нужно.
  private updateBubble(): void {
    this.bubbleText.setText('×' + (this.order - this.received));
  }

  // Показать или спрятать пузырь «что хочу» и шкалу терпения.
  private showOverhead(visible: boolean): void {
    for (const part of [this.bubble, this.bubbleIcon, this.bubbleText, this.patienceBack, this.patienceFill]) {
      part.setVisible(visible);
    }
  }

  // Убрать путника с поля — он ждёт, когда его позовут снова.
  private hide(): void {
    this.state = 'gone';
    this.image.setVisible(false);
    this.shadow.setVisible(false);
    this.showOverhead(false);
    this.angryMark.setVisible(false);
  }
}
