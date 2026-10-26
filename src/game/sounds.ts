import Phaser from 'phaser';
import { getProgress, setMuted } from './save';

// =====================================================================
//  Звуки игры. Как и картинки (textures.ts), они не лежат файлами,
//  а создаются кодом при старте: из шума и тонов собирается AudioBuffer
//  (Web Audio) и кладётся в кэш Phaser под ключом из SOUNDS.
//  Чтобы заменить звук записанным файлом, меняется только этот файл.
//
//  Звук работает, только если браузер даёт Web Audio. Нет — игра идёт
//  без звука: playSound() и addLoop() просто ничего не делают.
// =====================================================================

// Ключи звуков: по ним объекты их проигрывают.
export const SOUNDS = {
  hit: 'sound-hit', // удар дубиной или оружием
  pickup: 'sound-pickup', // предмет лёг на спину
  tusk: 'sound-tusk', // клык упал в счётчик или ушёл на покупку
  crackle: 'sound-crackle', // треск костра (повторяется по кругу)
  howl: 'sound-howl', // вой волка, выходящего из леса
  wind: 'sound-wind', // ветер ночью (повторяется по кругу)
  star: 'sound-star', // звезда «впечаталась» на экране итогов
} as const;

// Громкость каждого звука (0 — тихо, 1 — во всю силу).
export const SOUND_VOLUMES = {
  hit: 0.45,
  pickup: 0.3,
  tusk: 0.35,
  crackle: 0.3,
  howl: 0.4,
  wind: 0.35,
  star: 0.55,
};

// Звук, который повторяется по кругу: у него можно менять громкость.
export type LoopSound = Phaser.Sound.WebAudioSound | Phaser.Sound.HTML5AudioSound | Phaser.Sound.NoAudioSound;

// Звук в виде формулы: t — секунды от начала, dt — длина одного шага (1 / частота дискретизации).
// Возвращает значение волны от −1 до 1. Внутри может хранить своё состояние (фазу, фильтр).
type Synth = (t: number, dt: number) => number;

// Создаёт все звуки (если ещё нет) и включает или выключает звук по сохранению.
// Вызывается в create() меню и игры.
export function createSounds(scene: Phaser.Scene): void {
  scene.sound.mute = getProgress().isMuted;
  if (!(scene.sound instanceof Phaser.Sound.WebAudioSoundManager)) return;
  // Звуки общие для всей игры и переживают перезапуск сцены — второй раз не создаём.
  if (scene.cache.audio.exists(SOUNDS.hit)) return;

  bake(scene, SOUNDS.hit, 0.18, hitSynth());
  bake(scene, SOUNDS.pickup, 0.12, pickupSynth());
  bake(scene, SOUNDS.tusk, 0.3, tuskSynth());
  bake(scene, SOUNDS.crackle, 2, crackleSynth());
  bake(scene, SOUNDS.howl, 1.7, howlSynth());
  bake(scene, SOUNDS.wind, 4, windSynth(4));
  bake(scene, SOUNDS.star, 0.45, starSynth());
}

// Проиграть звук один раз с громкостью volume.
export function playSound(scene: Phaser.Scene, key: string, volume: number): void {
  if (!scene.cache.audio.exists(key)) return;
  scene.sound.play(key, { volume });
}

// Звук, который повторяется по кругу (треск костра, ветер). Сам не начинается:
// его запускает и останавливает владелец. Нет Web Audio — вернёт undefined.
// Звук принадлежит сцене: когда сцена выключается, он удаляется.
export function addLoop(scene: Phaser.Scene, key: string, volume: number): LoopSound | undefined {
  if (!scene.cache.audio.exists(key)) return undefined;
  const sound = scene.sound.add(key, { loop: true, volume });
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => sound.destroy());
  return sound;
}

// Выключить или включить звук и запомнить это в сохранении. Вернёт, выключен ли звук теперь.
export function toggleMute(scene: Phaser.Scene): boolean {
  const isMuted = !getProgress().isMuted;
  setMuted(isMuted);
  scene.sound.mute = isMuted;
  return isMuted;
}

// ===== Сборка звука =====

// Записывает формулу synth длиной seconds секунд в AudioBuffer и кладёт его в кэш под ключом key.
function bake(scene: Phaser.Scene, key: string, seconds: number, synth: Synth): void {
  const context = (scene.sound as Phaser.Sound.WebAudioSoundManager).context;
  const rate = context.sampleRate;
  const buffer = context.createBuffer(1, Math.ceil(seconds * rate), rate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    data[i] = Phaser.Math.Clamp(synth(i / rate, 1 / rate), -1, 1);
  }
  scene.cache.audio.add(key, buffer);
}

