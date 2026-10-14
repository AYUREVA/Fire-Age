import Phaser from 'phaser';
// Параметры сложности (фаза 1, фаза 2, поток машин) — в settings.ts.
import {
  CAR_SPEED,
  PHASE_1_HORIZONTAL_CHANCE,
  PHASE_2_START_SCORE,
  PHASE_2_CAR_SPEED,
  PHASE_2_HORIZONTAL_CHANCE,
  START_SPAWN_INTERVAL,
  MIN_SPAWN_INTERVAL,
  SPAWN_INTERVAL_STEP,
  DIFFICULTY_STEP_TIME,
} from './settings';

// ===== Параметры перекрёстка =====

// Ширина каждой дороги в пикселях.
const ROAD_WIDTH = 64;
// Насколько стоп-линия отстоит от края перекрёстка.
const STOP_LINE_GAP = 8;
// Толщина белой стоп-линии.
const STOP_LINE_THICKNESS = 4;

// ===== Параметры светофора =====

// Радиус кружка-сигнала.
const LIGHT_RADIUS = 12;
// Насколько сигнал отстоит от края дороги (чтобы не стоял на проезжей части).
const LIGHT_OFFSET = 24;
// Насколько сигнал стоит раньше стоп-линии (против движения машин).
const LIGHT_BEFORE_STOP_LINE = 40;

// ===== Параметры машин =====

// Длина машины вдоль дороги.
const CAR_LENGTH = 40;
// Ширина машины поперёк дороги.
const CAR_WIDTH = 24;
// Зазор между машинами в очереди.
const CAR_GAP = 12;
// Цвета, из которых случайно выбирается цвет новой машины.
const CAR_COLORS = [0x38bdf8, 0xfacc15, 0xf472b6, 0xa78bfa, 0xfb923c, 0xe2e8f0];

// ===== Цвета =====

const ROAD_COLOR = 0x334155;
const STOP_LINE_COLOR = 0xffffff;
const GREEN_COLOR = 0x22c55e;
const RED_COLOR = 0xef4444;
// Затемнение экрана при Game Over: цвет и прозрачность.
const GAME_OVER_SHADE_COLOR = 0x000000;
const GAME_OVER_SHADE_ALPHA = 0.65;
// Плашка под надписями Game Over: размер и цвет.
const GAME_OVER_PANEL_WIDTH = 440;
const GAME_OVER_PANEL_HEIGHT = 220;
const GAME_OVER_PANEL_COLOR = 0x0f172a;

// Шрифт для всех надписей.
const FONT_FAMILY = 'system-ui, sans-serif';

// Слой надписи «Пауза»: выше машин, чтобы они её не закрывали.
const PAUSE_TEXT_DEPTH = 10;

// ===== Фаза 2 «Час пик»: оформление =====

// Сколько мс виден баннер «ЧАС ПИК!».
const PHASE_BANNER_TIME = 3000;
// Цвет дорог в фазе 2: постоянный знак, что идёт час пик.
const PHASE_2_ROAD_COLOR = 0x4b3a2e;
// Слой баннера: выше машин, но ниже надписи «Пауза».
const PHASE_BANNER_DEPTH = 5;

// Дорога, по которой едет машина.
type Road = 'horizontal' | 'vertical';

// Машина: прямоугольник на экране и дорога, по которой он едет.
interface Car {
  body: Phaser.GameObjects.Rectangle;
  road: Road;
}

/**
 * Игра «Светофор».
 *
 * Две дороги пересекаются в центре экрана. Игрок кликом или пробелом
 * переключает светофор: когда горизонтальной дороге горит зелёный,
 * вертикальной горит красный, и наоборот.
 *
 * За каждую уехавшую за край машину — очко. Игра заканчивается, если
 * машины с разных дорог столкнулись («Авария!») или очередь дошла
 * до края экрана («Пробка!»).
 */
