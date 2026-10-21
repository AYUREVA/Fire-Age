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
  player: 'player', // вождь без ног, свободной руки и дубины, смотрит чуть вправо
  leg: 'leg', // нога в сапоге; вращается вокруг бедра (см. Player.ts)
  arm: 'arm', // свободная рука с кулаком; вращается вокруг плеча (см. Player.ts)
  club: 'club', // дубина с кулаком внизу; вращается вокруг кулака (см. Player.ts)
  axe: 'axe', // каменный топор с кулаком внизу (кулак — как у дубины)
  spear: 'spear', // копьё с кремнёвым наконечником и кулаком внизу
  axeIcon: 'axe-icon', // каменный топор без кулака — на точке покупки
  spearIcon: 'spear-icon', // копьё без кулака — на точке покупки
  ring: 'ring', // светлое кольцо под ногами вождя
  joystickBase: 'joystick-base', // круг джойстика
  joystickKnob: 'joystick-knob', // ручка джойстика
  rabbit: 'rabbit', // пушистый серо-бурый кролик, смотрит вправо; точка опоры — лапы
  wolf: 'wolf', // серый волк бежит вправо; точка опоры — лапы
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
  hut: 'hut', // хижина-шалаш из шкур на жердях, со снегом; точка опоры — низ
  buyZone: 'buy-zone', // круг точки покупки на снегу (кольцо оплаты и цену рисует BuyZone)
  firePit: 'fire-pit', // кострище: камни и поленья
  spit: 'spit', // вертел над костром: две рогатины и палка; точка опоры — низ
  stoneTable: 'stone-table', // каменный стол со шкурой: сюда кладут еду для путников
  flame: 'flame', // язык пламени; точка опоры — низ
  glow: 'glow', // мягкий белый круг; его красят в цвет света
  spark: 'spark', // искра костра (белая, цвет задаёт частица)
  nightLight: 'night-light', // ночная тьма со светлым пятном посередине (белая, красится tint)
  heatBarBack: 'heat-bar-back', // подложка шкалы жара над костром
  heatBarFill: 'heat-bar-fill', // заливка шкалы жара (белая, красится tint)
  hudPanel: 'hud-panel', // плашка интерфейса со скруглёнными углами
  moonIcon: 'moon-icon', // луна на плашке таймера: ночь, до рассвета
  sunIcon: 'sun-icon', // солнце на плашке таймера: день, до ночи
  stoneTablet: 'stone-tablet', // каменная табличка: пауза, итоги
  stoneBanner: 'stone-banner', // широкая низкая табличка: уведомление о смене дня и ночи
  stoneButton: 'stone-button', // каменная кнопка на табличке
  pauseButton: 'pause-button', // круглая каменная кнопка паузы в углу экрана
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
const CLUB_SIZE: Size = { w: 36, h: 92 };
const AXE_SIZE: Size = { w: 88, h: 100 };
const SPEAR_SIZE: Size = { w: 40, h: 150 };
// Клин топора ниже верхнего края картинки на столько пикселей.
const AXE_HEAD_SHIFT = 5;
const RING_SIZE: Size = { w: 90, h: 44 };
const JOYSTICK_BASE_SIZE: Size = { w: 128, h: 128 };
const JOYSTICK_KNOB_SIZE: Size = { w: 60, h: 60 };
const BUSH_SIZE: Size = { w: 124, h: 104 };
const RABBIT_SIZE: Size = { w: 64, h: 60 };
const WOLF_SIZE: Size = { w: 136, h: 94 };
// Рисунок волка сдвинут вправо и вниз: место для хвоста и кончиков ушей.
const WOLF_SHIFT_X = 4;
const WOLF_SHIFT_Y = 4;
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
const BUY_ZONE_SIZE: Size = { w: 180, h: 110 };
const HUT_SIZE: Size = { w: 170, h: 160 };
const FIRE_PIT_SIZE: Size = { w: 110, h: 64 };
const SPIT_SIZE: Size = { w: 170, h: 96 };
const STONE_TABLE_SIZE: Size = { w: 240, h: 150 };
const FLAME_SIZE: Size = { w: 64, h: 96 };
const GLOW_SIZE: Size = { w: 128, h: 128 };
const SPARK_SIZE: Size = { w: 8, h: 8 };
const NIGHT_LIGHT_SIZE: Size = { w: 256, h: 256 };
const HEAT_BAR_BACK_SIZE: Size = { w: 116, h: 24 };
const HEAT_BAR_FILL_SIZE: Size = { w: 104, h: 12 };
const HUD_PANEL_SIZE: Size = { w: 170, h: 66 };
const MOON_ICON_SIZE: Size = { w: 40, h: 40 };
const SUN_ICON_SIZE: Size = { w: 44, h: 44 };
const STONE_TABLET_SIZE: Size = { w: 540, h: 320 };
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
// Дубина: полуширина рукояти у кулака, радиус толстого конца
// и на сколько шагов делится её контур (больше — глаже).
const CLUB_HANDLE_HALF_WIDTH = 3.5;
const CLUB_TOP_RADIUS = 13;
const CLUB_STEPS = 16;
// Центр кулака на дубине — на столько пикселей выше нижнего края картинки
// Так же у топора и копья: кулак у всего оружия на одной высоте от низа картинки,
// вокруг него оружие вращается (Player.ts).
export const WEAPON_GRIP_FROM_BOTTOM = 13;
// Сжатый кулак (на дубине и у свободной руки): половина ширины и половина высоты.
const FIST_HALF_WIDTH = 7;
const FIST_HALF_HEIGHT = 7;
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
  bake(scene, TEXTURES.club, CLUB_SIZE, drawClub);
  bake(scene, TEXTURES.axe, AXE_SIZE, (g) => drawAxe(g, true));
  bake(scene, TEXTURES.spear, SPEAR_SIZE, (g) => drawSpear(g, true));
  bake(scene, TEXTURES.axeIcon, AXE_SIZE, (g) => drawAxe(g, false));
  bake(scene, TEXTURES.spearIcon, SPEAR_SIZE, (g) => drawSpear(g, false));
  bake(scene, TEXTURES.ring, RING_SIZE, drawRing);
  bake(scene, TEXTURES.joystickBase, JOYSTICK_BASE_SIZE, drawJoystickBase);
  bake(scene, TEXTURES.joystickKnob, JOYSTICK_KNOB_SIZE, drawJoystickKnob);
  bake(scene, TEXTURES.rabbit, RABBIT_SIZE, drawRabbit);
  bake(scene, TEXTURES.wolf, WOLF_SIZE, drawWolf);
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
  bake(scene, TEXTURES.rawMeat, MEAT_SIZE, (g) => drawMeat(g, COLORS.rawMeat, COLORS.rawMeatShade, COLORS.rawMeatLight));
  bake(scene, TEXTURES.cookedMeat, MEAT_SIZE, (g) =>
    drawMeat(g, COLORS.cookedMeat, COLORS.cookedMeatShade, COLORS.cookedMeatLight),
  );
  bake(scene, TEXTURES.snowflake, SNOWFLAKE_SIZE, drawSnowflake);
  bake(scene, TEXTURES.chip, CHIP_SIZE, drawChip);
  bake(scene, TEXTURES.dropZone, DROP_ZONE_SIZE, drawDropZone);
  bake(scene, TEXTURES.buyZone, BUY_ZONE_SIZE, drawBuyZone);
  bake(scene, TEXTURES.hut, HUT_SIZE, drawHut);
  bake(scene, TEXTURES.firePit, FIRE_PIT_SIZE, drawFirePit);
  bake(scene, TEXTURES.spit, SPIT_SIZE, drawSpit);
  bake(scene, TEXTURES.stoneTable, STONE_TABLE_SIZE, drawStoneTable);
  bake(scene, TEXTURES.flame, FLAME_SIZE, drawFlame);
  bake(scene, TEXTURES.glow, GLOW_SIZE, drawGlow);
  bake(scene, TEXTURES.spark, SPARK_SIZE, drawSpark);
  bakeNightLight(scene);
  bake(scene, TEXTURES.heatBarBack, HEAT_BAR_BACK_SIZE, drawHeatBarBack);
  bake(scene, TEXTURES.heatBarFill, HEAT_BAR_FILL_SIZE, drawHeatBarFill);
  bake(scene, TEXTURES.hudPanel, HUD_PANEL_SIZE, drawHudPanel);
  bake(scene, TEXTURES.moonIcon, MOON_ICON_SIZE, drawMoonIcon);
  bake(scene, TEXTURES.sunIcon, SUN_ICON_SIZE, drawSunIcon);
  bake(scene, TEXTURES.stoneTablet, STONE_TABLET_SIZE, (g) => drawStoneSlab(g, STONE_TABLET_SIZE));
  bake(scene, TEXTURES.stoneBanner, STONE_BANNER_SIZE, (g) => drawStoneSlab(g, STONE_BANNER_SIZE));
  bake(scene, TEXTURES.stoneButton, STONE_BUTTON_SIZE, drawStoneButton);
  bake(scene, TEXTURES.pauseButton, PAUSE_BUTTON_SIZE, drawPauseButton);
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
  // До 35% радиуса — совсем светло, дальше тьма плавно густеет до края круга.
  gradient.addColorStop(0, 'rgba(255, 255, 255, 0)');
  gradient.addColorStop(0.35, 'rgba(255, 255, 255, 0)');
  gradient.addColorStop(1, 'rgba(255, 255, 255, 1)');
  context.fillStyle = gradient;
  context.fillRect(0, 0, w, h);
  canvas.refresh();
}

