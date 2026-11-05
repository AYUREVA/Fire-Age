import Phaser from 'phaser';
import {
  MAMMOTH_CHARGE_SPEED,
  MAMMOTH_HP,
  MAMMOTH_RAM_RADIUS,
  MAMMOTH_SPEED,
  MAMMOTH_STOMP_RADIUS,
  MAMMOTH_STOMP_WINDUP,
} from '../settings';
import { COLORS } from '../palette';
import { MAMMOTH_ANATOMY, MAMMOTH_PARTS, TEXTURES } from '../textures';
import { floatText, pop, Point } from '../fx';
import { SOUNDS, SOUND_VOLUMES, playSound } from '../sounds';

// ===== Вид =====

// Мамонт собран из частей (MAMMOTH_PARTS, textures.ts) и нарисован крупнее, чем стоит на поле:
// весь мамонт уменьшается в SCALE раз.
const SCALE = 0.82;
// Тень под ногами: ширина в пикселях и глубина — сразу под мамонтом.
const SHADOW_WIDTH = 240;
const SHADOW_DEPTH_SHIFT = -0.5;

// Поза в каждом состоянии: наклон тела (градусы, плюс — вперёд по взгляду), наклон головы,
// углы трёх звеньев хобота (минус — вперёд), хвост, растяжение по ширине и высоте,
// размах ног и скорость шага (0 — стоит), насколько подпрыгивает на шаге.
type Pose = { lean: number; head: number; trunk: number[]; tail: number; stretchX: number; stretchY: number; legSwing: number; stepSpeed: number; bob: number };
const POSES: Record<'idle' | 'wander' | 'prepare' | 'charge' | 'tired' | 'rage' | 'stomp', Pose> = {
  idle: { lean: 0, head: 0, trunk: [-4, -8, -18], tail: 10, stretchX: 1, stretchY: 1, legSwing: 0, stepSpeed: 0, bob: 0 },
  wander: { lean: 1, head: 2, trunk: [-6, -8, -16], tail: 18, stretchX: 1, stretchY: 1, legSwing: 17, stepSpeed: 0.0085, bob: 4 },
  prepare: { lean: -7, head: -16, trunk: [-120, -30, -40], tail: -20, stretchX: 0.97, stretchY: 1.04, legSwing: 0, stepSpeed: 0, bob: 0 },
  charge: { lean: 9, head: 12, trunk: [28, 18, 14], tail: 70, stretchX: 1.07, stretchY: 0.95, legSwing: 32, stepSpeed: 0.03, bob: 8 },
  tired: { lean: 4, head: 18, trunk: [10, 6, -6], tail: -6, stretchX: 1, stretchY: 1, legSwing: 0, stepSpeed: 0, bob: 0 },
  // Ярость — встаёт на дыбы, голова и хобот вверх (ревёт). Топот — тоже на дыбах, перед ударом.
  rage: { lean: -14, head: -22, trunk: [-130, -30, -40], tail: -30, stretchX: 0.96, stretchY: 1.06, legSwing: 0, stepSpeed: 0, bob: 0 },
  stomp: { lean: -22, head: -18, trunk: [-110, -25, -30], tail: -20, stretchX: 0.97, stretchY: 1.05, legSwing: 0, stepSpeed: 0, bob: 0 },
};

// Пружины: части догоняют позу с лёгким перелётом. Жёсткость и затухание — тело, голова,
// хобот (у кончика мягче), хвост и юбка, растяжение, «сжатие» от удара, разворот.
const BODY_SPRING = { stiffness: 90, damping: 12 };
const HEAD_SPRING = { stiffness: 110, damping: 11 };
const TRUNK_STIFFNESS = 70;
const TRUNK_STIFFNESS_STEP = 12;
const TRUNK_DAMPING = 7;
const TAIL_SPRING = { stiffness: 60, damping: 6 };
const STRETCH_SPRING = { stiffness: 120, damping: 14 };
const SQUASH_SPRING = { stiffness: 180, damping: 9 };
const TURN_SPRING = { stiffness: 160, damping: 18 };
// Самый большой шаг пружины по времени (с): при подвисании кадра пружина не «взрывается».
const MAX_SPRING_STEP = 0.033;
// Сжатие на «сжатие»: на столько уже и выше (на единицу сжатия).
const SQUASH_WIDEN = 0.05;
const SQUASH_STRETCH = 0.07;
// Толчки пружин: присел перед тараном, вытянулся на старте, удар (сжатие, голова, тело), устал.
const PREPARE_SQUASH = -1.2;
const CHARGE_SQUASH = 1.4;
const HIT_SQUASH = -2.2;
const HIT_HEAD_KICK = -90;
const HIT_LEAN_KICK = -60;
const TIRED_SQUASH = -0.8;
// На ходу тело и голова покачиваются, хобот качается волной; хвост машет всегда.
const WALK_LEAN_SWAY = 1.2;
const WALK_HEAD_SWAY = 2.5;
const TRUNK_SWAY_SPEED = 0.004;
const TRUNK_SWAY = 6;
const TRUNK_SWAY_STEP = 4;
const TAIL_SWAY_SPEED = 0.006;
const TAIL_SWAY = 10;
// Хобот и юбка отстают от движения: угол на единицу скорости (пикс/с).
const TRUNK_DRAG = 0.012;
const SKIRT_DRAG = 0.01;
const SKIRT_MAX_ANGLE = 6;
// Ноги: при выносе вперёд поднимаются на долю размаха; уставший стоит, расставив ноги.
const LEG_LIFT_SHARE = 0.25;
const TIRED_LEG_ANGLE = 4;
const FALLEN_LEG_ANGLE = 30;
// Дыхание: обычное и у уставшего (глубокое и частое) — доля высоты и скорость.
const BREATH = 0.012;
const BREATH_SPEED = 0.0025;
const TIRED_BREATH = 0.035;
const TIRED_BREATH_SPEED = 0.008;
// Роет копытом: удар назад раз в PAW_TIME мс на столько градусов, нога поднимается.
const PAW_TIME = 420;
const PAW_ANGLE = 36;
const PAW_LIFT = 10;
const PREPARE_SHAKE = 1.5;
const PREPARE_SHAKE_SPEED = 0.03;
// Трубит через столько мс после начала «роет»: три звуковые дуги от кончика хобота.
const TRUMPET_DELAY = 380;
const TRUMPET_ARCS = 3;
const TRUMPET_ARC_GAP = 150;
const TRUMPET_TIME = 700;
const TRUMPET_DISTANCE = 70;
// Моргает раз в 2,2–4,2 с, глаз закрыт BLINK_TIME мс; уставший — медленно и чаще.
const BLINK_MIN = 2200;
const BLINK_MAX = 4200;
const BLINK_TIME = 120;
const TIRED_BLINK_EVERY = 1400;
const TIRED_BLINK_TIME = 380;
// Как часто идёт пар из хобота (роет), изо рта (устал) и снег из-под ног (таран), мс.
const PREPARE_STEAM_EVERY = 140;
const TIRED_STEAM_EVERY = 900;
const CHARGE_TRAIL_EVERY = 80;
// Где рот (пар уставшего): от ног вперёд и вверх, в пикселях на поле.
const MOUTH_OFFSET = { x: 120, y: -110 };
// Таран: линии скорости позади — сколько, длина и время.
const SPEED_LINES = 3;
const SPEED_LINE_MIN = 40;
const SPEED_LINE_MAX = 90;
const SPEED_LINE_TIME = 320;
// Устал: над головой кружатся звёздочки.
const TIRED_STAR_COUNT = 3;
const TIRED_STAR_SCALE = 0.45;
const TIRED_STAR_RADIUS_X = 40;
const TIRED_STAR_RADIUS_Y = 11;
const TIRED_STAR_SPEED = 0.005;
// Удар: мамонт белеет на HIT_FLASH_TIME мс, летят клочья шерсти, всплывает урон.
const HIT_FLASH_TIME = 85;
const HIT_TUFTS = 10;
const DAMAGE_OFFSET_Y = -170;
// Откуда летят клочья шерсти: от ног вверх и назад от середины.
const TUFTS_OFFSET = { x: -30, y: -110 };
// Падение: ноги подкашиваются, мамонт заваливается и подскакивает, облако снега,
// потом тает — и на его месте гора окороков. Всё вместе короче MAMMOTH_FALL_TIME (settings.ts).
const FALL_SINK = 10;
const FALL_SINK_TIME = 200;
const FALL_TIP_ANGLE = 18;
const FALL_TIP_TIME = 250;
const FALL_ANGLE = 88;
const FALL_DROP = 24;
const FALL_TIME = 350;
const FALL_BOUNCE_ANGLE = 80;
const FALL_BOUNCE_TIME = 100;
const FALL_FADE_TIME = 200;
const FALL_SHAKE_TIME = 380;
const FALL_SHAKE_INTENSITY = 0.008;

