
import React, { useState, useEffect } from 'react';
import { Video } from '../types';
import { fetchCloudinaryVideos } from '../cloudinaryClient';

const LOGO_URL = "https://i.top4top.io/p_3643ksmii1.jpg";

interface AdminDashboardProps {
  onClose: () => void;
  currentPassword: string;
  onUpdatePassword: (pass: string) => void;
  categories: string[];
  onUpdateCategories: (cats: string[]) => void;
  onNewVideo?: (v: Video) => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ onClose, currentPassword, onUpdatePassword, categories, onUpdateCategories, onNewVideo }) => {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [lastUploaded, setLastUploaded] = useState<Video | null>(null);

  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadCategory, setUploadCategory] = useState(categories[0] || '');

  const loadVideos = async () => {
    setLoading(true);
    try {
      const data = await fetchCloudinaryVideos();
      setVideos(data);
    } catch (e) {
      console.error("Failed to load admin videos", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadVideos(); }, []);

  const openUploadWidget = () => {
    const cloudinary = (window as any).cloudinary;
    if (!cloudinary) {
      alert("النظام السحابي غير مستعد.. انتظر ثوانٍ.");
      return;
    }

    setIsUploading(true);
    cloudinary.openUploadWidget(
      {
        cloudName: 'dlrvn33p0',
        uploadPreset: 'Good.zooo',
        folder: 'app_videos',
        sources: ['local', 'url'],
        resourceType: 'video',
        context: { caption: uploadTitle || "بدون عنوان" },
        // التاغ 'hadiqa_v4' ضروري ليعمل نظام الجلب التلقائي الجديد
        tags: ['hadiqa_v4', uploadCategory],
        maxFiles: 1,
        secure: true,
        clientAllowedFormats: ["mp4", "mov", "avi"],
        styles: { palette: { window: "#050505", sourceBg: "#050505", windowBorder: "#FF0000", tabIcon: "#FF0000", action: "#FF0000", textLight: "#FFFFFF" } }
      },
      (error: any, result: any) => {
        if (!error && result && result.event === "success") {
          setIsUploading(false);
          
          const secureUrl = result.info.secure_url.replace('http://', 'https://');
          const newVideo: Video = {
              id: result.info.public_id,
              public_id: result.info.public_id,
              video_url: secureUrl,
              title: uploadTitle || "فيديو جديد",
              category: uploadCategory,
              type: result.info.height > result.info.width ? 'short' : 'long',
              likes: 0,
              views: 0
          };

          setLastUploaded(newVideo);
          if (onNewVideo) onNewVideo(newVideo);
          
          // تحديث القائمة فوراً وحفظها في LocalStorage
          setVideos(prev => {
            const updated = [newVideo, ...prev];
            localStorage.setItem('app_videos_cache', JSON.stringify(updated));
            return updated;
          });
          
          setUploadTitle('');
        } else if (result && result.event === "close") {
          setIsUploading(false);
        }
      }
    );
  };

  return (
    <div className="fixed inset-0 z-[300] bg-[#050505] overflow-y-auto p-6 font-sans text-right pb-32" dir="rtl">
      <div className="flex items-center justify-between mb-8 border-b border-red-600/30 pb-4">
        <div className="flex items-center gap-3">
            <img src={LOGO_URL} className="w-10 h-10 rounded-full border-2 border-red-600 shadow-[0_0_15px_red]" />
            <div className="flex flex-col">
                <h1 className="text-xl font-black text-red-600 italic leading-tight">بوابة المطور</h1>
                <span className="text-[8px] text-gray-600 font-bold uppercase tracking-widest">v4.5 Secure Upload</span>
            </div>
        </div>
        <button onClick={onClose} className="w-10 h-10 flex items-center justify-center bg-white/5 rounded-full text-red-500 border border-white/10 active:scale-90">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="3" d="M6 18L18 6M6 6l12 12"/></svg>
        </button>
      </div>

      {lastUploaded && (
        <div className="mb-10 animate-in zoom-in fade-in duration-500">
           <div className="bg-green-600/10 border-2 border-green-600/50 rounded-[2.5rem] p-6 relative overflow-hidden">
             <div className="absolute top-0 left-0 bg-green-600 text-white text-[8px] font-black px-4 py-1 rounded-br-2xl uppercase tracking-tighter">تم الرفع بنجاح</div>
             <div className="flex flex-col gap-4">
                <div className="aspect-video w-full rounded-2xl overflow-hidden bg-black ring-1 ring-red-600/50 shadow-[0_0_10px_red]">
                    <video src={lastUploaded.video_url} autoPlay loop muted playsInline className="w-full h-full object-cover" />
                </div>
                <h3 className="text-lg font-black text-white">{lastUploaded.title}</h3>
                <button onClick={() => setLastUploaded(null)} className="w-full py-3 bg-green-600/20 text-green-500 font-black rounded-xl border border-green-600/30 text-xs">موافق</button>
             </div>
           </div>
        </div>
      )}

      <div className="mb-12 bg-gradient-to-br from-red-950/20 to-black p-8 rounded-[3rem] border border-red-600/30 relative">
        {isUploading && (
          <div className="absolute inset-0 bg-black/90 z-20 flex flex-col items-center justify-center rounded-[3rem] backdrop-blur-md">
             <div className="w-12 h-12 border-4 border-red-600 border-t-transparent rounded-full animate-spin mb-6"></div>
             <p className="text-red-500 text-xs font-black tracking-widest animate-pulse uppercase">Syncing with app_videos...</p>
          </div>
        )}
        <h2 className="text-xl font-black mb-6 text-white italic">إرسال محتوى جديد</h2>
        
        <div className="flex flex-col gap-5 mb-8">
          <input 
            type="text" placeholder="عنوان الفيديو (اختياري)..." value={uploadTitle}
            onChange={(e) => setUploadTitle(e.target.value)}
            className="bg-black border border-white/5 rounded-2xl px-6 py-5 text-sm text-white outline-none focus:border-red-600 transition-all"
          />
          <select 
            value={uploadCategory} onChange={(e) => setUploadCategory(e.target.value)}
            className="bg-black border border-white/5 rounded-2xl px-6 py-5 text-sm text-red-500 outline-none font-bold"
          >
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <button 
          onClick={openUploadWidget} disabled={isUploading}
          className="w-full py-6 bg-red-600 text-white font-black rounded-2xl shadow-[0_0_40px_rgba(220,38,38,0.4)] active:scale-95 transition-all text-lg"
        >
          بدء الرفع السحابي
        </button>
      </div>

      <div className="space-y-6">
        <h2 className="text-xl font-black text-white italic px-2">الأرشيف المحلي <span className="text-red-600">({videos.length})</span></h2>
        <div className="flex flex-col gap-4">
            {videos.map(v => (
                <div key={v.public_id} className="bg-[#0a0a0a] border border-white/5 rounded-[2rem] p-5 flex items-center gap-5 ring-1 ring-red-600/10">
                    <div className="w-24 aspect-video bg-black rounded-2xl overflow-hidden shrink-0 ring-1 ring-red-600/30 shadow-[0_0_5px_red]">
                        <video src={v.video_url} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-grow">
                        <p className="text-sm font-black text-white line-clamp-1">{v.title}</p>
                        <p className="text-[10px] text-red-500 font-bold">{v.category}</p>
                    </div>
                </div>
            ))}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
