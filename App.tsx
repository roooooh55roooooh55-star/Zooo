
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

const cacheVideoContent = async (url: string) => {
  try {
    const cache = await caches.open('hadiqa-turbo-v2');
    const cachedResponse = await cache.match(url);
    if (!cachedResponse) {
      const response = await fetch(url);
      if (response.ok) {
        await cache.put(url, response.clone());
      }
    }
  } catch (e) {}
};

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
  const [rawVideos, setRawVideos] = useState<Video[]>([]); 
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedShort, setSelectedShort] = useState<{ video: Video, list: Video[] } | null>(null);
  const [selectedLong, setSelectedLong] = useState<{ video: Video, list: Video[], autoNext: boolean } | null>(null);
  
  const [sessionNonce, setSessionNonce] = useState(() => Math.random()); 
  const [pullDistance, setPullDistance] = useState(0);
  const touchStart = useRef<number>(0);

  const [interactions, setInteractions] = useState<UserInteractions>(() => {
    const saved = localStorage.getItem('al-hadiqa-interactions');
    return saved ? JSON.parse(saved) : { likedIds: [], dislikedIds: [], savedIds: [], watchHistory: [] };
  });

  useEffect(() => {
    localStorage.setItem('al-hadiqa-interactions', JSON.stringify(interactions));
  }, [interactions]);

  const loadData = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const data = await fetchVideos(undefined, 500); 
      if (data && data.length > 0) {
        setRawVideos(prev => {
          const prevIds = new Set(prev.map(v => v.id || v.video_url));
          const newOnes = data.filter(v => !prevIds.has(v.id || v.video_url));
          
          const pool = [...newOnes, ...prev];
          pool.slice(0, 40).forEach(v => cacheVideoContent(v.video_url));
          
          return pool; 
        });
      }
    } catch (err) {
      console.error("Sync Error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setPullDistance(0);
    }
  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(() => loadData(true), 20000);
    return () => clearInterval(interval);
  }, [loadData]);

  // منطق اختيار الفيديوهات للواجهة: استبعاد المشاهد بالكامل، وعمل خلط عشوائي لكل جلسة
  const homeVideos = useMemo(() => {
    const filtered = rawVideos.filter(v => {
      const vidId = v.id || v.video_url;
      const isDisliked = interactions.dislikedIds.includes(vidId);
      const isSeenFull = interactions.watchHistory.some(h => h.id === vidId && h.progress > 0.95);
      return !isDisliked && !isSeenFull;
    });
    
    // خلط الفيديوهات المتاحة لضمان ظهور محتوى "جديد" أو "مختلف" عند كل فتح للتطبيق
    return shuffleArray(filtered);
  }, [rawVideos, interactions, sessionNonce]);

  const handleToggleLike = async (id: string) => {
    const isLiked = interactions.likedIds.includes(id);
    setInteractions(prev => ({
      ...prev,
      likedIds: isLiked ? prev.likedIds.filter(v => v !== id) : [...prev.likedIds, id]
    }));
    try { await updateLikesInDB(id, !isLiked); } catch (e) {}
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
        return <SavedPage savedIds={interactions.savedIds} allVideos={rawVideos} onPlayShort={(v, list) => setSelectedShort({ video: v, list })} onPlayLong={(v) => setSelectedLong({ video: v, list: rawVideos.filter(vid => interactions.savedIds.includes(vid.id || vid.video_url)), autoNext: true })} title="المحفوظات" />;
      case AppView.LIKES:
        return <SavedPage savedIds={interactions.likedIds} allVideos={rawVideos} onPlayShort={(v, list) => setSelectedShort({ video: v, list })} onPlayLong={(v) => setSelectedLong({ video: v, list: rawVideos.filter(vid => interactions.likedIds.includes(vid.id || vid.video_url)), autoNext: true })} title="الإعجابات" />;
      case AppView.UNWATCHED:
        return <UnwatchedPage watchHistory={interactions.watchHistory} allVideos={rawVideos} onPlayShort={(v, list) => setSelectedShort({ video: v, list })} onPlayLong={(v) => setSelectedLong({ video: v, list: rawVideos.filter(vid => vid.type === 'long'), autoNext: true })} />;
      case AppView.HIDDEN:
        return <HiddenVideosPage interactions={interactions} allVideos={rawVideos} onRestore={(id) => setInteractions(p => ({ ...p, dislikedIds: p.dislikedIds.filter(v => v !== id) }))} onPlayShort={(v, list) => setSelectedShort({ video: v, list })} onPlayLong={(v) => setSelectedLong({ video: v, list: [v], autoNext: false })} />;
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
      className="min-h-screen pb-20 max-w-md mx-auto relative bg-[#050505]"
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
          setSessionNonce(Math.random());
          loadData();
        } else setPullDistance(0);
        touchStart.current = 0;
      }}
    >
      <AppBar onViewChange={setCurrentView} onRefresh={() => { setSessionNonce(Math.random()); loadData(); }} currentView={currentView} />
      
      <div className="fixed left-0 right-0 z-[60] flex justify-center transition-all pointer-events-none" style={{ top: `${pullDistance + 10}px`, opacity: pullDistance / 60 }}>
        <div className={`p-2 bg-red-600 rounded-full shadow-[0_0_20px_red] ${refreshing ? 'animate-spin' : ''}`}>
          <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
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
          onDislike={(id) => setInteractions(prev => ({ ...prev, dislikedIds: [...prev.dislikedIds, id] }))} 
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
          onDislike={() => setInteractions(prev => ({ ...prev, dislikedIds: [...prev.dislikedIds, (selectedLong.video.id || selectedLong.video.video_url)] }))}
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