// ===== Ярость, топот, путь тарана (с 0.9.1) =====

// Ярость: рёв, тряска экрана, надпись над мамонтом. Потом до конца боя глаза горят красным,
// шерсть пульсирует красным, со спины идёт пар.
const RAGE_SHAKE_TIME = 900;
const RAGE_SHAKE = 0.012;
const RAGE_TEXT_LIFT = 250;
const RAGE_TEXT = 'ЯРОСТЬ!';
const RAGE_EYE_SCALE = 0.2;
const RAGE_PULSE_SPEED = 0.012;
const RAGE_STEAM_EVERY = 450;
const RAGE_BACK = { x: -20, y: -210 };
// Топот: середина удара — перед мамонтом; круг предупреждения сплюснут (смотрим сверху-сбоку);
// после удара волна расходится за WAVE_TIME мс, летят ледяные осколки, экран трясётся.
const STOMP_FRONT = 60;
const STOMP_FLATTEN = 0.5;
// Красный круг: прозрачность заливки (и на сколько она пульсирует), толщина края.
const STOMP_FILL_ALPHA = 0.3;
const STOMP_FILL_PULSE = 0.12;
const STOMP_EDGE_WIDTH = 6;
const STOMP_SLAM_SQUASH = 2.4;
const STOMP_SLAM_LEAN = 140;
const STOMP_WAVE_TIME = 450;
const STOMP_SHARDS = 26;
const STOMP_SHAKE_TIME = 450;
const STOMP_SHAKE = 0.014;
const STOMP_SOUND_DETUNE = -1400;
// Путь тарана: дорожка шириной в два радиуса тарана, полоски по ней и стрелка в конце.
// Пока мамонт роет — мигает; на таране тает.
const LANE_ALPHA = 0.16;
const LANE_DASH_ALPHA = 0.55;
const LANE_DASH = 40;
const LANE_DASH_STEP = 70;
const LANE_ARROW = 60;
const LANE_BLINK_SPEED = 0.012;
const LANE_FADE_TIME = 400;
// «!» над вождём, если дорожка тарана идёт через него: столько пикселей над его ногами.
const WARN_LIFT = 150;
const WARN_TEXT = '!';
// Дорожка и круг лежат на снегу, под всеми стоящими предметами (как площадки куч).
const GROUND_MARK_DEPTH = -90;

