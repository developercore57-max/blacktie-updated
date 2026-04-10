import { useCallback, useEffect, useRef } from "react";

export function useNotificationChime() {
  const unlocked = useRef(false);
  const audioCtxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    const unlock = () => {
      unlocked.current = true;
      try {
        if (!audioCtxRef.current) {
          audioCtxRef.current = new AudioContext();
        } else if (audioCtxRef.current.state === "suspended") {
          audioCtxRef.current.resume().catch(() => {});
        }
      } catch {}
    };
    window.addEventListener("click", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    window.addEventListener("touchstart", unlock, { once: true });
    return () => {
      window.removeEventListener("click", unlock);
      window.removeEventListener("keydown", unlock);
      window.removeEventListener("touchstart", unlock);
    };
  }, []);

  const playChime = useCallback(() => {
    if (!unlocked.current) return;
    if (document.hidden) return;
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioContext();
      }
      const ctx = audioCtxRef.current;

      const playTone = (freq: number, startTime: number, duration: number, peak: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = "sine";
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(peak, startTime + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
        osc.start(startTime);
        osc.stop(startTime + duration + 0.05);
      };

      const now = ctx.currentTime;
      playTone(880, now, 0.45, 0.55);
      playTone(1100, now + 0.20, 0.40, 0.45);
      playTone(1320, now + 0.38, 0.35, 0.35);
    } catch {
    }
  }, []);

  return { playChime };
}
