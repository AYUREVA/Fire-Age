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
  bush: 'bush', // заснеженный куст хвороста
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
const PLAYER_SIZE: Size = { w: 96, h: 122 };
const CLUB_SIZE: Size = { w: 40, h: 78 };
const RING_SIZE: Size = { w: 90, h: 44 };
const JOYSTICK_BASE_SIZE: Size = { w: 128, h: 128 };
const JOYSTICK_KNOB_SIZE: Size = { w: 60, h: 60 };
const BUSH_SIZE: Size = { w: 124, h: 100 };
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

// Вождь — смешной пещерный человек, смотрит вправо. Ноги внизу по центру.
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
  g.fillRoundedRect(37, 92, 10, 18, 4);
  g.strokeRoundedRect(37, 92, 10, 18, 4);
  g.fillStyle(COLORS.skin, 1);
  g.fillRoundedRect(51, 92, 11, 18, 4);
  g.strokeRoundedRect(51, 92, 11, 18, 4);

  // Сапоги: тёмный мех и блик сверху.
  outlinedEllipse(g, 41, 113, 20, 13, COLORS.furDark);
  outlinedEllipse(g, 59, 113, 22, 13, COLORS.furDark);
  g.fillStyle(COLORS.fur, 1);
  g.fillEllipse(38, 111, 9, 4);
  g.fillEllipse(56, 111, 10, 4);
  // Пушистые отвороты.
  outlinedBlobs(g, [35, 105, 3.5, 41, 104, 4, 47, 105, 3.5], COLORS.furLight);
  outlinedBlobs(g, [53, 105, 3.5, 59, 104, 4, 65, 105, 3.5], COLORS.furLight);
}

// Туловище, шкура через плечо и руки.
function drawPlayerBody(g: Graphics): void {
  // Дальняя рука — за телом, в тени.
  outlinedEllipse(g, 30, 83, 14, 24, COLORS.skinShade);
  // Туловище и блик на плече.
  outlinedEllipse(g, 48, 84, 46, 40, COLORS.skin);
  g.fillStyle(COLORS.white, 0.35);
  g.fillEllipse(34, 74, 9, 6);

  // Шкура через левое плечо: светлая кромка сверху, пятна, штрихи меха, зубчатый низ.
  const pelt = [26, 78, 40, 66, 52, 70, 72, 90, 70, 101, 64, 97, 58, 103, 52, 97, 46, 104, 40, 97, 34, 103, 28, 96];
  fillPolygon(g, pelt, COLORS.fur);
  // Тень на шкуре справа.
  fillPolygon(g, [56, 76, 72, 90, 70, 101, 64, 97, 58, 103, 56, 99], COLORS.furShade);
  g.lineStyle(4, COLORS.furLight, 1);
  g.lineBetween(29, 77, 40, 69);
  g.lineBetween(40, 69, 51, 72);
  g.fillStyle(COLORS.furSpot, 1);
  g.fillCircle(40, 86, 4);
  g.fillCircle(57, 92, 3.5);
  g.fillCircle(33, 94, 3);
  g.fillCircle(47, 77, 2.5);
  g.lineStyle(1.5, COLORS.furDark, 1);
  g.lineBetween(31, 86, 34, 82);
  g.lineBetween(46, 92, 49, 88);
  g.lineBetween(62, 87, 64, 84);
  strokePolygon(g, pelt);

  // Ближняя рука тянется к кулаку на рукояти дубины.
  limb(g, 60, 73, 70, 89, 12, COLORS.skin);
  g.fillStyle(COLORS.white, 0.35);
  g.fillEllipse(59, 74, 6, 4);
}