// Частицы: комья снега (копыто, таран), снежная пыль, пар, клочья шерсти.
const SNOW_CLODS: Phaser.Types.GameObjects.Particles.ParticleEmitterConfig = {
  emitting: false,
  speed: { min: 60, max: 190 },
  angle: { min: 205, max: 335 },
  gravityY: 520,
  lifespan: { min: 450, max: 850 },
  scale: { start: 1.5, end: 0.3 },
  alpha: { start: 1, end: 0 },
};
const SNOW_DUST: Phaser.Types.GameObjects.Particles.ParticleEmitterConfig = {
  emitting: false,
  speed: { min: 15, max: 75 },
  angle: { min: 180, max: 360 },
  lifespan: { min: 550, max: 950 },
  scale: { start: 0.12, end: 0.42 },
  alpha: { start: 0.85, end: 0 },
};
const STEAM: Phaser.Types.GameObjects.Particles.ParticleEmitterConfig = {
  emitting: false,
  speed: { min: 10, max: 35 },
  angle: { min: 250, max: 290 },
  gravityY: -30,
  lifespan: { min: 900, max: 1500 },
  scale: { start: 0.1, end: 0.38 },
  alpha: { start: 0.55, end: 0 },
};
const TUFTS: Phaser.Types.GameObjects.Particles.ParticleEmitterConfig = {
  emitting: false,
  speed: { min: 90, max: 220 },
  angle: { min: 200, max: 340 },
  gravityY: 640,
  lifespan: { min: 500, max: 800 },
  scale: { start: 1.6, end: 0.9 },
  alpha: { start: 1, end: 0 },
  rotate: { start: 0, end: 540 },
  tint: COLORS.mammoth,
};
const SHARDS: Phaser.Types.GameObjects.Particles.ParticleEmitterConfig = {
  emitting: false,
  speed: { min: 150, max: 340 },
  angle: { min: 190, max: 350 },
  gravityY: 700,
  lifespan: 800,
  scale: { start: 1.6, end: 0.6 },
  rotate: { start: 0, end: 540 },
  tint: [COLORS.ice, COLORS.white, COLORS.iceShade],
};
// Частицы — перед мамонтом.
const PARTICLES_DEPTH_SHIFT = 2;

// Пружина: значение и скорость. springTo тянет значение к цели.
type Spring = { value: number; velocity: number };

function springTo(spring: Spring, target: number, seconds: number, stiffness: number, damping: number): number {
  const step = Math.min(seconds, MAX_SPRING_STEP);
  spring.velocity += ((target - spring.value) * stiffness - spring.velocity * damping) * step;
  spring.value += spring.velocity * step;
  return spring.value;
}

// Что делает мамонт. Это конечный автомат (план, раздел 4, «Финальный бой»):
//   'hidden'  — его ещё нет на поле (до дня боя);
//   'wander'  — идёт к цели: к вождю или к куче у костра;
//   'prepare' — роет землю копытом: сейчас будет таран;
//   'charge'  — таранит по прямой;
//   'tired'   — устал и стоит: окно для ударов;
//   'rage'    — ярость (с 0.9.1): на половине здоровья ревёт на дыбах, дальше таранит дважды;
//   'stomp'   — топот (с 0.9.1): на дыбах, на снегу красный круг, удар ногами — волна;
//   'fallen'  — повержен.
// Когда переходить в следующее состояние, решает systems/Boss.ts.
export type MammothState = 'hidden' | 'wander' | 'prepare' | 'charge' | 'tired' | 'rage' | 'stomp' | 'fallen';

/**
 * Мамонт — финальный босс каменного века (с 0.9).
 *
 * Мамонт хранит здоровье, состояние автомата, сколько он уже в этом
 * состоянии и куда идёт, и показывает себя. Какую цель выбрать, когда
 * таранить и что он задел, решает systems/Boss.ts. Про вождя, кучи
 * и частокол мамонт ничего не знает.
 *
 * Вид: мамонт собран из частей в одном контейнере, как волк. Каждая часть
 * догоняет позу своего состояния на «пружине» — поэтому хобот, юбка шерсти
 * и хвост запаздывают за телом и чуть перелетают.
 */
export class Mammoth {
  // Где ноги мамонта.
  x = 0;
  y = 0;
  // Здоровье: 0 — повержен.
  hp = MAMMOTH_HP;
  // Сколько мс мамонт в текущем состоянии.
  stateTime = 0;
  // Цель: -1 — вождь, иначе номер кучи у костра. Выбирает systems/Boss.ts.
  aim = -1;
  // Задел ли этот таран вождя: за один таран вождь отлетает один раз. Меняет systems/Boss.ts.
  hasRammedPlayer = false;
  // Куда побежит таран: выбран в начале «роет копытом» (по нему рисуется дорожка).
  chargeTo: Point = { x: 0, y: 0 };
  // В ярости ли (с половины здоровья до конца боя) и идёт ли сейчас второй таран подряд.
  // Ставят enrage() и systems/Boss.ts.
  isEnraged = false;
  isSecondCharge = false;
  // Сколько атак на вождя было (чередование тарана и топота) и ударил ли уже топот.
  // Меняет systems/Boss.ts.
  attacks = 0;
  hasStomped = false;

  private scene: Phaser.Scene;
  // Состояние автомата. Меняют его только функции переходов ниже.
  private state: MammothState = 'hidden';
  // Куда идёт или таранит.
  private target: Point = { x: 0, y: 0 };
  // Куда смотрит: 1 — вправо, -1 — влево.
  private facing = 1;
  // Где был в прошлом кадре — из этого скорость, от которой отстают хобот и юбка.
  private lastX = 0;
  // Фаза шага (радианы) и сколько мс он на поле (дыхание, хвост, хобот).
  private stepPhase = 0;
  private time = 0;
  // Сколько мс до моргания и до следующего пара или снега.
  private blinkTimer = BLINK_MAX;
  private effectTimer = 0;

  // Части: контейнер всего мамонта, ноги (номер в MAMMOTH_ANATOMY.hips), юбка, туловище,
  // контейнер головы, звенья хобота (каждое — контейнер в предыдущем), веко, хвост.
  private root: Phaser.GameObjects.Container;
  private legs: Phaser.GameObjects.Image[] = [];
  private skirt: Phaser.GameObjects.Image;
  private head: Phaser.GameObjects.Container;
  private trunk: Phaser.GameObjects.Container[] = [];
  private lid: Phaser.GameObjects.Image;
  private tail: Phaser.GameObjects.Image;
  // Все картинки частей — их белит вспышка удара.
  private images: Phaser.GameObjects.Image[] = [];
  private shadow: Phaser.GameObjects.Image;
  private stars: Phaser.GameObjects.Image[] = [];
  // Частицы: комья снега, снежная пыль, пар, клочья шерсти.
  private snowClods: Phaser.GameObjects.Particles.ParticleEmitter;
  private snowDust: Phaser.GameObjects.Particles.ParticleEmitter;
  private steam: Phaser.GameObjects.Particles.ParticleEmitter;
  private tufts: Phaser.GameObjects.Particles.ParticleEmitter;
  private shards: Phaser.GameObjects.Particles.ParticleEmitter;
  // На снегу: дорожка тарана и красный круг топота (рисуются кодом). Горящие глаза в ярости.
  private lane: Phaser.GameObjects.Graphics;
  private stompMark: Phaser.GameObjects.Graphics;
  private rageEyes: Phaser.GameObjects.Image;
  // Сколько мс ещё белеет вспышка удара (пока она идёт, красная ярость не красит шерсть).
  private flashLeft = 0;

