import { GameNote, Song } from "../types";

// Note Frequencies in Hz
const NOTES = {
  C2: 65.41, D2: 73.42, E2: 82.41, F2: 87.31, G2: 98.00, A2: 110.00,
  C3: 130.81, D3: 146.83, E3: 164.81, F3: 174.61, G3: 196.00, A3: 220.00, B3: 246.94,
  C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392.00, A4: 440.00, B4: 493.88,
  C5: 523.25, D5: 587.33, E5: 659.25, F5: 698.46, G5: 783.99, A5: 880.00, B5: 987.77,
  C6: 1046.50, E6: 1318.51, G6: 1567.98
};

// Preset Songs Metadata
export const SONGS: Song[] = [
  {
    id: "chill_sunset",
    title: "Chill Sunset",
    subtitle: "Lofi Calm Beats",
    bpm: 85,
    difficulty: "Easy",
    color: "#38bdf8", // Neon Blue
    bgColor: "from-sky-950 via-slate-900 to-indigo-950",
    duration: 45,
    description: "A relaxed, low-tempo track perfect for warming up your fingers. Enjoy the soothing lofi chords.",
    notesCount: 68
  },
  {
    id: "neon_drive",
    title: "Neon Drive",
    subtitle: "80s Retro Synthwave",
    bpm: 120,
    difficulty: "Medium",
    color: "#f43f5e", // Neon Rose
    bgColor: "from-rose-950 via-neutral-900 to-slate-950",
    duration: 60,
    description: "Cruising down a cybernetic highway with high-tempo, driving basslines and sweet analog-style leads.",
    notesCount: 162
  },
  {
    id: "retro_chiptune",
    title: "8-Bit Adventure",
    subtitle: "Fast Arcade Chiptune",
    bpm: 140,
    difficulty: "Hard",
    color: "#a855f7", // Neon Purple
    bgColor: "from-violet-950 via-slate-950 to-neutral-950",
    duration: 52,
    description: "Full arcade frenzy! Chiptune oscillators, noise sweeps, and lightning-fast sixteenth note sequences.",
    notesCount: 284
  }
];

// Helper to create offline Noise buffer
function createNoiseBuffer(ctx: BaseAudioContext, duration: number): AudioBuffer {
  const bufferSize = ctx.sampleRate * duration;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  return buffer;
}

// Low-latency Synthesized Sound Effect for Playback hits in game
export function playHitSFX(audioCtx: AudioContext, lane: number, isGood = true) {
  if (audioCtx.state === "suspended") {
    audioCtx.resume();
  }

  const time = audioCtx.currentTime;
  
  // Create synth chime
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  
  // Custom harmonic pitch based on lane numbers
  const frequencies = [261.63, 311.13, 392.00, 466.16]; // Pentatonic notes C4, Eb4, G4, Bb4
  const baseFreq = frequencies[lane % 4] * (isGood ? 1.5 : 0.8);
  
  osc.type = isGood ? "sine" : "triangle";
  osc.frequency.setValueAtTime(baseFreq, time);
  
  if (isGood) {
    // Elegant chime decay
    gain.gain.setValueAtTime(0.18, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.15);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(time);
    osc.stop(time + 0.16);
  } else {
    // Bad sound: minor buzzer
    osc.frequency.linearRampToValueAtTime(baseFreq * 0.5, time + 0.15);
    gain.gain.setValueAtTime(0.12, time);
    gain.gain.linearRampToValueAtTime(0.001, time + 0.16);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(time);
    osc.stop(time + 0.17);
  }
}

