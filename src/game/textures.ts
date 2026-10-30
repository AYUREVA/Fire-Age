import Phaser from 'phaser';
import { COLORS } from './palette';

// =====================================================================
//  Текстуры игры. Всё рисуется кодом через Graphics один раз при старте.
//
//  Остальной код берёт картинки ТОЛЬКО по ключам из TEXTURES.
//  Чтобы заменить рисунок на PNG-спрайт, меняется только этот файл:
//  PNG загружается под тем же ключом, а функция рисования удаляется.
//
//  Соглашение: у всех «стоящих» картинок (ель, скала, вождь, куст…)
//  точка опоры — середина нижнего края, там предмет касается земли.
//  Тени под предметами — отдельная картинка TEXTURES.shadow.
// =====================================================================

// ===== Ключи текстур =====

export const TEXTURES = {
  snowTile: 'snow-tile', // плитка снега, ею замощена вся земля
  snowPatch: 'snow-patch', // пятно утоптанного снега
  snowDrift: 'snow-drift', // небольшой сугроб
  pebble: 'pebble', // камешек со снежной шапкой
  grassTuft: 'grass-tuft', // пучок сухой травы из-под снега
  fir: 'fir', // заснеженная ель
  rock: 'rock', // скала со снегом
  shadow: 'shadow', // мягкая тень-эллипс под предметами
  player: 'player', // вождь без ног, рук и дубины, смотрит чуть вправо
  leg: 'leg', // нога в сапоге; вращается вокруг бедра (см. Player.ts)
  arm: 'arm', // свободная рука с открытой ладонью; вращается вокруг плеча (см. Player.ts)
  clubArm: 'club-arm', // рука с оружием без кисти (кулак — на картинке оружия); вращается вокруг плеча
  club: 'club', // каменная булава с кулаком внизу; вращается вокруг кулака (см. Player.ts)
  axe: 'axe', // двусторонний каменный топор с кулаком внизу (кулак — как у дубины)
  spear: 'spear', // копьё с широким кремнёвым наконечником и кулаком внизу
  axeIcon: 'axe-icon', // двусторонний каменный топор без кулака — на точке покупки
  spearIcon: 'spear-icon', // копьё без кулака — на точке покупки
  ring: 'ring', // светлое кольцо под ногами вождя
  joystickBase: 'joystick-base', // круг джойстика
  joystickKnob: 'joystick-knob', // ручка джойстика
  rabbit: 'rabbit', // пушистый серо-бурый кролик, смотрит вправо; точка опоры — лапы
  // Волк собран из частей, как вождь: все смотрят вправо, точки вращения — в Wolf.ts.
  wolfBody: 'wolf-body', // поджарое туловище с гривой и шеей
  wolfHead: 'wolf-head', // голова с оскалом; вращается у шеи
  wolfTail: 'wolf-tail', // пушистый хвост; вращается у основания (справа)
  wolfFrontLeg: 'wolf-front-leg', // передняя лапа; вращается у плеча (вверху)
  wolfBackLeg: 'wolf-back-leg', // задняя лапа со скакательным суставом; вращается у бедра (вверху)
  // Три вида путников. Со спины — идёт к столу и стоит в очереди, спереди — уходит.
  // Точка опоры — ноги.
  hunterBack: 'hunter-back', // охотник: рыжие лохмы, котомка, копьё
  hunterFront: 'hunter-front',
  elderBack: 'elder-back', // старец: серый капюшон, седые волосы, посох с перьями
  elderFront: 'elder-front',
  girlBack: 'girl-back', // девушка: две косы с бусинами, корзина за спиной
  girlFront: 'girl-front',
  bubble: 'bubble', // пузырь над головой путника: что он хочет
  bush: 'bush', // зелёный куст, точка опоры — низ ствола
  bushSnow: 'bush-snow', // снег на кроне куста (тот же размер, ложится поверх)
  stump: 'stump', // пенёк — куст без хвороста
  bundle: 'bundle', // связка хвороста, перевязанная верёвкой
  rawMeat: 'raw-meat', // сырое мясо: розовая ножка с косточкой
  tusk: 'tusk', // клык — валюта каменного века
  cookedMeat: 'cooked-meat', // жареное мясо: румяная ножка с косточкой
  snowflake: 'snowflake', // снежинка: падающий снег и снег из куста
  chip: 'chip', // щепка, летит из куста при ударе
  dropZone: 'drop-zone', // площадка кучи у костра: светлая рамка (иконку ставит ItemPile)
  fenceStake: 'fence-stake', // заострённый кол частокола со снежной шапкой; точка опоры — низ
  fenceIcon: 'fence-icon', // три кола, связанные верёвкой, — частокол на точке покупки
  hut: 'hut', // хижина-шалаш из шкур на жердях, со снегом; точка опоры — низ
  buyZone: 'buy-zone', // круг точки покупки на снегу (кольцо оплаты и цену рисует BuyZone)
  firePit: 'fire-pit', // кострище: камни и поленья
  spit: 'spit', // вертел над костром: две рогатины и палка; точка опоры — низ
  stoneTable: 'stone-table', // каменный стол со шкурой: сюда кладут еду для путников
  flame: 'flame', // язык пламени; точка опоры — низ
  glow: 'glow', // мягкий белый круг; его красят в цвет света
  spark: 'spark', // искра костра (белая, цвет задаёт частица)
  nightLight: 'night-light', // ночная тьма со светлым пятном посередине (белая, красится tint)
  fireLight: 'fire-light', // плавное пятно света без ступенек: ореол огня и тёплый свет ночью (белое, красится tint)
  smoke: 'smoke', // клуб дыма над костром: мягкое белое облачко (цвет задаёт частица)
  vignette: 'vignette', // ночная виньетка: середина прозрачная, к углам экрана темнеет (белая, красится tint)
  heatBarBack: 'heat-bar-back', // подложка шкалы жара над костром
  heatBarFill: 'heat-bar-fill', // заливка шкалы жара (белая, красится tint)
  hudPanel: 'hud-panel', // плашка интерфейса со скруглёнными углами
  starPanel: 'star-panel', // плашка «за что звёзды» (такая же каменная плашка, своего размера)
  bannerChip: 'banner-chip', // плашка метели под табличкой ночи
  modifierPlate: 'modifier-plate', // плашка ночного модификатора «×2» / «×0.6» в HUD
  tutorialPlate: 'tutorial-plate', // плашка подсказки обучения: перерисовывается под ширину текста
  timerPlate: 'timer-plate', // плашка крупного таймера ночи «ДО РАССВЕТА»
  moonIcon: 'moon-icon', // луна на плашке таймера: ночь, до рассвета
  sunIcon: 'sun-icon', // солнце на плашке таймера: день, до ночи
  stoneTablet: 'stone-tablet', // каменная табличка: пауза, старт уровня
  stoneTabletLarge: 'stone-tablet-large', // большая каменная табличка: меню, итоги
  roundStone: 'round-stone', // круглый камень-кнопка: уровень и эпоха на карте
  lock: 'lock', // замок: закрытый уровень или эпоха
  star: 'star', // звезда (белая, красится tint): полученная — золотая, пустая — тёмная
  // Иконки эпох на карте (для закрытых — тёмный силуэт через tint).
  epochStone: 'epoch-stone', // каменный век: костёр
  epochBronze: 'epoch-bronze', // бронзовый век: наковальня
  epochMedieval: 'epoch-medieval', // средневековье: крепостная башня
  epochSteam: 'epoch-steam', // эпоха пара: паровоз
  epochPolar: 'epoch-polar', // полярная станция: домик с антенной
  epochFuture: 'epoch-future', // будущее: купол колонии
  tutorialArrow: 'tutorial-arrow', // стрелка обучения: смотрит вниз, на цель
  stoneBanner: 'stone-banner', // широкая низкая табличка: уведомление о смене дня и ночи
  stoneButton: 'stone-button', // каменная кнопка на табличке
  pauseButton: 'pause-button', // круглая каменная кнопка паузы в углу экрана
  soundOnButton: 'sound-on-button', // круглая каменная кнопка звука: динамик со звуковыми волнами
  soundOffButton: 'sound-off-button', // та же кнопка, звук выключен: динамик перечёркнут
} as const;

// Шрифт всех надписей. Это тоже «ассет»: свой шрифт подключается здесь.
export const FONT_FAMILY = '"Trebuchet MS", "Segoe UI", system-ui, sans-serif';

// Шрифт заголовков, кнопок табличек и таймера — Russo One:
// лицензия SIL Open Font License (OFL), есть кириллица.
// Файл лежит в проекте: public/fonts/, рядом — текст лицензии OFL.txt.
const TITLE_FONT_NAME = 'Russo One';
const TITLE_FONT_URL = 'fonts/RussoOne-Regular.ttf';
// Если шрифт не загрузился, надписи нарисуются обычным шрифтом.
export const TITLE_FONT = '"' + TITLE_FONT_NAME + '", ' + FONT_FAMILY;

// Загружает шрифт заголовков. Вызывается в GameScene.preload().
export function loadFonts(scene: Phaser.Scene): void {
  scene.load.font(TITLE_FONT_NAME, TITLE_FONT_URL);
}

// ===== Размеры текстур в пикселях =====

// Ширина (w) и высота (h) картинки.
type Size = { w: number; h: number };

const SNOW_TILE_SIZE: Size = { w: 512, h: 512 };
const SNOW_PATCH_SIZE: Size = { w: 150, h: 70 };
const SNOW_DRIFT_SIZE: Size = { w: 120, h: 54 };
const PEBBLE_SIZE: Size = { w: 32, h: 24 };
const GRASS_TUFT_SIZE: Size = { w: 36, h: 32 };
const FIR_SIZE: Size = { w: 124, h: 180 };
const ROCK_SIZE: Size = { w: 100, h: 78 };
const SHADOW_SIZE: Size = { w: 80, h: 36 };
const PLAYER_SIZE: Size = { w: 124, h: 160 };
const LEG_SIZE: Size = { w: 26, h: 34 };
const ARM_SIZE: Size = { w: 26, h: 50 };
const CLUB_ARM_SIZE: Size = { w: 26, h: 40 };
const CLUB_SIZE: Size = { w: 36, h: 92 };
const AXE_SIZE: Size = { w: 88, h: 100 };
const SPEAR_SIZE: Size = { w: 40, h: 150 };
const RING_SIZE: Size = { w: 90, h: 44 };
const JOYSTICK_BASE_SIZE: Size = { w: 128, h: 128 };
const JOYSTICK_KNOB_SIZE: Size = { w: 60, h: 60 };
const BUSH_SIZE: Size = { w: 124, h: 104 };
const RABBIT_SIZE: Size = { w: 64, h: 60 };
const WOLF_BODY_SIZE: Size = { w: 124, h: 72 };
const WOLF_HEAD_SIZE: Size = { w: 76, h: 52 };
const WOLF_TAIL_SIZE: Size = { w: 70, h: 34 };
const WOLF_FRONT_LEG_SIZE: Size = { w: 26, h: 62 };
const WOLF_BACK_LEG_SIZE: Size = { w: 32, h: 64 };
// Грива волка рисуется на столько пикселей ниже своих координат (место под острые пряди).
const MANE_SHIFT_Y = 6;
const TRAVELER_SIZE: Size = { w: 84, h: 112 };
const BUBBLE_SIZE: Size = { w: 84, h: 50 };
const STUMP_SIZE: Size = { w: 80, h: 60 };
const BUNDLE_SIZE: Size = { w: 56, h: 28 };
const MEAT_SIZE: Size = { w: 48, h: 32 };
const TUSK_SIZE: Size = { w: 36, h: 44 };
// Высота корня клыка (тёмная верхняя часть).
const TUSK_ROOT_HEIGHT = 12;
const SNOWFLAKE_SIZE: Size = { w: 12, h: 12 };
const CHIP_SIZE: Size = { w: 12, h: 9 };
const DROP_ZONE_SIZE: Size = { w: 220, h: 132 };
// Рамка площадки кучи: отступ от края картинки и скругление углов.
// По ним же рисуется светящаяся рамка подсказки обучения (fx.ts, glowFrame).
export const DROP_ZONE_INSET = 8;
export const DROP_ZONE_RADIUS = 30;
const BUY_ZONE_SIZE: Size = { w: 180, h: 110 };
const HUT_SIZE: Size = { w: 170, h: 160 };
const FENCE_STAKE_SIZE: Size = { w: 30, h: 80 };
const FENCE_ICON_SIZE: Size = { w: 78, h: 92 };
const FIRE_PIT_SIZE: Size = { w: 110, h: 64 };
const SPIT_SIZE: Size = { w: 170, h: 96 };
const STONE_TABLE_SIZE: Size = { w: 240, h: 150 };
const FLAME_SIZE: Size = { w: 64, h: 96 };
const GLOW_SIZE: Size = { w: 128, h: 128 };
const SPARK_SIZE: Size = { w: 8, h: 8 };
const NIGHT_LIGHT_SIZE: Size = { w: 256, h: 256 };
const FIRE_LIGHT_SIZE: Size = { w: 256, h: 256 };
const SMOKE_SIZE: Size = { w: 40, h: 32 };
// Клуб дыма — три мягких круга: середина (x, y) в долях картинки и радиус в долях ширины.
// Круги целиком внутри картинки — иначе у облачка был бы срезанный край.
const SMOKE_BLOBS = [
  { x: 0.34, y: 0.6, r: 0.3 },
  { x: 0.66, y: 0.6, r: 0.3 },
  { x: 0.5, y: 0.4, r: 0.3 },
];
// Плотность середины каждого круга (там, где круги накладываются, дым гуще).
const SMOKE_BLOB_ALPHA = 0.55;
const VIGNETTE_SIZE: Size = { w: 256, h: 256 };
// Виньетка начинает темнеть на этой доле радиуса (до неё — совсем прозрачно).
// Радиус — до угла картинки, поэтому к углам экрана тьма гуще всего.
const VIGNETTE_CLEAR = 0.45;
// Ночная тьма начинает густеть на этой доле радиуса пятна (ближе к середине — совсем светло).
const NIGHT_LIGHT_CLEAR = 0.3;
// Из скольких ступеней-цветов состоит плавный переход градиента (больше — глаже).
const GRADIENT_STEPS = 12;
const HEAT_BAR_BACK_SIZE: Size = { w: 116, h: 24 };
const HEAT_BAR_FILL_SIZE: Size = { w: 104, h: 12 };
const HUD_PANEL_SIZE: Size = { w: 170, h: 66 };
// Каменные плашки своего размера (размер самой плашки — картинка на PLATE_MARGIN шире с каждой стороны).
export const STAR_PANEL_SIZE: Size = { w: 270, h: 112 };
const BANNER_CHIP_SIZE: Size = { w: 200, h: 46 };
export const MODIFIER_PLATE_SIZE: Size = { w: 84, h: 38 };
const TIMER_PLATE_SIZE: Size = { w: 230, h: 124 };
const MOON_ICON_SIZE: Size = { w: 40, h: 40 };
const SUN_ICON_SIZE: Size = { w: 44, h: 44 };
// Ширина 600 — табличка помещается на узкий экран (короткая сторона 640).
const STONE_TABLET_SIZE: Size = { w: 600, h: 320 };
const STONE_TABLET_LARGE_SIZE: Size = { w: 600, h: 560 };
const ROUND_STONE_SIZE: Size = { w: 84, h: 84 };
const LOCK_SIZE: Size = { w: 30, h: 36 };
const STAR_SIZE: Size = { w: 36, h: 36 };
const EPOCH_ICON_SIZE: Size = { w: 64, h: 64 };
const TUTORIAL_ARROW_SIZE: Size = { w: 48, h: 56 };
const STONE_BANNER_SIZE: Size = { w: 520, h: 170 };
const STONE_BUTTON_SIZE: Size = { w: 210, h: 66 };
const PAUSE_BUTTON_SIZE: Size = { w: 60, h: 60 };

// ===== Параметры рисования =====

// Толщина обводки у всех рисунков и тонкая обводка для мелких деталей.
const OUTLINE_WIDTH = 3;
const THIN_OUTLINE_WIDTH = 2;
// «Зерно» случайных чисел для узора снежной плитки: узор всегда одинаковый.
const SNOW_TILE_SEED = 'snow-tile';
// Сколько на плитке голубых теней, светлых пятен и крупинок.
const SNOW_TILE_SHADES = 8;
const SNOW_TILE_LIGHTS = 6;
const SNOW_TILE_SPECKS = 60;
// Центр кулака на дубине — на столько пикселей выше нижнего края картинки
// Так же у топора и копья: кулак у всего оружия на одной высоте от низа картинки,
// вокруг него оружие вращается (Player.ts).
export const WEAPON_GRIP_FROM_BOTTOM = 13;
// Кулак на рукояти: контур (точки [x, y, …] вокруг центра кулака, сглаживаются)
// и где складки между пальцами (по y). Рисуется зеркально — см. drawFistFront().
const FIST_OUTLINE = [-6.5, -6.2, -1, -8.2, 4.5, -7.3, 7.6, -4.3, 8.1, -0.4, 7.8, 3.4, 6.4, 6.6, 2.4, 8.3, -3, 8, -7, 5.4, -8.3, 0];
const FIST_CREASES = [-4.4, -0.6, 3.4];
// Открытая ладонь свободной руки: контур вокруг запястья (пальцы вместе, большой палец рядом).
const OPEN_HAND_OUTLINE = [
  -4.2, -1, 3.6, -1, 5, 1.2, 6.6, 4, 7.4, 7.4, 6.8, 10, 5.4, 10.4, 4.7, 9.2, 5.2, 11.4, 4, 13.8, 1, 14.6, -2.6, 13.8, -4.8, 10.6, -5.4, 4.5,
];
// Кисти рисуются тонкой обводкой — аккуратнее, чем у тела.
const HAND_OUTLINE_WIDTH = 2;
// Листиков на кроне куста и «зерно» их раскладки.
const BUSH_LEAF_COUNT = 140;
const BUSH_LEAVES_SEED = 'bush-leaves';
// Из скольких точек состоит контур языка пламени (больше — глаже).
const FLAME_POINTS = 28;

// Тип короче, чтобы не писать каждый раз полное имя.
type Graphics = Phaser.GameObjects.Graphics;