// ===== Земля и мелкий декор =====

// Плитка снега: ровный снег, мягкие голубые тени, светлые пятна и крупинки.
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
}

// Пятно утоптанного снега: мягкое серо-голубое пятно.
function drawSnowPatch(g: Graphics): void {
  const { w, h } = SNOW_PATCH_SIZE;
  softEllipse(g, w / 2, h / 2, w, h, COLORS.snowTrodden, 0.16, 6);
  softEllipse(g, w / 2, h / 2 + 4, w * 0.6, h * 0.5, COLORS.snowShade, 0.12, 4);
}

// Сугроб: голубая тень у подножия, тело в тени снизу и светлое сверху.
function drawSnowDrift(g: Graphics): void {
  const { w, h } = SNOW_DRIFT_SIZE;
  softEllipse(g, w / 2, h - 14, w, 26, COLORS.snowDeep, 0.1, 5);
  g.fillStyle(COLORS.snowShade, 1);
  g.fillEllipse(w / 2, h * 0.55, w * 0.86, h * 0.62);
  g.fillStyle(COLORS.snowLight, 1);
  g.fillEllipse(w / 2 - 4, h * 0.48, w * 0.74, h * 0.5);
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

// Заснеженная ель: ствол и четыре яруса хвои со снежными шапками.
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

// Скала: камень с тёмной и светлой гранями, сверху снежная шапка.
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
// Ноги, свободная рука и дубина с кулаком — отдельные картинки,
// чтобы ноги шагали, рука махала, а дубиной можно было бить.
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

// Свободная рука: плечо сверху по центру (вокруг него рука качается),
// чуть согнутый локоть, кожаная обмотка на запястье и кулак внизу.
function drawArm(g: Graphics): void {
  const cx = ARM_SIZE.w / 2;
  // Плечо → локоть → запястье одной линией с общей обводкой.
  limbChain(g, [cx, 11, cx - 2, 25, cx + 1, 35], 11, COLORS.skin);
  // Тень вдоль руки и блик на плече.
  g.fillStyle(COLORS.skinShade, 1);
  g.fillEllipse(cx + 2.5, 24, 3.5, 14);
  g.fillStyle(COLORS.white, 0.35);
  g.fillEllipse(cx - 2, 12, 5, 4);
  // Кожаная обмотка на запястье и сжатый кулак — такой же, как на дубине, только пустой.
  limb(g, cx - 4, 34, cx + 6, 34, 4, COLORS.leather);
  drawFistBack(g, cx + 1, 41);
  drawFistFront(g, cx + 1, 41);
}

// ===== Кулак =====

// Задняя часть кулака — ладонь. У дубины она рисуется до рукояти, поэтому рукоять
// лежит в ладони, а пальцы (drawFistFront) потом обхватывают её спереди.
function drawFistBack(g: Graphics, x: number, y: number): void {
  g.fillStyle(COLORS.skinShade, 1);
  g.fillRoundedRect(x - FIST_HALF_WIDTH, y - FIST_HALF_HEIGHT, FIST_HALF_WIDTH * 2, FIST_HALF_HEIGHT * 2, 5);
  g.lineStyle(OUTLINE_WIDTH, COLORS.outline, 1);
  g.strokeRoundedRect(x - FIST_HALF_WIDTH, y - FIST_HALF_HEIGHT, FIST_HALF_WIDTH * 2, FIST_HALF_HEIGHT * 2, 5);
}

// Передняя часть кулака: четыре согнутых пальца поперёк рукояти, один под другим,
// и большой палец сверху наискосок — видно, что рука сжата.
function drawFistFront(g: Graphics, x: number, y: number): void {
  const fingerHeight = (FIST_HALF_HEIGHT * 2) / 4;
  for (let i = 0; i < 4; i++) {
    const top = y - FIST_HALF_HEIGHT + i * fingerHeight;
    g.fillStyle(COLORS.skin, 1);
    g.fillRoundedRect(x - FIST_HALF_WIDTH, top, FIST_HALF_WIDTH * 2, fingerHeight, 1.8);
    // Тень снизу пальца — палец круглый и загибается за рукоять.
    g.fillStyle(COLORS.skinShade, 1);
    g.fillRect(x - FIST_HALF_WIDTH + 1.5, top + fingerHeight - 1.2, FIST_HALF_WIDTH * 2 - 3, 1.2);
    g.lineStyle(1.2, COLORS.outline, 1);
    g.strokeRoundedRect(x - FIST_HALF_WIDTH, top, FIST_HALF_WIDTH * 2, fingerHeight, 1.8);
  }
  // Большой палец — сверху, поверх пальцев.
  limb(g, x - FIST_HALF_WIDTH + 1, y - FIST_HALF_HEIGHT + 1, x + 2, y - FIST_HALF_HEIGHT - 1, 4, COLORS.skin);
}

// Туловище, большая леопардовая шкура через плечо, пояс из верёвки и руки.
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

  // Круглые плечи по краям тела, снаружи бороды. Из них растут обе руки:
  // правая (с дубиной) нарисована здесь, левая (свободная) — отдельной картинкой.
  // Левое плечо — под ремнём шкуры, поэтому меховое.
  outlinedCircle(g, 30, 86, 8, COLORS.fur);
  g.fillStyle(COLORS.furLight, 1);
  g.fillEllipse(28, 82, 7, 4);
  outlinedCircle(g, 90, 86, 8, COLORS.skin);

  // Рука с дубиной: от правого плеча вбок к локтю и вниз к кулаку на рукояти,
  // бицепс в тени, кожаная обмотка на запястье. Кулак — на картинке дубины.
  limbChain(g, [90, 86, 98, 96, 100, 104], 11, COLORS.skin);
  g.fillStyle(COLORS.skinShade, 1);
  g.fillEllipse(97, 94, 4.5, 9);
  g.fillStyle(COLORS.white, 0.35);
  g.fillEllipse(88, 83, 7, 4);
  limb(g, 95, 102, 105, 102, 4, COLORS.leather);
}