export class GameScene extends Phaser.Scene {
  // true — едет горизонтальная дорога, false — вертикальная.
  private isHorizontalGreen = true;
  // Сколько машин проехало перекрёсток.
  private score = 0;
  // true, когда игра окончена и ждёт перезапуска.
  private isGameOver = false;
  // true, когда игра на паузе (клавиша P).
  private isPaused = false;

  // Машины на каждой дороге. Порядок в массиве = порядок на дороге:
  // [0] — машина, которая едет первой (ближе всех к концу дороги).
  private horizontalCars: Car[] = [];
  private verticalCars: Car[] = [];

  // Текущий интервал между появлениями машин (мс).
  private spawnInterval = START_SPAWN_INTERVAL;
  // Сколько времени прошло с появления последней машины (мс).
  private timeSinceSpawn = 0;
  // Сколько времени прошло с последнего усложнения (мс).
  private timeSinceDifficultyUp = 0;
  // Номер ступени сложности, показывается в HUD.
  private flowLevel = 1;

  // Текущая фаза игры: 1 — обычная, 2 — «Час пик».
  private phase = 1;
  // Текущая скорость машин (меняется в фазе 2).
  private carSpeed = CAR_SPEED;
  // Текущая доля машин на горизонтальной дороге (меняется в фазе 2).
  private horizontalChance = PHASE_1_HORIZONTAL_CHANCE;
  // Сколько мс ещё виден баннер «ЧАС ПИК!».
  private bannerTimeLeft = 0;
  // Прямоугольники обеих дорог, чтобы перекрасить их в фазе 2.
  private roads: Phaser.GameObjects.Rectangle[] = [];

  private scoreText!: Phaser.GameObjects.Text;
  private flowText!: Phaser.GameObjects.Text;
  // Строка HUD с номером фазы.
  private phaseText!: Phaser.GameObjects.Text;
  // Баннер «ЧАС ПИК!», виден несколько секунд после перехода.
  private phaseBanner!: Phaser.GameObjects.Text;
  // Надпись «Пауза», видна только во время паузы.
  private pauseText!: Phaser.GameObjects.Text;
  // Кружок-сигнал для машин горизонтальной дороги.
  private horizontalLight!: Phaser.GameObjects.Arc;
  // Кружок-сигнал для машин вертикальной дороги.
  private verticalLight!: Phaser.GameObjects.Arc;

  constructor() {
    super('GameScene');
  }

  create(): void {
    // При перезапуске сцены create() вызывается снова, а поля класса
    // сохраняют старые значения, поэтому сбрасываем их здесь.
    this.isHorizontalGreen = true;
    this.score = 0;
    this.isGameOver = false;
    this.isPaused = false;
    this.horizontalCars = [];
    this.verticalCars = [];
    this.spawnInterval = START_SPAWN_INTERVAL;
    this.timeSinceSpawn = 0;
    this.timeSinceDifficultyUp = 0;
    this.flowLevel = 1;
    // Новая игра всегда начинается с фазы 1.
    this.phase = 1;
    this.carSpeed = CAR_SPEED;
    this.horizontalChance = PHASE_1_HORIZONTAL_CHANCE;
    this.bannerTimeLeft = 0;
    this.roads = [];

    this.drawRoads();
    this.drawStopLines();
    this.createLights();
    this.createHud();
    this.createPhaseBanner();
    this.createPauseText();
    this.setupInput();

    this.updateLights();
  }

  // Вызывается Phaser каждый кадр. delta — сколько мс прошло с прошлого кадра.
  update(_time: number, delta: number): void {
    // После Game Over и во время паузы ничего не двигаем: картинка «замирает».
    // Все таймеры, движение и очки считаются только здесь, поэтому
    // этот выход останавливает их все сразу.
    if (this.isGameOver || this.isPaused) return;

    const seconds = delta / 1000;

    this.updatePhase(delta);
    this.updateDifficulty(delta);
    this.updateSpawning(delta);

    this.moveCars(this.horizontalCars, this.isHorizontalGreen, this.getHorizontalStopLineX(), seconds);
    this.moveCars(this.verticalCars, !this.isHorizontalGreen, this.getVerticalStopLineY(), seconds);

    this.removeFinishedCars(this.horizontalCars, this.scale.width);
    this.removeFinishedCars(this.verticalCars, this.scale.height);

    this.checkCrash();
  }