// Рисует все текстуры игры. Вызывается в начале GameScene.create().
export function createTextures(scene: Phaser.Scene): void {
  // Текстуры общие для всей игры и переживают перезапуск сцены.
  // Если они уже есть — второй раз не рисуем (иначе рисунок лёг бы поверх старого).
  if (scene.textures.exists(TEXTURES.snowTile)) return;

  bake(scene, TEXTURES.snowTile, SNOW_TILE_SIZE, drawSnowTile);
  bake(scene, TEXTURES.snowPatch, SNOW_PATCH_SIZE, drawSnowPatch);
  bake(scene, TEXTURES.snowDrift, SNOW_DRIFT_SIZE, drawSnowDrift);
  bake(scene, TEXTURES.pebble, PEBBLE_SIZE, drawPebble);
  bake(scene, TEXTURES.grassTuft, GRASS_TUFT_SIZE, drawGrassTuft);
  bake(scene, TEXTURES.fir, FIR_SIZE, drawFir);
  bake(scene, TEXTURES.rock, ROCK_SIZE, drawRock);
  bake(scene, TEXTURES.shadow, SHADOW_SIZE, drawShadow);
  bake(scene, TEXTURES.player, PLAYER_SIZE, drawPlayer);
  bake(scene, TEXTURES.leg, LEG_SIZE, drawLeg);
  bake(scene, TEXTURES.arm, ARM_SIZE, drawArm);
  bake(scene, TEXTURES.clubArm, CLUB_ARM_SIZE, drawClubArm);
  bake(scene, TEXTURES.club, CLUB_SIZE, drawClub);
  bake(scene, TEXTURES.axe, AXE_SIZE, (g) => drawAxe(g, true));
  bake(scene, TEXTURES.spear, SPEAR_SIZE, (g) => drawSpear(g, true));
  bake(scene, TEXTURES.axeIcon, AXE_SIZE, (g) => drawAxe(g, false));
  bake(scene, TEXTURES.spearIcon, SPEAR_SIZE, (g) => drawSpear(g, false));
  bake(scene, TEXTURES.ring, RING_SIZE, drawRing);
  bake(scene, TEXTURES.joystickBase, JOYSTICK_BASE_SIZE, drawJoystickBase);
  bake(scene, TEXTURES.joystickKnob, JOYSTICK_KNOB_SIZE, drawJoystickKnob);
  bake(scene, TEXTURES.rabbit, RABBIT_SIZE, drawRabbit);
  bake(scene, TEXTURES.wolfBody, WOLF_BODY_SIZE, drawWolfBody);
  bake(scene, TEXTURES.wolfHead, WOLF_HEAD_SIZE, drawWolfHead);
  bake(scene, TEXTURES.wolfTail, WOLF_TAIL_SIZE, drawWolfTail);
  bake(scene, TEXTURES.wolfFrontLeg, WOLF_FRONT_LEG_SIZE, drawWolfFrontLeg);
  bake(scene, TEXTURES.wolfBackLeg, WOLF_BACK_LEG_SIZE, drawWolfBackLeg);
  bake(scene, TEXTURES.hunterBack, TRAVELER_SIZE, (g) => drawHunter(g, false));
  bake(scene, TEXTURES.hunterFront, TRAVELER_SIZE, (g) => drawHunter(g, true));
  bake(scene, TEXTURES.elderBack, TRAVELER_SIZE, (g) => drawElder(g, false));
  bake(scene, TEXTURES.elderFront, TRAVELER_SIZE, (g) => drawElder(g, true));
  bake(scene, TEXTURES.girlBack, TRAVELER_SIZE, (g) => drawGirl(g, false));
  bake(scene, TEXTURES.girlFront, TRAVELER_SIZE, (g) => drawGirl(g, true));
  bake(scene, TEXTURES.bubble, BUBBLE_SIZE, drawBubble);
  bake(scene, TEXTURES.bush, BUSH_SIZE, drawBush);
  bake(scene, TEXTURES.bushSnow, BUSH_SIZE, drawBushSnow);
  bake(scene, TEXTURES.stump, STUMP_SIZE, drawStump);
  bake(scene, TEXTURES.bundle, BUNDLE_SIZE, drawBundle);
  bake(scene, TEXTURES.tusk, TUSK_SIZE, drawTusk);
  bake(scene, TEXTURES.rawMeat, MEAT_SIZE, (g) => drawMeat(g, COLORS.rawMeat, COLORS.rawMeatShade, COLORS.rawMeatLight, false));
  bake(scene, TEXTURES.cookedMeat, MEAT_SIZE, (g) =>
    drawMeat(g, COLORS.cookedMeat, COLORS.cookedMeatShade, COLORS.cookedMeatLight, true),
  );
  bake(scene, TEXTURES.snowflake, SNOWFLAKE_SIZE, drawSnowflake);
  bake(scene, TEXTURES.chip, CHIP_SIZE, drawChip);
  bake(scene, TEXTURES.dropZone, DROP_ZONE_SIZE, drawDropZone);
  bake(scene, TEXTURES.buyZone, BUY_ZONE_SIZE, drawBuyZone);
  bake(scene, TEXTURES.hut, HUT_SIZE, drawHut);
  bake(scene, TEXTURES.fenceStake, FENCE_STAKE_SIZE, drawFenceStake);
  bake(scene, TEXTURES.fenceIcon, FENCE_ICON_SIZE, drawFenceIcon);
  bake(scene, TEXTURES.firePit, FIRE_PIT_SIZE, drawFirePit);
  bake(scene, TEXTURES.spit, SPIT_SIZE, drawSpit);
  bake(scene, TEXTURES.stoneTable, STONE_TABLE_SIZE, drawStoneTable);
  bake(scene, TEXTURES.flame, FLAME_SIZE, drawFlame);
  bake(scene, TEXTURES.glow, GLOW_SIZE, drawGlow);
  bake(scene, TEXTURES.spark, SPARK_SIZE, drawSpark);
  bakeNightLight(scene);
  bakeFireLight(scene);
  bakeVignette(scene);
  bakeSmoke(scene);
  bake(scene, TEXTURES.heatBarBack, HEAT_BAR_BACK_SIZE, drawHeatBarBack);
  bake(scene, TEXTURES.heatBarFill, HEAT_BAR_FILL_SIZE, drawHeatBarFill);
  bake(scene, TEXTURES.hudPanel, HUD_PANEL_SIZE, drawHudPanel);
  bakeStonePlate(scene, TEXTURES.starPanel, STAR_PANEL_SIZE.w, STAR_PANEL_SIZE.h);
  bakeStonePlate(scene, TEXTURES.bannerChip, BANNER_CHIP_SIZE.w, BANNER_CHIP_SIZE.h);
  bakeStonePlate(scene, TEXTURES.modifierPlate, MODIFIER_PLATE_SIZE.w, MODIFIER_PLATE_SIZE.h);
  bakeStonePlate(scene, TEXTURES.timerPlate, TIMER_PLATE_SIZE.w, TIMER_PLATE_SIZE.h);
  bake(scene, TEXTURES.moonIcon, MOON_ICON_SIZE, drawMoonIcon);
  bake(scene, TEXTURES.sunIcon, SUN_ICON_SIZE, drawSunIcon);
  bake(scene, TEXTURES.stoneTablet, STONE_TABLET_SIZE, (g) => drawStoneSlab(g, STONE_TABLET_SIZE));
  bake(scene, TEXTURES.stoneBanner, STONE_BANNER_SIZE, (g) => drawStoneSlab(g, STONE_BANNER_SIZE));
  bake(scene, TEXTURES.stoneButton, STONE_BUTTON_SIZE, drawStoneButton);
  bake(scene, TEXTURES.pauseButton, PAUSE_BUTTON_SIZE, drawPauseButton);
  bake(scene, TEXTURES.soundOnButton, PAUSE_BUTTON_SIZE, (g) => drawSoundButton(g, true));
  bake(scene, TEXTURES.soundOffButton, PAUSE_BUTTON_SIZE, (g) => drawSoundButton(g, false));
  bake(scene, TEXTURES.stoneTabletLarge, STONE_TABLET_LARGE_SIZE, (g) => drawStoneSlab(g, STONE_TABLET_LARGE_SIZE));
  bake(scene, TEXTURES.roundStone, ROUND_STONE_SIZE, drawRoundStone);
  bake(scene, TEXTURES.lock, LOCK_SIZE, drawLock);
  bake(scene, TEXTURES.star, STAR_SIZE, drawStar);
  bake(scene, TEXTURES.epochStone, EPOCH_ICON_SIZE, drawEpochStone);
  bake(scene, TEXTURES.epochBronze, EPOCH_ICON_SIZE, drawEpochBronze);
  bake(scene, TEXTURES.epochMedieval, EPOCH_ICON_SIZE, drawEpochMedieval);
  bake(scene, TEXTURES.epochSteam, EPOCH_ICON_SIZE, drawEpochSteam);
  bake(scene, TEXTURES.epochPolar, EPOCH_ICON_SIZE, drawEpochPolar);
  bake(scene, TEXTURES.epochFuture, EPOCH_ICON_SIZE, drawEpochFuture);
  bake(scene, TEXTURES.tutorialArrow, TUTORIAL_ARROW_SIZE, drawTutorialArrow);
}

// Рисует картинку на временном Graphics и сохраняет её как текстуру под ключом key.
function bake(scene: Phaser.Scene, key: string, size: Size, draw: (g: Graphics) => void): void {
  // false — этот Graphics не добавляется на экран, он нужен только для рисования.
  const g = scene.make.graphics({}, false);
  draw(g);
  g.generateTexture(key, size.w, size.h);
  g.destroy();
}

// Ночная тьма со светлым пятном: середина прозрачная, к краю — плотная.
// Graphics не умеет плавный круговой переход прозрачности, поэтому эта картинка
// рисуется на обычном canvas радиальным градиентом браузера.
// За кругом градиента (в углах квадрата) цвет остаётся плотным — так картинка
// без шва стыкуется с тёмными прямоугольниками вокруг (NightOverlay.ts).
function bakeNightLight(scene: Phaser.Scene): void {
  const { w, h } = NIGHT_LIGHT_SIZE;
  const canvas = scene.textures.createCanvas(TEXTURES.nightLight, w, h);
  if (!canvas) return;

  const context = canvas.getContext();
  const radius = w / 2;
  const gradient = context.createRadialGradient(radius, radius, 0, radius, radius, radius);
  // До NIGHT_LIGHT_CLEAR радиуса — совсем светло, дальше тьма густеет до края круга.
  // Густеет по плавной S-кривой: сначала еле заметно, у края — мягко упирается в полную тьму.
  // Так у светлого пятна нет резкой «кромки».
  gradient.addColorStop(0, 'rgba(255, 255, 255, 0)');
  for (let i = 0; i <= GRADIENT_STEPS; i++) {
    const t = i / GRADIENT_STEPS;
    const stop = Phaser.Math.Linear(NIGHT_LIGHT_CLEAR, 1, t);
    gradient.addColorStop(stop, `rgba(255, 255, 255, ${Phaser.Math.SmoothStep(t, 0, 1)})`);
  }
  context.fillStyle = gradient;
  context.fillRect(0, 0, w, h);
  canvas.refresh();
}

// Плавное пятно света: в середине белое и плотное, к краю тает до нуля.
// Рисуется на canvas градиентом, как ночная тьма, — у Graphics круг вышел бы ступеньками.
// Тает по квадрату расстояния: свет быстро слабеет у огня и долго «тянется» к краю.
function bakeFireLight(scene: Phaser.Scene): void {
  const { w, h } = FIRE_LIGHT_SIZE;
  const canvas = scene.textures.createCanvas(TEXTURES.fireLight, w, h);
  if (!canvas) return;

  const context = canvas.getContext();
  const radius = w / 2;
  const gradient = context.createRadialGradient(radius, radius, 0, radius, radius, radius);
  for (let i = 0; i <= GRADIENT_STEPS; i++) {
    const t = i / GRADIENT_STEPS;
    gradient.addColorStop(t, `rgba(255, 255, 255, ${(1 - t) * (1 - t)})`);
  }
  context.fillStyle = gradient;
  context.fillRect(0, 0, w, h);
  canvas.refresh();
}

// Виньетка: середина прозрачная, к краям и углам плавно темнеет.
// Радиус градиента — до угла квадрата, поэтому темнее всего именно углы экрана.
function bakeVignette(scene: Phaser.Scene): void {
  const { w, h } = VIGNETTE_SIZE;
  const canvas = scene.textures.createCanvas(TEXTURES.vignette, w, h);
  if (!canvas) return;

  const context = canvas.getContext();
  const center = w / 2;
  const gradient = context.createRadialGradient(center, center, 0, center, center, Math.hypot(center, h / 2));
  gradient.addColorStop(0, 'rgba(255, 255, 255, 0)');
  for (let i = 0; i <= GRADIENT_STEPS; i++) {
    const t = i / GRADIENT_STEPS;
    const stop = Phaser.Math.Linear(VIGNETTE_CLEAR, 1, t);
    gradient.addColorStop(stop, `rgba(255, 255, 255, ${t * t})`);
  }
  context.fillStyle = gradient;
  context.fillRect(0, 0, w, h);
  canvas.refresh();
}

// Клуб дыма: три мягких круга внахлёст — пушистое облачко без обводки и без кромки.
// Рисуется на canvas: у мягких кругов из Graphics на тёмном фоне проступал край картинки.
// Белый — цвет и прозрачность задаёт эмиттер частиц (Campfire.ts).
function bakeSmoke(scene: Phaser.Scene): void {
  const { w, h } = SMOKE_SIZE;
  const canvas = scene.textures.createCanvas(TEXTURES.smoke, w, h);
  if (!canvas) return;

  const context = canvas.getContext();
  for (const blob of SMOKE_BLOBS) {
    const x = blob.x * w;
    const y = blob.y * h;
    const radius = blob.r * w;
    const gradient = context.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, `rgba(255, 255, 255, ${SMOKE_BLOB_ALPHA})`);
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    context.fillStyle = gradient;
    context.fillRect(0, 0, w, h);
  }
  canvas.refresh();
}

// ===== Земля и мелкий декор =====

// Плитка снега: ровный снег, мягкие голубые тени, светлые пятна, крупинки и блёстки.
function drawSnowTile(g: Graphics): void {
  const { w, h } = SNOW_TILE_SIZE;
  const rng = new Phaser.Math.RandomDataGenerator([SNOW_TILE_SEED]);

  g.fillStyle(COLORS.snow, 1);
  g.fillRect(0, 0, w, h);

  // Пятно не подходит к краю плитки ближе своего размера,
  // поэтому соседние плитки стыкуются без шва.
  for (let i = 0; i < SNOW_TILE_SHADES; i++) {
    const width = rng.between(110, 220);
    const height = width * 0.4;
    const x = rng.between(width / 2, w - width / 2);
    const y = rng.between(height / 2, h - height / 2);
    softEllipse(g, x, y, width, height, COLORS.snowShade, 0.07, 5);
  }

  // Светлые пятна — снег блестит.
  for (let i = 0; i < SNOW_TILE_LIGHTS; i++) {
    const width = rng.between(80, 160);
    const height = width * 0.45;
    const x = rng.between(width / 2, w - width / 2);
    const y = rng.between(height / 2, h - height / 2);
    softEllipse(g, x, y, width, height, COLORS.snowLight, 0.12, 4);
  }

  // Крупинки: через одну белая искорка и голубая точка.
  for (let i = 0; i < SNOW_TILE_SPECKS; i++) {
    const x = rng.between(2, w - 2);
    const y = rng.between(2, h - 2);
    const isSparkle = i % 2 === 0;
    g.fillStyle(isSparkle ? COLORS.snowLight : COLORS.snowDeep, isSparkle ? 1 : 0.35);
    g.fillCircle(x, y, isSparkle ? 1.6 : 1);
  }

  // Искорки-блёстки: маленькие белые крестики.
  const sparkles = 26;
  g.fillStyle(COLORS.white, 1);
  for (let i = 0; i < sparkles; i++) {
    const x = rng.between(4, w - 4);
    const y = rng.between(4, h - 4);
    g.fillRect(x - 2, y - 0.5, 4, 1);
    g.fillRect(x - 0.5, y - 2, 1, 4);
  }
}

// Пятно утоптанного снега: мягкое серо-голубое пятно.
function drawSnowPatch(g: Graphics): void {
  const { w, h } = SNOW_PATCH_SIZE;
  softEllipse(g, w / 2, h / 2, w, h, COLORS.snowTrodden, 0.16, 6);
  softEllipse(g, w / 2, h / 2 + 4, w * 0.6, h * 0.5, COLORS.snowShade, 0.12, 4);
}

// Сугроб: голубая тень у подножия, тело в тени снизу и светлое сверху, светлый гребень.
function drawSnowDrift(g: Graphics): void {
  const { w, h } = SNOW_DRIFT_SIZE;
  softEllipse(g, w / 2, h - 14, w, 26, COLORS.snowDeep, 0.1, 5);
  g.fillStyle(COLORS.snowShade, 1);
  g.fillEllipse(w / 2, h * 0.55, w * 0.86, h * 0.62);
  g.fillStyle(COLORS.snowLight, 1);
  g.fillEllipse(w / 2 - 4, h * 0.48, w * 0.74, h * 0.5);

  // Гребень сугроба: светлая дуга и мягкая тень полумесяцем.
  g.lineStyle(2, COLORS.white, 1);
  g.beginPath();
  g.arc(w / 2 - 4, h * 0.62, w * 0.34, Math.PI * 1.15, Math.PI * 1.75);
  g.strokePath();
  crescent(g, w / 2, h * 0.55, w * 0.42, h * 0.3, -6, -4, COLORS.snowShade, 0.8);
}

// Камешек: тёмный низ, светлый верх, снежная шапка и обводка.
function drawPebble(g: Graphics): void {
  const { w, h } = PEBBLE_SIZE;
  const cx = w / 2;
  const cy = h / 2 + 1;
  const width = w - 10;
  const height = h - 8;

  softEllipse(g, cx, h - 5, w - 2, 8, COLORS.shadow, 0.1, 4);
  g.fillStyle(COLORS.stoneDark, 1);
  g.fillEllipse(cx, cy, width, height);
  g.fillStyle(COLORS.stone, 1);
  g.fillEllipse(cx - 2, cy - 2, width - 6, height - 5);
  g.fillStyle(COLORS.snowLight, 1);
  g.fillEllipse(cx - 2, cy - height * 0.28, width * 0.6, height * 0.35);
  g.lineStyle(THIN_OUTLINE_WIDTH, COLORS.outline, 1);
  g.strokeEllipse(cx, cy, width, height);
}

// Пучок сухой травы: травинки веером и снежный холмик у основания.
function drawGrassTuft(g: Graphics): void {
  const { w, h } = GRASS_TUFT_SIZE;
  const baseY = h - 8;
  // Кончики травинок: x, y.
  const tips = [4, 9, 10, 2, 17, 7, 23, 0, 29, 5, 33, 13];

  for (let i = 0; i < tips.length / 2; i++) {
    const baseX = w / 2 - 7 + i * 2.5;
    g.fillStyle(i % 2 === 0 ? COLORS.grass : COLORS.grassDark, 1);
    g.fillTriangle(baseX - 2, baseY, baseX + 2, baseY, tips[i * 2], tips[i * 2 + 1]);
  }

  g.fillStyle(COLORS.snowShade, 1);
  g.fillEllipse(w / 2, baseY + 2, w - 6, 10);
  g.fillStyle(COLORS.snowLight, 1);
  g.fillEllipse(w / 2 - 2, baseY, w - 12, 7);
}

// ===== Лес по краю мира =====

// Заснеженная ель: ствол и четыре яруса хвои с иголками и снежными шапками.
function drawFir(g: Graphics): void {
  const { w, h } = FIR_SIZE;
  const cx = w / 2;

  // Ствол виден снизу, под нижним ярусом.
  g.fillStyle(COLORS.trunk, 1);
  g.fillRect(cx - 8, h - 32, 16, 30);
  g.lineStyle(OUTLINE_WIDTH, COLORS.outline, 1);
  g.strokeRect(cx - 8, h - 32, 16, 30);

  // Ярусы снизу вверх: низ яруса, его высота и половина ширины.
  drawFirTier(g, cx, h - 24, 70, 58);
  drawFirTier(g, cx, h - 62, 62, 46);
  drawFirTier(g, cx, h - 96, 54, 34);
  drawFirTier(g, cx, h - 128, 48, 22);

  // Иголки: короткие тёмные штрихи по нижнему краю ярусов (низ яруса, половина ширины).
  g.lineStyle(1.5, COLORS.firDark, 1);
  for (const [tierBottom, half] of [[h - 24, 58], [h - 62, 46], [h - 96, 34]]) {
    for (let x = cx - half + 10; x < cx + half - 6; x += 9) g.lineBetween(x, tierBottom - 2, x + 3, tierBottom - 8);
  }
  // Блёстки на снежных шапках.
  g.fillStyle(COLORS.white, 1);
  for (const [x, y] of [[cx - 6, 30], [cx - 10, 62], [cx - 14, 96]]) g.fillCircle(x, y, 1.4);
}

// Один ярус ели: треугольник хвои (правая половина в тени) и снежная шапка.
function drawFirTier(g: Graphics, cx: number, bottom: number, height: number, halfWidth: number): void {
  const top = bottom - height;
  const left = cx - halfWidth;
  const right = cx + halfWidth;

  // Хвоя: светлая левая половина и тёмная правая — ярус выглядит объёмным.
  g.fillStyle(COLORS.fir, 1);
  g.fillTriangle(cx, top, left, bottom, right, bottom);
  g.fillStyle(COLORS.firDark, 1);
  g.fillTriangle(cx, top, cx, bottom, right, bottom);

  // Снежная шапка на верхней половине яруса, правая часть в голубой тени.
  const capBottom = top + height * 0.5;
  const capHalf = halfWidth * 0.5;
  g.fillStyle(COLORS.snowLight, 1);
  g.fillTriangle(cx, top, cx - capHalf, capBottom, cx + capHalf, capBottom);
  g.fillStyle(COLORS.snowShade, 1);
  g.fillTriangle(cx, top, cx, capBottom, cx + capHalf, capBottom);

  // Снег свисает «каплями» по нижнему краю шапки.
  const dropCount = 3;
  const dropRadius = capHalf / dropCount;
  for (let i = 0; i < dropCount; i++) {
    const x = cx - capHalf + dropRadius + i * 2 * dropRadius;
    g.fillStyle(x < cx ? COLORS.snowLight : COLORS.snowShade, 1);
    g.fillCircle(x, capBottom, dropRadius);
  }

  // Снег на концах нижних веток.
  g.fillStyle(COLORS.snowLight, 1);
  g.fillEllipse(left + 8, bottom - 2, 18, 6);
  g.fillStyle(COLORS.snowShade, 1);
  g.fillEllipse(right - 8, bottom - 2, 18, 6);

  g.lineStyle(OUTLINE_WIDTH, COLORS.outline, 1);
  g.strokeTriangle(cx, top, left, bottom, right, bottom);
}

// Скала: камень с тёмной и светлой гранями и трещинами, сверху снежная шапка.
function drawRock(g: Graphics): void {
  const body = [10, 76, 4, 50, 16, 26, 40, 10, 66, 8, 86, 22, 96, 48, 90, 76];
  const darkSide = [66, 8, 86, 22, 96, 48, 90, 76, 58, 76, 62, 40];
  const lightSide = [16, 26, 40, 10, 52, 30, 30, 46, 6, 50];
  const snowCap = [14, 30, 38, 11, 66, 9, 85, 22, 78, 30, 64, 25, 50, 32, 34, 34, 20, 38];
  const snowCapShade = [66, 9, 85, 22, 78, 30, 64, 25];

  fillPolygon(g, body, COLORS.stone);
  fillPolygon(g, darkSide, COLORS.stoneDark);
  fillPolygon(g, lightSide, COLORS.stoneLight);
  fillPolygon(g, snowCap, COLORS.snowLight);
  fillPolygon(g, snowCapShade, COLORS.snowShade);
  strokePolygon(g, body);

  // Трещины на камне и блёстка на снегу.
  g.lineStyle(1.6, COLORS.stoneDark, 1);
  g.strokePoints(toPoints([30, 50, 38, 58, 34, 68]), false);
  g.strokePoints(toPoints([70, 44, 64, 54]), false);
  g.fillStyle(COLORS.white, 1);
  g.fillCircle(40, 18, 1.5);
}

// ===== Общие картинки =====

// Мягкая тень: тёмно-синий эллипс, прозрачный к краям.
function drawShadow(g: Graphics): void {
  const { w, h } = SHADOW_SIZE;
  softEllipse(g, w / 2, h / 2, w, h, COLORS.shadow, 0.08, 8);
}

// ===== Вождь =====

// Вождь — весёлый пещерный человек, почти анфас, чуть повёрнут вправо.
// Свет падает слева сверху: справа и снизу — тени, слева и сверху — блики.
// Ноги, обе руки и дубина с кулаком — отдельные картинки,
// чтобы ноги шагали, рука махала, а рука с дубиной била от плеча.
//
// Вождь нарисован в своих координатах: ноги внизу по центру в точке (60, 138).
// translateCanvas сдвигает весь рисунок так, чтобы растрёпанная грива
// не вылезала за верх картинки, а ноги стояли на её нижнем крае.
function drawPlayer(g: Graphics): void {
  g.save();
  g.translateCanvas(PLAYER_SIZE.w / 2 - 60, PLAYER_SIZE.h - 140);
  drawPlayerBody(g);
  drawPlayerHead(g);
  g.restore();
}

// Нога в меховом сапоге с пушистым отворотом. Бедро — сверху по центру картинки,
// вокруг него нога качается при ходьбе.
function drawLeg(g: Graphics): void {
  const cx = LEG_SIZE.w / 2;
  g.lineStyle(OUTLINE_WIDTH, COLORS.outline, 1);
  g.fillStyle(COLORS.skin, 1);
  g.fillRoundedRect(cx - 5.5, 2, 11, 20, 4);
  g.strokeRoundedRect(cx - 5.5, 2, 11, 20, 4);
  // Тень на правой стороне ноги.
  g.fillStyle(COLORS.skinShade, 1);
  g.fillRect(cx + 1, 4, 3, 16);

  // Сапог: тёмный мех и блик сверху.
  outlinedEllipse(g, cx, 26, 21, 12, COLORS.furDark);
  g.fillStyle(COLORS.fur, 1);
  g.fillEllipse(cx - 3, 24, 9, 4);
  // Пушистый отворот.
  outlinedBlobs(g, [cx - 6, 19, 3.5, cx, 18, 4, cx + 6, 19, 3.5], COLORS.furLight);
}

