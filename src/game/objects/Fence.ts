import Phaser from 'phaser';
import {
  CAMPFIRE_POSITION,
  FENCE_GATE_WIDTH,
  FENCE_RECT,
  FENCE_WALL_THICKNESS,
  GATE_CLOSE_DELAY,
  GATE_OPEN_RADIUS,
  GATE_PASS_SHARE,
  GATE_SWING_TIME,
  TABLE_POSITION,
} from '../settings';
import { TEXTURES } from '../textures';

// ===== Колья =====

// Расстояние между кольями вдоль верхней и нижней стены и вдоль боковых стен.
// По бокам колья стоят чаще: мы смотрим сверху под углом, и стена «сжата».
const STAKE_STEP_X = 22;
const STAKE_STEP_Y = 26;
// В боковых стенах колья чуть сдвинуты влево-вправо (пиксели) и через один темнее —
// так видно каждый кол, а не одну полосу.
const SIDE_JITTER = 3;
const SIDE_SHADE_TINT = 0xd6cfc8;
// В нижней стене вместо кольев — каменный стол: столько пикселей от середины стола
// в обе стороны колья не ставим (стол шириной 240, textures.ts).
const TABLE_GAP_HALF = 125;
// Столбы у калиток выше обычных кольев.
const GATE_POST_SCALE = 1.25;
// Колья чуть разной высоты и через один отражены — так забор живой.
const STAKE_SCALE_MIN = 0.92;
const STAKE_SCALE_MAX = 1.08;
const STAKES_SEED = 'fence-stakes';
// Постройка: колья по очереди вырастают из земли (мс задержки между соседними
// и сколько растёт один кол).
const BUILD_STAGGER = 8;
const BUILD_GROW_TIME = 260;

// Калитки — напротив костра, на его высоте.
const GATE_Y = CAMPFIRE_POSITION.y;
// Створка калитки — несколько кольев от петли (верхнего столба) вниз, шаг как у боковой стены.
const GATE_LEAF_STAKES = 5;
// Колья створки чуть ниже кольев стены — так видно, что это дверца.
const GATE_LEAF_SCALE = 0.9;

// Калитка: проём в стене (для столкновений), петля на верхнем столбе,
// куда она распахивается (outward: -1 — влево, 1 — вправо, всегда наружу),
// колья створки (d — расстояние кола от петли), насколько она открыта
// (0 — закрыта, 1 — настежь) и сколько мс ещё держаться открытой без вождя.
type Gate = {
  rect: Phaser.Geom.Rectangle;
  hinge: { x: number; y: number };
  outward: number;
  leaf: { image: Phaser.GameObjects.Image; d: number }[];
  openness: number;
  holdTime: number;
};

/**
 * Частокол вокруг лагеря с двумя калитками — слева и справа.
 *
 * Сначала его нет; купили — колья по очереди вырастают из снега.
 * Нижняя стена проходит по каменному столу: стол — часть стены.
 * Столкновения — простая проверка прямоугольников стен, без физики:
 * allows() отвечает, можно ли шагнуть из точки в точку.
 * Калитки — створки из кольев на петле: вождь подходит — створка распахивается
 * наружу, отошёл — закрывается. Через открытую калитку проходят вождь и кролики,
 * волки — никогда. Про тех, кто ходит, частокол знает только точку вождя.
 */
export class Fence {
  private scene: Phaser.Scene;
  // Построен ли частокол.
  private isBuiltNow = false;
  // Стены (с проёмами калиток) и сами калитки — прямоугольники для столкновений.
  private walls: Phaser.Geom.Rectangle[] = [];
  private gates: Gate[] = [];
  // Двор внутри стен.
  private yard: Phaser.Geom.Rectangle;
  // Колья (пока частокол не построен, они спрятаны) и их размер.
  private stakes: { image: Phaser.GameObjects.Image; scale: number }[] = [];

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    const { left, top, right, bottom } = FENCE_RECT;
    const half = FENCE_WALL_THICKNESS / 2;
    const gateTop = GATE_Y - FENCE_GATE_WIDTH / 2;
    const gateBottom = GATE_Y + FENCE_GATE_WIDTH / 2;

    // Верх и низ — во всю ширину (внизу стена проходит и по столу).
    this.walls.push(wallRect(left, top, right, top, half), wallRect(left, bottom, right, bottom, half));
    // Бока — выше и ниже калиток.
    for (const x of [left, right]) {
      this.walls.push(wallRect(x, top, x, gateTop, half), wallRect(x, gateBottom, x, bottom, half));
    }
    this.yard = new Phaser.Geom.Rectangle(left + half, top + half, right - left - half * 2, bottom - top - half * 2);

