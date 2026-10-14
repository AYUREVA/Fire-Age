import Phaser from 'phaser';
// Игровые параметры (размер мира и т. д.) — в settings.ts.
import { WORLD_WIDTH, WORLD_HEIGHT, WORLD_EDGE, PLAYER_START } from './settings';
import { TEXTURES, createTextures } from './textures';
import { Player } from './objects/Player';

// ===== Слои отрисовки (depth) =====
// Порядок снизу вверх во всей игре:
//   земля → декор на земле → всё, что стоит на земле (depth = y ног:
//   кто ниже на экране, тот впереди; тень — чуть ниже своего владельца).

// Снежная земля — в самом низу.
const GROUND_DEPTH = -300;
// Пятна снега, сугробы, камешки и трава лежат на земле.
const GROUND_DECOR_DEPTH = -200;
// Тень лежит сразу под своим предметом.
const SHADOW_DEPTH_SHIFT = -0.5;

// ===== Декор мира =====

// «Зерно» случайных чисел для декора. Пока оно не меняется,
// декор раскладывается одинаково при каждом запуске.
const DECOR_SEED = 'fire-age';
// Сколько штук мелкого декора разбросано по снегу.
const GROUND_DECOR_COUNT = 90;
// Из чего выбирается мелкий декор. Ключ повторён — значит, встречается чаще.
const GROUND_DECOR_TEXTURES = [
  TEXTURES.snowPatch,
  TEXTURES.snowPatch,
  TEXTURES.snowPatch,
  TEXTURES.snowDrift,
  TEXTURES.snowDrift,
  TEXTURES.pebble,
  TEXTURES.grassTuft,
  TEXTURES.grassTuft,
];

// Расстояние между деревьями в полосе леса по краю мира.
const FOREST_STEP = 70;
// Насколько дерево может сдвинуться от ровной линии, чтобы лес не стоял «по линейке».
const FOREST_JITTER = 26;
// Доля скал среди деревьев (0.15 — примерно каждая седьмая).
const FOREST_ROCK_CHANCE = 0.15;
// Разброс размера деревьев и скал.
const FOREST_SCALE_MIN = 0.8;
const FOREST_SCALE_MAX = 1.15;
// Ширина тени относительно ширины предмета.
const SHADOW_WIDTH_RATIO = 0.85;

// ===== Камера =====

// Плавность камеры: какую долю пути до вождя камера проходит за кадр (1 — сразу).
const CAMERA_LERP = 0.08;
// Камера смотрит чуть выше ног вождя, чтобы в кадр помещалась стопка за спиной.
const CAMERA_OFFSET_Y = 60;

/**
 * Игра «Племя у огня», версия 0.1.
 *
 * Ледниковый период, вид сверху под углом. Вождь племени ходит по
 * заснеженному миру, рубит кусты хвороста и носит хворост к костру.
 *
 * Сцена создаёт мир и все объекты, а в update() связывает их между собой.
 * Только сцена знает обо всех объектах — сами объекты друг о друге не знают.
 */
export class GameScene extends Phaser.Scene {
  // Вождь — его водит игрок.
  private player!: Player;

  constructor() {
    super('GameScene');
  }

  create(): void {
    createTextures(this);

    // Одинаковый seed — одинаковый декор при каждом запуске.
    const rng = new Phaser.Math.RandomDataGenerator([DECOR_SEED]);

    this.createGround();
    this.createGroundDecor(rng);
    this.createBorderForest(rng);

    this.player = new Player(this, PLAYER_START.x, PLAYER_START.y);

    this.setupCamera();
  }

  // Вызывается Phaser каждый кадр. delta — сколько мс прошло с прошлого кадра.
  update(_time: number, delta: number): void {
    this.player.update(delta);
  }

  // ===== Мир =====

  // Земля — снежная плитка, повторённая на весь мир.
  private createGround(): void {
    this.add
      .tileSprite(0, 0, WORLD_WIDTH, WORLD_HEIGHT, TEXTURES.snowTile)
      .setOrigin(0, 0)
      .setDepth(GROUND_DEPTH);
  }

