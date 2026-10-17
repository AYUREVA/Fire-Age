import Phaser from 'phaser';
import { COOK_TIME } from '../settings';
import { COLORS } from '../palette';
import { TEXTURES } from '../textures';
import { ITEMS } from '../items';
import { flyArc, Point } from '../fx';

// ===== Вертел =====

// Палка вертела в картинке — на столько пикселей ниже её верхнего края.
const SKEWER_Y_IN_TEXTURE = 16;
// Рогатины стоят за пламенем, мясо на палке — перед пламенем, но за искрами
// (у пламени глубина костра + 0.1…0.3, у искр + 0.5, см. Campfire.ts).
const SPIT_DEPTH_SHIFT = 0.05;
const MEAT_DEPTH_SHIFT = 0.4;

// ===== Мясо на вертеле =====

// Сколько мс кусок летит из кучи на вертел и как высоко поднимается дуга.
const FLY_TIME = 380;
const FLY_ARC_HEIGHT = 60;
// Мясо поворачивается на палке: скорость поворота (радиан за мс).
const TURN_SPEED = 0.006;

// Смешать два цвета 0xRRGGBB: share = 0 — первый цвет, 1 — второй.
function mixColors(from: number, to: number, share: number): number {
  const channel = (shift: number): number => {
    const a = (from >> shift) & 0xff;
    const b = (to >> shift) & 0xff;
    return Math.round(a + (b - a) * share) << shift;
  };
  return channel(16) | channel(8) | channel(0);
}

/**
 * Вертел над костром: две рогатины и палка. На палке жарится один кусок мяса.
 *
 * Вертел только хранит мясо и показывает его: кусок поворачивается
 * и темнеет по мере жарки. Когда класть мясо, сколько жарить и куда
 * отдавать готовое, решает systems/Cooking.ts.
 * Про костёр и кучи вертел ничего не знает.
 */
export class Spit {
  // Сколько мс жарится текущий кусок. Меняет systems/Cooking.ts.
  cookTime = 0;

  private scene: Phaser.Scene;
  // Точка на палке, где висит мясо.
  private meatPoint: Point;
  // Глубина мяса на вертеле.
  private meatDepth: number;
  // Кусок на вертеле (если есть) и долетел ли он уже до палки.
  private item?: Phaser.GameObjects.Image;
  private isItemLanded = false;
  // Сколько мс мясо крутится — из этого считается поворот.
  private turnTime = 0;

  // (fireX, fireY) — середина кострища: вертел стоит прямо над ним.
  constructor(scene: Phaser.Scene, fireX: number, fireY: number) {
    this.scene = scene;
    const image = scene.add
      .image(fireX, fireY, TEXTURES.spit)
      .setOrigin(0.5, 1)
      .setDepth(fireY + SPIT_DEPTH_SHIFT);
    this.meatPoint = { x: fireX, y: fireY - image.height + SKEWER_Y_IN_TEXTURE };
    this.meatDepth = fireY + MEAT_DEPTH_SHIFT;
  }

  // На вертеле ничего нет (и ничего не летит).
  isEmpty(): boolean {
    return this.item === undefined;
  }

  // Кусок уже висит на палке (а не летит к ней).
  isLoaded(): boolean {
    return this.item !== undefined && this.isItemLanded;
  }

  // Принять сырой кусок из кучи: он летит на палку, жарка начинается с нуля.
  receive(item: Phaser.GameObjects.Image): void {
    this.item = item;
    this.isItemLanded = false;
    this.cookTime = 0;

    // На палке кусок висит серединой, а в кучах и за спиной стоит на нижнем крае.
    // Меняем точку опоры и сдвигаем кусок, чтобы он не прыгнул.
    item.setOrigin(0.5, 0.5).setY(item.y - item.displayHeight / 2);
    flyArc(this.scene, item, {
      from: { x: item.x, y: item.y },
      target: () => this.meatPoint,
      duration: FLY_TIME,
      height: FLY_ARC_HEIGHT,
      onLand: () => {
        this.isItemLanded = true;
        item.setDepth(this.meatDepth);
      },
    });
  }

  // Снять готовый кусок: он становится жареным и стоит на нижнем крае, как в куче.
  // Вернёт undefined, если на вертеле ничего не висит.
  takeCooked(): Phaser.GameObjects.Image | undefined {
    const item = this.item;
    if (!item || !this.isItemLanded) return undefined;

    this.item = undefined;
    this.isItemLanded = false;
    item.setTexture(ITEMS.cookedMeat.texture).clearTint().setScale(1).setOrigin(0.5, 1);
    item.setY(item.y + item.displayHeight / 2);
    return item;
  }

  // Вызывается сценой каждый кадр: мясо на палке крутится и темнеет.
  update(delta: number): void {
    if (!this.item || !this.isItemLanded) return;

    this.turnTime += delta;
    // Поворот вокруг палки: картинка сплющивается и раскрывается снова.
    this.item.setScale(1, Math.cos(this.turnTime * TURN_SPEED));
    // Поджаривается: сырое мясо постепенно темнеет до оттенка COLORS.meatRoasting.
    this.item.setTint(mixColors(COLORS.white, COLORS.meatRoasting, Math.min(1, this.cookTime / COOK_TIME)));
  }
}
