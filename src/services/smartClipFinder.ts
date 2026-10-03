import type { CaptionSegment } from './subtitleUtils';
import { formatTime } from './videoMetadata';

// ─── Configuration ───────────────────────────────────────────────────────────
export const CLIP_DURATION_MIN = 15;       // seconds — discard clips shorter than this
export const CLIP_DURATION_TARGET = 40;   // seconds — ideal clip length for scoring
export const CLIP_DURATION_MAX = 90;      // seconds — hard cap

// ─── Types ────────────────────────────────────────────────────────────────────
export interface ClipSuggestion {
  id: string;
  rank: number;
  start: number;
  end: number;
  duration: number;
  formattedDuration: string;
  title: string;
  score: number;            // internal use only — do not show raw number to users
  reasons: string[];        // human-readable signals, e.g. "Strong hook opening"
  transcript: string;       // full text of this clip
  snippet: string;          // short preview (~100 chars)
  segments: CaptionSegment[]; // needed for caption burn in export pipeline
}

// ─── Hook phrase heuristics ───────────────────────────────────────────────────
// These are weak signals only. They don't determine quality — they are one of
// many inputs to a composite score.
const HOOK_PHRASES: RegExp[] = [
  /\bthe biggest mistake\b/i,
  /\bhere'?s why\b/i,
  /\bthe truth (is|about)\b/i,
  /\bmost people\b/i,
  /\byou need to\b/i,
  /\bi (learned|realized|discovered)\b/i,
  /\bthe problem is\b/i,
  /\bwhat nobody tells you\b/i,
  /\bthe reason (is|why)?\b/i,
  /\bthe most important\b/i,
  /\bif you('?re| are)\b/i,
  /\bdon'?t\b/i,
  /\bnever\b/i,
  /\bwhat if\b/i,
  /\bdid you know\b/i,
  /\bthe secret\b/i,
  /\bhow to\b/i,
  /\bwhy (most|you|we|this)\b/i,
  /\bstop (doing|trying|being)\b/i,
  /\bthe #?1 (reason|rule|mistake|thing)\b/i,
  /\bimagine\b/i,
  /\blet me (show|tell|explain)\b/i,
  /\bthat'?s (why|because|when|how)\b/i,
];

// Engagement words — repeating important content words within a window
const ENGAGEMENT_WORDS = new Set([
  'money', 'time', 'life', 'work', 'problem', 'solution', 'success', 'fail',
  'change', 'truth', 'reason', 'learn', 'grow', 'build', 'create', 'start',
  'stop', 'best', 'worst', 'secret', 'simple', 'easy', 'hard', 'fast', 'free',
  'people', 'team', 'business', 'product', 'strategy', 'mistake', 'lesson',
  'power', 'system', 'plan', 'goal', 'hack', 'tip', 'rule', 'key', 'mind',
  'real', 'actual', 'most', 'every', 'only', 'always', 'never', 'huge',
]);

// ─── Scoring ──────────────────────────────────────────────────────────────────

interface ScoreResult {
  score: number;
  reasons: string[];
}

function scoreWindow(segments: CaptionSegment[]): ScoreResult {
  if (segments.length === 0) return { score: 0, reasons: [] };

  const fullText = segments.map((s) => s.text).join(' ');
  const lowerText = fullText.toLowerCase();
  const firstText = (segments[0]?.text || '').trim().toLowerCase();
  const lastText = (segments[segments.length - 1]?.text || '').trim();
  const duration = (segments[segments.length - 1]?.end ?? 0) - (segments[0]?.start ?? 0);

  let score = 50;
  const reasons: string[] = [];

  // 1. Hook phrase detection (+15)
  const matchedHook = HOOK_PHRASES.find((re) => re.test(lowerText));
  if (matchedHook) {
    const hook = HOOK_PHRASES.find((re) => re.test(firstText));
    if (hook) {
      score += 15;
      reasons.push('Opens with a strong hook');
    } else {
      score += 9;
      reasons.push('Contains a hook phrase');
    }
  }

  // 2. Question detection (+10 if starts with Q, +6 if contains Q)
  const questionCount = (fullText.match(/\?/g) || []).length;
  if (questionCount > 0) {
    if (/\?/.test(firstText)) {
      score += 10;
      reasons.push('Question opener — high retention');
    } else {
      score += 6;
      reasons.push('Poses a question');
    }
  }

  // 3. Exclamation detection (+4, weak signal)
  if (/!/.test(fullText)) {
    score += 4;
    reasons.push('High-energy moment');
  }

  // 4. Keyword density (+12 if ≥3 engagement words, +6 if 1-2)
  const words = lowerText.split(/\s+/);
  const engagementHits = words.filter((w) => ENGAGEMENT_WORDS.has(w.replace(/[^a-z]/g, '')));
  if (engagementHits.length >= 3) {
    score += 12;
    reasons.push('Keyword-dense topic');
  } else if (engagementHits.length >= 1) {
    score += 6;
    reasons.push(`Key topic: "${engagementHits[0]}"`);
  }

  // 5. Sentence density — words per second (prefer 1.5–4 wps)
  const wordCount = words.length;
  const wps = duration > 0 ? wordCount / duration : 0;
  if (wps >= 1.5 && wps <= 4.5) {
    score += 8;
    reasons.push('Natural speech pace');
  } else if (wps < 1.0) {
    score -= 8; // sparse / lots of silence
  }

  // 6. Duration sweet spot
  if (duration >= 25 && duration <= 60) {
    score += 14;
    reasons.push(`Perfect Short length (${Math.round(duration)}s)`);
  } else if (duration >= CLIP_DURATION_MIN && duration <= CLIP_DURATION_MAX) {
    score += 6;
    reasons.push(`Good length (${Math.round(duration)}s)`);
  } else {
    score -= 12;
  }

  // 7. Clean sentence boundary at end (+10)
  if (/[.!?]$/.test(lastText)) {
    score += 10;
    reasons.push('Clean ending');
  } else if (/[,;]$/.test(lastText)) {
    score -= 6; // cuts mid-clause
  }

  // 8. Clean sentence start (+6)
  if (/^[A-Z]/.test(segments[0]?.text?.trim() || '')) {
    score += 6;
    reasons.push('Natural start point');
  }

  // 9. Repetition of key terms within window — focused topic (+8)
  const termFreq: Record<string, number> = {};
  for (const w of words) {
    const clean = w.replace(/[^a-z]/g, '');
    if (clean.length > 4) termFreq[clean] = (termFreq[clean] || 0) + 1;
  }
  const topTerm = Object.entries(termFreq).sort((a, b) => b[1] - a[1])[0];
  if (topTerm && topTerm[1] >= 3 && ENGAGEMENT_WORDS.has(topTerm[0])) {
    score += 8;
    reasons.push(`Focused on "${topTerm[0]}"`);
  }

  const finalScore = Math.min(99, Math.max(35, Math.round(score)));
  return { score: finalScore, reasons };
}

// ─── Title generation ─────────────────────────────────────────────────────────

function generateTitle(text: string, index: number): string {
  const clean = text.trim();
  // Try to find a natural sentence opening (ends with . ! ?)
  const firstSentenceMatch = clean.match(/^[^.!?]{10,60}[.!?]/);
  if (firstSentenceMatch) {
    const s = firstSentenceMatch[0].trim();
    return s.length <= 55 ? s : s.slice(0, 52) + '...';
  }
  // Fallback: first 7 words
  const words = clean.split(/\s+/).slice(0, 7).join(' ');
  if (words.length > 5) return `"${words}..."`;
  return `Clip #${index}`;
}

// ─── Overlap check ────────────────────────────────────────────────────────────

function overlaps(a: { start: number; end: number }, b: { start: number; end: number }): boolean {
  const overlapStart = Math.max(a.start, b.start);
  const overlapEnd = Math.min(a.end, b.end);
  const overlapDuration = overlapEnd - overlapStart;
  const shorter = Math.min(a.end - a.start, b.end - b.start);
  // Two clips "overlap" if they share more than 50% of the shorter clip's duration
  return overlapDuration > shorter * 0.5;
}

// ─── Main finder function ─────────────────────────────────────────────────────

/**
 * findSmartClips — pure text analysis, no AI, no GPU, no network.
 *
 * Algorithm:
 * 1. Build candidate windows by sliding over transcript segments
 * 2. Score each window using deterministic heuristics
 * 3. Deduplicate overlapping windows (keep higher score)
 * 4. Return top 3–5 suggestions sorted by score
 *
 * For a 60-minute podcast (~1,800 segments), this completes in <5ms.
 */
export function findSmartClips(
  segments: CaptionSegment[],
  totalDuration: number,
  maxResults: number = 5
): ClipSuggestion[] {
  if (!segments || segments.length === 0) return [];

  // If the entire video is short enough to be a single clip
  if (totalDuration <= CLIP_DURATION_MAX) {
    const fullText = segments.map((s) => s.text).join(' ');
    const { score, reasons } = scoreWindow(segments);
    return [
      {
        id: 'clip-1',
        rank: 1,
        start: 0,
        end: totalDuration,
        duration: totalDuration,
        formattedDuration: formatTime(totalDuration),
        title: generateTitle(fullText, 1),
        score,
        reasons,
        transcript: fullText,
        snippet: fullText.slice(0, 120) + (fullText.length > 120 ? '...' : ''),
        segments,
      },
    ];
  }

  const candidates: Omit<ClipSuggestion, 'rank'>[] = [];

  // Stride: skip this many segments between window starts.
  // For large videos we use a bigger stride to stay cheap.
  const stride = Math.max(1, Math.floor(segments.length / 40));

  for (let i = 0; i < segments.length; i += stride) {
    const windowSegs: CaptionSegment[] = [];
    const windowStart = segments[i].start;
    let windowEnd = windowStart;

    for (let j = i; j < segments.length; j++) {
      windowSegs.push(segments[j]);
      windowEnd = segments[j].end;
      const dur = windowEnd - windowStart;

      if (dur < CLIP_DURATION_MIN) continue;

      // Prefer to cut at sentence boundaries
      const lastText = segments[j].text.trim();
      const isSentenceEnd = /[.!?]$/.test(lastText);

      const hitTarget = dur >= CLIP_DURATION_TARGET;
      const hitMax = dur >= CLIP_DURATION_MAX;

      if ((hitTarget && isSentenceEnd) || hitMax) {
        const { score, reasons } = scoreWindow(windowSegs);
        const fullText = windowSegs.map((s) => s.text).join(' ');

        candidates.push({
          id: `clip-${candidates.length + 1}`,
          start: Number(windowStart.toFixed(2)),
          end: Number(windowEnd.toFixed(2)),
          duration: Number(dur.toFixed(1)),
          formattedDuration: formatTime(dur),
          title: generateTitle(fullText, candidates.length + 1),
          score,
          reasons,
          transcript: fullText,
          snippet: fullText.slice(0, 120) + (fullText.length > 120 ? '...' : ''),
          segments: [...windowSegs],
        });
        break; // move to next window start
      }
    }
  }

  if (candidates.length === 0) {
    // Fallback: split video into halves if nothing scored
    if (totalDuration > CLIP_DURATION_MIN * 2) {
      const mid = Math.floor(segments.length / 2);
      const segs1 = segments.slice(0, mid);
      const segs2 = segments.slice(mid);
      const t1 = segs1.map((s) => s.text).join(' ');
      const t2 = segs2.map((s) => s.text).join(' ');
      const { score: s1, reasons: r1 } = scoreWindow(segs1);
      const { score: s2, reasons: r2 } = scoreWindow(segs2);
      const d1 = (segs1[segs1.length - 1]?.end ?? 0) - (segs1[0]?.start ?? 0);
      const d2 = (segs2[segs2.length - 1]?.end ?? totalDuration) - (segs2[0]?.start ?? d1);
      return [
        {
          id: 'clip-1', rank: 1,
          start: segs1[0]?.start ?? 0, end: segs1[segs1.length - 1]?.end ?? d1,
          duration: d1, formattedDuration: formatTime(d1),
          title: generateTitle(t1, 1), score: s1, reasons: r1,
          transcript: t1, snippet: t1.slice(0, 120) + '...', segments: segs1,
        },
        {
          id: 'clip-2', rank: 2,
          start: segs2[0]?.start ?? d1, end: segs2[segs2.length - 1]?.end ?? totalDuration,
          duration: d2, formattedDuration: formatTime(d2),
          title: generateTitle(t2, 2), score: s2, reasons: r2,
          transcript: t2, snippet: t2.slice(0, 120) + '...', segments: segs2,
        },
      ];
    }
    return [];
  }

  // Sort by score descending
  candidates.sort((a, b) => b.score - a.score);

  // Deduplicate overlapping windows — keep the higher-scoring one
  const deduped: Omit<ClipSuggestion, 'rank'>[] = [];
  for (const candidate of candidates) {
    const overlapping = deduped.some((kept) => overlaps(kept, candidate));
    if (!overlapping) {
      deduped.push(candidate);
    }
    if (deduped.length >= maxResults) break;
  }

  // Assign final rank and return
  return deduped.map((clip, idx) => ({
    ...clip,
    id: `clip-${idx + 1}`,
    rank: idx + 1,
  }));
}
