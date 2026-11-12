"use client";

// Alertas para cocina y garzón. Los navegadores bloquean el sonido hasta que la persona
// interactúa con la página, por eso se activan con el botón "Comenzar turno".

let audio: AudioContext | null = null;
let wakeLock: { release: () => Promise<void> } | null = null;

/** Debe llamarse desde un clic. Habilita el sonido y mantiene la pantalla encendida. */
export async function startShift() {
  audio ??= new AudioContext();
  await audio.resume();
  await keepScreenOn();
  // El navegador suelta el bloqueo al cambiar de pestaña; se pide de nuevo al volver.
  // Una sola vez aunque el turno se inicie varias veces.
  document.removeEventListener("visibilitychange", onVisible);
  document.addEventListener("visibilitychange", onVisible);
}

function onVisible() {
  if (document.visibilityState === "visible") keepScreenOn();
}

async function keepScreenOn() {
  try {
    const nav = navigator as Navigator & {
      wakeLock?: { request: (type: "screen") => Promise<{ release: () => Promise<void> }> };
    };
    wakeLock = (await nav.wakeLock?.request("screen")) ?? wakeLock;
  } catch {
    // Sin soporte o sin permiso: la app funciona igual.
  }
}

/** Dos tonos cortos. No suena si el turno no se inició. */
export function playChime() {
  if (!audio || audio.state !== "running") return;
  const t = audio.currentTime;
  for (const [i, freq] of [880, 1320].entries()) {
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, t + i * 0.18);
    gain.gain.exponentialRampToValueAtTime(0.3, t + i * 0.18 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.18 + 0.3);
    osc.connect(gain).connect(audio.destination);
    osc.start(t + i * 0.18);
    osc.stop(t + i * 0.18 + 0.32);
  }
}