  // ===== Рисование перекрёстка =====

  // Рисует две дороги крестом через центр экрана.
  private drawRoads(): void {
    const { width, height } = this.scale;
    const centerX = width / 2;
    const centerY = height / 2;

    // Горизонтальная дорога: во всю ширину экрана.
    const horizontalRoad = this.add.rectangle(centerX, centerY, width, ROAD_WIDTH, ROAD_COLOR);
    // Вертикальная дорога: во всю высоту экрана.
    const verticalRoad = this.add.rectangle(centerX, centerY, ROAD_WIDTH, height, ROAD_COLOR);

    // Запоминаем дороги, чтобы в фазе 2 перекрасить их.
    this.roads = [horizontalRoad, verticalRoad];
  }

  // Рисует стоп-линии перед перекрёстком на каждой дороге.
  private drawStopLines(): void {
    const centerX = this.scale.width / 2;
    const centerY = this.scale.height / 2;

    // Горизонтальные машины едут слева, поэтому их стоп-линия
    // стоит левее перекрёстка и пересекает дорогу поперёк.
    this.add.rectangle(
      this.getHorizontalStopLineX(),
      centerY,
      STOP_LINE_THICKNESS,
      ROAD_WIDTH,
      STOP_LINE_COLOR,
    );

    // Вертикальные машины едут сверху, поэтому их стоп-линия
    // стоит выше перекрёстка.
    this.add.rectangle(
      centerX,
      this.getVerticalStopLineY(),
      ROAD_WIDTH,
      STOP_LINE_THICKNESS,
      STOP_LINE_COLOR,
    );
  }

  // Создаёт два кружка-сигнала: каждый сбоку от своей дороги, чуть
  // раньше стоп-линии, чтобы было сразу видно, к какой дороге он относится.
  private createLights(): void {
    const centerX = this.scale.width / 2;
    const centerY = this.scale.height / 2;

    // Сигнал горизонтальной дороги — под дорогой, левее стоп-линии.
    this.horizontalLight = this.add.circle(
      this.getHorizontalStopLineX() - LIGHT_BEFORE_STOP_LINE,
      centerY + ROAD_WIDTH / 2 + LIGHT_OFFSET,
      LIGHT_RADIUS,
    );

    // Сигнал вертикальной дороги — справа от дороги, выше стоп-линии.
    this.verticalLight = this.add.circle(
      centerX + ROAD_WIDTH / 2 + LIGHT_OFFSET,
      this.getVerticalStopLineY() - LIGHT_BEFORE_STOP_LINE,
      LIGHT_RADIUS,
    );
  }

  // Создаёт текст счёта, ступень потока и подсказку в левом верхнем углу.
  private createHud(): void {
    this.scoreText = this.add.text(24, 20, `Счёт: ${this.score}`, {
      fontFamily: FONT_FAMILY,
      fontSize: '22px',
      color: '#ffffff',
    });

    this.flowText = this.add.text(24, 52, `Поток: ${this.flowLevel}`, {
      fontFamily: FONT_FAMILY,
      fontSize: '18px',
      color: '#ffffff',
    });

    this.phaseText = this.add.text(24, 82, `Фаза ${this.phase}`, {
      fontFamily: FONT_FAMILY,
      fontSize: '18px',
      color: '#ffffff',
    });

    this.add.text(24, 112, 'Клик / Пробел — переключить светофор, P — пауза', {
      fontFamily: FONT_FAMILY,
      fontSize: '16px',
      color: '#cbd5e1',
    });
  }

