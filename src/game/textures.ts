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
  club: 'club', // дубина; точка опоры — конец рукояти
  ring: 'ring', // светлое кольцо под ногами вождя
  joystickBase: 'joystick-base', // круг джойстика
  joystickKnob: 'joystick-knob', // ручка джойстика
  bush: 'bush', // заснеженный куст хвороста
  stump: 'stump', // пенёк — куст без хвороста
  bundle: 'bundle', // связка хвороста, перевязанная верёвкой
  snowflake: 'snowflake', // снежинка: падающий снег и снег из куста
  chip: 'chip', // щепка, летит из куста при ударе
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
const CLUB_SIZE: Size = { w: 30, h: 70 };
const RING_SIZE: Size = { w: 90, h: 44 };
const JOYSTICK_BASE_SIZE: Size = { w: 128, h: 128 };
const JOYSTICK_KNOB_SIZE: Size = { w: 60, h: 60 };
const BUSH_SIZE: Size = { w: 112, h: 92 };
const STUMP_SIZE: Size = { w: 72, h: 56 };
const BUNDLE_SIZE: Size = { w: 56, h: 28 };
const SNOWFLAKE_SIZE: Size = { w: 12, h: 12 };
const CHIP_SIZE: Size = { w: 12, h: 9 };

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
// Дубина — отдельная картинка, чтобы ею можно было махать.
function drawPlayer(g: Graphics): void {
  drawPlayerLegs(g);
  drawPlayerBody(g);
  drawPlayerHead(g);
}

// Короткие ноги в меховых сапогах. Дальняя нога темнее.
function drawPlayerLegs(g: Graphics): void {
  g.lineStyle(OUTLINE_WIDTH, COLORS.outline, 1);
  g.fillStyle(COLORS.skinShade, 1);
  g.fillRoundedRect(36, 92, 10, 20, 4);
  g.strokeRoundedRect(36, 92, 10, 20, 4);
  g.fillStyle(COLORS.skin, 1);
  g.fillRoundedRect(51, 92, 10, 20, 4);
  g.strokeRoundedRect(51, 92, 10, 20, 4);

  outlinedEllipse(g, 40, 114, 18, 12, COLORS.furDark);
  outlinedEllipse(g, 58, 114, 20, 12, COLORS.furDark);
}

// Туловище, шкура через плечо и руки.
function drawPlayerBody(g: Graphics): void {
  // Дальняя рука — за телом, в тени.
  outlinedEllipse(g, 30, 84, 14, 24, COLORS.skinShade);
  // Туловище.
  outlinedEllipse(g, 48, 84, 46, 40, COLORS.skin);

  // Шкура через левое плечо, низ — зубцами, на ней тёмные пятна.
  const pelt = [26, 78, 40, 66, 52, 70, 72, 90, 70, 101, 64, 97, 58, 103, 52, 97, 46, 104, 40, 97, 34, 103, 28, 96];
  fillPolygon(g, pelt, COLORS.fur);
  g.fillStyle(COLORS.furSpot, 1);
  g.fillCircle(40, 86, 4);
  g.fillCircle(56, 93, 3.5);
  g.fillCircle(33, 94, 3);
  g.fillCircle(48, 76, 2.5);
  strokePolygon(g, pelt);

  // Ближняя рука и кулак — в нём рукоять дубины.
  outlinedEllipse(g, 66, 80, 12, 22, COLORS.skin);
  outlinedCircle(g, 70, 92, 6, COLORS.skin);
}