  // Пружины позы.
  private lean: Spring = { value: 0, velocity: 0 };
  private headAngle: Spring = { value: 0, velocity: 0 };
  private trunkAngles: Spring[] = MAMMOTH_ANATOMY.trunk.map(() => ({ value: 0, velocity: 0 }));
  private tailAngle: Spring = { value: 0, velocity: 0 };
  private skirtAngle: Spring = { value: 0, velocity: 0 };
  private stretchX: Spring = { value: 1, velocity: 0 };
  private stretchY: Spring = { value: 1, velocity: 0 };
  private squash: Spring = { value: 0, velocity: 0 };
  private turn: Spring = { value: 1, velocity: 0 };

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    const parts = MAMMOTH_PARTS;
    const anatomy = MAMMOTH_ANATOMY;
    this.shadow = scene.add.image(0, 0, TEXTURES.shadow).setVisible(false);
    this.shadow.setScale(SHADOW_WIDTH / this.shadow.width);
    this.root = scene.add.container(0, 0).setScale(SCALE).setVisible(false);

    // Сзади наперёд: дальние ноги (темнее), хвост, ближние ноги, юбка, туловище, голова.
    for (const hip of anatomy.hips) {
      const leg = this.part(parts.leg, hip);
      if (hip.far) leg.setTint(COLORS.mammothFarLeg);
      this.legs.push(leg);
    }
    this.tail = this.part(parts.tail, anatomy.tail);
    const farLegs = this.legs.filter((_, i) => anatomy.hips[i].far);
    const nearLegs = this.legs.filter((_, i) => !anatomy.hips[i].far);
    this.skirt = this.part(parts.skirt, parts.skirt.pivot);
    const body = this.part(parts.body, parts.body.pivot);
    this.root.add([...farLegs, this.tail, ...nearLegs, this.skirt, body]);

    // Голова — контейнер у шеи: дальний бивень, голова, хобот, ближний бивень, веко.
    const neck = anatomy.neck;
    const local = (point: Point): Point => ({ x: point.x - neck.x, y: point.y - neck.y });
    this.head = scene.add.container(neck.x, neck.y);
    this.root.add(this.head);
    this.head.add(this.part(parts.tuskFar, local(anatomy.tuskFar)));
    this.head.add(this.part(parts.head, { x: 0, y: 0 }));
    let parent = this.head;
    let joint = local(anatomy.trunkBase);
    [parts.trunk0, parts.trunk1, parts.trunk2].forEach((spec, i) => {
      const link = scene.add.container(joint.x, joint.y);
      link.add(this.part(spec, { x: 0, y: 0 }));
      parent.add(link);
      this.trunk.push(link);
      parent = link;
      // Следующее звено — от конца этого (чуть внахлёст, чтобы не было щели).
      joint = { x: 0, y: anatomy.trunk[i] - 4 };
    });
    this.head.add(this.part(parts.tusk, local(anatomy.tuskNear)));
    this.lid = this.part(parts.lid, { x: 0, y: 0 }).setVisible(false);
    this.head.add(this.lid);

