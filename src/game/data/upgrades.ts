import { HIT_INTERVAL } from '../settings';
import { TEXTURES } from '../textures';

// =====================================================================
//  Оружие: что продаётся на точке покупки оружия и за сколько клыков.
//  Помощники (с 0.8): что умеет каждая роль.
//  Это данные для гейм-дизайнера, как settings.ts. Какие точки покупки
//  есть на уровне, их места и цены частокола, хижин и найма — в data/levels.ts.
// =====================================================================

// ===== Оружие =====

// Оружие вождя.
// texture — картинка в руке (с кулаком), icon — картинка на точке покупки,
// hitInterval — мс между ударами (меньше — быстрее рубит кусты и бьёт волков),
// damage — урон по волку за удар, price — сколько клыков стоит,
// reach — дальность удара: во сколько раз больше базовых расстояний до куста,
// зайца и волка (GATHER_RADIUS, CATCH_RADIUS, WOLF_HIT_RADIUS в settings.ts).
export type Weapon = { texture: string; icon: string; hitInterval: number; damage: number; price: number; reach: number };

// Оружие по порядку — лестница: с дубиной вождь начинает уровень, топор и копьё
// покупаются на одной точке — после топора на ней появляется копьё.
// Топор рубит вдвое быстрее дубины, копьё — так же быстро, как топор, и бьёт дальше.
export const WEAPONS: Weapon[] = [
  { texture: TEXTURES.club, icon: TEXTURES.club, hitInterval: HIT_INTERVAL, damage: 1, price: 0, reach: 0.8 }, // дубина
  { texture: TEXTURES.axe, icon: TEXTURES.axeIcon, hitInterval: 225, damage: 2, price: 12, reach: 0.8 }, // каменный топор
  { texture: TEXTURES.spear, icon: TEXTURES.spearIcon, hitInterval: 225, damage: 3, price: 18, reach: 1.3 }, // копьё
];

// ===== Помощники (с 0.8) =====

// Роль помощника: сборщик рубит кусты и носит хворост в поленницу,
// охотник обходит лагерь, гонит волков и носит мясо кроликов в кучу сырого мяса.
export type HelperRole = 'gatherer' | 'hunter';

// Что умеет помощник этой роли.
// texture — как он выглядит (и картинка на точке найма), speed — скорость (пиксели в секунду),
// hitInterval — мс между ударами (по кусту, волку или кролику), damage — урон по волку за удар,
// carry — сколько предметов несёт за раз, sight — как далеко от себя замечает добычу (пиксели).
export type HelperData = {
  texture: string;
  speed: number;
  hitInterval: number;
  damage: number;
  carry: number;
  sight: number;
};

// Помощники медленнее вождя (260) и бьют реже, чем он дубиной (450): они помогают, а не играют за него.
export const HELPERS: Record<HelperRole, HelperData> = {
  gatherer: { texture: TEXTURES.gatherer, speed: 150, hitInterval: 700, damage: 0, carry: 3, sight: 2000 },
  hunter: { texture: TEXTURES.helperHunter, speed: 170, hitInterval: 600, damage: 1, carry: 1, sight: 350 },
};
