
import React, { useState, useEffect } from 'react';
import { Video } from '../types';
import { fetchCloudinaryVideos, deleteCloudinaryVideo, updateCloudinaryMetadata } from '../cloudinaryClient';

const CATEGORIES = ['رعب حقيقي', 'قصص رعب', 'غموض', 'ما وراء الطبيعة', 'أرشيف المطور'];

interface AdminDashboardProps {
  onClose: () => void;
  currentPassword: string;
  onUpdatePassword: (pass: string) => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ onClose, currentPassword, onUpdatePassword }) => {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [newPassInput, setNewPassInput] = useState(currentPassword);
  const [showPassSettings, setShowPassSettings] = useState(false);

  const loadVideos = async () => {
    setLoading(true);
    const data = await fetchCloudinaryVideos();
    setVideos(data);
    setLoading(false);
  };

  useEffect(() => { loadVideos(); }, []);

  const handleDelete = async (pid: string) => {
    if (window.confirm('هل أنت متأكد من حذف هذا الفيديو نهائياً من Cloudinary؟')) {
      const ok = await deleteCloudinaryVideo(pid);
      if (ok) loadVideos();
    }
  };

  const handleUpdatePassword = () => {
    if (newPassInput.length < 4) {
      alert("الرمز قصير جداً.. اجعله مرعباً أكثر!");
      return;
    }
    onUpdatePassword(newPassInput);
    alert("تم تحديث رمز العبور بنجاح.");
    setShowPassSettings(false);
  };

  const openUploadWidget = () => {
    (window as any).cloudinary.openUploadWidget(
      {
        cloudName: 'dlrvn33p0',
        uploadPreset: 'Good.zooo',
        sources: ['local', 'url', 'camera'],
        resourceType: 'video',
        clientAllowedFormats: ['mp4', 'mov', 'avi']
      },
      (error: any, result: any) => {
        if (!error && result && result.event === "success") {
          loadVideos();
        }
      }
    );
  };

  return (
    <div className="fixed inset-0 z-[300] bg-[#050505] overflow-y-auto p-6 font-sans text-right" dir="rtl">
      <div className="flex items-center justify-between mb-8 border-b border-red-600/30 pb-4">
        <h1 className="text-2xl font-black text-red-600 italic">لوحة تحكم المطور</h1>
        <button onClick={onClose} className="bg-white/5 p-2 rounded-lg text-gray-400">إغلاق</button>
      </div>

      {/* قسم إعدادات الأمان */}
      <div className="mb-6">
        <button 
          onClick={() => setShowPassSettings(!showPassSettings)}
          className="text-[10px] text-gray-500 font-bold border-b border-gray-800 pb-1"
        >
          {showPassSettings ? 'إغلاق إعدادات الأمان' : 'تغيير رمز العبور'}
        </button>
        
        {showPassSettings && (
          <div className="mt-4 p-4 bg-white/5 rounded-2xl border border-white/10 flex flex-col gap-3 animate-in fade-in slide-in-from-top-2">
            <label className="text-xs font-bold text-gray-400">رمز العبور الجديد:</label>
            <div className="flex gap-2">
              <input 
                type="text"
                value={newPassInput}
                onChange={(e) => setNewPassInput(e.target.value)}
                className="flex-grow bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-sm text-red-500 outline-none focus:border-red-600"
              />
              <button 
                onClick={handleUpdatePassword}
                className="bg-red-600 text-white px-4 py-2 rounded-xl text-xs font-black shadow-[0_0_15px_red]"
              >
                حفظ
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="mb-10 bg-red-600/10 p-6 rounded-3xl border border-red-600/20">
        <h2 className="text-lg font-bold mb-4">رفع فيديو جديد</h2>
        <p className="text-xs text-gray-500 mb-6 italic">ارفع الفيديو أولاً ثم قم بتعديل الاسم والقسم من القائمة بالأسفل</p>
        <button 
          onClick={openUploadWidget}
          className="w-full py-4 bg-red-600 text-white font-black rounded-2xl shadow-[0_0_20px_red] active:scale-95 transition-all"
        >
          فتح أداة الرفع (Mobile Friendly)
        </button>
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-bold">إدارة الفيديوهات ({videos.length})</h2>
        {loading ? (
          <div className="py-10 text-center animate-pulse text-red-500">جاري الاتصال بالسحابة...</div>
        ) : (
          videos.map(v => (
            <div key={v.id} className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col gap-3">
              <div className="flex items-center gap-4">
                <div className="w-20 aspect-video bg-black rounded-lg overflow-hidden shrink-0">
                  <video src={v.video_url} className="w-full h-full object-cover" />
                </div>
                <div className="flex-grow">
                  <input 
                    className="bg-transparent border-b border-white/10 w-full text-sm font-bold mb-1 focus:border-red-600 outline-none"
                    defaultValue={v.title}
                    onBlur={async (e) => await updateCloudinaryMetadata(v.public_id, e.target.value, v.category)}
                  />
                  <select 
                    className="bg-black/40 text-[10px] text-red-500 outline-none"
                    defaultValue={v.category}
                    onChange={async (e) => await updateCloudinaryMetadata(v.public_id, v.title, e.target.value)}
                  >
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex gap-2 justify-end border-t border-white/5 pt-3">
                <button 
                  onClick={() => handleDelete(v.public_id)}
                  className="px-4 py-1.5 bg-red-900/40 text-red-500 text-xs font-bold rounded-lg border border-red-500/20"
                >
                  حذف نهائي
                </button>
              </div>
            </div>
          ))
        )}
      </div>
      
      <script src="https://upload-widget.cloudinary.com/global/all.js" type="text/javascript"></script>
    </div>
  );
};

export default AdminDashboard;
