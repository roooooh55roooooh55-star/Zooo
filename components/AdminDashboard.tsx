
import React, { useState, useEffect } from 'react';
import { Video } from '../types';
import { fetchCloudinaryVideos, deleteCloudinaryVideo, updateCloudinaryMetadata } from '../cloudinaryClient';

const LOGO_URL = "https://i.top4top.io/p_3643ksmii1.jpg";

interface AdminDashboardProps {
  onClose: () => void;
  currentPassword: string;
  onUpdatePassword: (pass: string) => void;
  categories: string[];
  onUpdateCategories: (cats: string[]) => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ onClose, currentPassword, onUpdatePassword, categories, onUpdateCategories }) => {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [newPassInput, setNewPassInput] = useState(currentPassword);
  const [showPassSettings, setShowPassSettings] = useState(false);
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadCategory, setUploadCategory] = useState(categories[0] || '');

  const [newCatInput, setNewCatInput] = useState('');
  const [showCatSettings, setShowCatSettings] = useState(false);

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

  const handleDelete = async (pid: string) => {
    if (window.confirm('هل أنت متأكد من حذف هذا الفيديو نهائياً من السحابة؟')) {
      setIsProcessing(pid);
      const ok = await deleteCloudinaryVideo(pid);
      if (ok) {
        alert('تم الحذف بنجاح');
        loadVideos();
      } else {
        alert('فشل الحذف. يرجى المحاولة لاحقاً.');
      }
      setIsProcessing(null);
    }
  };

  const handleUpdate = async (v: Video, newTitle: string, newCategory: string) => {
    setIsProcessing(v.public_id);
    const ok = await updateCloudinaryMetadata(v.public_id, newTitle, newCategory);
    if (ok) {
      setVideos(prev => prev.map(vid => vid.public_id === v.public_id ? {...vid, title: newTitle, category: newCategory} : vid));
    }
    setIsProcessing(null);
  };

  const addCategory = () => {
    if (!newCatInput.trim()) return;
    if (categories.includes(newCatInput)) return;
    onUpdateCategories([...categories, newCatInput.trim()]);
    setNewCatInput('');
  };

  const removeCategory = (cat: string) => {
    if (window.confirm(`حذف قائمة "${cat}"؟ لن يتم حذف الفيديوهات بل ستحتاج لإعادة تصنيفها.`)) {
        onUpdateCategories(categories.filter(c => c !== cat));
    }
  };

  const openUploadWidget = () => {
    const cloudinary = (window as any).cloudinary;
    if (!cloudinary) {
      alert("مكتبة الرفع لم تتحمل بعد.");
      return;
    }
    if (!uploadTitle.trim()) {
      alert("يجب كتابة اسم للفيديو.");
      return;
    }

    setIsUploading(true);
    cloudinary.openUploadWidget(
      {
        cloudName: 'dlrvn33p0',
        uploadPreset: 'Good.zooo',
        sources: ['local', 'url', 'camera'],
        resourceType: 'video',
        context: { caption: uploadTitle },
        tags: [uploadCategory],
        maxFiles: 1,
        styles: { palette: { window: "#000000", sourceBg: "#050505", windowBorder: "#FF0000", tabIcon: "#FF0000", action: "#FF0000", textLight: "#FFFFFF" } }
      },
      (error: any, result: any) => {
        if (!error && result && result.event === "success") {
          setIsUploading(false);
          setUploadTitle('');
          alert("تم الرفع بنجاح! سيظهر الفيديو خلال لحظات.");
          setTimeout(loadVideos, 3000);
        } else if (result && result.event === "close") {
          setIsUploading(false);
        }
      }
    );
  };

  return (
    <div className="fixed inset-0 z-[300] bg-[#050505] overflow-y-auto p-6 font-sans text-right pb-32" dir="rtl">
      <div className="flex items-center justify-between mb-8 border-b border-red-600/30 pb-4">
        <div className="flex items-center gap-2">
            <img src={LOGO_URL} className="w-8 h-8 rounded-full border border-red-600" />
            <h1 className="text-2xl font-black text-red-600 italic">بوابة المطور</h1>
        </div>
        <button onClick={onClose} className="bg-white/5 px-4 py-2 rounded-xl text-gray-500 font-bold active:scale-95">إغلاق</button>
      </div>

      {/* إدارة القوائم */}
      <div className="mb-6 bg-white/5 p-4 rounded-3xl border border-white/10">
        <div className="flex justify-between items-center mb-4">
            <h2 className="text-sm font-black text-white">إدارة القوائم (التصنيفات)</h2>
            <button onClick={() => setShowCatSettings(!showCatSettings)} className="text-[10px] text-blue-500 font-bold">
                {showCatSettings ? 'إغلاق' : 'تعديل'}
            </button>
        </div>
        
        {showCatSettings && (
            <div className="flex flex-col gap-3 animate-in fade-in">
                <div className="flex gap-2">
                    <input 
                        type="text" value={newCatInput} onChange={(e) => setNewCatInput(e.target.value)}
                        placeholder="اسم قائمة جديد..."
                        className="bg-black border border-white/10 rounded-xl px-4 py-2 text-xs text-white flex-grow outline-none"
                    />
                    <button onClick={addCategory} className="bg-red-600 text-white px-4 py-2 rounded-xl text-[10px] font-black">إضافة</button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                    {categories.map(c => (
                        <div key={c} className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-full border border-white/10">
                            <span className="text-[10px] text-gray-300">{c}</span>
                            <button onClick={() => removeCategory(c)} className="text-red-500 text-xs font-bold px-1">×</button>
                        </div>
                    ))}
                </div>
            </div>
        )}
      </div>

      {/* واجهة الرفع */}
      <div className="mb-10 bg-gradient-to-br from-red-950/20 to-black p-6 rounded-[2.5rem] border border-red-600/20 relative">
        {isUploading && (
          <div className="absolute inset-0 bg-black/80 z-20 flex flex-col items-center justify-center rounded-[2.5rem]">
             <div className="w-10 h-10 border-4 border-red-600 border-t-transparent rounded-full animate-spin mb-4"></div>
             <p className="text-red-500 text-[10px] font-black">جاري النقل للسحابة...</p>
          </div>
        )}
        <h2 className="text-lg font-black mb-5 text-white flex items-center gap-2">
            <img src={LOGO_URL} className="w-5 h-5 rounded-full" />
            إضافة محتوى جديد
        </h2>
        
        <div className="flex flex-col gap-4 mb-6">
          <input 
            type="text" placeholder="اسم الفيديو..." value={uploadTitle}
            onChange={(e) => setUploadTitle(e.target.value)}
            className="bg-black border border-white/10 rounded-2xl px-5 py-4 text-sm text-white outline-none focus:border-red-600"
          />
          <select 
            value={uploadCategory} onChange={(e) => setUploadCategory(e.target.value)}
            className="bg-black border border-white/10 rounded-2xl px-5 py-4 text-sm text-red-500 outline-none"
          >
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <button 
          onClick={openUploadWidget} disabled={isUploading}
          className="w-full py-5 bg-red-600 text-white font-black rounded-2xl shadow-[0_10px_30px_rgba(220,38,38,0.3)] active:scale-95"
        >
          رفع الملف
        </button>
      </div>

      {/* المكتبة */}
      <div className="space-y-4">
        <div className="flex items-center justify-between pr-2">
            <h2 className="text-lg font-black">المكتبة السحابية ({videos.length})</h2>
            <button onClick={loadVideos} className="text-blue-500 text-[10px] font-bold">تحديث ↻</button>
        </div>
        
        {loading ? (
          <div className="py-20 flex flex-col items-center gap-4">
            <div className="w-6 h-6 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-gray-600 text-[10px] font-bold">جاري المزامنة...</p>
          </div>
        ) : (
          videos.map(v => (
            <div key={v.public_id} className={`bg-white/5 border border-white/10 rounded-3xl p-4 flex flex-col gap-4 ${isProcessing === v.public_id ? 'opacity-40' : ''}`}>
              <div className="flex items-center gap-4">
                <div className="w-20 aspect-video bg-black rounded-xl overflow-hidden shrink-0 border border-white/5">
                  <video src={v.video_url} className="w-full h-full object-cover" />
                </div>
                <div className="flex-grow">
                  <input 
                    className="bg-transparent border-b border-white/10 w-full text-xs font-black mb-2 focus:border-red-600 outline-none"
                    defaultValue={v.title}
                    onBlur={(e) => handleUpdate(v, e.target.value, v.category)}
                  />
                  <select 
                    className="bg-black text-[9px] text-red-500 outline-none rounded-lg px-2 py-1 border border-white/10"
                    defaultValue={v.category}
                    onChange={(e) => handleUpdate(v, v.title, e.target.value)}
                  >
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-2 border-t border-white/5 pt-3">
                <button 
                  onClick={() => handleDelete(v.public_id)}
                  className="px-4 py-2 bg-red-600/10 text-red-500 text-[9px] font-black rounded-xl border border-red-600/20"
                >
                  حذف نهائي
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
