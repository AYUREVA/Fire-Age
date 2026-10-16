import { DAY_COUNT, DAY_DURATION, NIGHT_DURATION, SUNSET_TIME } from '../settings';

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
 */
export class DayNightCycle {
  // Сейчас день или ночь.
  phase: Phase = 'day';
  // Номер суток: 1, 2, …
  dayNumber = 1;
  // Сколько мс осталось до конца текущей фазы.
  timeLeft = DAY_DURATION;
  // Закат этого дня уже начался (событие 'sunset' уже было).
  private isSunsetStarted = false;

  // Ночь ли сейчас.
  isNight(): boolean {
    return this.phase === 'night';
  }

  // Вызывается сценой каждый кадр. Вернёт событие, если фаза сменилась, иначе undefined.
  update(delta: number): CycleEvent | undefined {
    this.timeLeft = Math.max(0, this.timeLeft - delta);

    // День: незадолго до конца — закат, в конце — ночь.
    if (this.phase === 'day') {
      if (this.timeLeft <= 0) {
        this.phase = 'night';
        this.timeLeft = NIGHT_DURATION;
        return 'night';
      }
      if (!this.isSunsetStarted && this.timeLeft <= SUNSET_TIME) {
        this.isSunsetStarted = true;
        return 'sunset';
      }
      return undefined;
    }

    // Ночь: в конце — рассвет. После последней ночи — победа, иначе новый день.
    if (this.timeLeft > 0) return undefined;
    if (this.dayNumber >= DAY_COUNT) return 'lastDawn';

    this.dayNumber += 1;
    this.phase = 'day';
    this.timeLeft = DAY_DURATION;
    this.isSunsetStarted = false;
    return 'morning';
  }
}
