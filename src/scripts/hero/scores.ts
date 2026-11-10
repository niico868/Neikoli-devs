/**
 * High score storage for the keepy-uppy game.
 * Phase 1: scores live in this browser only (localStorage).
 * Phase 2: swap LocalScoreStore for a Supabase-backed store that runs
 *   select name, score from game_scores order by score desc limit 10
 * so only the top 10 rows are ever loaded.
 */
export interface Score { name: string; score: number; at: number }

export interface ScoreStore {
  top(limit: number): Promise<Score[]>;
  add(entry: Score, limit: number): Promise<Score[]>;
}

export class LocalScoreStore implements ScoreStore {
  constructor(private key: string) {}

  private read(): Score[] {
    try {
      const raw = localStorage.getItem(this.key);
      const list = raw ? (JSON.parse(raw) as Score[]) : [];
      return Array.isArray(list) ? list.filter((s) => typeof s?.score === 'number') : [];
    } catch { return []; }
  }

  async top(limit: number) {
    return sortScores(this.read()).slice(0, limit);
  }

  async add(entry: Score, limit: number) {
    const list = sortScores([...this.read(), entry]).slice(0, limit);
    try { localStorage.setItem(this.key, JSON.stringify(list)); } catch { /* storage blocked: keep in memory */ }
    return list;
  }
}

export const sortScores = (l: Score[]) => [...l].sort((a, b) => b.score - a.score || a.at - b.at);

/** True if this score would make the top `limit`. */
export const qualifies = (list: Score[], score: number, limit: number) =>
  score > 0 && (list.length < limit || score > list[list.length - 1].score);