  // Создаёт баннер «ЧАС ПИК!». Сначала он скрыт.
  // Стоит в центре правой верхней четверти экрана: там нет дорог,
  // поэтому баннер не закрывает машины в момент перехода.
  private createPhaseBanner(): void {
    this.phaseBanner = this.add
      .text(this.scale.width * 0.75, this.scale.height * 0.25, 'ЧАС ПИК!\nмашины быстрее,\nна горизонтали их больше', {
        fontFamily: FONT_FAMILY,
        fontSize: '24px',
        fontStyle: 'bold',
        color: '#facc15',
        align: 'center',
        backgroundColor: '#0f172a',
        padding: { x: 24, y: 16 },
      })
      .setOrigin(0.5)
      .setDepth(PHASE_BANNER_DEPTH)
      .setVisible(false);
  }

  // Создаёт надпись «Пауза» по центру экрана. Сначала она скрыта.
  private createPauseText(): void {
    this.pauseText = this.add
      .text(this.scale.width / 2, this.scale.height / 2, 'Пауза\nP — продолжить', {
        fontFamily: FONT_FAMILY,
        fontSize: '32px',
        color: '#ffffff',
        align: 'center',
        backgroundColor: '#0f172a',
        padding: { x: 32, y: 20 },
      })
      .setOrigin(0.5)
      .setDepth(PAUSE_TEXT_DEPTH)
      .setVisible(false);
  }

  // ===== Управление и светофор =====

  // Подключает управление: клик мышью и пробел делают одно и то же.
  // (При перезапуске сцены Phaser сам снимает старые обработчики.)
  private setupInput(): void {
    if (!this.input.keyboard) {
      throw new Error('Keyboard input is unavailable.');
    }

    this.input.on('pointerdown', () => this.handleAction());
    this.input.keyboard.on('keydown-SPACE', () => this.handleAction());
    // P — пауза и продолжение. Phaser смотрит на физическую клавишу,
    // поэтому P работает и на русской раскладке.
    this.input.keyboard.on('keydown-P', () => this.togglePause());
  }

  // Клавиша P: ставит игру на паузу или снимает с паузы.
  private togglePause(): void {
    // На экране Game Over пауза не нужна.
    if (this.isGameOver) return;

    this.isPaused = !this.isPaused;
    this.pauseText.setVisible(this.isPaused);
  }

  // Клик или пробел: во время игры переключает светофор,
  // после Game Over начинает новую игру.
  private handleAction(): void {
    // Во время паузы клик и пробел ничего не делают.
    if (this.isPaused) return;

    if (this.isGameOver) {
      this.scene.restart();
    } else {
      this.toggleLight();
    }
  }

  // Переключает светофор на другую дорогу.
  private toggleLight(): void {
    this.isHorizontalGreen = !this.isHorizontalGreen;
    this.updateLights();
  }

  // Перекрашивает кружки-сигналы по текущему состоянию светофора.
  private updateLights(): void {
    this.horizontalLight.setFillStyle(this.isHorizontalGreen ? GREEN_COLOR : RED_COLOR);
    this.verticalLight.setFillStyle(this.isHorizontalGreen ? RED_COLOR : GREEN_COLOR);
  }

  // ===== Сложность и появление машин =====

  // Каждые DIFFICULTY_STEP_TIME мс машины начинают появляться чаще,
  // пока интервал не дойдёт до MIN_SPAWN_INTERVAL.
  private updateDifficulty(delta: number): void {
    this.timeSinceDifficultyUp += delta;
    if (this.timeSinceDifficultyUp < DIFFICULTY_STEP_TIME) return;

    this.timeSinceDifficultyUp -= DIFFICULTY_STEP_TIME;

    if (this.spawnInterval > MIN_SPAWN_INTERVAL) {
      this.spawnInterval = Math.max(MIN_SPAWN_INTERVAL, this.spawnInterval - SPAWN_INTERVAL_STEP);
      this.flowLevel += 1;
      this.flowText.setText(`Поток: ${this.flowLevel}`);
    }
  }