// Голова почти анфас, как на картинке-образце: растрёпанная грива больше головы,
// лохматые брови, большие весёлые глаза, нос картошкой, широкая улыбка в лохматой бороде.
function drawPlayerHead(g: Graphics): void {
  // Грива: середина из кругов и пряди, торчащие во все стороны, с общей обводкой.
  drawShaggyMass(g, HAIR_BLOBS, hairLocks(), COLORS.hair);
  // Светлые пряди поверх — объём.
  drawLocks(g, hairLightLocks(), COLORS.hairLight);

  // Уши выглядывают по бокам.
  outlinedCircle(g, 36, 60, 6, COLORS.skin);
  outlinedCircle(g, 88, 60, 5.5, COLORS.skin);
  g.fillStyle(COLORS.skinShade, 1);
  g.fillCircle(36, 60, 3);
  g.fillCircle(88, 60, 2.5);

  // Голова и блик на лбу.
  outlinedEllipse(g, 62, 56, 52, 54, COLORS.skin);
  g.fillStyle(COLORS.white, 0.35);
  g.fillEllipse(56, 44, 20, 7);

  // Чёлка: «шапка» волос на макушке и пряди, свисающие на лоб вразнобой.
  // Обводку рисуем только у прядей — сначала их тёмный контур, потом шапку и сами пряди.
  g.fillStyle(COLORS.outline, 1);
  for (const lock of FRINGE_LOCKS) fillLock(g, lock, OUTLINE_WIDTH);
  g.fillStyle(COLORS.hair, 1);
  g.fillEllipse(62, 30, 50, 16);
  for (const lock of FRINGE_LOCKS) fillLock(g, lock, 0);
  drawLocks(g, [[52, 28, 100, 8, 2, 10], [68, 28, 75, 8, 2, -10]], COLORS.hairLight);

  // Большие весёлые глаза и лохматые брови дугой.
  drawRoundEye(g, 54, 54, 13, 15);
  drawRoundEye(g, 71, 54, 12, 14);
  outlinedBlobs(g, [47, 46, 2.2, 51, 43.5, 2.6, 55.5, 43, 2.6, 59, 44.5, 2], COLORS.hair);
  outlinedBlobs(g, [66, 44.5, 2, 69.5, 43, 2.6, 74, 43.5, 2.6, 78, 46, 2.2], COLORS.hair);

  // Румяные щёки.
  g.fillStyle(COLORS.cheek, 0.5);
  g.fillCircle(47, 66, 5);
  g.fillCircle(78, 66, 4.5);

  drawPlayerBeard(g);
  drawPlayerNose(g);
}

// Лохматая борода, широкая улыбка внутри неё и пышные усы.
function drawPlayerBeard(g: Graphics): void {
  drawShaggyMass(g, BEARD_BLOBS, beardLocks(), COLORS.hair);
  // Светлые пряди.
  drawLocks(g, [[52, 84, 100, 9, 2, 15], [63, 89, 90, 10, 2, -10], [74, 84, 80, 9, 2, -15]], COLORS.hairLight);

  // Широкая улыбка: тёмный рот, ряд верхних зубов и язык.
  g.fillStyle(COLORS.outline, 1);
  g.fillEllipse(63, 81, 20, 13);
  g.fillStyle(COLORS.eye, 1);
  g.fillRoundedRect(55, 76, 16, 4.5, 2);
  g.fillStyle(COLORS.tongue, 1);
  g.fillEllipse(63, 85, 11, 4.5);

  // Пышные усы двумя крыльями, концы загнуты вниз.
  drawShaggyMass(g, [57, 70, 5.5, 51, 72, 4.5, 47, 75, 3.5, 69, 70, 5.5, 75, 72, 4.5, 79, 75, 3.5], [], COLORS.hair);
  drawLocks(g, [[54, 69, 170, 6, 1.8, 0], [72, 69, 10, 6, 1.8, 0]], COLORS.hairLight);
}

