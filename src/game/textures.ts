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
  player: 'player', // вождь (без дубины), смотрит вправо
  club: 'club', // дубина с кулаком внизу; вращается вокруг кулака (см. Player.ts)
  ring: 'ring', // светлое кольцо под ногами вождя
  joystickBase: 'joystick-base', // круг джойстика
  joystickKnob: 'joystick-knob', // ручка джойстика
  bush: 'bush', // зелёный куст, точка опоры — низ ствола
  bushSnow: 'bush-snow', // снег на кроне куста (тот же размер, ложится поверх)
  stump: 'stump', // пенёк — куст без хвороста
  bundle: 'bundle', // связка хвороста, перевязанная верёвкой
  snowflake: 'snowflake', // снежинка: падающий снег и снег из куста
  chip: 'chip', // щепка, летит из куста при ударе
  dropZone: 'drop-zone', // площадка поленницы: рамка и иконка связки
  firePit: 'fire-pit', // кострище: камни и поленья
  flame: 'flame', // язык пламени; точка опоры — низ
  glow: 'glow', // мягкий белый круг; его красят в цвет света
  spark: 'spark', // искра костра (белая, цвет задаёт частица)
  hudPanel: 'hud-panel', // плашка счёта со скруглёнными углами
} as const;

// Шрифт всех надписей. Это тоже «ассет»: свой шрифт подключается здесь.
export const FONT_FAMILY = '"Trebuchet MS", "Segoe UI", system-ui, sans-serif';

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
const PLAYER_SIZE: Size = { w: 100, h: 130 };
const CLUB_SIZE: Size = { w: 36, h: 92 };
const RING_SIZE: Size = { w: 90, h: 44 };
const JOYSTICK_BASE_SIZE: Size = { w: 128, h: 128 };
const JOYSTICK_KNOB_SIZE: Size = { w: 60, h: 60 };
const BUSH_SIZE: Size = { w: 124, h: 104 };
const STUMP_SIZE: Size = { w: 80, h: 60 };
const BUNDLE_SIZE: Size = { w: 56, h: 28 };
const SNOWFLAKE_SIZE: Size = { w: 12, h: 12 };
const CHIP_SIZE: Size = { w: 12, h: 9 };
const DROP_ZONE_SIZE: Size = { w: 220, h: 132 };
const FIRE_PIT_SIZE: Size = { w: 110, h: 64 };
const FLAME_SIZE: Size = { w: 64, h: 96 };
const GLOW_SIZE: Size = { w: 128, h: 128 };
const SPARK_SIZE: Size = { w: 8, h: 8 };
const HUD_PANEL_SIZE: Size = { w: 170, h: 66 };

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
  bake(scene, TEXTURES.club, CLUB_SIZE, drawClub);
  bake(scene, TEXTURES.ring, RING_SIZE, drawRing);
  bake(scene, TEXTURES.joystickBase, JOYSTICK_BASE_SIZE, drawJoystickBase);
  bake(scene, TEXTURES.joystickKnob, JOYSTICK_KNOB_SIZE, drawJoystickKnob);
  bake(scene, TEXTURES.bush, BUSH_SIZE, drawBush);
  bake(scene, TEXTURES.bushSnow, BUSH_SIZE, drawBushSnow);
  bake(scene, TEXTURES.stump, STUMP_SIZE, drawStump);
  bake(scene, TEXTURES.bundle, BUNDLE_SIZE, drawBundle);
  bake(scene, TEXTURES.snowflake, SNOWFLAKE_SIZE, drawSnowflake);
  bake(scene, TEXTURES.chip, CHIP_SIZE, drawChip);
  bake(scene, TEXTURES.dropZone, DROP_ZONE_SIZE, drawDropZone);
  bake(scene, TEXTURES.firePit, FIRE_PIT_SIZE, drawFirePit);
  bake(scene, TEXTURES.flame, FLAME_SIZE, drawFlame);
  bake(scene, TEXTURES.glow, GLOW_SIZE, drawGlow);
  bake(scene, TEXTURES.spark, SPARK_SIZE, drawSpark);
  bake(scene, TEXTURES.hudPanel, HUD_PANEL_SIZE, drawHudPanel);
}

