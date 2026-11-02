import { TEXTURES } from './textures';

// =====================================================================
//  Типы ресурсов, которые вождь носит за спиной и складывает в кучи.
//
//  У каждого типа своя колонка за спиной и своя куча:
//  хворост — в поленницу, сырое мясо — в кучу у вертела,
//  жареное мясо забирается из кучи перед костром.
//  Рыба (с 0.8) — так же, только у малого костра возле проруби.
// =====================================================================

// Тип ресурса: хворост, сырое и жареное мясо, сырая и жареная рыба.
export type ItemType = 'wood' | 'rawMeat' | 'cookedMeat' | 'rawFish' | 'cookedFish';

// Картинка каждого типа: так он выглядит за спиной, в куче и в полёте.
export const ITEMS: Record<ItemType, { texture: string }> = {
  wood: { texture: TEXTURES.bundle },
  rawMeat: { texture: TEXTURES.rawMeat },
  cookedMeat: { texture: TEXTURES.cookedMeat },
  rawFish: { texture: TEXTURES.rawFish },
  cookedFish: { texture: TEXTURES.cookedFish },
};

// Порядок колонок за спиной: первая стоит у самой спины, следующие — дальше.
// Пустая колонка исчезает, поэтому на уровнях без рыбы колонок, как раньше, три.
export const ITEM_ORDER: ItemType[] = ['wood', 'rawMeat', 'rawFish', 'cookedMeat', 'cookedFish'];
