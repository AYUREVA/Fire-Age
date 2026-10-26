// =====================================================================
//  Сохранение прогресса игрока.
//
//  Прогресс между уровнями хранит только этот файл (раздел 9 плана, правило 10):
//  звёзды за уровни, потраченные звёзды, купленные мета-улучшения, звук.
//  Остальные его только читают (getProgress), а меняют — функциями ниже.
//  Каждое изменение сразу сохраняется: после обновления страницы прогресс на месте.
//
//  Где лежит сохранение, знают только load() и store(). Сейчас это localStorage
//  браузера; в 1.1 они будут сохранять в облако Яндекса, остальной код не изменится.
// =====================================================================

// Номер версии схемы сохранения. Поменялась схема — номер растёт,
// а upgradeSave() обновляет старое сохранение, не теряя прогресс.
const SAVE_VERSION = 1;

// Под каким ключом сохранение лежит в localStorage.
const SAVE_KEY = 'fire-age-save';

// Уровни мета-улучшений: сколько раз куплено каждое (0 — не куплено).
// Что они дают и сколько стоят — в data/metaUpgrades.ts.
export type MetaLevels = { speed: number; capacity: number; startWood: number };

// Прогресс игрока.
export type Progress = {
  version: number; // номер схемы (SAVE_VERSION)
  stars: number[]; // лучший результат по уровням: stars[i] — звёзд за уровень номер i в LEVELS (с нуля)
  spentStars: number; // сколько звёзд потрачено на мета-улучшения
  meta: MetaLevels; // купленные мета-улучшения
  isMuted: boolean; // звук выключен
};

// Прогресс в памяти. Загружается один раз при запуске игры.
const progress: Progress = load();

// ===== Чтение =====

// Прогресс игрока — только читать.
export function getProgress(): Readonly<Progress> {
  return progress;
}

// Сколько звёзд получено за все уровни (на карте).
export function getTotalStars(): number {
  return progress.stars.reduce((sum, stars) => sum + stars, 0);
}

// Сколько звёзд можно потратить: получено минус потрачено.
export function getAvailableStars(): number {
  return getTotalStars() - progress.spentStars;
}

// Открыт ли уровень номер levelIndex: первый открыт всегда,
// остальные — когда за предыдущий есть хотя бы одна звезда (он пройден).
export function isLevelOpen(levelIndex: number): boolean {
  return levelIndex === 0 || (progress.stars[levelIndex - 1] ?? 0) > 0;
}

// ===== Изменения (каждое сразу сохраняется) =====

// Уровень закончен со stars звёздами. Хранится лучший результат.
export function recordLevel(levelIndex: number, stars: number): void {
  const best = progress.stars[levelIndex] ?? 0;
  if (stars <= best) return;
  // Если уровни проходят не по порядку, пропущенные места заполняем нулями.
  for (let i = progress.stars.length; i < levelIndex; i++) progress.stars[i] = 0;
  progress.stars[levelIndex] = stars;
  store();
}

// Купить следующий уровень мета-улучшения id за price звёзд.
// Звёзд не хватает — ничего не меняется, вернёт false.
export function buyMetaUpgrade(id: keyof MetaLevels, price: number): boolean {
  if (getAvailableStars() < price) return false;
  progress.spentStars += price;
  progress.meta[id] += 1;
  store();
  return true;
}

// Звук выключен или включён.
export function setMuted(isMuted: boolean): void {
  progress.isMuted = isMuted;
  store();
}

// ===== Где лежит сохранение =====

// Прочитать сохранение. Нет его, или браузер не даёт читать, или оно битое — новый прогресс.
function load(): Progress {
  try {
    const text = localStorage.getItem(SAVE_KEY);
    return upgradeSave(text === null ? null : JSON.parse(text));
  } catch {
    return newProgress();
  }
}

// Записать прогресс. Браузер не даёт писать (приватное окно) — игра идёт дальше без сохранения.
function store(): void {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(progress));
  } catch {
    // Ничего не делаем: прогресс остаётся в памяти до закрытия страницы.
  }
}

// ===== Схема =====

// Прогресс нового игрока: ничего не пройдено и не куплено.
function newProgress(): Progress {
  return {
    version: SAVE_VERSION,
    stars: [],
    spentStars: 0,
    meta: { speed: 0, capacity: 0, startWood: 0 },
    isMuted: false,
  };
}

// Обновить сохранение любой старой версии до текущей схемы.
// Каждое поле берём из сохранения, если оно там есть и правильного типа,
// иначе — значение нового игрока. Так поле, добавленное в новой версии,
// получает значение по умолчанию, а старый прогресс остаётся.
function upgradeSave(raw: unknown): Progress {
  const fresh = newProgress();
  if (typeof raw !== 'object' || raw === null) return fresh;
  const saved = raw as Partial<Record<keyof Progress, unknown>>;
  const savedMeta = (typeof saved.meta === 'object' && saved.meta !== null ? saved.meta : {}) as Partial<
    Record<keyof MetaLevels, unknown>
  >;

  return {
    version: SAVE_VERSION,
    stars: Array.isArray(saved.stars) ? saved.stars.map((stars) => toCount(stars)) : fresh.stars,
    spentStars: toCount(saved.spentStars),
    meta: {
      speed: toCount(savedMeta.speed),
      capacity: toCount(savedMeta.capacity),
      startWood: toCount(savedMeta.startWood),
    },
    isMuted: saved.isMuted === true,
  };
}

// Число из сохранения: целое и не меньше нуля, иначе 0.
function toCount(value: unknown): number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0 ? value : 0;
}