// Рисует картинку на временном Graphics и сохраняет её как текстуру под ключом key.
function bake(scene: Phaser.Scene, key: string, size: Size, draw: (g: Graphics) => void): void {
  // false — этот Graphics не добавляется на экран, он нужен только для рисования.
  const g = scene.make.graphics({}, false);
  draw(g);
  g.generateTexture(key, size.w, size.h);
  g.destroy();
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

// Вождь — пещерный человек, смотрит вправо. Ноги внизу по центру.
// Свет падает слева сверху: справа и снизу — тени, слева и сверху — блики.
// Дубина с кулаком — отдельная картинка, чтобы ею можно было махать.
function drawPlayer(g: Graphics): void {
  drawPlayerLegs(g);
  drawPlayerBody(g);
  drawPlayerHead(g);
}

// Короткие ноги в меховых сапогах с пушистыми отворотами. Дальняя нога темнее.
function drawPlayerLegs(g: Graphics): void {
  g.lineStyle(OUTLINE_WIDTH, COLORS.outline, 1);
  g.fillStyle(COLORS.skinShade, 1);
  g.fillRoundedRect(39, 100, 10, 16, 4);
  g.strokeRoundedRect(39, 100, 10, 16, 4);
  g.fillStyle(COLORS.skin, 1);
  g.fillRoundedRect(53, 100, 11, 16, 4);
  g.strokeRoundedRect(53, 100, 11, 16, 4);

  // Сапоги: тёмный мех и блик сверху.
  outlinedEllipse(g, 43, 121, 20, 13, COLORS.furDark);
  outlinedEllipse(g, 61, 121, 22, 13, COLORS.furDark);
  g.fillStyle(COLORS.fur, 1);
  g.fillEllipse(40, 119, 9, 4);
  g.fillEllipse(58, 119, 10, 4);
  // Пушистые отвороты.
  outlinedBlobs(g, [37, 113, 3.5, 43, 112, 4, 49, 113, 3.5], COLORS.furLight);
  outlinedBlobs(g, [55, 113, 3.5, 61, 112, 4, 67, 113, 3.5], COLORS.furLight);
}

// Туловище, шкура через плечо, пояс из верёвки и руки.
function drawPlayerBody(g: Graphics): void {
  // Дальняя рука — за телом, в тени.
  outlinedEllipse(g, 29, 90, 14, 26, COLORS.skinShade);
  // Туловище и блик на плече.
  outlinedEllipse(g, 50, 90, 52, 44, COLORS.skin);
  g.fillStyle(COLORS.white, 0.35);
  g.fillEllipse(35, 78, 10, 6);

  // Шкура через левое плечо: тень справа, светлая кромка, пятна, штрихи меха, зубчатый низ.
  const pelt = [27, 84, 42, 70, 55, 74, 76, 96, 74, 107, 68, 103, 62, 109, 56, 103, 50, 110, 44, 103, 38, 109, 30, 102];
  fillPolygon(g, pelt, COLORS.fur);
  fillPolygon(g, [60, 80, 76, 96, 74, 107, 68, 103, 62, 109, 60, 105], COLORS.furShade);
  g.lineStyle(4, COLORS.furLight, 1);
  g.lineBetween(30, 83, 42, 73);
  g.lineBetween(42, 73, 54, 77);
  g.fillStyle(COLORS.furSpot, 1);
  g.fillCircle(42, 92, 4);
  g.fillCircle(61, 97, 3.5);
  g.fillCircle(35, 98, 3);
  g.fillCircle(49, 82, 2.5);
  g.lineStyle(1.5, COLORS.furDark, 1);
  g.lineBetween(32, 92, 35, 88);
  g.lineBetween(48, 99, 51, 95);
  g.lineBetween(66, 93, 68, 90);
  strokePolygon(g, pelt);

  // Пояс из верёвки с узлом.
  limb(g, 31, 101, 73, 101, 3, COLORS.rope);
  outlinedCircle(g, 60, 102, 3.5, COLORS.rope);

  // Ближняя рука: от плеча к кулаку на рукояти дубины, бицепс в тени.
  limb(g, 64, 79, 74, 96, 13, COLORS.skin);
  g.fillStyle(COLORS.skinShade, 1);
  g.fillEllipse(71, 89, 5, 9);
  g.fillStyle(COLORS.white, 0.35);
  g.fillEllipse(63, 80, 6, 4);
}

// Голова в повороте 3/4: грива с косточкой, аккуратная чёлка, два миндалевидных глаза,
// сросшаяся бровь, нос-капля и ровная борода, в которой прячется улыбка.
function drawPlayerHead(g: Graphics): void {
  // Грива сзади и сверху, сзади свисает до плеча: круги x, y, радиус.
  outlinedBlobs(g, [34, 30, 17, 48, 20, 17, 64, 19, 15, 28, 46, 14, 29, 62, 10, 78, 26, 10], COLORS.hair);
  g.fillStyle(COLORS.hairLight, 1);
  g.fillEllipse(36, 22, 12, 5);
  g.fillEllipse(24, 44, 5, 10);

  // Голова — чуть вытянутый овал, блик на лбу.
  outlinedEllipse(g, 56, 48, 52, 54, COLORS.skin);
  g.fillStyle(COLORS.white, 0.35);
  g.fillEllipse(52, 34, 22, 8);
  // Ухо.
  outlinedCircle(g, 32, 52, 6, COLORS.skin);
  g.fillStyle(COLORS.skinShade, 1);
  g.fillCircle(32, 52, 3);

  // Аккуратная чёлка неглубокими прядями, светлые пряди и косточка в волосах.
  const bangs = [
    31, 40, 35, 28, 49, 20, 65, 20, 79, 27, 84, 38, 80, 35, 76, 32, 72, 37, 67, 32, 61, 36, 55, 31, 49, 36, 43, 32, 37, 38,
  ];
  fillPolygon(g, bangs, COLORS.hair);
  strokePolygon(g, bangs);
  g.lineStyle(THIN_OUTLINE_WIDTH, COLORS.hairLight, 1);
  g.lineBetween(46, 25, 53, 23);
  g.lineBetween(60, 23, 67, 24);
  drawBone(g, 42, 16, -0.5);

  // Глаза: ближний (левый) крупнее, дальний (правый) чуть меньше. Румянец под ближним.
  drawAlmondEye(g, 61, 47, 11, 9);
  drawAlmondEye(g, 76, 46, 9, 8);
  g.fillStyle(COLORS.cheek, 0.45);
  g.fillCircle(55, 57, 4.5);
  // Густая сросшаяся бровь с ложбинкой над переносицей.
  fillPolygon(
    g,
    [53, 42, 59, 38, 66, 38.5, 69.5, 40.5, 73, 38, 80, 37.5, 83, 40, 79, 40.5, 73, 41.5, 69.5, 43.5, 66, 41.5, 59, 41, 54, 44.5],
    COLORS.hair,
  );

  drawPlayerBeard(g);
  drawPlayerNose(g);
}

// Ровная аккуратная борода от висков до клинышка на подбородке,
// бороздки прядей, улыбка внутри бороды и усы над ней.
function drawPlayerBeard(g: Graphics): void {
  // Контур: от левого виска вниз по челюсти к клинышку на подбородке, вверх к правому виску
  // и обратно по щекам плавной дугой (щёки остаются открытыми).
  const beard = [
    36, 48, 34, 58, 37, 68, 43, 78, 51, 86, 58, 92, 63, 95, 69, 91, 76, 84, 81, 75, 83, 64, 82, 56,
    79, 61, 75, 64, 69, 65, 63, 66, 57, 65, 51, 63, 45, 59, 40, 53,
  ];
  fillPolygon(g, beard, COLORS.hair);
  // Ровные бороздки сверху вниз и светлые пряди рядом с ними.
  g.lineStyle(1.5, COLORS.outline, 0.45);
  g.lineBetween(44, 64, 49, 79);
  g.lineBetween(53, 70, 57, 87);
  g.lineBetween(76, 72, 72, 84);
  g.lineStyle(1.5, COLORS.hairLight, 1);
  g.lineBetween(46, 64, 51, 78);
  g.lineBetween(55, 70, 59, 85);
  g.lineBetween(64, 78, 64, 88);
  strokePolygon(g, beard);

  // Улыбка внутри бороды: тёмный рот, верхние зубы и язык.
  g.fillStyle(COLORS.outline, 1);
  g.fillEllipse(70, 73, 12, 8);
  g.fillStyle(COLORS.eye, 1);
  g.fillEllipse(70, 71, 8, 3);
  g.fillStyle(COLORS.cheek, 1);
  g.fillEllipse(71, 75.5, 6, 2.5);
  // Усы над улыбкой переходят в бороду.
  const mustache = [60, 68, 66, 64, 71, 63.5, 76, 64, 81, 67, 78, 69, 72, 67, 66, 69];
  fillPolygon(g, mustache, COLORS.hair);
  strokePolygon(g, mustache);
}

// Нос-капля: узкий сверху, округлый снизу. Обводка только по правому краю и низу —
// сверху нос плавно переходит в лоб, как у мультяшных героев.
function drawPlayerNose(g: Graphics): void {
  const nose = [69, 50, 72, 54, 75, 58, 75, 61, 72, 63, 68, 63, 65, 61, 66, 57];
  fillPolygon(g, nose, COLORS.skin);
  // Тень под кончиком носа.
  fillPolygon(g, [65, 61, 68, 63, 72, 63, 75, 61, 70, 61.5], COLORS.skinShade);
  g.lineStyle(THIN_OUTLINE_WIDTH, COLORS.outline, 1);
  g.strokePoints(toPoints([70, 51, 73, 55, 75, 58, 75, 61, 72, 63, 68, 63, 65, 61]));
  // Ноздря и блик на кончике.
  g.fillStyle(COLORS.outline, 1);
  g.fillCircle(71.5, 61, 1.1);
  g.fillStyle(COLORS.white, 0.6);
  g.fillCircle(70, 57, 1.6);
}

// Миндалевидный глаз: белок, карий зрачок с бликом, верхнее веко тёмной дугой.
function drawAlmondEye(g: Graphics, x: number, y: number, width: number, height: number): void {
  g.fillStyle(COLORS.eye, 1);
  g.fillEllipse(x, y, width, height);
  g.fillStyle(COLORS.iris, 1);
  g.fillCircle(x + width * 0.15, y + 0.5, height * 0.38);
  g.fillStyle(COLORS.outline, 1);
  g.fillCircle(x + width * 0.18, y + 0.5, height * 0.2);
  g.fillStyle(COLORS.eye, 1);
  g.fillCircle(x + width * 0.25, y - height * 0.12, height * 0.12);
  // Верхнее веко — толстая дуга, нижнее — тонкая.
  g.lineStyle(2.5, COLORS.outline, 1);
  g.beginPath();
  g.arc(x, y + height * 0.35, width * 0.55, Math.PI + 0.35, Math.PI * 2 - 0.35);
  g.strokePath();
  g.lineStyle(1.2, COLORS.outline, 0.6);
  g.strokeEllipse(x, y, width, height);
}

// Косточка в волосах — пещерное украшение. Повёрнута на угол angle (радианы).
function drawBone(g: Graphics, x: number, y: number, angle: number): void {
  g.save();
  g.translateCanvas(x, y);
  g.rotateCanvas(angle);
  // Обводка: та же косточка цвета обводки, чуть толще.
  g.fillStyle(COLORS.outline, 1);
  g.fillRect(-9, -4, 18, 8);
  for (const [knobX, knobY] of [[-9, -3], [-9, 3], [9, -3], [9, 3]]) {
    g.fillCircle(knobX, knobY, 4.5);
  }
  g.fillStyle(COLORS.bone, 1);
  g.fillRect(-9, -2.5, 18, 5);
  for (const [knobX, knobY] of [[-9, -3], [-9, 3], [9, -3], [9, 3]]) {
    g.fillCircle(knobX, knobY, 3);
  }
  g.fillStyle(COLORS.boneShade, 1);
  g.fillRect(-7, 1, 14, 1.5);
  g.restore();
}

// ===== Дубина =====

// Дубина из цельного куска дерева: у кулака тонкая рукоять,
// к концу плавно расширяется до толстого закруглённого «набалдашника».
// Центр кулака — на 10 пикселей выше нижнего края: вокруг него дубина и вращается.
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

  fillPolygon(g, silhouette, COLORS.wood);
  drawClubShading(g, cx);
  drawClubGrain(g, cx);
  strokePolygon(g, silhouette);
  drawClubWrap(g, cx);

  // Кулак: круг кожи и складки пальцев.
  outlinedCircle(g, cx, h - 10, 8, COLORS.skin);
  g.lineStyle(1.5, COLORS.skinShade, 1);
  g.lineBetween(cx + 1, h - 14, cx + 6, h - 14);
  g.lineBetween(cx + 1, h - 10, cx + 7, h - 10);
  g.lineBetween(cx + 1, h - 6, cx + 6, h - 6);
}