  // Раз в spawnInterval мс выпускает машину на случайную дорогу.
  private updateSpawning(delta: number): void {
    this.timeSinceSpawn += delta;
    if (this.timeSinceSpawn < this.spawnInterval) return;

    this.timeSinceSpawn -= this.spawnInterval;

    // С вероятностью horizontalChance машина едет по горизонтали,
    // иначе — по вертикали. В фазе 1 это 50/50, в фазе 2 — 70/30.
    const road: Road = Math.random() < this.horizontalChance ? 'horizontal' : 'vertical';
    this.spawnCar(road);
  }

  // ===== Фазы =====

  // Включает фазу 2, когда набрано нужное число очков,
  // и прячет баннер, когда его время вышло.
  // Вызывается только из update(), поэтому на паузе таймер баннера не идёт.
  private updatePhase(delta: number): void {
    if (this.phase === 1 && this.score >= PHASE_2_START_SCORE) {
      this.startPhase2();
    }

    if (this.bannerTimeLeft > 0) {
      this.bannerTimeLeft -= delta;
      if (this.bannerTimeLeft <= 0) {
        this.phaseBanner.setVisible(false);
      }
    }
  }

  // Переход в фазу 2 «Час пик»: меняются два параметра и показывается сигнал.
  private startPhase2(): void {
    this.phase = 2;

    // Параметр 1: машины едут быстрее.
    this.carSpeed = PHASE_2_CAR_SPEED;
    // Параметр 2: больше машин идёт по горизонтали.
    this.horizontalChance = PHASE_2_HORIZONTAL_CHANCE;

    // Сигнал игроку: строка в HUD, новый цвет дорог и баннер на несколько секунд.
    this.phaseText.setText('Фаза 2 — час пик');
    for (const road of this.roads) {
      road.setFillStyle(PHASE_2_ROAD_COLOR);
    }
    this.phaseBanner.setVisible(true);
    this.bannerTimeLeft = PHASE_BANNER_TIME;
  }

  // Создаёт новую машину за краем экрана в начале дороги.
  private spawnCar(road: Road): void {
    const cars = this.getCars(road);
    const lastCar = cars[cars.length - 1];

    // Новая машина появляется так, что её перед касается края экрана (0).
    // Если последняя машина очереди ещё не отъехала от края на зазор,
    // места нет — очередь дошла до края экрана.
    if (lastCar && this.getBack(lastCar) < CAR_GAP) {
      this.endGame('Пробка!');
      return;
    }

    const color = CAR_COLORS[Phaser.Math.Between(0, CAR_COLORS.length - 1)];
    const centerX = this.scale.width / 2;
    const centerY = this.scale.height / 2;
    // Центр машины на половину длины за краем экрана.
    const startPosition = -CAR_LENGTH / 2;

    // Горизонтальная машина длинная по X, вертикальная — по Y.
    const body =
      road === 'horizontal'
        ? this.add.rectangle(startPosition, centerY, CAR_LENGTH, CAR_WIDTH, color)
        : this.add.rectangle(centerX, startPosition, CAR_WIDTH, CAR_LENGTH, color);

    cars.push({ body, road });
  }

  // ===== Движение машин =====

  // Двигает все машины одной дороги.
  // isGreen — горит ли зелёный для этой дороги,
  // stopLine — координата стоп-линии вдоль этой дороги.
  private moveCars(cars: Car[], isGreen: boolean, stopLine: number, seconds: number): void {
    for (let i = 0; i < cars.length; i++) {
      const car = cars[i];
      const position = this.getPosition(car);

      // Сколько машина хочет проехать за этот кадр.
      let newPosition = position + this.carSpeed * seconds;

      // Красный свет: машина, которая ещё не пересекла стоп-линию,
      // не может заехать за неё. Уже пересёкшая — едет дальше.
      const hasCrossedStopLine = this.getFront(car) > stopLine;
      if (!isGreen && !hasCrossedStopLine) {
        newPosition = Math.min(newPosition, stopLine - CAR_LENGTH / 2);
      }

      // Машина впереди: держим зазор CAR_GAP до её задней части.
      if (i > 0) {
        const carAhead = cars[i - 1];
        newPosition = Math.min(newPosition, this.getPosition(carAhead) - CAR_LENGTH - CAR_GAP);
      }

      // Машины никогда не едут назад.
      this.setPosition(car, Math.max(position, newPosition));
    }
  }

