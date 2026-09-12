export type RingtonePreset = "urgent" | "classic" | "soft";

export const RINGTONE_STORAGE_KEY = "order_ringtone_preset";
export const RINGTONE_ENABLED_STORAGE_KEY = "order_ringtone_enabled";
export const VIBRATION_ENABLED_STORAGE_KEY = "order_vibration_enabled";

export const RINGTONE_PRESETS: Array<{
  value: RingtonePreset;
  label: string;
  description: string;
}> = [
  { value: "urgent", label: "Darurat", description: "Keras dan berulang" },
  { value: "classic", label: "Klasik", description: "Nada dering standar" },
  { value: "soft", label: "Lembut", description: "Lebih tenang" },
];

const DEFAULT_PRESET: RingtonePreset = "urgent";
let audioContext: AudioContext | null = null;

export function getRingtonePreset(): RingtonePreset {
  try {
    const value = localStorage.getItem(RINGTONE_STORAGE_KEY);
    return RINGTONE_PRESETS.some((preset) => preset.value === value)
      ? (value as RingtonePreset)
      : DEFAULT_PRESET;
  } catch {
    return DEFAULT_PRESET;
  }
}

export function isRingtoneEnabled(): boolean {
  try {
    return localStorage.getItem(RINGTONE_ENABLED_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

export function setRingtonePreset(preset: RingtonePreset): void {
  try {
    localStorage.setItem(RINGTONE_STORAGE_KEY, preset);
  } catch {
    // Storage may be unavailable in private browsing; audio still works for the session.
  }
}

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Context = window.AudioContext ||
    (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Context) return null;
  audioContext ??= new Context();
  return audioContext;
}

/** Unlock audio after a user gesture so later realtime events can ring. */
export async function enableRingtone(): Promise<boolean> {
  const context = getAudioContext();
  if (!context) return false;
  try {
    if (context.state === "suspended") await context.resume();
    localStorage.setItem(RINGTONE_ENABLED_STORAGE_KEY, "true");
    return context.state === "running";
  } catch {
    return false;
  }
}

export function disableRingtone(): void {
  try {
    localStorage.setItem(RINGTONE_ENABLED_STORAGE_KEY, "false");
  } catch {
    // Ignore storage errors.
  }
}

/** Vibration is enabled by default; browsers without Vibration API are ignored. */
export function isVibrationEnabled(): boolean {
  try {
    return localStorage.getItem(VIBRATION_ENABLED_STORAGE_KEY) !== "false";
  } catch {
    return true;
  }
}

export function setVibrationEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(VIBRATION_ENABLED_STORAGE_KEY, String(enabled));
  } catch {
    // Ignore storage errors.
  }
}

/** Triggers a strong, short alert pattern when the device supports vibration. */
export function vibrateOrder(): void {
  if (!isVibrationEnabled() || typeof navigator === "undefined" || !navigator.vibrate) return;
  try {
    navigator.vibrate([350, 120, 350, 120, 600]);
  } catch {
    // Vibration must never break the notification flow.
  }
}

function tone(context: AudioContext, startAt: number, frequency: number, duration: number, volume: number) {
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = "square";
  oscillator.frequency.setValueAtTime(frequency, startAt);
  gain.gain.setValueAtTime(0.0001, startAt);
  gain.gain.exponentialRampToValueAtTime(volume, startAt + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start(startAt);
  oscillator.stop(startAt + duration + 0.02);
}

/** Plays a short repeating alert; no external audio file is required. */
export async function playRingtone(preset = getRingtonePreset()): Promise<void> {
  if (!isRingtoneEnabled()) return;
  const context = getAudioContext();
  if (!context) return;
  try {
    if (context.state === "suspended") await context.resume();
    const now = context.currentTime + 0.02;
    const patterns: Record<RingtonePreset, { frequencies: number[]; gap: number; volume: number }> = {
      urgent: { frequencies: [880, 660, 880, 660, 880, 660], gap: 0.16, volume: 0.2 },
      classic: { frequencies: [784, 988, 784, 988], gap: 0.24, volume: 0.14 },
      soft: { frequencies: [523, 659, 784], gap: 0.3, volume: 0.1 },
    };
    const pattern = patterns[preset];
    pattern.frequencies.forEach((frequency, index) => {
      tone(context, now + index * pattern.gap, frequency, pattern.gap * 0.72, pattern.volume);
    });
  } catch {
    // Audio must never break the notification flow.
  }
}