// Полуширина дубины на доле длины t (0 — у рукояти, 1 — у толстого конца).
// t в степени 1.8: сначала дубина почти не толстеет, потом всё быстрее.
function clubHalfWidth(t: number): number {
  return CLUB_HANDLE_HALF_WIDTH + (CLUB_TOP_RADIUS - CLUB_HANDLE_HALF_WIDTH) * Math.pow(t, 1.8);
}

// Высота точки на доле длины t: от низа рукояти до центра закругления наверху.
function clubY(t: number): number {
  return Phaser.Math.Linear(CLUB_SIZE.h - 3, CLUB_TOP_RADIUS + 2, t);
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

// ===== Поленница и костёр =====

// Площадка поленницы — как зоны сдачи в мобильных играх:
// скруглённая рамка, полупрозрачная заливка и иконка связки посередине.
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

  drawBundleIcon(g, w / 2, h / 2);
}

// Иконка связки на площадке: три палки и две верёвки.
function drawBundleIcon(g: Graphics, cx: number, cy: number): void {
  g.fillStyle(COLORS.zoneBorder, 0.9);
  g.fillRoundedRect(cx - 30, cy - 15, 60, 9, 4);
  g.fillRoundedRect(cx - 35, cy - 4, 68, 9, 4);
  g.fillRoundedRect(cx - 31, cy + 7, 62, 9, 4);
  g.fillStyle(COLORS.zoneFill, 1);
  g.fillRect(cx - 14, cy - 17, 6, 35);
  g.fillRect(cx + 10, cy - 17, 6, 35);
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

// Плашка счёта: тёмное дерево со светлой рамкой, скруглённые углы и мягкая тень снизу.
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
