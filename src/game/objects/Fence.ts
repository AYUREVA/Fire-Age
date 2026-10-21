import Phaser from 'phaser';
import {
  CAMPFIRE_POSITION,
  FENCE_BOTTOM_GATE_X,
  FENCE_GATE_WIDTH,
  FENCE_RECT,
  FENCE_WALL_THICKNESS,
  GATE_CLOSE_DELAY,
  GATE_OPEN_RADIUS,
  GATE_PASS_SHARE,
  GATE_SWING_TIME,
  TABLE_POSITION,
} from '../settings';
import { COLORS } from '../palette';
import { TEXTURES } from '../textures';
import { Point } from '../fx';

// ===== Колья =====

// Расстояние между кольями вдоль верхней и нижней стены и вдоль боковых стен.
// По бокам колья стоят реже: мы смотрим сверху под углом, и стена «сжата».
const STAKE_STEP_X = 22;
const STAKE_STEP_Y = 26;
// В боковых стенах колья чуть сдвинуты влево-вправо (пиксели) и через один темнее —
// так видно каждый кол, а не одну полосу.
const SIDE_JITTER = 3;
const SIDE_SHADE_TINT = 0xd6cfc8;
// В нижней стене вместо кольев — каменный стол: столько пикселей от середины стола
// в обе стороны колья не ставим (стол шириной 240, textures.ts).
const TABLE_GAP_HALF = 125;
// Колья чуть разной высоты и через один отражены — так забор живой.
const STAKE_SCALE_MIN = 0.92;
const STAKE_SCALE_MAX = 1.08;
const STAKES_SEED = 'fence-stakes';
// Постройка: колья по очереди вырастают из земли (мс задержки между соседними
// и сколько растёт один кол).
const BUILD_STAGGER = 8;
const BUILD_GROW_TIME = 260;

// ===== Ворота калитки =====
// Калитка — часть частокола: по краям проёма стоят такие же колья, между ними —
// две деревянные створки. Доски створок раскрашены как колья, на них распорка «Z»,
// кожаные ремни-петли у столбов и ручка из кости. Наклона нет: всё стоит прямо.

// Половина ширины кола (textures.ts): на таком расстоянии от середины столба
// висит створка.
const POST_HALF_WIDTH = 9;
// Столбы калитки — самые высокие колья частокола (как STAKE_SCALE_MAX).
const POST_SCALE = STAKE_SCALE_MAX;
// В стене колья не ставим ещё столько пикселей за краем проёма — там стоит столб.
const POST_CLEARANCE = 8;
// Створка: высота (ниже острия кольев) и сколько досок в створке.
const LEAF_HEIGHT = 46;
const LEAF_PLANKS = 4;
// Толщина створки. Боковую закрытую калитку мы видим сверху — только кромку створок,
// поэтому там створки толще, чтобы кромку было видно.
const LEAF_THICKNESS = 6;
const SIDE_LEAF_THICKNESS = 10;
// Низ створки — на столько пикселей выше земли, как низ кола: створка стоит в снегу.
const LEAF_LIFT = 3;
// Поперечные планки створки — на этих долях высоты; между ними — диагональная распорка.
// Вместе они — буква «Z».
const BRACE_LOW = 0.15;
const BRACE_HIGH = 0.85;
// Кожаные ремни-петли у столба: на этих долях высоты; от края у столба заходят
// на створку на STRAP_LENGTH её длины (и чуть на столб).
const STRAP_HEIGHTS = [0.28, 0.66];
const STRAP_LENGTH = 0.2;
// Ручка из кости у края, где створки сходятся: где по длине и от какой до какой высоты.
const HANDLE_AT = 0.86;
const HANDLE_LOW = 0.4;
const HANDLE_HIGH = 0.62;
// Сугробики на кромке створки: где по длине и какой ширины (доли длины).
const TOP_SNOW_LUMPS = [
  [0.2, 0.22],
  [0.55, 0.3],
  [0.85, 0.18],
];
// Глубина створок: чуть впереди своей линии на земле. Столбы — ещё впереди:
// створки заходят за них, как будто привязаны к столбам.
const GATE_DEPTH_SHIFT = 0.2;
const POST_DEPTH_SHIFT = 0.4;

