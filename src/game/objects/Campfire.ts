import Phaser from 'phaser';
import { FIRE_MAX_HEAT, FIRE_START_HEAT, STAR_HEAT_MARK } from '../settings';
import { COLORS } from '../palette';
import { TEXTURES } from '../textures';
import { flyArc, Point } from '../fx';

// ===== Костёр =====

// Свет костра лежит плоско на земле: выше декора земли (-200 в GameScene),
// ниже всего, что стоит (depth = y ≥ 0). Площадка поленницы — на том же слое.
const GLOW_DEPTH = -100;
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
// При слабом жаре пламя уменьшается до этой доли своего размера.
const FLAME_MIN_SIZE = 0.35;
// Тёплый круг света на снегу: ширина, сплющенность (мы смотрим сверху под углом), прозрачность.
const GLOW_WIDTH = 340;
const GLOW_FLATTEN = 0.6;
const GLOW_ALPHA = 0.45;
// Свет «дышит»: на какую долю меняется размер и за сколько мс.
const GLOW_PULSE = 0.06;
const GLOW_PULSE_TIME = 700;
// Поверх медленного дыхания — быстрое неровное мерцание (мс) и его доля:
// две волны разной длины складываются, и свет дрожит, как живой огонь.
const GLOW_FLICKER_TIME = 230;
const GLOW_FLICKER_SHARE = 0.4;
// Ореол огня: тёплое свечение вокруг пламени. Оно складывается с цветом под ним
// (режим ADD), поэтому камни, вертел и вождь рядом с огнём ловят оранжевые блики.
// Размер (ширина в пикселях), подъём над землёй и прозрачность при полном жаре.
const HALO_WIDTH = 230;
const HALO_LIFT = 40;
const HALO_ALPHA = 0.32;
// Ореол лежит над кострищем и вертелом, но под языками пламени.
const HALO_DEPTH_SHIFT = 0.08;
// Свет тускнеет до этой прозрачности и снова разгорается.
const GLOW_MIN_ALPHA = 0.32;
// При слабом жаре круг света сжимается до этой доли своего размера.
const GLOW_MIN_SIZE = 0.4;
// Искры вылетают из середины пламени.
const SPARKS_OFFSET_Y = -40;
// Искры: летят вверх, чуть в стороны, гаснут и меняют цвет от белого к красному.
// Горячий воздух тянет их вверх (gravityY меньше нуля) — искры разгоняются, как над живым огнём.
const SPARKS: Phaser.Types.GameObjects.Particles.ParticleEmitterConfig = {
  speedX: { min: -35, max: 35 },
  speedY: { min: -110, max: -50 },
  gravityY: -45,
  lifespan: { min: 700, max: 1400 },
  scale: { start: 1, end: 0 },
  alpha: { start: 1, end: 0 },
  frequency: 160, // новая искра раз в 160 мс
  maxAliveParticles: 12, // не больше 12 искр сразу — бережём слабые компьютеры
  color: [COLORS.fireCore, COLORS.fireYellow, COLORS.fireOrange, COLORS.fireRed],
};
// Сколько искр вылетает разом, когда в огонь падает связка.
const SPARKS_BURST = 6;

// ===== Дымок =====

// Дымок поднимается из середины пламени. Он стоит за языками пламени (не пачкает огонь),
// но над кострищем и вертелом.
const SMOKE_OFFSET_Y = -70;
const SMOKE_DEPTH_SHIFT = 0.06;
// Дымок: редкие клубы медленно поднимаются, растут, расплываются и тают.
// Ветер чуть сносит их влево. Клубов немного — бережём слабые компьютеры.
const SMOKE: Phaser.Types.GameObjects.Particles.ParticleEmitterConfig = {
  x: { min: -8, max: 8 },
  speedX: { min: -18, max: 4 },
  speedY: { min: -60, max: -40 },
  lifespan: { min: 2200, max: 3000 },
  scale: { start: 0.6, end: 2.1 },
  alpha: { values: [0, 0.75, 0.45, 0] }, // проявляется, редеет, тает
  tint: COLORS.smoke,
  frequency: 420, // новый клуб раз в 420 мс
  maxAliveParticles: 8, // не больше 8 клубов сразу
};

