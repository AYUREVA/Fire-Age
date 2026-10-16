import Phaser from 'phaser';
import { COLORS } from '../palette';
import { TEXTURES } from '../textures';

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
 * Костёр в лагере: кострище, мерцающие языки пламени, искры
 * и тёплый круг света на снегу.
 * Про вождя и поленницу костёр ничего не знает.
 */
export class Campfire {
  // Середина кострища (точка, где оно касается земли).
  readonly x: number;
  readonly y: number;

  private scene: Phaser.Scene;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.scene = scene;
    this.x = x;
    this.y = y;

    this.createGlow();

    scene.add.image(x, y, TEXTURES.firePit).setOrigin(0.5, 1).setDepth(y);

    FLAMES.forEach((flame, index) => {
      this.createFlame(x + flame.x, y - FLAME_BASE_LIFT, y + FLAME_DEPTH_STEP * (index + 1), flame);
    });

    scene.add.particles(x, y + SPARKS_OFFSET_Y, TEXTURES.spark, SPARKS).setDepth(y + SPARKS_DEPTH_SHIFT);
  }

  // Тёплый круг света на снегу вокруг костра. Он медленно «дышит».
  private createGlow(): void {
    const glow = this.scene.add
      .image(this.x, this.y, TEXTURES.glow)
      .setTint(COLORS.fireGlow)
      .setAlpha(GLOW_ALPHA)
      .setDepth(GLOW_DEPTH);
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