// ===== Руки =====

// Свободная рука: плечо сверху по центру (вокруг него рука качается),
// чуть согнутый локоть, кожаная обмотка на запястье и открытая ладонь.
function drawArm(g: Graphics): void {
  const cx = ARM_SIZE.w / 2;
  drawArmLimb(g, [cx, 11, 5.6, cx - 2.5, 23, 4.9, cx - 0.5, 31, 4.2]);
  drawOpenHand(g, cx - 0.5, 32);
  drawWristBand(g, cx - 0.5, 31.5, 5.2);
}

// Рука с оружием: плечо сверху (вокруг него рука бьёт), запястье с обмоткой внизу.
// Кулак — на картинке оружия: он ложится поверх запястья (см. Player.ts).
function drawClubArm(g: Graphics): void {
  const cx = CLUB_ARM_SIZE.w / 2;
  drawArmLimb(g, [cx, 8, 5.8, cx - 1, 19, 5, cx, 29, 4.3]);
  drawWristBand(g, cx, 28.5, 4.8);
}

// Рука по суставам [x, y, радиус, …] (плечо, локоть, запястье): к запястью тоньше.
// Три слоя: обводка чуть шире, тень, и поверх — кожа, сдвинутая влево и чуть уже,
// поэтому по правому краю руки остаётся полоска тени. Плюс блик на плече.
function drawArmLimb(g: Graphics, joints: number[]): void {
  const layer = (color: number, grow: number, dx: number): void => {
    g.fillStyle(color, 1);
    for (let i = 0; i < joints.length; i += 3) {
      g.fillCircle(joints[i] + dx, joints[i + 1], joints[i + 2] + grow);
      if (i + 5 < joints.length) {
        g.lineStyle(2 * (Math.min(joints[i + 2], joints[i + 5]) + grow), color, 1);
        g.lineBetween(joints[i] + dx, joints[i + 1], joints[i + 3] + dx, joints[i + 4]);
      }
    }
  };
  layer(COLORS.outline, OUTLINE_WIDTH, 0);
  layer(COLORS.skinShade, 0, 0);
  layer(COLORS.skin, -1.8, -1.6);
  g.fillStyle(COLORS.white, 0.4);
  g.fillEllipse(joints[0] - 2, joints[1] - 1.5, 4.5, 3.5);
}

// Кожаная обмотка поперёк запястья в точке (x, y), с бликом.
function drawWristBand(g: Graphics, x: number, y: number, halfWidth: number): void {
  g.lineStyle(5.2, COLORS.outline, 1);
  g.lineBetween(x - halfWidth, y, x + halfWidth, y - 0.5);
  g.lineStyle(3, COLORS.leather, 1);
  g.lineBetween(x - halfWidth, y, x + halfWidth, y - 0.5);
  g.lineStyle(1, COLORS.leatherLight, 1);
  g.lineBetween(x - halfWidth + 0.5, y - 0.8, x + halfWidth - 0.5, y - 1.3);
}

// Открытая ладонь: висит вниз, пальцы вместе и чуть согнуты вперёд,
// большой палец расслаблен и лежит рядом. Запястье — в точке (x, y).
function drawOpenHand(g: Graphics, x: number, y: number): void {
  g.save();
  g.translateCanvas(x, y);
  const shape = smoothShape(OPEN_HAND_OUTLINE);
  g.fillStyle(COLORS.skin, 1);
  g.fillPoints(shape, true);
  // Тень на краю ладони и под пальцами, блик на тыльной стороне.
  crescent(g, 0, 7, 5, 7.4, -1.8, -1, COLORS.skinShade);
  g.fillStyle(COLORS.white, 0.3);
  g.fillEllipse(-2.4, 4.5, 2.4, 5);
  // Две линии между пальцами от кончиков вверх и складка у большого пальца.
  smoothLine(g, [-1.4, 14, -1.3, 11.4, -0.9, 9.2], 1.2, COLORS.outline, 0.8);
  smoothLine(g, [1.8, 14, 1.9, 11.4, 2.2, 9.4], 1.2, COLORS.outline, 0.8);
  smoothLine(g, [4.8, 9, 4.2, 6.6, 3.4, 4], 1.1, COLORS.skinShade);
  g.lineStyle(HAND_OUTLINE_WIDTH, COLORS.outline, 1);
  g.strokePoints(shape, true, true);
  // Ноготь на большом пальце.
  g.fillStyle(COLORS.nail, 1);
  g.fillEllipse(6.3, 9, 1.8, 1.8);
  g.restore();
}

// ===== Кулак на рукояти =====

// Кулак виден с тыльной стороны. В своих координатах (FIST_OUTLINE) тыльная сторона
// ладони слева, а четыре пальца со складками — справа; на оружии он рисуется
// зеркально: пальцы обхватывают рукоять с другой стороны. Большой палец спрятан
// за рукоятью. Кулак почти круглый — при любом наклоне оружия он выглядит одинаково.
// (x, y) — центр кулака, вокруг него оружие вращается.

// Ладонь за рукоятью. У оружия она рисуется до рукояти, поэтому рукоять
// лежит в ладони, а пальцы (drawFistFront) потом обхватывают её спереди.
function drawFistBack(g: Graphics, x: number, y: number): void {
  inMirror(g, x, y, () => {
    const shape = smoothShape(FIST_OUTLINE);
    g.fillStyle(COLORS.skinShade, 1);
    g.fillPoints(shape, true);
    g.lineStyle(HAND_OUTLINE_WIDTH, COLORS.outline, 1);
    g.strokePoints(shape, true, true);
  });
}

// Пальцы поверх рукояти: тень снизу, блик на тыльной стороне, складки между
// пальцами и светлые костяшки.
function drawFistFront(g: Graphics, x: number, y: number): void {
  inMirror(g, x, y, () => {
    const shape = smoothShape(FIST_OUTLINE);
    g.fillStyle(COLORS.skin, 1);
    g.fillPoints(shape, true);
    crescent(g, 0, 0, 8, 8.2, -1.6, -2.6, COLORS.skinShade);
    g.fillStyle(COLORS.white, 0.3);
    g.fillEllipse(-4, 0, 3.2, 7);
    for (const dy of FIST_CREASES) smoothLine(g, [8, dy, 4.6, dy - 0.5, 1.2, dy + 0.6], 1.3, COLORS.outline, 0.8);
    // Блик на каждом пальце — посередине между складками.
    const edges = [-7.6, ...FIST_CREASES, 7.8];
    g.fillStyle(COLORS.white, 0.45);
    for (let i = 0; i < edges.length - 1; i++) g.fillEllipse(5.6, (edges[i] + edges[i + 1]) / 2 - 0.6, 2.4, 1.1);
    g.lineStyle(HAND_OUTLINE_WIDTH, COLORS.outline, 1);
    g.strokePoints(shape, true, true);
  });
}

// Нарисовать fn в точке (x, y) зеркально (слева направо).
function inMirror(g: Graphics, x: number, y: number, fn: () => void): void {
  g.save();
  g.translateCanvas(x, y);
  g.scaleCanvas(-1, 1);
  fn();
  g.restore();
}

// ===== Тело и голова =====

// Туловище, большая леопардовая шкура через плечо, пояс из верёвки.
// Левое плечо — меховое, под ремнём шкуры. Обе руки — отдельные картинки.
function drawPlayerBody(g: Graphics): void {
  // Туловище — широкое в плечах.
  outlinedEllipse(g, 60, 96, 60, 46, COLORS.skin);

  // Шкура через левое плечо: шире тела, закрывает грудь и бёдра, внизу рваный подол.
  const pelt = [
    31, 90, 36, 80, 44, 75, 52, 79, 62, 85, 72, 90, 80, 94, 85, 104, 85, 112, 81, 120, 77, 113, 72, 121,
    67, 114, 61, 122, 55, 115, 49, 120, 44, 113, 39, 119, 34, 112, 31, 104,
  ];
  fillPolygon(g, pelt, COLORS.fur);
  // Тень на правой стороне шкуры.
  fillPolygon(g, [70, 90, 80, 94, 85, 104, 85, 112, 81, 120, 77, 113, 72, 121, 71, 108], COLORS.furShade);
  // Светлая кромка у плеча.
  g.lineStyle(4, COLORS.furLight, 1);
  g.lineBetween(36, 81, 44, 76);
  g.lineBetween(44, 76, 52, 80);
  // Леопардовые пятна: каждое — два круга внахлёст, поэтому форма неровная.
  g.fillStyle(COLORS.furSpot, 1);
  const spots = [40, 95, 4, 55, 101, 3.5, 68, 99, 4, 46, 110, 3, 62, 112, 3.5, 77, 106, 3, 37, 105, 2.5, 50, 88, 2.5];
  for (let i = 0; i < spots.length; i += 3) {
    g.fillCircle(spots[i], spots[i + 1], spots[i + 2]);
    g.fillCircle(spots[i] + spots[i + 2] * 0.7, spots[i + 1] + 1, spots[i + 2] * 0.7);
  }
  strokePolygon(g, pelt);

  // Пояс из верёвки: узел и два свисающих конца.
  limb(g, 32, 106, 84, 106, 3, COLORS.rope);
  limb(g, 57, 108, 54, 117, 2.5, COLORS.rope);
  limb(g, 61, 108, 63, 116, 2.5, COLORS.rope);
  outlinedCircle(g, 59, 107, 3.5, COLORS.rope);

  // Левое плечо под ремнём шкуры — меховое. Правое плечо — на картинке руки с оружием.
  outlinedCircle(g, 30, 86, 8, COLORS.fur);
  g.fillStyle(COLORS.furLight, 1);
  g.fillEllipse(28, 82, 7, 4);
}

// Голова почти анфас: растрёпанная грива больше головы, лохматые брови,
// большие весёлые глаза, нос картошкой, широкая улыбка в лохматой бороде.
function drawPlayerHead(g: Graphics): void {
  drawPlayerHair(g);

  // Уши выглядывают по бокам.
  drawPlayerEar(g, 36, 6);
  drawPlayerEar(g, 88, 5.5);

  // Голова: тень справа и под чёлкой, блик на лбу.
  outlinedEllipse(g, 62, 56, 52, 54, COLORS.skin);
  crescent(g, 62, 56, 24.5, 25.5, -5, -1, COLORS.skinShade, 0.75);
  crescent(g, 62, 56, 24.5, 25.5, 0, 5, COLORS.skinShade, 0.35);
  g.fillStyle(COLORS.white, 0.3);
  g.fillEllipse(53, 47, 12, 4);

  // Чёлка: «шапка» волос на макушке и пряди, свисающие на лоб вразнобой.
  // Обводку рисуем только у прядей — сначала их тёмный контур, потом шапку и сами пряди.
  g.fillStyle(COLORS.outline, 1);
  for (const lock of FRINGE_LOCKS) fillLock(g, lock, OUTLINE_WIDTH);
  g.fillStyle(COLORS.hair, 1);
  g.fillEllipse(62, 30, 50, 16);
  for (const lock of FRINGE_LOCKS) fillLock(g, lock, 0);
  drawLocks(g, [[52, 28, 100, 8, 2, 10], [68, 28, 75, 8, 2, -10]], COLORS.hairLight);
  drawLocks(g, [[46, 30, 120, 6, 1.5, 15]], COLORS.hairShine);

  // Большие весёлые глаза и лохматые брови дугой со светлыми прядками.
  drawPlayerEye(g, 54, 54, 13, 15);
  drawPlayerEye(g, 71, 54, 12, 14);
  outlinedBlobs(g, [47, 46, 2.2, 51, 43.5, 2.6, 55.5, 43, 2.6, 59, 44.5, 2], COLORS.hair);
  outlinedBlobs(g, [66, 44.5, 2, 69.5, 43, 2.6, 74, 43.5, 2.6, 78, 46, 2.2], COLORS.hair);
  g.fillStyle(COLORS.hairLight, 1);
  for (const [x, y] of [[50.5, 42.6], [55, 42], [69, 42], [73.5, 42.6]]) g.fillEllipse(x, y, 3, 1.3);

  // Мягкий румянец.
  softEllipse(g, 47, 66.5, 12, 8, COLORS.cheek, 0.22, 4);
  softEllipse(g, 78, 66.5, 11, 7.5, COLORS.cheek, 0.22, 4);

  drawPlayerBeard(g);
  drawPlayerNose(g);
}

// Грива: середина из кругов и пряди во все стороны с общей обводкой.
// Глубокая тень внизу справа, тёмные пряди в тени, светлые и блестящие — на свету.
function drawPlayerHair(g: Graphics): void {
  drawShaggyMass(g, HAIR_BLOBS, hairLocks(), COLORS.hair);
  crescent(g, 62, 42, 25, 25, -5, -7, COLORS.hairShade, 0.85);
  crescent(g, 79, 54, 14, 14, -4, -4, COLORS.hairShade, 0.85);
  drawLocks(g, locksAround(62, 42, 20, [300, 18, 3, 30, 322, 15, 3, 30, 345, 13, 2.6, 30, 8, 10, 2.4, 25]), COLORS.hairShade);
  drawLocks(g, hairLightLocks(), COLORS.hairLight);
  drawLocks(g, locksAround(62, 42, 18, [180, 10, 3, -25, 222, 13, 3, -25, 252, 15, 3, -25, 284, 14, 3, 20]), COLORS.hairLight);
  drawLocks(g, locksAround(62, 42, 15, [212, 11, 2.2, -25, 240, 14, 2.4, -30, 270, 13, 2.2, -20]), COLORS.hairShine);
}

// Ухо с тенью и завитком внутри.
function drawPlayerEar(g: Graphics, x: number, radius: number): void {
  outlinedCircle(g, x, 60, radius, COLORS.skin);
  g.fillStyle(COLORS.skinShade, 1);
  g.fillCircle(x, 60.5, radius * 0.5);
  g.lineStyle(1.2, COLORS.noseShade, 1);
  g.beginPath();
  g.arc(x, 60, radius * 0.55, Math.PI * 0.9, Math.PI * 1.7);
  g.strokePath();
}

// Глаз вождя: белок с тенью от века, карая радужка с тёмным ободком и светлым низом,
// зрачок смотрит чуть вправо, два блика.
function drawPlayerEye(g: Graphics, x: number, y: number, width: number, height: number): void {
  g.fillStyle(COLORS.eye, 1);
  g.fillEllipse(x, y, width, height);
  crescent(g, x, y, width / 2, height / 2, 0, 2.6, COLORS.eyeShade);
  const irisRadius = width * 0.34;
  g.fillStyle(COLORS.iris, 1);
  g.fillCircle(x + 1.5, y + 0.8, irisRadius);
  crescent(g, x + 1.5, y + 0.8, irisRadius, irisRadius, 0, -1.6, COLORS.irisLight);
  g.lineStyle(1, COLORS.irisRim, 1);
  g.strokeCircle(x + 1.5, y + 0.8, irisRadius);
  g.fillStyle(COLORS.outline, 1);
  g.fillCircle(x + 1.8, y + 0.8, width * 0.16);
  g.fillStyle(COLORS.white, 1);
  g.fillCircle(x + 3.2, y - 1.6, width * 0.13);
  g.fillCircle(x - 0.2, y + 2.8, width * 0.06);
  g.lineStyle(THIN_OUTLINE_WIDTH, COLORS.outline, 1);
  g.strokeEllipse(x, y, width, height);
}

// Лохматая борода с тенью снизу справа, широкая улыбка внутри неё и пышные усы.
function drawPlayerBeard(g: Graphics): void {
  drawShaggyMass(g, BEARD_BLOBS, beardLocks(), COLORS.hair);
  crescent(g, 63, 86, 15, 12, -4, -5, COLORS.hairShade, 0.75);
  // Светлые и блестящие пряди.
  drawLocks(g, [[52, 84, 100, 9, 2, 15], [63, 89, 90, 10, 2, -10], [74, 84, 80, 9, 2, -15]], COLORS.hairLight);
  drawLocks(g, [[48, 78, 120, 7, 1.6, 15], [57, 88, 100, 7, 1.6, 10]], COLORS.hairShine);

  // Широкая улыбка: тёмный рот, ряд верхних зубов и язык с бликом.
  g.fillStyle(COLORS.outline, 1);
  g.fillEllipse(63, 81, 20, 13);
  g.fillStyle(COLORS.eye, 1);
  g.fillRoundedRect(55, 76, 16, 4.5, 2);
  g.fillStyle(COLORS.tongue, 1);
  g.fillEllipse(63, 85, 11, 4.5);
  g.fillStyle(COLORS.white, 0.35);
  g.fillEllipse(61, 84.3, 4, 1.4);

  // Пышные усы двумя крыльями, концы загнуты вниз; тень под усами.
  drawShaggyMass(g, [57, 70, 5.5, 51, 72, 4.5, 47, 75, 3.5, 69, 70, 5.5, 75, 72, 4.5, 79, 75, 3.5], [], COLORS.hair);
  g.fillStyle(COLORS.hairShade, 0.8);
  g.fillEllipse(53, 74.5, 10, 3);
  g.fillEllipse(73, 74.5, 10, 3);
  drawLocks(g, [[54, 69, 170, 6, 1.8, 0], [72, 69, 10, 6, 1.8, 0]], COLORS.hairLight);
}

// Нос картошкой: небольшой овальный (шире, чем выше), чуть красный,
// с тенью снизу справа, ноздрями-крылышками по бокам и бликом.
function drawPlayerNose(g: Graphics): void {
  outlinedEllipse(g, 63, 65, 13, 10.5, COLORS.nose);
  crescent(g, 63, 65, 5, 3.7, -1.5, -1.5, COLORS.noseShade);
  // Крылышки ноздрей — короткие дуги внизу по бокам.
  g.lineStyle(1.5, COLORS.noseShade, 1);
  g.beginPath();
  g.arc(59.5, 66.5, 2.5, Math.PI * 0.5, Math.PI * 1.2);
  g.strokePath();
  g.beginPath();
  g.arc(66.5, 66.5, 2.5, -Math.PI * 0.2, Math.PI * 0.5);
  g.strokePath();
  g.fillStyle(COLORS.white, 0.7);
  g.fillCircle(60.5, 62.5, 1.8);
}

// Большой круглый глаз: белок, карий зрачок смотрит чуть вправо, блик.
function drawRoundEye(g: Graphics, x: number, y: number, width: number, height: number): void {
  g.fillStyle(COLORS.eye, 1);
  g.fillEllipse(x, y, width, height);
  g.lineStyle(THIN_OUTLINE_WIDTH, COLORS.outline, 1);
  g.strokeEllipse(x, y, width, height);
  g.fillStyle(COLORS.iris, 1);
  g.fillCircle(x + 1.5, y + 0.5, width * 0.32);
  g.fillStyle(COLORS.outline, 1);
  g.fillCircle(x + 1.8, y + 0.5, width * 0.16);
  g.fillStyle(COLORS.eye, 1);
  g.fillCircle(x + 3, y - 1.5, width * 0.12);
}

// ===== Лохматые волосы и борода =====

// Прядь: [x основания, y основания, угол в градусах (0 — вправо, 90 — вниз), длина, полуширина, изгиб в градусах].
// Изгиб поворачивает кончик пряди — так она похожа на язычок пламени, а не на шип.
type Lock = [number, number, number, number, number, number];

// Середина гривы — круги x, y, радиус (за головой).
const HAIR_BLOBS = [62, 42, 26, 45, 54, 15, 79, 54, 15];
// Пряди гривы: угол, длина, полуширина, изгиб. Длины и изгибы разные —
// поэтому грива растрёпанная: левые пряди загибаются влево, правые — вправо.
const HAIR_LOCK_SHAPES = [
  168, 14, 8, -25, 190, 20, 9, -30, 212, 17, 9, -20, 232, 24, 10, -35, 250, 18, 9, -15, 266, 26, 10, -25,
  282, 20, 9, 20, 298, 27, 10, 30, 316, 19, 9, 25, 334, 23, 9, 35, 352, 17, 8, 30, 12, 13, 8, 25,
];
// Чёлка: пряди свисают на лоб вразнобой.
const FRINGE_LOCKS: Lock[] = [
  [42, 36, 120, 10, 6, 20],
  [50, 32, 100, 10, 6, 15],
  [59, 31, 85, 7, 5, -10],
  [67, 31, 78, 10, 6, -20],
  [76, 33, 60, 9, 6, -15],
  [83, 37, 45, 8, 5, -10],
];
// Середина бороды — круги x, y, радиус.
const BEARD_BLOBS = [46, 72, 8, 53, 82, 10, 63, 87, 12, 73, 82, 10, 80, 72, 8, 63, 78, 11];
// Пряди бороды вниз и в стороны: угол, длина, полуширина, изгиб.
const BEARD_LOCK_SHAPES = [
  15, 7, 5, 20, 40, 9, 6, 25, 62, 10, 6, 20, 80, 12, 6, 10, 98, 12, 6, -10, 117, 10, 6, -20, 140, 9, 6, -25, 165, 7, 5, -20,
];

// Пряди гривы расходятся лучами из середины головы.
function hairLocks(): Lock[] {
  return locksAround(62, 42, 22, HAIR_LOCK_SHAPES);
}

// Светлые пряди — короче и тоньше, только сверху и слева, где падает свет.
function hairLightLocks(): Lock[] {
  return locksAround(62, 42, 18, [205, 14, 4, -20, 235, 17, 4, -30, 268, 19, 4, -20, 296, 17, 4, 25]);
}

// Пряди бороды расходятся вниз из середины бороды.
function beardLocks(): Lock[] {
  return locksAround(63, 82, 11, BEARD_LOCK_SHAPES);
}

// Делает пряди, которые растут лучами из точки (cx, cy), начинаясь на расстоянии radius.
// shapes — список [угол, длина, полуширина, изгиб, …].
function locksAround(cx: number, cy: number, radius: number, shapes: number[]): Lock[] {
  const locks: Lock[] = [];
  for (let i = 0; i < shapes.length; i += 4) {
    const angle = Phaser.Math.DegToRad(shapes[i]);
    locks.push([
      cx + Math.cos(angle) * radius,
      cy + Math.sin(angle) * radius,
      shapes[i],
      shapes[i + 1],
      shapes[i + 2],
      shapes[i + 3],
    ]);
  }
  return locks;
}