// Synthesis procedure for procedural audio compilation
export async function compileSongAudio(songId: string): Promise<{ audioBuffer: AudioBuffer; notes: GameNote[] }> {
  const song = SONGS.find((s) => s.id === songId) || SONGS[0];
  const sampleRate = 44100;
  
  // Calculate total steps
  // 1 beat = 60 / bpm seconds.
  // We use sixteenth-notes step sequencer grid layout.
  // 4 steps per beat.
  const secondsPerBeat = 60 / song.bpm;
  const stepDuration = secondsPerBeat / 4; // 1/16 note duration
  
  // Total measures based on metadata duration
  const beatsPerMeasure = 4;
  const stepsPerMeasure = beatsPerMeasure * 4; // 16 steps
  const totalBeats = (song.duration * song.bpm) / 60;
  const totalSteps = Math.ceil(totalBeats * 4);
  const totalDuration = totalSteps * stepDuration;
  
  const offlineCtx = new OfflineAudioContext(2, sampleRate * totalDuration, sampleRate);
  const noiseBuffer = createNoiseBuffer(offlineCtx, 1.0);
  
  const notes: GameNote[] = [];
  let noteCounter = 0;
  
  // Procedural Composition Logic per Song
  for (let step = 0; step < totalSteps; step++) {
    const time = step * stepDuration;
    
    // Avoid scheduling anything in the first measure (4 beats padding for countdown/preparation)
    const isIntro = step < 16;
    const isOutro = step > totalSteps - 16;
    
    // Grid alignment
    const measure = Math.floor(step / 16);
    const stepInMeasure = step % 16;
    const isKickStep = stepInMeasure % 4 === 0;
    const isSnareStep = stepInMeasure % 8 === 4;
    const isHiHatStep = stepInMeasure % 2 === 2;
    
    // Determine chord progression
    // Common progression: Am -> F -> C -> G
    let currentChordRoot = NOTES.A2;
    let currentScale = [NOTES.A3, NOTES.C4, NOTES.D4, NOTES.E4, NOTES.G4, NOTES.A4, NOTES.C5, NOTES.E5, NOTES.G5];
    
    const progIndex = Math.floor(measure / 2) % 4; // Changes every 2 measures
    if (songId === "chill_sunset") {
      // Warm C Major Lofi: Cmaj7 -> Am7 -> Fmaj7 -> G
      const chords = [NOTES.C3, NOTES.A2, NOTES.F2, NOTES.G2];
      currentChordRoot = chords[progIndex];
      currentScale = [NOTES.C4, NOTES.E4, NOTES.G4, NOTES.B4, NOTES.D5, NOTES.E5, NOTES.G5, NOTES.B5];
    } else if (songId === "neon_drive") {
      // driving Retro: Am -> G -> F -> E
      const chords = [NOTES.A2, NOTES.G2, NOTES.F2, NOTES.E2];
      currentChordRoot = chords[progIndex];
      currentScale = [NOTES.A3, NOTES.B3, NOTES.C4, NOTES.E4, NOTES.F4, NOTES.G4, NOTES.A4, NOTES.C5];
    } else {
      // Retro Chiptune: Am -> C -> G -> D
      const chords = [NOTES.A2, NOTES.C3, NOTES.G2, NOTES.D2];
      currentChordRoot = chords[progIndex];
      currentScale = [NOTES.A3, NOTES.C4, NOTES.D4, NOTES.E4, NOTES.G4, NOTES.A4, NOTES.C5, NOTES.D5, NOTES.E5];
    }
    
    // --- SYNTH THREAD 1: KICK DRUM ---
    if (isKickStep && !isOutro) {
      // Synthetic kick
      const kickOsc = offlineCtx.createOscillator();
      const kickGain = offlineCtx.createGain();
      kickOsc.type = "sine";
      
      // Decaying pitch from 150Hz to 45Hz
      kickOsc.frequency.setValueAtTime(150, time);
      kickOsc.frequency.exponentialRampToValueAtTime(45, time + 0.09);
      
      kickGain.gain.setValueAtTime(0.65, time);
      kickGain.gain.exponentialRampToValueAtTime(0.001, time + 0.12);
      
      kickOsc.connect(kickGain);
      kickGain.connect(offlineCtx.destination);
      kickOsc.start(time);
      kickOsc.stop(time + 0.13);
      
      // Spawn Game Note on Kick? Only for some patterns to prevent layout overloading
      if (!isIntro && (songId === "retro_chiptune" || (songId === "neon_drive" && step % 8 === 0) || (songId === "chill_sunset" && step % 16 === 0))) {
        notes.push({
          id: `note_${noteCounter++}`,
          time: time,
          lane: 0
        });
      }
    }
    
    // --- SYNTH THREAD 2: SNARE DRUM ---
    if (isSnareStep && !isIntro && !isOutro) {
      // Snare is composed of filtered white noise and a low sine body
      const snareNoise = offlineCtx.createBufferSource();
      snareNoise.buffer = noiseBuffer;
      
      const snareFilter = offlineCtx.createBiquadFilter();
      snareFilter.type = "bandpass";
      snareFilter.frequency.value = 1000;
      snareFilter.Q.value = 1.8;
      
      const snareGain = offlineCtx.createGain();
      snareGain.gain.setValueAtTime(0.24, time);
      snareGain.gain.exponentialRampToValueAtTime(0.001, time + 0.18);
      
      snareNoise.connect(snareFilter);
      snareFilter.connect(snareGain);
      snareGain.connect(offlineCtx.destination);
      snareNoise.start(time);
      snareNoise.stop(time + 0.20);
      
      // Snare fundamental body
      const snareOsc = offlineCtx.createOscillator();
      const snareOscGain = offlineCtx.createGain();
      snareOsc.type = "triangle";
      snareOsc.frequency.setValueAtTime(180, time);
      snareOsc.frequency.linearRampToValueAtTime(120, time + 0.08);
      
      snareOscGain.gain.setValueAtTime(0.18, time);
      snareOscGain.gain.exponentialRampToValueAtTime(0.001, time + 0.09);
      
      snareOsc.connect(snareOscGain);
      snareOscGain.connect(offlineCtx.destination);
      snareOsc.start(time);
      snareOsc.stop(time + 0.10);
      
      // Spawn Game Note on Snare for high energy rhythm!
      if (songId === "neon_drive" || songId === "retro_chiptune") {
        notes.push({
          id: `note_${noteCounter++}`,
          time: time,
          lane: 3
        });
      }
    }
    
    // --- SYNTH THREAD 3: HI-HAT ---
    if (isHiHatStep && !isIntro && !isOutro) {
      const hatSource = offlineCtx.createBufferSource();
      hatSource.buffer = noiseBuffer;
      
      const hatFilter = offlineCtx.createBiquadFilter();
      hatFilter.type = "highpass";
      hatFilter.frequency.value = 7500;
      
      const hatGain = offlineCtx.createGain();
      hatGain.gain.setValueAtTime(songId === "chill_sunset" ? 0.05 : 0.08, time);
      hatGain.gain.exponentialRampToValueAtTime(0.001, time + 0.04);
      
      hatSource.connect(hatFilter);
      hatFilter.connect(hatGain);
      hatGain.connect(offlineCtx.destination);
      hatSource.start(time);
      hatSource.stop(time + 0.05);

      // Play Hat Notes for high difficulty only
      if (songId === "retro_chiptune" && step % 8 === 2) {
        notes.push({
          id: `note_${noteCounter++}`,
          time: time,
          lane: 2
        });
      }
    }
    
    // --- SYNTH THREAD 4: BASSLINE ---
    // Bass plays rhythmic driving eighth notes
    const isBassStep = stepInMeasure % 2 === 0;
    if (isBassStep && !isOutro) {
      const bassOsc = offlineCtx.createOscillator();
      const bassGain = offlineCtx.createGain();
      const bassFilter = offlineCtx.createBiquadFilter();
      
      bassOsc.type = songId === "neon_drive" ? "sawtooth" : "triangle";
      
      // Play root frequency or fifth-degree highlight
      const baseFreq = currentChordRoot;
      const isFifth = stepInMeasure === 6 || stepInMeasure === 14;
      bassOsc.frequency.setValueAtTime(isFifth ? baseFreq * 1.5 : baseFreq, time);
      
      bassGain.gain.setValueAtTime(songId === "neon_drive" ? 0.12 : 0.18, time);
      bassGain.gain.exponentialRampToValueAtTime(0.001, time + stepDuration * 0.9);
      
      bassFilter.type = "lowpass";
      bassFilter.frequency.setValueAtTime(150, time);
      bassFilter.frequency.exponentialRampToValueAtTime(450, time + 0.05);
      
      bassOsc.connect(bassFilter);
      bassFilter.connect(bassGain);
      bassGain.connect(offlineCtx.destination);
      bassOsc.start(time);
      bassOsc.stop(time + stepDuration);
    }
    
    // --- SYNTH THREAD 5: CHORDS / ARPEGGIOTOR LEADS ---
    // Melodic notes triggering game notes
    // Easy: notes every 4 beats (step % 16 === 8) or simple melodies
    // Medium: notes every 2 beats
    // Hard: complex patterns
    
    let playMelody = false;
    let melodyNoteIndex = 0;
    
    if (songId === "chill_sunset") {
      // Play slow elegant chord notes
      // We trigger a note every 8 steps (half-measure)
      if (step % 8 === 4 && !isOutro) {
        playMelody = true;
        // Simple melodic progression
        const melodicSequence = [0, 2, 4, 3, 2, 4, 6, 5];
        melodyNoteIndex = melodicSequence[Math.floor(step / 8) % melodicSequence.length];
      }
    } else if (songId === "neon_drive") {
      // Play driving 80s riffs on eighth notes (step % 4 === 2 or and beat offsets)
      if ((step % 4 === 1 || step % 4 === 3) && !isIntro && !isOutro) {
        // Melodic loop
        const melodicSequence = [0, 2, 3, 4, 3, 5, 4, 2, 7, 5, 4, 3, 2, 1, 2, 0];
        melodyNoteIndex = melodicSequence[Math.floor(step / 2) % melodicSequence.length];
        // Only play 60% of steps to keep it breathing
        playMelody = (step * 7 + 13) % 10 < 6;
      }
    } else {
      // Chiptune fast arpeggio on sixteenth notes!
      if (!isIntro && !isOutro) {
        const arpeggioPattern = [0, 2, 4, 7, 9, 7, 4, 2];
        const measureProgress = step % 8;
        melodyNoteIndex = arpeggioPattern[measureProgress];
        
        // Rapid arpeggios play on almost every sixteenth note
        playMelody = true;
      }
    }
    
    if (playMelody) {
      const scaleDegreeFreq = currentScale[melodyNoteIndex % currentScale.length];
      
      const leadOsc = offlineCtx.createOscillator();
      const leadGain = offlineCtx.createGain();
      const leadDelay = offlineCtx.createDelay(0.3);
      const delayGain = offlineCtx.createGain();
      
      leadOsc.type = songId === "retro_chiptune" ? "square" : "sine";
      leadOsc.frequency.setValueAtTime(scaleDegreeFreq, time);
      
      // Vibrato effect
      const vibratoOsc = offlineCtx.createOscillator();
      const vibratoGain = offlineCtx.createGain();
      vibratoOsc.frequency.value = 8; // 8Hz
      vibratoGain.gain.value = scaleDegreeFreq * 0.01; // Vibrato width
      vibratoOsc.connect(vibratoGain);
      vibratoGain.connect(leadOsc.frequency);
      
      // Amplitude Envelope
      leadGain.gain.setValueAtTime(0.08, time);
      leadGain.gain.exponentialRampToValueAtTime(0.001, time + stepDuration * 1.8);
      
      // Delay (Echo) node simulation inside Offline Audio
      leadDelay.delayTime.setValueAtTime(stepDuration * 2, time);
      delayGain.gain.setValueAtTime(0.03, time);
      
      leadOsc.connect(leadGain);
      leadGain.connect(offlineCtx.destination);
      
      // Connect delay
      leadGain.connect(leadDelay);
      leadDelay.connect(delayGain);
      delayGain.connect(offlineCtx.destination);
      
      vibratoOsc.start(time);
      leadOsc.start(time);
      
      vibratoOsc.stop(time + stepDuration * 2.1);
      leadOsc.stop(time + stepDuration * 2.1);
      
      // Spawn Game Note corresponding with melody note in lanes 1 or 2!
      if (!isIntro) {
        // Map melody to central lanes 1 and 2
        const melodyLane = (melodyNoteIndex % 2) + 1; // 1 or 2
        
        // Throttling easy difficulty
        const shouldSpawnNote = 
          songId === "chill_sunset" ? (step % 16 === 4 || step % 16 === 12) :
          songId === "neon_drive" ? (step % 4 === 2) :
          (step % 3 !== 0); // Fast but has spaces
          
        if (shouldSpawnNote) {
          notes.push({
            id: `note_${noteCounter++}`,
            time: time,
            lane: melodyLane
          });
        }
      }
    }
  }
  
  // Render completed audio track
  const audioBuffer = await offlineCtx.startRendering();
  
  // Sort notes by timestamp is critical for processing
  const sortedNotes = notes.sort((a, b) => a.time - b.time);
  
  return {
    audioBuffer,
    notes: sortedNotes
  };
}
