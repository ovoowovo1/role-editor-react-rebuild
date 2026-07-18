import { MEMORY_VERSION } from './contracts';
import type { MemoryPayload, MemoryStat, SourceTile, Vec3 } from './internalTypes';
import { clamp, getLocalStorage } from './platform';

export class ExperienceMemory {
  private payload: MemoryPayload;

  constructor(
    private readonly key: string,
    sources: readonly SourceTile[],
    reset: boolean
  ) {
    this.payload = { version: MEMORY_VERSION, source_stats: {}, color_stats: {} };
    if (!reset) this.load();
    for (const source of sources) {
      this.payload.source_stats[source.code] ??= { trials: 0, accepted: 0, gain_sum: 0, ema_gain: 0 };
    }
  }

  private load(): void {
    if (!this.key) return;
    try {
      const raw = getLocalStorage()?.getItem(this.key);
      if (!raw) return;
      const parsed = this.parsePayload(JSON.parse(raw));
      if (parsed) this.payload = parsed;
    } catch {
      this.payload = { version: MEMORY_VERSION, source_stats: {}, color_stats: {} };
    }
  }

  private parsePayload(value: unknown): MemoryPayload | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const candidate = value as Partial<MemoryPayload>;
    if (candidate.version !== MEMORY_VERSION) return null;

    const parseStats = (stats: unknown): Record<string, MemoryStat> | null => {
      if (!stats || typeof stats !== 'object' || Array.isArray(stats)) return null;
      const parsed = Object.create(null) as Record<string, MemoryStat>;
      for (const [key, rawStat] of Object.entries(stats)) {
        if (!rawStat || typeof rawStat !== 'object' || Array.isArray(rawStat)) return null;
        const stat = rawStat as Partial<MemoryStat>;
        if (
          !Number.isInteger(stat.trials) ||
          !Number.isInteger(stat.accepted) ||
          (stat.trials ?? -1) < 0 ||
          (stat.accepted ?? -1) < 0 ||
          (stat.accepted ?? 0) > (stat.trials ?? 0) ||
          !Number.isFinite(stat.gain_sum) ||
          !Number.isFinite(stat.ema_gain)
        ) return null;
        parsed[key] = {
          trials: stat.trials as number,
          accepted: stat.accepted as number,
          gain_sum: stat.gain_sum as number,
          ema_gain: stat.ema_gain as number
        };
      }
      return parsed;
    };

    const sourceStats = parseStats(candidate.source_stats);
    const colorStats = parseStats(candidate.color_stats);
    if (!sourceStats || !colorStats) return null;
    return { version: MEMORY_VERSION, source_stats: sourceStats, color_stats: colorStats };
  }

  snapshotState(): string {
    const sortedStats = (stats: Record<string, MemoryStat>): Record<string, MemoryStat> =>
      Object.fromEntries(Object.keys(stats).sort().map((key) => [key, { ...stats[key] }]));
    return JSON.stringify({
      version: MEMORY_VERSION,
      source_stats: sortedStats(this.payload.source_stats),
      color_stats: sortedStats(this.payload.color_stats)
    });
  }

  prepareSnapshotState(serialized: string): MemoryPayload | null {
    if (typeof serialized !== 'string' || serialized.length === 0) return null;
    try {
      return this.parsePayload(JSON.parse(serialized));
    } catch {
      return null;
    }
  }

  commitSnapshotState(payload: MemoryPayload): void {
    this.payload = payload;
  }

  restoreSnapshotState(serialized: string): boolean {
    const parsed = this.prepareSnapshotState(serialized);
    if (!parsed) return false;
    this.commitSnapshotState(parsed);
    return true;
  }

  save(): void {
    if (!this.key) return;
    try {
      const next: MemoryPayload = { ...this.payload, updated_at: Math.floor(Date.now() / 1000) };
      getLocalStorage()?.setItem(this.key, JSON.stringify(next));
    } catch {
      // localStorage can be unavailable in private mode. The generator still works without memory.
    }
  }

  colorBin(color: Vec3): string {
    return color.map((value) => clamp(Math.floor(clamp(value, 0, 255) / 16), 0, 15)).join(',');
  }

  private colorKey(sourceName: string, color: Vec3): string {
    return this.colorKeyForBin(sourceName, this.colorBin(color));
  }

  private colorKeyForBin(sourceName: string, colorBin: string): string {
    return `${sourceName}|${colorBin}`;
  }

  noteTrial(sourceName: string, color: Vec3, accepted: boolean, gainMse: number): void {
    const sourceStat = this.payload.source_stats[sourceName] ?? { trials: 0, accepted: 0, gain_sum: 0, ema_gain: 0 };
    sourceStat.trials += 1;
    if (accepted) sourceStat.accepted += 1;
    sourceStat.gain_sum += gainMse;
    sourceStat.ema_gain = sourceStat.ema_gain * 0.92 + gainMse * 0.08;
    this.payload.source_stats[sourceName] = sourceStat;

    const key = this.colorKey(sourceName, color);
    const colorStat = this.payload.color_stats[key] ?? { trials: 0, accepted: 0, gain_sum: 0, ema_gain: 0 };
    colorStat.trials += 1;
    if (accepted) colorStat.accepted += 1;
    colorStat.gain_sum += gainMse;
    colorStat.ema_gain = colorStat.ema_gain * 0.9 + gainMse * 0.1;
    this.payload.color_stats[key] = colorStat;
  }

  private statBonus(stat: MemoryStat | undefined): number {
    if (!stat || stat.trials <= 0) return 1;
    const trials = Math.max(1, stat.trials);
    const acceptRate = Math.max(0, stat.accepted) / trials;
    const avgGain = stat.gain_sum / trials;
    const gainBonus = Math.tanh(clamp(avgGain + stat.ema_gain, -0.01, 0.01) * 150);
    return clamp(1 + 0.55 * acceptRate + 0.65 * gainBonus, 0.35, 2.75);
  }

  sourceMultiplier(sourceName: string, targetColor: Vec3): number {
    return this.sourceMultiplierForBin(sourceName, this.colorBin(targetColor));
  }

  sourceMultiplierForBin(sourceName: string, colorBin: string): number {
    const globalBonus = this.statBonus(this.payload.source_stats[sourceName]);
    const colorBonus = this.statBonus(this.payload.color_stats[this.colorKeyForBin(sourceName, colorBin)]);
    return globalBonus * colorBonus;
  }
}