// Сторона стены, в которой стоит калитка.
type GateSide = 'left' | 'right' | 'top' | 'bottom';

// Калитка: середина проёма на земле, вдоль какой линии идёт стена (along),
// куда наружу (outward), проём для столкновений, насколько открыта (0 — закрыта,
// 1 — настежь), сколько мс ещё держаться открытой без вождя и картинки двух
// створок. Столбы — колья частокола (в списке stakes).
type Gate = {
  isSideWall: boolean;
  center: Point;
  along: Point;
  outward: Point;
  rect: Phaser.Geom.Rectangle;
  openness: number;
  holdTime: number;
  leaves: Phaser.GameObjects.Graphics[];
};

/**
 * Частокол вокруг лагеря с четырьмя калитками — в каждой стене.
 *
 * Сначала его нет; купили — колья по очереди вырастают из снега.
 * Нижняя стена проходит по каменному столу: стол — часть стены.
 * Столкновения — простая проверка прямоугольников стен, без физики:
 * allows() отвечает, можно ли шагнуть из точки в точку.
 * Калитка — часть частокола: два кола-столба и две створки из досок. Вождь подходит — створки расходятся от середины наружу, отошёл —
 * закрываются. Через открытую калитку проходят вождь и кролики, волки — никогда.
 * Про тех, кто ходит, частокол знает только точку вождя.
 */
export class Fence {
  private scene: Phaser.Scene;
  // Построен ли частокол.
  private isBuiltNow = false;
  // Стены (с проёмами калиток) — прямоугольники для столкновений.
  private walls: Phaser.Geom.Rectangle[] = [];
  // Калитки.
  private gates: Gate[] = [];
  // Двор внутри стен.
  private yard: Phaser.Geom.Rectangle;
  // Колья (пока частокол не построен, они спрятаны) и их размер.
  private stakes: { image: Phaser.GameObjects.Image; scale: number }[] = [];

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    const { left, top, right, bottom } = FENCE_RECT;
    const half = FENCE_WALL_THICKNESS / 2;

    this.gates = [
      this.createGate('left', { x: left, y: CAMPFIRE_POSITION.y }),
      this.createGate('right', { x: right, y: CAMPFIRE_POSITION.y }),
      this.createGate('top', { x: CAMPFIRE_POSITION.x, y: top }),
      this.createGate('bottom', { x: FENCE_BOTTOM_GATE_X, y: bottom }),
    ];

    // Стены — каждая сторона целиком, кроме проёма своей калитки.
    const gap = FENCE_GATE_WIDTH / 2;
    const [leftGate, rightGate, topGate, bottomGate] = this.gates;
    this.walls.push(
      wallRect(left, top, topGate.center.x - gap, top, half),
      wallRect(topGate.center.x + gap, top, right, top, half),
      wallRect(left, bottom, bottomGate.center.x - gap, bottom, half),
      wallRect(bottomGate.center.x + gap, bottom, right, bottom, half),
      wallRect(left, top, left, leftGate.center.y - gap, half),
      wallRect(left, leftGate.center.y + gap, left, bottom, half),
      wallRect(right, top, right, rightGate.center.y - gap, half),
      wallRect(right, rightGate.center.y + gap, right, bottom, half),
    );
    this.yard = new Phaser.Geom.Rectangle(left + half, top + half, right - left - half * 2, bottom - top - half * 2);