// ===== Угли =====

// Угли: маленький красный свет, который медленно пульсирует.
const EMBER_GLOW_SIZE = 0.3;
const EMBER_PULSE_TIME = 600;
const EMBER_MIN_ALPHA = 0.25;
const EMBER_MAX_ALPHA = 0.7;

// ===== Шкала жара =====

// Шкала висит над пламенем.
const HEAT_BAR_OFFSET_Y = 150;
// Шкала поверх всех стоящих предметов (их глубина = y ≤ высоты мира),
// но под летящими связками (10000, fx.ts).
const HEAT_BAR_DEPTH = 9000;
// Заливка начинается на столько пикселей левее середины шкалы.
const HEAT_FILL_LEFT = 52;
// Засечка второй звезды: тонкая черта поперёк шкалы, чуть выше и ниже заливки.
const HEAT_MARK_WIDTH = 3;
const HEAT_MARK_HEIGHT = 18;
// Пока костёр в углях, шкала мигает: самая низкая прозрачность и время мигания.
const HEAT_BAR_BLINK_ALPHA = 0.3;
const HEAT_BAR_BLINK_TIME = 250;

// ===== Связка летит в огонь =====

// Сколько мс связка летит из поленницы в огонь и как высоко поднимается дуга.
const FEED_FLY_TIME = 420;
const FEED_ARC_HEIGHT = 110;

// Волна от 0 до 1 и обратно: 0 при time = 0, 1 через halfPeriod мс, снова 0 через 2·halfPeriod.
// Так же меняется число у твина с yoyo и плавным ease 'Sine.easeInOut'.
function wave(time: number, halfPeriod: number): number {
  return (1 - Math.cos((time / halfPeriod) * Math.PI)) / 2;
}

/**
 * Костёр в лагере: кострище, языки пламени, искры, круг света
 * и шкала жара над ним.
 *
 * Костёр только хранит жар и показывает его: чем меньше жара, тем меньше
 * пламя и свет. Жар на нуле — пламени нет, тлеют угли, шкала мигает.
 * Сколько жара сгорает и когда подкидывать хворост, решает systems/Fire.ts.
 * Про вождя и поленницу костёр ничего не знает.
 */
export class Campfire {
  // Середина кострища (точка, где оно касается земли).
  readonly x: number;
  readonly y: number;
  // Жар костра: от 0 до FIRE_MAX_HEAT (проценты). Меняет его systems/Fire.ts.
  heat = FIRE_START_HEAT;
  // Сколько мс костёр уже тлеет углями (жар на нуле). Меняет systems/Fire.ts.
  emberTime = 0;
  // Сколько мс прошло с прошлой связки из поленницы. Меняет systems/Fire.ts.
  feedTimer = 0;
  // Жар хоть раз опускался ниже засечки STAR_HEAT_MARK — вторая звезда потеряна.
  // Ставит сам костёр в update(), читает GameScene в конце уровня.
  wasBelowMark = false;

  private scene: Phaser.Scene;
  // Сколько мс горит костёр — из этого считаются мерцание и пульсация.
  private time = 0;
  // Языки пламени и их настройки.
  private flames: { image: Phaser.GameObjects.Image; flame: Flame }[] = [];
  // Круг света на снегу и его размер при полном жаре.
  private glow: Phaser.GameObjects.Image;
  private glowScaleX: number;
  // Ореол вокруг пламени (режим ADD) и его размер при полном жаре.
  private halo: Phaser.GameObjects.Image;
  private haloScale: number;
  // Искры над пламенем.
  private sparks: Phaser.GameObjects.Particles.ParticleEmitter;
  // Шкала жара: подложка и заливка, которая укорачивается вместе с жаром.
  private heatBarBack: Phaser.GameObjects.Image;
  private heatBarFill: Phaser.GameObjects.Image;
  // Засечка второй звезды на шкале.
  private heatMark: Phaser.GameObjects.Rectangle;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.scene = scene;
    this.x = x;
    this.y = y;

