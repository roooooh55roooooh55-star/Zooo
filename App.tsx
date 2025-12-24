
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Video, AppView, UserInteractions } from './types.ts';
import { fetchCloudinaryVideos } from './cloudinaryClient.ts';
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
import AdminDashboard from './components/AdminDashboard.tsx';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<AppView>(AppView.HOME);
  const [rawVideos, setRawVideos] = useState<Video[]>([]); 
  const [loading, setLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0); 
  const [selectedShort, setSelectedShort] = useState<{ video: Video, list: Video[] } | null>(null);
  const [selectedLong, setSelectedLong] = useState<{ video: Video, list: Video[] } | null>(null);

  // إدارة رمز العبور
  const [adminPassword, setAdminPassword] = useState(() => {
    return localStorage.getItem('al-hadiqa-admin-pass') || '506070';
  });

  const [interactions, setInteractions] = useState<UserInteractions>(() => {
    const saved = localStorage.getItem('al-hadiqa-interactions');
    return saved ? JSON.parse(saved) : { likedIds: [], dislikedIds: [], savedIds: [], watchHistory: [] };
  });

  useEffect(() => {
    localStorage.setItem('al-hadiqa-interactions', JSON.stringify(interactions));
  }, [interactions]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchCloudinaryVideos();
      setRawVideos(data);
    } catch (err) {
      console.error("Sync Error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const updateWatchHistory = (id: string, progress: number) => {
    setInteractions(prev => {
      const history = [...prev.watchHistory];
      const index = history.findIndex(h => h.id === id);
      if (index > -1) { 
        if (progress > history[index].progress) history[index].progress = progress; 
      } 
      else { history.push({ id, progress }); }
      return { ...prev, watchHistory: history };
    });
  };

  const handleRefreshFeed = useCallback(() => {
    setRefreshTrigger(prev => prev + 1);
    loadData();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [loadData]);

  const handleVerifyAdmin = () => {
    const pass = window.prompt("أدخل رمز عبور المطور لفتح البوابة:");
    if (pass === adminPassword) {
      setCurrentView(AppView.ADMIN);
    } else if (pass !== null) {
      alert("الرمز خاطئ.. الأرواح ترفض دخولك.");
    }
  };

  const updateAdminPassword = (newPass: string) => {
    setAdminPassword(newPass);
    localStorage.setItem('al-hadiqa-admin-pass', newPass);
  };

  const homeVideos = useMemo(() => {
    if (rawVideos.length === 0) return [];
    return rawVideos.filter(v => !interactions.dislikedIds.includes(v.id));
  }, [rawVideos, interactions.dislikedIds]);

  const renderContent = () => {
    if (loading && rawVideos.length === 0) return (
      <div className="flex flex-col items-center justify-center p-20 min-h-[50vh]">
        <div className="w-12 h-12 border-4 border-red-600 border-t-transparent rounded-full animate-spin shadow-[0_0_25px_red]"></div>
        <p className="text-red-500 font-black mt-8 text-xs animate-pulse tracking-[0.3em]">CLOUD SYNC...</p>
      </div>
    );

    switch (currentView) {
      case AppView.TREND:
        return <TrendPage onPlayShort={(v, l) => setSelectedShort({video:v, list:l})} onPlayLong={(v) => setSelectedLong({video:v, list:rawVideos})} excludedIds={interactions.dislikedIds} />;
      case AppView.SAVED:
        return <SavedPage savedIds={interactions.savedIds} allVideos={rawVideos} onPlayShort={(v, l) => setSelectedShort({video:v, list:l})} onPlayLong={(v) => setSelectedLong({video:v, list:rawVideos})} title="المحفوظات" />;
      case AppView.LIKES:
        return <SavedPage savedIds={interactions.likedIds} allVideos={rawVideos} onPlayShort={(v, l) => setSelectedShort({video:v, list:l})} onPlayLong={(v) => setSelectedLong({video:v, list:rawVideos})} title="الإعجابات" />;
      case AppView.UNWATCHED:
        return <UnwatchedPage watchHistory={interactions.watchHistory} allVideos={rawVideos} onPlayShort={(v, l) => setSelectedShort({video:v, list:l})} onPlayLong={(v) => setSelectedLong({video:v, list:rawVideos})} />;
      case AppView.PRIVACY:
        return <PrivacyPage onOpenAdmin={handleVerifyAdmin} />;
      case AppView.HIDDEN:
        return <HiddenVideosPage interactions={interactions} allVideos={rawVideos} onRestore={(id) => setInteractions(p=>({...p, dislikedIds: p.dislikedIds.filter(d=>d!==id)}))} onPlayShort={(v, l) => setSelectedShort({video:v, list:l})} onPlayLong={(v) => setSelectedLong({video:v, list:rawVideos})} />;
      case AppView.ADMIN:
        return <AdminDashboard onClose={() => setCurrentView(AppView.HOME)} currentPassword={adminPassword} onUpdatePassword={updateAdminPassword} />;
      default:
        return (
          <MainContent 
            key={refreshTrigger} 
            videos={homeVideos} 
            interactions={interactions}
            onPlayShort={(v, l) => setSelectedShort({video:v, list:l})}
            onPlayLong={(v, l) => setSelectedLong({video:v, list:l})}
            onViewUnwatched={() => setCurrentView(AppView.UNWATCHED)}
            onResetHistory={handleRefreshFeed}
            onTurboCache={handleRefreshFeed}
            cacheStatus="idle"
            loading={loading}
          />
        );
    }
  };

  return (
    <div className="min-h-screen pb-4 max-w-md mx-auto relative bg-[#050505] overflow-x-hidden">
      <AppBar onViewChange={setCurrentView} onRefresh={handleRefreshFeed} currentView={currentView} />
      <main className="pt-24 px-4">{renderContent()}</main>
      <AIOracle />
      
      {selectedShort && (
        <ShortsPlayerOverlay 
          initialVideo={selectedShort.video} 
          videoList={selectedShort.list} 
          interactions={interactions}
          onClose={() => setSelectedShort(null)} 
          onLike={(id) => setInteractions(p => ({...p, likedIds: Array.from(new Set([...p.likedIds, id]))}))} 
          onDislike={(id) => setInteractions(p => ({...p, dislikedIds: Array.from(new Set([...p.dislikedIds, id]))}))} 
          onSave={(id) => setInteractions(p => ({...p, savedIds: Array.from(new Set([...p.savedIds, id]))}))} 
          onProgress={updateWatchHistory}
        />
      )}

      {selectedLong && (
        <LongPlayerOverlay 
          video={selectedLong.video} 
          allLongVideos={selectedLong.list}
          onClose={() => setSelectedLong(null)}
          onLike={() => setInteractions(p => ({...p, likedIds: Array.from(new Set([...p.likedIds, selectedLong.video.id]))}))}
          onDislike={() => setInteractions(p => ({...p, dislikedIds: Array.from(new Set([...p.dislikedIds, selectedLong.video.id]))}))}
          onSave={() => setInteractions(p => ({...p, savedIds: Array.from(new Set([...p.savedIds, selectedLong.video.id]))}))}
          onSwitchVideo={(v) => setSelectedLong({ video: v, list: selectedLong.list })}
          isLiked={interactions.likedIds.includes(selectedLong.video.id)} 
          isDisliked={interactions.dislikedIds.includes(selectedLong.video.id)} 
          isSaved={interactions.savedIds.includes(selectedLong.video.id)}
          onProgress={(p) => updateWatchHistory(selectedLong.video.id, p)}
        />
      )}
    </div>
  );
};

export default App;