// Крупная голова: копна волос с косточкой, чёлка, два глаза, бровь, нос картошкой и борода.
function drawPlayerHead(g: Graphics): void {
  // Копна волос сзади и сверху, сзади свисает до плеча: круги x, y, радиус.
  outlinedBlobs(g, [32, 32, 16, 44, 22, 16, 58, 21, 14, 70, 28, 10, 26, 46, 13, 29, 60, 9], COLORS.hair);
  g.fillStyle(COLORS.hairLight, 1);
  g.fillEllipse(36, 24, 12, 5);
  g.fillEllipse(24, 42, 5, 10);

  outlinedCircle(g, 52, 46, 24, COLORS.skin);
  // Блик на лбу.
  g.fillStyle(COLORS.white, 0.35);
  g.fillEllipse(48, 36, 18, 8);
  // Ухо.
  outlinedCircle(g, 31, 52, 6, COLORS.skin);
  g.fillStyle(COLORS.skinShade, 1);
  g.fillCircle(31, 52, 3);

  // Чёлка зубцами, светлые пряди и косточка в волосах.
  const bangs = [30, 38, 36, 24, 50, 19, 66, 21, 77, 32, 72, 37, 66, 30, 62, 39, 56, 30, 50, 39, 44, 30, 38, 39];
  fillPolygon(g, bangs, COLORS.hair);
  strokePolygon(g, bangs);
  g.lineStyle(THIN_OUTLINE_WIDTH, COLORS.hairLight, 1);
  g.lineBetween(46, 24, 52, 23);
  g.lineBetween(58, 24, 64, 25);
  drawBone(g, 40, 16, -0.5);

  // Глаза: дальний меньше и прячется за носом, у ближнего — блик.
  drawEye(g, 74, 47, 7, 9, 2);
  drawEye(g, 62, 50, 10, 12, 3);
  // Сросшаяся бровь над обоими глазами.
  fillPolygon(g, [54, 43, 66, 39, 81, 42, 81, 45, 66, 43, 55, 47], COLORS.hair);

  // Румянец.
  g.fillStyle(COLORS.cheek, 0.55);
  g.fillCircle(57, 60, 4.5);

  // Борода — пушистые клочки с общей обводкой и светлыми прядями.
  outlinedBlobs(g, [40, 62, 8, 46, 71, 10, 56, 76, 11, 67, 75, 10, 76, 68, 8, 80, 61, 6], COLORS.hair);
  g.lineStyle(THIN_OUTLINE_WIDTH, COLORS.hairLight, 1);
  g.lineBetween(46, 70, 48, 77);
  g.lineBetween(56, 74, 57, 81);
  g.lineBetween(66, 73, 66, 79);

  // Улыбка с зубами.
  g.fillStyle(COLORS.outline, 1);
  g.fillEllipse(69, 66, 13, 7);
  g.fillStyle(COLORS.eye, 1);
  g.fillRect(64, 63, 9, 2.5);
  // Усы над улыбкой.
  outlinedEllipse(g, 74, 62, 14, 6, COLORS.hair);

  // Нос картошкой — поверх усов, с бликом.
  outlinedCircle(g, 80, 58, 7.5, COLORS.skin);
  g.fillStyle(COLORS.skinShade, 1);
  g.fillCircle(82, 61, 2.5);
  g.fillStyle(COLORS.white, 0.6);
  g.fillCircle(77, 55, 2.2);
}