    this.glow = scene.add.image(x, y, TEXTURES.glow).setDepth(GLOW_DEPTH);
    this.glowScaleX = GLOW_WIDTH / this.glow.width;

    scene.add.image(x, y, TEXTURES.firePit).setOrigin(0.5, 1).setDepth(y);

    this.halo = scene.add
      .image(x, y - HALO_LIFT, TEXTURES.fireLight)
      .setTint(COLORS.fireOrange)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(y + HALO_DEPTH_SHIFT);
    this.haloScale = HALO_WIDTH / this.halo.width;

    FLAMES.forEach((flame, index) => {
      const image = scene.add
        .image(x + flame.x, y - FLAME_BASE_LIFT, TEXTURES.flame)
        .setOrigin(0.5, 1)
        .setAngle(flame.angle)
        .setDepth(y + FLAME_DEPTH_STEP * (index + 1));
      this.flames.push({ image, flame });
    });

    // Дымок идёт всегда — и от пламени, и от тлеющих углей, поэтому его не нужно хранить.
    scene.add
      .particles(x, y + SMOKE_OFFSET_Y, TEXTURES.smoke, SMOKE)
      .setDepth(y + SMOKE_DEPTH_SHIFT);

    this.sparks = scene.add
      .particles(x, y + SPARKS_OFFSET_Y, TEXTURES.spark, SPARKS)
      .setDepth(y + SPARKS_DEPTH_SHIFT);

    const barY = y - HEAT_BAR_OFFSET_Y;
    this.heatBarBack = scene.add.image(x, barY, TEXTURES.heatBarBack).setDepth(HEAT_BAR_DEPTH);
    // Точка опоры заливки — её левый край: заливка укорачивается справа налево.
    this.heatBarFill = scene.add
      .image(x - HEAT_FILL_LEFT, barY, TEXTURES.heatBarFill)
      .setOrigin(0, 0.5)
      .setTint(COLORS.heatBar)
      .setDepth(HEAT_BAR_DEPTH);
    // Засечка стоит там, где кончается заливка при жаре STAR_HEAT_MARK.
    const markX = x - HEAT_FILL_LEFT + (this.heatBarFill.width * STAR_HEAT_MARK) / FIRE_MAX_HEAT;
    this.heatMark = scene.add
      .rectangle(markX, barY, HEAT_MARK_WIDTH, HEAT_MARK_HEIGHT, COLORS.heatMark)
      .setDepth(HEAT_BAR_DEPTH);

