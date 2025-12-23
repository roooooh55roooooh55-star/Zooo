
import React from 'react';
import { AppView } from '../types';

interface AppBarProps {
  onViewChange: (view: AppView) => void;
  onRefresh: () => void;
  currentView: AppView;
}

const AppBar: React.FC<AppBarProps> = ({ onViewChange, onRefresh, currentView }) => {
  const channelId = 'UCDc_3d066uDWC3ljZTccKUg';
  const youtubeWebUrl = `https://www.youtube.com/channel/${channelId}?si=spOUUwvDeudYtwEr`;

  const handleYouTubeClick = (e: React.MouseEvent) => {
    e.preventDefault();
    
    const isAndroid = /Android/i.test(navigator.userAgent);
    const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);

    if (isAndroid) {
      // محاولة فتح التطبيق مباشرة في أندرويد باستخدام Intent
      const intentUrl = `intent://www.youtube.com/channel/${channelId}#Intent;package=com.google.android.youtube;scheme=https;end`;
      window.location.href = intentUrl;
    } else if (isIOS) {
      // محاولة فتح البروتوكول المخصص لـ iOS
      const appUrl = `youtube://www.youtube.com/channel/${channelId}`;
      window.location.href = appUrl;
      
      // التوجه للمتصفح كبديل بعد فترة قصيرة إذا لم يفتح التطبيق
      setTimeout(() => {
        window.open(youtubeWebUrl, '_blank');
      }, 500);
    } else {
      // أجهزة الكمبيوتر تفتح المتصفح كالمعتاد
      window.open(youtubeWebUrl, '_blank');
    }
  };

  return (
    <header className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-[#0f0f0f]/95 backdrop-blur-md z-50 border-b border-white/10 px-4 py-2 flex items-center justify-between shadow-[0_4px_20px_rgba(0,0,0,0.5)]">
      <div className="flex items-center gap-1.5">
        <button 
          onClick={() => onViewChange(AppView.TREND)}
          className={`px-3 py-2 rounded-xl text-[10px] font-bold transition-all border ${currentView === AppView.TREND ? 'bg-red-600 text-white shadow-[0_0_20px_rgba(220,38,38,0.7)] border-red-400' : 'bg-red-600/10 text-red-500 border-red-600/20 shadow-[0_0_10px_rgba(220,38,38,0.2)]'}`}
        >
          الترند
        </button>
        
        <button 
          onClick={() => onViewChange(AppView.LIKES)}
          className={`p-2.5 rounded-xl transition-all border ${currentView === AppView.LIKES ? 'bg-blue-600/30 border-blue-400 text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.6)]' : 'border-white/5 bg-white/5 text-blue-500/70 shadow-[0_0_5px_rgba(59,130,246,0.1)]'}`}
        >
          <svg className="w-5 h-5" fill={currentView === AppView.LIKES ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3zM7 22H4a2 2 0 01-2-2v-7a2 2 0 012-2h3"/></svg>
        </button>

        <button 
          onClick={() => onViewChange(AppView.HIDDEN)}
          className={`p-2.5 rounded-xl transition-all border ${currentView === AppView.HIDDEN ? 'bg-red-600/30 border-red-500 text-red-500 shadow-[0_0_15px_rgba(239,68,68,0.5)]' : 'border-white/5 bg-white/5 text-gray-500 shadow-none'}`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
            <path d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
          </svg>
        </button>
      </div>

      <button 
        onClick={() => { onViewChange(AppView.HOME); onRefresh(); }}
        className="w-11 h-11 rounded-full overflow-hidden border-2 border-red-600 shadow-[0_0_15px_rgba(220,38,38,0.5)] active:scale-90 transition-transform bg-black"
      >
        <img src="https://i.top4top.io/p_3643ksmii1.jpg" alt="الحديقة" className="w-full h-full object-cover" />
      </button>

      <div className="flex items-center gap-1.5">
        <button 
          onClick={() => onViewChange(AppView.SAVED)}
          className={`p-2.5 rounded-xl transition-all border ${currentView === AppView.SAVED ? 'bg-yellow-500/30 border-yellow-500 text-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.6)]' : 'border-white/5 bg-white/5 text-yellow-500/70'}`}
        >
          <svg className="w-5 h-5" fill={currentView === AppView.SAVED ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"/></svg>
        </button>

        <button 
          onClick={handleYouTubeClick}
          className="p-2.5 rounded-xl border border-red-600/20 bg-red-600/5 text-red-600 shadow-[0_0_10px_rgba(220,38,38,0.2)] active:scale-95 transition-transform"
        >
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 4-8 4z"/></svg>
        </button>

        <button 
          onClick={() => onViewChange(AppView.PRIVACY)}
          className={`p-2.5 rounded-xl transition-all border ${currentView === AppView.PRIVACY ? 'bg-red-600/30 border-red-500 text-white shadow-[0_0_15px_rgba(239,68,68,0.5)]' : 'border-white/5 bg-white/5 text-red-500/70'}`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
        </button>
      </div>
    </header>
  );
};

export default AppBar;
