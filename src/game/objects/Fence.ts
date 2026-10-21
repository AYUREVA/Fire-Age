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
// Ворота рисуются кодом как настоящие объёмные брусья: так створки видны
// и спереди (в верхней и нижней стене), и сбоку (в левой и правой).

// Столбы ворот: толщина (сторона квадрата у земли) и высота (пиксели).
const POST_SIZE = 18;
const POST_HEIGHT = 104;
// Перекладина сверху: на какой высоте, толщина и высота бруса.
const LINTEL_BASE = 92;
const LINTEL_SIZE = 14;
// Створка: толщина досок, высота, сколько досок в створке. В боковых стенах
// мы видим створки сбоку — там они толще, чтобы калитку было видно издалека.
const LEAF_THICKNESS = 12;
const SIDE_LEAF_THICKNESS = 14;
const SIDE_POST_SIZE = 20;
// Боковые стены мы видим чуть сбоку: верх ворот в них отклоняется наружу
// на столько пикселей на пиксель высоты — так видна внутренняя сторона створок.
const SIDE_GATE_SKEW = 0.4;
const LEAF_HEIGHT = 74;
const LEAF_PLANKS = 4;
// Поперечные планки створки — на этих долях высоты; между ними — диагональная распорка.
const BRACE_LOW = 0.2;
const BRACE_HIGH = 0.8;
// Глубина ворот: чуть впереди своей линии на земле, чтобы снег шапок не прятался.
const GATE_DEPTH_SHIFT = 0.2;

// Сторона стены, в которой стоит калитка.
type GateSide = 'left' | 'right' | 'top' | 'bottom';

// Калитка: середина проёма на земле, вдоль какой линии идёт стена (along),
// куда наружу (outward), проём для столкновений, насколько открыта (0 — закрыта,
// 1 — настежь), сколько мс ещё держаться открытой без вождя и её картинки.
type Gate = {
  isSideWall: boolean;
  center: Point;
  along: Point;
  outward: Point;
  rect: Phaser.Geom.Rectangle;
  openness: number;
  holdTime: number;
  frame: Phaser.GameObjects.Graphics[];
  leaves: Phaser.GameObjects.Graphics[];
};

