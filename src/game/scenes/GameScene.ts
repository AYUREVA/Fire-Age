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
  WOLF_COUNT,
  WOLF_FIRST_DELAY,
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
} from '../settings';
import { TEXTURES, createTextures, loadFonts } from '../textures';
import { Player } from '../objects/Player';
import { Backpack } from '../objects/Backpack';
import { ResourceNode } from '../objects/ResourceNode';
import { ItemPile } from '../objects/ItemPile';
import { Rabbit } from '../objects/Rabbit';
import { Wolf } from '../objects/Wolf';
import { Spit } from '../objects/Spit';
import { StoneTable } from '../objects/StoneTable';
import { Traveler } from '../objects/Traveler';
import { Campfire } from '../objects/Campfire';
import { BuyZone } from '../objects/BuyZone';
import { Hut } from '../objects/Hut';
import { Fence } from '../objects/Fence';
import { CanStep } from '../fx';
import { Hud } from '../objects/Hud';
import { CycleEvent, DayNightCycle } from '../objects/DayNightCycle';
import { NightOverlay } from '../objects/NightOverlay';
import { PhaseBanner } from '../ui/PhaseBanner';
import { updateDropping, updateGathering, updateHunting, updatePickup } from '../systems/Gathering';
import { updateCooking } from '../systems/Cooking';
import { updateTable, updateTravelers, updateTusks } from '../systems/Serving';
import { updateFire } from '../systems/Fire';
import { updatePurchases } from '../systems/Purchases';
import { updateWolfFight, updateWolves } from '../systems/Predators';
import { FENCE_PRICE, FENCE_SPOT, HUT_PRICE, HUT_SPOTS, WEAPONS, WEAPON_SPOT } from '../data/upgrades';
import { LevelStats, PauseSource, track } from '../analytics';
import { ReadyData } from './ReadyScene';
import { PauseData } from './PauseScene';
import { ResultData } from './ResultScene';

// ===== Режим игры =====

