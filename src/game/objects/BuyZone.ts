import Phaser from 'phaser';
import { BUY_RADIUS } from '../settings';
import { COLORS, toCss } from '../palette';
import { TEXTURES, TITLE_FONT } from '../textures';
import { flyArc, pop, Point } from '../fx';

// ===== Круг на снегу =====

// Круг лежит плоско на земле, как площадки куч (ItemPile.ts); кольцо оплаты — над ним.
const FLAT_ON_GROUND_DEPTH = -100;
const RING_DEPTH = FLAT_ON_GROUND_DEPTH + 1;
// Кольцо оплаты: полуоси (по пунктиру картинки круга), толщина, из скольких отрезков.
const RING_RADIUS_X = 80;
const RING_RADIUS_Y = 47;
const RING_WIDTH = 7;
const RING_STEPS = 64;
// Прозрачность тёмной дорожки под кольцом оплаты.
const RING_TRACK_ALPHA = 0.25;
// Прозрачность и размер круга: обычно и когда вождь стоит на нём.
const ZONE_IDLE_ALPHA = 0.8;
const ZONE_ACTIVE_ALPHA = 1;
const ZONE_ACTIVE_SCALE = 1.06;
const ZONE_TWEEN_TIME = 160;

// ===== Что продаётся и цена =====

// Картинка покупки парит над серединой круга и покачивается вверх-вниз.
const ICON_LIFT = 22;
const ICON_SCALE = 1;
// Тень под парящей картинкой — на снегу посередине круга.
const ICON_SHADOW_WIDTH = 46;
const ICON_SHADOW_ALPHA = 0.6;
const ICON_BOB = 5;
const ICON_BOB_TIME = 900;
// Цена — клык и число на передней части круга.
const PRICE_Y = 24;
const PRICE_TUSK_X = -14;
const PRICE_TUSK_SCALE = 0.55;
const PRICE_TEXT_X = 2;

// ===== Клык летит в точку =====

const TUSK_FLY_TIME = 380;
const TUSK_FLY_ARC = 90;
// Появление и исчезновение точки (мс).
const SHOW_TIME = 300;

/**
 * Точка покупки — круг на снегу с картинкой того, что продаётся, и ценой.
 *
 * Вождь встаёт на круг — клыки по одному летят из счётчика сюда
 * (когда — решает systems/Purchases.ts), кольцо по краю заполняется,
 * цена уменьшается. Сошёл раньше — внесённое остаётся. Набралась цена —
 * покупка готова; что купить, решает GameScene.
 * Про вождя, HUD и покупки точка ничего не знает.
 */
export class BuyZone {
  // Середина круга.
  readonly x: number;
  readonly y: number;
  // Сколько клыков уже внесено (включая те, что ещё летят). Меняет pay().
  paid = 0;
  // Сколько мс вождь стоит на круге с клыками. Набралось BUY_INTERVAL — летит клык.
  // Меняет systems/Purchases.ts.
  payTimer = 0;

  private scene: Phaser.Scene;
  // Цена покупки в клыках.
  private price: number;
  // Сколько клыков уже долетело: по ним заполняется кольцо и уменьшается цена.
  private landed = 0;
  // Открыта ли точка (можно платить). Купили последнее — закрывается.
  private isOpenNow = true;
  // Подсвечен ли круг (вождь стоит на нём).
  private isHighlighted = false;

  private zone: Phaser.GameObjects.Image;
  private ring: Phaser.GameObjects.Graphics;
  private icon: Phaser.GameObjects.Image;
  private iconShadow: Phaser.GameObjects.Image;
  private priceTusk: Phaser.GameObjects.Image;
  private priceText: Phaser.GameObjects.Text;

