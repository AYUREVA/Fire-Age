import { NIGHT_MAX_DURATION, SUNSET_TIME } from '../settings';

// Фаза суток: день (фаза 1) или ночь с метелью (фаза 2).
export type Phase = 'day' | 'night';

// Что случилось в этом кадре:
// 'sunset'   — до ночи осталось SUNSET_TIME, начинается закат;
// 'night'    — началась ночь;
// 'morning'  — наступило утро следующего дня;
// 'lastDawn' — рассвет после последней ночи: уровень пройден.
export type CycleEvent = 'sunset' | 'night' | 'morning' | 'lastDawn';

/**
 * Смена дня и ночи: хранит фазу, номер суток и сколько осталось до конца фазы.
 *
 * Ничего не рисует и ни о ком не знает. Сцена каждый кадр зовёт update(),
 * а когда фаза меняется, update() возвращает событие — сцена на него
 * отвечает: включает ночь, показывает уведомление, объявляет победу.
 *
 * Условие перехода отдельно от самого перехода (раздел 9 плана, правило 12):
 * функции should…() только отвечают «пора ли», а start…() / enter…()
 * меняют фазу. Чтобы ночь наступала не по времени, а по другому правилу,
 * меняется одна функция условия — shouldEnterNight().
 */
export class DayNightCycle {
  // Сейчас день или ночь.
  phase: Phase = 'day';
  // Номер суток: 1, 2, …
  dayNumber = 1;
  // Сколько мс осталось до конца текущей фазы.
  timeLeft: number;
  // Закат этого дня уже начался (событие 'sunset' уже было).
  private isSunsetStarted = false;
  // Сколько суток в уровне и сколько мс длятся день и ночь (data/levels.ts).
  private dayCount: number;
  private dayDuration: number;
  private nightDuration: number;

  // dayCount — сколько суток, dayDuration и nightDuration — длина дня и ночи уровня (мс).
  // Ночь не бывает дольше NIGHT_MAX_DURATION, даже если уровень просит больше.
  constructor(dayCount: number, dayDuration: number, nightDuration: number) {
    this.dayCount = dayCount;
    this.dayDuration = dayDuration;
    this.nightDuration = Math.min(nightDuration, NIGHT_MAX_DURATION);
    this.timeLeft = dayDuration;
  }

  // Вызывается сценой каждый кадр. Вернёт событие, если фаза сменилась, иначе undefined.
  update(delta: number): CycleEvent | undefined {
    this.timeLeft = Math.max(0, this.timeLeft - delta);

    // День: незадолго до конца — закат, в конце — ночь.
    if (this.phase === 'day') {
      if (this.shouldEnterNight()) return this.enterNight();
      if (this.shouldStartSunset()) return this.startSunset();
      return undefined;
    }

    // Ночь: в конце — рассвет.
    if (this.shouldStartMorning()) return this.startMorning();
    return undefined;
  }

  // ===== Условия: пора ли (ничего не меняют) =====

  // Пора ли начинать закат: до конца дня осталось SUNSET_TIME, а заката ещё не было.
  private shouldStartSunset(): boolean {
    return !this.isSunsetStarted && this.timeLeft <= SUNSET_TIME;
  }

  // Пора ли наступать ночи: день кончился.
  private shouldEnterNight(): boolean {
    return this.timeLeft <= 0;
  }

  // Пора ли наступать утру: ночь кончилась.
  private shouldStartMorning(): boolean {
    return this.timeLeft <= 0;
  }

  // ===== Переходы: что меняется =====

  // Закат: небо начинает розоветь (это рисует сцена).
  private startSunset(): CycleEvent {
    this.isSunsetStarted = true;
    return 'sunset';
  }

  // Ночь с метелью — на длину ночи уровня.
  private enterNight(): CycleEvent {
    this.phase = 'night';
    this.timeLeft = this.nightDuration;
    return 'night';
  }

  // Утро: после последней ночи — победа, иначе новый день.
  private startMorning(): CycleEvent {
    if (this.dayNumber >= this.dayCount) return 'lastDawn';

    this.dayNumber += 1;
    this.phase = 'day';
    this.timeLeft = this.dayDuration;
    this.isSunsetStarted = false;
    return 'morning';
  }
}
