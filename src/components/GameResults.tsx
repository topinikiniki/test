import React from "react";
import { ScoreReport, Song } from "../types";
import { SONGS } from "../utils/audioSynth";
import { Trophy, RefreshCw, LogOut, Award, Sparkles, CheckCircle2, ChevronRight } from "lucide-react";
import { motion } from "motion/react";

interface GameResultsProps {
  report: ScoreReport;
  oldHighScore: number;
  onReplay: () => void;
  onExit: () => void;
}

const RANK_BADGES: Record<string, { label: string; desc: string; color: string; shadow: string }> = {
  S: {
    label: "S",
    desc: "神レベルの正確さ！完璧です！",
    color: "from-cyan-400 to-blue-500 text-cyan-200 border-cyan-400/40",
    shadow: "shadow-[0_0_50px_rgba(34,211,238,0.4)]"
  },
  A: {
    label: "A",
    desc: "エクセレント！素晴らしい腕前です！",
    color: "from-emerald-400 to-teal-500 text-emerald-200 border-emerald-400/40",
    shadow: "shadow-[0_0_50px_rgba(52,211,153,0.35)]"
  },
  B: {
    label: "B",
    desc: "グッド！なかなかのリズム感ですね！",
    color: "from-amber-400 to-orange-500 text-amber-200 border-amber-400/40",
    shadow: "shadow-[0_0_50px_rgba(251,191,36,0.3)]"
  },
  C: {
    label: "C",
    desc: "クリア！さらに練習して上を目指しましょう！",
    color: "from-slate-400 to-slate-500 text-slate-200 border-slate-500/40",
    shadow: "shadow-[0_0_40px_rgba(148,163,184,0.2)]"
  },
  F: {
    label: "F",
    desc: "どんまい！もう一度挑戦しましょう！",
    color: "from-rose-500 to-red-600 text-rose-200 border-rose-500/40",
    shadow: "shadow-[0_0_40px_rgba(244,63,94,0.2)]"
  }
};

