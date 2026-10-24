import { ANALYTICS_LOG } from './settings';

// =====================================================================
//  Аналитика: одна функция отправки события и список событий.
//
//  События отправляются только из переходов автомата GameScene
//  (раздел 9 плана, правило 11), а не из объектов.
//  Сейчас события пишутся в консоль (выключается ANALYTICS_LOG в settings.ts).
//  В 1.1 track() будет внутри вызывать platform.ts и отправлять события
//  в счётчик Яндекса — остальной код не изменится.
// =====================================================================

// Статистика уровня. Хранит её объект stats, который GameScene создаёт
// в create(); меняют системы, аналитика только читает в переходах.
export type LevelStats = {
  fed: number; // сколько путников накормлено
  hungry: number; // сколько путников ушло голодными
  tusksEarned: number; // сколько клыков вождь собрал со стола
  playTime: number; // сколько мс игра шла (только режим PLAYING, без пауз)
  wolvesDriven: number; // сколько волков вождь отогнал
  itemsStolen: number; // сколько предметов волки унесли в лес
};

// Откуда пришла пауза: кнопка в углу, клавиша P / Esc или свёрнутая вкладка.
export type PauseSource = 'button' | 'key' | 'hidden';

// Все события игры и их поля.
export type AnalyticsEvent =
  | { name: 'levelStart'; level: number } // игрок начал уровень номер level (READY → PLAYING)
  | { name: 'pause'; source: PauseSource } // PLAYING → PAUSED
  | { name: 'resume' } // PAUSED → PLAYING
  | { name: 'restart'; from: 'pause' | 'result' } // «Заново»: из паузы или с итогов
  | { name: 'nightStart'; day: number } // наступила ночь номер day: игрок дожил до метели
  // Конец уровня (PLAYING → RESULT): номер уровня, победа или поражение, причина, номер суток и статистика.
  | ({ name: 'levelEnd'; level: number; isWin: boolean; reason: 'dawn' | 'fireOut'; day: number } & LevelStats)
  // Игрок закрыл вкладку во время игры или паузы: сколько мс успел поиграть.
  | { name: 'tabClosed'; playTime: number };

// Отправить событие. Пока — строчкой в консоль.
export function track(event: AnalyticsEvent): void {
  if (!ANALYTICS_LOG) return;
  console.log('[analytics]', event.name, event);
}