  // price — цена в клыках, icon — картинка того, что продаётся.
  constructor(scene: Phaser.Scene, x: number, y: number, price: number, icon: string) {
    this.scene = scene;
    this.x = x;
    this.y = y;
    this.price = price;

    this.zone = scene.add.image(x, y, TEXTURES.buyZone).setDepth(FLAT_ON_GROUND_DEPTH).setAlpha(ZONE_IDLE_ALPHA);
    this.ring = scene.add.graphics().setDepth(RING_DEPTH);
    const shadow = scene.add.image(x, y, TEXTURES.shadow).setDepth(RING_DEPTH).setAlpha(ICON_SHADOW_ALPHA);
    shadow.setScale(ICON_SHADOW_WIDTH / shadow.width);
    this.iconShadow = shadow;
    // Картинка покупки стоит в круге: глубина как у стоящих предметов (по низу).
    this.icon = scene.add.image(x, y - ICON_LIFT, icon).setOrigin(0.5, 1).setScale(ICON_SCALE).setDepth(y);
    scene.tweens.add({
      targets: this.icon,
      y: y - ICON_LIFT - ICON_BOB,
      duration: ICON_BOB_TIME,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
    this.priceTusk = scene.add
      .image(x + PRICE_TUSK_X, y + PRICE_Y, TEXTURES.tusk)
      .setScale(PRICE_TUSK_SCALE)
      .setDepth(RING_DEPTH + 1);
    this.priceText = scene.add
      .text(x + PRICE_TEXT_X, y + PRICE_Y, '', {
        fontFamily: TITLE_FONT,
        fontSize: '26px',
        color: toCss(COLORS.hudText),
        stroke: toCss(COLORS.outline),
        strokeThickness: 6,
        resolution: 2,
      })
      .setOrigin(0, 0.5)
      .setDepth(RING_DEPTH + 1);

    this.showProgress();
  }

  // Можно ли сейчас платить на этой точке.
  isOpen(): boolean {
    return this.isOpenNow;
  }

  // Стоит ли точка (x, y) на круге.
  contains(x: number, y: number): boolean {
    return Phaser.Math.Distance.Between(x, y, this.x, this.y) <= BUY_RADIUS;
  }

  // Внесено столько, сколько стоит (клыки могут ещё лететь).
  isFullyPaid(): boolean {
    return this.paid >= this.price;
  }

  // Покупка готова: все клыки долетели.
  isComplete(): boolean {
    return this.landed >= this.price;
  }

  // Подсветка круга, пока вождь на нём. Твин — только когда подсветка меняется.
  setHighlighted(isOn: boolean): void {
    if (this.isHighlighted === isOn) return;
    this.isHighlighted = isOn;

    this.scene.tweens.add({
      targets: this.zone,
      alpha: isOn ? ZONE_ACTIVE_ALPHA : ZONE_IDLE_ALPHA,
      scale: isOn ? ZONE_ACTIVE_SCALE : 1,
      duration: ZONE_TWEEN_TIME,
      ease: 'Sine.easeOut',
    });
  }

  // Внести один клык: он летит по дуге из точки мира from в середину круга.
  pay(from: Point): void {
    this.paid += 1;
    const tusk = this.scene.add.image(from.x, from.y, TEXTURES.tusk).setOrigin(0.5, 1);
    flyArc(this.scene, tusk, {
      from,
      target: () => ({ x: this.x, y: this.y }),
      duration: TUSK_FLY_TIME,
      height: TUSK_FLY_ARC,
      onLand: () => {
        tusk.destroy();
        this.landed += 1;
        this.showProgress();
        pop(this.scene, this.priceText);
      },
    });
  }

  // Предложить следующую покупку на той же точке (например, копьё после топора):
  // новая цена и картинка, оплата с нуля.
  offer(price: number, icon: string): void {
    this.price = price;
    this.paid = 0;
    this.landed = 0;
    this.payTimer = 0;
    this.icon.setTexture(icon);
    this.showProgress();
    pop(this.scene, this.icon, ICON_SCALE);
  }

  // Закрыть точку: всё купили. Круг, картинка и цена тают.
  close(): void {
    this.isOpenNow = false;
    this.scene.tweens.add({
      targets: this.getParts(),
      alpha: 0,
      duration: SHOW_TIME,
      onComplete: () => {
        for (const part of this.getParts()) {
          part.setVisible(false);
        }
      },
    });
  }

  // Все картинки точки — чтобы спрятать их разом.
  private getParts(): (Phaser.GameObjects.Image | Phaser.GameObjects.Graphics | Phaser.GameObjects.Text)[] {
    return [this.zone, this.ring, this.icon, this.iconShadow, this.priceTusk, this.priceText];
  }

  // Кольцо оплаты (заполняется по часовой стрелке от верха) и сколько клыков ещё нужно.
  private showProgress(): void {
    this.priceText.setText(String(this.price - this.landed));

    this.ring.clear();
    // Тёмная дорожка по всему кругу — по ней видно, сколько ещё осталось.
    this.ring.lineStyle(RING_WIDTH, COLORS.outline, RING_TRACK_ALPHA);
    this.ring.strokeEllipse(this.x, this.y, RING_RADIUS_X * 2, RING_RADIUS_Y * 2);
    const share = this.price > 0 ? this.landed / this.price : 1;
    if (share <= 0) return;

    // Угол −90° — верх круга; дальше по часовой стрелке на долю share полного круга.
    const points: Phaser.Math.Vector2[] = [];
    const steps = Math.max(1, Math.round(RING_STEPS * share));
    for (let i = 0; i <= steps; i++) {
      const angle = -Math.PI / 2 + (i / steps) * share * Math.PI * 2;
      points.push(
        new Phaser.Math.Vector2(this.x + RING_RADIUS_X * Math.cos(angle), this.y + RING_RADIUS_Y * Math.sin(angle)),
      );
    }
    this.ring.lineStyle(RING_WIDTH + 4, COLORS.outline, 0.6);
    this.ring.strokePoints(points, false);
    this.ring.lineStyle(RING_WIDTH, COLORS.titleAmber, 1);
    this.ring.strokePoints(points, false);
  }
}