// Нос картошкой: небольшой овальный (шире, чем выше), чуть красный,
// с ноздрями-крылышками по бокам и бликом.
function drawPlayerNose(g: Graphics): void {
  outlinedEllipse(g, 63, 65, 13, 10.5, COLORS.nose);
  // Крылышки ноздрей — короткие дуги внизу по бокам.
  g.lineStyle(1.5, COLORS.skinShade, 1);
  g.beginPath();
  g.arc(59.5, 66.5, 2.5, Math.PI * 0.5, Math.PI * 1.2);
  g.strokePath();
  g.beginPath();
  g.arc(66.5, 66.5, 2.5, -Math.PI * 0.2, Math.PI * 0.5);
  g.strokePath();
  g.fillStyle(COLORS.white, 0.6);
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

// ===== Дубина =====

// Дубина из цельного куска дерева: у кулака тонкая рукоять,
// к концу плавно расширяется до толстого закруглённого «набалдашника».
// Центр кулака — на WEAPON_GRIP_FROM_BOTTOM пикселей выше нижнего края: вокруг него дубина и вращается.
function drawClub(g: Graphics): void {
  const { w, h } = CLUB_SIZE;
  const cx = w / 2;

  // Контур: левый край снизу вверх, закругление сверху, правый край сверху вниз.
  const silhouette: number[] = [];
  for (let i = 0; i <= CLUB_STEPS; i++) {
    const t = i / CLUB_STEPS;
    silhouette.push(cx - clubHalfWidth(t), clubY(t));
  }
  for (let i = 1; i < CLUB_STEPS; i++) {
    // Полукруг сверху: угол от 180° (слева) через 270° (верх) до 360° (справа).
    const angle = Math.PI + (i / CLUB_STEPS) * Math.PI;
    silhouette.push(cx + Math.cos(angle) * CLUB_TOP_RADIUS, clubY(1) + Math.sin(angle) * CLUB_TOP_RADIUS);
  }
  for (let i = CLUB_STEPS; i >= 0; i--) {
    const t = i / CLUB_STEPS;
    silhouette.push(cx + clubHalfWidth(t) * clubBumps(t), clubY(t));
  }

  // Кулак обхватывает рукоять: ладонь — за рукоятью, пальцы — поверх неё.
  // Под кулаком выглядывает закруглённый конец рукояти.
  drawFistBack(g, cx, h - WEAPON_GRIP_FROM_BOTTOM);
  outlinedEllipse(g, cx, h - 4, 9, 5, COLORS.woodDark);

  fillPolygon(g, silhouette, COLORS.wood);
  drawClubShading(g, cx);
  drawClubGrain(g, cx);
  strokePolygon(g, silhouette);
  drawClubWrap(g, cx);

  drawFistFront(g, cx, h - WEAPON_GRIP_FROM_BOTTOM);
}

// Полуширина дубины на доле длины t (0 — у рукояти, 1 — у толстого конца).
// t в степени 1.8: сначала дубина почти не толстеет, потом всё быстрее.
function clubHalfWidth(t: number): number {
  return CLUB_HANDLE_HALF_WIDTH + (CLUB_TOP_RADIUS - CLUB_HANDLE_HALF_WIDTH) * Math.pow(t, 1.8);
}

// Высота точки на доле длины t: от низа рукояти до центра закругления наверху.
function clubY(t: number): number {
  return Phaser.Math.Linear(CLUB_SIZE.h - 4, CLUB_TOP_RADIUS + 2, t);
}

// Неровности правого края — дерево не бывает идеально гладким.
function clubBumps(t: number): number {
  return 1 + 0.06 * Math.sin(t * 14) * t;
}

// Объём: тень вдоль правой стороны и светлая полоса слева.
function drawClubShading(g: Graphics, cx: number): void {
  fillPolygon(g, clubStrip(cx, 0.35, 1), COLORS.woodDark);
  // Тень заходит и на правую часть закругления наверху.
  g.fillStyle(COLORS.woodDark, 1);
  g.slice(cx, clubY(1), CLUB_TOP_RADIUS, -Math.PI / 2 + 0.3, 0);
  g.fillPath();

  fillPolygon(g, clubStrip(cx, -0.7, -0.45), COLORS.woodLight);
}

// Полоса вдоль дубины между долями ширины from и to (−1 — левый край, 1 — правый).
function clubStrip(cx: number, from: number, to: number): number[] {
  const strip: number[] = [];
  for (let i = 0; i <= CLUB_STEPS; i++) {
    const t = i / CLUB_STEPS;
    strip.push(cx + clubHalfWidth(t) * from, clubY(t));
  }
  for (let i = CLUB_STEPS; i >= 0; i--) {
    const t = i / CLUB_STEPS;
    strip.push(cx + clubHalfWidth(t) * to * (to > 0.99 ? clubBumps(t) : 1), clubY(t));
  }
  return strip;
}

// Текстура дерева: продольные волокна вдоль расширения, два сучка с кольцами и трещинка.
function drawClubGrain(g: Graphics, cx: number): void {
  g.lineStyle(1.3, COLORS.woodDark, 0.8);
  for (const share of [-0.5, -0.15, 0.2]) {
    const points: Phaser.Math.Vector2[] = [];
    for (let i = 2; i <= CLUB_STEPS; i++) {
      const t = i / CLUB_STEPS;
      const wave = 0.8 * Math.sin(t * 10 + share * 7);
      points.push(new Phaser.Math.Vector2(cx + share * clubHalfWidth(t) + wave, clubY(t)));
    }
    g.strokePoints(points);
  }

  // Сучки: тёмное пятно и светлое кольцо вокруг.
  drawKnot(g, cx - 4, clubY(0.72), 7, 5);
  drawKnot(g, cx + 1, clubY(0.45), 4, 3);

  // Трещинка на толстом конце.
  g.lineStyle(1.5, COLORS.outline, 1);
  g.strokePoints(toPoints([cx + 3, 4, cx + 1, 9, cx + 4, 13, cx + 2, 17]));
}

// Сучок на дереве: тёмная серединка и светлое годовое кольцо.
function drawKnot(g: Graphics, x: number, y: number, width: number, height: number): void {
  g.fillStyle(COLORS.woodDark, 1);
  g.fillEllipse(x, y, width, height);
  g.lineStyle(1.2, COLORS.woodLight, 1);
  g.strokeEllipse(x, y, width + 4, height + 3);
  g.fillStyle(COLORS.outline, 0.6);
  g.fillEllipse(x, y, width * 0.4, height * 0.4);
}

// Кожаная обмотка рукояти над кулаком: три косые полоски.
function drawClubWrap(g: Graphics, cx: number): void {
  const half = CLUB_HANDLE_HALF_WIDTH + 1.5;
  for (const y of [CLUB_SIZE.h - 30, CLUB_SIZE.h - 25, CLUB_SIZE.h - 20]) {
    const band = [cx - half, y + 2, cx + half, y - 1, cx + half, y + 2, cx - half, y + 5];
    fillPolygon(g, band, COLORS.leather);
    g.lineStyle(1.2, COLORS.outline, 1);
    g.strokePoints(toPoints(band), true, true);
  }
}

// ===== Топор и копьё =====

// Каменный топор: рукоять, как у дубины, и тёсаный каменный клин справа,
// примотанный кожаным ремнём. Клин справа: в замахе он идёт вперёд-вниз.
// withFist — с кулаком (в руке вождя) или без (на точке покупки).
function drawAxe(g: Graphics, withFist: boolean): void {
  const { w, h } = AXE_SIZE;
  const cx = w / 2;
  const gripY = h - WEAPON_GRIP_FROM_BOTTOM;

  if (withFist) drawFistBack(g, cx, gripY);
  outlinedEllipse(g, cx, h - 4, 9, 5, COLORS.woodDark);
  // Рукоять чуть изогнута; светлая полоска — блик на дереве.
  limbChain(g, [cx, h - 6, cx - 1.5, h / 2, cx, 10], 8, COLORS.wood);
  g.lineStyle(2, COLORS.woodLight, 1);
  g.lineBetween(cx - 2.5, h - 16, cx - 2.5, 20);

  // Клин и ремень чуть ниже верха рукояти — сдвигаем рисунок вниз.
  g.save();
  g.translateCanvas(0, AXE_HEAD_SHIFT);
  // Каменный клин: узкий обух у рукояти расширяется вправо в лезвие с выпуклой кромкой.
  const head = [
    cx - 7, 17, cx + 10, 14, cx + 22, 7, cx + 31, 1,
    cx + 37, 10, cx + 39, 22, cx + 37, 35, cx + 31, 46,
    cx + 21, 39, cx + 10, 34, cx - 7, 33,
  ];
  fillPolygon(g, head, COLORS.stone);
  // Свет на верхней грани, тень на нижней.
  fillPolygon(g, [cx + 10, 14, cx + 22, 7, cx + 31, 1, cx + 35, 8, cx + 24, 16, cx + 10, 20], COLORS.stoneLight);
  fillPolygon(g, [cx + 10, 30, cx + 24, 32, cx + 36, 34, cx + 31, 46, cx + 21, 39, cx + 10, 34], COLORS.stoneDark);
  // Заточенная кромка лезвия — светлая полоса вдоль дуги.
  g.lineStyle(3, COLORS.snowLight, 0.95);
  g.strokePoints(toPoints([cx + 33, 6, cx + 35.5, 14, cx + 36.5, 24, cx + 35, 34, cx + 31, 41]), false);
  // Сколы от обтёсывания.
  g.lineStyle(1.5, COLORS.stoneDark, 1);
  g.lineBetween(cx + 18, 22, cx + 25, 27);
  g.lineBetween(cx + 6, 24, cx + 11, 28);
  strokePolygon(g, head);

  // Кожаный ремень крест-накрест держит клин на рукояти.
  for (const [y1, y2] of [[14, 34], [34, 14]]) {
    limb(g, cx - 6, y1, cx + 6, y2, 4, COLORS.leather);
  }

  g.restore();

  if (withFist) drawFistFront(g, cx, gripY);
}

// Копьё: длинное древко, кремнёвый наконечник-лист, обмотка и два пёрышка.
function drawSpear(g: Graphics, withFist: boolean): void {
  const { w, h } = SPEAR_SIZE;
  const cx = w / 2;
  const gripY = h - WEAPON_GRIP_FROM_BOTTOM;

  if (withFist) drawFistBack(g, cx, gripY);
  outlinedEllipse(g, cx, h - 4, 8, 5, COLORS.woodDark);
  limbChain(g, [cx, h - 6, cx, 40], 6, COLORS.wood);
  g.lineStyle(1.5, COLORS.woodLight, 1);
  g.lineBetween(cx - 1.5, h - 16, cx - 1.5, 46);

  // Два пёрышка под наконечником — красное и бирюзовое.
  drawFeather(g, cx - 3, 50, -0.5, COLORS.feather);
  drawFeather(g, cx + 3, 52, 0.5, COLORS.featherAlt);

  // Кремнёвый наконечник-лист: тёмный камень, светлая грань посередине.
  const tip = [cx, 3, cx + 9, 20, cx + 7, 36, cx, 42, cx - 7, 36, cx - 9, 20];
  fillPolygon(g, tip, COLORS.stoneDark);
  fillPolygon(g, [cx, 6, cx + 6, 20, cx + 4, 33, cx, 38], COLORS.stone);
  g.lineStyle(1.5, COLORS.stoneLight, 1);
  g.lineBetween(cx + 1, 9, cx + 3, 30);
  strokePolygon(g, tip);
  // Обмотка держит наконечник.
  for (const y of [40, 45]) {
    limb(g, cx - 4, y, cx + 4, y + 2, 3, COLORS.leather);
  }

  if (withFist) drawFistFront(g, cx, gripY);
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

// Связка хвороста: четыре палки, перевязанные двумя верёвками.
// Верх и низ ровные — из таких связок стопка получается аккуратной, как из монет.
function drawBundle(g: Graphics): void {
  // Палки сверху вниз: x левого конца, y верха, длина, цвет. Нижние перекрывают верхние.
  drawStick(g, 6, 3, 44, COLORS.woodLight);
  drawStick(g, 3, 8, 49, COLORS.wood);
  drawStick(g, 5, 13, 48, COLORS.woodLight);
  drawStick(g, 4, 18, 45, COLORS.wood);

  drawRopeBand(g, 17);
  drawRopeBand(g, 38);
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

// Сапоги и одежда колоколом: узкая у шеи, широкая внизу, правая сторона в тени,
// внизу светлая кайма.
function drawTravelerRobe(g: Graphics, color: number, shade: number): void {
  const { h } = TRAVELER_SIZE;
  const cx = TRAVELER_CX;

  outlinedEllipse(g, cx - 11, h - 7, 17, 11, COLORS.furDark);
  outlinedEllipse(g, cx + 11, h - 7, 17, 11, COLORS.furDark);
  const robe = [cx - 14, 46, cx + 14, 46, cx + 27, h - 16, cx - 27, h - 16];
  fillPolygon(g, robe, color);
  fillPolygon(g, [cx + 5, 47, cx + 14, 46, cx + 27, h - 16, cx + 11, h - 16], shade);
  strokePolygon(g, robe);
  g.fillStyle(COLORS.furLight, 1);
  g.fillRoundedRect(cx - 28, h - 21, 56, 9, 4);
  g.lineStyle(THIN_OUTLINE_WIDTH, COLORS.outline, 1);
  g.strokeRoundedRect(cx - 28, h - 21, 56, 9, 4);
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

// Лицо спереди: круглые глаза с белками, нос картошкой, румянец, улыбка.
function drawTravelerFace(g: Graphics): void {
  const cx = TRAVELER_CX;
  const y = TRAVELER_HEAD_Y;
  outlinedCircle(g, cx, y, 14, COLORS.skin);
  g.fillStyle(COLORS.cheek, 0.7);
  g.fillCircle(cx - 8, y + 5, 3.5);
  g.fillCircle(cx + 8, y + 5, 3.5);
  drawRoundEye(g, cx - 6, y - 2, 8, 9);
  drawRoundEye(g, cx + 6, y - 2, 8, 9);
  outlinedCircle(g, cx, y + 3, 3.5, COLORS.nose);
  g.lineStyle(2, COLORS.outline, 1);
  g.beginPath();
  g.arc(cx, y + 6, 4, Math.PI * 0.15, Math.PI * 0.85);
  g.strokePath();
}

// Охотник: пятнистая шкура, рыжие лохмы и борода, копьё. Со спины — котомка.
function drawHunter(g: Graphics, isFront: boolean): void {
  const cx = TRAVELER_CX;
  const y = TRAVELER_HEAD_Y;

  drawTravelerStick(g, cx + TRAVELER_STICK_X, true);
  drawTravelerRobe(g, COLORS.fur, COLORS.furShade);
  g.fillStyle(COLORS.furSpot, 1);
  for (const [x, sy, r] of [[cx - 8, 60, 3], [cx + 6, 70, 3.5], [cx - 12, 80, 3], [cx + 14, 86, 2.5], [cx - 2, 90, 3]]) {
    g.fillCircle(x, sy, r);
  }
  if (isFront) {
    // Лохматые рыжие волосы — круги с общей обводкой вокруг головы.
    outlinedBlobs(g, [cx - 12, y - 6, 9, cx, y - 11, 10, cx + 12, y - 6, 9, cx - 15, y + 4, 7, cx + 15, y + 4, 7], COLORS.hair);
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
    // Затылок — лохматая копна волос с парой светлых прядей. Котомка: мешок с верёвкой и заплаткой.
    outlinedBlobs(
      g,
      [cx - 8, y - 6, 10, cx + 8, y - 6, 10, cx - 10, y + 5, 9, cx + 10, y + 5, 9, cx, y + 9, 9, cx, y - 10, 9],
      COLORS.hair,
    );
    g.lineStyle(2.5, COLORS.hairLight, 1);
    g.lineBetween(cx - 6, y - 12, cx - 3, y - 2);
    g.lineBetween(cx + 4, y - 10, cx + 7, y + 1);
    g.lineBetween(cx - 1, y + 2, cx + 1, y + 12);
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

// Старец: серый плащ с капюшоном, длинная седая борода, посох с перьями.
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
  // Капюшон.
  outlinedCircle(g, cx, y - 1, 20, COLORS.elderCloakDark);

  if (isFront) {
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
    // Из-под капюшона на спину — седые пряди. Острый кончик капюшона.
    outlinedBlobs(g, [cx - 8, y + 16, 6, cx + 8, y + 16, 6, cx, y + 19, 6], COLORS.elderHair);
    const tip = [cx - 6, y - 18, cx, y - 26, cx + 6, y - 18];
    fillPolygon(g, tip, COLORS.elderCloakDark);
    strokePolygon(g, tip);
    g.lineStyle(THIN_OUTLINE_WIDTH, COLORS.outline, 0.6);
    g.lineBetween(cx, y - 18, cx, y + 12);
  }
}

// Девушка: светлая шубка, тёмные волосы с двумя косами и бусинами,
// ожерелье из клыков. Со спины — плетёная корзина.
function drawGirl(g: Graphics, isFront: boolean): void {
  const cx = TRAVELER_CX;
  const y = TRAVELER_HEAD_Y;

  drawTravelerRobe(g, COLORS.furLight, COLORS.fur);

  if (isFront) {
    // Волосы вокруг головы, косы по бокам лица до груди (на концах бусины).
    outlinedBlobs(g, [cx - 12, y - 5, 9, cx, y - 10, 10, cx + 12, y - 5, 9], COLORS.girlHair);
    drawBraid(g, cx - 14, y + 4, cx - 16, y + 30);
    drawBraid(g, cx + 14, y + 4, cx + 16, y + 30);
    drawTravelerFace(g);
    // Чёлка — выше глаз.
    outlinedBlobs(g, [cx - 7, y - 13, 6, cx + 7, y - 13, 6, cx, y - 15, 6], COLORS.girlHair);
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
    // Затылок и две косы, лежащие на плечах по бокам корзины.
    outlinedBlobs(g, [cx - 8, y - 2, 10, cx + 8, y - 2, 10, cx, y - 9, 10, cx, y + 5, 9], COLORS.girlHair);
    drawBraid(g, cx - 12, y + 10, cx - 22, y + 36);
    drawBraid(g, cx + 12, y + 10, cx + 22, y + 36);
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

// Пушистый серо-бурый кролик, смотрит вправо. Тело — из нескольких кругов,
// поэтому по краю видны вихры меха. Светлое брюхо и щёки, большие уши
// с розовым внутри (дальнее темнее), крупный блестящий глаз, хвостик-помпон.
// Лапы — внизу картинки.
function drawRabbit(g: Graphics): void {
  // Дальнее ухо (темнее) и ближнее — рисуются первыми, голова их перекрывает.
  drawRabbitEar(g, 40, 18, -0.45, COLORS.rabbitShade, COLORS.rabbitEarShade);
  drawRabbitEar(g, 47, 16, -0.12, COLORS.rabbitFur, COLORS.rabbitEar);
  // Хвостик-помпон.
  outlinedBlobs(g, [11, 38, 6, 14, 33, 5, 9, 34, 4], COLORS.rabbitBelly);
  // Пушистое тело: круги с общей обводкой, тень снизу, светлая спинка.
  outlinedBlobs(g, [22, 40, 14, 33, 38, 13, 15, 45, 10, 28, 47, 12, 37, 45, 10], COLORS.rabbitFur);
  g.fillStyle(COLORS.rabbitShade, 1);
  g.fillEllipse(24, 51, 26, 7);
  g.fillStyle(COLORS.rabbitLight, 1);
  g.fillEllipse(25, 33, 16, 6);
  // Светлое брюхо спереди.
  g.fillStyle(COLORS.rabbitBelly, 1);
  g.fillEllipse(38, 46, 12, 14);
  // Длинная задняя лапа и маленькая передняя.
  outlinedEllipse(g, 20, 55, 18, 6, COLORS.rabbitBelly);
  outlinedEllipse(g, 42, 55, 9, 5, COLORS.rabbitBelly);
  // Голова: светлая макушка и светлая мордочка спереди.
  outlinedCircle(g, 46, 30, 13, COLORS.rabbitFur);
  g.fillStyle(COLORS.rabbitLight, 1);
  g.fillEllipse(42, 22, 12, 5);
  g.fillStyle(COLORS.rabbitBelly, 1);
  g.fillEllipse(53, 36, 12, 9);
  // Большой блестящий глаз: тёмный, с двумя бликами.
  g.fillStyle(COLORS.rabbitEye, 1);
  g.fillEllipse(49, 27, 8, 9);
  g.fillStyle(COLORS.white, 1);
  g.fillCircle(50.8, 24.8, 2);
  g.fillCircle(47.8, 29.5, 1);
  // Нос и усы.
  g.fillStyle(COLORS.rabbitNose, 1);
  g.fillEllipse(58, 33, 5, 4);
  g.lineStyle(1, COLORS.outline, 0.45);
  g.lineBetween(56, 36, 63, 35);
  g.lineBetween(56, 37, 62, 40);
}

// Серый волк в беге, смотрит вправо. Сзади — пушистый хвост с белым кончиком,
// тело — вытянутая шерстяная масса со светлой грудью, впереди — голова
// с острыми ушами, длинной светлой мордой, жёлтым хитрым глазом и клыком.
function drawWolf(g: Graphics): void {
  const { h } = WOLF_SIZE;
  const ground = h - 5 - WOLF_SHIFT_Y;
  // Рисунок сдвинут, чтобы кончик хвоста и уши не вылезали за край картинки.
  g.save();
  g.translateCanvas(WOLF_SHIFT_X, WOLF_SHIFT_Y);

  // Дальние лапы — темнее (их закрывает тело).
  limbChain(g, [40, 58, 34, 70, 30, ground - 1], 10, COLORS.wolfDark);
  limbChain(g, [88, 60, 94, 72, 98, ground - 1], 10, COLORS.wolfDark);

  // Хвост: пушистая дуга вверх-назад с белым кончиком.
  outlinedBlobs(g, [26, 46, 10, 18, 38, 10, 12, 28, 9, 10, 18, 7], COLORS.wolf);
  g.fillStyle(COLORS.wolfBelly, 1);
  g.fillCircle(10, 16, 5);
  g.fillStyle(COLORS.wolfDark, 1);
  g.fillEllipse(18, 34, 10, 6);

  // Тело: круги с общей обводкой, тёмная спина, блик и светлое брюхо.
  outlinedBlobs(g, [40, 50, 17, 56, 47, 18, 72, 47, 17, 86, 51, 15, 60, 58, 13], COLORS.wolf);
  g.fillStyle(COLORS.wolfDark, 1);
  g.fillEllipse(60, 33, 50, 10);
  g.fillStyle(COLORS.wolfLight, 1);
  g.fillEllipse(54, 42, 30, 7);
  g.fillStyle(COLORS.wolfBelly, 1);
  g.fillEllipse(66, 64, 30, 8);

  // Ближние лапы: задняя отведена назад, передняя — вперёд (бег). Светлые лапки.
  limbChain(g, [44, 60, 38, 72, 34, ground], 11, COLORS.wolf);
  limbChain(g, [90, 62, 100, 72, 106, ground - 1], 11, COLORS.wolf);
  outlinedEllipse(g, 32, ground, 15, 7, COLORS.wolfBelly);
  outlinedEllipse(g, 108, ground - 1, 15, 7, COLORS.wolfBelly);

  // Пушистая светлая грудь под головой.
  outlinedBlobs(g, [93, 54, 9, 96, 61, 7, 90, 62, 6], COLORS.wolfBelly);

  // Уши: дальнее тёмное, ближнее с розовой серединкой.
  const farEar = [96, 24, 99, 4, 109, 18];
  fillPolygon(g, farEar, COLORS.wolfDark);
  strokePolygon(g, farEar);
  const ear = [104, 20, 113, 1, 119, 21];
  fillPolygon(g, ear, COLORS.wolf);
  fillPolygon(g, [108, 18, 113, 8, 116, 19], COLORS.rabbitEar);
  strokePolygon(g, ear);

  // Голова, светлые пушистые щёки и длинная светлая морда.
  outlinedCircle(g, 106, 33, 16, COLORS.wolf);
  g.fillStyle(COLORS.wolfBelly, 1);
  g.fillEllipse(101, 41, 14, 9);
  const muzzle = [110, 30, 127, 35, 126, 43, 108, 45];
  fillPolygon(g, muzzle, COLORS.wolfBelly);
  strokePolygon(g, muzzle);
  g.fillStyle(COLORS.wolfLight, 1);
  g.fillEllipse(102, 23, 14, 5);
  // Нос, рот и маленький белый клык.
  g.fillStyle(COLORS.outline, 1);
  g.fillEllipse(126, 36, 7, 6);
  g.lineStyle(1.5, COLORS.outline, 1);
  g.lineBetween(113, 43, 123, 42);
  fillPolygon(g, [116, 42.5, 119, 42.5, 117.5, 46.5], COLORS.snowLight);

  // Хитрый жёлтый глаз с тёмным зрачком, бликом и сердитой бровью.
  g.fillStyle(COLORS.wolfEye, 1);
  g.fillEllipse(110, 31, 9, 7);
  g.fillStyle(COLORS.outline, 1);
  g.fillEllipse(111.5, 31.5, 4, 5);
  g.fillStyle(COLORS.white, 1);
  g.fillCircle(112.5, 30, 1);
  g.lineStyle(2.5, COLORS.outline, 1);
  g.lineBetween(103, 26, 115, 28);

  g.restore();
}

// Ухо кролика: овал цвета fur с розовой серединкой inner, повёрнутый на angle (радианы).
function drawRabbitEar(g: Graphics, x: number, y: number, angle: number, fur: number, inner: number): void {
  g.save();
  g.translateCanvas(x, y);
  g.rotateCanvas(angle);
  outlinedEllipse(g, 0, 0, 10, 27, fur);
  g.fillStyle(inner, 1);
  g.fillEllipse(0, 2, 4.5, 18);
  g.restore();
}

// Клык саблезуба. Сверху — корень с неровным краем, ниже — изогнутый клинок
// эмали, который сужается к острию и чуть загибается влево. Объём — три слоя
// по одной кривой: основа, тень вдоль вогнутого края и блик вдоль выпуклого.
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
}

// Мультяшная мясная ножка: косточка слева, круглый кусок мяса справа,
// тень снизу и блик сверху. Цвета разные у сырого и жареного мяса.
function drawMeat(g: Graphics, color: number, shade: number, light: number): void {
  // Косточка: палочка и две «шишечки» на конце.
  limb(g, 9, 21, 22, 16, 6, COLORS.bone);
  outlinedCircle(g, 7, 17, 4, COLORS.bone);
  outlinedCircle(g, 9, 25, 4, COLORS.bone);
  // Сам кусок мяса.
  outlinedEllipse(g, 32, 15, 28, 22, color);
  g.fillStyle(shade, 1);
  g.fillEllipse(34, 20, 20, 8);
  g.fillStyle(light, 1);
  g.fillEllipse(28, 9, 10, 5);
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

// Верёвка поперёк связки, в точке x.
function drawRopeBand(g: Graphics, x: number): void {
  g.fillStyle(COLORS.rope, 1);
  g.fillRoundedRect(x - 3, 1, 6, 25, 2);
  g.fillStyle(COLORS.ropeDark, 1);
  g.fillRect(x + 1, 2, 2, 23);
  g.lineStyle(THIN_OUTLINE_WIDTH, COLORS.outline, 1);
  g.strokeRoundedRect(x - 3, 1, 6, 25, 2);
}

// ===== Кучи у костра и костёр =====

// Площадка кучи — как зоны сдачи в мобильных играх:
// скруглённая рамка и полупрозрачная заливка. Иконку ресурса ставит ItemPile.
function drawDropZone(g: Graphics): void {
  const { w, h } = DROP_ZONE_SIZE;
  const inset = 8;
  const radius = 30;
  const width = w - inset * 2;
  const height = h - inset * 2;

  g.fillStyle(COLORS.zoneFill, 0.45);
  g.fillRoundedRect(inset, inset, width, height, radius);
  // Тёмный кант под рамкой — чтобы светлую рамку было видно на белом снегу.
  g.lineStyle(12, COLORS.outline, 0.35);
  g.strokeRoundedRect(inset, inset, width, height, radius);
  g.lineStyle(6, COLORS.zoneBorder, 1);
  g.strokeRoundedRect(inset, inset, width, height, radius);
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

// ===== Хижина =====

// Хижина-шалаш: жерди, сходящиеся наверху, обтянуты шкурами со швами.
// Внизу — тёмный вход с закатанным пологом, сверху — снежная шапка,
// у подножия — сугробы. Точка опоры — середина нижнего края.
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

// Каменный стол: толстая плита на двух валунах в сугробах. Сверху — шкура
// саблезуба: светлое брюхо, тёмные полосы, лапы по углам свисают с плиты.
// Для уюта — деревянная миска и косточка.
function drawStoneTable(g: Graphics): void {
  const { w, h } = STONE_TABLE_SIZE;
  const cx = w / 2;

  // Мягкая тень под столом — он стоит на снегу, а не висит в воздухе.
  softEllipse(g, cx, h - 10, w - 30, 26, COLORS.shadow, 0.05, 8);

  // Валуны-ножки, наполовину в сугробах.
  for (const x of [62, w - 62]) {
    outlinedBlobs(g, [x - 12, h - 22, 17, x + 12, h - 20, 16, x, h - 32, 18], COLORS.stoneDark);
    g.fillStyle(COLORS.stone, 1);
    g.fillCircle(x - 4, h - 30, 13);
    g.fillStyle(COLORS.stoneLight, 1);
    g.fillEllipse(x - 9, h - 36, 11, 6);
    g.fillStyle(COLORS.snow, 1);
    g.fillEllipse(x, h - 8, 66, 16);
    g.fillStyle(COLORS.snowShade, 1);
    g.fillEllipse(x + 4, h - 4, 50, 6);
    g.lineStyle(THIN_OUTLINE_WIDTH, COLORS.outline, 1);
    g.beginPath();
    g.arc(x, h - 8, 33, Math.PI * 1.08, Math.PI * 1.92);
    g.strokePath();
  }

  // Плита: толстый тёмный торец спереди, сверху светлая столешница,
  // по торцу трещины и крапинки.
  // Края неровные, со сколами — это обтёсанный камень, а не ровная доска.
  const front = [9, 72, 22, 82, 70, 80, w - 64, 82, w - 18, 80, w - 8, 72, w - 7, 100, w - 22, 112, w / 2, 110, 24, 113, 8, 102];
  fillPolygon(g, front, COLORS.stoneDark);
  strokePolygon(g, front);
  const topFace = [15, 40, 28, 28, 80, 30, w - 76, 27, w - 30, 28, w - 12, 38, w - 8, 72, w - 18, 80, w - 64, 82, 70, 80, 22, 82, 9, 72];
  fillPolygon(g, topFace, COLORS.stone);
  fillPolygon(g, [28, 28, 80, 30, w - 76, 27, w - 30, 28, w - 24, 34, 30, 36], COLORS.stoneLight);
  // Светлое ребро там, где столешница переходит в торец.
  limbChain(g, [22, 82, 70, 80, w - 64, 82, w - 18, 80], 2, COLORS.stoneLight);
  strokePolygon(g, topFace);
  g.lineStyle(THIN_OUTLINE_WIDTH, COLORS.outline, 0.6);
  g.strokePoints(toPoints([34, 92, 40, 100, 36, 108]), false);
  g.strokePoints(toPoints([w - 44, 94, w - 50, 104]), false);
  g.fillStyle(COLORS.stoneLight, 0.8);
  for (const [x, y] of [[56, 100], [104, 104], [150, 98], [190, 106]]) g.fillCircle(x, y, 2);

  // Шкура: тело с лапами по углам и хвостом справа. Передние лапы свисают с плиты.
  const pelt = [
    cx, 38, cx + 30, 37, cx + 56, 39, cx + 78, 32, cx + 86, 29, cx + 88, 39, cx + 80, 46, cx + 90, 54,
    cx + 106, 56, cx + 108, 63, cx + 90, 64, cx + 92, 74, cx + 98, 92, cx + 86, 95, cx + 76, 80,
    cx + 50, 84, cx + 26, 86, cx, 87, cx - 26, 86, cx - 50, 84, cx - 76, 80, cx - 86, 95, cx - 98, 92,
    cx - 92, 74, cx - 88, 64, cx - 100, 58, cx - 90, 52, cx - 88, 42, cx - 92, 31, cx - 82, 29, cx - 76, 38,
    cx - 56, 37, cx - 30, 37,
  ];
  fillPolygon(g, pelt, COLORS.fur);
  // Светлое брюхо посередине.
  g.fillStyle(COLORS.furLight, 1);
  g.fillEllipse(cx, 61, 120, 26);
  // Тёмные полосы: от краёв шкуры к брюху, сверху и снизу вразнобой.
  for (const x of [cx - 62, cx - 31, cx, cx + 31, cx + 62]) {
    limb(g, x - 3, 39, x + 2, 50, 5, COLORS.furSpot);
  }
  for (const x of [cx - 46, cx - 15, cx + 15, cx + 46]) {
    limb(g, x + 3, 85, x - 1, 74, 5, COLORS.furSpot);
  }
  limbChain(g, [cx + 96, 57, cx + 100, 62], 3, COLORS.furSpot);
  strokePolygon(g, pelt);
  // Мех по краю: короткие светлые штрихи.
  g.lineStyle(2, COLORS.furShade, 1);
  for (let x = cx - 70; x <= cx + 70; x += 14) {
    g.lineBetween(x, 83, x + 3, 79);
    g.lineBetween(x + 6, 41, x + 9, 45);
  }

  // Деревянная миска справа сзади и косточка слева спереди.
  outlinedEllipse(g, cx + 86, 47, 28, 13, COLORS.wood);
  g.fillStyle(COLORS.woodDark, 1);
  g.fillEllipse(cx + 86, 45, 20, 6);
  g.fillStyle(COLORS.woodLight, 1);
  g.fillEllipse(cx + 79, 50, 7, 3);
  limb(g, cx - 82, 78, cx - 64, 74, 4, COLORS.bone);
  outlinedCircle(g, cx - 84, 76, 3.5, COLORS.bone);
  outlinedCircle(g, cx - 83, 81, 3.5, COLORS.bone);
  outlinedCircle(g, cx - 62, 71, 3.5, COLORS.bone);
  outlinedCircle(g, cx - 62, 76, 3.5, COLORS.bone);
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

// Плашка интерфейса: тёмное дерево со светлой рамкой, скруглённые углы и мягкая тень снизу.
function drawHudPanel(g: Graphics): void {
  const { w, h } = HUD_PANEL_SIZE;
  const radius = 18;
  const height = h - 6;

  // Тень плашки чуть ниже неё.
  g.fillStyle(COLORS.shadow, 0.35);
  g.fillRoundedRect(2, 6, w - 4, height - 2, radius);
  // Сама плашка.
  g.fillStyle(COLORS.hudPanel, 0.9);
  g.fillRoundedRect(2, 2, w - 4, height - 2, radius);
  // Блик по верху — плашка выглядит выпуклой.
  g.fillStyle(COLORS.white, 0.12);
  g.fillRoundedRect(8, 6, w - 16, height / 3, radius / 2);
  g.lineStyle(3, COLORS.zoneBorder, 1);
  g.strokeRoundedRect(2, 2, w - 4, height - 2, radius);
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
