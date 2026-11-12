"use client";

// Alertas para cocina y garzón. Los navegadores bloquean el sonido hasta que la persona
// interactúa con la página, por eso se activan con el botón "Comenzar turno".
// Tras recargar (F5) el bloqueo vuelve: el turno se recuerda en la pestaña y el sonido
// se reactiva con el primer toque, sin volver a pedir "Comenzar turno".

let audio: AudioContext | null = null;
let wakeLock: { release: () => Promise<void> } | null = null;

/** Turno iniciado en esta pestaña: sobrevive a F5 y se olvida al cerrarla o al cerrar sesión. */
const STARTED_KEY = "turno-iniciado";

export function wasShiftStarted() {
  try {
    return sessionStorage.getItem(STARTED_KEY) === "1";
  } catch {
    return false; // almacenamiento bloqueado: se vuelve a pedir "Comenzar turno"
  }
}

/** Al cerrar sesión: la próxima persona que entre debe comenzar su propio turno. */
export function endShift() {
  try {
    sessionStorage.removeItem(STARTED_KEY);
  } catch {
    // Sin almacenamiento: nada que olvidar.
  }
}

/** Debe llamarse desde un clic. Habilita el sonido y mantiene la pantalla encendida. */
export async function startShift() {
  try {
    sessionStorage.setItem(STARTED_KEY, "1");
  } catch {
    // Sin almacenamiento: el turno dura hasta recargar.
  }
  audio ??= new AudioContext(); // se crea y reanuda dentro del gesto, antes de cualquier await
  await audio.resume();
  await keepScreenOn();
  watchVisibility();
}

/**
 * Turno ya iniciado antes de recargar: mantiene la pantalla encendida y reactiva el sonido
 * con el primer clic o tecla en cualquier parte. Devuelve la función que deja de escuchar.
 */
export function resumeShift(onSoundReady: () => void) {
  keepScreenOn();
  watchVisibility();
  const stop = () => {
    window.removeEventListener("click", unlock, true);
    window.removeEventListener("keydown", unlock, true);
  };
  async function unlock() {
    try {
      await startShift();
    } catch {
      return; // el navegador lo rechazó: se intenta con el siguiente toque
    }
    if (audio?.state !== "running") return;
    stop();
    onSoundReady();
  }
  window.addEventListener("click", unlock, true);
  window.addEventListener("keydown", unlock, true);
  return stop;
}

// El navegador suelta el bloqueo de pantalla al cambiar de pestaña; se pide de nuevo al volver.
// Una sola vez aunque el turno se inicie varias veces.
function watchVisibility() {
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
