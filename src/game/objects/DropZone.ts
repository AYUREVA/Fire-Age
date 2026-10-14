import Phaser from 'phaser';
import { DROP_RADIUS } from '../settings';
import { COLORS } from '../palette';
import { TEXTURES } from '../textures';
import { floatText, flyArc, pop, Point } from '../fx';

// ===== Площадка поленницы =====

// Площадка и свет костра лежат плоско на земле:
// выше декора земли (-200 в GameScene), ниже всего, что стоит (depth = y ≥ 0).
const FLAT_ON_GROUND_DEPTH = -100;
// Прозрачность и размер площадки: обычно и когда вождь стоит в зоне.
const PLATFORM_IDLE_ALPHA = 0.75;
const PLATFORM_ACTIVE_ALPHA = 1;
const PLATFORM_ACTIVE_SCALE = 1.06;
// За сколько мс площадка подсвечивается или гаснет.
const PLATFORM_TWEEN_TIME = 160;

// ===== Куча хвороста =====

// Сколько связок в одном ряду кучи и сколько рядов видно.
// Когда куча заполнена, она больше не растёт, но счёт идёт дальше.
const PILE_COLUMNS = 3;
const PILE_ROWS = 6;
// Расстояние между связками в ряду и высота ряда.
const PILE_COLUMN_STEP = 50;
const PILE_ROW_STEP = 18;
// Нечётные ряды сдвинуты вбок — связки лежат «кирпичиком».
const PILE_BRICK_SHIFT = 10;
// Низ кучи ниже середины площадки на столько пикселей.
const PILE_BASE_OFFSET_Y = 22;
// Каждая следующая связка в куче чуть ближе к нам, чем предыдущая.
const PILE_DEPTH_STEP = 0.001;

// ===== Полёт связки в кучу =====

// Сколько мс связка летит со стопки в кучу и как высоко поднимается дуга.
const FLY_TIME = 300;
const FLY_ARC_HEIGHT = 70;
// «+1» появляется над связкой, которая легла в кучу.
const PLUS_ONE_OFFSET_Y = 30;

// ===== Костёр =====

// Где костёр относительно середины поленницы.
const FIRE_OFFSET_X = -200;
const FIRE_OFFSET_Y = 0;
// Языки пламени поднимаются из поленьев, а не из земли.
const FLAME_BASE_LIFT = 18;
// Каждый следующий язык пламени чуть ближе к нам; искры — перед пламенем.
const FLAME_DEPTH_STEP = 0.1;
const SPARKS_DEPTH_SHIFT = 0.5;
// Язык пламени: сдвиг от центра костра, размер, наклон (градусы), время мерцания (мс).
type Flame = { x: number; scale: number; angle: number; time: number };
// Языки пламени костра. Последний — самый большой, он стоит впереди.
const FLAMES: Flame[] = [
  { x: -14, scale: 0.6, angle: -12, time: 300 },
  { x: 14, scale: 0.65, angle: 12, time: 340 },
  { x: 0, scale: 1, angle: 0, time: 260 },
];
// Мерцание: пламя вытягивается вверх, сужается и чуть тускнеет.
const FLAME_STRETCH = 0.15;
const FLAME_SQUEEZE = 0.08;
const FLAME_MIN_ALPHA = 0.85;
// Тёплый круг света на снегу: ширина, сплющенность (мы смотрим сверху под углом), прозрачность.
const GLOW_WIDTH = 340;
const GLOW_FLATTEN = 0.6;
const GLOW_ALPHA = 0.45;
// Свет «дышит»: на какую долю меняется размер и за сколько мс.
const GLOW_PULSE = 0.06;
const GLOW_PULSE_TIME = 700;
// Свет тускнеет до этой прозрачности и снова разгорается.
const GLOW_MIN_ALPHA = 0.32;
// Искры вылетают из середины пламени.
const SPARKS_OFFSET_Y = -40;
// Искры: летят вверх, чуть в стороны, гаснут и меняют цвет от белого к красному.
const SPARKS: Phaser.Types.GameObjects.Particles.ParticleEmitterConfig = {
  speedX: { min: -25, max: 25 },
  speedY: { min: -110, max: -50 },
  lifespan: { min: 700, max: 1300 },
  scale: { start: 1, end: 0 },
  alpha: { start: 1, end: 0 },
  frequency: 160, // новая искра раз в 160 мс
  maxAliveParticles: 12, // не больше 12 искр сразу — бережём слабые компьютеры
  color: [COLORS.fireCore, COLORS.fireYellow, COLORS.fireOrange, COLORS.fireRed],
};

