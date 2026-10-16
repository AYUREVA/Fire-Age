import Phaser from 'phaser';
// Игровые параметры (мир, вождь, кусты и т. д.) — в settings.ts.
import {
  WORLD_WIDTH,
  WORLD_HEIGHT,
  WORLD_EDGE,
  PLAYER_START,
  BUSH_POSITIONS,
  CAMPFIRE_POSITION,
  WOODPILE_POSITION,
} from '../settings';
import { TEXTURES, createTextures, loadFonts } from '../textures';
import { Player } from '../objects/Player';
import { CarryStack } from '../objects/CarryStack';
import { ResourceNode } from '../objects/ResourceNode';
import { DropZone } from '../objects/DropZone';
import { Campfire } from '../objects/Campfire';
import { Hud } from '../objects/Hud';
import { CycleEvent, DayNightCycle } from '../objects/DayNightCycle';
import { updateDropping, updateGathering } from '../systems/Gathering';
import { updateFire } from '../systems/Fire';
import { ResultData } from './ResultScene';

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
// Дальше (в других файлах): площадка поленницы и свет костра — -100 (DropZone.ts, Campfire.ts),
// летящие связки — 10000, «+1» — 11000 (fx.ts), «МАКС» — 10500 (CarryStack.ts),
// падающий снег — 12000 (здесь), HUD и джойстик — 20000 (Hud.ts, Player.ts).
const SNOWFALL_DEPTH = 12000;

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
// Мелкий декор не кладём ближе этого расстояния к кусту — чтобы не торчал из куста —
// и к поленнице — чтобы лагерь с костром стоял на чистом снегу.
const BUSH_CLEAR_RADIUS = 80;
const CAMP_CLEAR_RADIUS = 330;

// ===== Падающий снег =====

// Снежинки медленно падают, их чуть сносит ветром, они появляются и тают.
// Живых снежинок немного — игра должна идти плавно и на слабом ноутбуке.
const SNOWFALL: Phaser.Types.GameObjects.Particles.ParticleEmitterConfig = {
  speedX: { min: -20, max: 8 },
  speedY: { min: 25, max: 60 },
  lifespan: { min: 3000, max: 4500 },
  scale: { min: 0.35, max: 0.8 },
  alpha: { values: [0, 0.9, 0.9, 0] }, // появляется, летит, тает
  frequency: 90, // новая снежинка раз в 90 мс
  maxAliveParticles: 45, // не больше 45 снежинок сразу
};

// ===== Камера =====

// Плавность камеры: какую долю пути до вождя камера проходит за кадр (1 — сразу).
const CAMERA_LERP = 0.08;
// Камера смотрит чуть выше ног вождя, чтобы в кадр помещалась стопка за спиной.
const CAMERA_OFFSET_Y = 60;

