
let audioCtx: AudioContext | null = null;
let musicEnabled = false;
let nextNoteTime = 0.0;
let timerID: any = null; // Use 'any' or 'number' to avoid NodeJS namespace issues in browser
const TEMPO = 110;
const LOOKAHEAD = 25.0; // How frequently to call scheduling function (in milliseconds)
const SCHEDULE_AHEAD_TIME = 0.1; // How far ahead to schedule audio (sec)

// C Major Pentatonic Scale (C4 - C6) for a playful, safe vibe
const SCALE = [
  261.63, 293.66, 329.63, 392.00, 440.00, // C4, D4, E4, G4, A4
  523.25, 587.33, 659.26, 783.99, 880.00  // C5, D5, E5, G5, A5
];

const getCtx = () => {
  if (!audioCtx) {
    // Handle standard and webkit prefixed AudioContext
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  return audioCtx;
};

const resumeCtx = () => {
  const ctx = getCtx();
  if (ctx && ctx.state === 'suspended') {
    ctx.resume().catch(console.error);
  }
  return ctx;
};

// --- Sound Effect Functions ---

export const playClick = () => {
  try {
    const ctx = resumeCtx();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    // High pitched, short "pip"
    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.05);

    gain.gain.setValueAtTime(0.05, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);

    osc.start();
    osc.stop(ctx.currentTime + 0.05);
  } catch (e) {
    // Ignore audio errors
  }
};

export const playHover = () => {
  try {
    const ctx = resumeCtx();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    // Very subtle high tick
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(800, ctx.currentTime);
    
    gain.gain.setValueAtTime(0.02, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.02);

    osc.start();
    osc.stop(ctx.currentTime + 0.02);
  } catch (e) {
    // Ignore audio errors
  }
};

export const playCapture = () => {
  try {
    const ctx = resumeCtx();
    if (!ctx) return;

    // Create noise buffer for shutter sound
    const bufferSize = ctx.sampleRate * 0.15; // 150ms
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1);
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const gain = ctx.createGain();
    
    // Filter to make it sound more mechanical
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 1000;

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);

    noise.start();
  } catch (e) {
    // Ignore audio errors
  }
};

export const playCameraStart = () => {
  try {
    const ctx = resumeCtx();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    // Rising sci-fi tone
    osc.type = 'sine';
    osc.frequency.setValueAtTime(300, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.2);

    gain.gain.setValueAtTime(0.05, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.001, ctx.currentTime + 0.2);

    osc.start();
    osc.stop(ctx.currentTime + 0.2);
  } catch (e) {
    // Ignore audio errors
  }
};

export const playCameraStop = () => {
  try {
    const ctx = resumeCtx();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    // Falling tone
    osc.type = 'sine';
    osc.frequency.setValueAtTime(500, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.15);

    gain.gain.setValueAtTime(0.05, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.001, ctx.currentTime + 0.15);

    osc.start();
    osc.stop(ctx.currentTime + 0.15);
  } catch (e) {
    // Ignore audio errors
  }
};

export const playSuccess = () => {
  try {
    const ctx = resumeCtx();
    if (!ctx) return;

    const now = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6

    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.type = 'sine';
      osc.frequency.value = freq;

      const startTime = now + (i * 0.08);
      const duration = 0.4;

      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.05, startTime + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

      osc.start(startTime);
      osc.stop(startTime + duration);
    });
  } catch (e) {
    // Ignore audio errors
  }
};

// --- Procedural Background Music ---

const scheduleNote = (time: number) => {
  const ctx = getCtx();
  if (!ctx) return;

  // 20% chance of a rest (silence) for a natural feel
  if (Math.random() < 0.2) return;

  // Pick a random note from the pentatonic scale
  const noteIndex = Math.floor(Math.random() * SCALE.length);
  const frequency = SCALE[noteIndex];

  // Oscillator for the note
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  
  // Lowpass filter to make it sound soft/marimba-like
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 800; // Cutoff bright frequencies

  osc.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);

  osc.type = 'sine';
  osc.frequency.value = frequency;

  // Envelope: Quick attack, decay to silence (Pluck sound)
  const attack = 0.02;
  const decay = 0.3;
  
  gain.gain.setValueAtTime(0, time);
  gain.gain.linearRampToValueAtTime(0.08, time + attack); // Keep volume low (0.08)
  gain.gain.exponentialRampToValueAtTime(0.001, time + attack + decay);

  osc.start(time);
  osc.stop(time + attack + decay + 0.1);
};

const scheduler = () => {
  // While there are notes that will need to play before the next interval, 
  // schedule them and advance the pointer.
  const ctx = getCtx();
  if (!ctx || !musicEnabled) return;

  while (nextNoteTime < ctx.currentTime + SCHEDULE_AHEAD_TIME) {
    scheduleNote(nextNoteTime);
    // Advance time by a quarter note (60 / BPM)
    // Add some random swing (-0.05 to +0.05) for human feel
    const swing = (Math.random() * 0.05) - 0.025;
    nextNoteTime += (60.0 / TEMPO) + swing;
  }

  timerID = window.setTimeout(scheduler, LOOKAHEAD);
};

export const toggleBackgroundMusic = (enable: boolean) => {
  const ctx = resumeCtx();
  musicEnabled = enable;

  if (musicEnabled) {
    if (ctx) {
      nextNoteTime = ctx.currentTime + 0.1;
      scheduler();
    }
  } else {
    if (timerID) {
      clearTimeout(timerID);
      timerID = null;
    }
  }
};
