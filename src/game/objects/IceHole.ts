import Phaser from 'phaser';
import { FISH_INTERVAL, ICE_HOLE_RADIUS } from '../settings';
import { COLORS } from '../palette';
import { ICE_LAKE_HOLE_OFFSET, TEXTURES } from '../textures';
import { ITEMS } from '../items';
import { pop, Point } from '../fx';

// ===== Прорубь =====

// Прорубь лежит плоско на земле, на одном слое с площадками куч (ItemPile.ts).
const FLAT_ON_GROUND_DEPTH = -100;
// Прозрачность и размер проруби: обычно и когда вождь рыбачит.
const IDLE_ALPHA = 0.9;
const ACTIVE_ALPHA = 1;
const ACTIVE_SCALE = 1.06;
// За сколько мс прорубь подсвечивается или гаснет.
const HIGHLIGHT_TIME = 160;
// Бледная рыбка над водой: что здесь добывают. Она чуть покачивается.
const ICON_ALPHA = 0.45;
const ICON_SCALE = 1.1;
const ICON_BOB_HEIGHT = 4;
const ICON_BOB_TIME = 900;
// Середина воды — на столько пикселей ниже середины картинки (вода в картинке чуть ниже).
const WATER_OFFSET_Y = 4;

// ===== Всплеск =====

// Рыба клюнула — по воде расходится круг: растёт от и до, тает за столько мс.
const SPLASH_START_SCALE = 0.3;
const SPLASH_END_SCALE = 1.1;
const SPLASH_TIME = 450;
// Сила «пружинки» проруби при поклёвке (доля обычной, см. pop() в fx.ts).
const SPLASH_POP = 0.3;

// ===== Озеро =====

// Лёд озера лежит под прорубью и под всем остальным на земле.
const LAKE_DEPTH = FLAT_ON_GROUND_DEPTH - 10;
// Тени рыб подо льдом: сколько, прозрачность, радиус круга (ближняя — меньше),
// скорость (рад/мс). Плавают кругами вокруг середины озера; пока вождь рыбачит,
// сплываются к проруби — к поклёвке круг сжимается на LURE_SHRINK своего радиуса.
const FISH_SHADOWS = 3;
const FISH_SHADOW_ALPHA = 0.32;
const FISH_SHADOW_RADIUS = 50;
const FISH_SHADOW_RADIUS_STEP = 24;
const FISH_SHADOW_SPEED = 0.00035;
const FISH_SHADOW_SPEED_STEP = 0.00007;
const FISH_SHADOW_FLATTEN = 0.45;
const LURE_SHRINK = 0.75;
// Позёмка: снег метёт по льду слева направо.
const DRIFTING_SNOW: Phaser.Types.GameObjects.Particles.ParticleEmitterConfig = {
  speedX: { min: 90, max: 150 },
  speedY: { min: -6, max: 6 },
  lifespan: 2600,
  frequency: 220,
  scale: { start: 0.7, end: 0.3 },
  alpha: { start: 0.8, end: 0 },
};

// ===== Удочка и поплавок =====

// Удочка торчит из сугроба слева от проруби и тянется к воде: где рукоять и кончик
// (от середины проруби), толщина у рукояти и у кончика.
const ROD_BASE = { x: -84, y: 56 };
const ROD_TIP = { x: -8, y: -108 };
const ROD_WIDTH = 9;
const ROD_TIP_WIDTH = 4;
const ROD_GRIP_SHARE = 0.3;
const ROD_GRIP_WIDTH = 12;
// Сугроб, в который воткнута удочка.
const ROD_DRIFT_SCALE = 0.7;
// Поплавок: где на воде (от середины проруби), размер, как качается в покое.
const BOBBER_OFFSET = { x: 6, y: 4 };
const BOBBER_SCALE = 1.3;
const BOBBER_BOB = 2;
const BOBBER_BOB_SPEED = 0.004;
// Поклёвка в такт FISH_INTERVAL: доля интервала, с которой поплавок ныряет, и насколько (пиксели).
// Два «клюёт!», потом уходит под воду, а удочка гнётся к воде.
const BITE_DIPS = [
  { from: 0.45, to: 0.53, depth: 8 },
  { from: 0.6, to: 0.68, depth: 10 },
  { from: 0.8, to: 1, depth: 22 },
];
const BEND_FROM = 0.8;
const BEND = 9;
const BEND_RECOIL = -4;
const BEND_SMOOTH = 0.12;
// Леска провисает на столько пикселей; на поклёвке натягивается.
const LINE_SAG = 12;