  // Убирает машины, полностью уехавшие за край экрана, и даёт за них очки.
  // roadEnd — координата конца дороги (ширина или высота экрана).
  private removeFinishedCars(cars: Car[], roadEnd: number): void {
    // Первой уезжает машина [0], поэтому проверяем только начало массива.
    while (cars.length > 0 && this.getBack(cars[0]) > roadEnd) {
      const car = cars.shift();
      car?.body.destroy();
      this.score += 1;
      this.scoreText.setText(`Счёт: ${this.score}`);
    }
  }

  // ===== Game Over =====

  // Авария: если какая-то горизонтальная машина пересеклась с вертикальной.
  private checkCrash(): void {
    for (const horizontalCar of this.horizontalCars) {
      for (const verticalCar of this.verticalCars) {
        const isTouching = Phaser.Geom.Intersects.RectangleToRectangle(
          horizontalCar.body.getBounds(),
          verticalCar.body.getBounds(),
        );

        if (isTouching) {
          this.endGame('Авария!');
          return;
        }
      }
    }
  }

  // Останавливает игру и показывает причину, счёт и подсказку для рестарта.
  private endGame(reason: string): void {
    this.isGameOver = true;

    const { width, height } = this.scale;
    const centerX = width / 2;
    const centerY = height / 2;

    // Полупрозрачное затемнение поверх всего поля.
    this.add.rectangle(centerX, centerY, width, height, GAME_OVER_SHADE_COLOR, GAME_OVER_SHADE_ALPHA);
    // Плашка под надписями, чтобы их не перебивали машины и дороги.
    this.add.rectangle(centerX, centerY, GAME_OVER_PANEL_WIDTH, GAME_OVER_PANEL_HEIGHT, GAME_OVER_PANEL_COLOR);

    this.add
      .text(centerX, centerY - 60, reason, {
        fontFamily: FONT_FAMILY,
        fontSize: '48px',
        color: '#ffffff',
      })
      .setOrigin(0.5);

    this.add
      .text(centerX, centerY, `Счёт: ${this.score}`, {
        fontFamily: FONT_FAMILY,
        fontSize: '28px',
        color: '#ffffff',
      })
      .setOrigin(0.5);

    this.add
      .text(centerX, centerY + 50, 'Клик или пробел — новая игра', {
        fontFamily: FONT_FAMILY,
        fontSize: '18px',
        color: '#cbd5e1',
      })
      .setOrigin(0.5);
  }

  // ===== Вспомогательные функции =====

  // Массив машин нужной дороги.
  private getCars(road: Road): Car[] {
    return road === 'horizontal' ? this.horizontalCars : this.verticalCars;
  }

  // Положение центра машины вдоль её дороги: X для горизонтали, Y для вертикали.
  private getPosition(car: Car): number {
    return car.road === 'horizontal' ? car.body.x : car.body.y;
  }

  // Ставит центр машины в нужное место вдоль её дороги.
  private setPosition(car: Car, position: number): void {
    if (car.road === 'horizontal') {
      car.body.x = position;
    } else {
      car.body.y = position;
    }
  }

  // Координата переднего края машины (по ходу движения).
  private getFront(car: Car): number {
    return this.getPosition(car) + CAR_LENGTH / 2;
  }

  // Координата заднего края машины.
  private getBack(car: Car): number {
    return this.getPosition(car) - CAR_LENGTH / 2;
  }

  // X стоп-линии горизонтальной дороги: левый край перекрёстка минус отступ.
  private getHorizontalStopLineX(): number {
    return this.scale.width / 2 - ROAD_WIDTH / 2 - STOP_LINE_GAP;
  }

  // Y стоп-линии вертикальной дороги: верхний край перекрёстка минус отступ.
  private getVerticalStopLineY(): number {
    return this.scale.height / 2 - ROAD_WIDTH / 2 - STOP_LINE_GAP;
  }
}