// Белый шум: случайное число от −1 до 1.
function noise(): number {
  return Math.random() * 2 - 1;
}

// Тон, у которого частота меняется со временем: frequency(t) — частота в герцах.
// Фаза копится шаг за шагом, поэтому при смене частоты нет щелчков.
function tone(frequency: (t: number) => number): Synth {
  let phase = 0;
  return (t, dt) => {
    phase += 2 * Math.PI * frequency(t) * dt;
    return Math.sin(phase);
  };
}

// Сглаженный шум: чем меньше smooth (0…1), тем ниже и глуше звук (простой фильтр).
function softNoise(smooth: (t: number) => number): Synth {
  let value = 0;
  return (t) => {
    value += (noise() - value) * smooth(t);
    return value;
  };
}

// ===== Звуки =====

// Удар: глухой «бум» — низкий тон быстро падает по частоте и затухает, сверху короткий шорох.
function hitSynth(): Synth {
  const body = tone((t) => 60 + 140 * Math.exp(-t * 25));
  return (t, dt) => 0.9 * body(t, dt) * Math.exp(-t * 28) + 0.35 * noise() * Math.exp(-t * 70);
}

// Предмет лёг на спину: мягкий «пуп» — тон быстро уходит вверх и затухает.
function pickupSynth(): Synth {
  const pop = tone((t) => 420 + 2600 * t);
  return (t, dt) => 0.7 * pop(t, dt) * Math.exp(-t * 30);
}

// Клык: звонкое «дзынь-дзынь» — два высоких затухающих тона, второй чуть позже.
function tuskSynth(): Synth {
  const first = tone(() => 1320);
  const second = tone(() => 1980);
  const secondStart = 0.07;
  return (t, dt) => {
    const a = first(t, dt) * Math.exp(-t * 18);
    const b = t < secondStart ? 0 : second(t, dt) * Math.exp(-(t - secondStart) * 14);
    return 0.4 * a + 0.4 * b;
  };
}

// Треск костра: тихий глухой гул и случайные короткие щелчки поленьев.
function crackleSynth(): Synth {
  const rumble = softNoise(() => 0.02);
  // Сколько ещё длится текущий щелчок (секунды) и его громкость.
  let clickLeft = 0;
  let clickVolume = 0;
  // В среднем столько щелчков в секунду.
  const clicksPerSecond = 14;
  return (_t, dt) => {
    if (clickLeft <= 0 && Math.random() < clicksPerSecond * dt) {
      clickLeft = 0.004 + Math.random() * 0.01;
      clickVolume = 0.3 + Math.random() * 0.6;
    }
    clickLeft -= dt;
    const click = clickLeft > 0 ? noise() * clickVolume : 0;
    return 1.2 * rumble(_t, dt) + click;
  };
}

// Вой волка: тон плавно поднимается и опускается, с лёгким дрожанием голоса;
// медленно нарастает и затихает.
function howlSynth(): Synth {
  const length = 1.7;
  const voice = tone((t) => {
    const rise = Math.sin(Math.min(1, t / length) * Math.PI);
    const vibrato = 7 * Math.sin(2 * Math.PI * 5 * t);
    return 330 + 200 * rise + vibrato;
  });
  const overtone = tone((t) => 2 * (330 + 200 * Math.sin(Math.min(1, t / length) * Math.PI)));
  return (t, dt) => {
    const envelope = Math.min(1, t / 0.35) * Math.min(1, Math.max(0, length - t) / 0.5);
    return envelope * (0.6 * voice(t, dt) + 0.15 * overtone(t, dt));
  };
}

// Ветер: шум, у которого то ниже, то выше «свист» и то тише, то громче порывы.
// Волны укладываются в длину звука целое число раз — по кругу он повторяется без шва.
function windSynth(length: number): Synth {
  const gust = (t: number): number => 0.5 + 0.5 * Math.sin((2 * Math.PI * t) / length);
  const air = softNoise((t) => 0.01 + 0.03 * gust(t));
  return (t, dt) => 2.2 * air(t, dt) * (0.45 + 0.55 * gust(t));
}

// Звезда на экране итогов: яркое «тинь» — тон взлетает вверх, сверху октава, затухает.
function starSynth(): Synth {
  const main = tone((t) => 880 + 900 * Math.min(1, t / 0.08));
  const octave = tone((t) => 2 * (880 + 900 * Math.min(1, t / 0.08)));
  return (t, dt) => (0.5 * main(t, dt) + 0.2 * octave(t, dt)) * Math.exp(-t * 7);
}
