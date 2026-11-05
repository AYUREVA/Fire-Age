import Phaser from 'phaser';
import { FIRE_MAX_HEAT, STAR_HEAT_MARK } from '../settings';
import { COLORS } from '../palette';
import { TEXTURES } from '../textures';
import { Campfire } from '../objects/Campfire';

// Стрелка поверх всего мира — на уровне HUD.
const ARROW_DEPTH = 20000;
// Костёр считается видным, пока его пламя хотя бы на столько пикселей внутри экрана.
const ON_SCREEN_MARGIN = 0;
// Где можно стоять стрелке: не ближе этого к краям экрана. Сверху посередине — ниже
// полосы мамонта; у верхних углов — ниже плашек HUD (слева время и жар, справа звёзды).
const EDGE_SIDE = 48;
const EDGE_TOP = 120;
const EDGE_TOP_UNDER_HUD = 250;
const EDGE_BOTTOM = 56;
// Ширина верхних углов с плашками: слева (время, клыки, жар) и справа (кнопки, звёзды).
const HUD_LEFT_WIDTH = 380;
const HUD_RIGHT_WIDTH = 300;
// Медальон стрелки: радиус камня, толщина кольца жара, пламя внутри.
const RADIUS = 26;
const RING_WIDTH = 6;
const RING_RADIUS = 19;
const FLAME_SCALE = 0.24;
const FLAME_BOTTOM = 9;
// Остриё стрелки: на каком расстоянии от середины медальона, длина и ширина.
const TIP_DISTANCE = 42;
const TIP_BASE = 24;
const TIP_HALF_WIDTH = 13;
// Ниже засечки звезды стрелка пульсирует: размах и скорость.
const LOW_PULSE = 0.14;
const LOW_PULSE_SPEED = 0.012;
// Точка, куда показывает стрелка: чуть выше кострища, на пламя.
const FIRE_LIFT = 40;

/**
 * Стрелка к главному костру (с 0.9.1): когда костёр за краем экрана,
 * у края стоит каменный медальон с кольцом жара и пламенем, а остриё смотрит
 * в сторону костра. Ниже засечки звезды — пульсирует: «беги к огню!».
 *
 * Жар хранит костёр (Campfire.heat); стрелка его только показывает.
 */
export class FireArrow {
  private scene: Phaser.Scene;
  // Всё вместе: медальон и остриё (рисуются каждый кадр) и пламя посередине.
  private container: Phaser.GameObjects.Container;
  private graphics: Phaser.GameObjects.Graphics;
  private flame: Phaser.GameObjects.Image;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.graphics = scene.add.graphics();
    this.flame = scene.add.image(0, FLAME_BOTTOM, TEXTURES.flame).setOrigin(0.5, 1).setScale(FLAME_SCALE);
    this.container = scene.add
      .container(0, 0, [this.graphics, this.flame])
      .setScrollFactor(0)
      .setDepth(ARROW_DEPTH)
      .setVisible(false);
  }

  // Спрятать стрелку (на время сценки боя с мамонтом); следующий update() покажет снова.
  hide(): void {
    this.container.setVisible(false);
  }

  // Каждый кадр: виден ли костёр; если нет — где у края экрана стрелка и куда смотрит.
  update(camera: Phaser.Cameras.Scene2D.Camera, fire: Campfire): void {
    const view = camera.worldView;
    const target = { x: fire.x - view.x, y: fire.y - FIRE_LIFT - view.y };
    const { width, height } = this.scene.scale;
    const isOnScreen =
      target.x > ON_SCREEN_MARGIN &&
      target.x < width - ON_SCREEN_MARGIN &&
      target.y > ON_SCREEN_MARGIN &&
      target.y < height - ON_SCREEN_MARGIN;
    this.container.setVisible(!isOnScreen);
    if (isOnScreen) return;

    // Луч из середины экрана к костру упирается в рамку, где можно стоять стрелке.
    // Попал в верхний угол с плашками — рамка там ниже.
    const center = { x: width / 2, y: height / 2 };
    const dx = target.x - center.x;
    const dy = target.y - center.y;
    const angle = Math.atan2(dy, dx);
    let spot = this.edgePoint(center, dx, dy, EDGE_TOP);
    if (spot.y < EDGE_TOP_UNDER_HUD && (spot.x < HUD_LEFT_WIDTH || spot.x > width - HUD_RIGHT_WIDTH)) {
      spot = this.edgePoint(center, dx, dy, EDGE_TOP_UNDER_HUD);
    }
    this.container.setPosition(spot.x, spot.y);

    const isLow = fire.heat < STAR_HEAT_MARK;
    const pulse = isLow ? 1 + LOW_PULSE * Math.sin(this.scene.time.now * LOW_PULSE_SPEED) : 1;
    this.container.setScale(pulse);
    this.flame.setVisible(!fire.isEmbers());
    this.draw(angle, fire.heat / FIRE_MAX_HEAT, isLow);
  }

  // Где луч из center с направлением (dx, dy) выходит из рамки экрана с верхом top.
  private edgePoint(center: { x: number; y: number }, dx: number, dy: number, top: number): { x: number; y: number } {
    const { width, height } = this.scene.scale;
    const reachX = dx === 0 ? Infinity : ((dx > 0 ? width - EDGE_SIDE : EDGE_SIDE) - center.x) / dx;
    const reachY = dy === 0 ? Infinity : ((dy > 0 ? height - EDGE_BOTTOM : top) - center.y) / dy;
    const reach = Math.max(0, Math.min(reachX, reachY));
    return { x: center.x + dx * reach, y: center.y + dy * reach };
  }

  // Каменный медальон, кольцо жара и остриё в сторону костра (angle — радианы).
  private draw(angle: number, share: number, isLow: boolean): void {
    const g = this.graphics;
    const color = isLow ? COLORS.heatLow : COLORS.heatBar;
    g.clear();
    // Остриё: тёмная обводка, внутри — цвет жара.
    const side = angle + Math.PI / 2;
    const point = (distance: number, spread: number): [number, number] => [
      Math.cos(angle) * distance + Math.cos(side) * spread,
      Math.sin(angle) * distance + Math.sin(side) * spread,
    ];
    g.fillStyle(COLORS.outline, 1);
    g.fillTriangle(...point(TIP_DISTANCE + 4, 0), ...point(TIP_BASE - 3, TIP_HALF_WIDTH + 4), ...point(TIP_BASE - 3, -TIP_HALF_WIDTH - 4));
    g.fillStyle(color, 1);
    g.fillTriangle(...point(TIP_DISTANCE, 0), ...point(TIP_BASE, TIP_HALF_WIDTH), ...point(TIP_BASE, -TIP_HALF_WIDTH));
    // Камень медальона.
    g.fillStyle(COLORS.outline, 1);
    g.fillCircle(0, 0, RADIUS + 3);
    g.fillStyle(COLORS.badgeStone, 1);
    g.fillCircle(0, 0, RADIUS);
    // Кольцо жара: тёмный жёлоб и дуга от верха по часовой.
    g.lineStyle(RING_WIDTH, COLORS.heatBarBack, 1);
    g.strokeCircle(0, 0, RING_RADIUS);
    if (share > 0) {
      g.lineStyle(RING_WIDTH, color, 1);
      g.beginPath();
      g.arc(0, 0, RING_RADIUS, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * share, false);
      g.strokePath();
    }
  }
}