/**
 * Игра «Fire Age», версия 0.2.
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
  // Стопка хвороста за спиной вождя.
  private stack!: CarryStack;
  // Кусты хвороста.
  private bushes: ResourceNode[] = [];
  // Поленница у костра — сюда сдаётся хворост.
  private dropZone!: DropZone;
  // Костёр в лагере.
  private campfire!: Campfire;
  // Интерфейс: сколько осталось до конца дня или ночи, кнопка паузы.
  private hud!: Hud;
  // Смена дня и ночи: фаза, номер суток, сколько осталось до конца фазы.
  private cycle!: DayNightCycle;
  // Игра окончена (победа или поражение) — ждём рестарта.
  private isOver = false;

  constructor() {
    super('GameScene');
  }

  // Загрузка перед create(): шрифт заголовков (картинки рисуются кодом в create()).
  preload(): void {
    loadFonts(this);
  }

  create(): void {
    // При перезапуске сцены create() вызывается снова, а поля класса
    // сохраняют старые значения, поэтому сбрасываем их здесь.
    this.bushes = [];
    this.isOver = false;

    createTextures(this);

    // Одинаковый seed — одинаковый декор при каждом запуске.
    const rng = new Phaser.Math.RandomDataGenerator([DECOR_SEED]);

    this.createGround();
    this.createGroundDecor(rng);
    this.createBorderForest(rng);
    this.createBushes();
    // Сначала костёр: его свет лежит на земле под краем площадки поленницы.
    this.campfire = new Campfire(this, CAMPFIRE_POSITION.x, CAMPFIRE_POSITION.y);
    this.dropZone = new DropZone(this, WOODPILE_POSITION.x, WOODPILE_POSITION.y);

    this.player = new Player(this, PLAYER_START.x, PLAYER_START.y);
    this.stack = new CarryStack(this);
    this.cycle = new DayNightCycle();
    this.hud = new Hud(this, () => this.pauseGame());
    this.hud.setTimeLeft(this.cycle.timeLeft);

    this.setupCamera();
    this.createSnowfall();
    this.setupPause();
  }

  // Вызывается Phaser каждый кадр. delta — сколько мс прошло с прошлого кадра.
  // Порядок: сначала двигаем вождя, потом стопку за ним, потом системы
  // (systems/) проверяют, что вождь делает рядом с кустами и с поленницей.
  update(_time: number, delta: number): void {
    this.player.update(delta);
    // Стопке сообщаем, где спина вождя, как быстро он идёт и какая у него глубина.
    this.stack.update(delta, this.player.getBackPoint(), this.player.velocityX, this.player.y);

    for (const bush of this.bushes) {
      bush.update(delta);
    }

    updateGathering(this.player, this.stack, this.bushes, delta);
    updateDropping(this.player, this.stack, this.dropZone, delta);
    const isFireOut = updateFire(this.campfire, this.dropZone, delta);
    this.campfire.update(delta);

    const cycleEvent = this.cycle.update(delta);
    this.hud.setTimeLeft(this.cycle.timeLeft);

    // Костёр погас — поражение. Остальное решают события смены дня и ночи.
    if (isFireOut) {
      this.endGame(false);
    } else if (cycleEvent) {
      this.onCycleEvent(cycleEvent);
    }
  }

  // ===== День и ночь =====

  // Фаза сменилась: сцена включает ночь или утро. Рассвет после последней ночи — победа.
  private onCycleEvent(event: CycleEvent): void {
    switch (event) {
      case 'sunset':
        break;
      case 'night':
        this.hud.setPhase(true);
        break;
      case 'morning':
        this.hud.setPhase(false);
        break;
      case 'lastDawn':
        this.endGame(true);
        break;
    }
  }

  // ===== Пауза =====

  // Пауза: клавиши P и Esc, кнопка в HUD (её подключает Hud) и автопауза,
  // когда вкладку свернули.
  private setupPause(): void {
    this.input.keyboard?.on('keydown-P', () => this.pauseGame());
    this.input.keyboard?.on('keydown-ESC', () => this.pauseGame());

    // Событие «вкладка скрыта» приходит от всей игры, а не от сцены. Поэтому
    // при выключении сцены (рестарт) подписку снимаем, иначе их станет две.
    this.game.events.on(Phaser.Core.Events.HIDDEN, this.pauseGame, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.game.events.off(Phaser.Core.Events.HIDDEN, this.pauseGame, this);
    });
  }

  // Игра замирает целиком (update, твины, таймеры, частицы), поверх — табличка «ПАУЗА».
  private pauseGame(): void {
    // Игра уже окончена или уже на паузе — ничего не делаем.
    if (this.isOver || this.scene.isPaused()) return;

    this.scene.pause();
    this.scene.launch('PauseScene');
  }

  // ===== Конец игры =====

  // Игра замирает (пауза сцены), поверх неё — табличка с итогом.
  // Рестарт запускает ResultScene: GameScene создаётся заново с нуля.
  private endGame(isWin: boolean): void {
    if (this.isOver) return;
    this.isOver = true;

    this.scene.pause();
    const data: ResultData = { isWin };
    this.scene.launch('ResultScene', data);
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
      if (this.isNearImportantPlace(x, y)) continue;

      this.add
        .image(x, y, texture)
        .setDepth(GROUND_DECOR_DEPTH)
        // Половина декора отражена — так он меньше повторяется.
        .setFlipX(rng.frac() < 0.5);
    }
  }

  // Рядом ли точка (x, y) с кустом или с лагерем — там декор не кладём.
  private isNearImportantPlace(x: number, y: number): boolean {
    const nearCamp =
      Phaser.Math.Distance.Between(x, y, WOODPILE_POSITION.x, WOODPILE_POSITION.y) < CAMP_CLEAR_RADIUS;
    const nearBush = BUSH_POSITIONS.some(
      (bush) => Phaser.Math.Distance.Between(x, y, bush.x, bush.y) < BUSH_CLEAR_RADIUS,
    );
    return nearCamp || nearBush;
  }

  // Сажает кусты хвороста в точки из settings.ts.
  private createBushes(): void {
    for (const position of BUSH_POSITIONS) {
      this.bushes.push(new ResourceNode(this, position.x, position.y));
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

  // Лёгкий падающий снег. Снежинки рождаются в видимой части мира:
  // эмиттер следит за левым верхним углом того, что видит камера (worldView).
  // Сами снежинки остаются в мире — когда камера едет, они не едут за ней.
  private createSnowfall(): void {
    const { width, height } = this.scale;
    this.add
      .particles(0, 0, TEXTURES.snowflake, {
        ...SNOWFALL,
        // Место рождения снежинки — случайная точка в прямоугольнике размером с экран.
        emitZone: {
          type: 'random',
          source: {
            getRandomPoint: (point) => {
              point.x = Phaser.Math.Between(0, width);
              point.y = Phaser.Math.Between(0, height);
            },
          },
        },
        // Прямоугольник едет вместе с камерой.
        follow: this.cameras.main.worldView,
      })
      .setDepth(SNOWFALL_DEPTH);
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
