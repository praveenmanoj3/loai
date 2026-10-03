import React, { useState, useEffect, useRef } from 'react';
import { type CaptionSegment } from '../services/subtitleUtils';
import { type CaptionStyle, isPowerWord } from '../services/captionStyles';

interface LiveCaptionOverlayProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  segments: CaptionSegment[];
  style: CaptionStyle;
}

interface WordTiming {
  word: string;
  start: number;
  end: number;
}

/**
 * Lightweight caption overlay.
 * Uses the HTML `timeupdate` event (fires ~4x/sec) instead of requestAnimationFrame (60fps).
 * No canvas, no frame extraction, no pixel processing.
 * Just finds the active caption segment from transcript timestamps and renders HTML text.
 */
export const LiveCaptionOverlay: React.FC<LiveCaptionOverlayProps> = ({
  videoRef,
  segments,
  style,
}) => {
  const [activeSeg, setActiveSeg] = useState<CaptionSegment | null>(null);
  const [activeWordIndex, setActiveWordIndex] = useState<number>(0);
  // Cache word timings per segment to avoid recomputing on every timeupdate
  const wordTimingsCache = useRef<Map<number, WordTiming[]>>(new Map());

  useEffect(() => {
    // Reset state when segments change
    setActiveSeg(null);
    setActiveWordIndex(0);
    wordTimingsCache.current.clear();

    const video = videoRef.current;
    if (!video || segments.length === 0) return;

    // Pre-compute word timings for all segments once
    segments.forEach((seg) => {
      if (!wordTimingsCache.current.has(seg.id)) {
        const words = seg.text.trim().split(/\s+/);
        const duration = seg.end - seg.start;
        const timings: WordTiming[] = words.map((word, idx) => {
          const wordStart = seg.start + (duration * idx) / words.length;
          const wordEnd = seg.start + (duration * (idx + 1)) / words.length;
          return { word, start: wordStart, end: wordEnd };
        });
        wordTimingsCache.current.set(seg.id, timings);
      }
    });

    const handleTimeUpdate = () => {
      const time = video.currentTime;
      const foundSeg = segments.find((seg) => time >= seg.start && time < seg.end + 0.15);

      if (foundSeg) {
        setActiveSeg(foundSeg);
        const wordTimings = wordTimingsCache.current.get(foundSeg.id) || [];
        let bestIdx = 0;
        for (let i = 0; i < wordTimings.length; i++) {
          if (time >= wordTimings[i].start) {
            bestIdx = i;
          } else {
            break;
          }
        }
        setActiveWordIndex(bestIdx);
      } else {
        setActiveSeg(null);
      }
    };

    // Also update on seek (which doesn't always fire timeupdate)
    const handleSeeked = () => handleTimeUpdate();

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('seeked', handleSeeked);

    // Run once immediately
    handleTimeUpdate();

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('seeked', handleSeeked);
    };
  }, [videoRef, segments]);

  if (!activeSeg) return null;

  let rawWords = activeSeg.text.trim().split(/\s+/);
  if (style.textTransform === 'uppercase') {
    rawWords = rawWords.map((w) => w.toUpperCase());
  }

  const getPositionClass = () => {
    switch (style.position) {
      case 'top':
        return 'top-8';
      case 'middle':
        return 'top-1/2 -translate-y-1/2';
      case 'bottom':
      default:
        return 'bottom-10';
    }
  };

  const scale = 0.45;
  const computedFontSize = Math.max(16, Math.min(32, style.fontSize * scale));

  // Word-Pop Mode: show only active word
  if (style.animationType === 'word_pop') {
    const currentWord = rawWords[activeWordIndex] || rawWords[0];
    const isPower = style.autoHighlightPowerWords && isPowerWord(currentWord);

    return (
      <div className={`absolute left-0 right-0 px-4 pointer-events-none z-20 flex justify-center text-center ${getPositionClass()}`}>
        <span
          key={activeWordIndex}
          style={{
            fontFamily: style.fontFamily,
            fontSize: `${computedFontSize * 1.35}px`,
            color: isPower ? '#FF4500' : style.highlightColor || '#FFE600',
            WebkitTextStroke:
              style.strokeWidth > 0
                ? `${Math.max(1.5, style.strokeWidth * 0.7)}px ${style.strokeColor}`
                : undefined,
            textShadow: `0 0 20px ${isPower ? 'rgba(255, 69, 0, 0.8)' : 'rgba(255, 230, 0, 0.8)'}, 0 4px 10px rgba(0,0,0,0.9)`,
            backgroundColor: style.backgroundColor,
            padding: style.backgroundColor !== 'transparent' ? '6px 16px' : undefined,
            borderRadius: style.backgroundColor !== 'transparent' ? '8px' : undefined,
            letterSpacing: style.fontFamily === 'Impact' ? '1px' : 'normal',
          }}
          className="font-black leading-tight inline-block select-none"
        >
          {currentWord}
        </span>
      </div>
    );
  }

  // Karaoke / Power Word Modes
  return (
    <div
      className={`absolute left-0 right-0 px-4 pointer-events-none z-20 flex justify-center text-center ${getPositionClass()}`}
    >
      <div
        style={{
          fontFamily: style.fontFamily,
          fontSize: `${computedFontSize}px`,
          backgroundColor: style.backgroundColor,
          padding: style.backgroundColor !== 'transparent' ? '6px 14px' : undefined,
          borderRadius: style.backgroundColor !== 'transparent' ? '8px' : undefined,
          letterSpacing: style.fontFamily === 'Impact' ? '0.5px' : 'normal',
        }}
        className="font-black leading-snug max-w-[90%] inline-flex flex-wrap justify-center gap-x-1.5 gap-y-1 select-none"
      >
        {rawWords.map((word, idx) => {
          const isCurrent = idx === activeWordIndex;
          const isPower = style.autoHighlightPowerWords && isPowerWord(word);
          const isKaraoke = style.animationType !== 'static';

          let wordColor = style.textColor;
          let textShadow = style.strokeWidth > 0 ? '0 2px 8px rgba(0,0,0,0.9)' : '0 2px 4px rgba(0,0,0,0.8)';
          let transform = 'scale(1)';

          if (isKaraoke && isCurrent) {
            wordColor = isPower ? '#FF4500' : style.highlightColor || '#FFE600';
            textShadow = `0 0 16px ${wordColor}, 0 2px 10px rgba(0,0,0,0.95)`;
            transform = 'scale(1.12)';
          } else if (isKaraoke && isPower) {
            wordColor = '#FF8A00';
          }

          return (
            <span
              key={idx}
              style={{
                color: wordColor,
                transform,
                WebkitTextStroke:
                  style.strokeWidth > 0
                    ? `${Math.max(1, style.strokeWidth * 0.6)}px ${style.strokeColor}`
                    : undefined,
                textShadow,
                transition: 'color 0.15s ease, transform 0.15s ease',
              }}
              className="inline-block"
            >
              {word}
            </span>
          );
        })}
      </div>
    </div>
  );
};