    this.createStakes();
  }

  // Построен ли частокол.
  isBuilt(): boolean {
    return this.isBuiltNow;
  }

  // Стоит ли точка во дворе (внутри стен).
  isInside(x: number, y: number): boolean {
    return this.isBuiltNow && this.yard.contains(x, y);
  }

  // Можно ли шагнуть из (fromX, fromY) в (toX, toY). Нельзя — только в стену.
  // Кто уже стоит в стене (например, частокол вырос у него под ногами), может из неё выйти.
  // canUseGates — проходит ли он в калитки (вождь и кролики — да, волки — нет).
  allows(fromX: number, fromY: number, toX: number, toY: number, canUseGates: boolean): boolean {
    return !this.isWall(toX, toY, canUseGates) || this.isWall(fromX, fromY, canUseGates);
  }

  // Построить частокол: колья по очереди вырастают из снега, ворота появляются.
  build(): void {
    if (this.isBuiltNow) return;
    this.isBuiltNow = true;

    this.stakes.forEach(({ image, scale }, index) => {
      image.setVisible(true).setScale(scale, 0);
      this.scene.tweens.add({
        targets: image,
        scaleY: scale,
        delay: index * BUILD_STAGGER,
        duration: BUILD_GROW_TIME,
        ease: 'Back.easeOut',
      });
    });
    for (const gate of this.gates) {
      this.drawLeaves(gate);
      for (const part of gate.leaves) {
        part.setAlpha(0);
        this.scene.tweens.add({ targets: part, alpha: 1, delay: this.stakes.length * BUILD_STAGGER, duration: BUILD_GROW_TIME });
      }
    }
  }

  // Вызывается сценой каждый кадр. (playerX, playerY) — где вождь.
  // Калитка, к которой подошёл вождь, распахивается; отошёл — через GATE_CLOSE_DELAY закрывается.
  update(delta: number, playerX: number, playerY: number): void {
    if (!this.isBuiltNow) return;

    for (const gate of this.gates) {
      gate.holdTime = this.shouldOpen(gate, playerX, playerY) ? GATE_CLOSE_DELAY : gate.holdTime - delta;
      const target = gate.holdTime > 0 ? 1 : 0;
      if (gate.openness === target) continue;
      const step = delta / GATE_SWING_TIME;
      gate.openness = target > gate.openness ? Math.min(target, gate.openness + step) : Math.max(target, gate.openness - step);
      this.drawLeaves(gate);
    }
  }

  // Пора ли калитке открыться: вождь рядом с её серединой.
  private shouldOpen(gate: Gate, playerX: number, playerY: number): boolean {
    return Phaser.Math.Distance.Between(playerX, playerY, gate.center.x, gate.center.y) < GATE_OPEN_RADIUS;
  }

  // Стена ли в точке (x, y). Калитка — стена, пока она не открыта хотя бы на
  // GATE_PASS_SHARE, и всегда — для тех, кто в калитки не ходит (волки).
  private isWall(x: number, y: number, canUseGates: boolean): boolean {
    if (!this.isBuiltNow) return false;
    if (this.walls.some((wall) => wall.contains(x, y))) return true;
    return this.gates.some(
      (gate) => gate.rect.contains(x, y) && (!canUseGates || gate.openness < GATE_PASS_SHARE),
    );
  }

  // ===== Калитки =====

  // Калитка в стене side с серединой проёма center. Картинки пока пустые —
  // их рисует build().
  private createGate(side: GateSide, center: Point): Gate {
    const isSideWall = side === 'left' || side === 'right';
    const along = isSideWall ? { x: 0, y: 1 } : { x: 1, y: 0 };
    const outward = { left: { x: -1, y: 0 }, right: { x: 1, y: 0 }, top: { x: 0, y: -1 }, bottom: { x: 0, y: 1 } }[side];
    const gap = FENCE_GATE_WIDTH / 2;
    const half = FENCE_WALL_THICKNESS / 2;
    const rect = wallRect(
      center.x - along.x * gap,
      center.y - along.y * gap,
      center.x + along.x * gap,
      center.y + along.y * gap,
      half,
    );
    const graphics = (): Phaser.GameObjects.Graphics => this.scene.add.graphics().setVisible(false);
    return {
      isSideWall,
      center,
      along,
      outward,
      rect,
      openness: 0,
      holdTime: 0,
      leaves: [graphics(), graphics()],
    };
  }

  // Две створки: каждая крепится к своему столбу и тянется к середине проёма.
  // Открываясь, створка поворачивается на столбе наружу — от середины в стороны.
  // Угол поворота плавный: в начале и в конце створка движется медленнее.
  private drawLeaves(gate: Gate): void {
    const gap = FENCE_GATE_WIDTH / 2;
    const angle = Phaser.Math.Easing.Sine.InOut(gate.openness) * (Math.PI / 2);
    const length = gap - POST_HALF_WIDTH;

    [-1, 1].forEach((sign, index) => {
      const leaf = gate.leaves[index];
      // Петля — у столба; створка смотрит к середине (−sign вдоль стены) и при открытии
      // поворачивается наружу.
      const hinge = {
        x: gate.center.x + gate.along.x * length * sign,
        y: gate.center.y + gate.along.y * length * sign,
      };
      const dir = {
        x: -gate.along.x * sign * Math.cos(angle) + gate.outward.x * Math.sin(angle),
        y: -gate.along.y * sign * Math.cos(angle) + gate.outward.y * Math.sin(angle),
      };
      const free = { x: hinge.x + dir.x * length, y: hinge.y + dir.y * length };
      leaf.clear().setVisible(true).setDepth(Math.max(hinge.y, free.y) + GATE_DEPTH_SHIFT);
      drawLeaf(leaf, hinge, free, gate.isSideWall ? SIDE_LEAF_THICKNESS : LEAF_THICKNESS);
    });
  }

  // ===== Колья =====

  // Расставляет колья по периметру (спрятанными) — по кругу, чтобы при постройке
  // забор вырастал «волной»: верх слева направо, правый бок вниз, низ справа налево,
  // левый бок вверх. В проёмах калиток и на месте стола кольев нет.
  // Последними вырастают столбы калиток — вместе со створками.
  private createStakes(): void {
    const { left, top, right, bottom } = FENCE_RECT;
    const rng = new Phaser.Math.RandomDataGenerator([STAKES_SEED]);
    const [leftGate, rightGate, topGate, bottomGate] = this.gates;
    // Кол не ставим в проёме калитки и вплотную к её столбам.
    const isInGate = (value: number, gateCenter: number): boolean =>
      Math.abs(value - gateCenter) < FENCE_GATE_WIDTH / 2 + POST_CLEARANCE;

    for (let x = left; x <= right; x += STAKE_STEP_X) {
      if (!isInGate(x, topGate.center.x)) this.addStake(rng, x, top);
    }
    for (let y = top + STAKE_STEP_Y; y <= bottom; y += STAKE_STEP_Y) {
      if (!isInGate(y, rightGate.center.y)) this.addSideStake(rng, right, y);
    }
    for (let x = right; x >= left; x -= STAKE_STEP_X) {
      const isTable = Math.abs(x - TABLE_POSITION.x) <= TABLE_GAP_HALF;
      if (!isTable && !isInGate(x, bottomGate.center.x)) this.addStake(rng, x, bottom);
    }
    for (let y = bottom - STAKE_STEP_Y; y > top; y -= STAKE_STEP_Y) {
      if (!isInGate(y, leftGate.center.y)) this.addSideStake(rng, left, y);
    }

    // Столбы калиток — по колу на каждом краю проёма.
    for (const gate of this.gates) {
      for (const sign of [-1, 1]) {
        const gap = (FENCE_GATE_WIDTH / 2) * sign;
        const y = gate.center.y + gate.along.y * gap;
        this.addStake(rng, gate.center.x + gate.along.x * gap, y, POST_SCALE).setDepth(y + POST_DEPTH_SHIFT);
      }
    }
  }

  // Кол боковой стены: чуть в сторону от линии и через один темнее.
  private addSideStake(rng: Phaser.Math.RandomDataGenerator, x: number, y: number): void {
    const side = Math.round(y / STAKE_STEP_Y) % 2 === 0 ? 1 : -1;
    const image = this.addStake(rng, x + side * SIDE_JITTER, y);
    if (side < 0) image.setTint(SIDE_SHADE_TINT);
  }

  // Один кол в точке (x, y): глубина = y, чуть случайный размер (или scale), через один отражён.
  private addStake(
    rng: Phaser.Math.RandomDataGenerator,
    x: number,
    y: number,
    scale = rng.realInRange(STAKE_SCALE_MIN, STAKE_SCALE_MAX),
  ): Phaser.GameObjects.Image {
    const image = this.scene.add
      .image(x, y, TEXTURES.fenceStake)
      .setOrigin(0.5, 1)
      .setDepth(y)
      .setFlipX(rng.frac() < 0.5)
      .setVisible(false);
    this.stakes.push({ image, scale });
    return image;
  }
}