// Лохматая масса (грива, борода, усы): круги-середина и пряди с одной общей обводкой.
// Как в outlinedBlobs: сначала всё цветом обводки чуть больше, потом поверх — нужным цветом.
function drawShaggyMass(g: Graphics, blobs: number[], locks: Lock[], color: number): void {
  g.fillStyle(COLORS.outline, 1);
  for (let i = 0; i < blobs.length; i += 3) g.fillCircle(blobs[i], blobs[i + 1], blobs[i + 2] + OUTLINE_WIDTH);
  for (const lock of locks) fillLock(g, lock, OUTLINE_WIDTH);
  g.fillStyle(color, 1);
  for (let i = 0; i < blobs.length; i += 3) g.fillCircle(blobs[i], blobs[i + 1], blobs[i + 2]);
  for (const lock of locks) fillLock(g, lock, 0);
}

// Пряди одним цветом без обводки (светлые пряди поверх массы).
function drawLocks(g: Graphics, locks: Lock[], color: number): void {
  g.fillStyle(color, 1);
  for (const lock of locks) fillLock(g, lock, 0);
}

// Одна прядь — изогнутый язычок: широкое основание, середина чуть сдвинута в сторону изгиба,
// острый кончик. grow делает прядь шире и длиннее — так рисуется её обводка.
function fillLock(g: Graphics, lock: Lock, grow: number): void {
  const [x, y, degrees, length, halfWidth, bend] = lock;
  const angle = Phaser.Math.DegToRad(degrees);
  const tipAngle = Phaser.Math.DegToRad(degrees + bend);
  const width = halfWidth + grow;
  const fullLength = length + grow * 1.5;
  // Направление пряди и поперёк неё.
  const dirX = Math.cos(angle);
  const dirY = Math.sin(angle);
  const sideX = -dirY;
  const sideY = dirX;
  // Основание чуть утоплено назад, чтобы пряди срастались с серединой гривы.
  const baseX = x - dirX * (grow + 2);
  const baseY = y - dirY * (grow + 2);
  // Середина пряди: на половине длины, повёрнута на половину изгиба.
  const midAngle = Phaser.Math.DegToRad(degrees + bend / 2);
  const midX = x + Math.cos(midAngle) * fullLength * 0.5;
  const midY = y + Math.sin(midAngle) * fullLength * 0.5;
  const tipX = x + Math.cos(tipAngle) * fullLength;
  const tipY = y + Math.sin(tipAngle) * fullLength;

  g.fillPoints(
    toPoints([
      baseX + sideX * width, baseY + sideY * width,
      midX + sideX * width * 0.6, midY + sideY * width * 0.6,
      tipX, tipY,
      midX - sideX * width * 0.6, midY - sideY * width * 0.6,
      baseX - sideX * width, baseY - sideY * width,
    ]),
    true,
  );
}

// ===== Оружие: каменная булава, двусторонний топор, кремнёвое копьё =====

// Центр кулака — на WEAPON_GRIP_FROM_BOTTOM пикселей выше нижнего края картинки:
// вокруг него оружие и вращается. Ладонь рисуется до рукояти, пальцы — после всего.
// withFist — с кулаком (в руке вождя) или без (иконка на точке покупки).

// Каменная булава: деревянная рукоять, сверху примотан круглый валун.
function drawClub(g: Graphics): void {
  const { w, h } = CLUB_SIZE;
  const cx = w / 2;
  drawFistBack(g, cx, h - WEAPON_GRIP_FROM_BOTTOM);
  drawWoodHandle(g, cx, h, 30, 7);
  // Валун: тень справа снизу, светлая грань слева сверху, сколы.
  outlinedEllipse(g, cx, 21, 31, 27, COLORS.stone);
  crescent(g, cx, 21, 14, 12, -4, -3, COLORS.stoneDark);
  g.fillStyle(COLORS.stoneLight, 1);
  g.fillEllipse(cx - 6, 13, 9, 5);
  g.lineStyle(1.4, COLORS.stoneDark, 1);
  g.strokePoints(toPoints([cx - 9, 22, cx - 4, 25, cx - 5, 30]), false);
  g.strokePoints(toPoints([cx + 5, 12, cx + 8, 17]), false);
  // Ремни крест-накрест держат валун.
  limb(g, cx - 13, 16, cx + 12, 31, 3.4, COLORS.leather);
  limb(g, cx + 13, 16, cx - 12, 31, 3.4, COLORS.leather);
  drawHandleWrap(g, cx, h - 30, 5.5);
  drawFistFront(g, cx, h - WEAPON_GRIP_FROM_BOTTOM);
}

// Двусторонний каменный топор: лезвия по обе стороны рукояти, в середине — обух,
// крест-накрест примотанный ремнём.
function drawAxe(g: Graphics, withFist: boolean): void {
  const { w, h } = AXE_SIZE;
  const cx = w / 2;
  if (withFist) drawFistBack(g, cx, h - WEAPON_GRIP_FROM_BOTTOM);
  drawWoodHandle(g, cx, h, 8, 8);
  for (const side of [-1, 1]) {
    // m — зеркалит лезвие на другую сторону рукояти.
    const m = (x: number): number => cx + side * x;
    const blade = [m(4), 18, m(14), 12, m(26), 4, m(34), 9, m(37), 26, m(34), 43, m(26), 48, m(14), 40, m(4), 34];
    fillPolygon(g, blade, COLORS.stone);
    // Свет на верхней грани, тень на нижней, заточенная кромка.
    fillPolygon(g, [m(14), 12, m(26), 4, m(34), 9, m(30), 14, m(16), 18], COLORS.stoneLight);
    fillPolygon(g, [m(14), 36, m(26), 40, m(33), 38, m(34), 43, m(26), 48, m(14), 40], COLORS.stoneDark);
    g.lineStyle(2.6, COLORS.snowLight, 0.95);
    g.strokePoints(toPoints([m(34.5), 11, m(36.5), 26, m(34.5), 41]), false);
    strokePolygon(g, blade);
  }
  outlinedEllipse(g, cx, 26, 12, 22, COLORS.stoneDark);
  for (const [y1, y2] of [[16, 36], [36, 16]]) limb(g, cx - 6, y1, cx + 6, y2, 4, COLORS.leather);
  if (withFist) drawFistFront(g, cx, h - WEAPON_GRIP_FROM_BOTTOM);
}

// Копьё: древко, широкий кремнёвый лист со сколами-гранями, меховой воротник
// и два красных пера под наконечником.
function drawSpear(g: Graphics, withFist: boolean): void {
  const { w, h } = SPEAR_SIZE;
  const cx = w / 2;
  if (withFist) drawFistBack(g, cx, h - WEAPON_GRIP_FROM_BOTTOM);
  drawWoodHandle(g, cx, h, 46, 6);
  drawFeather(g, cx - 4, 54, -0.6, COLORS.feather);
  drawFeather(g, cx + 4, 55, 0.6, COLORS.feather);
  const leaf = [cx, 2, cx + 11, 18, cx + 12, 32, cx + 6, 44, cx, 48, cx - 6, 44, cx - 12, 32, cx - 11, 18];
  fillPolygon(g, leaf, COLORS.stoneDark);
  for (const facet of [
    [cx, 5, cx + 9, 18, cx + 3, 22],
    [cx + 3, 22, cx + 11, 30, cx + 5, 38],
    [cx, 5, cx - 9, 18, cx - 3, 24],
    [cx - 3, 24, cx - 11, 32, cx - 4, 38],
  ]) {
    fillPolygon(g, facet, COLORS.stone);
  }
  g.lineStyle(1.4, COLORS.stoneLight, 1);
  g.lineBetween(cx, 6, cx, 44);
  strokePolygon(g, leaf);
  outlinedBlobs(g, [cx - 5, 50, 3.6, cx, 51, 4, cx + 5, 50, 3.6], COLORS.furLight);
  if (withFist) drawFistFront(g, cx, h - WEAPON_GRIP_FROM_BOTTOM);
}

// Деревянная рукоять от низа картинки (h) до top: чуть изогнута, с бликом и торцом под кулаком.
function drawWoodHandle(g: Graphics, cx: number, h: number, top: number, width: number): void {
  outlinedEllipse(g, cx, h - 4, width + 2, 5, COLORS.woodDark);
  limbChain(g, [cx, h - 6, cx - 1.2, (h + top) / 2, cx, top], width, COLORS.wood);
  g.lineStyle(1.6, COLORS.woodLight, 1);
  g.lineBetween(cx - width / 2 + 1.5, h - 16, cx - width / 2 + 1.5, top + 8);
}

// Кожаная обмотка рукояти над кулаком: три косые полоски, первая на высоте y.
function drawHandleWrap(g: Graphics, cx: number, y: number, half: number): void {
  for (let k = 0; k < 3; k++) {
    const top = y + k * 5;
    const band = [cx - half, top + 2, cx + half, top - 1, cx + half, top + 2, cx - half, top + 5];
    fillPolygon(g, band, COLORS.leather);
    g.lineStyle(1.2, COLORS.outline, 1);
    g.strokePoints(toPoints(band), true, true);
  }
}

// Пёрышко: вытянутый овал цвета color, повёрнутый на angle (радианы), с тёмным стержнем.
function drawFeather(g: Graphics, x: number, y: number, angle: number, color: number): void {
  g.save();
  g.translateCanvas(x, y);
  g.rotateCanvas(angle);
  outlinedEllipse(g, 0, 10, 7, 22, color);
  g.lineStyle(1.2, COLORS.outline, 0.8);
  g.lineBetween(0, 0, 0, 20);
  g.restore();
}

// Светлое кольцо под ногами. Сплюснуто — мы смотрим сверху под углом.
function drawRing(g: Graphics): void {
  const { w, h } = RING_SIZE;
  g.fillStyle(COLORS.ui, 0.15);
  g.fillEllipse(w / 2, h / 2, w - 6, h - 6);
  g.lineStyle(4, COLORS.ui, 0.9);
  g.strokeEllipse(w / 2, h / 2, w - 6, h - 6);
}

// ===== Джойстик =====

// Круг джойстика: полупрозрачный, со светлым краем.
function drawJoystickBase(g: Graphics): void {
  const center = JOYSTICK_BASE_SIZE.w / 2;
  g.fillStyle(COLORS.ui, 0.18);
  g.fillCircle(center, center, center - 4);
  g.lineStyle(4, COLORS.ui, 0.6);
  g.strokeCircle(center, center, center - 4);
}

// Ручка джойстика: белый кружок с тенью.
function drawJoystickKnob(g: Graphics): void {
  const center = JOYSTICK_KNOB_SIZE.w / 2;
  g.fillStyle(COLORS.shadow, 0.25);
  g.fillCircle(center, center + 3, center - 4);
  g.fillStyle(COLORS.ui, 0.95);
  g.fillCircle(center, center, center - 5);
  g.lineStyle(3, COLORS.snowDeep, 1);
  g.strokeCircle(center, center, center - 5);
}

// ===== Куст, пенёк и связка хвороста =====

// Крона куста — «шапки» листвы: x, y, радиус. Нужна и кусту, и его снегу,
// чтобы снег лёг точно на верхушки.
const BUSH_CX = BUSH_SIZE.w / 2;
const BUSH_LOBES = [
  BUSH_CX - 40, 66, 14, BUSH_CX + 40, 66, 14, BUSH_CX - 30, 58, 22, BUSH_CX + 30, 58, 22,
  BUSH_CX - 12, 64, 20, BUSH_CX + 12, 64, 20, BUSH_CX, 44, 28, BUSH_CX - 16, 32, 18, BUSH_CX + 16, 30, 18,
];

// Зелёный куст: короткий ствол снизу и пышная крона из листьев в три тона.
// Снег на кроне — отдельная картинка (TEXTURES.bushSnow), её можно стряхнуть.
function drawBush(g: Graphics): void {
  const { w, h } = BUSH_SIZE;
  const cx = w / 2;

  // 1. Снег у корней — тень.
  g.fillStyle(COLORS.snowShade, 1);
  g.fillEllipse(cx, h - 8, 70, 12);

  // 2. Короткий ствол с корнями-«лапками»: левая сторона светлее, правая в тени.
  const trunk = [cx - 7, 74, cx + 7, 74, cx + 9, h - 9, cx + 15, h - 5, cx - 15, h - 5, cx - 9, h - 9];
  fillPolygon(g, trunk, COLORS.trunk);
  fillPolygon(g, [cx + 2, 74, cx + 7, 74, cx + 9, h - 9, cx + 15, h - 5, cx + 3, h - 5], COLORS.woodDark);
  strokePolygon(g, trunk);

  // 3. Крона: сначала все шапки тёмно-зелёным с общей обводкой — это тень…
  outlinedBlobs(g, BUSH_LOBES, COLORS.leafDark);
  // …потом поменьше и сдвинутые вверх-влево — основной зелёный…
  g.fillStyle(COLORS.leaf, 1);
  for (let i = 0; i < BUSH_LOBES.length; i += 3) {
    const r = BUSH_LOBES[i + 2];
    g.fillCircle(BUSH_LOBES[i] - r * 0.12, BUSH_LOBES[i + 1] - r * 0.15, r * 0.82);
  }
  // …и совсем маленькие — светлые верхушки, на которые падает свет.
  g.fillStyle(COLORS.leafLight, 1);
  for (let i = 0; i < BUSH_LOBES.length; i += 3) {
    const r = BUSH_LOBES[i + 2];
    g.fillCircle(BUSH_LOBES[i] - r * 0.3, BUSH_LOBES[i + 1] - r * 0.35, r * 0.45);
  }

  // 4. Текстура: много маленьких листиков. Место выбирается по seed — рисунок всегда одинаковый.
  drawLeaves(g);

  // 5. Снег у корней поверх ствола.
  g.fillStyle(COLORS.snowLight, 1);
  g.fillEllipse(cx - 2, h - 7, 52, 8);
  g.fillCircle(cx - 20, h - 8, 5);
  g.fillCircle(cx + 18, h - 8, 4);
}

// Листики на кроне. Каждый лист — ромбик-«капля», повёрнутый под случайным углом.
// Цвет зависит от места на шапке: вверху слева светлее, внизу справа темнее.
function drawLeaves(g: Graphics): void {
  const rng = new Phaser.Math.RandomDataGenerator([BUSH_LEAVES_SEED]);
  const lobeCount = BUSH_LOBES.length / 3;

  for (let i = 0; i < BUSH_LEAF_COUNT; i++) {
    // Случайная шапка и случайная точка внутри неё (не у самого края).
    const lobe = rng.between(0, lobeCount - 1) * 3;
    const lobeX = BUSH_LOBES[lobe];
    const lobeY = BUSH_LOBES[lobe + 1];
    const r = BUSH_LOBES[lobe + 2];
    const angle = rng.realInRange(0, Math.PI * 2);
    const distance = Math.sqrt(rng.frac()) * r * 0.8;
    const x = lobeX + Math.cos(angle) * distance;
    const y = lobeY + Math.sin(angle) * distance;

    // light > 0 — сторона к свету (вверх-влево), light < 0 — теневая сторона.
    const light = (lobeX - x + (lobeY - y)) / r;
    const color = light > 0.45 ? COLORS.leafHighlight : light > -0.3 ? COLORS.leafLight : COLORS.leaf;
    drawLeaf(g, x, y, rng.realInRange(0, Math.PI), color);
  }
}

// Один листик: вытянутый ромб длиной 8 и шириной 4, повёрнутый на угол angle.
function drawLeaf(g: Graphics, x: number, y: number, angle: number, color: number): void {
  const along = { x: Math.cos(angle) * 4, y: Math.sin(angle) * 4 };
  const across = { x: -Math.sin(angle) * 2, y: Math.cos(angle) * 2 };
  fillPolygon(
    g,
    [x + along.x, y + along.y, x + across.x, y + across.y, x - along.x, y - along.y, x - across.x, y - across.y],
    color,
  );
}

// Снег на кроне куста — отдельная картинка того же размера, что и куст.
// Лежит шапками на верхушках; при первом ударе её стряхивают.
function drawBushSnow(g: Graphics): void {
  // На каких «шапках» кроны лежит снег (номера в BUSH_LOBES).
  const snowyLobes = [2, 3, 7, 8, 6];

  // Сначала все голубые тени (шапки чуть ниже), потом весь белый снег поверх —
  // так тени видны только по нижнему краю снега.
  for (const lobe of snowyLobes) {
    fillSnowCap(g, lobe, 3, COLORS.snowDeep);
  }
  for (const lobe of snowyLobes) {
    fillSnowCap(g, lobe, 0, COLORS.snowLight);
  }
  // Правые шапки — в лёгкой тени.
  g.fillStyle(COLORS.snowShade, 1);
  g.fillEllipse(BUSH_CX + 34, 42, 16, 6);
  g.fillEllipse(BUSH_CX + 22, 16, 12, 5);

  // Снег свисает каплями.
  g.fillStyle(COLORS.snowLight, 1);
  g.fillCircle(BUSH_CX - 10, 34, 2.5);
  g.fillCircle(BUSH_CX + 8, 32, 2.5);
  g.fillCircle(BUSH_CX - 26, 50, 2);
  g.fillStyle(COLORS.snowShade, 1);
  g.fillCircle(BUSH_CX + 28, 50, 2);
}

// Снежная шапка на верхушке шапки кроны номер lobe: сверху дуга по краю шапки,
// снизу волнистый край. shiftY сдвигает шапку вниз (для голубой тени).
function fillSnowCap(g: Graphics, lobe: number, shiftY: number, color: number): void {
  const x = BUSH_LOBES[lobe * 3];
  const y = BUSH_LOBES[lobe * 3 + 1] + shiftY;
  // Радиус чуть больше листвы — снег ложится на половину обводки куста.
  const r = BUSH_LOBES[lobe * 3 + 2] + 1.5;
  // Угол, до которого снег спускается по бокам (больше — тоньше шапка).
  const edgeAngle = 0.6;
  const edgeY = y - r * Math.sin(edgeAngle);
  const leftX = x - r * Math.cos(edgeAngle);
  const rightX = x + r * Math.cos(edgeAngle);
  const waves = 8;

  g.fillStyle(color, 1);
  g.beginPath();
  g.arc(x, y, r, Math.PI + edgeAngle, Math.PI * 2 - edgeAngle);
  // Волнистый нижний край справа налево.
  for (let k = 0; k <= waves; k++) {
    g.lineTo(Phaser.Math.Linear(rightX, leftX, k / waves), edgeY + 2.5 * (1 + Math.sin(k * 1.7)));
  }
  g.closePath();
  g.fillPath();
}

// Сухая ветка от (x1, y1) до (x2, y2) с тёмной обводкой и развилкой у кончика.
function drawTwig(g: Graphics, x1: number, y1: number, x2: number, y2: number): void {
  // Развилка отходит вбок из точки на 70% длины ветки.
  const forkX = Phaser.Math.Linear(x1, x2, 0.7);
  const forkY = Phaser.Math.Linear(y1, y2, 0.7);
  const forkTipX = forkX + (y2 - y1) * 0.18;
  const forkTipY = forkY - (x2 - x1) * 0.18;

  // Сначала толстая тёмная линия (обводка), поверх — тонкая светлая (сама ветка).
  g.lineStyle(5, COLORS.outline, 1);
  g.lineBetween(x1, y1, x2, y2);
  g.lineBetween(forkX, forkY, forkTipX, forkTipY);
  g.lineStyle(2.5, COLORS.brushLight, 1);
  g.lineBetween(x1, y1, x2, y2);
  g.lineBetween(forkX, forkY, forkTipX, forkTipY);
}

// Пенёк: ствол со светлым срезом и кольцами, обломки веток, корни и снег.
function drawStump(g: Graphics): void {
  const { w, h } = STUMP_SIZE;
  const cx = w / 2;

  // Снег у подножия — тень.
  g.fillStyle(COLORS.snowShade, 1);
  g.fillEllipse(cx, h - 7, w - 6, 12);

  // Обломки веток торчат в стороны (позади ствола).
  drawTwig(g, cx - 10, 34, cx - 30, 18);
  drawTwig(g, cx + 10, 30, cx + 30, 16);

  // Корни с обводкой.
  const leftRoot = [cx - 26, h - 6, cx - 18, h - 16, cx - 12, h - 6];
  const rightRoot = [cx + 26, h - 6, cx + 18, h - 16, cx + 12, h - 6];
  fillPolygon(g, leftRoot, COLORS.wood);
  strokePolygon(g, leftRoot);
  fillPolygon(g, rightRoot, COLORS.woodDark);
  strokePolygon(g, rightRoot);

  // Ствол: светлая левая сторона, тёмная правая, полоски коры.
  const trunk = [cx - 16, 24, cx + 16, 24, cx + 18, h - 5, cx - 18, h - 5];
  fillPolygon(g, trunk, COLORS.wood);
  fillPolygon(g, [cx + 4, 24, cx + 16, 24, cx + 18, h - 5, cx + 5, h - 5], COLORS.woodDark);
  g.lineStyle(THIN_OUTLINE_WIDTH, COLORS.woodDark, 1);
  g.lineBetween(cx - 8, 30, cx - 9, h - 9);
  g.lineBetween(cx - 1, 32, cx - 1, h - 11);
  g.lineStyle(THIN_OUTLINE_WIDTH, COLORS.woodLight, 1);
  g.lineBetween(cx - 13, 30, cx - 14, h - 12);
  strokePolygon(g, trunk);

  // Срез сверху с годовыми кольцами.
  outlinedEllipse(g, cx, 24, 34, 14, COLORS.woodEnd);
  g.lineStyle(1.5, COLORS.woodLight, 1);
  g.strokeEllipse(cx, 24, 22, 8);
  g.strokeEllipse(cx, 24, 10, 4);

  // Шапка снега на краю среза: голубая тень и белый снег.
  g.fillStyle(COLORS.snowDeep, 1);
  g.fillEllipse(cx - 6, 22, 20, 8);
  g.fillStyle(COLORS.snowLight, 1);
  g.fillEllipse(cx - 7, 20, 20, 8);
  g.fillCircle(cx - 12, 25, 2);

  // Бугристый снег у подножия.
  g.fillCircle(cx - 18, h - 8, 6);
  g.fillCircle(cx + 16, h - 8, 5);
  g.fillEllipse(cx - 2, h - 6, w - 26, 7);
}

