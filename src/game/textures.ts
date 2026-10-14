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
} as const;

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

// ===== Параметры рисования =====

// Толщина обводки у всех рисунков.
const OUTLINE_WIDTH = 3;
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
  g.lineStyle(2, COLORS.outline, 1);
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

// ===== Помощники рисования =====

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
