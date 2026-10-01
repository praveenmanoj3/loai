import React, { useState, useEffect } from 'react';
import type { CaptionSegment } from '../services/subtitleUtils';
import type { CaptionStyle } from '../services/captionStyles';

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
  const [currentText, setCurrentText] = useState<string | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || segments.length === 0) {
      setCurrentText(null);
      return;
    }

    const handleTimeUpdate = () => {
      const time = video.currentTime;
      const activeSeg = segments.find((seg) => time >= seg.start && time <= seg.end);
      if (activeSeg) {
        let text = activeSeg.text.trim();
        if (style.textTransform === 'uppercase') {
          text = text.toUpperCase();
        }
        setCurrentText(text);
      } else {
        setCurrentText(null);
      }
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
    };
  }, [videoRef, segments, style]);

  if (!currentText) return null;

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

  return (
    <div
      className={`absolute left-0 right-0 px-4 pointer-events-none z-20 flex justify-center text-center transition-all duration-100 ${getPositionClass()}`}
    >
      <span
        style={{
          fontFamily: style.fontFamily,
          fontSize: `${Math.max(16, Math.min(28, style.fontSize * 0.45))}px`,
          color: style.textColor,
          WebkitTextStroke:
            style.strokeWidth > 0
              ? `${Math.max(1, style.strokeWidth * 0.6)}px ${style.strokeColor}`
              : undefined,
          textShadow:
            style.strokeWidth > 0
              ? `0 2px 10px rgba(0,0,0,0.9)`
              : '0 2px 6px rgba(0,0,0,0.8)',
          backgroundColor: style.backgroundColor,
          padding: style.backgroundColor !== 'transparent' ? '4px 12px' : undefined,
          borderRadius: style.backgroundColor !== 'transparent' ? '6px' : undefined,
          letterSpacing: style.fontFamily === 'Impact' ? '0.5px' : 'normal',
        }}
        className="font-black leading-tight max-w-[90%] inline-block select-none animate-in fade-in zoom-in-95 duration-100"
      >
        {currentText}
      </span>
    </div>
  );
};