export default function GameResults({
  report,
  oldHighScore,
  onReplay,
  onExit
}: GameResultsProps) {
  const song = SONGS.find((s) => s.id === report.songId) || SONGS[0];
  const isNewRecord = report.score > oldHighScore;
  const badge = RANK_BADGES[report.rank] || RANK_BADGES.F;

  // Percentage breakdown of judgement notes
  const totalNotes = report.perfects + report.greats + report.goods + report.misses;
  const perfPercent = totalNotes > 0 ? (report.perfects / totalNotes) * 100 : 0;
  const greatPercent = totalNotes > 0 ? (report.greats / totalNotes) * 100 : 0;
  const goodPercent = totalNotes > 0 ? (report.goods / totalNotes) * 100 : 0;
  const missPercent = totalNotes > 0 ? (report.misses / totalNotes) * 100 : 0;

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-8 text-white font-sans flex flex-col gap-6">
      
      {/* High Density Sleek Title Box */}
      <div className="border border-white/10 bg-neutral-900 rounded p-4 flex justify-between items-center">
        <div>
          <span className="text-[10px] uppercase tracking-widest font-mono text-cyan-400 font-semibold">// ステージプレイ完了</span>
          <h2 className="text-xl font-black text-white tracking-widest mt-0.5 uppercase">
            演奏結果レポート: {song.title}
          </h2>
        </div>
        <div className="text-right font-mono text-[10px] text-white/50">
          筐体ID: #409B // 判定タイム同期
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch">
        {/* Left Card: Grade Display */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className={`md:col-span-5 rounded border border-white/10 bg-neutral-900 p-6 flex flex-col items-center justify-center text-center relative overflow-hidden shadow-2xl`}
        >
          {isNewRecord && (
            <div className="absolute top-3 left-3 bg-cyan-400 text-neutral-950 text-[9px] font-black tracking-widest px-2 py-0.5 rounded flex items-center gap-1 uppercase font-mono">
              ★ 新記録達成！
            </div>
          )}

          <div className="text-[10px] uppercase font-mono tracking-widest text-white/40 mb-2">総合評価グレード</div>
          
          {/* Glowing arcade letter */}
          <motion.div
            initial={{ scale: 0.3, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 120, damping: 11, delay: 0.1 }}
            className={`text-8xl md:text-9xl font-sans font-black tracking-tighter drop-shadow-[0_0_20px_rgba(255,255,255,0.15)] mb-3 leading-none uppercase ${
              report.rank === "S" ? "text-cyan-400" :
              report.rank === "A" ? "text-emerald-400" :
              report.rank === "B" ? "text-amber-400" : "text-rose-500"
            }`}
          >
            {badge.label}
          </motion.div>

          <span className="text-[10px] font-mono font-bold text-cyan-400 px-3 py-1 rounded bg-cyan-400/10 border border-cyan-400/20">
            判定正確度: {report.accuracy}%
          </span>

          <p className="text-[11px] text-white/50 mt-4 leading-relaxed font-sans truncate max-w-full">
            {badge.desc}
          </p>
        </motion.div>

        {/* Right Card: Statistics breakdowns */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="md:col-span-7 rounded border border-white/10 bg-neutral-900 p-6 flex flex-col gap-6 shadow-2xl"
        >
          {/* Score display column block */}
          <div className="grid grid-cols-2 gap-4 border-b border-white/10 pb-4">
            <div>
              <span className="text-[9px] uppercase font-mono text-white/40 tracking-wider">トータルスコア</span>
              <div className="text-3xl font-black font-mono tracking-wide text-white mt-1">
                {report.score.toLocaleString()}
              </div>
              {isNewRecord && oldHighScore > 0 && (
                <span className="text-[9px] text-cyan-400 font-sans">
                  過去のハイスコアを +{ (report.score - oldHighScore).toLocaleString() } 更新！
                </span>
              )}
            </div>
            <div>
              <span className="text-[9px] uppercase font-mono text-white/40 tracking-wider">最大コンボ数</span>
              <div className="text-3xl font-black font-mono tracking-wide text-cyan-400 mt-1">
                {report.maxCombo} <span className="text-[10px] text-white/30">COMBO</span>
              </div>
              <span className="text-[9px] text-white/40 font-mono">
                総ノーツ数: {totalNotes}
              </span>
            </div>
          </div>

          {/* Hit break-down list with accuracy visualizers */}
          <div className="flex flex-col gap-3 font-mono">
            {/* PERFECT */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between items-center text-xs">
                <span className="text-cyan-400 font-black flex items-center gap-1.5 uppercase">
                  PERFECT
                </span>
                <span className="text-white font-bold">{report.perfects} <span className="text-white/30 text-[9px]">({Math.round(perfPercent)}%)</span></span>
              </div>
              <div className="w-full bg-neutral-950 h-1.5 rounded overflow-hidden border border-white/5">
                <div className="h-full bg-cyan-400" style={{ width: `${perfPercent}%` }} />
              </div>
            </div>

            {/* GREAT */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between items-center text-xs">
                <span className="text-fuchsia-400 font-bold flex items-center gap-1.5 uppercase">
                  GREAT
                </span>
                <span className="text-white/80 font-bold">{report.greats} <span className="text-white/30 text-[9px]">({Math.round(greatPercent)}%)</span></span>
              </div>
              <div className="w-full bg-neutral-950 h-1.5 rounded overflow-hidden border border-white/5">
                <div className="h-full bg-fuchsia-400" style={{ width: `${greatPercent}%` }} />
              </div>
            </div>

            {/* GOOD */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between items-center text-xs">
                <span className="text-amber-400 font-bold flex items-center gap-1.5 uppercase">
                  GOOD
                </span>
                <span className="text-white/80 font-bold">{report.goods} <span className="text-white/30 text-[9px]">({Math.round(goodPercent)}%)</span></span>
              </div>
              <div className="w-full bg-neutral-950 h-1.5 rounded overflow-hidden border border-white/5">
                <div className="h-full bg-amber-400" style={{ width: `${goodPercent}%` }} />
              </div>
            </div>

            {/* MISS */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between items-center text-xs">
                <span className="text-rose-500 font-bold uppercase">MISS</span>
                <span className="text-white/60 font-bold">{report.misses} <span className="text-white/30 text-[9px]">({Math.round(missPercent)}%)</span></span>
              </div>
              <div className="w-full bg-neutral-950 h-1.5 rounded overflow-hidden border border-white/5">
                <div className="h-full bg-rose-500" style={{ width: `${missPercent}%` }} />
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Buttons Action bar */}
      <div className="flex flex-col sm:flex-row gap-3 mt-4">
        <button
          onClick={onReplay}
          className="flex-1 py-3 bg-white text-black font-black text-xs uppercase tracking-widest rounded hover:bg-neutral-200 transition-colors font-sans"
        >
          もう一度遊ぶ
        </button>
        
        <button
          onClick={onExit}
          className="flex-1 py-3 border border-white/20 text-white font-black text-xs uppercase tracking-widest rounded hover:bg-white/5 transition-colors font-sans"
        >
          楽曲選択画面に戻る
        </button>
      </div>
    </div>
  );
}
