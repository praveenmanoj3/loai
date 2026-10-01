import React, { useState, useRef } from 'react';
import { Upload, Film, FileVideo, AlertCircle } from 'lucide-react';

interface DropzoneProps {
  onVideoSelected: (file: File) => void;
}

export const Dropzone: React.FC<DropzoneProps> = ({ onVideoSelected }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateAndSelectFile = (file: File) => {
    setError(null);
    if (!file.type.startsWith('video/') && !file.name.match(/\.(mp4|mov|webm|mkv)$/i)) {
      setError('Please upload a valid video file (.mp4, .mov, .webm, .mkv)');
      return;
    }

    if (file.size > 600 * 1024 * 1024) {
      setError('For optimal browser performance during Day 1 MVP, please choose a video under 600MB.');
      return;
    }

    onVideoSelected(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndSelectFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndSelectFile(e.target.files[0]);
    }
  };

  return (
    <div className="w-full">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`group relative overflow-hidden rounded-2xl border-2 border-dashed transition-all duration-300 cursor-pointer p-8 sm:p-12 text-center ${
          isDragging
            ? 'border-indigo-500 bg-indigo-500/10 scale-[1.01]'
            : 'border-white/15 hover:border-indigo-500/50 hover:bg-white/[0.02] bg-[#10121a]/60 backdrop-blur-xl'
        }`}
      >
        {/* Subtle background glow */}
        <div className="absolute inset-0 bg-radial from-indigo-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

        <input
          ref={fileInputRef}
          type="file"
          accept="video/mp4,video/quicktime,video/webm,video/x-matroska"
          onChange={handleFileInputChange}
          className="hidden"
        />

        <div className="relative z-10 flex flex-col items-center justify-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-b from-indigo-500/20 to-indigo-500/5 border border-indigo-500/30 flex items-center justify-center text-indigo-400 group-hover:scale-110 group-hover:border-indigo-400 transition-all duration-300 shadow-lg shadow-indigo-500/10">
            <Upload className="w-7 h-7" />
          </div>

          <div className="space-y-1.5">
            <h3 className="text-xl font-bold text-white tracking-tight">
              Drop your video here, or <span className="text-indigo-400 underline underline-offset-4 decoration-indigo-400/40 group-hover:decoration-indigo-400">browse</span>
            </h3>
            <p className="text-sm text-slate-400 max-w-md mx-auto">
              Convert any widescreen or standard video into a perfect 9:16 vertical Short right inside your browser.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-white/5 border border-white/10 text-xs font-mono text-slate-300">
              <Film className="w-3 h-3 text-indigo-400" /> MP4, MOV, WEBM
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-white/5 border border-white/10 text-xs font-mono text-slate-300">
              <FileVideo className="w-3 h-3 text-emerald-400" /> 100% Local (0 upload)
            </span>
          </div>
        </div>
      </div>

      {error && (
        <div className="mt-3 flex items-center gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};
