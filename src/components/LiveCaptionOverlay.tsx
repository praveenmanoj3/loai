import React, { useState, useEffect, useRef } from 'react';
import { type CaptionSegment, computeWordTimings } from '../services/subtitleUtils';
import { type CaptionStyle, isPowerWord } from '../services/captionStyles';

interface LiveCaptionOverlayProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  segments: CaptionSegment[];
  style: CaptionStyle;
}

export const LiveCaptionOverlay: React.FC<LiveCaptionOverlayProps> = ({
  videoRef,
  segments,
  style,
}) => {
  const [activeSeg, setActiveSeg] = useState<CaptionSegment | null>(null);
  const [activeWordIndex, setActiveWordIndex] = useState<number>(0);
  const rafRef = useRef<number>(0);
  const isRunningRef = useRef<boolean>(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || segments.length === 0) {
      setActiveSeg(null);
      return;
    }

    const tick = () => {
      const time = video.currentTime;

      // Find segment whose window contains current time
      const foundSeg = segments.find((seg) => time >= seg.start && time < seg.end + 0.15);

      if (foundSeg) {
        setActiveSeg(foundSeg);

        const wordTimings = computeWordTimings(foundSeg);

        // "Last started word" approach: find the rightmost word that has already begun.
        // This is more reliable than exact range matching and has zero artificial offset.
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

      if (isRunningRef.current) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };

    const startLoop = () => {
      if (!isRunningRef.current) {
        isRunningRef.current = true;
        rafRef.current = requestAnimationFrame(tick);
      }
    };

    const stopLoop = () => {
      isRunningRef.current = false;
      cancelAnimationFrame(rafRef.current);
    };

    const handlePlay = () => startLoop();
    const handlePause = () => stopLoop();
    const handleEnded = () => stopLoop();
    // On seek, immediately refresh once even if paused
    const handleSeeked = () => tick();

    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('ended', handleEnded);
    video.addEventListener('seeked', handleSeeked);

    // Bootstrap if video is already playing when this effect runs
    if (!video.paused && !video.ended) {
      startLoop();
    } else {
      // Still run once to set initial state for current position
      tick();
    }

    return () => {
      stopLoop();
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('ended', handleEnded);
      video.removeEventListener('seeked', handleSeeked);
    };
  }, [videoRef, segments, style]);

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

  // Word-Pop Mode: show only active word or 2-word punch in massive centered format
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
          className="font-black leading-tight inline-block select-none transform animate-in zoom-in-90 duration-75"
        >
          {currentWord}
        </span>
      </div>
    );
  }

  // Karaoke Glow & Power Word Modes: render full phrase with live active word highlighting
  return (
    <div
      className={`absolute left-0 right-0 px-4 pointer-events-none z-20 flex justify-center text-center transition-all duration-100 ${getPositionClass()}`}
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
            wordColor = '#FF8A00'; // Subtle fiery accent for power words when not active
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
                transition: 'color 0.1s ease, transform 0.1s ease, text-shadow 0.1s ease',
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