    const rng = new Phaser.Math.RandomDataGenerator([STAKES_SEED]);
    this.createStakes(rng);
    this.gates = [this.createGate(rng, left, -1), this.createGate(rng, right, 1)];
  }

  // Вызывается сценой каждый кадр. (playerX, playerY) — где вождь.
  // Калитка, к которой подошёл вождь, распахивается; отошёл — через GATE_CLOSE_DELAY закрывается.
  update(delta: number, playerX: number, playerY: number): void {
    if (!this.isBuiltNow) return;

    for (const gate of this.gates) {
      gate.holdTime = this.shouldOpen(gate, playerX, playerY) ? GATE_CLOSE_DELAY : gate.holdTime - delta;
      const target = gate.holdTime > 0 ? 1 : 0;
      const step = delta / GATE_SWING_TIME;
      gate.openness = target > gate.openness ? Math.min(target, gate.openness + step) : Math.max(target, gate.openness - step);
      this.placeLeaf(gate);
    }
  }

  // Пора ли калитке открыться: вождь рядом с её серединой.
  private shouldOpen(gate: Gate, playerX: number, playerY: number): boolean {
    return Phaser.Math.Distance.Between(playerX, playerY, gate.rect.centerX, gate.rect.centerY) < GATE_OPEN_RADIUS;
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

  // Построить частокол: колья по очереди вырастают из снега.
  build(): void {
    if (this.isBuiltNow) return;
    this.isBuiltNow = true;

    for (const gate of this.gates) this.placeLeaf(gate);
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

  // Ставит колья створки по углу поворота на петле. Это поворот «в глубину»:
  // закрытая створка идёт от петли вниз вдоль стены, открытая — лежит наружу поперёк стены.
  // Колья остаются стоять, меняется только их место; глубина = y, как у всего на земле.
  private placeLeaf(gate: Gate): void {
    // Плавно: в начале и в конце поворота створка движется медленнее.
    const angle = Phaser.Math.Easing.Sine.InOut(gate.openness) * (Math.PI / 2);
    for (const { image, d } of gate.leaf) {
      const x = gate.hinge.x + gate.outward * d * Math.sin(angle);
      const y = gate.hinge.y + d * Math.cos(angle);
      image.setPosition(x, y).setDepth(y);
    }
  }

  // Калитка в боковой стене x: петля на верхнем столбе, створка — колья вниз от него.
  // outward — куда наружу распахивается (-1 — влево, 1 — вправо).
  private createGate(rng: Phaser.Math.RandomDataGenerator, x: number, outward: number): Gate {
    const half = FENCE_WALL_THICKNESS / 2;
    const gateTop = GATE_Y - FENCE_GATE_WIDTH / 2;
    // Верхний столб калитки — последний кол стены над проёмом.
    const hingeY = FENCE_RECT.top + Math.floor((gateTop - FENCE_RECT.top) / STAKE_STEP_Y) * STAKE_STEP_Y;
    const leaf: Gate['leaf'] = [];
    for (let i = 1; i <= GATE_LEAF_STAKES; i++) {
      leaf.push({ image: this.addStake(rng, x, hingeY + i * STAKE_STEP_Y, GATE_LEAF_SCALE), d: i * STAKE_STEP_Y });
    }
    return {
      rect: wallRect(x, gateTop, x, GATE_Y + FENCE_GATE_WIDTH / 2, half),
      hinge: { x, y: hingeY },
      outward,
      leaf,
      openness: 0,
      holdTime: 0,
    };
  }

  // Расставляет колья по периметру (спрятанными) — по кругу, чтобы при постройке
  // забор вырастал «волной»: верх слева направо, правый бок вниз, низ справа налево,
  // левый бок вверх.
  private createStakes(rng: Phaser.Math.RandomDataGenerator): void {
    const { left, top, right, bottom } = FENCE_RECT;
    const isInGate = (y: number): boolean => Math.abs(y - GATE_Y) < FENCE_GATE_WIDTH / 2;
    const isAtGateEdge = (y: number): boolean =>
      isInGate(y + STAKE_STEP_Y) !== isInGate(y) || isInGate(y - STAKE_STEP_Y) !== isInGate(y);

    for (let x = left; x <= right; x += STAKE_STEP_X) this.addStake(rng, x, top, 1);
    for (let y = top + STAKE_STEP_Y; y <= bottom; y += STAKE_STEP_Y) {
      if (!isInGate(y)) this.addSideStake(rng, right, y, isAtGateEdge(y));
    }
    for (let x = right; x >= left; x -= STAKE_STEP_X) {
      if (Math.abs(x - TABLE_POSITION.x) > TABLE_GAP_HALF) this.addStake(rng, x, bottom, 1);
    }
    for (let y = bottom - STAKE_STEP_Y; y > top; y -= STAKE_STEP_Y) {
      if (!isInGate(y)) this.addSideStake(rng, left, y, isAtGateEdge(y));
    }
  }

  // Кол боковой стены: чуть в сторону от линии и через один темнее.
  // У калитки — высокий столб.
  private addSideStake(rng: Phaser.Math.RandomDataGenerator, x: number, y: number, isGatePost: boolean): void {
    const side = Math.round(y / STAKE_STEP_Y) % 2 === 0 ? 1 : -1;
    const image = this.addStake(rng, x + side * SIDE_JITTER, y, isGatePost ? GATE_POST_SCALE : 1);
    if (side < 0) image.setTint(SIDE_SHADE_TINT);
  }

  // Один кол в точке (x, y): глубина = y, чуть случайный размер, через один отражён.
  private addStake(rng: Phaser.Math.RandomDataGenerator, x: number, y: number, size: number): Phaser.GameObjects.Image {
    const scale = size * rng.realInRange(STAKE_SCALE_MIN, STAKE_SCALE_MAX);
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

// Прямоугольник стены вдоль линии от (x1, y1) до (x2, y2) толщиной 2 · half.
function wallRect(x1: number, y1: number, x2: number, y2: number, half: number): Phaser.Geom.Rectangle {
  const left = Math.min(x1, x2) - half;
  const top = Math.min(y1, y2) - half;
  return new Phaser.Geom.Rectangle(left, top, Math.abs(x2 - x1) + half * 2, Math.abs(y2 - y1) + half * 2);
}
