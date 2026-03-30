/**
 * Web Audio SFX: preload, pooled voices, autoplay-safe resume on first gesture.
 * Paths: /assets/audio/<id>.wav (see docs/agent-checklists/run-23-sound-effects.md).
 */

const STORAGE_MUTED_KEY = "game-rpg-sfx-muted";

export type SfxId =
  | "attack"
  | "hurt"
  | "pickup"
  | "enemy-death"
  | "player-death"
  | "ui-click";

const ALL_SFX: SfxId[] = [
  "attack",
  "hurt",
  "pickup",
  "enemy-death",
  "player-death",
  "ui-click",
];

const MAX_VOICES = 12;

function assetUrl(soundId: SfxId): string {
  const base = import.meta.env.BASE_URL;
  const prefix = base.endsWith("/") ? base.slice(0, -1) : base;
  return `${prefix}/assets/audio/${soundId}.wav`;
}

function readMutedPreference(): boolean {
  try {
    return localStorage.getItem(STORAGE_MUTED_KEY) === "1";
  } catch {
    return false;
  }
}

function writeMutedPreference(muted: boolean): void {
  try {
    localStorage.setItem(STORAGE_MUTED_KEY, muted ? "1" : "0");
  } catch {
    /* ignore quota / private mode */
  }
}

export type AudioManager = {
  /** Fetch + decode all SFX; safe to call once at boot. */
  preload(): Promise<void>;
  play(id: SfxId): void;
  setMuted(muted: boolean): void;
  isMuted(): boolean;
};

export function createAudioManager(): AudioManager {
  let ctx: AudioContext | null = null;
  let masterGain: GainNode | null = null;
  const buffers = new Map<SfxId, AudioBuffer>();
  let muted = readMutedPreference();
  let unlockBound = false;
  const activeSources: AudioBufferSourceNode[] = [];

  const ensureContext = (): AudioContext | null => {
    if (typeof AudioContext === "undefined") {
      return null;
    }
    if (!ctx) {
      ctx = new AudioContext();
      masterGain = ctx.createGain();
      masterGain.gain.value = muted ? 0 : 1;
      masterGain.connect(ctx.destination);
    }
    return ctx;
  };

  const bindUnlockOnce = (): void => {
    if (unlockBound || typeof window === "undefined") {
      return;
    }
    unlockBound = true;
    const resume = (): void => {
      const c = ensureContext();
      if (c && c.state === "suspended") {
        void c.resume().catch(() => {});
      }
    };
    window.addEventListener("pointerdown", resume, { passive: true });
    window.addEventListener("touchstart", resume, { passive: true });
  };

  bindUnlockOnce();

  const trimVoicePool = (): void => {
    while (activeSources.length > MAX_VOICES) {
      const old = activeSources.shift();
      if (old) {
        try {
          old.stop(0);
        } catch {
          /* already ended */
        }
        try {
          old.disconnect();
        } catch {
          /* noop */
        }
      }
    }
  };

  const playImpl = (id: SfxId): void => {
    if (muted) {
      return;
    }
    const c = ensureContext();
    if (!c || c.state !== "running") {
      return;
    }
    const buf = buffers.get(id);
    if (!buf) {
      return;
    }
    trimVoicePool();
    const src = c.createBufferSource();
    src.buffer = buf;
    if (!masterGain) {
      return;
    }
    src.connect(masterGain);
    activeSources.push(src);
    src.onended = (): void => {
      const i = activeSources.indexOf(src);
      if (i >= 0) {
        activeSources.splice(i, 1);
      }
      try {
        src.disconnect();
      } catch {
        /* noop */
      }
    };
    try {
      src.start(0);
    } catch {
      const i = activeSources.indexOf(src);
      if (i >= 0) {
        activeSources.splice(i, 1);
      }
    }
  };

  return {
    async preload(): Promise<void> {
      const c = ensureContext();
      if (!c) {
        return;
      }
      for (const id of ALL_SFX) {
        if (buffers.has(id)) {
          continue;
        }
        try {
          const res = await fetch(assetUrl(id));
          if (!res.ok) {
            continue;
          }
          const raw = await res.arrayBuffer();
          const decoded = await c.decodeAudioData(raw.slice(0));
          buffers.set(id, decoded);
        } catch {
          /* missing asset or decode error — skip */
        }
      }
    },

    play(id: SfxId): void {
      playImpl(id);
    },

    setMuted(next: boolean): void {
      muted = next;
      writeMutedPreference(next);
      if (ctx && masterGain) {
        masterGain.gain.setValueAtTime(next ? 0 : 1, ctx.currentTime);
      }
    },

    isMuted(): boolean {
      return muted;
    },
  };
}