/**
 * Частокол вокруг лагеря с четырьмя калитками — в каждой стене.
 *
 * Сначала его нет; купили — колья по очереди вырастают из снега.
 * Нижняя стена проходит по каменному столу: стол — часть стены.
 * Столкновения — простая проверка прямоугольников стен, без физики:
 * allows() отвечает, можно ли шагнуть из точки в точку.
 * Калитка — деревянные ворота: два столба, перекладина со снегом и две створки
 * из досок. Вождь подходит — створки расходятся от середины наружу, отошёл —
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
      this.drawFrame(gate);
      this.drawLeaves(gate);
      for (const part of [...gate.frame, ...gate.leaves]) {
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
      frame: [graphics(), graphics(), graphics()],
      leaves: [graphics(), graphics()],
    };
  }

  // Столбы по краям проёма и перекладина сверху со снегом. Каждый столб — своя
  // картинка со своей глубиной: в боковой стене один столб впереди вождя, другой — позади.
  private drawFrame(gate: Gate): void {
    const gap = FENCE_GATE_WIDTH / 2;
    const postSize = gate.isSideWall ? SIDE_POST_SIZE : POST_SIZE;
    const skew = this.getSkew(gate);
    const ends = [-1, 1].map((sign) => ({
      x: gate.center.x + gate.along.x * gap * sign,
      y: gate.center.y + gate.along.y * gap * sign,
    }));
    const [postA, postB, lintel] = gate.frame;

    ends.forEach((end, index) => {
      const post = index === 0 ? postA : postB;
      post.clear().setVisible(true).setDepth(end.y + GATE_DEPTH_SHIFT);
      const a = { x: end.x - gate.along.x * (postSize / 2), y: end.y - gate.along.y * (postSize / 2) };
      const b = { x: end.x + gate.along.x * (postSize / 2), y: end.y + gate.along.y * (postSize / 2) };
      drawBox(post, a, b, postSize, 0, POST_HEIGHT, false, skew, COLORS.snowLight);
    });

    // Перекладина — по глубине вместе с дальним столбом, чтобы вождь проходил под ней.
    lintel.clear().setVisible(true).setDepth(Math.min(ends[0].y, ends[1].y) + GATE_DEPTH_SHIFT);
    // В боковых стенах верх перекладины виден сбоку длинной полосой — там он деревянный.
    const lintelTop = gate.isSideWall ? COLORS.woodLight : COLORS.snowLight;
    drawBox(lintel, ends[0], ends[1], LINTEL_SIZE, LINTEL_BASE, LINTEL_SIZE, false, skew, lintelTop);
  }

  // Две створки: каждая крепится к своему столбу и тянется к середине проёма.
  // Открываясь, створка поворачивается на столбе наружу — от середины в стороны.
  // Угол поворота плавный: в начале и в конце створка движется медленнее.
  private drawLeaves(gate: Gate): void {
    const gap = FENCE_GATE_WIDTH / 2;
    const angle = Phaser.Math.Easing.Sine.InOut(gate.openness) * (Math.PI / 2);
    const length = gap - POST_SIZE / 2;

    [-1, 1].forEach((sign, index) => {
      const leaf = gate.leaves[index];
      // Петля — у столба; створка смотрит к середине (−sign вдоль стены) и при открытии
      // поворачивается наружу.
      const hinge = {
        x: gate.center.x + gate.along.x * (gap - POST_SIZE / 2) * sign,
        y: gate.center.y + gate.along.y * (gap - POST_SIZE / 2) * sign,
      };
      const dir = {
        x: -gate.along.x * sign * Math.cos(angle) + gate.outward.x * Math.sin(angle),
        y: -gate.along.y * sign * Math.cos(angle) + gate.outward.y * Math.sin(angle),
      };
      const free = { x: hinge.x + dir.x * length, y: hinge.y + dir.y * length };
      leaf.clear().setVisible(true).setDepth(Math.max(hinge.y, free.y) + GATE_DEPTH_SHIFT);
      const thickness = gate.isSideWall ? SIDE_LEAF_THICKNESS : LEAF_THICKNESS;
      drawBox(leaf, hinge, free, thickness, 0, LEAF_HEIGHT, true, this.getSkew(gate), COLORS.woodLight);
    });
  }

  // Наклон верха ворот: в боковых стенах — наружу, в верхней и нижней — без наклона.
  private getSkew(gate: Gate): number {
    return gate.isSideWall ? gate.outward.x * SIDE_GATE_SKEW : 0;
  }

  // ===== Колья =====

  // Расставляет колья по периметру (спрятанными) — по кругу, чтобы при постройке
  // забор вырастал «волной»: верх слева направо, правый бок вниз, низ справа налево,
  // левый бок вверх. В проёмах калиток и на месте стола кольев нет.
  private createStakes(): void {
    const { left, top, right, bottom } = FENCE_RECT;
    const rng = new Phaser.Math.RandomDataGenerator([STAKES_SEED]);
    const [leftGate, rightGate, topGate, bottomGate] = this.gates;
    // Кол не ставим в проёме калитки и вплотную к её столбам.
    const isInGate = (value: number, gateCenter: number): boolean =>
      Math.abs(value - gateCenter) < FENCE_GATE_WIDTH / 2 + POST_SIZE;

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
  }

  // Кол боковой стены: чуть в сторону от линии и через один темнее.
  private addSideStake(rng: Phaser.Math.RandomDataGenerator, x: number, y: number): void {
    const side = Math.round(y / STAKE_STEP_Y) % 2 === 0 ? 1 : -1;
    const image = this.addStake(rng, x + side * SIDE_JITTER, y);
    if (side < 0) image.setTint(SIDE_SHADE_TINT);
  }

  // Один кол в точке (x, y): глубина = y, чуть случайный размер, через один отражён.
  private addStake(rng: Phaser.Math.RandomDataGenerator, x: number, y: number): Phaser.GameObjects.Image {
    const scale = rng.realInRange(STAKE_SCALE_MIN, STAKE_SCALE_MAX);
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

// ===== Рисование брусьев =====

// Деревянный брус на земле: от точки a до точки b, толщиной thickness (поперёк),
// от высоты base до base + height. Мы смотрим сверху под углом: высота уходит
// вверх по экрану (и на skew пикселей вбок на пиксель высоты).
// Рисуются только стороны, повёрнутые к нам, и верх цвета topColor (снег или дерево).
// isLeaf — это створка: на широкой стороне доски, поперечные планки и распорка,
// сверху — торцы досок.
function drawBox(
  g: Phaser.GameObjects.Graphics,
  a: Point,
  b: Point,
  thickness: number,
  base: number,
  height: number,
  isLeaf: boolean,
  skew: number,
  topColor: number,
): void {
  const length = Phaser.Math.Distance.Between(a.x, a.y, b.x, b.y);
  if (length < 0.01) return;
  const dir = { x: (b.x - a.x) / length, y: (b.y - a.y) / length };
  const side = { x: -dir.y * (thickness / 2), y: dir.x * (thickness / 2) };
  // Четыре угла бруса на земле: по кругу.
  const corners = [
    { x: a.x + side.x, y: a.y + side.y },
    { x: b.x + side.x, y: b.y + side.y },
    { x: b.x - side.x, y: b.y - side.y },
    { x: a.x - side.x, y: a.y - side.y },
  ];
  const up = (point: Point, h: number): Point => ({ x: point.x + skew * h, y: point.y - h });

  // Стороны: видна та, что повёрнута к нам. Её углы на экране идут против
  // часовой стрелки — площадь со знаком меньше нуля (у задней — больше, у ребра — ноль).
  for (let i = 0; i < 4; i++) {
    const p = corners[i];
    const q = corners[(i + 1) % 4];
    const face = [up(p, base), up(q, base), up(q, base + height), up(p, base + height)];
    if (signedArea(face) > -0.5) continue;

    // Широкая сторона створки — светлое дерево с досками, узкие торцы — в тени.
    const isWide = i === 0 || i === 2;
    fillFace(g, face, isWide ? COLORS.wood : COLORS.woodDark);
    if (isLeaf && isWide) drawPlanks(g, up(p, base), up(q, base), up(p, base + height), up(q, base + height));
    strokeFace(g, face);
  }

  // Верх: снег или дерево; у створки на нём видны торцы досок.
  const topFace = corners.map((corner) => up(corner, base + height));
  fillFace(g, topFace, topColor);
  if (isLeaf) {
    g.lineStyle(1.5, COLORS.woodDark, 1);
    for (let i = 1; i < LEAF_PLANKS; i++) {
      const t = i / LEAF_PLANKS;
      const from = { x: Phaser.Math.Linear(topFace[0].x, topFace[1].x, t), y: Phaser.Math.Linear(topFace[0].y, topFace[1].y, t) };
      const to = { x: Phaser.Math.Linear(topFace[3].x, topFace[2].x, t), y: Phaser.Math.Linear(topFace[3].y, topFace[2].y, t) };
      g.lineBetween(from.x, from.y, to.x, to.y);
    }
  }
  strokeFace(g, topFace);
}

// Доски створки на её широкой стороне: углы стороны на экране — низ p0–q0
// и верх p1–q1. Щели между досками, две поперечные планки и диагональная распорка.
function drawPlanks(g: Phaser.GameObjects.Graphics, p0: Point, q0: Point, p1: Point, q1: Point): void {
  // Точка на стороне: t — доля длины (от p к q), k — доля высоты (0 — низ, 1 — верх).
  const at = (t: number, k: number): Point => ({
    x: Phaser.Math.Linear(Phaser.Math.Linear(p0.x, q0.x, t), Phaser.Math.Linear(p1.x, q1.x, t), k),
    y: Phaser.Math.Linear(Phaser.Math.Linear(p0.y, q0.y, t), Phaser.Math.Linear(p1.y, q1.y, t), k),
  });
  g.lineStyle(1.5, COLORS.woodDark, 1);
  for (let i = 1; i < LEAF_PLANKS; i++) {
    const t = i / LEAF_PLANKS;
    const bottom = at(t, 0);
    const top = at(t, 1);
    g.lineBetween(bottom.x, bottom.y, top.x, top.y);
  }
  for (const [t1, k1, t2, k2] of [
    [0, BRACE_LOW, 1, BRACE_LOW],
    [0, BRACE_HIGH, 1, BRACE_HIGH],
    [0, BRACE_LOW, 1, BRACE_HIGH],
  ]) {
    const from = at(t1, k1);
    const to = at(t2, k2);
    g.lineStyle(6, COLORS.outline, 1);
    g.lineBetween(from.x, from.y, to.x, to.y);
    g.lineStyle(3.5, COLORS.woodLight, 1);
    g.lineBetween(from.x, from.y, to.x, to.y);
  }
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

// Закрасить грань бруса.
function fillFace(g: Phaser.GameObjects.Graphics, face: Point[], color: number): void {
  g.fillStyle(color, 1);
  g.fillPoints(face.map((point) => new Phaser.Math.Vector2(point.x, point.y)), true);
}

// Обвести грань бруса тёмной обводкой.
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
