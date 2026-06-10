import React from "react";
import { Song, UserStats } from "../types";
import { SONGS } from "../utils/audioSynth";
import { Music, Play, Trophy, Cpu, Sliders, Volume2, Sparkles, Star } from "lucide-react";
import { motion } from "motion/react";

interface SongSelectProps {
  onSelectSong: (songId: string) => void;
  userStats: UserStats;
  noteSpeed: number;
  onSpeedChange: (speed: number) => void;
  soundVolume: number;
  onVolumeChange: (volume: number) => void;
  offsetMs: number;
  onOffsetChange: (offset: number) => void;
}

export default function SongSelect({
  onSelectSong,
  userStats,
  noteSpeed,
  onSpeedChange,
  soundVolume,
  onVolumeChange,
  offsetMs,
  onOffsetChange
}: SongSelectProps) {
  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-6 text-white flex flex-col gap-6">
      
      {/* High Density Sleek Header */}
      <div className="border border-white/10 bg-neutral-900 rounded p-4 flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2.5 h-2.5 bg-cyan-400 rounded-sm animate-pulse" />
            <h1 id="app-title" className="text-xl font-black tracking-widest uppercase font-mono">
              RHYTHM TAP NEON // 高精度アーケードモデル
            </h1>
          </div>
          <p className="text-white/40 text-[11px] font-mono leading-relaxed uppercase">
            Web Audio 合成オシレーター音源 // キーボード・タッチ両対応 低遅延リズムコントローラー
          </p>
        </div>
        <div className="text-right font-mono text-[10px] text-white/50 tracking-wider">
          システムバージョン: 1.1.0 // 稼働リージョン: GLOBAL
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left column: Song List (8 cols) */}
        <div className="lg:col-span-8 flex flex-col gap-4">
          <div className="flex items-center justify-between px-2">
            <h2 className="text-xs font-black uppercase tracking-widest text-cyan-400 font-mono">
              プレイ可能な楽曲リスト [シンセ音源収録]
            </h2>
            <span className="text-[10px] font-mono text-white/40">{SONGS.length} 曲を読み込みました</span>
          </div>

          <div className="flex flex-col gap-3">
            {SONGS.map((song, idx) => {
              const highScore = userStats.highScores[song.id] || 0;
              const maxCombo = userStats.maxCombos[song.id] || 0;
              const rank = userStats.ranks[song.id] || "-";

              // Difficulty badge color mapping
              const difficultyColors = {
                Easy: "text-cyan-400 border-cyan-400/20 bg-cyan-400/5",
                Medium: "text-rose-400 border-rose-400/20 bg-rose-400/5",
                Hard: "text-amber-400 border-amber-400/20 bg-amber-400/5",
                Expert: "text-fuchsia-400 border-fuchsia-400/20 bg-fuchsia-400/5",
              };

              const difficultyLabels = {
                Easy: "Easy (初級)",
                Medium: "Medium (中級)",
                Hard: "Hard (上級)",
                Expert: "Expert (極級)",
              };

              return (
                <motion.div
                  key={song.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="group relative rounded border border-white/10 bg-neutral-900/60 hover:bg-neutral-900 hover:border-white/25 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all duration-200 overflow-hidden cursor-pointer"
                  onClick={() => onSelectSong(song.id)}
                >
                  {/* Decorative Left Neon Color line tag */}
                  <div
                    className="absolute left-0 top-0 bottom-0 w-1 transition-all group-hover:w-1.5"
                    style={{ backgroundColor: song.color }}
                  />

                  {/* Song Info */}
                  <div className="flex-1 min-w-0 pl-2">
                    <div className="flex flex-wrap items-center gap-2.5 mb-1">
                      <span className={`text-[9px] uppercase font-mono px-2 py-0.5 rounded border ${difficultyColors[song.difficulty]}`}>
                        {difficultyLabels[song.difficulty] || song.difficulty}
                      </span>
                      <span className="text-white/50 text-[10px] font-mono">BPM {song.bpm}</span>
                      <span className="text-white/30 text-[10px] font-mono">曲の長さ: {song.duration}秒</span>
                    </div>

                    <h3 className="text-base font-bold tracking-tight text-white group-hover:text-cyan-400 transition-colors uppercase">
                      {song.title}
                    </h3>
                    <p className="text-white/40 text-[11px] mt-0.5 line-clamp-1 font-mono">
                      {song.subtitle} — {song.description}
                    </p>
                  </div>

                  {/* Stats & Play Button */}
                  <div className="flex items-center gap-4 self-end sm:self-center shrink-0">
                    {/* Score Panel */}
                    <div className="flex items-center gap-3 text-right">
                      {highScore > 0 ? (
                        <div className="font-mono text-[11px]">
                          <div className="text-[9px] text-white/40 uppercase tracking-wider">ハイスコア</div>
                          <div className="font-black text-white">{highScore.toLocaleString()}</div>
                          <div className="text-[9px] text-emerald-400 font-bold">
                            最大コンボ: {maxCombo}
                          </div>
                        </div>
                      ) : (
                        <div className="text-[10px] text-white/20 font-mono tracking-widest uppercase">
                          記録なし
                        </div>
                      )}
                      
                      {rank !== "-" && (
                        <div className="flex items-center justify-center w-8 h-8 rounded border border-cyan-400/30 bg-cyan-400/5 text-cyan-400 font-bold font-mono text-sm shadow-[0_0_8px_rgba(34,211,238,0.2)]">
                          {rank}
                        </div>
                      )}
                    </div>

                    {/* Compact layout direct trigger button */}
                    <div className="w-10 h-10 rounded border border-white/10 group-hover:border-white/40 flex items-center justify-center bg-white/5 transition-all text-white hover:bg-white/10">
                      <Play className="w-4 h-4 fill-white" />
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Right column: Adjustments (4 cols) */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          <h2 className="text-xs font-black uppercase tracking-widest text-cyan-400 font-mono px-2">
            タイミング調整 & システム設定
          </h2>

          <div className="rounded border border-white/10 bg-neutral-900 p-5 flex flex-col gap-5">
            {/* Note Speed Option */}
            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center text-xs font-mono">
                <span className="text-white/80 font-bold flex items-center gap-1.5">
                  <Cpu className="w-3.5 h-3.5 text-cyan-400" /> ノーツ落下速度
                </span>
                <span className="text-cyan-400 font-bold text-xs bg-cyan-400/10 border border-cyan-400/20 px-2 py-0.5 rounded">
                  {noteSpeed.toFixed(1)}x
                </span>
              </div>
              <input
                type="range"
                min="1.0"
                max="5.0"
                step="0.5"
                value={noteSpeed}
                onChange={(e) => onSpeedChange(parseFloat(e.target.value))}
                className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-cyan-400"
              />
              <p className="text-[10px] text-white/40 leading-relaxed font-sans">
                落下ノーツの流れるスピードを調整します。推奨設定: 2.5x〜3.5x
              </p>
            </div>

            {/* SE/Music Volume Option */}
            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center text-xs font-mono">
                <span className="text-white/80 font-bold flex items-center gap-1.5">
                  <Volume2 className="w-3.5 h-3.5 text-cyan-400" /> ゲーム音量設定
                </span>
                <span className="text-cyan-400 font-bold text-xs bg-cyan-400/10 border border-cyan-400/20 px-2 py-0.5 rounded">
                  {Math.round(soundVolume * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0.0"
                max="1.0"
                step="0.1"
                value={soundVolume}
                onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
                className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-cyan-400"
              />
              <p className="text-[10px] text-white/40 leading-relaxed font-sans">
                ゲーム全体のサウンド全体の音量レベル。シンセBGM音源およびタップ時の効果音に反映されます。
              </p>
            </div>

            {/* Latency Offset Calibration Option */}
            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center text-xs font-mono">
                <span className="text-white/80 font-bold flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-cyan-400" /> 音声判定タイミング補正
                </span>
                <span className="text-cyan-400 font-bold text-xs bg-cyan-400/10 border border-cyan-400/20 px-2 py-0.5 rounded">
                  {offsetMs >= 0 ? `+${offsetMs}` : offsetMs} ms
                </span>
              </div>
              <input
                type="range"
                min="-150"
                max="150"
                step="5"
                value={offsetMs}
                onChange={(e) => onOffsetChange(parseInt(e.target.value))}
                className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-cyan-400"
              />
              <p className="text-[10px] text-white/40 leading-relaxed font-sans">
                音のズレが生じる場合に判定時間をミリ秒単位で調整します。Bluetoothなどのワイヤレスイヤフォンをご使用の際は「+80ms〜+140ms」に設定することをおすすめします。
              </p>
            </div>

            {/* Keys Help Card */}
            <div className="border-t border-white/5 pt-4 mt-1 flex flex-col gap-3 font-mono">
              <span className="text-[10px] font-bold text-white/40 tracking-wider uppercase">コントローラー操作キー</span>
              <div className="grid grid-cols-4 gap-2 text-center text-xs">
                {[
                  { k: "D", l: "1" },
                  { k: "F", l: "2" },
                  { k: "J", l: "3" },
                  { k: "K", l: "4" }
                ].map((item) => (
                  <div key={item.k} className="p-1 border border-white/10 bg-neutral-950 rounded flex flex-col gap-0.5 animate-pulse">
                    <kbd className="font-extrabold text-cyan-400 text-sm">{item.k}</kbd>
                    <span className="text-[8px] text-white/30 uppercase">レーン {item.l}</span>
                  </div>
                ))}
              </div>
              <p className="text-[9px] text-white/40 leading-relaxed text-center font-sans">
                PCではキーボードの D, F, J, K キーを押します。<br />
                スマートフォン等では、画面下の対応する列を直接タップして遊べます。
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
