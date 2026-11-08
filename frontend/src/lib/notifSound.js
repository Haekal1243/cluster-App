
let ctx = null;
let terakhir = 0;

function ambilCtx() {
  if (typeof window === "undefined") return null;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  if (!ctx) ctx = new AC();
  return ctx;
}

export function aktifkanBunyiNotif() {
  if (typeof window === "undefined") return () => {};
  const bangun = () => {
    const c = ambilCtx();
    if (c && c.state === "suspended") c.resume().catch(() => {});
  };
  const opsi = { once: true, passive: true };
  window.addEventListener("pointerdown", bangun, opsi);
  window.addEventListener("keydown", bangun, opsi);
  return () => {
    window.removeEventListener("pointerdown", bangun);
    window.removeEventListener("keydown", bangun);
  };
}

export function bunyiNotif() {
  const now = Date.now();
  if (now - terakhir < 1500) return;
  terakhir = now;

  const c = ambilCtx();
  if (!c || c.state !== "running") return;

  const nada = (frek, mulai, durasi) => {
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = "sine";
    osc.frequency.value = frek;
    gain.gain.setValueAtTime(0.0001, c.currentTime + mulai);
    gain.gain.exponentialRampToValueAtTime(0.35, c.currentTime + mulai + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + mulai + durasi);
    osc.connect(gain).connect(c.destination);
    osc.start(c.currentTime + mulai);
    osc.stop(c.currentTime + mulai + durasi + 0.05);
  };
  nada(880, 0, 0.18);
  nada(1320, 0.16, 0.28);
}