// Связка хвороста: четыре палки, перевязанные двумя кожаными ремешками,
// сверху еловая веточка и два листика.
// Верх и низ ровные — из таких связок стопка получается аккуратной, как из монет.
function drawBundle(g: Graphics): void {
  // Палки сверху вниз: x левого конца, y верха, длина, цвет. Нижние перекрывают верхние.
  drawStick(g, 6, 3, 44, COLORS.woodLight);
  drawStick(g, 3, 8, 49, COLORS.wood);
  drawStick(g, 5, 13, 48, COLORS.woodLight);
  drawStick(g, 4, 18, 45, COLORS.wood);

  drawRopeBand(g, 17);
  drawRopeBand(g, 38);

  // Еловая веточка: стебелёк и иголки парами.
  g.lineStyle(2, COLORS.fir, 1);
  g.lineBetween(26, 6, 40, 3);
  for (const t of [0.25, 0.5, 0.75, 1]) {
    const x = 26 + 14 * t;
    const y = 6 - 3 * t;
    g.lineBetween(x, y, x - 3, y - 2.5);
    g.lineBetween(x, y, x - 3, y + 2.5);
  }
  drawLeaf(g, 48, 9, 0.6, COLORS.leaf);
  drawLeaf(g, 50, 19, -0.4, COLORS.leafLight);
}

// ===== Путники =====
// Три вида путников в стиле вождя: крупная голова, круглые глаза с белками,
// нос картошкой. У каждого две картинки: со спины (isFront = false) и спереди.
// Общие части — сапоги, одежда колоколом и лицо — рисуют функции ниже.

// Середина картинки путника по горизонтали и середина головы.
const TRAVELER_CX = TRAVELER_SIZE.w / 2;
const TRAVELER_HEAD_Y = 33;
// Палка (копьё или посох) стоит на столько пикселей правее или левее середины.
const TRAVELER_STICK_X = 30;

// Сапоги и одежда колоколом: узкая у шеи, широкая внизу, правая сторона в тени.
// Поперёк — полоса охры с белыми точками, внизу пушистая оторочка, на поясе — ремень
// с костяной пряжкой.
function drawTravelerRobe(g: Graphics, color: number, shade: number): void {
  const { h } = TRAVELER_SIZE;
  const cx = TRAVELER_CX;

  outlinedEllipse(g, cx - 11, h - 7, 17, 11, COLORS.furDark);
  outlinedEllipse(g, cx + 11, h - 7, 17, 11, COLORS.furDark);
  const robe = [cx - 14, 46, cx + 14, 46, cx + 27, h - 16, cx - 27, h - 16];
  fillPolygon(g, robe, color);
  fillPolygon(g, [cx + 5, 47, cx + 14, 46, cx + 27, h - 16, cx + 11, h - 16], shade);
  g.lineStyle(3, COLORS.ochre, 1);
  g.lineBetween(cx - 20, 74, cx + 20, 74);
  g.fillStyle(COLORS.white, 1);
  for (let x = cx - 16; x <= cx + 16; x += 8) g.fillCircle(x, 81, 1.5);
  strokePolygon(g, robe);

  // Оторочка из кружков-«клочков» меха.
  const trim: number[] = [];
  for (let x = cx - 26; x <= cx + 26; x += 6.5) trim.push(x, h - 17, 4.4);
  outlinedBlobs(g, trim, COLORS.travelerHideLight);
  limb(g, cx - 17, 64, cx + 17, 64, 3, COLORS.leather);
  outlinedCircle(g, cx - 2, 64, 2.6, COLORS.bone);
}

// Капюшон спереди: купол цвета color, вокруг лица белая пушистая опушка,
// внутри — тёмная глубина (лицо рисуется поверх).
function drawTravelerHoodFront(g: Graphics, color: number): void {
  const cx = TRAVELER_CX;
  const y = TRAVELER_HEAD_Y;
  const tufts = 14;
  outlinedCircle(g, cx, y, 21, color);
  const ruff: number[] = [];
  for (let i = 0; i < tufts; i++) {
    const angle = (i / tufts) * Math.PI * 2;
    ruff.push(cx + Math.cos(angle) * 17, y + Math.sin(angle) * 17, 5);
  }
  outlinedBlobs(g, ruff, COLORS.travelerRuff);
  g.fillStyle(COLORS.travelerHoodInside, 1);
  g.fillCircle(cx, y, 15);
}

// Капюшон сзади: купол со швом посередине, тень слева, внизу опушка на плечах.
function drawTravelerHoodBack(g: Graphics, color: number, shade: number): void {
  const cx = TRAVELER_CX;
  const y = TRAVELER_HEAD_Y;
  outlinedCircle(g, cx, y - 1, 20, color);
  crescent(g, cx, y - 1, 18.5, 18.5, -4, -3, shade);
  g.lineStyle(1.5, shade, 1);
  g.lineBetween(cx, y - 20, cx, y + 14);
  const ruff: number[] = [];
  for (let x = cx - 16; x <= cx + 16; x += 6.4) ruff.push(x, y + 16, 4.2);
  outlinedBlobs(g, ruff, COLORS.travelerRuff);
}

// Палка от земли выше головы: копьё (с каменным наконечником) или посох.
function drawTravelerStick(g: Graphics, x: number, isSpear: boolean): void {
  const { h } = TRAVELER_SIZE;
  limb(g, x, h - 4, x, 14, 4, COLORS.wood);
  if (isSpear) {
    const tip = [x - 6, 16, x, 1, x + 6, 16, x, 21];
    fillPolygon(g, tip, COLORS.stone);
    fillPolygon(g, [x, 1, x + 6, 16, x, 21], COLORS.stoneDark);
    strokePolygon(g, tip);
    limb(g, x - 4, 22, x + 4, 22, 3, COLORS.leather);
  } else {
    outlinedCircle(g, x, 12, 5, COLORS.woodDark);
  }
}

// Лицо спереди: круглые глаза с белками и вторым бликом, нос картошкой,
// румянец, улыбка, тень полумесяцем. Раскраска охрой: полоски на щеках и точка на лбу.
function drawTravelerFace(g: Graphics): void {
  const cx = TRAVELER_CX;
  const y = TRAVELER_HEAD_Y;
  outlinedCircle(g, cx, y, 14, COLORS.skin);
  crescent(g, cx, y, 12.5, 12.5, -4, -2, COLORS.skinShade);
  g.fillStyle(COLORS.white, 0.35);
  g.fillEllipse(cx - 5, y - 8, 9, 4);
  g.fillStyle(COLORS.cheek, 0.7);
  g.fillCircle(cx - 8, y + 5, 3.5);
  g.fillCircle(cx + 8, y + 5, 3.5);
  for (const x of [cx - 6, cx + 6]) {
    drawRoundEye(g, x, y - 2, 8, 9);
    g.fillStyle(COLORS.white, 1);
    g.fillCircle(x - 1, y - 0.2, 0.8);
  }
  outlinedCircle(g, cx, y + 3, 3.5, COLORS.nose);
  g.lineStyle(2, COLORS.outline, 1);
  g.beginPath();
  g.arc(cx, y + 6, 4, Math.PI * 0.15, Math.PI * 0.85);
  g.strokePath();
  g.lineStyle(2, COLORS.ochre, 1);
  g.lineBetween(cx - 11, y + 2, cx - 6, y + 3);
  g.lineBetween(cx + 6, y + 3, cx + 11, y + 2);
  g.fillStyle(COLORS.ochre, 1);
  g.fillCircle(cx, y - 9, 1.8);
}

// Охотник: пятнистая кожаная одежда, капюшон, рыжая борода, копьё. Со спины — котомка.
function drawHunter(g: Graphics, isFront: boolean): void {
  const cx = TRAVELER_CX;
  const y = TRAVELER_HEAD_Y;

  drawTravelerStick(g, cx + TRAVELER_STICK_X, true);
  drawTravelerRobe(g, COLORS.travelerHide, COLORS.travelerHideShade);
  g.fillStyle(COLORS.travelerHideSpot, 1);
  for (const [x, sy, r] of [[cx - 8, 60, 3], [cx + 6, 70, 3.5], [cx - 12, 80, 3], [cx + 14, 86, 2.5], [cx - 2, 90, 3]]) {
    g.fillCircle(x, sy, r);
  }
  if (isFront) {
    drawTravelerHoodFront(g, COLORS.travelerHideShade);
    // Лямки котомки и рука в рукавице на копье.
    limb(g, cx - 12, 48, cx - 6, 84, 4, COLORS.rope);
    limb(g, cx + 12, 48, cx + 6, 84, 4, COLORS.rope);
    outlinedCircle(g, cx + TRAVELER_STICK_X - 2, 64, 6, COLORS.furDark);
    drawTravelerFace(g);
    // Рыжая борода и брови.
    outlinedBlobs(g, [cx - 9, y + 11, 6, cx, y + 14, 7, cx + 9, y + 11, 6], COLORS.hair);
    g.fillStyle(COLORS.skin, 1);
    g.fillEllipse(cx, y + 6, 12, 5);
    g.lineStyle(2, COLORS.outline, 1);
    g.beginPath();
    g.arc(cx, y + 5, 4, Math.PI * 0.15, Math.PI * 0.85);
    g.strokePath();
    g.lineStyle(3, COLORS.hair, 1);
    g.lineBetween(cx - 10, y - 9, cx - 3, y - 8);
    g.lineBetween(cx + 3, y - 8, cx + 10, y - 9);
  } else {
    // Капюшон со спины. Котомка: мешок с верёвкой и заплаткой.
    drawTravelerHoodBack(g, COLORS.travelerHide, COLORS.travelerHideShade);
    outlinedEllipse(g, cx, 70, 38, 34, COLORS.sack);
    g.fillStyle(COLORS.sackDark, 1);
    g.fillEllipse(cx + 5, 77, 26, 14);
    g.fillStyle(COLORS.sack, 1);
    g.fillEllipse(cx - 2, 68, 28, 22);
    g.fillStyle(COLORS.sackDark, 1);
    g.fillRect(cx + 3, 68, 9, 8);
    g.lineStyle(THIN_OUTLINE_WIDTH, COLORS.outline, 1);
    g.strokeRect(cx + 3, 68, 9, 8);
    outlinedEllipse(g, cx, 54, 16, 8, COLORS.sack);
    limb(g, cx - 9, 57, cx + 9, 57, 3, COLORS.rope);
  }
}

// Старец: кожаный плащ с капюшоном, длинная седая борода, посох с перьями.
function drawElder(g: Graphics, isFront: boolean): void {
  const cx = TRAVELER_CX;
  const y = TRAVELER_HEAD_Y;
  // Посох — в левой руке.
  const stickX = cx - TRAVELER_STICK_X;

  drawTravelerStick(g, stickX, false);
  // Перья на посохе — свисают из-под кожаной обмотки в стороны.
  for (const [dx, dy, angle, color] of [[-6, 28, 0.35, COLORS.feather], [6, 29, -0.35, COLORS.featherAlt], [0, 33, 0, COLORS.feather]]) {
    g.save();
    g.translateCanvas(stickX + dx, dy);
    g.rotateCanvas(angle);
    outlinedEllipse(g, 0, 0, 7, 20, color);
    g.lineStyle(1.5, COLORS.outline, 0.6);
    g.lineBetween(0, -9, 0, 9);
    g.restore();
  }
  limb(g, stickX - 3, 18, stickX + 3, 18, 3, COLORS.leather);
  drawTravelerRobe(g, COLORS.elderCloak, COLORS.elderCloakDark);

  if (isFront) {
    drawTravelerHoodFront(g, COLORS.elderCloakDark);
    outlinedCircle(g, stickX + 3, 62, 6, COLORS.furDark);
    drawTravelerFace(g);
    // Длинная седая борода до пояса и пушистые седые брови.
    outlinedBlobs(
      g,
      [cx - 9, y + 11, 7, cx + 9, y + 11, 7, cx, y + 16, 9, cx - 4, y + 26, 7, cx + 4, y + 26, 7, cx, y + 35, 6, cx, y + 42, 4],
      COLORS.elderHair,
    );
    g.fillStyle(COLORS.skin, 1);
    g.fillEllipse(cx, y + 6, 10, 4);
    outlinedBlobs(g, [cx - 5, y + 9, 4, cx + 5, y + 9, 4], COLORS.elderHair);
    g.lineStyle(4, COLORS.elderHair, 1);
    g.lineBetween(cx - 11, y - 9, cx - 3, y - 7);
    g.lineBetween(cx + 3, y - 7, cx + 11, y - 9);
  } else {
    drawTravelerHoodBack(g, COLORS.elderCloakDark, COLORS.elderCloak);
  }
}

// Девушка: светлая кожаная шубка, капюшон, две косы с бусинами,
// ожерелье из клыков. Со спины — плетёная корзина.
function drawGirl(g: Graphics, isFront: boolean): void {
  const cx = TRAVELER_CX;
  const y = TRAVELER_HEAD_Y;

  drawTravelerRobe(g, COLORS.travelerHideLight, COLORS.travelerHide);

  if (isFront) {
    // Косы по бокам лица до груди (на концах бусины) выходят из-под капюшона.
    drawBraid(g, cx - 14, y + 4, cx - 16, y + 30);
    drawBraid(g, cx + 14, y + 4, cx + 16, y + 30);
    drawTravelerHoodFront(g, COLORS.travelerHide);
    drawTravelerFace(g);
    // Ожерелье из маленьких клыков.
    for (const dx of [-8, -3, 3, 8]) {
      const tooth = [cx + dx - 2, 50, cx + dx + 2, 50, cx + dx, 56];
      fillPolygon(g, tooth, COLORS.tusk);
      strokePolygon(g, tooth);
    }
  } else {
    // Плетёная корзина за спиной: обод и прутья.
    const basket = [cx - 20, 52, cx + 20, 52, cx + 16, 92, cx - 16, 92];
    fillPolygon(g, basket, COLORS.basket);
    g.lineStyle(2, COLORS.basketDark, 1);
    for (let by = 59; by <= 87; by += 7) g.lineBetween(cx - 18, by, cx + 18, by);
    for (let bx = -12; bx <= 12; bx += 8) g.lineBetween(cx + bx, 54, cx + bx * 0.82, 91);
    strokePolygon(g, basket);
    outlinedEllipse(g, cx, 52, 44, 10, COLORS.basketDark);
    // Две косы, лежащие на плечах по бокам корзины, и капюшон со спины.
    drawBraid(g, cx - 12, y + 10, cx - 22, y + 36);
    drawBraid(g, cx + 12, y + 10, cx + 22, y + 36);
    drawTravelerHoodBack(g, COLORS.travelerHide, COLORS.travelerHideShade);
  }
}

// Коса от (x1, y1) до (x2, y2): цепочка кружков-«звеньев», на конце бусина.
function drawBraid(g: Graphics, x1: number, y1: number, x2: number, y2: number): void {
  const links = 5;
  const blobs: number[] = [];
  for (let i = 0; i <= links; i++) {
    const t = i / links;
    blobs.push(Phaser.Math.Linear(x1, x2, t), Phaser.Math.Linear(y1, y2, t), 4.5 - t * 1.2);
  }
  outlinedBlobs(g, blobs, COLORS.girlHair);
  outlinedCircle(g, x2, y2 + 6, 3.5, COLORS.bead);
}

// Пузырь над головой путника: белый овал с хвостиком вниз и тёмной обводкой.
function drawBubble(g: Graphics): void {
  const { w, h } = BUBBLE_SIZE;
  const body = h - 12;

  g.fillStyle(COLORS.bubble, 1);
  g.fillRoundedRect(2, 2, w - 4, body, 16);
  fillPolygon(g, [w / 2 - 8, body, w / 2 + 8, body, w / 2, h - 2], COLORS.bubble);
  g.lineStyle(OUTLINE_WIDTH, COLORS.outline, 1);
  g.strokeRoundedRect(2, 2, w - 4, body, 16);
  g.lineBetween(w / 2 - 8, body + 1, w / 2, h - 2);
  g.lineBetween(w / 2 + 8, body + 1, w / 2, h - 2);
  // Закрашиваем обводку там, где хвостик соединяется с пузырём.
  g.fillStyle(COLORS.bubble, 1);
  g.fillRect(w / 2 - 6, body - 3, 12, 4);
}

// Заяц-беляк, смотрит вправо. Тело — из нескольких кругов, поэтому по краю
// видны вихры меха. Белый мех с голубыми тенями, длинные уши с розовым внутри
// и чёрными кончиками, большая задняя лапа, крупный блестящий глаз,
// хвостик-помпон. Лапы — внизу картинки.
function drawRabbit(g: Graphics): void {
  // Дальнее ухо (темнее) и ближнее — рисуются первыми, голова их перекрывает.
  drawRabbitEar(g, 40, 20, -0.45, COLORS.rabbitShade, COLORS.rabbitEarShade);
  drawRabbitEar(g, 47, 18, -0.12, COLORS.rabbitFur, COLORS.rabbitEar);
  // Хвостик-помпон.
  outlinedBlobs(g, [11, 38, 6, 14, 33, 5, 9, 34, 4], COLORS.rabbitBelly);
  // Пушистое тело: круги с общей обводкой, тень полумесяцем снизу, блик на спинке.
  outlinedBlobs(g, [22, 40, 14, 33, 38, 13, 15, 45, 10, 28, 47, 12, 37, 45, 10], COLORS.rabbitFur);
  crescent(g, 27, 42, 17, 11, 0, -3.5, COLORS.rabbitShade);
  g.fillStyle(COLORS.rabbitLight, 1);
  g.fillEllipse(25, 31, 16, 5);
  // Светлое брюхо спереди.
  g.fillStyle(COLORS.rabbitBelly, 1);
  g.fillEllipse(38, 46, 12, 14);
  // Большая задняя лапа с пальчиками и маленькая передняя.
  outlinedEllipse(g, 20, 55, 22, 6, COLORS.rabbitBelly);
  outlinedEllipse(g, 42, 55, 9, 5, COLORS.rabbitBelly);
  g.lineStyle(1, COLORS.rabbitShade, 1);
  for (const x of [26, 28.5]) g.lineBetween(x, 54, x, 57);
  // Голова: тень снизу, блик на макушке, светлая мордочка спереди.
  outlinedCircle(g, 46, 30, 13, COLORS.rabbitFur);
  crescent(g, 46, 30, 12, 12, -2, -2.5, COLORS.rabbitShade, 0.8);
  g.fillStyle(COLORS.rabbitLight, 1);
  g.fillEllipse(42, 22, 12, 5);
  g.fillStyle(COLORS.rabbitBelly, 1);
  g.fillEllipse(53, 36, 12, 9);
  // Большой блестящий глаз: тёмный, с двумя бликами.
  g.fillStyle(COLORS.rabbitEye, 1);
  g.fillEllipse(49, 27, 8, 9);
  g.fillStyle(COLORS.white, 1);
  g.fillCircle(51, 24.5, 2);
  g.fillCircle(47.6, 29.6, 1);
  // Нос, рот и усы.
  g.fillStyle(COLORS.rabbitNose, 1);
  g.fillEllipse(58, 33, 5, 4);
  g.lineStyle(1, COLORS.outline, 0.6);
  g.lineBetween(57.5, 35, 57, 37.5);
  g.lineStyle(1, COLORS.outline, 0.45);
  g.lineBetween(56, 36, 63, 35);
  g.lineBetween(56, 37, 62, 40);
}

// ===== Волк =====
// Волк — поджарый хищник из частей (как вождь): туловище, голова, хвост и лапы
// рисуются отдельно, чтобы на бегу лапы шагали, голова кивала, а хвост развевался.
// Все части смотрят вправо; где они крепятся друг к другу — константы в Wolf.ts.

// Туловище: один плавный контур — бёдра сзади, ровная спина, высокий загривок,
// шея вверх-вперёд, глубокая грудь и подтянутый живот. По спине — тёмная седловина,
// на загривке и шее — лохматая тёмная грива, под горлом — светлый воротник.
function drawWolfBody(g: Graphics): void {
  const silhouette = [
    22, 30, 36, 24, 54, 25, 72, 23, 88, 16, 100, 12, 112, 8, 120, 12, 122, 22, 114, 32,
    108, 44, 100, 60, 86, 66, 72, 60, 60, 52, 48, 54, 40, 60, 28, 62, 16, 52, 14, 40,
  ];
  fillPolygon(g, silhouette, COLORS.wolf);
  // Седловина вдоль спины.
  fillPolygon(
    g,
    [22, 32, 36, 26, 54, 27, 72, 25, 88, 18, 100, 14, 104, 20, 92, 28, 76, 32, 58, 34, 42, 34, 28, 38],
    COLORS.wolfDark,
  );
  // Светлое брюхо под грудью и животом.
  fillPolygon(g, [104, 50, 100, 60, 86, 66, 72, 60, 62, 53, 74, 56, 88, 60], COLORS.wolfBelly);
  // Штрихи шерсти на бедре и плече.
  g.lineStyle(1.5, COLORS.wolfDark, 1);
  g.lineBetween(22, 48, 28, 54);
  g.lineBetween(28, 46, 34, 54);
  g.lineBetween(88, 46, 92, 52);
  strokePolygon(g, silhouette);

  // Грива: короткие тёмные лохмы торчат вверх-назад над загривком и шеей.
  const mane = [
    80, 24, 84, 16, 88, 20, 92, 12, 96, 17, 100, 9, 104, 14, 108, 6, 112, 12, 116, 6, 117, 16, 106, 26, 92, 30,
  ];
  fillPolygon(g, mane, COLORS.wolfDark);
  g.lineStyle(OUTLINE_WIDTH, COLORS.outline, 1);
  g.strokePoints(toPoints(mane.slice(0, 22)), false);
  // Светлый лохматый воротник под горлом.
  const ruff = [104, 34, 114, 30, 122, 24, 120, 36, 114, 36, 112, 46, 106, 40, 102, 46, 100, 38];
  fillPolygon(g, ruff, COLORS.wolfBelly);
  g.lineStyle(THIN_OUTLINE_WIDTH, COLORS.outline, 1);
  g.strokePoints(toPoints(ruff.slice(4)), false);
}

