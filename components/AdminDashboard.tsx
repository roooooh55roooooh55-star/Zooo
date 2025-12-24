
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
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  useEffect(() => { loadVideos(); }, []);

  const openUploadWidget = () => {
    const cloudinary = (window as any).cloudinary;
    if (!cloudinary) {
      alert("النظام غير جاهز.. تأكد من اتصال الإنترنت.");
      return;
    }

    setIsUploading(true);
    cloudinary.openUploadWidget(
      {
        cloudName: 'dlrvn33p0',
        uploadPreset: 'Good.zooo', // Unsigned Preset
        folder: 'app_videos',
        sources: ['local', 'url'],
        resourceType: 'video',
        context: { caption: uploadTitle || "بدون عنوان" },
        // تاغ hadiqa_v4 ضروري للجلب التلقائي عبر Tag List
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
          
          // تحديث القائمة فوراً في الواجهة والكاش المحلي
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
    <div className="fixed inset-0 z-[300] bg-[#050505] overflow-y-auto p-6 text-right pb-32" dir="rtl">
      <div className="flex items-center justify-between mb-8 border-b border-red-600/30 pb-4">
        <div className="flex items-center gap-3">
            <img src={LOGO_URL} className="w-10 h-10 rounded-full border-2 border-red-600 shadow-[0_0_15px_red]" />
            <div className="flex flex-col">
                <h1 className="text-xl font-black text-red-600 italic leading-tight">بوابة المطور</h1>
                <span className="text-[8px] text-gray-600 font-bold tracking-widest uppercase">v4.5 Secure Sync</span>
            </div>
        </div>
        <button onClick={onClose} className="w-10 h-10 flex items-center justify-center bg-white/5 rounded-full text-red-500 border border-white/10">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="3" d="M6 18L18 6M6 6l12 12"/></svg>
        </button>
      </div>

      <div className="mb-12 bg-gradient-to-br from-red-950/20 to-black p-8 rounded-[3rem] border border-red-600/30 relative overflow-hidden">
        {isUploading && (
          <div className="absolute inset-0 bg-black/80 z-10 flex items-center justify-center">
            <p className="text-red-500 animate-pulse font-black text-xs uppercase tracking-widest">جاري الرفع لـ app_videos...</p>
          </div>
        )}
        <h2 className="text-xl font-black mb-6 text-white italic">إرسال فيديو جديد</h2>
        <div className="flex flex-col gap-5 mb-8">
          <input 
            type="text" placeholder="عنوان الفيديو (اختياري)..." value={uploadTitle}
            onChange={(e) => setUploadTitle(e.target.value)}
            className="bg-black border border-white/5 rounded-2xl px-6 py-5 text-sm text-white outline-none focus:border-red-600 transition-all"
          />
          <select 
            value={uploadCategory} onChange={(e) => setUploadCategory(e.target.value)}
            className="bg-black border border-white/5 rounded-2xl px-6 py-5 text-sm text-red-500 font-bold outline-none"
          >
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <button onClick={openUploadWidget} disabled={isUploading} className="w-full py-6 bg-red-600 text-white font-black rounded-2xl shadow-[0_0_30px_rgba(220,38,38,0.4)] text-lg active:scale-95 transition-transform">بدء الرفع السحابي</button>
      </div>

      <h2 className="text-xl font-black text-white italic mb-6">الأرشيف المحلي (app_videos)</h2>
      <div className="grid grid-cols-1 gap-4">
        {videos.map(v => (
            <div key={v.public_id} className="bg-neutral-900/50 border border-red-600/20 rounded-[2rem] p-4 flex items-center gap-4 ring-1 ring-red-600 shadow-[0_0_10px_red]">
                <video src={v.video_url} className="w-20 h-20 rounded-xl object-cover ring-1 ring-red-600" />
                <div className="flex-grow">
                    <p className="text-sm font-black text-white line-clamp-1">{v.title}</p>
                    <p className="text-[10px] text-red-500 font-bold">{v.category}</p>
                </div>
            </div>
        ))}
      </div>
    </div>
  );
};

export default AdminDashboard;