// ===== Рисование створок =====

// Створка — доска на земле от петли hinge (у столба) до свободного края free
// (там она сходится со второй створкой) толщиной thickness и высотой LEAF_HEIGHT.
// Мы смотрим сверху под углом: высота уходит прямо вверх по экрану.
// Рисуются только стороны, повёрнутые к нам. Закрытую створку боковой стены
// видно сверху — только кромку (как колья боковой стены), а открываясь,
// она поворачивается к нам широкой стороной.
function drawLeaf(g: Phaser.GameObjects.Graphics, hinge: Point, free: Point, thickness: number): void {
  const length = Phaser.Math.Distance.Between(hinge.x, hinge.y, free.x, free.y);
  if (length < 0.01) return;
  const dir = { x: (free.x - hinge.x) / length, y: (free.y - hinge.y) / length };
  const side = { x: -dir.y * (thickness / 2), y: dir.x * (thickness / 2) };
  // Низ створки вровень с низом кольев: ближняя к нам сторона стоит на LEAF_LIFT
  // выше линии стены.
  const lift = (Math.abs(dir.x) * thickness) / 2 + LEAF_LIFT;
  // Четыре угла доски на земле: по кругу.
  const corners = [
    { x: hinge.x + side.x, y: hinge.y + side.y - lift },
    { x: free.x + side.x, y: free.y + side.y - lift },
    { x: free.x - side.x, y: free.y - side.y - lift },
    { x: hinge.x - side.x, y: hinge.y - side.y - lift },
  ];
  const up = (point: Point, h: number): Point => ({ x: point.x, y: point.y - h });

  // Кромка сверху — торцы досок. onTop(t, s): точка на кромке, t — доля длины
  // от петли, s — доля толщины.
  const top = corners.map((corner) => up(corner, LEAF_HEIGHT));
  const onTop = (t: number, s: number): Point => ({
    x: Phaser.Math.Linear(Phaser.Math.Linear(top[0].x, top[1].x, t), Phaser.Math.Linear(top[3].x, top[2].x, t), s),
    y: Phaser.Math.Linear(Phaser.Math.Linear(top[0].y, top[1].y, t), Phaser.Math.Linear(top[3].y, top[2].y, t), s),
  });
  fillFace(g, top, COLORS.woodLight);
  g.lineStyle(1, COLORS.wood, 1);
  for (let i = 1; i < LEAF_PLANKS; i++) {
    const from = onTop(i / LEAF_PLANKS, 0);
    const to = onTop(i / LEAF_PLANKS, 1);
    g.lineBetween(from.x, from.y, to.x, to.y);
  }
  strokeFace(g, top);

  // Стороны: видна та, что повёрнута к нам. Её углы на экране идут против
  // часовой стрелки — площадь со знаком меньше нуля (у задней — больше, у ребра — ноль).
  for (let i = 0; i < 4; i++) {
    const p = corners[i];
    const q = corners[(i + 1) % 4];
    const face = [p, q, up(q, LEAF_HEIGHT), up(p, LEAF_HEIGHT)];
    if (signedArea(face) > -0.5) continue;

    if (i === 0) {
      drawWideSide(g, p, q);
    } else if (i === 2) {
      // Широкая сторона рисуется от края у петли.
      drawWideSide(g, q, p);
    } else {
      fillFace(g, face, COLORS.woodDark);
      strokeFace(g, face);
      drawSnowFoot(g, p, q);
    }
  }

  // Кромку видно длинной полосой (боковая стена) — на ней ремни-петли у столба.
  if (Math.abs(dir.x) < 0.5) {
    for (const t of [0.06, 0.16]) {
      drawStrap(g, onTop(t, -0.25), onTop(t, 1.25), COLORS.leather, 2.5);
    }
  }
  drawTopSnow(g, onTop);
}