// Крупная голова: копна волос, чёлка, сросшаяся бровь, нос картошкой и борода.
function drawPlayerHead(g: Graphics): void {
  // Копна волос сзади и сверху: круги x, y, радиус.
  outlinedBlobs(g, [34, 34, 16, 46, 24, 16, 60, 24, 13, 28, 48, 12, 70, 32, 9], COLORS.hair);

  outlinedCircle(g, 52, 46, 24, COLORS.skin);
  // Ухо.
  outlinedCircle(g, 33, 50, 6, COLORS.skin);
  g.fillStyle(COLORS.skinShade, 1);
  g.fillCircle(33, 50, 3);

  // Чёлка зубцами и блик на волосах.
  const bangs = [30, 38, 36, 24, 50, 19, 66, 21, 77, 32, 72, 37, 66, 30, 62, 39, 56, 30, 50, 39, 44, 30, 38, 39];
  fillPolygon(g, bangs, COLORS.hair);
  strokePolygon(g, bangs);
  g.fillStyle(COLORS.hairLight, 1);
  g.fillEllipse(48, 25, 14, 4);

  // Сросшаяся бровь, глаз и румянец.
  g.fillStyle(COLORS.hair, 1);
  g.fillRoundedRect(54, 41, 22, 5, 2);
  g.fillStyle(COLORS.eye, 1);
  g.fillEllipse(65, 50, 9, 11);
  g.lineStyle(THIN_OUTLINE_WIDTH, COLORS.outline, 1);
  g.strokeEllipse(65, 50, 9, 11);
  g.fillStyle(COLORS.outline, 1);
  g.fillCircle(67, 51, 2.6);
  g.fillStyle(COLORS.cheek, 0.6);
  g.fillCircle(58, 60, 4.5);

  // Борода с зубчатым низом и светлыми прядями.
  const beard = [38, 56, 48, 63, 60, 63, 72, 61, 80, 63, 79, 72, 74, 80, 68, 77, 62, 86, 56, 79, 49, 85, 44, 76, 37, 68];
  fillPolygon(g, beard, COLORS.hair);
  strokePolygon(g, beard);
  g.lineStyle(THIN_OUTLINE_WIDTH, COLORS.hairLight, 1);
  g.lineBetween(47, 70, 50, 78);
  g.lineBetween(57, 72, 59, 80);

  // Улыбка с зубами.
  g.fillStyle(COLORS.outline, 1);
  g.fillEllipse(68, 69, 11, 6);
  g.fillStyle(COLORS.eye, 1);
  g.fillRect(64, 66, 7, 2);

  // Нос картошкой — поверх бороды.
  outlinedCircle(g, 77, 56, 7.5, COLORS.skin);
  g.fillStyle(COLORS.skinShade, 1);
  g.fillCircle(78, 59, 2);
}