// Голова: узкая длинная морда, уши прижаты назад, оскал с двумя клыками
// и складкой на носу, жёлтый глаз с узким зрачком под сердитой бровью.
// Шея — слева (точка вращения).
function drawWolfHead(g: Graphics): void {
  // Ухо прижато назад.
  const ear = [18, 16, 2, 2, 30, 10];
  fillPolygon(g, ear, COLORS.wolfDark);
  fillPolygon(g, [17, 13, 8, 6, 24, 10], COLORS.wolfEar);
  strokePolygon(g, ear);

  // Нижняя челюсть и тёмная щель пасти.
  const jaw = [34, 33, 58, 32, 54, 39, 37, 40];
  fillPolygon(g, jaw, COLORS.wolfBelly);
  strokePolygon(g, jaw);

  // Череп и морда.
  outlinedBlobs(g, [21, 24, 14], COLORS.wolf);
  const snout = [26, 12, 46, 15, 64, 21, 70, 26, 67, 31, 52, 32, 36, 34, 24, 32];
  fillPolygon(g, snout, COLORS.wolf);
  strokePolygon(g, snout);
  g.fillStyle(COLORS.wolf, 1);
  g.fillCircle(21, 24, 11);
  // Светлый верх морды.
  g.fillStyle(COLORS.wolfLight, 1);
  g.fillPoints(toPoints([32, 17, 46, 18, 62, 23, 46, 21]), true);
  // Оскал: тёмная губа, верхний клык вниз, нижний — вверх, складка на носу.
  g.lineStyle(3, COLORS.wolfMouth, 1);
  g.lineBetween(36, 34, 62, 31);
  fillPolygon(g, [53, 31.5, 58, 31, 55.5, 38], COLORS.snowLight);
  fillPolygon(g, [39, 36, 43, 35.5, 41, 31], COLORS.snowLight);
  g.lineStyle(1.5, COLORS.outline, 1);
  g.lineBetween(52, 19, 55, 23);
  g.lineBetween(56, 20, 59, 24);
  // Светлая лохматая щека.
  const cheek = [8, 30, 20, 30, 28, 34, 22, 38, 20, 46, 14, 40, 8, 46, 6, 38];
  fillPolygon(g, cheek, COLORS.wolfBelly);
  strokePolygon(g, cheek);
  // Нос.
  outlinedEllipse(g, 68, 26, 7, 6, COLORS.outline);

  // Глаз: жёлтый, с узким зрачком, под низкой сердитой бровью.
  g.fillStyle(COLORS.wolfEye, 1);
  g.fillPoints(toPoints([29, 20, 34, 17, 40, 19, 35, 23]), true);
  g.fillStyle(COLORS.outline, 1);
  g.fillEllipse(35, 20, 2.5, 5);
  g.lineStyle(3, COLORS.outline, 1);
  g.lineBetween(26, 14, 42, 19);
}

// Хвост: длинный и пушистый, тёмный сверху и на кончике. Основание — справа.
function drawWolfTail(g: Graphics): void {
  // Пушистый посередине, сужается к кончику.
  outlinedBlobs(g, [62, 12, 7, 51, 14, 9, 39, 16, 9, 27, 18, 7, 17, 19, 5, 9, 20, 3], COLORS.wolf);
  g.fillStyle(COLORS.wolfDark, 1);
  g.fillEllipse(42, 11, 34, 5);
  g.fillCircle(11, 20, 3.5);
  // Лохматый низ хвоста — острые пряди.
  const tuft = [24, 23, 28, 30, 33, 24, 38, 30, 42, 24, 47, 28, 50, 21];
  fillPolygon(g, tuft, COLORS.wolf);
  g.lineStyle(THIN_OUTLINE_WIDTH, COLORS.outline, 1);
  g.strokePoints(toPoints(tuft.slice(0, 12)), false);
}

// Передняя лапа: от плеча прямо вниз, тонкое запястье и лапа с когтями.
function drawWolfFrontLeg(g: Graphics): void {
  limbChain(g, [13, 6, 12, 38, 13, 52], 8, COLORS.wolf);
  limb(g, 13, 4, 12, 24, 12, COLORS.wolf);
  drawWolfPaw(g, 15, 54);
}

// Задняя лапа: мощное бедро, колено вперёд, скакательный сустав назад, лапа.
function drawWolfBackLeg(g: Graphics): void {
  limbChain(g, [16, 6, 22, 30, 11, 44, 13, 55], 9, COLORS.wolf);
  limb(g, 16, 4, 21, 24, 15, COLORS.wolf);
  drawWolfPaw(g, 16, 57);
}

// Лапа волка: овал с тремя тёмными когтями спереди.
function drawWolfPaw(g: Graphics, x: number, y: number): void {
  outlinedEllipse(g, x, y, 15, 7, COLORS.wolf);
  g.lineStyle(1.5, COLORS.outline, 1);
  for (const dx of [2, 5, 8]) g.lineBetween(x + dx - 1, y - 1, x + dx + 1, y + 3);
}

// Ухо кролика: длинный овал цвета fur с розовой серединкой inner и чёрным
// кончиком, повёрнутый на angle (радианы).
function drawRabbitEar(g: Graphics, x: number, y: number, angle: number, fur: number, inner: number): void {
  const length = 31;
  g.save();
  g.translateCanvas(x, y);
  g.rotateCanvas(angle);
  outlinedEllipse(g, 0, 0, 10, length, fur);
  g.fillStyle(inner, 1);
  g.fillEllipse(0, 2, 4.5, length * 0.66);
  g.fillStyle(COLORS.rabbitEarTip, 1);
  g.fillEllipse(0, -length / 2 + 4, 7.5, 7);
  // Обводка поверх кончика, чтобы край уха остался ровным.
  g.lineStyle(OUTLINE_WIDTH, COLORS.outline, 1);
  g.strokeEllipse(0, 0, 10, length);
  g.restore();
}

// Клык саблезуба. Сверху — корень с неровным краем и золотым ободком, ниже —
// изогнутый клинок эмали, который сужается к острию и чуть загибается влево.
// Объём — три слоя по одной кривой: основа, тень вдоль вогнутого края и блик вдоль выпуклого.
function drawTusk(g: Graphics): void {
  const { w } = TUSK_SIZE;
  const top = TUSK_ROOT_HEIGHT;
  const length = TUSK_SIZE.h - top - 2;
  // Середина клинка на доле длины t (0 — у корня, 1 — остриё): к острию уходит влево.
  const centerX = (t: number): number => w / 2 + 4 - 13 * Math.pow(t, 1.5);
  // Половина толщины клинка: у корня широкий, долго держит толщину и резко сходится в остриё.
  const halfWidth = (t: number): number => 10 * Math.pow(1 - t, 0.55);
  const y = (t: number): number => top + length * t;

  // Точки края клинка: right — выпуклый край (справа), left — вогнутый (слева).
  // shift — насколько точка сдвинута внутрь от края (доля толщины).
  const edge = (side: number, shift: number, from: number, to: number): number[] => {
    const points: number[] = [];
    const steps = 12;
    for (let i = 0; i <= steps; i++) {
      const t = Phaser.Math.Linear(from, to, i / steps);
      points.push(centerX(t) + side * halfWidth(t) * (1 - shift), y(t));
    }
    return points;
  };
  const reversed = (points: number[]): number[] => {
    const result: number[] = [];
    for (let i = points.length - 2; i >= 0; i -= 2) result.push(points[i], points[i + 1]);
    return result;
  };

  const blade = [...edge(1, 0, 0, 1), ...reversed(edge(-1, 0, 0, 1))];
  fillPolygon(g, blade, COLORS.tusk);
  // Тень вдоль вогнутого края.
  fillPolygon(g, [...edge(-1, 0, 0, 1), ...reversed(edge(-1, 0.55, 0, 0.95))], COLORS.tuskShade);
  // Блик вдоль выпуклого края — узкая белая полоска.
  fillPolygon(g, [...edge(1, 0.25, 0.08, 0.7), ...reversed(edge(1, 0.6, 0.08, 0.7))], COLORS.tuskShine);
  strokePolygon(g, blade);

  // Корень — шириной с основание клинка: неровный верх, правая сторона в тени.
  const left = centerX(0) - halfWidth(0);
  const right = centerX(0) + halfWidth(0);
  const root = [left, top + 1, left - 1, 6, left + 4, 3, left + 8, 5, left + 12, 2, right, 5, right, top + 1];
  fillPolygon(g, root, COLORS.tuskRoot);
  fillPolygon(g, [left + 10, top + 1, left + 11, 4, left + 12, 2, right, 5, right, top + 1], COLORS.tuskRootShade);
  strokePolygon(g, root);

  // Золотой ободок у корня — клык как сокровище.
  const cx = w / 2;
  g.lineStyle(5.4, COLORS.outline, 1);
  g.lineBetween(cx - 7, 15, cx + 11, 14);
  g.lineStyle(3.4, COLORS.tuskGold, 1);
  g.lineBetween(cx - 7, 15, cx + 11, 14);
  g.fillStyle(COLORS.white, 0.9);
  g.fillCircle(cx - 2, 14, 0.9);
}

// Большой румяный окорок: косточка слева, кусок-капля, широкий справа,
// тень снизу, блик и искорки сверху. Цвета разные у сырого и жареного мяса;
// у жареного ещё капля сока и жёлтая искра жара.
function drawMeat(g: Graphics, color: number, shade: number, light: number, isCooked: boolean): void {
  // Косточка: палочка и две «шишечки» на конце.
  limb(g, 8, 23, 20, 18, 6, COLORS.bone);
  outlinedCircle(g, 6, 19, 4, COLORS.bone);
  outlinedCircle(g, 8, 27, 4, COLORS.bone);
  // Окорок-капля и тень по нижнему краю.
  const ham = [18, 12, 24, 5, 34, 2, 42, 5, 46, 13, 44, 22, 36, 28, 26, 28, 18, 22];
  fillPolygon(g, ham, color);
  fillPolygon(g, [26, 28, 36, 28, 44, 22, 46, 13, 40, 18, 30, 22], shade);
  strokePolygon(g, ham);
  g.fillStyle(light, 1);
  g.fillEllipse(30, 8, 12, 5);
  g.fillStyle(COLORS.white, 0.9);
  g.fillCircle(27, 7, 1.5);
  g.fillCircle(38, 6, 0.9);
  if (isCooked) {
    g.fillStyle(COLORS.fireYellow, 1);
    g.fillCircle(42, 9, 1.2);
    g.fillStyle(light, 1);
    g.fillEllipse(34, 24, 4, 2);
  }
}

// Одна палка связки: скруглённый брусок с обводкой и светлым срезом слева.
function drawStick(g: Graphics, x: number, y: number, length: number, color: number): void {
  const height = 7;
  g.fillStyle(color, 1);
  g.fillRoundedRect(x, y, length, height, 3);
  g.lineStyle(THIN_OUTLINE_WIDTH, COLORS.outline, 1);
  g.strokeRoundedRect(x, y, length, height, 3);
  g.fillStyle(COLORS.woodEnd, 1);
  g.fillEllipse(x + 3, y + height / 2, 4, 5);
}

// Ремешок поперёк связки, в точке x.
function drawRopeBand(g: Graphics, x: number): void {
  g.fillStyle(COLORS.bundleStrap, 1);
  g.fillRoundedRect(x - 3, 1, 6, 25, 2);
  g.fillStyle(COLORS.bundleStrapDark, 1);
  g.fillRect(x + 1, 2, 2, 23);
  g.lineStyle(THIN_OUTLINE_WIDTH, COLORS.outline, 1);
  g.strokeRoundedRect(x - 3, 1, 6, 25, 2);
}

// ===== Кучи у костра и костёр =====

// Площадка кучи — как зоны сдачи в мобильных играх:
// скруглённая рамка с тонкой внутренней рамкой и полупрозрачная заливка. Иконку ресурса ставит ItemPile.
function drawDropZone(g: Graphics): void {
  const { w, h } = DROP_ZONE_SIZE;
  const inset = DROP_ZONE_INSET;
  const radius = DROP_ZONE_RADIUS;
  const width = w - inset * 2;
  const height = h - inset * 2;

  g.fillStyle(COLORS.zoneFill, 0.45);
  g.fillRoundedRect(inset, inset, width, height, radius);
  // Тёмный кант под рамкой — чтобы светлую рамку было видно на белом снегу.
  g.lineStyle(12, COLORS.outline, 0.35);
  g.strokeRoundedRect(inset, inset, width, height, radius);
  g.lineStyle(6, COLORS.zoneBorder, 1);
  g.strokeRoundedRect(inset, inset, width, height, radius);
  // Внутренняя тонкая рамка — площадка как рамка-ковёр.
  const innerInset = 10;
  g.lineStyle(2, COLORS.zoneBorder, 0.6);
  g.strokeRoundedRect(inset + innerInset, inset + innerInset, width - innerInset * 2, height - innerInset * 2, radius - innerInset);
}

// Круг точки покупки: утоптанный снег с тёплой заливкой и светлым пунктиром
// по краю. Кольцо оплаты поверх пунктира рисует сам BuyZone. Сплюснут — вид под углом.
function drawBuyZone(g: Graphics): void {
  const { w, h } = BUY_ZONE_SIZE;
  const cx = w / 2;
  const cy = h / 2;
  const rx = w / 2 - 10;
  const ry = h / 2 - 8;

  g.fillStyle(COLORS.zoneFill, 0.5);
  g.fillEllipse(cx, cy, rx * 2, ry * 2);
  g.lineStyle(12, COLORS.outline, 0.35);
  g.strokeEllipse(cx, cy, rx * 2, ry * 2);
  // Пунктир: короткие светлые дуги по краю.
  const dashes = 18;
  g.lineStyle(5, COLORS.zoneBorder, 1);
  for (let i = 0; i < dashes; i++) {
    const from = (i / dashes) * Math.PI * 2;
    const to = from + (Math.PI * 2) / dashes / 2;
    g.strokePoints(toPoints(ellipsePoints(cx, cy, rx, ry, from, to)), false);
  }
}

// ===== Частокол =====

// Кол частокола: бревно с заострённым верхом, полосками коры, сучком и верёвкой,
// на острие — снежная шапка с искоркой, у подножия — снег.
function drawFenceStake(g: Graphics): void {
  const { w, h } = FENCE_STAKE_SIZE;
  const cx = w / 2;
  const half = 9;
  const tipY = 6;
  const shoulderY = 22;

  // Голубая тень на снегу у подножия.
  g.fillStyle(COLORS.snowShade, 1);
  g.fillEllipse(cx, h - 5, w - 4, 8);

  // Бревно: светлая левая сторона, тёмная правая, остриё сверху.
  const log = [cx - half, h - 5, cx - half, shoulderY, cx, tipY, cx + half, shoulderY, cx + half, h - 5];
  fillPolygon(g, log, COLORS.wood);
  fillPolygon(g, [cx + 2, h - 5, cx + 2, shoulderY - 6, cx + half, shoulderY, cx + half, h - 5], COLORS.woodDark);
  g.lineStyle(2, COLORS.woodLight, 1);
  g.lineBetween(cx - half + 3, shoulderY + 2, cx - half + 3, h - 12);
  // Полоски коры.
  g.lineStyle(1.5, COLORS.woodDark, 1);
  g.lineBetween(cx - 3, shoulderY + 12, cx - 4, shoulderY + 26);
  g.lineBetween(cx - 1, h - 26, cx - 2, h - 14);
  strokePolygon(g, log);

  // Верёвка: колья связаны между собой.
  limb(g, cx - half, 44, cx + half, 46, 3, COLORS.rope);

  // Снежная шапка на острие.
  const cap = [cx - 6, 16, cx, tipY - 2, cx + 6, 16, cx + 3, 19, cx - 1, 17, cx - 4, 20];
  fillPolygon(g, cap, COLORS.snowLight);
  // Снег у подножия.
  g.fillStyle(COLORS.snowLight, 1);
  g.fillEllipse(cx - 2, h - 6, 22, 7);

  // Сучок, искорка на снежной шапке и светлый срез на остриё.
  g.fillStyle(COLORS.woodDark, 1);
  g.fillEllipse(cx - 3, 58, 4, 3);
  g.fillStyle(COLORS.white, 1);
  g.fillCircle(cx - 2, 10, 1.2);
  g.lineStyle(1.3, COLORS.woodEnd, 1);
  g.lineBetween(cx - 7, 21, cx - 1, 9);
}

// Иконка частокола: три кола рядом, средний выше и впереди.
function drawFenceIcon(g: Graphics): void {
  const { w, h } = FENCE_ICON_SIZE;
  const stakeLeft = (cx: number): number => cx - FENCE_STAKE_SIZE.w / 2;
  for (const [cx, shiftY] of [[w / 2 - 22, 8], [w / 2 + 22, 8], [w / 2, 0]]) {
    g.save();
    g.translateCanvas(stakeLeft(cx), h - FENCE_STAKE_SIZE.h - 4 + shiftY);
    drawFenceStake(g);
    g.restore();
  }
}

// ===== Хижина =====

// Хижина-шалаш: жерди, сходящиеся наверху, обтянуты шкурами со швами.
// Внизу — тёмный вход с закатанным пологом, сбоку — кожаная заплатка,
// сверху — снежная шапка и дымовое отверстие, у подножия — сугробы. Точка опоры — середина нижнего края.
function drawHut(g: Graphics): void {
  const { w, h } = HUT_SIZE;
  const cx = w / 2;
  const top = 34;
  const base = h - 14;

  // Голубая тень на снегу под хижиной.
  g.fillStyle(COLORS.snowShade, 1);
  g.fillEllipse(cx, base + 2, w - 14, 22);

  // Концы жердей торчат над шалашом и перекрещиваются.
  limb(g, cx - 2, top + 8, cx - 20, 10, 5, COLORS.woodDark);
  limb(g, cx + 2, top + 8, cx + 19, 9, 5, COLORS.wood);
  limb(g, cx, top + 8, cx + 3, 6, 5, COLORS.woodLight);

  // Конус из шкур: стороны чуть выпуклые, низ — дуга (мы смотрим сверху под углом).
  const cone = [
    cx - 9, top, cx - 40, 70, cx - 64, 118, cx - 74, base - 6,
    cx - 50, base + 2, cx, base + 6, cx + 50, base + 2, cx + 74, base - 6,
    cx + 64, 118, cx + 40, 70, cx + 9, top,
  ];
  fillPolygon(g, cone, COLORS.fur);
  // Правая сторона в тени, по левому краю — светлая полоса: так шалаш круглый.
  fillPolygon(g, [cx + 6, top + 2, cx + 9, top, cx + 40, 70, cx + 64, 118, cx + 74, base - 6, cx + 50, base + 2, cx + 22, base + 5], COLORS.furShade);
  fillPolygon(g, [cx - 9, top, cx - 40, 70, cx - 64, 118, cx - 74, base - 6, cx - 64, base - 2, cx - 52, 116, cx - 30, 72, cx - 6, top + 4], COLORS.furLight);
  // Пятна на шкурах.
  g.fillStyle(COLORS.furSpot, 0.8);
  for (const [x, y, rx, ry] of [[-34, 104, 7, 5], [-18, 80, 5, 4], [22, 96, 6, 4], [44, 122, 7, 5], [-52, 128, 6, 4]]) {
    g.fillEllipse(cx + x, y, rx * 2, ry * 2);
  }
  // Швы между шкурами — от вершины вниз, с поперечными стежками.
  for (const [x1, x2] of [[-4, -38], [5, 30]]) {
    g.lineStyle(2, COLORS.furDark, 1);
    g.lineBetween(cx + x1, top + 6, cx + x2, base + 2);
    for (let t = 0.15; t < 0.95; t += 0.13) {
      const x = Phaser.Math.Linear(cx + x1, cx + x2, t);
      const y = Phaser.Math.Linear(top + 6, base + 2, t);
      g.lineBetween(x - 3, y - 1, x + 3, y + 1);
    }
  }
  strokePolygon(g, cone);

  // Вход: тёмная арка и закатанный над ней полог из светлого меха.
  const door = [cx - 20, base + 4, cx - 18, 100, cx - 9, 86, cx + 5, 84, cx + 16, 96, cx + 20, base + 4];
  fillPolygon(g, door, COLORS.charcoal);
  strokePolygon(g, door);
  limb(g, cx - 22, 88, cx + 20, 84, 9, COLORS.furLight);
  // Отогнутый край полога сбоку от входа.
  const flap = [cx + 20, 92, cx + 32, 112, cx + 24, base + 2, cx + 18, base + 2];
  fillPolygon(g, flap, COLORS.furLight);
  strokePolygon(g, flap);

  // Снежная шапка на вершине: голубая тень и белый снег с волнистым краем.
  const cap = (shift: number): number[] => [
    cx - 10, top - 2, cx - 26, 52 + shift, cx - 18, 58 + shift, cx - 8, 54 + shift,
    cx + 2, 60 + shift, cx + 12, 54 + shift, cx + 22, 58 + shift, cx + 28, 50 + shift, cx + 10, top - 2,
  ];
  fillPolygon(g, cap(4), COLORS.snowDeep);
  fillPolygon(g, cap(0), COLORS.snowLight);
  g.lineStyle(THIN_OUTLINE_WIDTH, COLORS.outline, 0.6);
  g.strokePoints(toPoints(cap(4)), true, true);

  // Сугробы у подножия, по бокам от входа.
  g.fillStyle(COLORS.snowDeep, 1);
  g.fillEllipse(cx - 50, base + 2, 44, 16);
  g.fillEllipse(cx + 54, base + 1, 40, 14);
  g.fillStyle(COLORS.snowLight, 1);
  g.fillEllipse(cx - 52, base, 40, 13);
  g.fillEllipse(cx + 55, base - 1, 34, 11);
  g.fillCircle(cx - 38, base - 3, 5);

  // Кожаная заплатка со стежками на шкурах.
  const patch = [cx - 46, 112, cx - 30, 108, cx - 28, 124, cx - 44, 127];
  fillPolygon(g, patch, COLORS.leather);
  strokePolygon(g, patch);
  g.lineStyle(1.2, COLORS.furLight, 1);
  for (const [x, y] of [[cx - 44, 115], [cx - 38, 111], [cx - 31, 114], [cx - 42, 124], [cx - 33, 122]]) {
    g.lineBetween(x - 1, y, x + 1, y);
  }
  // Дымовое отверстие у вершины и тень у входа — вход глубже.
  g.fillStyle(COLORS.charcoal, 1);
  g.fillEllipse(cx + 1, 40, 8, 4);
  crescent(g, cx, 102, 18, 16, 2, 4, COLORS.outline, 0.5);
}

// Точки дуги эллипса [x1, y1, …]: центр (cx, cy), полуоси rx и ry, от угла from до to.
function ellipsePoints(cx: number, cy: number, rx: number, ry: number, from: number, to: number): number[] {
  const steps = 8;
  const points: number[] = [];
  for (let i = 0; i <= steps; i++) {
    const angle = Phaser.Math.Linear(from, to, i / steps);
    points.push(cx + rx * Math.cos(angle), cy + ry * Math.sin(angle));
  }
  return points;
}