// Глаз: белок с обводкой, зрачок смотрит вправо, на зрачке — искорка.
function drawEye(g: Graphics, x: number, y: number, width: number, height: number, pupil: number): void {
  g.fillStyle(COLORS.eye, 1);
  g.fillEllipse(x, y, width, height);
  g.lineStyle(THIN_OUTLINE_WIDTH, COLORS.outline, 1);
  g.strokeEllipse(x, y, width, height);
  g.fillStyle(COLORS.outline, 1);
  g.fillCircle(x + pupil * 0.6, y + 1, pupil);
  g.fillStyle(COLORS.eye, 1);
  g.fillCircle(x + pupil, y - pupil * 0.2, pupil * 0.4);
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

// Дубина: шишковатая голова, рукоять и кулак вождя, который её сжимает.
// Центр кулака — на 10 пикселей выше нижнего края: вокруг него дубина и вращается.
function drawClub(g: Graphics): void {
  const { w, h } = CLUB_SIZE;
  const cx = w / 2;

  // Рукоять.
  g.fillStyle(COLORS.woodDark, 1);
  g.fillRoundedRect(cx - 4, 34, 8, h - 44, 3);
  g.lineStyle(OUTLINE_WIDTH, COLORS.outline, 1);
  g.strokeRoundedRect(cx - 4, 34, 8, h - 44, 3);

  // Голова дубины — несколько шишек с общей обводкой, тень справа, блик слева, сучки.
  outlinedBlobs(g, [cx, 25, 13, cx - 6, 15, 8, cx + 6, 12, 8, cx - 9, 31, 7, cx + 9, 30, 7], COLORS.wood);
  g.fillStyle(COLORS.woodDark, 1);
  g.fillEllipse(cx + 7, 27, 8, 22);
  g.fillStyle(COLORS.woodLight, 1);
  g.fillEllipse(cx - 6, 18, 6, 14);
  g.fillStyle(COLORS.white, 0.4);
  g.fillEllipse(cx - 7, 12, 3, 5);
  g.fillStyle(COLORS.woodDark, 1);
  g.fillCircle(cx - 2, 32, 2.5);
  g.fillCircle(cx + 3, 18, 2);

  // Кулак: круг кожи и складки пальцев.
  outlinedCircle(g, cx, h - 10, 8, COLORS.skin);
  g.lineStyle(1.5, COLORS.skinShade, 1);
  g.lineBetween(cx + 1, h - 14, cx + 6, h - 14);
  g.lineBetween(cx + 1, h - 10, cx + 7, h - 10);
  g.lineBetween(cx + 1, h - 6, cx + 6, h - 6);
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

// Заснеженный куст хвороста: клубок сухих веток в три тона, прутья во все стороны,
// снежные шапки с голубой тенью, красные ягоды и бугристый снег у подножия.
function drawBush(g: Graphics): void {
  const { w, h } = BUSH_SIZE;
  const cx = w / 2;
  const base = h - 14;

  // 1. Прутья позади куста: от основания к кончикам (x, y).
  const twigTips = [10, 40, 22, 16, 42, 6, 62, 3, 84, 6, 102, 18, 114, 40, 4, 64, 120, 64];
  for (let i = 0; i < twigTips.length; i += 2) {
    drawTwig(g, cx, base, twigTips[i], twigTips[i + 1]);
  }

  // 2. Тело куста — клубок веток. Круги x, y, радиус.
  const body = [
    cx - 30, 62, 20, cx + 30, 62, 20, cx, 50, 26, cx - 16, 40, 16, cx + 16, 38, 16,
    cx - 38, 74, 13, cx + 38, 74, 13, cx - 14, 76, 17, cx + 14, 76, 17,
  ];
  // Сначала все круги тёмным цветом с общей обводкой — это тень.
  outlinedBlobs(g, body, COLORS.brushDark);
  // Поверх — те же круги поменьше, сдвинутые вверх-влево: основной цвет…
  g.fillStyle(COLORS.brush, 1);
  for (let i = 0; i < body.length; i += 3) {
    const r = body[i + 2];
    g.fillCircle(body[i] - r * 0.15, body[i + 1] - r * 0.2, r * 0.78);
  }

  // 3. Веточки внутри: тёмные и светлые штрихи — видно, что куст сплетён из прутьев.
  g.lineStyle(THIN_OUTLINE_WIDTH, COLORS.brushDark, 1);
  g.lineBetween(cx - 40, 70, cx - 20, 56);
  g.lineBetween(cx - 20, 56, cx - 24, 46);
  g.lineBetween(cx + 4, 82, cx + 14, 60);
  g.lineBetween(cx + 14, 60, cx + 30, 54);
  g.lineBetween(cx - 8, 66, cx + 2, 50);
  g.lineBetween(cx + 26, 80, cx + 40, 68);
  g.lineStyle(THIN_OUTLINE_WIDTH, COLORS.brushLight, 1);
  g.lineBetween(cx - 34, 60, cx - 26, 52);
  g.lineBetween(cx - 22, 72, cx - 12, 62);
  g.lineBetween(cx - 4, 44, cx + 6, 38);
  g.lineBetween(cx + 18, 50, cx + 26, 44);
  g.lineBetween(cx - 12, 52, cx - 6, 46);

  // 4. Снежные шапки — плоские «подушки» на верхушках: x, y, ширина, высота.
  //    Сначала голубая тень чуть ниже, потом белый снег, справа снег в тени.
  const snowCaps = [cx - 15, 28, 26, 13, cx + 2, 24, 30, 14, cx + 17, 28, 24, 12, cx - 34, 50, 18, 9, cx + 34, 50, 18, 9];
  g.fillStyle(COLORS.snowDeep, 1);
  for (let i = 0; i < snowCaps.length; i += 4) {
    g.fillEllipse(snowCaps[i], snowCaps[i + 1] + 3, snowCaps[i + 2], snowCaps[i + 3]);
  }
  g.fillStyle(COLORS.snowLight, 1);
  for (let i = 0; i < snowCaps.length; i += 4) {
    g.fillEllipse(snowCaps[i] - 1, snowCaps[i + 1], snowCaps[i + 2], snowCaps[i + 3]);
  }
  g.fillStyle(COLORS.snowShade, 1);
  g.fillEllipse(cx + 21, 28, 12, 7);
  g.fillEllipse(cx + 37, 50, 9, 5);
  // Капли снега свисают с шапок.
  g.fillStyle(COLORS.snowLight, 1);
  g.fillCircle(cx - 10, 34, 2.5);
  g.fillCircle(cx + 6, 31, 2.5);
  g.fillCircle(cx - 32, 55, 2);

  // 5. Пара прутьев торчит прямо из снега.
  drawTwig(g, cx - 10, 26, cx - 18, 8);
  drawTwig(g, cx + 8, 24, cx + 16, 6);

  // 6. Красные ягоды — яркое пятно на белом снегу.
  drawBerries(g, cx - 28, 64);
  drawBerries(g, cx + 22, 68);
  drawBerries(g, cx - 2, 48);

  // 7. Бугристый снег у подножия: голубая тень и белые сугробики поверх.
  g.fillStyle(COLORS.snowShade, 1);
  g.fillEllipse(cx, base + 6, w - 26, 14);
  g.fillStyle(COLORS.snowLight, 1);
  g.fillCircle(cx - 32, base + 3, 8);
  g.fillCircle(cx - 12, base + 4, 9);
  g.fillCircle(cx + 8, base + 3, 9);
  g.fillCircle(cx + 28, base + 4, 8);
  g.fillEllipse(cx - 2, base + 6, w - 44, 10);
}

// Гроздь из трёх красных ягод: тёмный край, красная ягода и белый блик.
function drawBerries(g: Graphics, x: number, y: number): void {
  const berries = [x, y, x + 6, y + 2, x + 2, y + 6];
  const radius = 3.5;
  g.fillStyle(COLORS.outline, 1);
  for (let i = 0; i < berries.length; i += 2) g.fillCircle(berries[i], berries[i + 1], radius + 1.5);
  g.fillStyle(COLORS.berry, 1);
  for (let i = 0; i < berries.length; i += 2) g.fillCircle(berries[i], berries[i + 1], radius);
  g.fillStyle(COLORS.white, 0.85);
  for (let i = 0; i < berries.length; i += 2) g.fillCircle(berries[i] - 1.2, berries[i + 1] - 1.2, 1.1);
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
