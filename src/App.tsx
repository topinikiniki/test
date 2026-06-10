import React, { useState, useEffect } from "react";
import { UserStats, ScoreReport, PlayRank } from "./types";
import SongSelect from "./components/SongSelect";
import GamePlay from "./components/GamePlay";
import GameResults from "./components/GameResults";
import { Music, Award, HelpCircle } from "lucide-react";

export default function App() {
  const [gameState, setGameState] = useState<"START_MENU" | "PLAYING" | "RESULTS">("START_MENU");
  const [currentSongId, setCurrentSongId] = useState<string | null>(null);
  
  // Custom game configurations
  const [noteSpeed, setNoteSpeed] = useState<number>(3.0);
  const [soundVolume, setSoundVolume] = useState<number>(0.5);
  const [offsetMs, setOffsetMs] = useState<number>(0);
  
  // Performance report state
  const [liveReport, setLiveReport] = useState<ScoreReport | null>(null);
  const [oldHighScore, setOldHighScore] = useState<number>(0);

  // Persistence management
  const [userStats, setUserStats] = useState<UserStats>({
    highScores: {},
    maxCombos: {},
    ranks: {}
  });

  // Load stats from localStorage at mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem("tap_rhythm_stats");
      if (stored) {
        setUserStats(JSON.parse(stored));
      }
    } catch (e) {
      console.warn("Could not load user stats:", e);
    }
  }, []);

  // Handle single song selection trigger
  function handleSelectSong(songId: string) {
    setCurrentSongId(songId);
    setGameState("PLAYING");
  }

  // Handle song run completions
  function handleSongEnd(report: ScoreReport) {
    setLiveReport(report);
    
    // Save stats & record-holding checking
    const previousHighScore = userStats.highScores[report.songId] || 0;
    const previousMaxCombo = userStats.maxCombos[report.songId] || 0;
    const previousRank = userStats.ranks[report.songId] || "F";
    
    setOldHighScore(previousHighScore);

    const isScoreNew = report.score > previousHighScore;
    const isComboNew = report.maxCombo > previousMaxCombo;
    
    // Ranks value indexing for comparison
    const rankValues: Record<string, number> = { S: 5, A: 4, B: 3, C: 2, F: 1 };
    const isRankNew = rankValues[report.rank] > (rankValues[previousRank] || 0);

    if (isScoreNew || isComboNew || isRankNew) {
      const updatedStats: UserStats = {
        highScores: {
          ...userStats.highScores,
          [report.songId]: isScoreNew ? report.score : previousHighScore
        },
        maxCombos: {
          ...userStats.maxCombos,
          [report.songId]: isComboNew ? report.maxCombo : previousMaxCombo
        },
        ranks: {
          ...userStats.ranks,
          [report.songId]: isRankNew ? report.rank : previousRank
        }
      };

      setUserStats(updatedStats);
      try {
        localStorage.setItem("tap_rhythm_stats", JSON.stringify(updatedStats));
      } catch (e) {
        console.error("Could not save statistical updates:", e);
      }
    }

    setGameState("RESULTS");
  }

  // Navigation handlers
  function handleExit() {
    setCurrentSongId(null);
    setLiveReport(null);
    setGameState("START_MENU");
  }

  function handleReplay() {
    if (currentSongId) {
      setGameState("PLAYING");
    }
  }

  // Visual header footer layouts for general background consistency
  return (
    <div className="min-h-screen bg-neutral-950 text-white flex flex-col justify-start select-none relative overflow-x-hidden md:py-4">
      {/* Dynamic atmospheric grid lines backdrop */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none z-0" />
      
      {/* Real-time high-fidelity game routing states */}
      <main className="flex-1 flex flex-col justify-start relative z-10">
        {gameState === "START_MENU" && (
          <SongSelect
            onSelectSong={handleSelectSong}
            userStats={userStats}
            noteSpeed={noteSpeed}
            onSpeedChange={setNoteSpeed}
            soundVolume={soundVolume}
            onVolumeChange={setSoundVolume}
            offsetMs={offsetMs}
            onOffsetChange={setOffsetMs}
          />
        )}

        {gameState === "PLAYING" && currentSongId && (
          <GamePlay
            songId={currentSongId}
            noteSpeed={noteSpeed}
            soundVolume={soundVolume}
            offsetMs={offsetMs}
            onSongEnd={handleSongEnd}
            onExit={handleExit}
          />
        )}

        {gameState === "RESULTS" && liveReport && (
          <GameResults
            report={liveReport}
            oldHighScore={oldHighScore}
            onReplay={handleReplay}
            onExit={handleExit}
          />
        )}
      </main>

      {/* Global Bottom Credit lines info */}
      <footer className="py-6 border-t border-white/5 text-center font-mono text-[9px] text-white/30 relative z-10 flex flex-col items-center gap-1 uppercase tracking-widest">
        <div>
          リズム・タップ・ネオン V1.1.0 • 高精度インタラクティブ設計
        </div>
        <div className="text-[8px] text-white/20 font-sans">
          ウェブオーディオ合成音源システム // リアルタイム信号処理エンジン搭載
        </div>
      </footer>
    </div>
  );
}