// Кострище: подтаявшая земля, кольцо камней, угли и два скрещённых полена.
// Пламя — отдельные картинки, чтобы оно могло мерцать.
function drawFirePit(g: Graphics): void {
  const { w, h } = FIRE_PIT_SIZE;
  const cx = w / 2;

  softEllipse(g, cx, h - 16, w, 34, COLORS.scorched, 0.18, 5);

  // Дальние камни (за поленьями).
  drawPitStone(g, 20, 38, 18, 12);
  drawPitStone(g, 36, 31, 18, 12);
  drawPitStone(g, 55, 29, 18, 12);
  drawPitStone(g, 74, 31, 18, 12);
  drawPitStone(g, 90, 38, 18, 12);

  // Угли с тлеющими точками.
  g.fillStyle(COLORS.charcoal, 1);
  g.fillEllipse(cx, 44, 66, 18);
  g.fillStyle(COLORS.ember, 0.8);
  g.fillCircle(cx - 8, 45, 3);
  g.fillCircle(cx + 10, 43, 2.5);
  g.fillCircle(cx + 2, 48, 2);

  drawLog(g, cx, 42, -0.35);
  drawLog(g, cx, 42, 0.35);

  // Ближние камни (перед поленьями).
  drawPitStone(g, 24, 51, 20, 13);
  drawPitStone(g, 43, 56, 20, 13);
  drawPitStone(g, 67, 56, 20, 13);
  drawPitStone(g, 86, 51, 20, 13);
}

// Камень кострища со снежной шапкой.
function drawPitStone(g: Graphics, x: number, y: number, width: number, height: number): void {
  g.fillStyle(COLORS.stoneDark, 1);
  g.fillEllipse(x, y, width, height);
  g.fillStyle(COLORS.stone, 1);
  g.fillEllipse(x - 1, y - 1.5, width - 4, height - 4);
  g.fillStyle(COLORS.snowLight, 1);
  g.fillEllipse(x - 1, y - height * 0.3, width * 0.55, height * 0.35);
  g.lineStyle(THIN_OUTLINE_WIDTH, COLORS.outline, 1);
  g.strokeEllipse(x, y, width, height);
}

// Полено, повёрнутое на угол angle (в радианах) вокруг точки (x, y).
function drawLog(g: Graphics, x: number, y: number, angle: number): void {
  // save/restore: поворот действует только на рисование между ними.
  g.save();
  g.translateCanvas(x, y);
  g.rotateCanvas(angle);

  g.fillStyle(COLORS.wood, 1);
  g.fillRoundedRect(-30, -6, 60, 12, 5);
  g.fillStyle(COLORS.woodDark, 1);
  g.fillRect(-26, 1, 52, 4);
  // Тлеющая полоска на полене.
  g.fillStyle(COLORS.ember, 1);
  g.fillRect(-12, -2, 18, 2);
  g.lineStyle(THIN_OUTLINE_WIDTH, COLORS.outline, 1);
  g.strokeRoundedRect(-30, -6, 60, 12, 5);
  // Светлые срезы на концах.
  g.fillStyle(COLORS.woodEnd, 1);
  g.fillEllipse(-27, 0, 6, 10);
  g.fillEllipse(27, 0, 6, 10);

  g.restore();
}

// Вертел: две рогатины по краям костра и палка поперёк, лежащая в развилках.
function drawSpit(g: Graphics): void {
  const { w, h } = SPIT_SIZE;
  const skewerY = 16;

  // Рогатины: столб и два рожка развилки.
  for (const x of [14, w - 14]) {
    limb(g, x, h - 2, x, skewerY + 4, 7, COLORS.wood);
    limb(g, x, skewerY + 6, x - 7, skewerY - 8, 5, COLORS.wood);
    limb(g, x, skewerY + 6, x + 7, skewerY - 8, 5, COLORS.wood);
  }
  // Палка вертела поверх рогатин.
  limb(g, 4, skewerY, w - 4, skewerY, 5, COLORS.woodLight);
}

// Стол лагеря (ключ картинки по-прежнему stoneTable): столешница из трёх досок
// и толстый передний брус с деревянными гвоздями, на двух пнях в снегу.
// Для уюта — деревянная миска и косточка.
function drawStoneTable(g: Graphics): void {
  const { w, h } = STONE_TABLE_SIZE;
  const cx = w / 2;

  // Мягкая тень под столом — он стоит на снегу, а не висит в воздухе.
  softEllipse(g, cx, h - 10, w - 30, 26, COLORS.shadow, 0.05, 8);

  // Пни-ножки: правая сторона в тени, трещина коры, снег у подножия.
  for (const x of [62, w - 62]) {
    const stump = [x - 20, h - 8, x - 16, 100, x + 16, 100, x + 20, h - 8];
    fillPolygon(g, stump, COLORS.wood);
    fillPolygon(g, [x + 4, 100, x + 16, 100, x + 20, h - 8, x + 6, h - 8], COLORS.woodDark);
    g.lineStyle(THIN_OUTLINE_WIDTH, COLORS.woodDark, 1);
    g.lineBetween(x - 8, 106, x - 9, h - 14);
    strokePolygon(g, stump);
    g.fillStyle(COLORS.snow, 1);
    g.fillEllipse(x, h - 8, 60, 14);
  }

  // Толстый передний брус и три доски столешницы (каждая чуть шире предыдущей).
  const front = [10, 76, w - 10, 76, w - 12, 104, 12, 104];
  fillPolygon(g, front, COLORS.woodDark);
  strokePolygon(g, front);
  const planks: [number, number, number][] = [
    [28, 44, COLORS.woodLight],
    [44, 60, COLORS.wood],
    [60, 76, COLORS.woodLight],
  ];
  for (const [top, bottom, color] of planks) {
    const widen = (top - 28) * 0.1;
    const plank = [16 - widen, top, w - 16 + widen, top, w - 10, bottom, 10, bottom];
    fillPolygon(g, plank, color);
    strokePolygon(g, plank);
    // Волокна дерева.
    g.lineStyle(1.2, COLORS.woodDark, 0.8);
    g.lineBetween(40, (top + bottom) / 2, 90, (top + bottom) / 2 + 1);
    g.lineBetween(150, (top + bottom) / 2 - 1, 200, (top + bottom) / 2);
  }
  // Деревянные гвозди-колышки на брусе.
  g.fillStyle(COLORS.woodEnd, 1);
  for (const x of [30, 80, 160, 210]) g.fillCircle(x, 90, 2.4);

  // Деревянная миска справа и косточка слева.
  outlinedEllipse(g, cx + 86, 47, 28, 13, COLORS.wood);
  g.fillStyle(COLORS.woodDark, 1);
  g.fillEllipse(cx + 86, 45, 20, 6);
  limb(g, cx - 82, 66, cx - 64, 62, 4, COLORS.bone);
  outlinedCircle(g, cx - 84, 64, 3.5, COLORS.bone);
  outlinedCircle(g, cx - 62, 60, 3.5, COLORS.bone);
}

// Язык пламени: несколько «капель» одна в другой — от красного края до почти белой середины.
function drawFlame(g: Graphics): void {
  const { w, h } = FLAME_SIZE;
  const cx = w / 2;
  const width = w - 4;
  const height = h - 4;
  const bottom = h - 2;

  fillFlameDrop(g, cx, bottom, width, height, COLORS.fireRed);
  fillFlameDrop(g, cx, bottom - 2, width * 0.74, height * 0.76, COLORS.fireOrange);
  fillFlameDrop(g, cx, bottom - 4, width * 0.5, height * 0.52, COLORS.fireYellow);
  fillFlameDrop(g, cx, bottom - 5, width * 0.26, height * 0.3, COLORS.fireCore);
}

// Капля огня: снизу круглая, сверху острая. Точки контура считаются по формуле «капли».
function fillFlameDrop(g: Graphics, cx: number, bottom: number, width: number, height: number, color: number): void {
  const points: Phaser.Math.Vector2[] = [];
  for (let i = 0; i < FLAME_POINTS; i++) {
    // t обходит контур по кругу: 0 — верхний кончик, π — самый низ.
    const t = (i / FLAME_POINTS) * Math.PI * 2;
    // sin(t)·sin(t/2): у кончика ширина 0, а шире всего — ниже середины.
    // Множитель 0.65 подобран так, чтобы самая широкая часть была равна width.
    const x = cx + width * 0.65 * Math.sin(t) * Math.sin(t / 2);
    const y = bottom - (height / 2) * (1 + Math.cos(t));
    points.push(new Phaser.Math.Vector2(x, y));
  }
  g.fillStyle(color, 1);
  g.fillPoints(points, true);
}

// Мягкий белый круг: в середине плотный, к краю прозрачный.
// Белый — чтобы в игре его можно было покрасить (tint) в любой цвет света.
function drawGlow(g: Graphics): void {
  const { w, h } = GLOW_SIZE;
  softEllipse(g, w / 2, h / 2, w, h, COLORS.white, 0.06, 14);
}

// ===== Частицы =====

// Искра: белая точка с мягким краем. Цвет задаёт эмиттер частиц.
function drawSpark(g: Graphics): void {
  const center = SPARK_SIZE.w / 2;
  g.fillStyle(COLORS.white, 0.4);
  g.fillCircle(center, center, center);
  g.fillStyle(COLORS.white, 1);
  g.fillCircle(center, center, center * 0.55);
}

// Снежинка: белая точка с голубоватым краем — так её видно и на белом снегу.
function drawSnowflake(g: Graphics): void {
  const center = SNOWFLAKE_SIZE.w / 2;
  g.fillStyle(COLORS.snowDeep, 0.45);
  g.fillCircle(center, center, center);
  g.fillStyle(COLORS.snowLight, 1);
  g.fillCircle(center, center, center * 0.6);
}

// Щепка: светлый кусочек дерева с тёмным краем.
function drawChip(g: Graphics): void {
  const chip = [1, 5, 4, 1, 11, 2, 10, 7, 3, 8];
  fillPolygon(g, chip, COLORS.woodEnd);
  g.lineStyle(1.5, COLORS.woodDark, 1);
  g.strokePoints(toPoints(chip), true, true);
}

// ===== Интерфейс =====

// Плашка HUD: каменная плашка во всю картинку (отступ 2 сверху и по бокам, снизу — место под тень).
function drawHudPanel(g: Graphics): void {
  const { w, h } = HUD_PANEL_SIZE;
  drawStonePlate(g, 2, 2, w - 4, h - 8);
}

// Каменная плашка — как таблички и кнопки. Скругление углов (у низкой плашки —
// не больше половины высоты), светлая кромка сверху с отступом от углов,
// тёмное «окошко» под цифры и текст: отступ по бокам и сверху, ниже краёв на столько.
const PLATE_RADIUS = 14;
const PLATE_RIM_INSET = 12;
const PLATE_WINDOW_SIDE = 4;
const PLATE_WINDOW_TOP = 7;
const PLATE_WINDOW_SHRINK = 10;
// Запас вокруг плашки в картинке: обводка ложится по краю, и без запаса половина
// её обрезалась бы (на прямых сторонах линия стала бы тоньше, чем на углах).
const PLATE_MARGIN = 2;

// Каменная плашка размером width × height — в картинку key (с запасом PLATE_MARGIN
// со всех сторон, середина картинки — середина плашки). Рисуется так же, как
// плашка HUD, поэтому все плашки выглядят одинаково. Картинка с таким ключом уже
// есть (плашку подсказки перерисовывают под новый текст) — старую удаляем.
export function bakeStonePlate(scene: Phaser.Scene, key: string, width: number, height: number): void {
  if (scene.textures.exists(key)) scene.textures.remove(key);
  bake(scene, key, { w: width + PLATE_MARGIN * 2, h: height + PLATE_MARGIN * 2 }, (g) =>
    drawStonePlate(g, PLATE_MARGIN, PLATE_MARGIN, width, height),
  );
}

// Каменная плашка любого размера: тонкая светлая кромка сверху, тёмный торец снизу
// и тёмное «окошко» почти на всю высоту. Рисуется сразу нужного размера, а не
// растягивается, — поэтому углы и кромка у всех плашек одинаковые, длиннее
// становятся только прямые линии. (left, top) — левый верхний угол.
// Так рисуются плашка HUD, плашка подсказки, плашка звёзд, плашки метели и модификаторов.
function drawStonePlate(g: Graphics, left: number, top: number, width: number, height: number): void {
  const radius = Math.min(PLATE_RADIUS, height / 2);
  const windowHeight = height - PLATE_WINDOW_SHRINK;
  const windowRadius = Math.min(radius - PLATE_WINDOW_SIDE, windowHeight / 2);

  g.fillStyle(COLORS.tabletDark, 1);
  g.fillRoundedRect(left, top, width, height, radius);
  g.fillStyle(COLORS.tablet, 1);
  g.fillRoundedRect(left, top, width, height - 1, radius);
  g.lineStyle(2, COLORS.tabletLight, 1);
  g.lineBetween(left + PLATE_RIM_INSET, top + 3, left + width - PLATE_RIM_INSET, top + 3);
  g.fillStyle(COLORS.outline, 0.45);
  g.fillRoundedRect(left + PLATE_WINDOW_SIDE, top + PLATE_WINDOW_TOP, width - PLATE_WINDOW_SIDE * 2, windowHeight, windowRadius);
  g.lineStyle(OUTLINE_WIDTH, COLORS.outline, 1);
  g.strokeRoundedRect(left, top, width, height, radius);
}

// Подложка шкалы жара: тёмная скруглённая полоска со светлой рамкой и тёмной обводкой.
function drawHeatBarBack(g: Graphics): void {
  const { w, h } = HEAT_BAR_BACK_SIZE;
  const radius = h / 2 - 2;

  g.fillStyle(COLORS.outline, 1);
  g.fillRoundedRect(0, 0, w, h, radius + 2);
  g.fillStyle(COLORS.heatBarBack, 1);
  g.fillRoundedRect(2, 2, w - 4, h - 4, radius);
  g.lineStyle(2, COLORS.zoneBorder, 0.8);
  g.strokeRoundedRect(3, 3, w - 6, h - 6, radius - 1);
}

// Заливка шкалы жара: белая полоска с тенью снизу. Цвет задаёт tint.
function drawHeatBarFill(g: Graphics): void {
  const { w, h } = HEAT_BAR_FILL_SIZE;
  const radius = h / 2;

  g.fillStyle(COLORS.white, 1);
  g.fillRoundedRect(0, 0, w, h, radius);
  // Тень по низу: после покраски она темнее — полоска выглядит выпуклой.
  g.fillStyle(COLORS.outline, 0.25);
  g.fillRoundedRect(2, h / 2, w - 4, h / 2 - 1, radius / 2);
}

// Солнце: жёлтый круг с обводкой и восемь коротких лучей вокруг.
function drawSunIcon(g: Graphics): void {
  const { w } = SUN_ICON_SIZE;
  const center = w / 2;
  const rays = 8;

  for (let i = 0; i < rays; i++) {
    const angle = (i / rays) * Math.PI * 2;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    limb(g, center + cos * 13, center + sin * 13, center + cos * 16, center + sin * 16, 4, COLORS.sunRay);
  }
  outlinedCircle(g, center, center, 11, COLORS.sun);
  // Блик на солнце.
  g.fillStyle(COLORS.white, 0.6);
  g.fillCircle(center - 4, center - 4, 3);
}

// Луна: светлый круг с обводкой и тремя кратерами.
function drawMoonIcon(g: Graphics): void {
  const { w, h } = MOON_ICON_SIZE;
  const cx = w / 2;
  const cy = h / 2;

  outlinedCircle(g, cx, cy, cx - OUTLINE_WIDTH, COLORS.moon);
  // Кратеры — круги чуть темнее луны.
  g.fillStyle(COLORS.moonShade, 1);
  g.fillCircle(cx - 6, cy - 4, 5);
  g.fillCircle(cx + 6, cy + 5, 4);
  g.fillCircle(cx + 5, cy - 8, 2.5);
}

// ===== Каменные таблички =====

// Плита таблички в своей картинке: отступ слева и справа (там свисает снег)
// и сверху (там лежит снег).
const TABLET_SLAB_SIDE = 18;
const TABLET_SLAB_TOP = 34;
// Снег на табличке: толщина ровного слоя над плитой.
const TABLET_SNOW_THICKNESS = 20;
// Наплывы снега по углам: на сколько ниже верха плиты середина круглого низа
// наплыва и его радиус. Слева наплыв длиннее — так выглядит естественнее.
const TABLET_DROOP_LEFT_Y = 46;
const TABLET_DROOP_LEFT_RADIUS = 13;
const TABLET_DROOP_RIGHT_Y = 34;
const TABLET_DROOP_RIGHT_RADIUS = 11;

// Каменная табличка любого размера: плита со скошенными углами, тёмная снизу,
// пара трещин и снег по верху, который на углах свисает за край плиты.
// Из неё сделаны и окно паузы и итогов, и баннер смены дня и ночи.
function drawStoneSlab(g: Graphics, size: Size): void {
  const { w, h } = size;
  const left = TABLET_SLAB_SIDE;
  const right = w - TABLET_SLAB_SIDE;
  const top = TABLET_SLAB_TOP;
  // Нижний край чуть выше края картинки, чтобы под плитой поместилась тень.
  const bottom = h - 10;
  // Высота плиты: от неё считаются тёмный низ и трещины, чтобы они подходили к любому размеру.
  const slabHeight = bottom - top;
  const darkTop = bottom - Math.round(slabHeight * 0.18);
  const slab = [
    left + 12, top + 4, right - 20, top, right, top + 24, right - 4, bottom - 22,
    right - 24, bottom, left + 18, bottom - 4, left, bottom - 28, left + 2, top + 30,
  ];

  // Тень под плитой.
  g.fillStyle(COLORS.shadow, 0.35);
  g.fillEllipse(w / 2, bottom + 2, right - left - 30, 22);

  fillPolygon(g, slab, COLORS.tablet);
  // Тёмная нижняя часть — плита выглядит толстой.
  fillPolygon(
    g,
    [left + 2, darkTop, right - 3, darkTop + 4, right - 4, bottom - 22, right - 24, bottom, left + 18, bottom - 4, left, bottom - 28],
    COLORS.tabletDark,
  );
  // Трещины.
  g.lineStyle(THIN_OUTLINE_WIDTH, COLORS.tabletDark, 1);
  const crack = (share: number): number => top + slabHeight * share;
  g.strokePoints(toPoints([left + 22, crack(0.24), left + 40, crack(0.33), left + 34, crack(0.42)]), false);
  g.strokePoints(
    toPoints([right - 32, crack(0.28), right - 52, crack(0.37), right - 44, crack(0.49), right - 62, crack(0.57)]),
    false,
  );
  strokePolygon(g, slab);

  drawTabletSnow(g, left, right, top);
}

// Снег на табличке — один многоугольник: ровный слой с лёгкими волнами по верху,
// волнистая нижняя кромка, а на углах снег переваливается через край плиты
// и свисает наплывами с круглым низом. Обход контура — по часовой стрелке.
function drawTabletSnow(g: Graphics, left: number, right: number, top: number): void {
  // Верх плиты чуть наклонён: у левого угла на 4 пикселя ниже, чем у правого.
  const slabTopY = (x: number): number => top + 4 - (4 * (x - (left + 12))) / (right - 20 - (left + 12));
  const leftDroopY = top + TABLET_DROOP_LEFT_Y;
  const rightDroopY = top + TABLET_DROOP_RIGHT_Y;

  // Нижняя кромка слоя справа налево: волны чуть ниже верха плиты.
  const lowerEdge: number[] = [];
  for (let x = right - 30; x > left + 30; x -= 10) {
    lowerEdge.push(x, slabTopY(x) + 10 + 3 * Math.sin(x * 0.07));
  }

  // Верх слоя слева направо: ровно над плитой, с едва заметными волнами.
  // envelope гасит волны у краёв, чтобы они плавно переходили в скруглённые углы.
  const upperEdge: number[] = [];
  const from = left + 14;
  const to = right - 22;
  for (let x = from + 10; x < to; x += 10) {
    const envelope = Math.sin((Math.PI * (x - from)) / (to - from));
    const wave = (2 * Math.sin(x * 0.045) + 1.2 * Math.sin(x * 0.11 + 1)) * envelope;
    upperEdge.push(x, slabTopY(x) - TABLET_SNOW_THICKNESS + wave);
  }

  const outline = [
    // Левый угол: снизу вверх по наружной стороне наплыва и через скруглённый угол.
    ...arcPoints(from, top + 4, 22, Math.PI, Math.PI * 1.5),
    ...upperEdge,
    // Правый угол и правый наплыв: вниз снаружи плиты, круглый низ, вверх уже над плитой.
    ...arcPoints(to, top + 2, 22, -Math.PI / 2, 0),
    right + 1, top + 16,
    ...arcPoints(right - 8, rightDroopY, TABLET_DROOP_RIGHT_RADIUS, 0, Math.PI),
    right - 20, top + 18,
    right - 26, top + 12,
    ...lowerEdge,
    // Левый наплыв: вниз над плитой, круглый низ, вверх снаружи плиты.
    left + 24, top + 14,
    left + 18, top + 22,
    ...arcPoints(left + 5, leftDroopY, TABLET_DROOP_LEFT_RADIUS, 0, Math.PI),
    left - 8, top + 20,
  ];
  fillPolygon(g, outline, COLORS.snow);

  // Голубая тень вдоль нижней кромки — снег лежит толстым слоем.
  const shadeTop: number[] = [];
  for (let i = lowerEdge.length - 2; i >= 0; i -= 2) {
    shadeTop.push(lowerEdge[i], lowerEdge[i + 1] - 6);
  }
  fillPolygon(g, [...lowerEdge, ...shadeTop], COLORS.snowShade);
  // Тень и на круглых низах наплывов.
  g.fillStyle(COLORS.snowShade, 1);
  for (const [x, y, r] of [
    [right - 8, rightDroopY, TABLET_DROOP_RIGHT_RADIUS],
    [left + 5, leftDroopY, TABLET_DROOP_LEFT_RADIUS],
  ]) {
    g.beginPath();
    g.arc(x, y, r, Math.PI * 0.11, Math.PI * 0.89);
    g.closePath();
    g.fillPath();
  }

  strokePolygon(g, outline);

  // Блики на верху слоя.
  g.fillStyle(COLORS.snowLight, 1);
  g.fillRoundedRect(left + 50, top - 12, 120, 4, 2);
  g.fillRoundedRect(right - 210, top - 15, 90, 4, 2);
}