// Широкая сторона створки: низ — от p (край у петли) до q. Доски раскрашены как
// колья (светлая полоска слева, тень справа, штрих коры), распорка «Z»,
// кожаные ремни у петли, ручка из кости у свободного края, снег у подножия.
function drawWideSide(g: Phaser.GameObjects.Graphics, p: Point, q: Point): void {
  // Точка на стороне: t — доля длины от петли, k — доля высоты (0 — низ, 1 — верх).
  const at = (t: number, k: number): Point => ({
    x: Phaser.Math.Linear(p.x, q.x, t),
    y: Phaser.Math.Linear(p.y, q.y, t) - LEAF_HEIGHT * k,
  });
  const band = (t1: number, t2: number): Point[] => [at(t1, 0), at(t2, 0), at(t2, 1), at(t1, 1)];
  // Правая на экране часть доски: share — доля её ширины. Её затеняем, как у кольев.
  const isRightward = q.x >= p.x;
  const rightPart = (t1: number, t2: number, share: number): [number, number] =>
    isRightward ? [t2 - (t2 - t1) * share, t2] : [t1, t1 + (t2 - t1) * share];

  for (let i = 0; i < LEAF_PLANKS; i++) {
    const t1 = i / LEAF_PLANKS;
    const t2 = (i + 1) / LEAF_PLANKS;
    fillFace(g, band(t1, t2), COLORS.wood);
    const [shadeFrom, shadeTo] = rightPart(t1, t2, 0.35);
    fillFace(g, band(shadeFrom, shadeTo), COLORS.woodDark);
    // Светлая полоска у левого края доски.
    const lightT = isRightward ? t1 + (t2 - t1) * 0.2 : t2 - (t2 - t1) * 0.2;
    drawLine(g, at(lightT, 0.12), at(lightT, 0.9), 1.5, COLORS.woodLight);
    // Кора: короткий тёмный штрих, у каждой доски на своей высоте.
    const barkK = 0.3 + ((i * 37) % 30) / 100;
    drawLine(g, at((t1 + t2) / 2, barkK), at((t1 + t2) / 2, barkK + 0.18), 1.2, COLORS.woodDark);
    // Щель между досками.
    if (i < LEAF_PLANKS - 1) drawLine(g, at(t2, 0), at(t2, 1), 1.5, COLORS.outline);
  }

  // Распорка «Z»: две поперечные планки и диагональ между ними.
  for (const [t1, k1, t2, k2] of [
    [0, BRACE_LOW, 1, BRACE_LOW],
    [0, BRACE_HIGH, 1, BRACE_HIGH],
    [0, BRACE_LOW, 1, BRACE_HIGH],
  ]) {
    drawStrap(g, at(t1, k1), at(t2, k2), COLORS.woodLight, 2.5);
  }
  strokeFace(g, band(0, 1));

  // Кожаные ремни-петли у столба.
  for (const k of STRAP_HEIGHTS) {
    drawStrap(g, at(-STRAP_LENGTH / 2, k), at(STRAP_LENGTH, k + 0.02), COLORS.leather, 4);
  }

  // Ручка из кости: палочка с круглыми концами.
  const handleLow = at(HANDLE_AT, HANDLE_LOW);
  const handleHigh = at(HANDLE_AT, HANDLE_HIGH);
  drawStrap(g, handleLow, handleHigh, COLORS.bone, 3);
  g.fillStyle(COLORS.bone, 1);
  g.lineStyle(1.5, COLORS.outline, 1);
  for (const end of [handleLow, handleHigh]) {
    g.fillCircle(end.x, end.y, 2.6);
    g.strokeCircle(end.x, end.y, 2.6);
  }
  drawSnowFoot(g, p, q);
}

