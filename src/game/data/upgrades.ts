import { HIT_INTERVAL } from '../settings';
import { TEXTURES } from '../textures';

// =====================================================================
//  Покупки на уровне: что продаётся на точках покупки, за сколько клыков
//  и где стоят точки. Это данные для гейм-дизайнера, как settings.ts.
// =====================================================================

// ===== Оружие =====

// Оружие вождя.
// texture — картинка в руке (с кулаком), icon — картинка на точке покупки,
// hitInterval — мс между ударами (меньше — быстрее рубит кусты и бьёт волков),
// damage — урон по волку за удар, price — сколько клыков стоит.
export type Weapon = { texture: string; icon: string; hitInterval: number; damage: number; price: number };

// Оружие по порядку: с дубиной вождь начинает уровень, топор и копьё покупаются
// на одной точке — после топора на ней появляется копьё.
export const WEAPONS: Weapon[] = [
  { texture: TEXTURES.club, icon: TEXTURES.club, hitInterval: HIT_INTERVAL, damage: 1, price: 0 }, // дубина
  { texture: TEXTURES.axe, icon: TEXTURES.axeIcon, hitInterval: 380, damage: 2, price: 12 }, // каменный топор
  { texture: TEXTURES.spear, icon: TEXTURES.spearIcon, hitInterval: 320, damage: 3, price: 20 }, // копьё
];

// Где точка покупки оружия: в лагере, слева над костром.
export const WEAPON_SPOT = { x: 900, y: 630 };