// Каменная кнопка: скруглённая плита с тёмным «торцом» снизу — будто её можно нажать.
function drawStoneButton(g: Graphics): void {
  const { w, h } = STONE_BUTTON_SIZE;
  const radius = 16;
  const lip = 8;

  // Торец кнопки (видно снизу).
  g.fillStyle(COLORS.tabletDark, 1);
  g.fillRoundedRect(2, lip, w - 4, h - lip - 2, radius);
  // Лицевая сторона.
  g.fillStyle(COLORS.tablet, 1);
  g.fillRoundedRect(2, 2, w - 4, h - lip - 4, radius);
  // Светлая кромка по верху.
  g.fillStyle(COLORS.tabletLight, 1);
  g.fillRoundedRect(10, 5, w - 20, 8, 4);
  g.lineStyle(OUTLINE_WIDTH, COLORS.outline, 1);
  g.strokeRoundedRect(2, 2, w - 4, h - 4, radius);
}

// Кнопка паузы: круглый камень с тёмным «торцом» снизу и двумя светлыми полосками.
function drawPauseButton(g: Graphics): void {
  const { w } = PAUSE_BUTTON_SIZE;
  const cx = w / 2;
  const radius = cx - OUTLINE_WIDTH;
  const lip = 4;

  // Торец снизу и лицевая сторона.
  outlinedCircle(g, cx, cx + lip / 2, radius - lip / 2, COLORS.tabletDark);
  g.fillStyle(COLORS.tablet, 1);
  g.fillCircle(cx, cx - lip / 2, radius - lip);
  // Две полоски «пауза».
  g.fillStyle(COLORS.outline, 1);
  g.fillRoundedRect(cx - 12, cx - 15, 9, 24, 3);
  g.fillRoundedRect(cx + 3, cx - 15, 9, 24, 3);
  g.fillStyle(COLORS.hudText, 1);
  g.fillRoundedRect(cx - 11, cx - 14, 7, 22, 2);
  g.fillRoundedRect(cx + 4, cx - 14, 7, 22, 2);
}

// ===== Меню: карта эпох и уровней =====

// Круглый камень-медальон для кнопок меню: бронзовый обод с бликом и заклёпками,
// внутри — камень с тенью полумесяцем. Номер уровня или иконку эпохи кладёт сверху MenuScene.
function drawRoundStone(g: Graphics): void {
  const { w } = ROUND_STONE_SIZE;
  const cx = w / 2;
  const radius = cx - OUTLINE_WIDTH;
  // Ширина бронзового обода и сколько на нём заклёпок.
  const rim = 8;
  const rivets = 8;

  outlinedCircle(g, cx, cx, radius, COLORS.bronze);
  g.lineStyle(2, COLORS.bronzeLight, 1);
  g.beginPath();
  g.arc(cx, cx, radius - 3, Math.PI * 1.05, Math.PI * 1.6);
  g.strokePath();
  outlinedCircle(g, cx, cx + 1, radius - rim, COLORS.tablet);
  crescent(g, cx, cx + 1, radius - rim - 2, radius - rim - 2, -4, -4, COLORS.tabletDark, 0.6);
  g.fillStyle(COLORS.bronzeDark, 1);
  for (let i = 0; i < rivets; i++) {
    const angle = (i / rivets) * Math.PI * 2 + Math.PI / rivets;
    g.fillCircle(cx + Math.cos(angle) * (radius - 4), cx + Math.sin(angle) * (radius - 4), 1.8);
  }
}

// Замок: дужка и бронзовый корпус с замочной скважиной.
function drawLock(g: Graphics): void {
  const { w, h } = LOCK_SIZE;
  const cx = w / 2;
  // Дужка: тёмная обводка, поверх — светлый металл.
  g.lineStyle(7, COLORS.outline, 1);
  g.beginPath();
  g.arc(cx, 14, 8, Math.PI, 0);
  g.strokePath();
  g.lineStyle(3, COLORS.stoneLight, 1);
  g.beginPath();
  g.arc(cx, 14, 8, Math.PI, 0);
  g.strokePath();
  // Корпус.
  g.fillStyle(COLORS.bronze, 1);
  g.fillRoundedRect(3, 14, w - 6, h - 17, 4);
  g.fillStyle(COLORS.bronzeLight, 1);
  g.fillRect(6, 17, w - 12, 3);
  g.lineStyle(OUTLINE_WIDTH, COLORS.outline, 1);
  g.strokeRoundedRect(3, 14, w - 6, h - 17, 4);
  // Замочная скважина.
  g.fillStyle(COLORS.outline, 1);
  g.fillCircle(cx, 24, 3);
  g.fillRect(cx - 1.5, 24, 3, 6);
}

// Пятиконечная звезда: белая (цвет задаёт tint), с тёмной обводкой.
function drawStar(g: Graphics): void {
  const { w } = STAR_SIZE;
  const cx = w / 2;
  const outer = cx - OUTLINE_WIDTH;
  const inner = outer * 0.45;
  const points: number[] = [];
  for (let i = 0; i < 10; i++) {
    // Начинаем с верхнего луча; внешние и внутренние точки чередуются.
    const angle = -Math.PI / 2 + (i * Math.PI) / 5;
    const r = i % 2 === 0 ? outer : inner;
    points.push(cx + r * Math.cos(angle), cx + 1 + r * Math.sin(angle));
  }
  fillPolygon(g, points, COLORS.white);
  strokePolygon(g, points);

  // Искорка у вершины.
  g.fillStyle(COLORS.white, 1);
  g.fillRect(cx + 8, 3, 1.6, 7);
  g.fillRect(cx + 5.3, 5.7, 7, 1.6);
}

// Каменный век: костёр — два скрещённых полена и пламя.
function drawEpochStone(g: Graphics): void {
  limb(g, 14, 54, 50, 46, 8, COLORS.woodDark);
  limb(g, 14, 46, 50, 54, 8, COLORS.wood);
  const flame = [32, 6, 43, 22, 47, 36, 41, 46, 23, 46, 17, 36, 21, 22];
  fillPolygon(g, flame, COLORS.fireOrange);
  strokePolygon(g, flame);
  fillPolygon(g, [32, 20, 38, 32, 37, 43, 27, 43, 26, 32], COLORS.fireYellow);

  // Искры над костром.
  g.fillStyle(COLORS.fireYellow, 1);
  for (const [x, y] of [[22, 10], [44, 8], [36, 4]]) g.fillCircle(x, y, 1.8);
}

// Бронзовый век: наковальня с рогом слева.
function drawEpochBronze(g: Graphics): void {
  const anvil = [4, 22, 18, 18, 58, 18, 58, 29, 44, 31, 39, 43, 50, 52, 14, 52, 25, 43, 20, 31, 12, 28];
  fillPolygon(g, anvil, COLORS.bronze);
  // Тень под рабочей плитой и блик на ней.
  fillPolygon(g, [20, 31, 44, 31, 39, 43, 25, 43], COLORS.bronzeDark);
  g.fillStyle(COLORS.bronzeLight, 1);
  g.fillRect(18, 20, 38, 3);
  strokePolygon(g, anvil);

  // Молот на наковальне.
  limb(g, 36, 4, 50, 14, 3, COLORS.wood);
  const hammer = [30, 0, 40, 6, 36, 12, 26, 6];
  fillPolygon(g, hammer, COLORS.steelDark);
  strokePolygon(g, hammer);
}

// Средневековье: крепостная башня с зубцами, воротами и бойницей.
function drawEpochMedieval(g: Graphics): void {
  const tower = [17, 20, 47, 20, 45, 58, 19, 58];
  fillPolygon(g, tower, COLORS.stone);
  // Зубцы по верху башни.
  for (const x of [14, 28, 42]) {
    const merlon = [x, 9, x + 8, 9, x + 8, 21, x, 21];
    fillPolygon(g, merlon, COLORS.stoneLight);
    strokePolygon(g, merlon);
  }
  strokePolygon(g, tower);
  // Ворота с круглым верхом и узкая бойница.
  const gate = [...arcPoints(32, 48, 7, Math.PI, Math.PI * 2), 39, 58, 25, 58];
  fillPolygon(g, gate, COLORS.outline);
  g.fillStyle(COLORS.outline, 1);
  g.fillRoundedRect(30, 27, 4, 10, 2);

  // Кладка на башне.
  g.lineStyle(1, COLORS.stoneDark, 1);
  for (const y of [26, 32, 38]) g.lineBetween(20, y, 44, y);
}

// Эпоха пара: паровоз — котёл, труба с дымом, красная будка и колёса.
function drawEpochSteam(g: Graphics): void {
  outlinedCircle(g, 13, 9, 5, COLORS.snowShade);
  outlinedCircle(g, 21, 5, 4, COLORS.snowLight);
  const chimney = [12, 13, 20, 13, 19, 26, 13, 26];
  fillPolygon(g, chimney, COLORS.steelDark);
  strokePolygon(g, chimney);
  const boiler = [6, 26, 40, 26, 40, 44, 6, 44];
  fillPolygon(g, boiler, COLORS.steel);
  strokePolygon(g, boiler);
  const cab = [38, 16, 58, 16, 58, 44, 38, 44];
  fillPolygon(g, cab, COLORS.stationWall);
  strokePolygon(g, cab);
  const window = [43, 21, 53, 21, 53, 30, 43, 30];
  fillPolygon(g, window, COLORS.glass);
  strokePolygon(g, window);
  outlinedCircle(g, 16, 48, 7, COLORS.steelDark);
  outlinedCircle(g, 32, 48, 7, COLORS.steelDark);
  outlinedCircle(g, 49, 50, 5, COLORS.steelDark);

  // Рельсы под паровозом.
  g.lineStyle(2, COLORS.steelDark, 1);
  g.lineBetween(2, 58, 62, 58);
}

// Полярная станция: красный домик под снегом и мачта антенны (без флагов).
function drawEpochPolar(g: Graphics): void {
  // Мачта с перекладинами.
  g.lineStyle(5, COLORS.outline, 1);
  g.lineBetween(52, 56, 52, 6);
  g.lineStyle(2, COLORS.stoneLight, 1);
  g.lineBetween(52, 55, 52, 7);
  g.lineStyle(THIN_OUTLINE_WIDTH, COLORS.outline, 1);
  g.lineBetween(46, 14, 58, 14);
  g.lineBetween(47, 24, 57, 24);
  const wall = [8, 32, 44, 32, 44, 56, 8, 56];
  fillPolygon(g, wall, COLORS.stationWall);
  strokePolygon(g, wall);
  const roof = [4, 33, 26, 18, 48, 33];
  fillPolygon(g, roof, COLORS.snow);
  strokePolygon(g, roof);
  const window = [14, 38, 24, 38, 24, 47, 14, 47];
  fillPolygon(g, window, COLORS.glass);
  strokePolygon(g, window);
  const door = [30, 40, 39, 40, 39, 56, 30, 56];
  fillPolygon(g, door, COLORS.woodDark);
  strokePolygon(g, door);

  // Окно светится тёплым светом.
  g.fillStyle(COLORS.fireYellow, 1);
  g.fillRect(16, 40, 6, 5);
}

// Будущее: стеклянный купол колонии на металлическом основании.
function drawEpochFuture(g: Graphics): void {
  const dome = [...arcPoints(32, 46, 25, Math.PI, Math.PI * 2)];
  fillPolygon(g, dome, COLORS.glass);
  // Рёбра купола.
  g.lineStyle(THIN_OUTLINE_WIDTH, COLORS.steel, 1);
  g.lineBetween(32, 21, 32, 46);
  g.strokePoints(toPoints(arcPoints(32, 46, 13, Math.PI, Math.PI * 2)), false);
  // Блик на стекле.
  g.fillStyle(COLORS.snowLight, 1);
  g.fillEllipse(22, 32, 6, 10);
  strokePolygon(g, dome);
  const base = [4, 45, 60, 45, 56, 56, 8, 56];
  fillPolygon(g, base, COLORS.steel);
  strokePolygon(g, base);
  g.fillStyle(COLORS.fireYellow, 1);
  g.fillCircle(20, 51, 2);
  g.fillCircle(32, 51, 2);
  g.fillCircle(44, 51, 2);

  // Звёзды над куполом.
  g.fillStyle(COLORS.white, 1);
  for (const [x, y] of [[10, 10], [52, 8], [32, 4]]) g.fillCircle(x, y, 1.4);
}

// ===== Обучение =====

// Стрелка обучения: толстая янтарная стрелка остриём вниз, со светлым бликом.
function drawTutorialArrow(g: Graphics): void {
  const { w, h } = TUTORIAL_ARROW_SIZE;
  const cx = w / 2;
  const arrow = [cx - 9, 4, cx + 9, 4, cx + 9, 26, w - 4, 26, cx, h - 4, 4, 26, cx - 9, 26];
  fillPolygon(g, arrow, COLORS.titleAmber);
  fillPolygon(g, [cx - 5, 8, cx - 1, 8, cx - 1, 30, cx - 5, 30], COLORS.titleHighlight);
  strokePolygon(g, arrow);
}

// Кнопка звука: такой же круглый камень, как кнопка паузы, на нём динамик.
// isOn — звук включён (рядом волны) или выключен (динамик перечёркнут).
function drawSoundButton(g: Graphics, isOn: boolean): void {
  const { w } = PAUSE_BUTTON_SIZE;
  const cx = w / 2;
  const radius = cx - OUTLINE_WIDTH;
  const lip = 4;

  // Торец снизу и лицевая сторона.
  outlinedCircle(g, cx, cx + lip / 2, radius - lip / 2, COLORS.tabletDark);
  g.fillStyle(COLORS.tablet, 1);
  g.fillCircle(cx, cx - lip / 2, radius - lip);

  // Динамик: коробочка и раструб.
  const speaker = [cx - 15, cx - 8, cx - 8, cx - 8, cx + 1, cx - 15, cx + 1, cx + 11, cx - 8, cx + 4, cx - 15, cx + 4];
  fillPolygon(g, speaker, COLORS.hudText);
  strokePolygon(g, speaker);

  if (isOn) {
    // Две звуковые волны справа от динамика: тёмная обводка, поверх светлая дуга.
    for (const [width, color] of [
      [6, COLORS.outline],
      [3, COLORS.hudText],
    ]) {
      g.lineStyle(width, color, 1);
      g.beginPath();
      g.arc(cx + 2, cx - 2, 8, -0.8, 0.8);
      g.strokePath();
      g.beginPath();
      g.arc(cx + 2, cx - 2, 14, -0.8, 0.8);
      g.strokePath();
    }
    return;
  }

  // Звук выключен: красный крестик справа от динамика.
  for (const [width, color] of [
    [7, COLORS.outline],
    [4, COLORS.maxText],
  ]) {
    g.lineStyle(width, color, 1);
    g.lineBetween(cx + 6, cx - 9, cx + 17, cx + 4);
    g.lineBetween(cx + 17, cx - 9, cx + 6, cx + 4);
  }
}

// ===== Помощники рисования =====

// Рука или нога: толстая линия с круглыми концами от (x1, y1) до (x2, y2), с обводкой.
function limb(g: Graphics, x1: number, y1: number, x2: number, y2: number, width: number, color: number): void {
  // Сначала то же самое цветом обводки и чуть толще, потом поверх — нужным цветом.
  g.lineStyle(width + OUTLINE_WIDTH * 2, COLORS.outline, 1);
  g.lineBetween(x1, y1, x2, y2);
  g.fillStyle(COLORS.outline, 1);
  g.fillCircle(x1, y1, width / 2 + OUTLINE_WIDTH);
  g.fillCircle(x2, y2, width / 2 + OUTLINE_WIDTH);
  g.lineStyle(width, color, 1);
  g.lineBetween(x1, y1, x2, y2);
  g.fillStyle(color, 1);
  g.fillCircle(x1, y1, width / 2);
  g.fillCircle(x2, y2, width / 2);
}

// Рука или нога из нескольких отрезков (плечо → локоть → запястье) с одной общей обводкой:
// сначала все отрезки цветом обводки чуть толще, потом поверх — нужным цветом.
// Так в суставах не остаётся тёмных полос. points — [x1, y1, x2, y2, …].
function limbChain(g: Graphics, points: number[], width: number, color: number): void {
  for (const [lineColor, extra] of [[COLORS.outline, OUTLINE_WIDTH], [color, 0]]) {
    g.lineStyle(width + extra * 2, lineColor, 1);
    g.fillStyle(lineColor, 1);
    for (let i = 0; i < points.length; i += 2) {
      g.fillCircle(points[i], points[i + 1], width / 2 + extra);
      if (i + 3 < points.length) g.lineBetween(points[i], points[i + 1], points[i + 2], points[i + 3]);
    }
  }
}

// Закрашенный эллипс с тёмной обводкой.
function outlinedEllipse(g: Graphics, x: number, y: number, width: number, height: number, color: number): void {
  g.fillStyle(color, 1);
  g.fillEllipse(x, y, width, height);
  g.lineStyle(OUTLINE_WIDTH, COLORS.outline, 1);
  g.strokeEllipse(x, y, width, height);
}

// Закрашенный круг с тёмной обводкой.
function outlinedCircle(g: Graphics, x: number, y: number, radius: number, color: number): void {
  g.fillStyle(color, 1);
  g.fillCircle(x, y, radius);
  g.lineStyle(OUTLINE_WIDTH, COLORS.outline, 1);
  g.strokeCircle(x, y, radius);
}

// Несколько кругов с одной общей обводкой (копна волос, куст).
// blobs — список [x, y, радиус, x, y, радиус, …].
// Сначала рисуем все круги цвета обводки чуть больше, потом поверх — те же
// круги нужного цвета. Внутренние края скрываются, обводка остаётся только снаружи.
function outlinedBlobs(g: Graphics, blobs: number[], color: number): void {
  g.fillStyle(COLORS.outline, 1);
  for (let i = 0; i < blobs.length; i += 3) {
    g.fillCircle(blobs[i], blobs[i + 1], blobs[i + 2] + OUTLINE_WIDTH);
  }
  g.fillStyle(color, 1);
  for (let i = 0; i < blobs.length; i += 3) {
    g.fillCircle(blobs[i], blobs[i + 1], blobs[i + 2]);
  }
}

// Мягкий эллипс: несколько полупрозрачных слоёв от большого к маленькому.
// В середине слои накладываются и цвет гуще, к краю — прозрачнее.
// Так без градиентов получаются мягкие тени, пятна и свечение.
function softEllipse(
  g: Graphics,
  x: number,
  y: number,
  width: number,
  height: number,
  color: number,
  alphaPerLayer: number,
  layers: number,
): void {
  g.fillStyle(color, alphaPerLayer);
  for (let i = 0; i < layers; i++) {
    // k уменьшается от 1 почти до 0: каждый следующий слой меньше.
    const k = 1 - i / layers;
    g.fillEllipse(x, y, width * k, height * k);
  }
}

// Полумесяц тени (или света) у края эллипса (cx, cy, rx, ry): часть эллипса,
// которую не закрывает такой же эллипс, сдвинутый на (dx, dy).
// Тень получается с той стороны, откуда эллипс сдвинут: сдвиг влево-вверх — тень справа-снизу.
function crescent(g: Graphics, cx: number, cy: number, rx: number, ry: number, dx: number, dy: number, color: number, alpha = 1): void {
  // Середина полумесяца — в сторону, противоположную сдвигу.
  const center = Math.atan2(-dy, -dx);
  const steps = 24;
  const points: Phaser.Math.Vector2[] = [];
  // Внешний край — по эллипсу.
  for (let i = 0; i <= steps; i++) {
    const a = center - Math.PI / 2 + (i / steps) * Math.PI;
    points.push(new Phaser.Math.Vector2(cx + rx * Math.cos(a), cy + ry * Math.sin(a)));
  }
  // Внутренний край — по сдвинутому эллипсу, но не дальше внешнего.
  for (let i = steps; i >= 0; i--) {
    const a = center - Math.PI / 2 + (i / steps) * Math.PI;
    const x = cx + dx + rx * Math.cos(a);
    const y = cy + dy + ry * Math.sin(a);
    const nx = (x - cx) / rx;
    const ny = (y - cy) / ry;
    const k = Math.min(1, 1 / Math.max(1e-6, Math.sqrt(nx * nx + ny * ny)));
    points.push(new Phaser.Math.Vector2(cx + (x - cx) * k, cy + (y - cy) * k));
  }
  g.fillStyle(color, alpha);
  g.fillPoints(points, true);
}

// Гладкая замкнутая фигура через опорные точки [x, y, …] (кисти рук).
function smoothShape(coords: number[]): Phaser.Math.Vector2[] {
  const closed = [...coords, coords[0], coords[1]];
  return new Phaser.Curves.Spline(toPoints(closed)).getPoints(48);
}

// Плавная линия через опорные точки [x, y, …] (складки на пальцах).
function smoothLine(g: Graphics, coords: number[], width: number, color: number, alpha = 1): void {
  g.lineStyle(width, color, alpha);
  g.strokePoints(new Phaser.Curves.Spline(toPoints(coords)).getPoints(12), false);
}

// Точки дуги окружности [x1, y1, x2, y2, …]: центр (cx, cy), радиус r,
// от угла from до угла to (радианы, 0 — вправо, по часовой стрелке — вниз).
function arcPoints(cx: number, cy: number, r: number, from: number, to: number): number[] {
  const steps = 10;
  const points: number[] = [];
  for (let i = 0; i <= steps; i++) {
    const angle = Phaser.Math.Linear(from, to, i / steps);
    points.push(cx + r * Math.cos(angle), cy + r * Math.sin(angle));
  }
  return points;
}

// Превращает список чисел [x1, y1, x2, y2, …] в точки для Graphics.
function toPoints(coords: number[]): Phaser.Math.Vector2[] {
  const points: Phaser.Math.Vector2[] = [];
  for (let i = 0; i < coords.length; i += 2) {
    points.push(new Phaser.Math.Vector2(coords[i], coords[i + 1]));
  }
  return points;
}

// Закрашивает многоугольник по списку координат.
function fillPolygon(g: Graphics, coords: number[], color: number): void {
  g.fillStyle(color, 1);
  g.fillPoints(toPoints(coords), true);
}

// Обводит многоугольник тёмной обводкой.
function strokePolygon(g: Graphics, coords: number[]): void {
  g.lineStyle(OUTLINE_WIDTH, COLORS.outline, 1);
  g.strokePoints(toPoints(coords), true, true);
}