// Дубина: рукоять внизу (конец рукояти — точка опоры), шишковатая голова сверху.
function drawClub(g: Graphics): void {
  const { w, h } = CLUB_SIZE;
  const cx = w / 2;

  g.fillStyle(COLORS.woodDark, 1);
  g.fillRoundedRect(cx - 4, 34, 8, h - 36, 3);
  g.lineStyle(OUTLINE_WIDTH, COLORS.outline, 1);
  g.strokeRoundedRect(cx - 4, 34, 8, h - 36, 3);

  // Голова дубины: тень справа, блик слева, сучки.
  g.fillStyle(COLORS.wood, 1);
  g.fillEllipse(cx, 22, 24, 40);
  g.fillStyle(COLORS.woodDark, 1);
  g.fillEllipse(cx + 5, 25, 10, 28);
  g.fillStyle(COLORS.woodLight, 1);
  g.fillEllipse(cx - 5, 16, 6, 16);
  g.fillStyle(COLORS.woodDark, 1);
  g.fillCircle(cx - 4, 30, 2.5);
  g.fillCircle(cx + 2, 9, 2);
  g.lineStyle(OUTLINE_WIDTH, COLORS.outline, 1);
  g.strokeEllipse(cx, 22, 24, 40);
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

// Заснеженный куст хвороста: сухие ветки торчат во все стороны, сверху шапки снега.
function drawBush(g: Graphics): void {
  const { w, h } = BUSH_SIZE;
  const cx = w / 2;

  // Ветки позади куста: от основания к кончикам (x, y).
  const twigTips = [14, 30, 28, 12, 82, 10, 100, 28, 106, 50, 5, 50];
  for (let i = 0; i < twigTips.length; i += 2) {
    drawTwig(g, cx, h - 18, twigTips[i], twigTips[i + 1]);
  }

  // Тело куста — клубок веток с общей обводкой.
  outlinedBlobs(g, [32, 62, 22, 80, 62, 22, 56, 48, 24, 44, 70, 16, 68, 70, 16], COLORS.brush);
  // Тень внизу справа и светлые веточки — так куст выглядит объёмным.
  g.fillStyle(COLORS.brushDark, 1);
  g.fillCircle(78, 70, 13);
  g.fillCircle(60, 76, 11);
  g.lineStyle(THIN_OUTLINE_WIDTH, COLORS.brushLight, 1);
  g.lineBetween(50, 58, 58, 50);
  g.lineBetween(72, 58, 84, 52);
  g.lineBetween(40, 72, 48, 66);
  g.lineBetween(26, 58, 34, 52);

  // Снежные шапки сверху: левые — белые, правая — в голубой тени.
  g.fillStyle(COLORS.snowLight, 1);
  g.fillEllipse(54, 30, 36, 14);
  g.fillEllipse(30, 44, 28, 11);
  g.fillCircle(44, 35, 4);
  g.fillCircle(58, 37, 3.5);
  g.fillCircle(24, 48, 3);
  g.fillStyle(COLORS.snowShade, 1);
  g.fillEllipse(82, 44, 28, 11);
  g.fillCircle(88, 48, 3);

  // Пара веток торчит прямо из снега.
  drawTwig(g, 46, 32, 38, 12);
  drawTwig(g, 64, 30, 74, 10);

  // Снег у подножия.
  g.fillStyle(COLORS.snowShade, 1);
  g.fillEllipse(cx, h - 6, w - 18, 10);
  g.fillStyle(COLORS.snowLight, 1);
  g.fillEllipse(cx - 4, h - 8, w - 34, 7);
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

// Пенёк: короткий ствол со светлым срезом и кольцами, корни и снег у подножия.
function drawStump(g: Graphics): void {
  const { w, h } = STUMP_SIZE;
  const cx = w / 2;

  g.fillStyle(COLORS.snowShade, 1);
  g.fillEllipse(cx, h - 6, w - 6, 10);

  // Корни.
  g.fillStyle(COLORS.woodDark, 1);
  g.fillTriangle(10, h - 5, 24, h - 22, 26, h - 5);
  g.fillTriangle(w - 10, h - 5, w - 24, h - 22, w - 26, h - 5);

  // Ствол: светлая левая сторона, тёмная правая, полоски коры.
  const trunk = [cx - 16, 22, cx + 16, 22, cx + 18, h - 4, cx - 18, h - 4];
  fillPolygon(g, trunk, COLORS.wood);
  fillPolygon(g, [cx + 4, 22, cx + 16, 22, cx + 18, h - 4, cx + 5, h - 4], COLORS.woodDark);
  g.lineStyle(THIN_OUTLINE_WIDTH, COLORS.woodDark, 1);
  g.lineBetween(cx - 8, 28, cx - 9, h - 8);
  g.lineBetween(cx - 1, 30, cx - 1, h - 10);
  strokePolygon(g, trunk);

  // Срез сверху с годовыми кольцами и шапкой снега.
  outlinedEllipse(g, cx, 22, 34, 14, COLORS.woodEnd);
  g.lineStyle(1.5, COLORS.woodLight, 1);
  g.strokeEllipse(cx, 22, 22, 8);
  g.strokeEllipse(cx, 22, 10, 4);
  g.fillStyle(COLORS.snowLight, 1);
  g.fillEllipse(cx - 7, 18, 18, 7);

  g.fillEllipse(cx - 4, h - 5, w - 26, 6);
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

// ===== Частицы =====

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

// ===== Помощники рисования =====

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