// Режим игры — автомат из четырёх состояний (раздел 9 плана, правило 11):
// 'ready'   — мир построен и стоит, поверх табличка «Нажми, чтобы начать»;
// 'playing' — игра идёт;
// 'paused'  — пауза, поверх табличка «ПАУЗА»;
// 'result'  — победа или поражение, поверх табличка итога.
type GameMode = 'ready' | 'playing' | 'paused' | 'result';

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
  private buyZones: BuyZone[] = [];
  private weaponZone!: BuyZone;
  // Хижины и их точки покупки (одинаковый порядок: hutZones[i] строит huts[i]).
  private huts: Hut[] = [];
  private hutZones: BuyZone[] = [];
  // Частокол вокруг лагеря и его точка покупки.
  private fence!: Fence;
  private fenceZone!: BuyZone;
  // Интерфейс: сколько осталось до конца дня или ночи, кнопка паузы.
  private hud!: Hud;
  // Смена дня и ночи: фаза, номер суток, сколько осталось до конца фазы.
  private cycle!: DayNightCycle;
  // Вид ночи: закат, тьма со светлым пятном у костра, метель.
  private nightOverlay!: NightOverlay;
  // Уведомление о смене дня и ночи: табличка сверху экрана.
  private phaseBanner!: PhaseBanner;
  // Режим игры. Меняют его только функции переходов (раздел «Режим игры» ниже).
  private mode: GameMode = 'ready';
  // Статистика уровня: накормлено, ушло голодными, клыки, время игры, волки.
  // Меняют системы, аналитика читает её в переходах (analytics.ts).
  private stats!: LevelStats;

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
    this.rabbits = [];
    this.wolves = [];
    this.travelers = [];
    this.buyZones = [];
    this.huts = [];
    this.hutZones = [];
    this.mode = 'ready';
    this.stats = { fed: 0, hungry: 0, tusksEarned: 0, playTime: 0, wolvesDriven: 0, itemsStolen: 0 };

    createTextures(this);

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
    this.spit = new Spit(this, CAMPFIRE_POSITION.x, CAMPFIRE_POSITION.y);
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

    this.player = new Player(this, PLAYER_START.x, PLAYER_START.y);
    this.backpack = new Backpack(this);
    this.cycle = new DayNightCycle();
    this.hud = new Hud(this, () => this.pauseGame('button'));
    this.hud.setTimeLeft(this.cycle.timeLeft);

    this.setupCamera();
    this.createSnowfall();
    this.nightOverlay = new NightOverlay(this);
    this.phaseBanner = new PhaseBanner(this);
    this.setupPause();

    // Мир построен — игра в режиме READY: ждём касания, клика или клавиши.
    // Ставить сцену на паузу внутри самого create() нельзя: после create()
    // Phaser сам помечает сцену работающей. Поэтому — сразу после create().
    this.events.once(Phaser.Scenes.Events.CREATE, () => this.showReady());
  }

  // Вызывается Phaser каждый кадр. delta — сколько мс прошло с прошлого кадра.
  // Порядок: сначала двигаем вождя, потом стопку за ним, потом системы
  // (systems/) проверяют, что вождь делает рядом с кустами и с поленницей.
  update(_time: number, delta: number): void {
    // Параметры текущей фазы суток. Ночью меняются три: скорость вождя,
    // скорость горения костра и скорость кроликов (таблица PHASES в settings.ts).
    const phase = PHASES[this.cycle.phase];
    // update() работает только в режиме PLAYING (в остальных сцена на паузе) —
    // здесь копится чистое время игры.
    this.stats.playTime += delta;

    this.player.update(delta, phase.playerSpeedMultiplier, this.canWalk);
    // Калитка, к которой подошёл вождь, распахивается.
    this.fence.update(delta, this.player.x, this.player.y);
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
      WOLF_COUNT[this.cycle.phase],
      this.canWolfStep,
      delta,
    );
    updateWolfFight(this.player, this.backpack, this.wolves, this.stats);
    updateGathering(this.player, this.backpack, this.bushes, delta);
    updateHunting(this.player, this.backpack, this.rabbits);
    updateDropping(this.player, this.backpack, [this.woodpile, this.rawMeatPile], delta);
    updatePickup(this.player, this.backpack, this.cookedMeatPile, delta);
    const isFireOut = updateFire(this.campfire, this.woodpile, delta, phase.fireBurnMultiplier);
    this.campfire.update(delta);
    updateCooking(this.campfire, this.rawMeatPile, this.spit, this.cookedMeatPile, delta);
    this.spit.update(delta);
    this.nightOverlay.update(this.campfire.x, this.campfire.y, this.campfire.heat / FIRE_MAX_HEAT);

    updateTable(this.player, this.backpack, this.table, delta);
    for (const traveler of this.travelers) {
      traveler.update(delta);
    }
    updateTravelers(this.table, this.travelers, this.huts, this.stats, delta);
    updateTusks(this.player, this.table, this.hud, this.stats, this.cameras.main);
    const purchase = updatePurchases(this.player, this.buyZones, this.hud, this.cameras.main, delta);
    if (purchase) this.onPurchase(purchase);

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
        // Когда табличка уедет, ночные модификаторы остаются в HUD до утра.
        this.phaseBanner.showNight(this.cycle.dayNumber, () => this.hud.setModifiers(true));
        break;
      case 'morning':
        this.nightOverlay.startDay();
        this.hud.setPhase(false);
        this.hud.setModifiers(false);
        this.phaseBanner.showMorning(this.cycle.dayNumber);
        break;
      case 'lastDawn':
        this.endGame(true);
        break;
    }
  }

  // ===== Покупки =====

  // Точки покупки из data/upgrades.ts. Оружие — с первого, что можно купить (топор).
  private createBuyZones(): void {
    const firstWeapon = WEAPONS[1];
    this.weaponZone = new BuyZone(this, WEAPON_SPOT.x, WEAPON_SPOT.y, firstWeapon.price, firstWeapon.icon);
    this.buyZones.push(this.weaponZone);

    this.fenceZone = new BuyZone(this, FENCE_SPOT.x, FENCE_SPOT.y, FENCE_PRICE, TEXTURES.fenceIcon);
    this.buyZones.push(this.fenceZone);

    // Хижины: на каждом месте — точка покупки, хижина появится на её месте.
    for (const spot of HUT_SPOTS) {
      this.huts.push(new Hut(this, spot.x, spot.y));
      this.hutZones.push(new BuyZone(this, spot.x, spot.y, HUT_PRICE, TEXTURES.hut));
    }
    this.buyZones.push(...this.hutZones);
  }

  // Покупка на точке zone готова: сцена решает, что купили.
  // Оружие: следующее — в руку; если есть ещё лучше — точка предлагает его, иначе закрывается.
  // Хижина: точка закрывается, на её месте вырастает хижина.
  // Частокол: вырастает вокруг лагеря; волки, оказавшиеся внутри, удирают.
  private onPurchase(zone: BuyZone): void {
    if (zone === this.fenceZone) {
      zone.close();
      this.fence.build();
      for (const wolf of this.wolves) {
        if (wolf.canBeHit() && this.fence.isInside(wolf.x, wolf.y)) wolf.giveUp();
      }
    }

    const hutIndex = this.hutZones.indexOf(zone);
    if (hutIndex >= 0) {
      zone.close();
      this.huts[hutIndex].build();
    }
    if (zone === this.weaponZone) {
      this.player.upgradeWeapon();
      const next = WEAPONS[this.player.weaponLevel + 1];
      if (next) {
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
  //   PAUSED → READY, PLAYING → RESULT, RESULT → READY.
  // Каждый переход — одна функция. Первой строкой она проверяет, можно ли
  // перейти из текущего режима; если нельзя — ничего не делает.
  // Когда игра не идёт (READY, PAUSED, RESULT), сцена стоит на паузе целиком
  // (update, твины, таймеры, частицы), а поверх неё — сцена с табличкой.

  // Вход в READY: сцена замирает, поверх — табличка «Нажми, чтобы начать».
  // Вызывается сразу после create(): при первом запуске и после «Заново».
  private showReady(): void {
    this.scene.pause();
    const data: ReadyData = { onStart: () => this.startPlaying() };
    this.scene.launch('ReadyScene', data);
  }

  // READY → PLAYING: табличка старта закрылась — игра пошла.
  private startPlaying(): void {
    if (this.mode !== 'ready') return;
    this.mode = 'playing';
    track({ name: 'levelStart' });

    this.scene.stop('ReadyScene');
    this.scene.resume();
  }

  // PLAYING → PAUSED: игра замирает, поверх — табличка «ПАУЗА».
  // source — откуда пришла пауза: кнопка, клавиша или свёрнутая вкладка.
  private pauseGame(source: PauseSource): void {
    if (this.mode !== 'playing') return;
    this.mode = 'paused';
    track({ name: 'pause', source });

    this.scene.pause();
    const data: PauseData = { onResume: () => this.resumeGame(), onRestart: () => this.restart() };
    this.scene.launch('PauseScene', data);
  }

  // PAUSED → PLAYING: табличка паузы закрылась — игра идёт с того же места.
  private resumeGame(): void {
    if (this.mode !== 'paused') return;
    this.mode = 'playing';
    track({ name: 'resume' });

    this.scene.stop('PauseScene');
    this.scene.resume();
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
    this.scene.restart();
  }

  // PLAYING → RESULT: победа или поражение. Игра замирает, поверх — табличка итога.
  private endGame(isWin: boolean): void {
    if (this.mode !== 'playing') return;
    this.mode = 'result';
    track({
      name: 'levelEnd',
      isWin,
      reason: isWin ? 'dawn' : 'fireOut',
      day: this.cycle.dayNumber,
      ...this.stats,
    });

    this.scene.pause();
    const data: ResultData = { isWin, onRestart: () => this.restart() };
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

  // Рядом ли точка (x, y) с кустом, лагерем или столом — там декор не кладём.
  private isNearImportantPlace(x: number, y: number): boolean {
    const nearCamp =
      Phaser.Math.Distance.Between(x, y, CAMPFIRE_POSITION.x, CAMPFIRE_POSITION.y) < CAMP_CLEAR_RADIUS ||
      Phaser.Math.Distance.Between(x, y, TABLE_POSITION.x, TABLE_POSITION.y + TABLE_CLEAR_SHIFT_Y) < TABLE_CLEAR_RADIUS;
    const nearBush = BUSH_POSITIONS.some(
      (bush) => Phaser.Math.Distance.Between(x, y, bush.x, bush.y) < BUSH_CLEAR_RADIUS,
    );
    return nearCamp || nearBush;
  }

  // Волков столько, сколько их может быть на поле ночью. Первый выходит через
  // WOLF_FIRST_DELAY, остальные — каждый на случайное время позже предыдущего.
  private createWolves(): void {
    const count = Math.max(WOLF_COUNT.day, WOLF_COUNT.night);
    let delay = WOLF_FIRST_DELAY;
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
    // Следить можно за любым объектом с x и y — у вождя это точка ног.
    camera.startFollow(this.player, false, CAMERA_LERP, CAMERA_LERP, 0, CAMERA_OFFSET_Y);
  }
}
