import React, { useEffect, useRef, useState } from "react";
import { GameNote, Song, ScoreReport, JudgementType, JudgementIndicator, TapRipple } from "../types";
import { compileSongAudio, playHitSFX, SONGS } from "../utils/audioSynth";
import { Play, Pause, RotateCcw, Home, Music, Volume2, Sparkles, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface GamePlayProps {
  songId: string;
  noteSpeed: number;
  soundVolume: number;
  offsetMs: number;
  onSongEnd: (report: ScoreReport) => void;
  onExit: () => void;
}

const LANE_KEYS = ["D", "F", "J", "K"];
const LANE_COLORS = [
  "shadow-[0_0_20px_#38bdf8] border-[#38bdf8] text-[#38bdf8] bg-sky-950/20",
  "shadow-[0_0_20px_#f43f5e] border-[#f43f5e] text-[#f43f5e] bg-rose-950/20",
  "shadow-[0_0_20px_#a855f7] border-[#a855f7] text-[#a855f7] bg-violet-950/20",
  "shadow-[0_0_20px_#fb923c] border-[#fb923c] text-[#fb923c] bg-orange-950/20"
];

const NOTE_FILL_COLORS = [
  "from-sky-400 to-blue-500 shadow-sky-500/50",
  "from-rose-400 to-pink-500 shadow-rose-500/50",
  "from-violet-400 to-purple-500 shadow-violet-500/50",
  "from-orange-400 to-amber-500 shadow-orange-500/50"
];

const JUDGEMENT_COLORS: Record<string, string> = {
  Perfect: "text-[#38bdf8] drop-shadow-[0_0_6px_#38bdf8]",
  Great: "text-[#a855f7] drop-shadow-[0_0_6px_#a855f7]",
  Good: "text-[#fb923c] drop-shadow-[0_0_6px_#fb923c]",
  Miss: "text-rose-500 drop-shadow-[0_0_6px_rgb(239,68,68)]"
};

export default function GamePlay({
  songId,
  noteSpeed,
  soundVolume,
  offsetMs,
  onSongEnd,
  onExit
}: GamePlayProps) {
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // Audio Context and node tracking
  const audioCtxRef = useRef<AudioContext | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const audioBufferRef = useRef<AudioBuffer | null>(null);
  
  // Game states
  const [isPaused, setIsPaused] = useState(false);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [progress, setProgress] = useState(0);
  
  // Hit evaluation counters
  const perfectsRef = useRef(0);
  const greatsRef = useRef(0);
  const goodsRef = useRef(0);
  const missesRef = useRef(0);
  
  const [perfects, setPerfects] = useState(0);
  const [greats, setGreats] = useState(0);
  const [goods, setGoods] = useState(0);
  const [misses, setMisses] = useState(0);

  // Active floating indicators
  const [judgements, setJudgements] = useState<JudgementIndicator[]>([]);
  const [ripples, setRipples] = useState<TapRipple[]>([]);
  const [lanesActive, setLanesActive] = useState<boolean[]>([false, false, false, false]);

  // Rhythm tracking references
  const startTimeRef = useRef<number>(0);
  const pausedAtRef = useRef<number>(0);
  const playStartTimeRef = useRef<number>(0);
  const songTimeAtStartRef = useRef<number>(0);
  const liveNotesRef = useRef<GameNote[]>([]);
  const [songInfo, setSongInfo] = useState<Song | null>(null);
  
  // Canvas and game refs
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const comboRef = useRef(0);
  const scoreRef = useRef(0);
  const maxComboRef = useRef(0);
  const progressRef = useRef(0);
  const frameCountRef = useRef(0);
  const lanesActiveRef = useRef<boolean[]>([false, false, false, false]);
  const compiledNotesRef = useRef<GameNote[]>([]);

  // Track parameters for offset formula
  const animationFrameId = useRef<number | null>(null);
  const trackHeight = 500; //px height of the falling track
  const triggerBarY = 440; //px placement of judgement bar

  // Sync state/props with refs to prevent stale closure in animation loops
  const loadingRef = useRef(true);
  const isPausedRef = useRef(false);
  const songInfoRef = useRef<Song | null>(null);
  const noteSpeedRef = useRef(noteSpeed);
  const soundVolumeRef = useRef(soundVolume);
  const offsetMsRef = useRef(offsetMs);

  useEffect(() => {
    loadingRef.current = loading;
  }, [loading]);

  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  useEffect(() => {
    songInfoRef.current = songInfo;
  }, [songInfo]);

  useEffect(() => {
    noteSpeedRef.current = noteSpeed;
  }, [noteSpeed]);

  useEffect(() => {
    soundVolumeRef.current = soundVolume;
  }, [soundVolume]);

  useEffect(() => {
    offsetMsRef.current = offsetMs;
  }, [offsetMs]);

  // Safe Audio context and gain node constructor
  function initAudio() {
    try {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtxClass();
      audioCtxRef.current = ctx;

      const gainNode = ctx.createGain();
      gainNode.gain.setValueAtTime(soundVolume, ctx.currentTime);
      gainNode.connect(ctx.destination);
      gainNodeRef.current = gainNode;
      return ctx;
    } catch (e) {
      console.error("Failed to construct audio context:", e);
      throw e;
    }
  }

  useEffect(() => {
    // 1. Compile audio buffer and sync notes
    async function initTrack() {
      try {
        setLoading(true);
        const ctx = initAudio();

        // Generate audio data and map notes synchronously
        const data = await compileSongAudio(songId);
        audioBufferRef.current = data.audioBuffer;
        compiledNotesRef.current = data.notes.map(n => ({ ...n }));
        liveNotesRef.current = data.notes.map(n => ({ ...n })); // deep-ish clone

        // Retrieve song metadata
        const matched = requireSongMetadata(songId);
        setSongInfo(matched);

        setLoading(false);
        // Start playing immediately!
        startPerformance(data.audioBuffer, liveNotesRef.current);
      } catch (err: any) {
        console.error("Audio synthesis failed:", err);
        setErrorMsg("シンセサイザー音源の初期化に失敗しました。ページを再読み込みしてください。");
        setLoading(false);
      }
    }

    initTrack();

    return () => {
      // Cleanup Audio and Handlers
      stopPerformance();
    };
  }, [songId]);

  // Adjust volume dynamically during play if changed in settings
  useEffect(() => {
    if (gainNodeRef.current && audioCtxRef.current) {
      gainNodeRef.current.gain.setValueAtTime(soundVolume, audioCtxRef.current.currentTime);
    }
  }, [soundVolume]);

  function requireSongMetadata(id: string): Song {
    return SONGS.find((s: Song) => s.id === id) || SONGS[0];
  }

  // Launch audio playback
  function startPerformance(buffer: AudioBuffer, notes: GameNote[]) {
    if (!audioCtxRef.current) return;

    // Create custom node
    const source = audioCtxRef.current.createBufferSource();
    source.buffer = buffer;
    source.connect(gainNodeRef.current!);
    
    // Set parameters
    const runStartLocalTime = audioCtxRef.current.currentTime;
    startTimeRef.current = runStartLocalTime;
    pausedAtRef.current = 0;
    
    source.start(0);
    sourceNodeRef.current = source;

    // HIGH PRECISION TIME INITIALIZATION
    playStartTimeRef.current = performance.now();
    songTimeAtStartRef.current = 0;

    // Begin visual game engine loop
    animationFrameId.current = requestAnimationFrame(gameLoop);
  }

  function stopPerformance() {
    if (sourceNodeRef.current) {
      try {
        sourceNodeRef.current.stop();
      } catch (e) {}
    }
    if (animationFrameId.current) {
      cancelAnimationFrame(animationFrameId.current);
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {});
    }
  }

  // Get current play offset position in seconds (with latencies calibration shift)
  function getCurrentMusicTime(): number {
    if (loadingRef.current || isPausedRef.current) {
      return pausedAtRef.current - (offsetMsRef.current / 1000);
    }
    // High performance elapsed seconds
    const elapsedMs = performance.now() - playStartTimeRef.current;
    const elapsedSec = elapsedMs / 1000;
    const songTime = songTimeAtStartRef.current + elapsedSec;
    return songTime - (offsetMsRef.current / 1000);
  }

  // Draw board artifacts and falling elements directly onto high performance canvas
  const drawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.clientWidth;
    const height = canvas.clientHeight;

    const dpr = window.devicePixelRatio || 1;
    if (canvas.width !== Math.floor(width * dpr) || canvas.height !== Math.floor(height * dpr)) {
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
    }

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);

    const laneWidth = width / 4;
    // Align with trigger bar position near the bottom of canvas
    const triggerY = height - 80;

    // 1. Draw Lane divider boundaries
    ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
    ctx.lineWidth = 1;
    for (let i = 1; i < 4; i++) {
      ctx.beginPath();
      ctx.moveTo(i * laneWidth, 0);
      ctx.lineTo(i * laneWidth, height);
      ctx.stroke();
    }

    // 2. Draw Lane flasher press signals
    for (let i = 0; i < 4; i++) {
      if (lanesActiveRef.current[i]) {
        const gradient = ctx.createLinearGradient(i * laneWidth, height, i * laneWidth, 0);
        let flashColor = "rgba(6, 182, 212, 0.12)";
        if (i === 1) flashColor = "rgba(244, 63, 94, 0.12)";
        if (i === 2) flashColor = "rgba(168, 85, 247, 0.12)";
        if (i === 3) flashColor = "rgba(251, 146, 60, 0.12)";

        gradient.addColorStop(0, flashColor);
        gradient.addColorStop(1, "rgba(0, 0, 0, 0)");
        
        ctx.fillStyle = gradient;
        ctx.fillRect(i * laneWidth, 0, laneWidth, height);
      }
    }

    // 3. Draw key receptor circle guides (Target Rings)
    for (let laneIdx = 0; laneIdx < 4; laneIdx++) {
      const centerX = (laneIdx * laneWidth) + (laneWidth / 2);
      const isActive = lanesActiveRef.current[laneIdx];

      if (isActive) {
        ctx.shadowBlur = 20;
        const glowColors = ["#22d3ee", "#f43f5e", "#e879f9", "#fb923c"];
        ctx.shadowColor = glowColors[laneIdx];
      } else {
        ctx.shadowBlur = 0;
      }

      ctx.fillStyle = isActive ? "rgba(255, 255, 255, 0.08)" : "rgba(255, 255, 255, 0.03)";
      ctx.strokeStyle = isActive ? "rgba(255, 255, 255, 0.85)" : "rgba(255, 255, 255, 0.15)";
      ctx.lineWidth = 2;

      ctx.beginPath();
      ctx.arc(centerX, triggerY, 24, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.shadowBlur = 0;

      // Inner thin target line
      ctx.strokeStyle = isActive ? "rgba(255, 255, 255, 0.9)" : "rgba(255, 255, 255, 0.25)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(centerX, triggerY, 14, 0, Math.PI * 2);
      ctx.stroke();

      // Keyboard binds
      ctx.fillStyle = isActive ? "#ffffff" : "rgba(255, 255, 255, 0.4)";
      ctx.font = "bold 11px Inter, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(LANE_KEYS[laneIdx], centerX, triggerY);
    }

    // 4. Draw game notes falling down
    const curTime = getCurrentMusicTime();
    const notesArray = liveNotesRef.current;
    
    const noteHeight = 15;
    const noteWidth = laneWidth * 0.88;
    const noteMarginX = (laneWidth - noteWidth) / 2;

    for (let i = 0; i < notesArray.length; i++) {
      const note = notesArray[i];
      if (note.hit) continue;

      const relativeTime = note.time - curTime;
      // Filter out notes rendering outside view boundaries
      if (relativeTime > 1.5 || relativeTime < -0.15) {
        continue;
      }

      const speedMultiplier = 140 * noteSpeedRef.current;
      const visualY = (triggerY - (noteHeight / 2)) - (relativeTime * speedMultiplier);
      const visualX = (note.lane * laneWidth) + noteMarginX;

      const gradient = ctx.createLinearGradient(visualX, visualY, visualX + noteWidth, visualY);
      const noteColors = [
        ["#22d3ee", "#0284c7"], // cyan
        ["#fb7185", "#db2777"], // rose
        ["#c084fc", "#7c3aed"], // purple
        ["#fb923c", "#ea580c"]  // orange
      ];
      gradient.addColorStop(0, noteColors[note.lane % 4][0]);
      gradient.addColorStop(1, noteColors[note.lane % 4][1]);

      ctx.fillStyle = gradient;
      ctx.beginPath();
      if (ctx.roundRect) {
        ctx.roundRect(visualX, visualY, noteWidth, noteHeight, 5);
      } else {
        ctx.rect(visualX, visualY, noteWidth, noteHeight);
      }
      ctx.fill();

      // Glass shine topper highlight
      ctx.fillStyle = "rgba(255, 255, 255, 0.35)";
      ctx.beginPath();
      if (ctx.roundRect) {
        ctx.roundRect(visualX + 3, visualY + 1.5, noteWidth - 6, 2.5, 1);
      } else {
        ctx.rect(visualX + 3, visualY + 1.5, noteWidth - 6, 2.5);
      }
      ctx.fill();
    }

    ctx.restore();
  };

  // The main Game Engine tick loop
  function gameLoop() {
    if (!audioCtxRef.current) return;

    // Schedule next frame immediately so the loop never dies
    animationFrameId.current = requestAnimationFrame(gameLoop);

    if (isPausedRef.current || loadingRef.current || !songInfoRef.current) {
      drawCanvas();
      return;
    }

    const curTime = getCurrentMusicTime();
    const notesArray = liveNotesRef.current;

    // Scan for unhit notes that slipped past the judgement bar (Auto-Miss)
    let missedAny = false;
    for (let i = 0; i < notesArray.length; i++) {
      const note = notesArray[i];
      if (!note.hit && curTime - note.time > 0.150) {
        // Mark as hit/expired so we only miss once
        note.hit = true;
        
        missesRef.current += 1;
        setMisses(missesRef.current);
        comboRef.current = 0;
        setCombo(0);
        missedAny = true;

        triggerJudgementIndicator("Miss");
        playHitSFX(audioCtxRef.current, note.lane, false);
      }
    }

    // Song progress bar estimation
    const dur = audioBufferRef.current?.duration || (songInfoRef.current ? songInfoRef.current.duration : 0);
    const progressPercent = Math.min(100, (curTime / dur) * 100);
    
    frameCountRef.current += 1;
    if (frameCountRef.current % 10 === 0) {
      setProgress(progressPercent);
    }

    // End condition detection
    if (curTime >= dur + 1.2) {
      triggerSongCompletion();
      return;
    }

    // High performance visual draw frame
    drawCanvas();
  }

  // Score report calculations
  function triggerSongCompletion() {
    stopPerformance();
    
    const finalScore = score;
    const finalCombo = maxCombo;
    const totalPossibleNotes = liveNotesRef.current.length;
    
    // Accuracy = (Perfect*1.0 + Great*0.8 + Good*0.5) / TotalNotes
    const weightedHits = (perfectsRef.current * 1.0) + (greatsRef.current * 0.8) + (goodsRef.current * 0.5);
    const accuracy = totalPossibleNotes > 0 ? (weightedHits / totalPossibleNotes) * 100 : 0;
    
    // Grading rank system
    let gradingRank: "S" | "A" | "B" | "C" | "F" = "F";
    if (accuracy >= 95) gradingRank = "S";
    else if (accuracy >= 85) gradingRank = "A";
    else if (accuracy >= 75) gradingRank = "B";
    else if (accuracy >= 60) gradingRank = "C";

    onSongEnd({
      songId,
      score: finalScore,
      accuracy: Math.round(accuracy * 100) / 100,
      maxCombo: finalCombo,
      perfects: perfectsRef.current,
      greats: greatsRef.current,
      goods: goodsRef.current,
      misses: missesRef.current,
      rank: gradingRank
    });
  }

  // floating visual text triggers
  function triggerJudgementIndicator(type: JudgementType) {
    const freshId = Math.random().toString(36).substr(2, 9);
    setJudgements(prev => [{ id: freshId, type, x: (Math.random() - 0.5) * 20 }, ...prev.slice(0, 5)]);
    
    // Evict indicator after brief delay
    setTimeout(() => {
      setJudgements(prev => prev.filter(j => j.id !== freshId));
    }, 600);
  }

  // Tapping lane interaction
  function handleLaneTap(laneIdx: number) {
    if (isPaused || loading || !audioCtxRef.current) return;

    // Flash key visual indicators in ref and state
    lanesActiveRef.current[laneIdx] = true;
    setLanesActive([...lanesActiveRef.current]);

    setTimeout(() => {
      lanesActiveRef.current[laneIdx] = false;
      setLanesActive([...lanesActiveRef.current]);
    }, 100);

    // Create a beautiful circular tap ripple on the keycap
    const ripId = Math.random().toString(36).substr(2, 9);
    setRipples(prev => [...prev, { id: ripId, lane: laneIdx }]);
    setTimeout(() => {
      setRipples(prev => prev.filter(r => r.id !== ripId));
    }, 400);

    const currentTime = getCurrentMusicTime();
    
    // Scan for closest unhit note in matching lane
    const notesInLane = liveNotesRef.current.filter(n => n.lane === laneIdx && !n.hit);
    if (notesInLane.length === 0) {
      // Empty lane tap (optional chime for feedback)
      playHitSFX(audioCtxRef.current, laneIdx, true);
      return;
    }

    const nearestNote = notesInLane[0];
    const diff = nearestNote.time - currentTime;
    const absDiff = Math.abs(diff);

    // Hit evaluation thresholds (150ms hit envelope)
    if (absDiff <= 0.150) {
      nearestNote.hit = true;
      
      let scoreAdd = 0;
      let judge: JudgementType = "Good";

      if (absDiff <= 0.045) {
        judge = "Perfect";
        scoreAdd = 100;
        perfectsRef.current += 1;
        setPerfects(perfectsRef.current);
      } else if (absDiff <= 0.090) {
        judge = "Great";
        scoreAdd = 80;
        greatsRef.current += 1;
        setGreats(greatsRef.current);
      } else {
        judge = "Good";
        scoreAdd = 50;
        goodsRef.current += 1;
        setGoods(goodsRef.current);
      }

      // Combo scale multipliers
      comboRef.current += 1;
      const newCombo = comboRef.current;
      setCombo(newCombo);
      if (newCombo > maxComboRef.current) {
        maxComboRef.current = newCombo;
        setMaxCombo(newCombo);
      }

      const comboMultiplier = Math.min(4, 1 + Math.floor(newCombo / 15));
      const finalAward = scoreAdd * comboMultiplier;
      scoreRef.current += finalAward;
      setScore(scoreRef.current);

      triggerJudgementIndicator(judge);
      playHitSFX(audioCtxRef.current, laneIdx, true);
    } else {
      // Tapped too early! We can ignore to allow casual chimes or penalize if needed.
    }
  }

  // Keyboard bindings listener
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.repeat) return; // Prevent keyholding repeat triggers
      const pressedKey = e.key.toUpperCase();
      const laneIdx = LANE_KEYS.indexOf(pressedKey);
      if (laneIdx !== -1) {
        // Prevent browser scrolling and trigger lane tap
        e.preventDefault();
        handleLaneTap(laneIdx);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [loading, isPaused]);

  // Handle game pausing
  function togglePause() {
    if (!audioCtxRef.current || loading) return;

    if (isPaused) {
      // RESUME
      const audioCtx = audioCtxRef.current;
      if (audioCtx.state === "suspended") {
        audioCtx.resume();
      }

      // Recreate and start buffer source from precise position
      const source = audioCtx.createBufferSource();
      source.buffer = audioBufferRef.current;
      source.connect(gainNodeRef.current!);
      
      const pausedAt = pausedAtRef.current;
      source.start(0, pausedAt);
      sourceNodeRef.current = source;
      
      startTimeRef.current = audioCtx.currentTime - pausedAt;
      setIsPaused(false);
      
      // HIGH PRECISION RESUME
      playStartTimeRef.current = performance.now();
      songTimeAtStartRef.current = pausedAt;

      // Resume engine loop ticks
      animationFrameId.current = requestAnimationFrame(gameLoop);
    } else {
      // PAUSE
      if (sourceNodeRef.current) {
        try {
          sourceNodeRef.current.stop();
        } catch (e) {}
      }
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }

      // Save paused offset timestamp
      const elapsedMs = performance.now() - playStartTimeRef.current;
      const pausedAt = songTimeAtStartRef.current + (elapsedMs / 1000);
      pausedAtRef.current = pausedAt;
      setIsPaused(true);
    }
  }

  function handleReplay() {
    stopPerformance();
    
    // Reset stats
    comboRef.current = 0;
    scoreRef.current = 0;
    maxComboRef.current = 0;
    progressRef.current = 0;
    frameCountRef.current = 0;
    perfectsRef.current = 0;
    greatsRef.current = 0;
    goodsRef.current = 0;
    missesRef.current = 0;
    lanesActiveRef.current = [false, false, false, false];

    setScore(0);
    setCombo(0);
    setMaxCombo(0);
    setPerfects(0);
    setGreats(0);
    setGoods(0);
    setMisses(0);
    setProgress(0);
    setJudgements([]);
    setRipples([]);
    setIsPaused(false);

    // Recreate a fresh, active AudioContext
    const ctx = initAudio();

    if (audioBufferRef.current && compiledNotesRef.current.length > 0) {
      // Instant reload!
      liveNotesRef.current = compiledNotesRef.current.map(n => ({ ...n, hit: false }));
      
      // HIGH PRECISION TIME RESET
      playStartTimeRef.current = performance.now();
      songTimeAtStartRef.current = 0;

      startPerformance(audioBufferRef.current, liveNotesRef.current);
    } else {
      // Fallback compile
      compileSongAudio(songId).then(data => {
        audioBufferRef.current = data.audioBuffer;
        compiledNotesRef.current = data.notes.map(n => ({ ...n }));
        liveNotesRef.current = data.notes.map(n => ({ ...n }));
        
        playStartTimeRef.current = performance.now();
        songTimeAtStartRef.current = 0;

        startPerformance(data.audioBuffer, liveNotesRef.current);
      });
    }
  }

  const musicTime = getCurrentMusicTime();

  return (
    <div className="w-full flex-1 flex flex-col justify-start items-center bg-neutral-950 text-white font-sans select-none overflow-hidden relative min-h-screen">
      
      {/* Loading Overlay */}
      {loading && (
        <div className="absolute inset-0 bg-neutral-950 flex flex-col items-center justify-center gap-4 z-50 text-center px-4">
          <div className="w-12 h-12 rounded border-2 border-dashed border-cyan-400 animate-spin flex items-center justify-center font-bold text-cyan-400">R</div>
          <h2 className="text-sm font-semibold tracking-widest text-cyan-400 uppercase font-mono">
            シンセサイザートラック構築中...
          </h2>
          <p className="text-white/40 text-[10px] font-mono max-w-xs leading-relaxed">
            リアルタイム音源バッファオシレータを設定中。低レイテンシー音声トリガーを最適化しています...
          </p>
        </div>
      )}

      {/* Error Boundary Screen */}
      {errorMsg && (
        <div className="absolute inset-0 bg-neutral-950 flex flex-col items-center justify-center gap-6 z-50 text-center px-8">
          <div className="w-16 h-16 rounded-full border border-rose-500/30 flex items-center justify-center bg-rose-950/20 text-rose-500 font-mono text-3xl font-extrabold">エラー</div>
          <h2 className="text-sm uppercase tracking-wider text-rose-400">{errorMsg}</h2>
          <button
            onClick={onExit}
            className="px-6 py-2 border border-white/20 rounded hover:bg-white/5 text-xs font-bold uppercase transition-colors flex items-center gap-2"
          >
            <Home className="w-4 h-4" /> 曲選択に戻る
          </button>
        </div>
      )}

      {!loading && songInfo && (
        <div className="w-full max-w-[1200px] flex-1 flex flex-col min-h-screen">
          {/* Top Navigation / Song Header */}
          <header className="h-16 border-b border-white/10 flex items-center justify-between px-4 sm:px-8 bg-neutral-900 shrink-0">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-600 rounded flex items-center justify-center font-bold text-lg italic shadow-lg shadow-cyan-500/20 select-none">
                {songInfo.title.substring(0, 1)}
              </div>
              <div>
                <h1 className="text-xs sm:text-sm font-semibold tracking-wide uppercase text-white/90 line-clamp-1">{songInfo.title}</h1>
                <p className="text-[10px] text-cyan-400 font-mono uppercase tracking-widest">
                  BPM: {songInfo.bpm} // 曲の長さ: {songInfo.duration}秒
                </p>
              </div>
            </div>

            {/* Middle progress metric bar */}
            <div className="hidden md:flex flex-col items-end">
              <div className="text-[10px] text-white/50 uppercase font-bold tracking-widest">進行度</div>
              <div className="w-64 h-1.5 bg-white/10 rounded-full mt-1 overflow-hidden">
                <div 
                  className="h-full bg-cyan-400 shadow-[0_0_8px_#22d3ee] transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            {/* Right category action labels */}
            <div className="flex items-center gap-3 sm:gap-6">
              <div className="text-right">
                <div className="text-[9px] text-white/40 uppercase font-bold">難易度</div>
                <div className="text-xs sm:text-sm font-black text-rose-500 italic uppercase">
                  {songInfo.difficulty === "Easy" ? "初級" : songInfo.difficulty === "Medium" ? "中級" : songInfo.difficulty === "Hard" ? "上級" : "極級"} LV.{(songInfo.notesCount / 7).toFixed(0)}
                </div>
              </div>
              <div className="w-px h-8 bg-white/10 hidden sm:block"></div>
              <button 
                onClick={togglePause}
                className="px-3 py-1.5 border border-white/20 rounded hover:bg-white/5 text-[10px] font-bold uppercase transition-colors text-slate-200"
              >
                {isPaused ? "再開" : "一時停止"}
              </button>
            </div>
          </header>

          {/* Main 3-column Layout structure */}
          <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-0 bg-neutral-950">
            
            {/* LEFT SIDEBAR: Real-time Stats */}
            <aside className="w-full md:w-64 border-b md:border-b-0 md:border-r border-white/5 bg-black/40 p-4 flex flex-row md:flex-col gap-4 overflow-y-auto shrink-0 md:justify-start justify-between items-center md:items-stretch">
              
              {/* Score Breakdown Section */}
              <section className="p-3 bg-white/5 rounded-lg border border-white/10 w-full max-w-[280px] md:max-w-none">
                <h3 className="text-[10px] font-bold text-cyan-400 uppercase tracking-tighter mb-2">判定結果内訳</h3>
                <div className="space-y-1.5 font-mono">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-cyan-300">PERFECT</span>
                    <span className="text-white font-semibold">{perfects}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-emerald-400 font-medium">GREAT</span>
                    <span className="text-white/80">{greats}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs text-slate-400">
                    <span className="text-amber-400">GOOD</span>
                    <span className="text-white/60">{goods}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs text-slate-500">
                    <span className="text-rose-500">MISS</span>
                    <span className="text-white/40">{misses}</span>
                  </div>
                </div>
              </section>

              {/* Combo Center Counter */}
              <section className="flex flex-col justify-center items-center gap-1.5 py-2">
                <div className="text-[9px] font-bold text-white/30 uppercase tracking-[0.2em]">現在のコンボ数</div>
                <div className="text-5xl md:text-7xl font-black italic text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.45)] leading-none">
                  {combo}
                </div>
                {maxCombo > 0 && (
                  <div className="text-[9px] font-bold text-cyan-400 uppercase tracking-widest bg-cyan-400/10 px-2.5 py-0.5 rounded">
                    最大コンボ数: {maxCombo}
                  </div>
                )}
              </section>

              {/* Live Signal Gauge indicator bar */}
              <section className="p-3 bg-white/5 rounded-lg border border-white/10 mt-auto hidden md:block">
                <div className="flex justify-between text-[9px] font-bold text-white/50 mb-1.5 font-mono">
                  <span>ライブ同調インジケータ</span>
                  <span>{combo > 30 ? "MAX" : "同期中"}</span>
                </div>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((segment) => {
                    const threshold = (segment - 1) * 8;
                    const isActive = combo >= threshold;
                    return (
                      <div 
                        key={segment}
                        className={`h-4 flex-1 rounded-sm transition-all duration-300 ${
                          isActive 
                            ? "bg-cyan-500 shadow-[0_0_10px_#06b6d4]" 
                            : "bg-cyan-500/10 border border-white/5"
                        }`}
                      />
                    );
                  })}
                </div>
              </section>
            </aside>

            {/* CENTER: The main scrolling note track board */}
            <section className="flex-1 relative flex justify-center items-stretch bg-gradient-to-b from-black to-neutral-900 overflow-hidden min-h-[480px]">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(6,182,212,0.04)_0%,transparent_70%)] pointer-events-none" />

              {/* Target playable board column */}
              <div className="w-full max-w-[440px] h-full flex flex-col justify-end relative border-x border-white/10 bg-neutral-950/25 overflow-hidden">
                
                {/* Perspective depth helper lines */}
                <div className="absolute inset-0 bg-gradient-to-t from-cyan-900/10 via-transparent to-transparent pointer-events-none" />
                
                {/* High performance Canvas Drawing Layer */}
                <canvas
                  ref={canvasRef}
                  className="absolute inset-0 w-full h-full pointer-events-none z-10"
                />

                {/* FLOATING ACTION RESULT JUDGMENTS TEXT */}
                <div className="absolute bottom-48 left-1/2 -translate-x-1/2 text-center pointer-events-none z-20">
                  <AnimatePresence mode="popLayout">
                    {judgements.slice(0, 1).map((j) => (
                      <motion.div
                        key={j.id}
                        initial={{ opacity: 0, scale: 0.65, y: 15 }}
                        animate={{ opacity: 1, scale: 1.25, y: 0 }}
                        exit={{ opacity: 0, scale: 0.85, y: -25 }}
                        className={`text-3xl font-black italic tracking-tighter uppercase drop-shadow-[0_0_10px_#fff] ${
                          j.type === "Perfect" ? "text-cyan-400" :
                          j.type === "Great" ? "text-fuchsia-400" :
                          j.type === "Good" ? "text-amber-400" : "text-rose-500"
                        }`}
                        style={{ transform: `translateX(${j.x}px)` }}
                      >
                        {j.type}
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>

                {/* BOTTOM COMPACT HIT ACTION MAP BUTTONS */}
                <div className="h-16 bg-neutral-900 border-t border-white/10 grid grid-cols-4 select-none shrink-0 z-30">
                  {[0, 1, 2, 3].map((laneIdx) => {
                    const isActive = lanesActive[laneIdx];
                    const rippleColorClass = 
                      laneIdx === 0 ? "bg-cyan-500/20" :
                      laneIdx === 1 ? "bg-rose-500/20" :
                      laneIdx === 2 ? "bg-fuchsia-500/20" :
                      "bg-amber-500/20";
                    return (
                      <div
                        key={laneIdx}
                        onTouchStart={(e) => { e.preventDefault(); handleLaneTap(laneIdx); }}
                        onMouseDown={(e) => { e.preventDefault(); handleLaneTap(laneIdx); }}
                        className={`relative flex flex-col items-center justify-center border-r border-white/5 last:border-r-0 cursor-pointer overflow-hidden select-none transition-all duration-75 ${
                          isActive ? rippleColorClass + " active:scale-95" : "bg-black/20 hover:bg-white/5"
                        }`}
                        style={{ WebkitTapHighlightColor: "transparent" }}
                      >
                        {/* Dynamic ripple rings */}
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          {ripples.filter(r => r.lane === laneIdx).map(r => (
                            <motion.div
                              key={r.id}
                              initial={{ scale: 0.1, opacity: 0.8 }}
                              animate={{ scale: 2.5, opacity: 0 }}
                              className="w-14 h-14 rounded-full border border-white absolute"
                            />
                          ))}
                        </div>

                        <span className={`text-sm font-black font-mono tracking-wider ${isActive ? "text-white scale-110" : "text-white/40"}`}>
                          {LANE_KEYS[laneIdx]}
                        </span>
                        <span className="text-[7px] text-white/20 font-bold uppercase tracking-widest mt-0.5">レーン {laneIdx + 1}</span>
                      </div>
                    );
                  })}
                </div>

              </div>
            </section>

            {/* RIGHT SIDEBAR: Score & Settings Live widgets */}
            <aside className="w-full md:w-64 border-t md:border-t-0 md:border-l border-white/5 bg-black/40 p-4 flex flex-row md:flex-col gap-6 overflow-y-auto shrink-0 justify-between md:justify-start items-center md:items-stretch">
              
              {/* Score Display Card */}
              <section className="text-right flex flex-col gap-1 w-full max-w-[200px] md:max-w-none">
                <div className="text-[10px] font-bold text-white/40 uppercase tracking-widest font-mono">トータルスコア</div>
                <div className="text-2xl sm:text-4xl font-mono font-black text-white tracking-wider leading-none">
                  {score.toString().padStart(9, "0")}
                </div>
                <div className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest mt-1">
                  現在の正確度: {
                    ((perfects * 1.0 + greats * 0.8 + goods * 0.5) / Math.max(1, perfects + greats + goods + misses) * 100).toFixed(1)
                  }%
                </div>
              </section>

              {/* Status parameters container */}
              <div className="flex-1 flex md:flex-col gap-4 w-full justify-end md:justify-start items-stretch">
                <section className="p-3 bg-white/5 rounded-lg border border-white/10 hidden sm:block flex-1 md:flex-initial">
                  <h3 className="text-[10px] font-bold text-white/50 uppercase mb-3">ライブ設定パラメーター</h3>
                  <div className="space-y-3 font-mono">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-white/70 font-sans text-[10px]">ノーツ落下速度</span>
                      <span className="text-cyan-400 font-bold">{noteSpeed.toFixed(1)}x</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-white/70 font-sans text-[10px]">音声判定遅延調整</span>
                      <span className="text-cyan-400 font-bold">{offsetMs} ms</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-white/70 font-sans text-[10px]">音量レベル</span>
                      <span className="text-cyan-400 font-bold">{Math.round(soundVolume * 100)}%</span>
                    </div>
                  </div>
                </section>

                <section className="p-3 bg-white/5 rounded-lg border border-white/10 hidden md:block">
                  <h3 className="text-[10px] font-bold text-white/50 uppercase mb-2 font-mono">使用機材ステート</h3>
                  <div className="flex gap-2.5 items-center">
                    <div className="w-8 h-8 bg-neutral-800 rounded border border-white/10 flex items-center justify-center text-xs">⭐</div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[9px] font-bold uppercase tracking-wide text-white/90 truncate">プリズムブレード V1</div>
                      <div className="h-1 w-full bg-white/10 rounded-full mt-1.5 overflow-hidden">
                        <div className="w-full h-full bg-amber-400" />
                      </div>
                    </div>
                  </div>
                </section>
              </div>

              {/* Exit/Replay Quick Action footer buttons */}
              <div className="flex flex-col gap-2 shrink-0 w-full max-w-[150px] md:max-w-none justify-center">
                <button 
                  onClick={handleReplay}
                  className="w-full py-2 bg-white text-black font-black text-xs uppercase tracking-widest rounded hover:bg-neutral-200 transition-colors pointer-events-auto"
                >
                  もう一度遊ぶ
                </button>
                <button 
                  onClick={onExit}
                  className="w-full py-2 border border-white/20 text-white font-black text-xs uppercase tracking-widest rounded hover:bg-white/5 transition-colors pointer-events-auto"
                >
                  途中終了する
                </button>
              </div>

            </aside>

          </div>

          {/* Bottom Bar: Controller mapping */}
          <footer className="h-10 border-t border-white/10 bg-neutral-900 flex items-center px-4 sm:px-8 justify-between text-[9px] font-bold text-white/40 tracking-widest uppercase shrink-0 font-mono">
            <div className="flex gap-4 sm:gap-8">
              <div className="flex gap-1.5 items-center">
                <span className="px-1 bg-white/10 rounded text-white text-[10px] py-0.2">D</span>
                <span className="hidden sm:inline">レーン 1</span>
              </div>
              <div className="flex gap-1.5 items-center">
                <span className="px-1 bg-white/10 rounded text-white text-[10px] py-0.2">F</span>
                <span className="hidden sm:inline">レーン 2</span>
              </div>
              <div className="flex gap-1.5 items-center">
                <span className="px-1 bg-white/10 rounded text-white text-[10px] py-0.2">J</span>
                <span className="hidden sm:inline">レーン 3</span>
              </div>
              <div className="flex gap-1.5 items-center">
                <span className="px-1 bg-white/10 rounded text-white text-[10px] py-0.2">K</span>
                <span className="hidden sm:inline">レーン 4</span>
              </div>
            </div>
            <div>VER 1.1.0 // アーケード筐体ビルド</div>
          </footer>
        </div>
      )}

      {/* Paused State Overlays */}
      {isPaused && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-md flex flex-col justify-center items-center gap-6 z-40 text-center px-4">
          <div className="p-4 rounded-full border border-white/10 bg-neutral-900 font-mono text-xs uppercase text-cyan-400 tracking-wider">
            システム一時停止中
          </div>
          <div>
            <h2 className="text-xl md:text-2xl font-black italic tracking-widest text-white uppercase font-sans">一時停止中</h2>
            <p className="text-[11px] text-white/40 mt-1.5 max-w-xs font-sans">
              システムは待機中です。再開キーを押して、プレイを続行してください。
            </p>
          </div>
          
          <div className="flex flex-col gap-2 w-full max-w-[240px]">
            <button
              onClick={togglePause}
              className="w-full py-3 bg-white text-black font-black text-xs uppercase tracking-widest rounded hover:bg-neutral-200 transition-all font-sans shadow-lg"
            >
              プレイを再開する
            </button>
            <button
              onClick={handleReplay}
              className="w-full py-3 border border-white/20 text-white font-black text-xs uppercase tracking-widest rounded hover:bg-white/5 transition-all font-sans"
            >
              最初からやり直す
            </button>
            <button
              onClick={onExit}
              className="w-full py-3 text-white/40 hover:text-white/80 font-black text-xs uppercase tracking-widest font-sans transition-all"
            >
              曲選択に戻る
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
