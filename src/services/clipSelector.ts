import type { CaptionSegment } from './subtitleUtils';
import { formatTime } from './videoMetadata';

export interface CandidateClip {
  id: string;
  rank: number;
  title: string;
  start: number; // in seconds
  end: number;   // in seconds
  duration: number; // in seconds
  formattedDuration: string;
  score: number; // 0 to 100
  hookType: 'question' | 'high_energy' | 'insight' | 'story_hook';
  reasoning: string;
  snippet: string;
  segments: CaptionSegment[];
}

const HOOK_STARTERS = [
  /^(why|how|what if|did you know|have you ever|can you)/i,
  /^(the biggest mistake|the secret|the truth about|here is why|stop doing)/i,
  /^(if you want to|the #1 rule|nobody talks about|this is crazy|watch this)/i,
  /^(never|always|imagine|remember when)/i,
];

const HIGH_ENGAGEMENT_WORDS = [
  'secret', 'mistake', 'money', 'hack', 'viral', 'algorithm', 'danger', 
  'truth', 'insane', 'growth', 'fast', 'never', 'power', 'crazy', 'million', 
  'millionaire', 'future', 'rule', 'strategy', 'hidden', 'genius', 'easy',
  'fix', 'problem', 'solution', 'advice', 'lesson', 'tip', 'simple'
];

/**
 * Evaluates a window of segments and returns an engagement score (0 - 100)
 */
function scoreSegmentWindow(
  segments: CaptionSegment[],
  totalWindowDuration: number
): { score: number; hookType: CandidateClip['hookType']; reasoning: string } {
  let score = 50; // Base score
  const firstText = segments[0]?.text.trim().toLowerCase() || '';
  const fullText = segments.map((s) => s.text).join(' ').toLowerCase();

  let hookType: CandidateClip['hookType'] = 'insight';
  const reasons: string[] = [];

  // 1. Hook / Opening Factor (up to +25)
  if (HOOK_STARTERS.some((regex) => regex.test(firstText))) {
    score += 25;
    hookType = 'question';
    reasons.push('Strong hook / question opening');
  } else if (firstText.includes('?')) {
    score += 18;
    hookType = 'question';
    reasons.push('Engaging question opener');
  } else if (/^(look|listen|check this out|so here|the thing is)/i.test(firstText)) {
    score += 15;
    hookType = 'high_energy';
    reasons.push('Direct attention grabber');
  }

  // 2. Keyword & Concept Density (up to +20)
  const matchedKeywords = HIGH_ENGAGEMENT_WORDS.filter((kw) => fullText.includes(kw));
  if (matchedKeywords.length >= 3) {
    score += 20;
    reasons.push(`High keyword density (${matchedKeywords.slice(0, 3).join(', ')})`);
  } else if (matchedKeywords.length >= 1) {
    score += 10;
    reasons.push(`Contains keyword: ${matchedKeywords[0]}`);
  }

  // 3. Duration Sweet Spot (20s - 45s is optimal for Shorts) (up to +15)
  if (totalWindowDuration >= 22 && totalWindowDuration <= 45) {
    score += 15;
    reasons.push(`Optimal Short length (${Math.round(totalWindowDuration)}s)`);
  } else if (totalWindowDuration >= 15 && totalWindowDuration <= 60) {
    score += 8;
  } else {
    score -= 15; // Too short or too long
  }

  // 4. Sentence Completeness (Doesn't end on dangling comma/conjunction) (up to +15)
  const lastText = segments[segments.length - 1]?.text.trim() || '';
  if (/[.!?]$/.test(lastText)) {
    score += 15;
    reasons.push('Clean thought & sentence completion');
  } else if (!/[,;&\b(and|or|but|because)\b]$/i.test(lastText)) {
    score += 8;
  } else {
    score -= 10;
  }

  // Normalize score between 40 and 99
  const finalScore = Math.min(99, Math.max(40, score));

  return {
    score: finalScore,
    hookType,
    reasoning: reasons.join(' • ') || 'Natural conversation segment',
  };
}

/**
 * Automatic AI Clip Selector
 * Scans video transcript segments and selects top 3-5 candidate Shorts
 */
export function selectCandidateClips(
  segments: CaptionSegment[],
  totalDuration: number,
  targetClipDuration: number = 30
): CandidateClip[] {
  if (!segments || segments.length === 0) return [];

  const candidates: CandidateClip[] = [];
  const minClipDuration = 18;
  const maxClipDuration = 55;

  // If entire video is under maxClipDuration, return the single full video as candidate
  if (totalDuration <= maxClipDuration) {
    const fullText = segments.map((s) => s.text).join(' ');
    const { score, hookType, reasoning } = scoreSegmentWindow(segments, totalDuration);

    return [
      {
        id: 'clip-1',
        rank: 1,
        title: generateClipTitle(fullText, 1),
        start: 0,
        end: totalDuration,
        duration: totalDuration,
        formattedDuration: formatTime(totalDuration),
        score,
        hookType,
        reasoning,
        snippet: fullText.slice(0, 120) + (fullText.length > 120 ? '...' : ''),
        segments,
      },
    ];
  }

  // Sliding window across segments to find top candidate moments
  const stride = Math.max(1, Math.floor(segments.length / 12));

  for (let i = 0; i < segments.length; i += stride) {
    let windowSegments: CaptionSegment[] = [];
    let start = segments[i].start;
    let end = start;

    for (let j = i; j < segments.length; j++) {
      windowSegments.push(segments[j]);
      end = segments[j].end;
      const currentDuration = end - start;

      // When we hit a good window duration (25s - 45s) or end on a period
      if (currentDuration >= minClipDuration) {
        const lastText = segments[j].text.trim();
        const isSentenceEnd = /[.!?]$/.test(lastText);

        if (currentDuration >= targetClipDuration || isSentenceEnd || currentDuration >= maxClipDuration) {
          const { score, hookType, reasoning } = scoreSegmentWindow(windowSegments, currentDuration);
          const fullText = windowSegments.map((s) => s.text).join(' ');

          // Prevent overlapping candidates with very close start times (within 12s)
          const isOverlapping = candidates.some(
            (c) => Math.abs(c.start - start) < 12 || Math.abs(c.end - end) < 12
          );

          if (!isOverlapping && fullText.trim().length > 30) {
            candidates.push({
              id: `clip-${candidates.length + 1}`,
              rank: 0,
              title: generateClipTitle(fullText, candidates.length + 1),
              start: Number(start.toFixed(1)),
              end: Number(end.toFixed(1)),
              duration: Number(currentDuration.toFixed(1)),
              formattedDuration: formatTime(currentDuration),
              score,
              hookType,
              reasoning,
              snippet: fullText.slice(0, 110) + '...',
              segments: [...windowSegments],
            });
          }
          break;
        }
      }
    }
  }

  // Sort candidates by score descending
  candidates.sort((a, b) => b.score - a.score);

  // Take top 3 to 5 candidate clips and assign rank
  const topCandidates = candidates.slice(0, 4).map((clip, index) => ({
    ...clip,
    rank: index + 1,
  }));

  // If no good multi-sentence windows found, fallback to 2 split halves
  if (topCandidates.length === 0 && totalDuration > 30) {
    const mid = Math.floor(totalDuration / 2);
    const segs1 = segments.filter((s) => s.end <= mid);
    const segs2 = segments.filter((s) => s.start >= mid);

    return [
      {
        id: 'clip-1',
        rank: 1,
        title: 'Highlight Moment (Part 1)',
        start: 0,
        end: mid,
        duration: mid,
        formattedDuration: formatTime(mid),
        score: 85,
        hookType: 'high_energy',
        reasoning: 'Primary hook & opening thought',
        snippet: segs1.map((s) => s.text).join(' ').slice(0, 100) + '...',
        segments: segs1,
      },
      {
        id: 'clip-2',
        rank: 2,
        title: 'Key Takeaway (Part 2)',
        start: mid,
        end: totalDuration,
        duration: totalDuration - mid,
        formattedDuration: formatTime(totalDuration - mid),
        score: 78,
        hookType: 'insight',
        reasoning: 'Climax & concluding insights',
        snippet: segs2.map((s) => s.text).join(' ').slice(0, 100) + '...',
        segments: segs2,
      },
    ];
  }

  return topCandidates;
}

function generateClipTitle(text: string, index: number): string {
  const clean = text.trim();
  const firstWords = clean.split(/\s+/).slice(0, 6).join(' ');
  
  if (firstWords.length > 5) {
    // Capitalize first letter
    const formatted = firstWords.charAt(0).toUpperCase() + firstWords.slice(1);
    return `"${formatted}..."`;
  }
  return `Candidate Short #${index}`;
}
