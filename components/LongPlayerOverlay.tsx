
import React, { useRef, useEffect, useState, useMemo } from 'react';
import { Video } from '../types.ts';
import { incrementViewsInDB } from '../supabaseClient.ts';
import { getDeterministicStats, formatBigNumber } from './MainContent.tsx';

interface LongPlayerOverlayProps {
  video: Video;
  allLongVideos: Video[];
  onClose: () => void;
  onLike: () => void;
  onDislike: () => void;
  onSave: () => void;
  onSwitchVideo: (v: Video) => void;
  isLiked: boolean;
  isDisliked: boolean;
  isSaved: boolean;
  onProgress: (p: number) => void;
}

const LongPlayerOverlay: React.FC<LongPlayerOverlayProps> = ({ 
  video, allLongVideos, onClose, onLike, onDislike, onSave, onSwitchVideo, isLiked, isDisliked, isSaved, onProgress 
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  
  const suggestions = useMemo(() => {
    return allLongVideos.filter(v => (v.id || v.video_url) !== (video.id || video.video_url));
  }, [allLongVideos, video]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    
    // التركيز الكامل على هذا الفيديو ومنع تحميل أي شيء آخر
    v.preload = "auto";
    
    incrementViewsInDB(video.id || video.video_url);
    v.muted = isMuted;
    
    v.play().catch(() => {
      v.muted = true;
      v.play().catch(() => {});
    });

    const updateTime = () => { if (v.duration) onProgress(v.currentTime / v.duration); };
    
    const handleEnd = () => { 
      if (suggestions.length > 0) {
        onSwitchVideo(suggestions[0]);
      } else {
        v.currentTime = 0;
        v.play().catch(() => {});
      }
    };

    v.addEventListener('timeupdate', updateTime);
    v.addEventListener('ended', handleEnd);
    return () => {
      v.removeEventListener('timeupdate', updateTime);
      v.removeEventListener('ended', handleEnd);
    };
  }, [video, suggestions, onSwitchVideo, isMuted]);

  const toggleFullScreen = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsFullScreen(!isFullScreen);
    if (navigator.vibrate) navigator.vibrate(50);
  };

  const stats = useMemo(() => getDeterministicStats(video.video_url), [video.video_url]);

  return (
    <div 
      ref={containerRef}
      className={`fixed inset-0 bg-black z-[200] flex flex-col transition-all duration-500 overflow-hidden ${isFullScreen ? 'z-[400]' : ''}`}
    >
      <div className={`relative flex flex-col transition-all duration-500 ${isFullScreen ? 'h-full w-full' : 'h-[35dvh] mt-4 p-2'}`}>
        {/* أزرار التحكم */}
        <div className={`absolute flex justify-between items-center z-[220] transition-all duration-500 ${
          isFullScreen 
          ? 'top-0 bottom-0 left-8 flex-col py-12' 
          : 'top-4 left-4 right-4'
        }`}>
          <button 
            onClick={(e) => { e.stopPropagation(); onClose(); }} 
            className={`p-4 bg-black/60 backdrop-blur-xl rounded-2xl border-2 border-red-600 text-red-600 shadow-[0_0_20px_red] active:scale-75 transition-all ${isFullScreen ? 'rotate-90' : ''}`}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="4"><path d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
          
          <button 
            onClick={toggleFullScreen}
            className={`p-4 bg-red-600/90 backdrop-blur-xl rounded-2xl border-2 border-red-400 text-white shadow-[0_0_30px_red] active:scale-75 transition-all ${isFullScreen ? 'rotate-90' : ''}`}
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="4">
              {isFullScreen ? (
                <path d="M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"/>
              ) : (
                <path d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5"/>
              )}
            </svg>
          </button>
        </div>

        {/* حاوية الفيديو مع ميزة الدوران وملء الإطار بالكامل */}
        <div 
          className="relative w-full h-full bg-black flex items-center justify-center cursor-pointer overflow-hidden"
          onClick={() => setIsPaused(!isPaused)}
        >
          <video 
            ref={videoRef}
            src={video.video_url}
            style={isFullScreen ? {
              width: '100dvh', // العرض يطابق طول الشاشة عند الدوران
              height: '100dvw', // الطول يطابق عرض الشاشة عند الدوران
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%) rotate(90deg)',
              objectFit: 'cover', // يملأ كامل الإطار
              backgroundColor: 'black'
            } : {
              width: '100%',
              height: '100%',
              objectFit: 'contain'
            }}
            playsInline preload="auto" muted={isMuted} autoPlay
          />
          
          {isPaused && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/10 pointer-events-none">
               <svg className="w-20 h-20 text-white/30" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
            </div>
          )}
        </div>
      </div>

      {!isFullScreen && (
        <div className="flex-grow flex flex-col p-6 gap-6 overflow-hidden bg-gradient-to-t from-black via-neutral-900 to-transparent">
          <div className="flex flex-col gap-4">
            <h2 className="text-xl font-black text-right leading-tight text-white line-clamp-2">{video.title}</h2>
            <div className="flex items-center justify-between text-[11px] font-black opacity-70">
              <span className="text-blue-400">شوهد {formatBigNumber(stats.views)} مرة</span>
              <span className="text-red-500">{formatBigNumber(stats.likes)} إعجاب</span>
            </div>
            
            <div className="grid grid-cols-4 gap-4">
              <button onClick={onLike} className={`py-4 rounded-3xl border-2 transition-all flex justify-center items-center active:scale-125 ${isLiked ? 'bg-red-600 border-red-400 text-white shadow-[0_0_25px_red]' : 'bg-red-600/10 border-red-600 text-red-600 shadow-[0_0_15px_red]'}`}>
                <svg className="w-6 h-6" fill={isLiked ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3zM7 22H4a2 2 0 01-2-2v-7a2 2 0 012-2h3"/></svg>
              </button>
              
              <button onClick={onDislike} className={`py-4 rounded-3xl border-2 transition-all flex justify-center items-center active:scale-125 ${isDisliked ? 'bg-blue-600 border-blue-400 text-white shadow-[0_0_25px_blue]' : 'bg-blue-600/10 border-blue-600 text-blue-600 shadow-[0_0_15px_blue]'}`}>
                <svg className="w-6 h-6 rotate-180" fill={isDisliked ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3zM7 22H4a2 2 0 01-2-2v-7a2 2 0 012-2h3"/></svg>
              </button>

              <button onClick={onSave} className={`py-4 rounded-3xl border-2 transition-all flex justify-center items-center active:scale-125 ${isSaved ? 'bg-yellow-500 border-yellow-300 text-white shadow-[0_0_25px_yellow]' : 'bg-yellow-500/10 border-yellow-500 text-yellow-500 shadow-[0_0_15px_yellow]'}`}>
                <svg className="w-6 h-6" fill={isSaved ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"/></svg>
              </button>

              <button onClick={() => setIsMuted(!isMuted)} className={`py-4 rounded-3xl border-2 transition-all flex justify-center items-center ${isMuted ? 'bg-red-600/30 border-red-500 text-red-500' : 'bg-white/5 border-white/10 text-white'}`}>
                {isMuted ? <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M5.586 15L4 16.586V7.414L5.586 9H10l5-5v16l-5-5H5.586zM17 9l4 4m0-4l-4 4"/></svg> : <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15L4 16.586V7.414L5.586 9H10l5-5v16l-5-5H5.586z"/></svg>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LongPlayerOverlay;
