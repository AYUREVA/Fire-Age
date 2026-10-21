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
// Калитка — часть частокола: по краям проёма стоят такие же колья, сверху их
// связывает бревно, между ними — две деревянные створки с распоркой «Z».
// Наклона нет: всё стоит прямо, как колья боковых стен.

// Половина ширины кола (textures.ts): на таком расстоянии от середины столба
// висит створка.
const POST_HALF_WIDTH = 9;
// Столбы калитки — самые высокие колья частокола (как STAKE_SCALE_MAX).
const POST_SCALE = STAKE_SCALE_MAX;
// В стене колья не ставим ещё столько пикселей за краем проёма — там стоит столб.
const POST_CLEARANCE = 8;
// Бревно сверху: на какой высоте его середина и его радиус (пиксели).
// Колья частокола — около 70 пикселей в высоту: бревно не выше них.
const LINTEL_HEIGHT = 60;
const LINTEL_RADIUS = 7;
// Толщина снега на бревне (пиксели).
const LINTEL_SNOW = 4;
// Створка: толщина, высота и сколько досок в створке. Верх створки (с толщиной)
// не заходит на бревно — между ними щель в 2 пикселя.
const LEAF_THICKNESS = 14;
const LEAF_HEIGHT = LINTEL_HEIGHT - LINTEL_RADIUS - LEAF_THICKNESS / 2 - 2;
const LEAF_PLANKS = 4;
// Ширина закрытой створки боковой стены на экране — чуть шире кола.
const SIDE_LEAF_WIDTH = 24;
// Светлый торец сверху у створки боковой стены (пиксели).
const LEAF_TOP = 4;
// Поперечные планки створки — на этих долях высоты; между ними — диагональная распорка.
// Вместе они — буква «Z».
const BRACE_LOW = 0.2;
const BRACE_HIGH = 0.8;
// Глубина ворот: чуть впереди своей линии на земле. Столбы — ещё впереди:
// бревно и створки заходят за них, как будто привязаны к столбам.
const GATE_DEPTH_SHIFT = 0.2;
const POST_DEPTH_SHIFT = 0.4;

// Сторона стены, в которой стоит калитка.
type GateSide = 'left' | 'right' | 'top' | 'bottom';

// Калитка: середина проёма на земле, вдоль какой линии идёт стена (along),
// куда наружу (outward), проём для столкновений, насколько открыта (0 — закрыта,
// 1 — настежь), сколько мс ещё держаться открытой без вождя и её картинки:
// бревно сверху и две створки. Столбы — колья частокола (в списке stakes).
type Gate = {
  isSideWall: boolean;
  center: Point;
  along: Point;
  outward: Point;
  rect: Phaser.Geom.Rectangle;
  openness: number;
  holdTime: number;
  lintel: Phaser.GameObjects.Graphics;
  leaves: Phaser.GameObjects.Graphics[];
};