// ===== Камыш =====

// Кустики камыша по берегу (от середины проруби): x, y, размер.
const REEDS = [
  [-30, 104, 1], [-14, 112, 0.8], [-44, 114, 0.9],
  [236, 40, 0.9], [252, 50, 1], [222, 52, 0.8], [244, 62, 0.75],
];
// Камыш качается на ветру и сильнее — порывами раз в GUST_EVERY мс.
const REED_SWAY = 4;
const REED_SWAY_SPEED = 0.0022;
const REED_GUST = 10;
const GUST_EVERY = 2800;
const GUST_FADE = 1400;

/**
 * Прорубь: тёмная вода в ледяной кромке посреди замёрзшего озера. Встал рядом —
 * рыба через интервал сама летит на стопку (раздел 4 плана, уровень 4).
 * Вокруг — тени рыб подо льдом, позёмка, удочка с поплавком и камыш по берегу:
 * поплавок ныряет и удочка гнётся в такт поклёвке (fishTimer).
 *
 * Прорубь только хранит таймер поклёвки и показывает себя: подсвечивается,
 * пока вождь рядом, и плещет при поклёвке. Когда клюёт и куда летит рыба,
 * решает systems/Gathering.ts. Про вождя и рюкзак прорубь ничего не знает.
 */
export class IceHole {
  // Середина проруби.
  readonly x: number;
  readonly y: number;
  // Сколько мс вождь уже рыбачит с прошлой поклёвки. Меняет systems/Gathering.ts.
  fishTimer = 0;

  private scene: Phaser.Scene;
  // Картинка проруби.
  private image: Phaser.GameObjects.Image;
  // Круг на воде при поклёвке.
  private ripple: Phaser.GameObjects.Image;
  // Подсвечена ли прорубь сейчас (вождь рядом).
  private isHighlighted = false;
  // Тени рыб подо льдом и насколько они сплылись к проруби (0–1).
  private fishShadows: Phaser.GameObjects.Image[] = [];
  private lure = 0;
  // Удочка и леска (рисуются каждый кадр), поплавок, кустики камыша.
  private rod: Phaser.GameObjects.Graphics;
  private line: Phaser.GameObjects.Graphics;
  private bobber: Phaser.GameObjects.Image;
  private reeds: Phaser.GameObjects.Image[] = [];
  // Насколько согнута удочка, сколько мс прошло (качание) и сила порыва ветра (0–1).
  private bend = 0;
  private time = 0;
  private gust = 0;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.scene = scene;
    this.x = x;
    this.y = y;