    this.update(0);
  }

  // Жар на нуле: пламени нет, тлеют угли.
  isEmbers(): boolean {
    return this.heat <= 0;
  }

  // Добавить жар (не больше FIRE_MAX_HEAT). Угли снова разгораются.
  addHeat(amount: number): void {
    this.heat = Math.min(FIRE_MAX_HEAT, this.heat + amount);
    this.emberTime = 0;
  }

  // Принять связку из поленницы: она по дуге летит в огонь и сгорает.
  // onBurn вызывается, когда связка упала в огонь, — система добавит жар.
  receive(item: Phaser.GameObjects.Image, onBurn: () => void): void {
    flyArc(this.scene, item, {
      from: { x: item.x, y: item.y },
      target: () => this.getFeedPoint(),
      duration: FEED_FLY_TIME,
      height: FEED_ARC_HEIGHT,
      onLand: () => {
        item.destroy();
        // Связка упала в огонь — вылетает горсть искр.
        this.sparks.emitParticle(SPARKS_BURST);
        onBurn();
      },
    });
  }

  // Вызывается сценой каждый кадр: показывает жар — пламя, свет, искры и шкалу.
  update(delta: number): void {
    this.time += delta;
    const isEmbers = this.isEmbers();
    // Доля жара: 0 — угли, 1 — полный костёр.
    const heatShare = this.heat / FIRE_MAX_HEAT;

    this.updateFlames(isEmbers, heatShare);
    this.updateGlow(isEmbers, heatShare);
    this.updateHalo(isEmbers, heatShare);

    // В углях искры не летят.
    if (isEmbers && this.sparks.emitting) this.sparks.stop();
    if (!isEmbers && !this.sparks.emitting) this.sparks.start();

    this.heatBarFill.setScale(heatShare, 1);
    // Жар упал ниже засечки — она темнеет до конца уровня: вторая звезда потеряна.
    if (!this.wasBelowMark && this.heat < STAR_HEAT_MARK) {
      this.wasBelowMark = true;
      this.heatMark.setFillStyle(COLORS.heatMarkLost);
    }
    // В углях шкала мигает — «спаси огонь!».
    const blink = isEmbers ? wave(this.time, HEAT_BAR_BLINK_TIME) : 0;
    this.heatBarBack.setAlpha(1 - (1 - HEAT_BAR_BLINK_ALPHA) * blink);
  }

  // ===== Внешний вид =====

  // Куда падает связка, брошенная в огонь: в середину пламени.
  private getFeedPoint(): Point {
    return { x: this.x, y: this.y - FLAME_BASE_LIFT };
  }

  // Языки пламени: размер зависит от жара, каждый мерцает в своём ритме.
  // Мерцание считается здесь, а не твином, — на паузе оно замирает вместе со сценой.
  private updateFlames(isEmbers: boolean, heatShare: number): void {
    const size = Phaser.Math.Linear(FLAME_MIN_SIZE, 1, heatShare);

    for (const { image, flame } of this.flames) {
      image.setVisible(!isEmbers);
      const flicker = wave(this.time, flame.time);
      const scale = flame.scale * size;
      image.setScale(scale * (1 - FLAME_SQUEEZE * flicker), scale * (1 + FLAME_STRETCH * flicker));
      image.setAlpha(1 - (1 - FLAME_MIN_ALPHA) * flicker);
    }
  }

  // Круг света: при жаре — тёплый и «дышит», в углях — маленький красный и пульсирует.
  private updateGlow(isEmbers: boolean, heatShare: number): void {
    if (isEmbers) {
      const pulse = wave(this.time, EMBER_PULSE_TIME);
      const scaleX = this.glowScaleX * EMBER_GLOW_SIZE;
      this.glow.setTint(COLORS.ember);
      this.glow.setScale(scaleX, scaleX * GLOW_FLATTEN);
      this.glow.setAlpha(Phaser.Math.Linear(EMBER_MIN_ALPHA, EMBER_MAX_ALPHA, pulse));
      return;
    }

    const breath = this.getBreath();
    const scaleX = this.glowScaleX * Phaser.Math.Linear(GLOW_MIN_SIZE, 1, heatShare) * (1 + GLOW_PULSE * breath);
    this.glow.setTint(COLORS.fireGlow);
    this.glow.setScale(scaleX, scaleX * GLOW_FLATTEN);
    this.glow.setAlpha(Phaser.Math.Linear(GLOW_ALPHA, GLOW_MIN_ALPHA, breath));
  }

  // Ореол вокруг пламени: растёт с жаром и дрожит вместе со светом. В углях его нет.
  private updateHalo(isEmbers: boolean, heatShare: number): void {
    this.halo.setVisible(!isEmbers);
    if (isEmbers) return;
    const breath = this.getBreath();
    this.halo.setScale(this.haloScale * Phaser.Math.Linear(FLAME_MIN_SIZE, 1, heatShare) * (1 + GLOW_PULSE * breath));
    this.halo.setAlpha(HALO_ALPHA * (1 - GLOW_PULSE * 2 * breath));
  }

  // «Дыхание» огня от 0 до 1: медленная волна плюс быстрое неровное мерцание.
  private getBreath(): number {
    const slow = wave(this.time, GLOW_PULSE_TIME);
    const fast = wave(this.time, GLOW_FLICKER_TIME);
    return Phaser.Math.Linear(slow, fast, GLOW_FLICKER_SHARE);
  }
}