    for (let i = 0; i < TIRED_STAR_COUNT; i++) {
      this.stars.push(
        scene.add.image(0, 0, TEXTURES.star).setScale(TIRED_STAR_SCALE).setTint(COLORS.starOn).setVisible(false),
      );
    }
    this.snowClods = scene.add.particles(0, 0, TEXTURES.snowflake, SNOW_CLODS);
    this.snowDust = scene.add.particles(0, 0, TEXTURES.glow, SNOW_DUST);
    this.steam = scene.add.particles(0, 0, TEXTURES.glow, STEAM);
    this.tufts = scene.add.particles(0, 0, TEXTURES.chip, TUFTS);
    this.shards = scene.add.particles(0, 0, TEXTURES.chip, SHARDS);
    this.lane = scene.add.graphics().setDepth(GROUND_MARK_DEPTH);
    this.stompMark = scene.add.graphics().setDepth(GROUND_MARK_DEPTH);
    const eye = { x: MAMMOTH_ANATOMY.eye.x - neck.x, y: MAMMOTH_ANATOMY.eye.y - neck.y };
    this.rageEyes = scene.add
      .image(eye.x, eye.y, TEXTURES.glow)
      .setTint(COLORS.heatLow)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setScale(RAGE_EYE_SCALE)
      .setVisible(false);
    this.head.add(this.rageEyes);
  }

  // Картинка части: стоит в точке at (в координатах родителя), вращается вокруг своей точки pivot.
  private part(spec: { key: string; box: { x: number; y: number; w: number; h: number }; pivot: Point }, at: Point): Phaser.GameObjects.Image {
    const { box, pivot } = spec;
    const image = this.scene.add.image(at.x, at.y, spec.key).setOrigin((pivot.x - box.x) / box.w, (pivot.y - box.y) / box.h);
    this.images.push(image);
    return image;
  }

  // ===== Состояние (спрашивает systems/Boss.ts) =====

  getState(): MammothState {
    return this.state;
  }

  // На поле ли он и ещё не повержен.
  isActive(): boolean {
    return this.state !== 'hidden' && this.state !== 'fallen';
  }

  // Можно ли ударить: только уставшего.
  canBeHit(): boolean {
    return this.state === 'tired';
  }

  // Дошёл ли до точки, к которой идёт или таранит.
  isArrived(): boolean {
    return this.x === this.target.x && this.y === this.target.y;
  }

  // ===== Переходы автомата (зовёт systems/Boss.ts) =====

  // hidden → wander: выходит из леса в точке from.
  appear(from: Point): void {
    if (this.state !== 'hidden') return;
    this.x = from.x;
    this.y = from.y;
    this.lastX = from.x;
    this.target = { ...from };
    this.root.setVisible(true);
    this.shadow.setVisible(true);
    this.enter('wander');
  }

  // Идти к точке to (цель сдвинулась — точка переезжает).
  walkTo(to: Point): void {
    this.target = { ...to };
  }

  // Рёв (выход из леса): мамонт приседает и трубит — звуковые дуги от хобота.
  roar(): void {
    this.squash.velocity += PREPARE_SQUASH;
    this.trumpet();
  }

  // tired → wander: отдохнул — снова ищет цель.
  wander(): void {
    this.enter('wander');
  }

  // wander → prepare: остановился и роет землю копытом — сейчас таран до точки to.
  // Приседает, задирает хобот и через миг трубит; на снегу мигает дорожка тарана.
  prepare(to: Point): void {
    this.target = { x: this.x, y: this.y };
    this.chargeTo = { ...to };
    this.face(to.x);
    this.enter('prepare');
    this.drawLane();
    this.squash.velocity += PREPARE_SQUASH;
    this.scene.time.delayedCall(TRUMPET_DELAY, () => {
      if (this.state === 'prepare') this.trumpet();
    });
  }

  // prepare → charge: таран по прямой до точки to. На старте — облако снега.
  charge(to: Point): void {
    this.target = { ...to };
    this.scene.tweens.add({ targets: this.lane, alpha: 0, duration: LANE_FADE_TIME });
    this.hasRammedPlayer = false;
    this.face(to.x);
    this.enter('charge');
    this.squash.velocity += CHARGE_SQUASH;
    this.snowDust.setDepth(this.y + PARTICLES_DEPTH_SHIFT).explode(9, this.x - this.facing * 60, this.y);
    this.snowClods.setDepth(this.y + PARTICLES_DEPTH_SHIFT).explode(16, this.x - this.facing * 40, this.y);
  }

  // charge → tired: таран кончился (добежал или врезался) — стоит уставший.
  tire(): void {
    this.target = { x: this.x, y: this.y };
    this.enter('tired');
    this.squash.velocity += TIRED_SQUASH;
    this.lane.clear();
    this.stompMark.clear();
  }

  // → rage: ярость (один раз за бой). Встаёт на дыбы и ревёт, экран трясётся, над ним «ЯРОСТЬ!»;
  // глаза загораются. Когда кончится — решает systems/Boss.ts.
  enrage(): void {
    this.isEnraged = true;
    this.target = { x: this.x, y: this.y };
    this.enter('rage');
    this.lane.clear();
    this.squash.velocity += PREPARE_SQUASH;
    this.trumpet();
    playSound(this.scene, SOUNDS.roar, SOUND_VOLUMES.roar);
    this.scene.cameras.main.shake(RAGE_SHAKE_TIME, RAGE_SHAKE);
    floatText(this.scene, this.x, this.y - RAGE_TEXT_LIFT * SCALE, RAGE_TEXT, COLORS.heatLow);
    this.rageEyes.setVisible(true);
  }

  // wander → stomp: встаёт на дыбы к точке towardX, на снегу растёт красный круг.
  // Удар (slam) — когда скажет systems/Boss.ts.
  stomp(towardX: number): void {
    this.target = { x: this.x, y: this.y };
    this.face(towardX);
    this.enter('stomp');
    this.hasStomped = false;
  }

  // «!» над вождём (он стоит в точке at): дорожка тарана идёт через него.
  warn(at: Point): void {
    floatText(this.scene, at.x, at.y - WARN_LIFT, WARN_TEXT, COLORS.heatLow);
  }

  // Середина удара топота: перед мамонтом.
  getStompCenter(): Point {
    return { x: this.x + this.facing * STOMP_FRONT, y: this.y };
  }

  // Удар топота: мамонт обрушивается, по снегу расходится волна, летят ледяные осколки.
  slam(): void {
    this.hasStomped = true;
    this.stompMark.clear();
    this.squash.velocity += STOMP_SLAM_SQUASH;
    this.lean.velocity += STOMP_SLAM_LEAN;
    const center = this.getStompCenter();
    const wave = this.scene.add.image(center.x, center.y, TEXTURES.ring).setDepth(GROUND_MARK_DEPTH + 1).setScale(0.3);
    this.scene.tweens.add({
      targets: wave,
      scaleX: (MAMMOTH_STOMP_RADIUS * 2) / wave.width,
      scaleY: (MAMMOTH_STOMP_RADIUS * 2 * STOMP_FLATTEN) / wave.height,
      alpha: 0,
      duration: STOMP_WAVE_TIME,
      ease: 'Cubic.easeOut',
      onComplete: () => wave.destroy(),
    });
    this.shards.setDepth(center.y + PARTICLES_DEPTH_SHIFT).explode(STOMP_SHARDS, center.x, center.y);
    this.snowDust.setDepth(center.y + PARTICLES_DEPTH_SHIFT).explode(12, center.x, center.y);
    this.scene.cameras.main.shake(STOMP_SHAKE_TIME, STOMP_SHAKE);
    playSound(this.scene, SOUNDS.hit, SOUND_VOLUMES.hit, STOMP_SOUND_DETUNE);
  }

  // Удар на damage: белая вспышка, сжатие, клочья шерсти, всплывает урон.
  // Здоровье кончилось — мамонт повержен.
  hit(damage: number): void {
    if (!this.canBeHit()) return;
    this.hp = Math.max(0, this.hp - damage);
    for (const image of this.images) image.setTint(COLORS.white).setTintMode(Phaser.TintModes.FILL);
    this.flashLeft = HIT_FLASH_TIME;
    this.scene.time.delayedCall(HIT_FLASH_TIME, () => {
      for (const image of this.images) image.clearTint();
      this.legs.forEach((leg, i) => {
        if (MAMMOTH_ANATOMY.hips[i].far) leg.setTint(COLORS.mammothFarLeg);
      });
    });
    this.squash.velocity += HIT_SQUASH;
    this.headAngle.velocity += HIT_HEAD_KICK;
    this.lean.velocity += HIT_LEAN_KICK;
    this.tufts.setDepth(this.y + PARTICLES_DEPTH_SHIFT).explode(HIT_TUFTS, this.x + TUFTS_OFFSET.x * this.facing, this.y + TUFTS_OFFSET.y);
    floatText(this.scene, this.x, this.y + DAMAGE_OFFSET_Y, '−' + damage, COLORS.plusOne);
    if (this.hp === 0) this.fall();
  }

  // → fallen: ноги подкашиваются, заваливается на бок с подскоком, облако снега;
  // тает — и на его месте вырастает гора окороков (мультяшная декорация).
  private fall(): void {
    this.enter('fallen');
    this.lane.clear();
    this.stompMark.clear();
    this.rageEyes.setVisible(false);
    const side = -this.facing;
    this.scene.tweens.chain({
      targets: this.root,
      tweens: [
        { y: this.y + FALL_SINK, duration: FALL_SINK_TIME, ease: 'Quad.easeIn' },
        { angle: side * FALL_TIP_ANGLE, duration: FALL_TIP_TIME, ease: 'Sine.easeInOut' },
        {
          angle: side * FALL_ANGLE,
          y: this.y + FALL_DROP,
          duration: FALL_TIME,
          ease: 'Quad.easeIn',
          onComplete: () => {
            this.snowDust.setDepth(this.y + PARTICLES_DEPTH_SHIFT).explode(22, this.x, this.y);
            this.snowClods.setDepth(this.y + PARTICLES_DEPTH_SHIFT).explode(30, this.x, this.y);
            this.scene.cameras.main.shake(FALL_SHAKE_TIME, FALL_SHAKE_INTENSITY);
          },
        },
        { angle: side * FALL_BOUNCE_ANGLE, duration: FALL_BOUNCE_TIME, ease: 'Sine.easeOut', yoyo: true },
        { alpha: 0, duration: FALL_FADE_TIME },
      ],
      onComplete: () => {
        this.root.setVisible(false);
        this.shadow.setVisible(false);
        const mountain = this.scene.add.image(this.x, this.y, TEXTURES.meatMountain).setOrigin(0.5, 1).setDepth(this.y);
        pop(this.scene, mountain);
      },
    });
  }

  // Новое состояние: время в нём — с нуля, звёздочки — только у уставшего.
  private enter(state: MammothState): void {
    this.state = state;
    this.stateTime = 0;
    for (const star of this.stars) star.setVisible(state === 'tired');
  }

  // Повернуться к точке с координатой x (разворот покажет пружина turn).
  private face(x: number): void {
    if (Math.abs(x - this.x) < 1) return;
    this.facing = x > this.x ? 1 : -1;
  }

  // ===== Каждый кадр =====

  // Вызывается systems/Boss.ts каждый кадр: идёт к цели и показывает себя.
  update(delta: number): void {
    if (this.state === 'hidden') return;
    this.stateTime += delta;
    if (this.state === 'fallen') return;

    if (this.state === 'wander' || this.state === 'charge') {
      this.move(delta, this.state === 'charge' ? MAMMOTH_CHARGE_SPEED : MAMMOTH_SPEED);
    }
    this.animate(delta);
    this.playEffects(delta);
    this.placeStars();
  }

  // Поза частей: пружины тянут их к позе состояния, на ходу — шаг, дыхание, моргание.
  private animate(delta: number): void {
    const seconds = delta / 1000;
    this.time += delta;
    const pose = POSES[this.state === 'hidden' || this.state === 'fallen' ? 'idle' : this.state];
    this.flashLeft -= delta;
    // Скорость по x (пикс/с): от неё отстают хобот и юбка.
    const velocityX = (this.x - this.lastX) / Math.max(seconds, 0.001);
    this.lastX = this.x;

    this.stepPhase += delta * pose.stepSpeed;
    const bob = Math.abs(Math.sin(this.stepPhase)) * pose.bob;
    const isTired = this.state === 'tired';
    const breath = isTired ? Math.sin(this.time * TIRED_BREATH_SPEED) * TIRED_BREATH : Math.sin(this.time * BREATH_SPEED) * BREATH;

    let leanTarget = pose.lean;
    let headTarget = pose.head;
    if (this.state === 'wander') {
      leanTarget += Math.sin(this.stepPhase * 2) * WALK_LEAN_SWAY;
      headTarget += Math.sin(this.stepPhase * 2 + 0.6) * WALK_HEAD_SWAY;
    }
    if (this.state === 'prepare') leanTarget += Math.sin(this.time * PREPARE_SHAKE_SPEED) * PREPARE_SHAKE;
    if (isTired) headTarget += Math.sin(this.time * TIRED_BREATH_SPEED) * 3;
    const lean = springTo(this.lean, leanTarget, seconds, BODY_SPRING.stiffness, BODY_SPRING.damping);
    const head = springTo(this.headAngle, headTarget, seconds, HEAD_SPRING.stiffness, HEAD_SPRING.damping);
    const squash = springTo(this.squash, 0, seconds, SQUASH_SPRING.stiffness, SQUASH_SPRING.damping);
    const stretchX = springTo(this.stretchX, pose.stretchX, seconds, STRETCH_SPRING.stiffness, STRETCH_SPRING.damping) - squash * SQUASH_WIDEN;
    const stretchY = springTo(this.stretchY, pose.stretchY, seconds, STRETCH_SPRING.stiffness, STRETCH_SPRING.damping) + squash * SQUASH_STRETCH + breath;
    const turn = springTo(this.turn, this.facing, seconds, TURN_SPRING.stiffness, TURN_SPRING.damping);

    this.root
      .setPosition(this.x, this.y - bob)
      .setScale(SCALE * turn * stretchX, SCALE * stretchY)
      .setAngle(lean * this.facing)
      .setDepth(this.y);
    this.shadow.setPosition(this.x, this.y).setDepth(this.y + SHADOW_DEPTH_SHIFT);

    this.animateLegs(pose);
    this.head.setAngle(head);
    // Хобот: каждое звено догоняет свою цель, на ходу качается волной, отстаёт от движения.
    this.trunk.forEach((link, i) => {
      let target = pose.trunk[i] + velocityX * TRUNK_DRAG * this.facing * (i + 1);
      if (this.state === 'wander' || this.state === 'tired') {
        target += Math.sin(this.time * TRUNK_SWAY_SPEED - i * 0.9) * (TRUNK_SWAY + i * TRUNK_SWAY_STEP);
      }
      link.setAngle(springTo(this.trunkAngles[i], target, seconds, TRUNK_STIFFNESS - i * TRUNK_STIFFNESS_STEP, TRUNK_DAMPING));
    });
    const tail = pose.tail + Math.sin(this.time * TAIL_SWAY_SPEED) * TAIL_SWAY;
    this.tail.setAngle(springTo(this.tailAngle, tail, seconds, TAIL_SPRING.stiffness, TAIL_SPRING.damping));
    const skirt = -velocityX * SKIRT_DRAG * this.facing + Math.sin(this.stepPhase * 2);
    this.skirt.setAngle(Phaser.Math.Clamp(springTo(this.skirtAngle, skirt, seconds, TAIL_SPRING.stiffness, TAIL_SPRING.damping), -SKIRT_MAX_ANGLE, SKIRT_MAX_ANGLE));
    this.blink(delta);
    this.animateMarks();
    this.animateRage();
  }

  // Дорожка тарана мигает, пока мамонт роет; красный круг топота растёт, пока мамонт на дыбах.
  private animateMarks(): void {
    if (this.state === 'prepare') {
      this.lane.setAlpha(0.5 + 0.5 * Math.abs(Math.sin(this.time * LANE_BLINK_SPEED)));
    }
    if (this.state !== 'stomp' || this.hasStomped) return;
    const share = Math.min(1, this.stateTime / MAMMOTH_STOMP_WINDUP);
    const center = this.getStompCenter();
    const g = this.stompMark;
    g.clear();
    g.fillStyle(COLORS.heatLow, STOMP_FILL_ALPHA + STOMP_FILL_PULSE * Math.sin(this.time * LANE_BLINK_SPEED * 2));
    g.fillEllipse(center.x, center.y, MAMMOTH_STOMP_RADIUS * 2 * share, MAMMOTH_STOMP_RADIUS * 2 * STOMP_FLATTEN * share);
    g.lineStyle(STOMP_EDGE_WIDTH, COLORS.heatLow, 1);
    g.strokeEllipse(center.x, center.y, MAMMOTH_STOMP_RADIUS * 2, MAMMOTH_STOMP_RADIUS * 2 * STOMP_FLATTEN);
  }

  // В ярости: глаза горят и мерцают, шерсть пульсирует красным (кроме вспышки удара).
  private animateRage(): void {
    if (!this.isEnraged) return;
    const pulse = 0.5 + 0.5 * Math.sin(this.time * RAGE_PULSE_SPEED);
    this.rageEyes.setAlpha(0.6 + 0.4 * pulse);
    if (this.flashLeft > 0) return;
    const green = Math.round(170 + 60 * pulse);
    const blue = Math.round(150 + 60 * pulse);
    const tint = Phaser.Display.Color.GetColor(255, green, blue);
    const farTint = Phaser.Display.Color.GetColor(200, Math.round(green * 0.75), Math.round(blue * 0.7));
    this.images.forEach((image) => image.setTint(tint));
    this.legs.forEach((leg, i) => {
      if (MAMMOTH_ANATOMY.hips[i].far) leg.setTint(farTint);
    });
  }

  // Дорожка тарана от мамонта до chargeTo: полоса шириной в два радиуса тарана, полоски, стрелка.
  private drawLane(): void {
    const g = this.lane;
    const length = Phaser.Math.Distance.Between(this.x, this.y, this.chargeTo.x, this.chargeTo.y);
    const width = MAMMOTH_RAM_RADIUS * 2;
    g.clear();
    g.setPosition(this.x, this.y).setRotation(Math.atan2(this.chargeTo.y - this.y, this.chargeTo.x - this.x)).setAlpha(1);
    g.fillStyle(COLORS.fireOrange, LANE_ALPHA);
    g.fillRect(0, -width / 2, length, width);
    g.fillStyle(COLORS.fireOrange, LANE_DASH_ALPHA);
    for (let x = LANE_DASH; x < length - LANE_ARROW; x += LANE_DASH_STEP) g.fillRect(x, -6, LANE_DASH, 12);
    g.fillTriangle(length - LANE_ARROW, -width / 3, length, 0, length - LANE_ARROW, width / 3);
  }

  // Ноги шагают по диагоналям (передняя ближняя с задней дальней) и поднимаются при выносе.
  // Роет копытом — ближняя передняя бьёт назад, из-под неё летит снег.
  private animateLegs(pose: Pose): void {
    MAMMOTH_ANATOMY.hips.forEach((hip, i) => {
      const leg = this.legs[i];
      const offset = hip.front !== hip.far ? 0 : Math.PI;
      let angle = Math.sin(this.stepPhase + offset) * pose.legSwing;
      let lift = Math.max(0, -Math.cos(this.stepPhase + offset)) * pose.legSwing * LEG_LIFT_SHARE;
      if (this.state === 'prepare' && hip.front && !hip.far) {
        const kick = (this.stateTime % PAW_TIME) / PAW_TIME;
        const wave = Math.sin(Math.PI * Phaser.Math.Clamp(kick * 1.4, 0, 1));
        angle = PAW_ANGLE * wave - 6;
        lift = PAW_LIFT * wave;
        if (this.stateTime % PAW_TIME < this.scene.game.loop.delta && this.stateTime > PAW_TIME / 2) {
          const foot = this.x + (hip.x - 30) * SCALE * this.facing;
          this.snowClods.setDepth(this.y + PARTICLES_DEPTH_SHIFT).explode(9, foot, this.y);
          this.snowDust.setDepth(this.y + PARTICLES_DEPTH_SHIFT).explode(3, foot, this.y);
        }
      }
      if (this.state === 'tired') angle = hip.front ? -TIRED_LEG_ANGLE : TIRED_LEG_ANGLE;
      leg.setAngle(angle).setY(hip.y - lift);
    });
  }

  // Моргает: веко на миг закрывает глаз. Уставший моргает медленно и чаще.
  private blink(delta: number): void {
    this.blinkTimer -= delta;
    if (this.blinkTimer > 0) return;
    const isTired = this.state === 'tired';
    this.lid.setVisible(true);
    this.scene.time.delayedCall(isTired ? TIRED_BLINK_TIME : BLINK_TIME, () => this.lid.setVisible(false));
    this.blinkTimer = isTired ? TIRED_BLINK_EVERY : Phaser.Math.Between(BLINK_MIN, BLINK_MAX);
  }

  // Пар из хобота (роет), изо рта (устал), снежный шлейф и линии скорости (таран).
  private playEffects(delta: number): void {
    this.effectTimer -= delta;
    if (this.effectTimer > 0) return;
    const depth = this.y + PARTICLES_DEPTH_SHIFT;
    if (this.state === 'prepare') {
      const tip = this.trunkTip();
      this.steam.setDepth(depth).explode(2, tip.x, tip.y);
      this.effectTimer = PREPARE_STEAM_EVERY;
    } else if (this.state === 'tired') {
      this.steam.setDepth(depth).explode(3, this.x + MOUTH_OFFSET.x * this.facing, this.y + MOUTH_OFFSET.y);
      this.effectTimer = TIRED_STEAM_EVERY;
    } else if (this.isEnraged && this.state !== 'charge') {
      // В ярости со спины идёт пар.
      this.steam.setDepth(depth).explode(3, this.x + RAGE_BACK.x * this.facing * SCALE, this.y + RAGE_BACK.y * SCALE);
      this.effectTimer = RAGE_STEAM_EVERY;
    } else if (this.state === 'charge') {
      this.snowClods.setDepth(this.y - 1).explode(1, this.x - this.facing * 70 * SCALE, this.y);
      this.snowDust.setDepth(this.y - 1).explode(2, this.x - this.facing * 110 * SCALE, this.y - 8);
      this.speedLines();
      this.effectTimer = CHARGE_TRAIL_EVERY;
    }
  }

  // Конец хобота на поле: точка на конце последнего звена.
  private trunkTip(): Point {
    const last = this.trunk[this.trunk.length - 1];
    const point = new Phaser.Math.Vector2();
    last.getWorldTransformMatrix().transformPoint(12, MAMMOTH_ANATOMY.trunk[MAMMOTH_ANATOMY.trunk.length - 1], point);
    return { x: point.x, y: point.y };
  }

  // Трубит: три звуковые дуги расходятся от кончика хобота вперёд и вверх.
  private trumpet(): void {
    const tip = this.trunkTip();
    for (let i = 0; i < TRUMPET_ARCS; i++) {
      const arc = this.scene.add.graphics().setPosition(tip.x, tip.y - 10).setDepth(this.y + PARTICLES_DEPTH_SHIFT).setAlpha(0);
      for (const [width, color, alpha] of [[5, COLORS.outline, 0.5], [3, COLORS.white, 1]]) {
        arc.lineStyle(width, color, alpha);
        arc.beginPath();
        arc.arc(0, 0, 18, -0.7, 0.7, false);
        arc.strokePath();
      }
      arc.setScale(this.facing * 0.6, 0.6).setAngle(this.facing > 0 ? -25 : 25);
      this.scene.tweens.add({
        targets: arc,
        delay: i * TRUMPET_ARC_GAP,
        x: tip.x + this.facing * TRUMPET_DISTANCE,
        y: tip.y - 40,
        scaleX: this.facing * 1.6,
        scaleY: 1.6,
        alpha: { from: 1, to: 0 },
        duration: TRUMPET_TIME,
        ease: 'Sine.easeOut',
        onComplete: () => arc.destroy(),
      });
    }
  }

  // Линии скорости позади таранящего мамонта: вылетают назад и тают.
  private speedLines(): void {
    const backX = this.x - this.facing * 150 * SCALE;
    for (let i = 0; i < SPEED_LINES; i++) {
      const y = this.y - 30 - Phaser.Math.Between(10, 140) * SCALE;
      const line = this.scene.add
        .rectangle(backX, y, Phaser.Math.Between(SPEED_LINE_MIN, SPEED_LINE_MAX), 4, COLORS.white)
        .setOrigin(this.facing > 0 ? 1 : 0, 0.5)
        .setStrokeStyle(1.5, COLORS.snowShade, 1)
        .setAlpha(0.9)
        .setDepth(this.y + 1);
      this.scene.tweens.add({
        targets: line,
        x: backX - this.facing * 60,
        scaleX: 0.2,
        alpha: 0,
        duration: SPEED_LINE_TIME,
        ease: 'Quad.easeOut',
        onComplete: () => line.destroy(),
      });
    }
  }

  // Шаг к цели со скоростью speed. Дошёл — встаёт точно в неё.
  private move(delta: number, speed: number): void {
    const step = (speed * delta) / 1000;
    const distance = Phaser.Math.Distance.Between(this.x, this.y, this.target.x, this.target.y);
    if (distance <= step) {
      this.x = this.target.x;
      this.y = this.target.y;
      return;
    }
    this.face(this.target.x);
    this.x += ((this.target.x - this.x) / distance) * step;
    this.y += ((this.target.y - this.y) / distance) * step;
  }

  // Звёздочки кружатся над макушкой уставшего мамонта (дальние — за головой).
  private placeStars(): void {
    if (this.state !== 'tired') return;
    const top = MAMMOTH_ANATOMY.headTop;
    const headX = this.x + top.x * SCALE * this.facing;
    const headY = this.y + top.y * SCALE - 6;
    this.stars.forEach((star, index) => {
      const angle = this.stateTime * TIRED_STAR_SPEED + (index * Math.PI * 2) / this.stars.length;
      star
        .setPosition(headX + Math.cos(angle) * TIRED_STAR_RADIUS_X, headY + Math.sin(angle) * TIRED_STAR_RADIUS_Y)
        .setDepth(this.y + (Math.sin(angle) > 0 ? 1 : -1));
    });
  }
}