/**
 * Поленница у костра — точка сдачи хвороста.
 *
 * Площадка со светлой рамкой: вождь встаёт в её зону, и сцена передаёт
 * сюда связки со стопки по одной. Каждая связка по дуге летит в аккуратную
 * кучу, куча растёт. Рядом горит костёр — это оформление лагеря.
 * Про вождя и стопку поленница ничего не знает.
 */
export class DropZone {
  // Середина площадки.
  readonly x: number;
  readonly y: number;

  private scene: Phaser.Scene;
  private platform: Phaser.GameObjects.Image;
  // Подсвечена ли площадка сейчас (вождь в зоне).
  private isHighlighted = false;
  // Связки, лежащие в куче (и те, что уже летят туда, — место для них занято).
  private pile: Phaser.GameObjects.Image[] = [];

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.scene = scene;
    this.x = x;
    this.y = y;

    // Сначала костёр: его свет лежит на земле под краем площадки.
    this.createFire(x + FIRE_OFFSET_X, y + FIRE_OFFSET_Y);

    this.platform = scene.add
      .image(x, y, TEXTURES.dropZone)
      .setDepth(FLAT_ON_GROUND_DEPTH)
      .setAlpha(PLATFORM_IDLE_ALPHA);
  }

  // Стоит ли точка (x, y) в зоне сдачи.
  contains(x: number, y: number): boolean {
    return Phaser.Math.Distance.Between(x, y, this.x, this.y) <= DROP_RADIUS;
  }

  // Подсветка площадки, пока вождь в зоне. Сцена вызывает это каждый кадр.
  setHighlighted(isOn: boolean): void {
    // Твин запускаем, только когда подсветка меняется, а не каждый кадр.
    if (this.isHighlighted === isOn) return;
    this.isHighlighted = isOn;

    this.scene.tweens.add({
      targets: this.platform,
      alpha: isOn ? PLATFORM_ACTIVE_ALPHA : PLATFORM_IDLE_ALPHA,
      scale: isOn ? PLATFORM_ACTIVE_SCALE : 1,
      duration: PLATFORM_TWEEN_TIME,
      ease: 'Sine.easeOut',
    });
  }

  // Принять связку со стопки: она летит по дуге в кучу.
  // onStored вызывается, когда связка легла, — сцена прибавит счёт.
  receive(item: Phaser.GameObjects.Image, onStored: () => void): void {
    // В стопке связка могла быть наклонена — выпрямляем.
    item.setAngle(0);

    // Если в куче есть место, связка останется в ней. Если нет — долетит до верха кучи и исчезнет.
    const keepInPile = this.pile.length < PILE_COLUMNS * PILE_ROWS;
    const slotIndex = keepInPile ? this.pile.length : this.pile.length - 1;
    if (keepInPile) {
      this.pile.push(item);
    }
    const slot = this.getPileSlot(slotIndex);

    flyArc(this.scene, item, {
      from: { x: item.x, y: item.y },
      target: () => slot,
      duration: FLY_TIME,
      height: FLY_ARC_HEIGHT,
      onLand: () => {
        this.store(item, slotIndex, keepInPile);
        onStored();
      },
    });
  }

  // ===== Куча =====

  // Связка легла в кучу: «пружинка» и «+1». Лишняя связка исчезает, а верх кучи подпрыгивает.
  private store(item: Phaser.GameObjects.Image, slotIndex: number, keepInPile: boolean): void {
    floatText(this.scene, item.x, item.y - PLUS_ONE_OFFSET_Y, '+1', COLORS.plusOne);

    if (keepInPile) {
      item.setDepth(this.getPileDepth(slotIndex));
      pop(this.scene, item);
    } else {
      item.destroy();
      pop(this.scene, this.pile[slotIndex]);
    }
  }

  // Где лежит связка номер index в куче (точка низа связки).
  private getPileSlot(index: number): Point {
    const row = Math.floor(index / PILE_COLUMNS);
    const column = index % PILE_COLUMNS;
    // Нечётные ряды сдвинуты вбок — «кирпичиком».
    const brickShift = row % 2 === 1 ? PILE_BRICK_SHIFT : 0;
    // column − середина ряда: у левой связки −1, у средней 0, у правой +1.
    const columnFromCenter = column - (PILE_COLUMNS - 1) / 2;

    return {
      x: this.x + columnFromCenter * PILE_COLUMN_STEP + brickShift,
      y: this.y + PILE_BASE_OFFSET_Y - row * PILE_ROW_STEP,
    };
  }

  // Глубина связки в куче: вся куча стоит на одной линии, каждая следующая связка чуть ближе.
  private getPileDepth(index: number): number {
    return this.y + PILE_BASE_OFFSET_Y + index * PILE_DEPTH_STEP;
  }

  // ===== Костёр (оформление) =====

  // Костёр: тёплый свет на снегу, кострище, мерцающие языки пламени и искры.
  private createFire(fireX: number, fireY: number): void {
    this.createFireGlow(fireX, fireY);

    this.scene.add.image(fireX, fireY, TEXTURES.firePit).setOrigin(0.5, 1).setDepth(fireY);

    FLAMES.forEach((flame, index) => {
      this.createFlame(fireX + flame.x, fireY - FLAME_BASE_LIFT, fireY + FLAME_DEPTH_STEP * (index + 1), flame);
    });

    this.scene.add
      .particles(fireX, fireY + SPARKS_OFFSET_Y, TEXTURES.spark, SPARKS)
      .setDepth(fireY + SPARKS_DEPTH_SHIFT);
  }

  // Тёплый круг света на снегу вокруг костра. Он медленно «дышит».
  private createFireGlow(fireX: number, fireY: number): void {
    const glow = this.scene.add
      .image(fireX, fireY, TEXTURES.glow)
      .setTint(COLORS.fireGlow)
      .setAlpha(GLOW_ALPHA)
      .setDepth(FLAT_ON_GROUND_DEPTH);
    const scaleX = GLOW_WIDTH / glow.width;
    const scaleY = scaleX * GLOW_FLATTEN;
    glow.setScale(scaleX, scaleY);

    this.scene.tweens.add({
      targets: glow,
      scaleX: scaleX * (1 + GLOW_PULSE),
      scaleY: scaleY * (1 + GLOW_PULSE),
      alpha: GLOW_MIN_ALPHA,
      duration: GLOW_PULSE_TIME,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  // Один язык пламени, который бесконечно мерцает.
  private createFlame(x: number, y: number, depth: number, flame: Flame): void {
    const image = this.scene.add
      .image(x, y, TEXTURES.flame)
      .setOrigin(0.5, 1)
      .setScale(flame.scale)
      .setAngle(flame.angle)
      .setDepth(depth);

    // Мерцание: вытянуться вверх, сузиться, чуть потускнеть — и обратно, без конца.
    // У каждого языка своё время, поэтому они мерцают вразнобой.
    this.scene.tweens.add({
      targets: image,
      scaleY: flame.scale * (1 + FLAME_STRETCH),
      scaleX: flame.scale * (1 - FLAME_SQUEEZE),
      alpha: FLAME_MIN_ALPHA,
      duration: flame.time,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }
}