// Снег на кромке створки: ровная полоса посередине и на ней невысокие сугробики.
function drawTopSnow(g: Phaser.GameObjects.Graphics, onTop: (t: number, s: number) => Point): void {
  const strip = [onTop(0.02, 0.25), onTop(0.98, 0.25), onTop(0.98, 0.7), onTop(0.02, 0.7)];
  fillFace(g, strip.map((point) => ({ x: point.x, y: point.y - 1.5 })), COLORS.snowLight);
  for (const [t, width] of TOP_SNOW_LUMPS) {
    const center = onTop(t, 0.5);
    const from = onTop(t - width / 2, 0.5);
    const to = onTop(t + width / 2, 0.5);
    const radiusX = Math.max(3, Math.abs(to.x - from.x) / 2);
    const radiusY = Math.max(3, Math.abs(to.y - from.y) / 2) * 0.9;
    g.fillStyle(COLORS.snowShade, 1);
    g.fillEllipse(center.x + 0.5, center.y - 1, radiusX * 2, radiusY * 2 + 1);
    g.fillStyle(COLORS.snowLight, 1);
    g.fillEllipse(center.x, center.y - 2.5, radiusX * 2 - 1, radiusY * 2);
  }
}

// Снег у подножия от p до q — такие же сугробики, как у кольев.
function drawSnowFoot(g: Phaser.GameObjects.Graphics, p: Point, q: Point): void {
  const length = Phaser.Math.Distance.Between(p.x, p.y, q.x, q.y);
  const count = Math.max(1, Math.round(length / 14));
  for (let i = 0; i < count; i++) {
    const t = (i + 0.5) / count;
    const x = Phaser.Math.Linear(p.x, q.x, t);
    const y = Phaser.Math.Linear(p.y, q.y, t);
    g.fillStyle(COLORS.snowShade, 1);
    g.fillEllipse(x, y + 1, 20, 8);
    g.fillStyle(COLORS.snowLight, 1);
    g.fillEllipse(x - 2, y, 18, 6);
  }
}