  // Раскладывает по снегу мелкий декор: пятна, сугробы, камешки, сухую траву.
  private createGroundDecor(rng: Phaser.Math.RandomDataGenerator): void {
    for (let i = 0; i < GROUND_DECOR_COUNT; i++) {
      const x = rng.between(WORLD_EDGE, WORLD_WIDTH - WORLD_EDGE);
      const y = rng.between(WORLD_EDGE, WORLD_HEIGHT - WORLD_EDGE);
      const texture = rng.pick(GROUND_DECOR_TEXTURES);

      this.add
        .image(x, y, texture)
        .setDepth(GROUND_DECOR_DEPTH)
        // Половина декора отражена — так он меньше повторяется.
        .setFlipX(rng.frac() < 0.5);
    }
  }

  // Сажает ели и ставит скалы полосой по краям мира, чтобы за краем не было пустоты.
  // Вдоль каждого края — два ряда: дальний и ближний к полю.
  private createBorderForest(rng: Phaser.Math.RandomDataGenerator): void {
    const near = WORLD_EDGE * 0.8;
    const far = WORLD_EDGE * 0.3;

    // Верхний край: стволы у верхней границы, кроны уходят за край мира.
    this.plantForestRow(rng, 0, far, WORLD_WIDTH, far);
    this.plantForestRow(rng, 0, near, WORLD_WIDTH, near);
    // Нижний край: деревья стоят у самой границы и чуть заходят на поле кронами.
    this.plantForestRow(rng, 0, WORLD_HEIGHT - far, WORLD_WIDTH, WORLD_HEIGHT - far);
    this.plantForestRow(rng, 0, WORLD_HEIGHT + far, WORLD_WIDTH, WORLD_HEIGHT + far);
    // Левый и правый края.
    this.plantForestRow(rng, far, 0, far, WORLD_HEIGHT);
    this.plantForestRow(rng, near, 0, near, WORLD_HEIGHT);
    this.plantForestRow(rng, WORLD_WIDTH - far, 0, WORLD_WIDTH - far, WORLD_HEIGHT);
    this.plantForestRow(rng, WORLD_WIDTH - near, 0, WORLD_WIDTH - near, WORLD_HEIGHT);
  }

  // Ряд деревьев от точки (x1, y1) до точки (x2, y2) через каждые FOREST_STEP пикселей.
  private plantForestRow(
    rng: Phaser.Math.RandomDataGenerator,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
  ): void {
    const length = Phaser.Math.Distance.Between(x1, y1, x2, y2);
    const count = Math.floor(length / FOREST_STEP);

    for (let i = 0; i <= count; i++) {
      // t — доля пути от начала ряда до конца (0…1).
      const t = i / count;
      const x = Phaser.Math.Linear(x1, x2, t) + rng.between(-FOREST_JITTER, FOREST_JITTER);
      const y = Phaser.Math.Linear(y1, y2, t) + rng.between(-FOREST_JITTER, FOREST_JITTER);
      const texture = rng.frac() < FOREST_ROCK_CHANCE ? TEXTURES.rock : TEXTURES.fir;
      const scale = rng.realInRange(FOREST_SCALE_MIN, FOREST_SCALE_MAX);

      this.addStandingImage(x, y, texture, scale).setFlipX(rng.frac() < 0.5);
    }
  }

  // Ставит «стоящую» картинку ногами в точку (x, y) и кладёт под неё тень.
  // Глубина = y: кто ниже на экране, тот рисуется впереди.
  private addStandingImage(x: number, y: number, texture: string, scale: number): Phaser.GameObjects.Image {
    const image = this.add.image(x, y, texture).setOrigin(0.5, 1).setScale(scale).setDepth(y);

    const shadow = this.add.image(x, y, TEXTURES.shadow);
    // Растягиваем тень так, чтобы она была чуть уже предмета.
    shadow.setScale((image.displayWidth * SHADOW_WIDTH_RATIO) / shadow.width);
    shadow.setDepth(y + SHADOW_DEPTH_SHIFT);

    return image;
  }

  // ===== Камера =====

  // Камера плавно следует за вождём и не показывает ничего за пределами мира.
  private setupCamera(): void {
    const camera = this.cameras.main;
    camera.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    // Следить можно за любым объектом с x и y — у вождя это точка ног.
    camera.startFollow(this.player, false, CAMERA_LERP, CAMERA_LERP, 0, CAMERA_OFFSET_Y);
  }
}
