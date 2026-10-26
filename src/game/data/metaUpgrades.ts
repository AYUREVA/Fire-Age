import { MetaLevels } from '../save';
import { TEXTURES } from '../textures';

// =====================================================================
//  Мета-улучшения: постоянные улучшения вождя за звёзды.
//  Это данные для гейм-дизайнера, как settings.ts.
//
//  Звёзды получают за уровни, тратят здесь. Купленное действует на всех
//  уровнях и во всех эпохах. Сколько раз куплено каждое улучшение, хранит
//  save.ts (meta), а что оно даёт — считает GameScene при старте уровня.
// =====================================================================

// Одно мета-улучшение.
// id — ключ в сохранении, name и text — название и что даёт (на табличке «Улучшения»),
// icon — картинка, prices — цена в звёздах каждого следующего уровня
// (сколько цен, столько уровней), step — прибавка за каждый купленный уровень.
export type MetaUpgrade = {
  id: keyof MetaLevels;
  name: string;
  text: string;
  icon: string;
  prices: number[];
  step: number;
};

// Все мета-улучшения. Звёзд в каменном веке пока 9, а всё стоит 18 — приходится выбирать.
export const META_UPGRADES: MetaUpgrade[] = [
  // Скорость вождя: +5% за уровень (множитель 1 + 0.05 × уровень).
  { id: 'speed', name: 'Быстрые ноги', text: '+5% к скорости', icon: TEXTURES.leg, prices: [1, 2, 3], step: 0.05 },
  // Вместимость спины: +2 предмета в каждую колонку за уровень.
  {
    id: 'capacity',
    name: 'Крепкая спина',
    text: '+2 в каждую колонку',
    icon: TEXTURES.cookedMeat,
    prices: [1, 2, 3],
    step: 2,
  },
  // Стартовый хворост: +2 связки в поленнице в начале уровня за уровень.
  {
    id: 'startWood',
    name: 'Запас хвороста',
    text: '+2 связки в поленнице',
    icon: TEXTURES.bundle,
    prices: [1, 2, 3],
    step: 2,
  },
];

// Сколько даёт улучшение id, купленное level раз: прибавка × уровень.
export function metaBonus(id: keyof MetaLevels, level: number): number {
  const upgrade = META_UPGRADES.find((item) => item.id === id);
  return upgrade ? upgrade.step * level : 0;
}