    // Озеро: лёд под прорубью, тени рыб подо льдом, позёмка.
    scene.add.image(x - ICE_LAKE_HOLE_OFFSET.x, y - ICE_LAKE_HOLE_OFFSET.y, TEXTURES.iceLake).setDepth(LAKE_DEPTH);
    for (let i = 0; i < FISH_SHADOWS; i++) {
      this.fishShadows.push(scene.add.image(x, y, TEXTURES.fishShadow).setAlpha(FISH_SHADOW_ALPHA).setDepth(LAKE_DEPTH + 1).setScale(0.9 - i * 0.1));
    }
    scene.add
      .particles(x - 70, y - 50, TEXTURES.snowflake, { ...DRIFTING_SNOW, y: { min: 0, max: 130 } })
      .setDepth(LAKE_DEPTH + 2);
    this.image = scene.add.image(x, y, TEXTURES.iceHole).setDepth(FLAT_ON_GROUND_DEPTH).setAlpha(IDLE_ALPHA);
    this.ripple = scene.add
      .image(x, y + WATER_OFFSET_Y, TEXTURES.ring)
      .setDepth(FLAT_ON_GROUND_DEPTH + 1)
      .setAlpha(0);
    // Рыбка над водой покачивается вверх-вниз: здесь ловят рыбу.
    const icon = scene.add
      .image(x, y + WATER_OFFSET_Y, ITEMS.rawFish.texture)
      .setScale(ICON_SCALE)
      .setAlpha(ICON_ALPHA)
      .setDepth(FLAT_ON_GROUND_DEPTH + 1);
    scene.tweens.add({
      targets: icon,
      y: icon.y - ICON_BOB_HEIGHT,
      duration: ICON_BOB_TIME,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Удочка в сугробе, леска и поплавок на воде.
    const base = { x: x + ROD_BASE.x, y: y + ROD_BASE.y };
    scene.add.image(base.x + 6, base.y + 12, TEXTURES.snowDrift).setOrigin(0.5, 1).setScale(ROD_DRIFT_SCALE).setDepth(base.y + 1);
    this.rod = scene.add.graphics().setDepth(base.y);
    this.line = scene.add.graphics().setDepth(FLAT_ON_GROUND_DEPTH + 2);
    this.bobber = scene.add
      .image(x + BOBBER_OFFSET.x, y + BOBBER_OFFSET.y, TEXTURES.bobber)
      .setOrigin(0.5, 0.6)
      .setScale(BOBBER_SCALE)
      .setDepth(FLAT_ON_GROUND_DEPTH + 3);
    // Камыш по берегу.
    for (const [dx, dy, size] of REEDS) {
      this.reeds.push(scene.add.image(x + dx, y + dy, TEXTURES.reed).setOrigin(0.5, 0.96).setScale(size).setDepth(y + dy));
    }
  }

  // Стоит ли точка (x, y) так близко к проруби, что можно рыбачить.
  contains(x: number, y: number): boolean {
    return Phaser.Math.Distance.Between(x, y, this.x, this.y) <= ICE_HOLE_RADIUS;
  }

  // Откуда вылетает пойманная рыба — из середины воды.
  getLootPoint(): Point {
    return { x: this.x, y: this.y + WATER_OFFSET_Y };
  }

  // Подсветка, пока вождь рыбачит. Сцена вызывает это каждый кадр.
  setHighlighted(isOn: boolean): void {
    // Твин запускаем, только когда подсветка меняется, а не каждый кадр.
    if (this.isHighlighted === isOn) return;
    this.isHighlighted = isOn;

    this.scene.tweens.add({
      targets: this.image,
      alpha: isOn ? ACTIVE_ALPHA : IDLE_ALPHA,
      scale: isOn ? ACTIVE_SCALE : 1,
      duration: HIGHLIGHT_TIME,
      ease: 'Sine.easeOut',
    });
  }

  // Поклёвка: по воде расходится круг, прорубь чуть пружинит.
  splash(): void {
    this.scene.tweens.killTweensOf(this.ripple);
    this.ripple.setScale(SPLASH_START_SCALE).setAlpha(1);
    this.scene.tweens.add({
      targets: this.ripple,
      scale: SPLASH_END_SCALE,
      alpha: 0,
      duration: SPLASH_TIME,
      ease: 'Sine.easeOut',
    });
    pop(this.scene, this.image, this.isHighlighted ? ACTIVE_SCALE : 1, SPLASH_POP);
    // Рыба поймана — удочка распрямляется с отдачей.
    this.bend = BEND_RECOIL;
  }

  // Каждый кадр (зовёт GameScene): тени рыб, поплавок и удочка в такт поклёвке, камыш на ветру.
  update(delta: number): void {
    this.time += delta;
    // Доля интервала до следующей рыбы: 0 — только что клюнула, 1 — сейчас клюнет.
    const bite = this.isHighlighted ? this.fishTimer / FISH_INTERVAL : 0;
    this.lure = Phaser.Math.Linear(this.lure, bite, Math.min(1, delta / 300));
    // Середина кругов: середина озера, к поклёвке — прорубь.
    const centerX = Phaser.Math.Linear(this.x - ICE_LAKE_HOLE_OFFSET.x, this.x, this.lure);
    const centerY = Phaser.Math.Linear(this.y - ICE_LAKE_HOLE_OFFSET.y, this.y, this.lure);
    this.fishShadows.forEach((shadow, i) => {
      const angle = this.time * (FISH_SHADOW_SPEED + i * FISH_SHADOW_SPEED_STEP) + i * 1.7;
      const radius = (FISH_SHADOW_RADIUS + i * FISH_SHADOW_RADIUS_STEP) * (1 - this.lure * LURE_SHRINK);
      shadow
        .setPosition(centerX + Math.cos(angle) * radius, centerY + 8 + Math.sin(angle) * radius * FISH_SHADOW_FLATTEN)
        .setRotation(angle + Math.PI / 2);
    });

    const dip = BITE_DIPS.find((d) => bite >= d.from && bite < d.to)?.depth ?? 0;
    const bob = Math.sin(this.time * BOBBER_BOB_SPEED) * BOBBER_BOB;
    this.bobber.setY(this.y + BOBBER_OFFSET.y + bob + dip);
    this.bend = Phaser.Math.Linear(this.bend, bite >= BEND_FROM ? BEND : 0, BEND_SMOOTH);
    this.drawRod();

    this.gust = Math.max(0, this.gust - delta / GUST_FADE);
    if (this.time % GUST_EVERY < delta) this.gust = 1;
    this.reeds.forEach((reed, i) => reed.setAngle(Math.sin(this.time * REED_SWAY_SPEED + i * 0.9) * REED_SWAY + this.gust * REED_GUST));
  }

  // Удилище — изогнутая сужающаяся палка от рукояти к кончику (кончик тянет к воде на поклёвке),
  // от кончика к поплавку — провисшая леска.
  private drawRod(): void {
    const base = { x: this.x + ROD_BASE.x, y: this.y + ROD_BASE.y };
    const tip = { x: this.x + ROD_TIP.x + this.bend * 2, y: this.y + ROD_TIP.y + this.bend * 9 };
    const mid = { x: (base.x + tip.x) / 2 - 10, y: (base.y + tip.y) / 2 - 10 + this.bend * 2 };
    const curve = new Phaser.Curves.QuadraticBezier(
      new Phaser.Math.Vector2(base.x, base.y),
      new Phaser.Math.Vector2(mid.x, mid.y),
      new Phaser.Math.Vector2(tip.x, tip.y),
    ).getPoints(16);
    this.rod.clear();
    // Сначала обводка (толще), потом дерево; у рукояти — тёмная обмотка.
    for (const [color, extra] of [[COLORS.outline, 6], [COLORS.wood, 0]]) {
      curve.forEach((point, i) => {
        const share = i / (curve.length - 1);
        const isGrip = share <= ROD_GRIP_SHARE;
        const width = (isGrip ? ROD_GRIP_WIDTH : Phaser.Math.Linear(ROD_WIDTH, ROD_TIP_WIDTH, share)) + extra;
        const fill = extra > 0 ? color : isGrip ? COLORS.woodDark : color;
        this.rod.fillStyle(fill, 1);
        this.rod.fillCircle(point.x, point.y, width / 2);
        if (i > 0) {
          this.rod.lineStyle(width, fill, 1);
          this.rod.lineBetween(curve[i - 1].x, curve[i - 1].y, point.x, point.y);
        }
      });
    }
    const end = { x: this.bobber.x, y: this.bobber.y - 12 };
    const sag = this.bend >= BEND / 2 ? 0 : LINE_SAG;
    this.line.clear();
    this.line.lineStyle(1.6, COLORS.fishingLine, 0.9);
    this.line.strokePoints(
      new Phaser.Curves.QuadraticBezier(
        new Phaser.Math.Vector2(tip.x, tip.y),
        new Phaser.Math.Vector2((tip.x + end.x) / 2, Math.max(tip.y, end.y) + sag),
        new Phaser.Math.Vector2(end.x, end.y),
      ).getPoints(12),
      false,
    );
  }
}
