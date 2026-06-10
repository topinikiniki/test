export interface GameNote {
  id: string;
  time: number; // Spawn target time in seconds
  lane: number; // 0, 1, 2, 3
  duration?: number; // Optional hold note duration (0 = simple tap)
  hit?: boolean;
  scoreSaved?: boolean;
}

export interface Song {
  id: string;
  title: string;
  subtitle: string;
  bpm: number;
  difficulty: "Easy" | "Medium" | "Hard" | "Expert";
  color: string; // Neon accent hex color
  bgColor: string; // Background custom gradient or theme styling
  duration: number; // Total length in seconds
  description: string;
  notesCount: number;
}

export type PlayRank = "S" | "A" | "B" | "C" | "F";

export interface ScoreReport {
  songId: string;
  score: number;
  accuracy: number;
  maxCombo: number;
  perfects: number;
  greats: number;
  goods: number;
  misses: number;
  rank: PlayRank;
}

export interface UserStats {
  highScores: Record<string, number>;
  maxCombos: Record<string, number>;
  ranks: Record<string, PlayRank>;
}

export type JudgementType = "Perfect" | "Great" | "Good" | "Miss" | null;

export interface JudgementIndicator {
  id: string;
  type: JudgementType;
  x: number; // Visual offset if any
}

export interface TapRipple {
  id: string;
  lane: number;
}