// Планка, ремень или ручка: тёмная обводка и цвет color поверх.
function drawStrap(g: Phaser.GameObjects.Graphics, from: Point, to: Point, color: number, width: number): void {
  drawLine(g, from, to, width + 2.5, COLORS.outline);
  drawLine(g, from, to, width, color);
}

// Отрезок от from до to.
function drawLine(g: Phaser.GameObjects.Graphics, from: Point, to: Point, width: number, color: number): void {
  g.lineStyle(width, color, 1);
  g.lineBetween(from.x, from.y, to.x, to.y);
}

// Площадь многоугольника со знаком (по формуле шнурования): знак говорит,
// в какую сторону обходятся его углы на экране.
function signedArea(points: Point[]): number {
  let area = 0;
  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    const q = points[(i + 1) % points.length];
    area += p.x * q.y - q.x * p.y;
  }
  return area / 2;
}

// Закрасить грань доски.
function fillFace(g: Phaser.GameObjects.Graphics, face: Point[], color: number): void {
  g.fillStyle(color, 1);
  g.fillPoints(face.map((point) => new Phaser.Math.Vector2(point.x, point.y)), true);
}

// Обвести грань доски тёмной обводкой.
function strokeFace(g: Phaser.GameObjects.Graphics, face: Point[]): void {
  g.lineStyle(2.5, COLORS.outline, 1);
  g.strokePoints(face.map((point) => new Phaser.Math.Vector2(point.x, point.y)), true, true);
}

// Прямоугольник стены вдоль линии от (x1, y1) до (x2, y2) толщиной 2 · half.
function wallRect(x1: number, y1: number, x2: number, y2: number, half: number): Phaser.Geom.Rectangle {
  const left = Math.min(x1, x2) - half;
  const top = Math.min(y1, y2) - half;
  return new Phaser.Geom.Rectangle(left, top, Math.abs(x2 - x1) + half * 2, Math.abs(y2 - y1) + half * 2);
}
