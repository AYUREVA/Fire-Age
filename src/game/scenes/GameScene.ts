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
  WOODPILE_CAPACITY,
  RABBIT_COUNT,
  WOLF_RETURN_TIME_MAX,
  WOLF_RETURN_TIME_MIN,
  RAW_MEAT_PILE_POSITION,
  RAW_MEAT_PILE_CAPACITY,
  COOKED_MEAT_PILE_POSITION,
  TABLE_POSITION,
  QUEUE_SIZE,
  COOKED_MEAT_PILE_CAPACITY,
  PHASES,
  FIRE_MAX_HEAT,
  STACK_CAPACITY,
  ICE_HOLE_POSITION,
  SMALL_FIRE_POSITION,
  SMALL_FIRE_SIZE,
  SMALL_WOODPILE_POSITION,
  SMALL_WOODPILE_CAPACITY,
  RAW_FISH_PILE_POSITION,
  RAW_FISH_PILE_CAPACITY,
  COOKED_FISH_PILE_POSITION,
  COOKED_FISH_PILE_CAPACITY,
  MAMMOTH_START,
  MAMMOTH_FALL_TIME,
  BOSS_SHAKE_TIME,
  BOSS_SHAKE_INTENSITY,
  BOSS_INTRO_TIME,
  BOSS_FINALE_SLOW,
  BOSS_FINALE_SLOW_TIME,
} from '../settings';
import { TEXTURES, createTextures, loadFonts } from '../textures';
import { SOUNDS, SOUND_VOLUMES, createSounds, playSound } from '../sounds';
import { Player } from '../objects/Player';
import { Backpack } from '../objects/Backpack';
import { ResourceNode } from '../objects/ResourceNode';
import { ItemPile } from '../objects/ItemPile';
import { Rabbit } from '../objects/Rabbit';
import { Loot, Wolf } from '../objects/Wolf';
import { Spit } from '../objects/Spit';
import { StoneTable } from '../objects/StoneTable';
import { Traveler } from '../objects/Traveler';
import { Campfire } from '../objects/Campfire';
import { BuyZone } from '../objects/BuyZone';
import { Hut } from '../objects/Hut';
import { Fence } from '../objects/Fence';
import { IceHole } from '../objects/IceHole';
import { Helper } from '../objects/Helper';
import { Mammoth } from '../objects/Mammoth';
import { CanStep, sway } from '../fx';
import { Hud } from '../objects/Hud';
import { CycleEvent, DayNightCycle } from '../objects/DayNightCycle';
import { NightOverlay } from '../objects/NightOverlay';
import { PhaseBanner } from '../ui/PhaseBanner';
import { BossBar } from '../ui/BossBar';
import { FireArrow } from '../ui/FireArrow';
import { BossCinema } from '../ui/BossCinema';
import { TutorialHint } from '../ui/TutorialHint';
import { StarGoals, describeStarGoals } from '../ui/StarGoals';
import { updateTutorial } from '../systems/Tutorial';
import { updateDropping, updateFishing, updateGathering, updateHunting, updatePickup } from '../systems/Gathering';
import { updateCooking } from '../systems/Cooking';
import { updateTable, updateTravelers, updateTusks } from '../systems/Serving';
import { updateFire } from '../systems/Fire';
import { updatePurchases } from '../systems/Purchases';
import { updateWolfFight, updateWolves } from '../systems/Predators';
import { updateHelpers } from '../systems/Helpers';
import { BossWorld, chooseAim, updateMammoth, updateMammothFight, updateSpilled } from '../systems/Boss';
import { HELPERS, HelperRole, WEAPONS } from '../data/upgrades';
import { LEVELS, LEVELS_PER_EPOCH, LevelData } from '../data/levels';
import { LevelOutcome, LevelStats, PauseSource, track } from '../analytics';
import { getProgress, recordLevel, unlockAchievements } from '../save';
import { ACHIEVEMENTS } from '../data/achievements';
import { metaBonus } from '../data/metaUpgrades';
import { ReadyData } from './ReadyScene';
import { PauseData } from './PauseScene';
import { ResultData } from './ResultScene';
import { MenuData } from './MenuScene';

// ===== Режим игры =====

// Режим игры — автомат из четырёх состояний (раздел 9 плана, правило 11):
// 'ready'   — мир построен и стоит, поверх табличка «Нажми, чтобы начать»;
// 'playing' — игра идёт;
// 'paused'  — пауза, поверх табличка «ПАУЗА»;
// 'result'  — победа или поражение, поверх табличка итога.
type GameMode = 'ready' | 'playing' | 'paused' | 'result';

// Лагерь у проруби (с 0.8): прорубь, малый костёр с вертелом, его поленница
// и кучи сырой и жареной рыбы. Есть только на уровне с рыбалкой.
type FishCamp = {
  hole: IceHole;
  fire: Campfire;
  woodpile: ItemPile;
  spit: Spit;
  rawPile: ItemPile;
  cookedPile: ItemPile;
};

// С какими данными запускается сцена: какой уровень играем (номер в LEVELS, с нуля).
export type GameData = { levelIndex?: number };

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
// Дальше (в других файлах): площадки куч и свет костра — -100 (ItemPile.ts, Campfire.ts),
// летящие связки — 10000, «+1» — 11000 (fx.ts), «МАКС» — 10500 (CarryStack.ts),
// закат и ночная тьма — 11400 и 11500 (NightOverlay.ts), падающий снег — 12000 (здесь),
// метель — 12100 (NightOverlay.ts), HUD и джойстик — 20000 (Hud.ts, Player.ts).
const SNOWFALL_DEPTH = 12000;

// Шаг мамонта — тот же глухой удар, что у оружия, на октаву ниже (в центах).
const BOSS_STEP_DETUNE = -1200;

// Сценка выхода мамонта (с 0.9.1), мс от её начала: камера едет к лесу (насколько ниже
// точки выхода смотрит и за сколько мс), тряска и снег с деревьев, мамонт выходит
// (и проходит столько пикселей вниз), рёв с табличкой «МАМОНТ», камера возвращается к вождю.
const INTRO_CAMERA_DROP = 216;
const INTRO_PAN_TIME = 900;
const INTRO_QUAKE_AT = 600;
const INTRO_APPEAR_AT = 900;
const INTRO_WALK = 300;
const INTRO_ROAR_AT = 2600;
const INTRO_ROAR_SHAKE_TIME = 900;
const INTRO_ROAR_SHAKE = 0.012;
const INTRO_RETURN_AT = 4000;
const INTRO_PAN_BACK_TIME = 550;

