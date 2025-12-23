
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Video, AppView, UserInteractions } from './types.ts';
import { fetchVideos, updateLikesInDB } from './supabaseClient.ts';
import AppBar from './components/AppBar.tsx';
import MainContent from './components/MainContent.tsx';
import ShortsPlayerOverlay from './components/ShortsPlayerOverlay.tsx';
import LongPlayerOverlay from './components/LongPlayerOverlay.tsx';
import TrendPage from './components/TrendPage.tsx';
import SavedPage from './components/SavedPage.tsx';
import UnwatchedPage from './components/UnwatchedPage.tsx';
import PrivacyPage from './components/PrivacyPage.tsx';
import HiddenVideosPage from './components/HiddenVideosPage.tsx';
import AIOracle from './components/AIOracle.tsx';

const shuffleArray = (array: any[]) => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<AppView>(AppView.HOME);
  const [rawVideos, setRawVideos] = useState<Video[]>([]); // المخزن الشامل لكل الفيديوهات
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedShort, setSelectedShort] = useState<{ video: Video, list: Video[] } | null>(null);
  const [selectedLong, setSelectedLong] = useState<{ video: Video, list: Video[], autoNext: boolean } | null>(null);
  
  const [sessionNonce, setSessionNonce] = useState(0); // مفتاح لتغيير الترتيب عند السحب
  const [pullDistance, setPullDistance] = useState(0);
  const touchStart = useRef<number>(0);

  const [interactions, setInteractions] = useState<UserInteractions>(() => {
    const saved = localStorage.getItem('al-hadiqa-interactions');
    return saved ? JSON.parse(saved) : { likedIds: [], dislikedIds: [], savedIds: [], watchHistory: [] };
  });

  // حماية المحتوى
  useEffect(() => {
    const preventAction = (e: Event) => e.preventDefault();
    document.addEventListener('contextmenu', preventAction);
    document.addEventListener('copy', preventAction);
    document.addEventListener('cut', preventAction);
    document.addEventListener('dragstart', preventAction);
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && ['c', 'v', 'u', 's', 'p', 'a'].includes(e.key)) e.preventDefault();
      if (e.key === 'F12') e.preventDefault();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('contextmenu', preventAction);
      document.removeEventListener('copy', preventAction);
      document.removeEventListener('cut', preventAction);
      document.removeEventListener('dragstart', preventAction);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  useEffect(() => {
    localStorage.setItem('al-hadiqa-interactions', JSON.stringify(interactions));
  }, [interactions]);

  const loadData = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const data = await fetchVideos(undefined, 300);
      if (data && data.length > 0) {
        setRawVideos(prev => {
          const prevIds = new Set(prev.map(v => v.id || v.video_url));
          const newVideos = data.filter(v => !prevIds.has(v.id || v.video_url));
          return [...newVideos, ...prev]; // دمج الجديد في الأعلى
        });
      }
    } catch (err) {
      console.error("Fetch Error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setPullDistance(0);
    }
  }, []);

  // تحديث مستمر كل 15 ثانية لجلب الجديد من المستودع
  useEffect(() => {
    loadData();
    const interval = setInterval(() => loadData(true), 15000);
    return () => clearInterval(interval);
  }, [loadData]);

  // تصفية الفيديوهات للواجهة الرئيسية (HOME)
  const homeVideos = useMemo(() => {
    const filtered = rawVideos.filter(v => {
      const vidId = v.id || v.video_url;
      const isLiked = interactions.likedIds.includes(vidId);
      const isDisliked = interactions.dislikedIds.includes(vidId);
      const isSeenFull = interactions.watchHistory.some(h => h.id === vidId && h.progress > 0.95);
      return !isLiked && !isDisliked && !isSeenFull;
    });
    // إعادة الترتيب عند السحب للأسفل
    return sessionNonce > 0 ? shuffleArray(filtered) : filtered;
  }, [rawVideos, interactions, sessionNonce]);

  const handleToggleLike = async (id: string) => {
    const isLiked = interactions.likedIds.includes(id);
    setInteractions(prev => ({
      ...prev,
      likedIds: isLiked ? prev.likedIds.filter(v => v !== id) : [...prev.likedIds, id],
      dislikedIds: prev.dislikedIds.filter(v => v !== id)
    }));
    try { await updateLikesInDB(id, !isLiked); } catch (e) {}
  };

  const handleToggleDislike = (id: string) => {
    setInteractions(prev => ({
      ...prev,
      dislikedIds: prev.dislikedIds.includes(id) ? prev.dislikedIds.filter(v => v !== id) : [...prev.dislikedIds, id],
      likedIds: prev.likedIds.filter(v => v !== id)
    }));
  };

  const updateWatchHistory = (id: string, progress: number) => {
    setInteractions(prev => {
      const history = [...prev.watchHistory];
      const index = history.findIndex(h => h.id === id);
      if (index > -1) { history[index].progress = progress; } 
      else { history.push({ id, progress }); }
      return { ...prev, watchHistory: history };
    });
  };

  const renderContent = () => {
    switch (currentView) {
      case AppView.TREND:
        return <TrendPage onPlayShort={(v, list) => setSelectedShort({ video: v, list })} onPlayLong={(v) => setSelectedLong({ video: v, list: rawVideos.filter(vid => vid.type === 'long'), autoNext: true })} excludedIds={interactions.dislikedIds} />;
      case AppView.SAVED:
        return <SavedPage savedIds={interactions.savedIds} allVideos={rawVideos} onPlayShort={(v, list) => setSelectedShort({ video: v, list })} onPlayLong={(v) => setSelectedLong({ video: v, list: rawVideos.filter(vid => interactions.savedIds.includes(vid.id || vid.video_url)), autoNext: true })} />;
      case AppView.LIKES:
        return <SavedPage savedIds={interactions.likedIds} allVideos={rawVideos} onPlayShort={(v, list) => setSelectedShort({ video: v, list })} onPlayLong={(v) => setSelectedLong({ video: v, list: rawVideos.filter(vid => interactions.likedIds.includes(vid.id || vid.video_url)), autoNext: true })} title="الإعجابات" />;
      case AppView.UNWATCHED:
        return <UnwatchedPage watchHistory={interactions.watchHistory} allVideos={rawVideos} onPlayShort={(v, list) => setSelectedShort({ video: v, list })} onPlayLong={(v) => setSelectedLong({ video: v, list: rawVideos.filter(vid => vid.type === 'long'), autoNext: true })} />;
      case AppView.HIDDEN:
        return <HiddenVideosPage interactions={interactions} allVideos={rawVideos} onRestore={handleToggleDislike} onPlayShort={(v, list) => setSelectedShort({ video: v, list })} onPlayLong={(v) => setSelectedLong({ video: v, list: [v], autoNext: false })} />;
      case AppView.PRIVACY:
        return <PrivacyPage />;
      default:
        return (
          <MainContent 
            videos={homeVideos} 
            interactions={interactions}
            onPlayShort={(v, list) => setSelectedShort({ video: v, list })}
            onPlayLong={(v, autoNext = false) => setSelectedLong({ video: v, list: rawVideos.filter(vid => vid.type === 'long'), autoNext })}
            onViewUnwatched={() => setCurrentView(AppView.UNWATCHED)}
            loading={loading && rawVideos.length === 0}
          />
        );
    }
  };

  return (
    <div 
      className="min-h-screen pb-20 max-w-md mx-auto relative bg-[#0f0f0f] shadow-2xl overflow-x-hidden"
      onTouchStart={(e) => { if (window.scrollY === 0) touchStart.current = e.touches[0].clientY; }}
      onTouchMove={(e) => {
        if (window.scrollY === 0 && touchStart.current > 0) {
          const diff = e.touches[0].clientY - touchStart.current;
          if (diff > 0) setPullDistance(Math.min(diff / 2, 80));
        }
      }}
      onTouchEnd={() => {
        if (pullDistance > 60) {
          setRefreshing(true);
          setSessionNonce(prev => prev + 1);
          loadData();
        } else setPullDistance(0);
        touchStart.current = 0;
      }}
    >
      <AppBar onViewChange={setCurrentView} onRefresh={() => { setSessionNonce(n => n+1); loadData(); }} currentView={currentView} />
      
      <div className="fixed left-0 right-0 z-40 flex justify-center transition-all pointer-events-none" style={{ top: `${pullDistance + 10}px`, opacity: pullDistance / 60 }}>
        <div className={`p-2 bg-red-600 rounded-full shadow-lg ${refreshing ? 'animate-spin' : ''}`}>
          <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
        </div>
      </div>

      <main className="pt-24 px-4">{renderContent()}</main>
      <AIOracle />
      
      {selectedShort && (
        <ShortsPlayerOverlay 
          initialVideo={selectedShort.video} 
          videoList={selectedShort.list} 
          interactions={interactions}
          onClose={() => setSelectedShort(null)} 
          onLike={handleToggleLike} 
          onDislike={handleToggleDislike} 
          onSave={(id) => setInteractions(prev => ({ ...prev, savedIds: prev.savedIds.includes(id) ? prev.savedIds.filter(v => v !== id) : [...prev.savedIds, id] }))} 
          onProgress={updateWatchHistory}
          onAllEnded={() => setSelectedShort(null)}
        />
      )}

      {selectedLong && (
        <LongPlayerOverlay 
          video={selectedLong.video} 
          onClose={() => setSelectedLong(null)}
          onLike={() => handleToggleLike(selectedLong.video.id || selectedLong.video.video_url)}
          onDislike={() => handleToggleDislike(selectedLong.video.id || selectedLong.video.video_url)}
          onSave={() => setInteractions(prev => {
            const id = selectedLong.video.id || selectedLong.video.video_url;
            return { ...prev, savedIds: prev.savedIds.includes(id) ? prev.savedIds.filter(v => v !== id) : [...prev.savedIds, id] };
          })}
          onNext={() => {}} 
          onPrev={() => {}} 
          isLiked={interactions.likedIds.includes(selectedLong.video.id || selectedLong.video.video_url)}
          isDisliked={interactions.dislikedIds.includes(selectedLong.video.id || selectedLong.video.video_url)}
          isSaved={interactions.savedIds.includes(selectedLong.video.id || selectedLong.video.video_url)}
          onProgress={(p) => updateWatchHistory(selectedLong.video.id || selectedLong.video.video_url, p)}
          onEnded={selectedLong.autoNext ? () => {} : undefined}
        />
      )}
    </div>
  );
};

export default App;