/**
 * Частокол вокруг лагеря с четырьмя калитками — в каждой стене.
 *
 * Сначала его нет; купили — колья по очереди вырастают из снега.
 * Нижняя стена проходит по каменному столу: стол — часть стены.
 * Столкновения — простая проверка прямоугольников стен, без физики:
 * allows() отвечает, можно ли шагнуть из точки в точку.
 * Калитка — часть частокола: два кола-столба, бревно сверху и две створки
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
      this.drawLintel(gate);
      this.drawLeaves(gate);
      for (const part of [gate.lintel, ...gate.leaves]) {
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
      lintel: graphics(),
      leaves: [graphics(), graphics()],
    };
  }

  // Бревно сверху: лежит на кольях-столбах от одного края проёма до другого.
  // По глубине — вместе с дальним столбом, чтобы вождь проходил под ним.
  private drawLintel(gate: Gate): void {
    const gap = FENCE_GATE_WIDTH / 2;
    const ends = [-1, 1].map((sign) => ({
      x: gate.center.x + gate.along.x * gap * sign,
      y: gate.center.y + gate.along.y * gap * sign,
    }));
    gate.lintel.clear().setVisible(true).setDepth(ends[0].y + GATE_DEPTH_SHIFT);
    drawLog(gate.lintel, ends[0], ends[1], LINTEL_HEIGHT, LINTEL_RADIUS);
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
      if (gate.isSideWall) {
        this.drawSideLeaf(gate, leaf, hinge, free, angle / (Math.PI / 2));
      } else {
        drawLeaf(leaf, hinge, free);
      }
    });
  }

  // Створка боковой стены. Закрытая — узкая дверца с «Z», повёрнутая к нам, прямо
  // в линии кольев (так же каждый кол боковой стены виден спереди). Открываясь
  // (turn от 0 до 1), она поворачивается наружу и становится настоящей створкой
  // от петли hinge до края free.
  private drawSideLeaf(gate: Gate, leaf: Phaser.GameObjects.Graphics, hinge: Point, free: Point, turn: number): void {
    // Закрытые дверцы стоят одна над другой вплотную, стык — на середине проёма.
    // Край у петли — со стороны двора, свободный край — снаружи: туда створка и откроется.
    const closedY = gate.center.y + Math.sign(hinge.y - gate.center.y) * (LEAF_HEIGHT / 2);
    const half = (SIDE_LEAF_WIDTH / 2) * gate.outward.x;
    const lerp = (a: Point, b: Point): Point => ({ x: Phaser.Math.Linear(a.x, b.x, turn), y: Phaser.Math.Linear(a.y, b.y, turn) });
    const p = lerp({ x: gate.center.x - half, y: closedY }, hinge);
    const q = lerp({ x: gate.center.x + half, y: closedY }, free);

    // Закрытые дверцы — впереди ближнего столба, иначе он их закроет.
    // Калитка открыта — глубина обычная, чтобы вождь проходил между створками.
    if (gate.openness < GATE_PASS_SHARE) {
      leaf.setDepth(gate.center.y + FENCE_GATE_WIDTH / 2 + POST_DEPTH_SHIFT + GATE_DEPTH_SHIFT);
    }
    drawFlatLeaf(leaf, p, q);
  }

  // ===== Колья =====

  // Расставляет колья по периметру (спрятанными) — по кругу, чтобы при постройке
  // забор вырастал «волной»: верх слева направо, правый бок вниз, низ справа налево,
  // левый бок вверх. В проёмах калиток и на месте стола кольев нет.
  // Последними вырастают столбы калиток — вместе с бревном и створками.
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

// ===== Рисование ворот =====

// Бревно на высоте height над линией от a до b (линия идёт вдоль x или вдоль y).
// Мы смотрим сверху под углом: высота уходит вверх по экрану.
// Бревно вдоль x видно спереди — снизу тень, сверху снег; бревно вдоль y видно
// сверху — правая сторона в тени, как у кольев, ближний торец — спил.
// По краям бревно привязано к столбам верёвкой.
function drawLog(g: Phaser.GameObjects.Graphics, a: Point, b: Point, height: number, radius: number): void {
  const isAlongX = a.y === b.y;
  const left = Math.min(a.x, b.x) - radius;
  const top = Math.min(a.y, b.y) - height - radius;
  const width = Math.abs(b.x - a.x) + radius * 2;
  const length = Math.abs(b.y - a.y) + radius * 2;

  g.fillStyle(COLORS.wood, 1);
  g.fillRoundedRect(left, top, width, length, radius);
  g.fillStyle(COLORS.woodDark, 1);
  if (isAlongX) {
    g.fillRoundedRect(left, top + radius, width, radius, { tl: 0, tr: 0, bl: radius, br: radius });
  } else {
    g.fillRoundedRect(left + radius, top, radius, length, { tl: 0, tr: radius, bl: 0, br: radius });
  }
  // Полоски коры вдоль бревна.
  g.lineStyle(1.5, COLORS.woodDark, 1);
  if (isAlongX) {
    for (const t of [0.3, 0.62]) g.lineBetween(left + width * t, top + radius - 2, left + width * (t + 0.14), top + radius - 1);
  } else {
    for (const t of [0.3, 0.62]) g.lineBetween(left + radius - 3, top + length * t, left + radius - 2, top + length * (t + 0.14));
  }
  // Снег по верху бревна вдоль x. Бревно вдоль y без снега: сверху оно — длинная
  // полоса, и белое прятало бы дерево.
  if (isAlongX) {
    g.fillStyle(COLORS.snowLight, 1);
    g.fillRoundedRect(left + radius, top - 1, width - radius * 2, LINTEL_SNOW, LINTEL_SNOW / 2);
  }
  g.lineStyle(2.5, COLORS.outline, 1);
  g.strokeRoundedRect(left, top, width, length, radius);

  // Ближний торец бревна вдоль y — свежий спил.
  if (!isAlongX) {
    const endY = top + length - radius;
    g.fillStyle(COLORS.woodEnd, 1);
    g.fillCircle(left + radius, endY, radius - 1);
    g.lineStyle(1.5, COLORS.woodDark, 1);
    g.strokeCircle(left + radius, endY, radius / 2.5);
    g.lineStyle(2.5, COLORS.outline, 1);
    g.strokeCircle(left + radius, endY, radius);
  }

  // Верёвка у каждого столба: две петли поперёк бревна сразу за столбом.
  for (const [end, other] of [[a, b], [b, a]]) {
    const toOther = Math.sign(other.x - end.x + other.y - end.y) * (POST_HALF_WIDTH + 4);
    const x = end.x + (isAlongX ? toOther : 0);
    const y = end.y - height + (isAlongX ? 0 : toOther);
    for (const shift of [-2, 2]) {
      if (isAlongX) {
        ropeLoop(g, x + shift, y - radius, x + shift - 2, y + radius);
      } else {
        ropeLoop(g, x - radius, y + shift, x + radius, y + shift + 2);
      }
    }
  }
}

// Петля верёвки: тёмная обводка и светлая верёвка поверх.
function ropeLoop(g: Phaser.GameObjects.Graphics, x1: number, y1: number, x2: number, y2: number): void {
  g.lineStyle(4.5, COLORS.outline, 1);
  g.lineBetween(x1, y1, x2, y2);
  g.lineStyle(2.5, COLORS.rope, 1);
  g.lineBetween(x1, y1, x2, y2);
}

// Створка — доска на земле от петли hinge до свободного края free толщиной
// LEAF_THICKNESS и высотой LEAF_HEIGHT. Мы смотрим сверху под углом: высота
// уходит прямо вверх по экрану. Рисуются только стороны, повёрнутые к нам:
// на широкой стороне доски, поперечные планки и распорка «Z», сверху — светлый торец.
// Закрытую створку боковой стены видно с ребра (как колья боковой стены),
// а открываясь, она поворачивается к нам широкой стороной.
function drawLeaf(g: Phaser.GameObjects.Graphics, hinge: Point, free: Point): void {
  const length = Phaser.Math.Distance.Between(hinge.x, hinge.y, free.x, free.y);
  if (length < 0.01) return;
  const dir = { x: (free.x - hinge.x) / length, y: (free.y - hinge.y) / length };
  const side = { x: -dir.y * (LEAF_THICKNESS / 2), y: dir.x * (LEAF_THICKNESS / 2) };
  // Четыре угла доски на земле: по кругу.
  const corners = [
    { x: hinge.x + side.x, y: hinge.y + side.y },
    { x: free.x + side.x, y: free.y + side.y },
    { x: free.x - side.x, y: free.y - side.y },
    { x: hinge.x - side.x, y: hinge.y - side.y },
  ];
  const up = (point: Point, h: number): Point => ({ x: point.x, y: point.y - h });

  // Стороны: видна та, что повёрнута к нам. Её углы на экране идут против
  // часовой стрелки — площадь со знаком меньше нуля (у задней — больше, у ребра — ноль).
  for (let i = 0; i < 4; i++) {
    const p = corners[i];
    const q = corners[(i + 1) % 4];
    const face = [p, q, up(q, LEAF_HEIGHT), up(p, LEAF_HEIGHT)];
    if (signedArea(face) > -0.5) continue;

    // Широкая сторона — дерево с досками, узкие торцы — в тени.
    const isWide = i === 0 || i === 2;
    fillFace(g, face, isWide ? COLORS.wood : COLORS.woodDark);
    if (isWide) drawPlanks(g, p, q, up(p, LEAF_HEIGHT), up(q, LEAF_HEIGHT));
    strokeFace(g, face);
  }

  // Верх — светлое дерево.
  const topFace = corners.map((corner) => up(corner, LEAF_HEIGHT));
  fillFace(g, topFace, COLORS.woodLight);
  strokeFace(g, topFace);
}

// Створка без толщины — одна широкая сторона от низа p–q вверх на LEAF_HEIGHT:
// доски, поперечные планки и «Z», сверху — светлый торец.
function drawFlatLeaf(g: Phaser.GameObjects.Graphics, p: Point, q: Point): void {
  const up = (point: Point, h: number): Point => ({ x: point.x, y: point.y - h });
  const face = [p, q, up(q, LEAF_HEIGHT), up(p, LEAF_HEIGHT)];
  fillFace(g, face, COLORS.wood);
  drawPlanks(g, p, q, up(p, LEAF_HEIGHT), up(q, LEAF_HEIGHT));
  strokeFace(g, face);
  const top = [up(p, LEAF_HEIGHT), up(q, LEAF_HEIGHT), up(q, LEAF_HEIGHT + LEAF_TOP), up(p, LEAF_HEIGHT + LEAF_TOP)];
  fillFace(g, top, COLORS.woodLight);
  strokeFace(g, top);
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