// Добивание (с 0.9.1): камера наезжает на мамонта (во сколько раз, за сколько мс, насколько
// выше ног смотрит), потом вспышка, тряска и камера отъезжает обратно.
const FINALE_ZOOM = 1.4;
const FINALE_ZOOM_TIME = 400;
const FINALE_LIFT = 110;
const FINALE_FLASH_TIME = 250;
const FINALE_SHAKE_TIME = 500;
const FINALE_SHAKE = 0.012;
const FINALE_ZOOM_BACK_TIME = 450;

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
// Два ряда леса вдоль края: ближний к полю и дальний — на такой доле ширины полосы леса.
const FOREST_NEAR_SHARE = 0.8;
const FOREST_FAR_SHARE = 0.3;
// Доля скал среди деревьев (0.15 — примерно каждая седьмая).
const FOREST_ROCK_CHANCE = 0.15;
// Разброс размера деревьев и скал.
const FOREST_SCALE_MIN = 0.8;
const FOREST_SCALE_MAX = 1.15;
// Ширина тени относительно ширины предмета.
const SHADOW_WIDTH_RATIO = 0.85;
// Мелкий декор не кладём ближе этого расстояния к кусту — чтобы не торчал из куста —
// к костру — чтобы лагерь (костёр, вертел, кучи) стоял на чистом снегу —
// и к столу — чтобы на чистом снегу стояли стол и очередь путников под ним.
const BUSH_CLEAR_RADIUS = 80;
const CAMP_CLEAR_RADIUS = 360;
const TABLE_CLEAR_RADIUS = 320;
// Середина чистого места у стола — ниже стола, там стоит очередь.
const TABLE_CLEAR_SHIFT_Y = 120;
// На уровне с прорубью декор не кладём и у малого костра — там прорубь и кучи рыбы.
// Середина чистого места — чуть ниже костра, между ним, прорубью и кучей жареной рыбы.
const FISH_CAMP_CLEAR_RADIUS = 300;
const FISH_CAMP_CLEAR_SHIFT_Y = 60;

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
  // Какой уровень играем: номер в LEVELS (с нуля) и его данные (data/levels.ts).
  private levelIndex = 0;
  private level!: LevelData;
  // Вождь — его водит игрок.
  private player!: Player;
  // Всё, что вождь несёт за спиной: колонки хвороста и мяса.
  private backpack!: Backpack;
  // Кусты хвороста.
  private bushes: ResourceNode[] = [];
  // Кролики на поле.
  private rabbits: Rabbit[] = [];
  // Волки: созданы заранее (сколько может быть на поле ночью), выходят из леса по одному.
  private wolves: Wolf[] = [];
  // Поленница у костра — сюда сдаётся хворост, из неё кормится огонь.
  private woodpile!: ItemPile;
  // Костёр в лагере.
  private campfire!: Campfire;
  // Кухня: куча сырого мяса, вертел над огнём, куча жареного мяса.
  private rawMeatPile!: ItemPile;
  private spit!: Spit;
  private cookedMeatPile!: ItemPile;
  // Каменный стол: сюда вождь кладёт жареное мясо, у него очередь путников и кучка клыков.
  private table!: StoneTable;
  // Путники: созданы заранее (сколько мест в очереди), приходят из леса по очереди.
  private travelers: Traveler[] = [];
  // Точки покупки: клыки из счётчика → покупка. Оружие продаётся на одной точке.
  // Каких точек нет на уровне — того поля нет (undefined).
  private buyZones: BuyZone[] = [];
  private weaponZone?: BuyZone;
  // Хижины и их точки покупки (одинаковый порядок: hutZones[i] строит huts[i]).
  private huts: Hut[] = [];
  private hutZones: BuyZone[] = [];
  // Помощники и их точки найма (одинаковый порядок: helperZones[i] нанимает helpers[i]).
  private helpers: Helper[] = [];
  private helperZones: BuyZone[] = [];
  // Частокол вокруг лагеря и его точка покупки.
  private fence!: Fence;
  private fenceZone?: BuyZone;
  // Лагерь у проруби — только на уровне с рыбалкой (иначе undefined).
  private fishCamp?: FishCamp;
  // Мамонт — только на уровне с боссом (иначе undefined). До дня боя он спрятан.
  private mammoth?: Mammoth;
  // Полоса здоровья мамонта — только на уровне с боссом.
  private bossBar?: BossBar;
  // Предметы, рассыпанные по снегу тараном мамонта: лежат, пока вождь их не подберёт.
  private spilled: Loot[] = [];
  // Интерфейс: сколько осталось до конца дня или ночи, кнопка паузы.
  private hud!: Hud;
  // Киношные экраны боя с мамонтом: полосы, табличка «МАМОНТ», печать «ПОВЕРЖЕН!» (с 0.9.1).
  private bossCinema!: BossCinema;
  // Сколько мс ещё идёт сценка выхода мамонта: пока > 0, мир стоит (с 0.9.1).
  private bossIntroTime = 0;
  // Добивание: началось ли и сколько мс настоящего времени ещё длится замедление.
  private isFinaleStarted = false;
  private finaleSlowLeft = 0;
  // HUD спрятан на время сценки — стрелку к костру тоже не показываем.
  private isUiHidden = false;
  // Стрелка к главному костру у края экрана, когда его не видно (с 0.9.1).
  private fireArrow!: FireArrow;
  // Смена дня и ночи: фаза, номер суток, сколько осталось до конца фазы.
  private cycle!: DayNightCycle;
  // Вид ночи: закат, тьма со светлым пятном у костра, метель.
  private nightOverlay!: NightOverlay;
  // Уведомление о смене дня и ночи: табличка сверху экрана.
  private phaseBanner!: PhaseBanner;
  // Обучение стрелками-подсказками — только на уровне с обучением (иначе undefined).
  private tutorial?: TutorialHint;
  // Плашка «за что звёзды»: три цели и как они выполняются.
  private starGoals!: StarGoals;
  // Режим игры. Меняют его только функции переходов (раздел «Режим игры» ниже).
  private mode: GameMode = 'ready';
  // Во сколько раз вождь быстрее благодаря мета-улучшению «Быстрые ноги» (1 — не куплено).
  private speedBonus = 1;
  // Статистика уровня: накормлено, ушло голодными, клыки, время игры, волки.
  // Меняют системы, аналитика читает её в переходах (analytics.ts).
  private stats!: LevelStats;

  constructor() {
    super('GameScene');
  }

  // Перед create(): какой уровень играем. Без данных — первый уровень.
  init(data: GameData): void {
    this.levelIndex = data.levelIndex ?? 0;
    this.level = LEVELS[this.levelIndex];
  }

  // Загрузка перед create(): шрифт заголовков (картинки рисуются кодом в create()).
  preload(): void {
    loadFonts(this);
  }

  create(): void {
    // При перезапуске сцены create() вызывается снова, а поля класса
    // сохраняют старые значения, поэтому сбрасываем их здесь.
    this.bushes = [];
    this.rabbits = [];
    this.wolves = [];
    this.travelers = [];
    this.buyZones = [];
    this.huts = [];
    this.hutZones = [];
    this.helpers = [];
    this.helperZones = [];
    this.weaponZone = undefined;
    this.fenceZone = undefined;
    this.fishCamp = undefined;
    this.mammoth = undefined;
    this.bossBar = undefined;
    this.spilled = [];
    this.bossIntroTime = 0;
    this.isFinaleStarted = false;
    this.finaleSlowLeft = 0;
    this.isUiHidden = false;
    // Замедление добивания не должно пережить перезапуск сцены.
    this.time.timeScale = 1;
    this.tweens.timeScale = 1;
    this.mode = 'ready';
    this.stats = {
      fed: 0,
      hungry: 0,
      tusksEarned: 0,
      playTime: 0,
      wolvesDriven: 0,
      itemsStolen: 0,
      woodGathered: 0,
      meatCooked: 0,
      fishCaught: 0,
      fishCooked: 0,
      bossTime: 0,
      fishFed: 0,
    };

    createTextures(this);
    createSounds(this);
    // Уровень выключается («Заново», «Дальше», «В меню») — его звуки замолкают.
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.sound.stopAll());

    // Одинаковый seed — одинаковый декор при каждом запуске.
    const rng = new Phaser.Math.RandomDataGenerator([DECOR_SEED]);

    this.createGround();
    this.createGroundDecor(rng);
    this.createBorderForest(rng);
    this.createBushes();
    for (let i = 0; i < RABBIT_COUNT; i++) {
      this.rabbits.push(new Rabbit(this));
    }
    this.createWolves();
    // Сначала костёр: его свет лежит на земле под краем площадки поленницы.
    this.campfire = new Campfire(this, CAMPFIRE_POSITION.x, CAMPFIRE_POSITION.y);
    this.woodpile = new ItemPile(this, WOODPILE_POSITION.x, WOODPILE_POSITION.y, 'wood', WOODPILE_CAPACITY);
    this.spit = new Spit(this, CAMPFIRE_POSITION.x, CAMPFIRE_POSITION.y, 'cookedMeat');
    this.rawMeatPile = new ItemPile(
      this,
      RAW_MEAT_PILE_POSITION.x,
      RAW_MEAT_PILE_POSITION.y,
      'rawMeat',
      RAW_MEAT_PILE_CAPACITY,
    );
    this.cookedMeatPile = new ItemPile(
      this,
      COOKED_MEAT_PILE_POSITION.x,
      COOKED_MEAT_PILE_POSITION.y,
      'cookedMeat',
      COOKED_MEAT_PILE_CAPACITY,
    );
    this.table = new StoneTable(this, TABLE_POSITION.x, TABLE_POSITION.y);
    this.fence = new Fence(this);
    for (let i = 0; i < QUEUE_SIZE; i++) {
      this.travelers.push(new Traveler(this));
    }

    this.createBuyZones();
    if (this.level.fishing) this.fishCamp = this.createFishCamp();
    if (this.level.boss) this.mammoth = new Mammoth(this);

    // Мета-улучшения за звёзды (save.ts хранит, сколько раз куплено, metaUpgrades.ts — что дают):
    // скорость вождя, вместимость колонок за спиной, стартовый хворост в поленнице.
    const meta = getProgress().meta;
    this.speedBonus = 1 + metaBonus('speed', meta.speed);
    this.woodpile.fill(metaBonus('startWood', meta.startWood));

    this.player = new Player(this, PLAYER_START.x, PLAYER_START.y);
    this.backpack = new Backpack(this, STACK_CAPACITY + metaBonus('capacity', meta.capacity));
    this.cycle = new DayNightCycle(this.level.dayCount, this.level.day, this.level.night, this.level.boss?.day);
    this.hud = new Hud(this, () => this.pauseGame('button'));
    this.hud.setTimeLeft(this.cycle.timeLeft);
    this.hud.setHeat(this.campfire.heat, this.campfire.wasBelowMark, this.campfire.isEmbers());
    this.fireArrow = new FireArrow(this);
    this.bossCinema = new BossCinema(this);
    this.starGoals = new StarGoals(this, this.level.starFed, this.level.boss !== undefined);

    this.setupCamera();
    this.createSnowfall();
    this.nightOverlay = new NightOverlay(this);
    this.phaseBanner = new PhaseBanner(this);
    this.tutorial = this.level.hasTutorial ? new TutorialHint(this) : undefined;
    if (this.level.boss) this.bossBar = new BossBar(this);
    this.setupPause();

    // Мир построен — игра в режиме READY: ждём касания, клика или клавиши.
    // Ставить сцену на паузу внутри самого create() нельзя: после create()
    // Phaser сам помечает сцену работающей. Поэтому — сразу после create().
    this.events.once(Phaser.Scenes.Events.CREATE, () => this.showReady());
  }

  // Вызывается Phaser каждый кадр. delta — сколько мс прошло с прошлого кадра.
  // Порядок: сначала двигаем вождя, потом стопку за ним, потом системы
  // (systems/) проверяют, что вождь делает рядом с кустами и с поленницей.
  update(_time: number, rawDelta: number): void {
    // Добивание мамонта: время мира идёт медленнее, пока не кончится замедление.
    const delta = this.finaleSlowLeft > 0 ? rawDelta * BOSS_FINALE_SLOW : rawDelta;
    if (this.finaleSlowLeft > 0) {
      this.finaleSlowLeft -= rawDelta;
      if (this.finaleSlowLeft <= 0) this.endFinaleSlow();
    }
    // Сценка выхода мамонта: мир стоит, двигаются только мамонт и камера.
    if (this.bossIntroTime > 0) {
      this.updateBossIntro(rawDelta);
      return;
    }
    // Параметры текущей фазы суток. Ночью меняются три: скорость вождя,
    // скорость горения костра и скорость кроликов (таблица PHASES в settings.ts).
    const phase = PHASES[this.cycle.phase];
    // update() работает только в режиме PLAYING (в остальных сцена на паузе) —
    // здесь копится чистое время игры.
    this.stats.playTime += delta;

    this.player.update(delta, phase.playerSpeedMultiplier * this.speedBonus, this.canWalk);
    // Калитка, к которой подошёл вождь или нанятый помощник, распахивается.
    this.fence.update(delta, [this.player, ...this.helpers.filter((helper) => helper.isHired())]);
    // Рюкзаку сообщаем, где спина вождя, как быстро он идёт, его глубину и куда он смотрит.
    this.backpack.update(
      delta,
      this.player.getBackPoint(),
      this.player.velocityX,
      this.player.y,
      this.player.facing,
    );

    for (const bush of this.bushes) {
      bush.update(delta);
    }

    for (const rabbit of this.rabbits) {
      rabbit.update(delta, this.player.x, this.player.y, phase.rabbitSpeedMultiplier, this.canWalk);
    }

    // Сначала волки: вождь бьёт волка раньше, чем куст.
    updateWolves(
      this.wolves,
      this.player,
      this.backpack,
      this.stats,
      this.level.wolves?.[this.cycle.phase] ?? 0,
      this.canWolfStep,
      delta,
    );
    // Мамонт — раньше волков: уставший мамонт важнее всего.
    if (this.mammoth) {
      updateMammoth(this.mammoth, this.getBossWorld(), delta);
      if (this.mammoth.getState() === 'fallen' && !this.isFinaleStarted) this.startFinale();
      updateMammothFight(this.player, this.mammoth);
      updateSpilled(this.player, this.backpack, this.spilled);
      this.bossBar?.update(this.mammoth.hp);
    }
    updateWolfFight(this.player, this.backpack, this.wolves, this.stats);
    updateGathering(this.player, this.backpack, this.bushes, this.stats, delta);
    updateHunting(this.player, this.backpack, this.rabbits, this.stats);
    updateHelpers(
      this.helpers,
      {
        bushes: this.bushes,
        wolves: this.wolves,
        rabbits: this.rabbits,
        woodpile: this.woodpile,
        rawMeatPile: this.rawMeatPile,
        backpack: this.backpack,
        fence: this.fence,
        stats: this.stats,
        mammoth: this.mammoth,
      },
      delta,
    );
    updateDropping(this.player, this.backpack, [this.woodpile, this.rawMeatPile], delta);
    updatePickup(this.player, this.backpack, this.cookedMeatPile, delta);
    const isFireOut = updateFire(this.campfire, this.woodpile, delta, phase.fireBurnMultiplier);
    this.campfire.update(delta);
    // Жар главного костра — в HUD и на стрелке к костру, если его не видно.
    this.hud.setHeat(this.campfire.heat, this.campfire.wasBelowMark, this.campfire.isEmbers());
    if (!this.isUiHidden) this.fireArrow.update(this.cameras.main, this.campfire);
    updateCooking(this.campfire, this.rawMeatPile, this.spit, this.cookedMeatPile, this.stats, delta);
    this.spit.update(delta);
    this.nightOverlay.update(this.campfire.x, this.campfire.y, this.campfire.heat / FIRE_MAX_HEAT);
    if (this.fishCamp) this.updateFishCamp(this.fishCamp, phase.fireBurnMultiplier, delta);

    updateTable(this.player, this.backpack, this.table, delta);
    for (const traveler of this.travelers) {
      traveler.update(delta);
    }
    updateTravelers(
      this.table,
      this.travelers,
      this.huts,
      this.stats,
      this.level.travelers,
      this.level.fishing?.fishShare ?? 0,
      delta,
    );
    updateTusks(this.player, this.table, this.hud, this.stats, this.cameras.main);
    const purchase = updatePurchases(this.player, this.buyZones, this.hud, this.cameras.main, delta);
    if (purchase) this.onPurchase(purchase);
    this.starGoals.update(this.stats.fed, this.campfire.wasBelowMark);

    if (this.tutorial) {
      updateTutorial(
        this.tutorial,
        {
          player: this.player,
          backpack: this.backpack,
          bushes: this.bushes,
          rabbits: this.rabbits,
          woodpile: this.woodpile,
          rawMeatPile: this.rawMeatPile,
          cookedMeatPile: this.cookedMeatPile,
          table: this.table,
          stats: this.stats,
        },
        delta,
      );
    }

    const cycleEvent = this.cycle.update(delta);
    this.hud.setTimeLeft(this.cycle.timeLeft);

    // Мамонт пал — победа, когда он долежал до итогов (MAMMOTH_FALL_TIME): пока он падает,
    // уровень уже не проиграть. Костёр погас — поражение. Остальное решают события смены дня и ночи.
    if (this.mammoth?.getState() === 'fallen') {
      if (this.mammoth.stateTime >= MAMMOTH_FALL_TIME) this.endGame('bossDefeated');
    } else if (isFireOut) {
      this.endGame('fireOut');
    } else if (cycleEvent) {
      this.onCycleEvent(cycleEvent);
    }
  }

  // ===== День и ночь =====

  // Фаза сменилась: сцена включает ночь или утро и показывает уведомление.
  // Рассвет после последней ночи — победа.
  private onCycleEvent(event: CycleEvent): void {
    switch (event) {
      case 'sunset':
        this.nightOverlay.startSunset();
        break;
      case 'night':
        track({ name: 'nightStart', day: this.cycle.dayNumber });
        this.nightOverlay.startNight();
        this.hud.setPhase(true);
        // Пока едет табличка, плашка звёзд спрятана: на узком экране табличка под ней.
        // Когда табличка уедет, ночные модификаторы остаются в HUD до утра.
        this.starGoals.setVisible(false);
        // Под табличкой — крупный таймер до рассвета: потом он улетает в плашку времени.
        const timer = {
          getTimeLeft: () => this.cycle.timeLeft,
          target: this.hud.getTimePoint(),
          onLand: () => this.hud.popTime(),
        };
        this.phaseBanner.showNight(this.cycle.dayNumber, timer, () => {
          this.hud.setModifiers(true);
          this.starGoals.setVisible(true);
        });
        break;
      case 'morning':
        this.nightOverlay.startDay();
        this.hud.setPhase(false);
        this.hud.setModifiers(false);
        this.starGoals.setVisible(false);
        this.phaseBanner.showMorning(this.cycle.dayNumber, () => this.starGoals.setVisible(true));
        break;
      case 'lastDawn':
        this.endGame('dawn');
        break;
      // День боя с мамонтом (с 0.9): утро после последней ночи — идёт мамонт.
      case 'bossDawn':
        this.nightOverlay.startDay();
        this.hud.setPhase(false);
        this.hud.setModifiers(false);
        this.startBossFight();
        break;
      // Закат дня боя, а мамонт не повержен — поражение.
      case 'bossDusk':
        this.endGame('bossSunset');
        break;
    }
  }

  // ===== Мамонт =====

  // Идёт мамонт — сценка выхода (BOSS_INTRO_TIME, с 0.9.1). HUD прячется, выезжают чёрные
  // полосы, камера едет к лесу; экран трясётся, глухой удар, с деревьев сыплется снег;
  // мамонт выходит из леса и ревёт, выезжает табличка «МАМОНТ / ГРОЗА ЛЕДНИКА»;
  // потом камера возвращается к вождю. Пока сценка идёт, мир стоит (updateBossIntro).
  private startBossFight(): void {
    if (!this.mammoth) return;
    const mammoth = this.mammoth;
    const camera = this.cameras.main;
    this.bossIntroTime = BOSS_INTRO_TIME;
    this.setUiVisible(false);
    this.bossCinema.setBars(true);
    camera.stopFollow();
    camera.pan(MAMMOTH_START.x, MAMMOTH_START.y + INTRO_CAMERA_DROP, INTRO_PAN_TIME, 'Sine.easeInOut');
    this.time.delayedCall(INTRO_QUAKE_AT, () => {
      camera.shake(BOSS_SHAKE_TIME, BOSS_SHAKE_INTENSITY);
      playSound(this, SOUNDS.hit, SOUND_VOLUMES.hit, BOSS_STEP_DETUNE);
      this.bossCinema.shakeSnowFromTrees();
    });
    this.time.delayedCall(INTRO_APPEAR_AT, () => {
      mammoth.appear(MAMMOTH_START);
      mammoth.walkTo({ x: MAMMOTH_START.x, y: MAMMOTH_START.y + INTRO_WALK });
    });
    this.time.delayedCall(INTRO_ROAR_AT, () => {
      mammoth.roar();
      playSound(this, SOUNDS.roar, SOUND_VOLUMES.roar);
      camera.shake(INTRO_ROAR_SHAKE_TIME, INTRO_ROAR_SHAKE);
      this.bossCinema.showName();
    });
    this.time.delayedCall(INTRO_RETURN_AT, () => {
      this.bossCinema.hideName();
      this.bossCinema.setBars(false);
      camera.pan(this.player.x, this.player.y - CAMERA_OFFSET_Y, INTRO_PAN_BACK_TIME, 'Sine.easeInOut');
    });
  }

  // Каждый кадр сценки: мамонт выходит из леса. Сценка кончилась — бой начинается.
  private updateBossIntro(delta: number): void {
    this.bossIntroTime -= delta;
    this.mammoth?.update(delta);
    if (this.bossIntroTime > 0) return;
    this.bossIntroTime = 0;
    this.setUiVisible(true);
    this.followPlayer();
    this.bossBar?.show();
    if (this.mammoth) chooseAim(this.mammoth, this.getBossWorld());
  }

  // Мамонт пал — добивание (с 0.9.1): время замедляется, HUD прячется, камера наезжает на мамонта.
  private startFinale(): void {
    if (!this.mammoth) return;
    this.isFinaleStarted = true;
    this.finaleSlowLeft = BOSS_FINALE_SLOW_TIME;
    this.time.timeScale = BOSS_FINALE_SLOW;
    this.tweens.timeScale = BOSS_FINALE_SLOW;
    this.setUiVisible(false);
    this.bossBar?.hide();
    const camera = this.cameras.main;
    camera.stopFollow();
    camera.pan(this.mammoth.x, this.mammoth.y - FINALE_LIFT, FINALE_ZOOM_TIME, 'Sine.easeOut');
    camera.zoomTo(FINALE_ZOOM, FINALE_ZOOM_TIME, 'Sine.easeOut');
  }

  // Замедление кончилось: вспышка, тряска, камера отъезжает к вождю, печать «ПОВЕРЖЕН!».
  private endFinaleSlow(): void {
    this.finaleSlowLeft = 0;
    this.time.timeScale = 1;
    this.tweens.timeScale = 1;
    const camera = this.cameras.main;
    camera.flash(FINALE_FLASH_TIME);
    camera.shake(FINALE_SHAKE_TIME, FINALE_SHAKE);
    camera.zoomTo(1, FINALE_ZOOM_BACK_TIME, 'Sine.easeInOut');
    this.followPlayer();
    this.bossCinema.showStamp();
  }

  // Спрятать или показать HUD, плашку звёзд и стрелку к костру (на время сценок боя).
  private setUiVisible(isVisible: boolean): void {
    this.isUiHidden = !isVisible;
    this.hud.setVisible(isVisible);
    this.starGoals.setVisible(isVisible);
    if (!isVisible) this.fireArrow.hide();
  }

  // С чем мамонт имеет дело: вождь с рюкзаком, кучи у главного костра, частокол и рассыпанное.
  private getBossWorld(): BossWorld {
    return {
      player: this.player,
      backpack: this.backpack,
      piles: [this.woodpile, this.rawMeatPile, this.cookedMeatPile],
      fence: this.fence,
      spilled: this.spilled,
      stats: this.stats,
    };
  }

  // ===== Лагерь у проруби =====

  // Прорубь, малый костёр с вертелом, его поленница и кучи рыбы (места — settings.ts).
  private createFishCamp(): FishCamp {
    const fire = SMALL_FIRE_POSITION;
    return {
      hole: new IceHole(this, ICE_HOLE_POSITION.x, ICE_HOLE_POSITION.y),
      fire: new Campfire(this, fire.x, fire.y, { size: SMALL_FIRE_SIZE, isMain: false }),
      woodpile: new ItemPile(this, SMALL_WOODPILE_POSITION.x, SMALL_WOODPILE_POSITION.y, 'wood', SMALL_WOODPILE_CAPACITY),
      spit: new Spit(this, fire.x, fire.y, 'cookedFish', SMALL_FIRE_SIZE),
      rawPile: new ItemPile(this, RAW_FISH_PILE_POSITION.x, RAW_FISH_PILE_POSITION.y, 'rawFish', RAW_FISH_PILE_CAPACITY),
      cookedPile: new ItemPile(
        this,
        COOKED_FISH_PILE_POSITION.x,
        COOKED_FISH_PILE_POSITION.y,
        'cookedFish',
        COOKED_FISH_PILE_CAPACITY,
      ),
    };
  }

  // Каждый кадр — те же системы, что у главного костра: рыбалка, сдача хвороста
  // и сырой рыбы, жареная рыба на спину, огонь и жарка.
  // Малый костёр не проигрывает: что он погас, updateFire сообщает, но сцена это не слушает —
  // просто рыба не жарится, пока его снова не накормят.
  private updateFishCamp(camp: FishCamp, burnMultiplier: number, delta: number): void {
    updateFishing(this.player, this.backpack, camp.hole, this.stats, delta);
    camp.hole.update(delta);
    updateDropping(this.player, this.backpack, [camp.woodpile, camp.rawPile], delta);
    updatePickup(this.player, this.backpack, camp.cookedPile, delta);
    updateFire(camp.fire, camp.woodpile, delta, burnMultiplier);
    camp.fire.update(delta);
    updateCooking(camp.fire, camp.rawPile, camp.spit, camp.cookedPile, this.stats, delta);
    camp.spit.update(delta);
    this.nightOverlay.updateSmallFire(camp.fire.x, camp.fire.y, camp.fire.heat / FIRE_MAX_HEAT);
  }

  // ===== Покупки =====

  // Точки покупки, которые есть на уровне (data/levels.ts).
  // Оружие — с первого, что можно купить (топор); его цена — в data/upgrades.ts.
  private createBuyZones(): void {
    const { weapons, fence, huts, helpers } = this.level;
    if (weapons) {
      const firstWeapon = WEAPONS[1];
      this.weaponZone = new BuyZone(this, weapons.spot.x, weapons.spot.y, firstWeapon.price, firstWeapon.icon);
      this.buyZones.push(this.weaponZone);
    }

    if (fence) {
      this.fenceZone = new BuyZone(this, fence.spot.x, fence.spot.y, fence.price, TEXTURES.fenceIcon);
      this.buyZones.push(this.fenceZone);
    }

    // Хижины: на каждом месте — точка покупки, хижина появится на её месте.
    if (huts) {
      for (const spot of huts.spots) {
        this.huts.push(new Hut(this, spot.x, spot.y));
        this.hutZones.push(new BuyZone(this, spot.x, spot.y, huts.price, TEXTURES.hut));
      }
      this.buyZones.push(...this.hutZones);
    }

    // Помощники: на каждой точке найма — свой помощник, он появится на её месте.
    if (helpers) {
      for (const role of Object.keys(helpers) as HelperRole[]) {
        const hire = helpers[role];
        if (!hire) continue;
        this.helpers.push(new Helper(this, role, hire.spot.x, hire.spot.y));
        this.helperZones.push(new BuyZone(this, hire.spot.x, hire.spot.y, hire.price, HELPERS[role].texture));
      }
      this.buyZones.push(...this.helperZones);
    }
  }

  // Покупка на точке zone готова: сцена решает, что купили.
  // Оружие: следующее — в руку; если есть ещё лучше и уровень его продаёт (weapons.top) —
  // точка предлагает его, иначе закрывается.
  // Хижина: точка закрывается, на её месте вырастает хижина.
  // Частокол: вырастает вокруг лагеря; волки, оказавшиеся внутри, удирают.
  // Помощник: точка закрывается, на её месте появляется помощник и начинает работу.
  private onPurchase(zone: BuyZone): void {
    if (zone === this.fenceZone) {
      zone.close();
      this.fence.build();
      for (const wolf of this.wolves) {
        if (wolf.canBeHit() && this.fence.isInside(wolf.x, wolf.y)) wolf.giveUp();
      }
    }

    const helperIndex = this.helperZones.indexOf(zone);
    if (helperIndex >= 0) {
      zone.close();
      this.helpers[helperIndex].hire();
    }

    const hutIndex = this.hutZones.indexOf(zone);
    if (hutIndex >= 0) {
      zone.close();
      this.huts[hutIndex].build();
    }
    if (zone === this.weaponZone) {
      this.player.upgradeWeapon();
      const nextLevel = this.player.weaponLevel + 1;
      const next = WEAPONS[nextLevel];
      if (next && nextLevel <= (this.level.weapons?.top ?? 0)) {
        zone.offer(next.price, next.icon);
      } else {
        zone.close();
      }
    }
  }

  // ===== Частокол =====

  // Можно ли вождю или кролику шагнуть из точки в точку: сквозь стену — нет, в калитку — да.
  private canWalk: CanStep = (fromX, fromY, toX, toY) => this.fence.allows(fromX, fromY, toX, toY, true);

  // Можно ли волку шагнуть: ни сквозь стену, ни в калитку. Волк, оказавшийся во дворе
  // (частокол вырос вокруг него), может выбежать наружу прямо сквозь стену.
  private canWolfStep: CanStep = (fromX, fromY, toX, toY) =>
    this.fence.isInside(fromX, fromY) || this.fence.allows(fromX, fromY, toX, toY, false);

  // ===== Пауза =====

  // Пауза: клавиши P и Esc, кнопка в HUD (её подключает Hud) и автопауза,
  // когда вкладку свернули. Сработает, только если игра идёт (режим PLAYING).
  // Ещё здесь — событие аналитики «игрок закрыл вкладку».
  private setupPause(): void {
    this.input.keyboard?.on('keydown-P', () => this.pauseGame('key'));
    this.input.keyboard?.on('keydown-ESC', () => this.pauseGame('key'));

    // События «вкладка скрыта» и «страницу закрывают» приходят от всей игры
    // и от окна браузера, а не от сцены. Поэтому при выключении сцены (рестарт)
    // подписки снимаем, иначе их станет две.
    this.game.events.on(Phaser.Core.Events.HIDDEN, this.onTabHidden, this);
    window.addEventListener('pagehide', this.onPageHide);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.game.events.off(Phaser.Core.Events.HIDDEN, this.onTabHidden, this);
      window.removeEventListener('pagehide', this.onPageHide);
    });
  }

  // Вкладку свернули — автопауза.
  private onTabHidden(): void {
    this.pauseGame('hidden');
  }

  // Страницу закрывают. Если уровень был начат (идёт или на паузе) —
  // сообщаем аналитике, сколько игрок успел поиграть.
  // Стрелочная функция: её саму передаём окну и потом снимаем той же ссылкой.
  private onPageHide = (): void => {
    if (this.mode !== 'playing' && this.mode !== 'paused') return;
    track({ name: 'tabClosed', playTime: this.stats.playTime });
  };

  // ===== Режим игры =====
  //
  // Допустимые переходы (раздел 9 плана, правило 11):
  //   READY → PLAYING, PLAYING → PAUSED, PAUSED → PLAYING,
  //   PAUSED → READY, PLAYING → RESULT, RESULT → READY,
  //   PAUSED → меню, RESULT → меню, RESULT → READY следующего уровня,
  //   RESULT → заставка эпохи в меню (с 0.9).
  //   Из меню сцена запускается в READY выбранного уровня.
  // Каждый переход — одна функция. Первой строкой она проверяет, можно ли
  // перейти из текущего режима; если нельзя — ничего не делает.
  // Когда игра не идёт (READY, PAUSED, RESULT), сцена стоит на паузе целиком
  // (update, твины, таймеры, частицы), а поверх неё — сцена с табличкой.

  // Вход в READY: сцена замирает, поверх — табличка «Нажми, чтобы начать».
  // Вызывается сразу после create(): при первом запуске и после «Заново».
  private showReady(): void {
    this.scene.pause();
    // Пока игра стоит, стоят и звуки (например, вой волка).
    this.sound.pauseAll();
    const data: ReadyData = { title: this.level.name, onStart: () => this.startPlaying() };
    this.scene.launch('ReadyScene', data);
  }

  // READY → PLAYING: табличка старта закрылась — игра пошла.
  private startPlaying(): void {
    if (this.mode !== 'ready') return;
    this.mode = 'playing';
    track({ name: 'levelStart', level: this.levelIndex + 1 });

    this.scene.stop('ReadyScene');
    this.scene.resume();
    this.sound.resumeAll();
  }

  // PLAYING → PAUSED: игра замирает, поверх — табличка «ПАУЗА».
  // source — откуда пришла пауза: кнопка, клавиша или свёрнутая вкладка.
  private pauseGame(source: PauseSource): void {
    if (this.mode !== 'playing') return;
    this.mode = 'paused';
    track({ name: 'pause', source });

    this.scene.pause();
    this.sound.pauseAll();
    const data: PauseData = {
      onResume: () => this.resumeGame(),
      onRestart: () => this.restart(),
      onMenu: () => this.quitToMenu(),
    };
    this.scene.launch('PauseScene', data);
  }

  // PAUSED → PLAYING: табличка паузы закрылась — игра идёт с того же места.
  private resumeGame(): void {
    if (this.mode !== 'paused') return;
    this.mode = 'playing';
    track({ name: 'resume' });

    this.scene.stop('PauseScene');
    this.scene.resume();
    this.sound.resumeAll();
  }

  // PAUSED → READY и RESULT → READY: «Заново». Табличка паузы или итога
  // закрывается, игра создаётся с нуля и снова попадает в READY.
  // Режим меняем сразу: второе «Заново» в том же кадре уже ничего не сделает.
  private restart(): void {
    if (this.mode !== 'paused' && this.mode !== 'result') return;
    const isFromPause = this.mode === 'paused';
    this.mode = 'ready';
    track({ name: 'restart', from: isFromPause ? 'pause' : 'result' });
    const tabletScene = isFromPause ? 'PauseScene' : 'ResultScene';

    this.scene.stop(tabletScene);
    const data: GameData = { levelIndex: this.levelIndex };
    this.scene.restart(data);
  }

  // PAUSED → меню и RESULT → меню: «В меню». Табличка закрывается, уровень
  // выключается, открывается меню — сразу табличка уровней эпохи (MenuScene).
  // Режим меняем сразу: второе нажатие в том же кадре уже ничего не сделает.
  private quitToMenu(): void {
    if (this.mode !== 'paused' && this.mode !== 'result') return;
    const isFromPause = this.mode === 'paused';
    this.mode = 'ready';
    track({ name: 'quitToMenu', from: isFromPause ? 'pause' : 'result' });

    this.scene.stop(isFromPause ? 'PauseScene' : 'ResultScene');
    // Сразу табличка уровней эпохи: видно, что открылось и сколько звёзд.
    const data: MenuData = { view: 'levels' };
    this.scene.start('MenuScene', data);
  }

  // RESULT → READY следующего уровня: «Дальше» на итогах. Табличка закрывается,
  // строится следующий уровень и ждёт старта. Следующего уровня нет — ничего не делает.
  private nextLevel(): void {
    if (this.mode !== 'result' || this.levelIndex + 1 >= LEVELS.length) return;
    this.mode = 'ready';

    this.scene.stop('ResultScene');
    const data: GameData = { levelIndex: this.levelIndex + 1 };
    this.scene.restart(data);
  }

  // RESULT → заставка эпохи (с 0.9): «Следующая эпоха →» на итогах последнего уровня эпохи.
  // Табличка закрывается, уровень выключается, меню показывает заставку смены эпохи.
  private nextEpoch(): void {
    if (this.mode !== 'result') return;
    this.mode = 'ready';

    this.scene.stop('ResultScene');
    const data: MenuData = { view: 'epochEnd' };
    this.scene.start('MenuScene', data);
  }

  // PLAYING → RESULT: победа или поражение. Игра замирает, поверх — табличка итога.
  // outcome — чем кончился уровень: рассвет, костёр погас, (с 0.9) мамонт повержен или закат раньше.
  // Звёзды сразу сохраняются (save.ts хранит лучший результат уровня).
  private endGame(outcome: LevelOutcome): void {
    if (this.mode !== 'playing') return;
    this.mode = 'result';
    const isWin = outcome === 'dawn' || outcome === 'bossDefeated';
    // Звёзды (раздел 5 плана): проиграл — ни одной; победа — звезда за рассвет и по звезде
    // за жар не ниже засечки и за starFed накормленных путников. Условия — в StarGoals.ts.
    const starGoals = describeStarGoals(
      isWin,
      this.campfire.wasBelowMark,
      this.stats.fed,
      this.level.starFed,
      this.level.boss !== undefined,
    );
    const stars = starGoals.filter((goal) => goal.isDone).length;
    recordLevel(this.levelIndex, stars);
    track({
      name: 'levelEnd',
      level: this.levelIndex + 1,
      isWin,
      reason: outcome,
      day: this.cycle.dayNumber,
      stars,
      ...this.stats,
    });
    const newAchievements = this.unlockEarnedAchievements(outcome);

    this.scene.pause();
    this.sound.pauseAll();
    // Последний уровень эпохи пройден — вместо «Дальше» кнопка «Следующая эпоха →».
    const isEpochDone = isWin && this.levelIndex === LEVELS_PER_EPOCH - 1;
    const hasNext = isWin && !isEpochDone && this.levelIndex + 1 < LEVELS.length;
    const data: ResultData = {
      outcome,
      starGoals,
      stats: this.stats,
      // Пережиты все сутки уровня — или те, что успели закончиться до поражения.
      days: isWin ? this.level.dayCount : this.cycle.dayNumber - 1,
      hasWolves: this.level.wolves !== undefined,
      hasFishing: this.level.fishing !== undefined,
      hasBoss: this.level.boss !== undefined,
      newAchievements,
      onRestart: () => this.restart(),
      onMenu: () => this.quitToMenu(),
      onNext: hasNext ? () => this.nextLevel() : undefined,
      onNextEpoch: isEpochDone ? () => this.nextEpoch() : undefined,
    };
    this.scene.launch('ResultScene', data);
  }

  // Уровень кончился с итогом outcome: какие достижения выполнены (data/achievements.ts).
  // Новые save.ts запоминает, аналитика получает событие. Вернёт названия новых — для плашки на итогах.
  private unlockEarnedAchievements(outcome: LevelOutcome): string[] {
    const end = {
      levelIndex: this.levelIndex,
      outcome,
      stats: this.stats,
      hasWolves: this.level.wolves !== undefined,
    };
    const earned = ACHIEVEMENTS.filter((achievement) => achievement.isEarned(end));
    const fresh = unlockAchievements(earned.map((achievement) => achievement.id));
    for (const id of fresh) track({ name: 'achievement', id });
    return earned.filter((achievement) => fresh.includes(achievement.id)).map((achievement) => achievement.name);
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

  // Рядом ли точка (x, y) с кустом, лагерем, столом или лагерем у проруби — там декор не кладём.
  private isNearImportantPlace(x: number, y: number): boolean {
    const nearCamp =
      Phaser.Math.Distance.Between(x, y, CAMPFIRE_POSITION.x, CAMPFIRE_POSITION.y) < CAMP_CLEAR_RADIUS ||
      Phaser.Math.Distance.Between(x, y, TABLE_POSITION.x, TABLE_POSITION.y + TABLE_CLEAR_SHIFT_Y) < TABLE_CLEAR_RADIUS;
    const nearBush = BUSH_POSITIONS.some(
      (bush) => Phaser.Math.Distance.Between(x, y, bush.x, bush.y) < BUSH_CLEAR_RADIUS,
    );
    const nearFishCamp =
      this.level.fishing !== undefined &&
      Phaser.Math.Distance.Between(x, y, SMALL_FIRE_POSITION.x, SMALL_FIRE_POSITION.y + FISH_CAMP_CLEAR_SHIFT_Y) <
        FISH_CAMP_CLEAR_RADIUS;
    return nearCamp || nearBush || nearFishCamp;
  }

  // Волков столько, сколько их может быть на поле ночью (данные уровня; нет волков — ни одного).
  // Первый выходит через firstDelay, остальные — каждый на случайное время позже предыдущего.
  private createWolves(): void {
    const wolves = this.level.wolves;
    if (!wolves) return;
    const count = Math.max(wolves.day, wolves.night);
    let delay = wolves.firstDelay;
    for (let i = 0; i < count; i++) {
      this.wolves.push(new Wolf(this, delay));
      delay += Phaser.Math.Between(WOLF_RETURN_TIME_MIN, WOLF_RETURN_TIME_MAX);
    }
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
    const near = WORLD_EDGE * FOREST_NEAR_SHARE;
    const far = WORLD_EDGE * FOREST_FAR_SHARE;

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

      const image = this.addStandingImage(x, y, texture, scale).setFlipX(rng.frac() < 0.5);
      // Ели чуть качаются на ветру, скалы стоят.
      if (texture === TEXTURES.fir) sway(this, image);
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
    this.add
      .particles(0, 0, TEXTURES.snowflake, {
        ...SNOWFALL,
        // Место рождения снежинки — случайная точка в прямоугольнике размером с экран.
        // Размер экрана берём каждый раз заново: телефон могли повернуть.
        emitZone: {
          type: 'random',
          source: {
            getRandomPoint: (point) => {
              point.x = Phaser.Math.Between(0, this.scale.width);
              point.y = Phaser.Math.Between(0, this.scale.height);
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
    camera.setZoom(1);
    this.followPlayer();
  }

  // Камера следит за вождём. Следить можно за любым объектом с x и y — у вождя это точка ног.
  private followPlayer(): void {
    this.cameras.main.startFollow(this.player, false, CAMERA_LERP, CAMERA_LERP, 0, CAMERA_OFFSET_Y);
  }
}
