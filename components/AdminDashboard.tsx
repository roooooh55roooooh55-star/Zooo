
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
  onNewVideo?: (v: Video) => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ onClose, currentPassword, onUpdatePassword, categories, onUpdateCategories, onNewVideo }) => {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [lastUploaded, setLastUploaded] = useState<Video | null>(null);

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
    if (window.confirm('سيتم محو الروح من السحابة للأبد. هل أنت متأكد؟')) {
      setIsProcessing(pid);
      const ok = await deleteCloudinaryVideo(pid);
      if (ok) {
        loadVideos();
      } else {
        alert('حدث خطأ في الاتصال.. حاول مرة أخرى.');
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
    if (window.confirm(`حذف قائمة "${cat}"؟`)) {
        onUpdateCategories(categories.filter(c => c !== cat));
    }
  };

  const openUploadWidget = () => {
    const cloudinary = (window as any).cloudinary;
    if (!cloudinary) {
      alert("النظام السحابي غير مستعد.. انتظر ثوانٍ.");
      return;
    }
    if (!uploadTitle.trim()) {
      alert("الروح تحتاج اسماً للمرور عبر البوابة.");
      return;
    }

    setIsUploading(true);
    cloudinary.openUploadWidget(
      {
        cloudName: 'dlrvn33p0',
        uploadPreset: 'Good.zooo',
        sources: ['local', 'url'],
        resourceType: 'video',
        context: { caption: uploadTitle },
        tags: [uploadCategory],
        maxFiles: 1,
        styles: { palette: { window: "#050505", sourceBg: "#050505", windowBorder: "#FF0000", tabIcon: "#FF0000", action: "#FF0000", textLight: "#FFFFFF" } }
      },
      (error: any, result: any) => {
        if (!error && result && result.event === "success") {
          setIsUploading(false);
          
          // تأكيد الرابط عبر HTTPS
          const secureUrl = result.info.secure_url.replace('http://', 'https://');

          const newVideo: Video = {
              id: result.info.public_id,
              public_id: result.info.public_id,
              video_url: secureUrl,
              title: uploadTitle,
              category: uploadCategory,
              type: result.info.height > result.info.width ? 'short' : 'long',
              likes: 0,
              views: 0
          };

          // تحديث المعاينة الفورية
          setLastUploaded(newVideo);
          
          // إبلاغ المكون الرئيسي بإضافة الفيديو فوراً
          if (onNewVideo) onNewVideo(newVideo);
          
          setUploadTitle('');
          // لا حاجة لانتظار loadVideos هنا لأننا أضفناه محلياً
          setVideos(prev => [newVideo, ...prev]);
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
                <span className="text-[8px] text-gray-600 font-bold uppercase tracking-widest">Master Control v4.5</span>
            </div>
        </div>
        <button onClick={onClose} className="w-10 h-10 flex items-center justify-center bg-white/5 rounded-full text-red-500 border border-white/10 active:scale-90">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="3" d="M6 18L18 6M6 6l12 12"/></svg>
        </button>
      </div>

      {/* معاينة الرفع الأخير - التأكد من عمله قبل العودة للرئيسية */}
      {lastUploaded && (
        <div className="mb-10 animate-in zoom-in fade-in duration-500">
           <div className="bg-green-600/10 border-2 border-green-600/50 rounded-[2.5rem] p-6 relative overflow-hidden">
             <div className="absolute top-0 left-0 bg-green-600 text-white text-[8px] font-black px-4 py-1 rounded-br-2xl uppercase">تم التحميل بنجاح</div>
             <div className="flex flex-col gap-4">
                <div className="aspect-video w-full rounded-2xl overflow-hidden bg-black border border-white/10 shadow-2xl">
                    <video src={lastUploaded.video_url} autoPlay loop muted playsInline className="w-full h-full object-cover" />
                </div>
                <div className="flex flex-col gap-1">
                    <h3 className="text-lg font-black text-white">{lastUploaded.title}</h3>
                    <p className="text-[10px] text-gray-500 font-bold italic">التصنيف: {lastUploaded.category}</p>
                </div>
                <button onClick={() => setLastUploaded(null)} className="w-full py-3 bg-green-600/20 text-green-500 font-black rounded-xl border border-green-600/30 text-xs">تأكيد الاعتماد</button>
             </div>
           </div>
        </div>
      )}

      {/* إدارة القوائم */}
      <div className="mb-8 bg-white/5 p-5 rounded-[2.5rem] border border-white/5">
        <div className="flex justify-between items-center mb-6">
            <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest">إدارة القوائم الرئيسية</h2>
            <button onClick={() => setShowCatSettings(!showCatSettings)} className="w-8 h-8 flex items-center justify-center rounded-lg bg-red-600/10 text-red-500 border border-red-600/20">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="3" d="M12 4v16m8-8H4"/></svg>
            </button>
        </div>
        
        {showCatSettings && (
            <div className="flex flex-col gap-4 animate-in slide-in-from-top-4">
                <div className="flex gap-2">
                    <input 
                        type="text" value={newCatInput} onChange={(e) => setNewCatInput(e.target.value)}
                        placeholder="اسم قائمة جديد..."
                        className="bg-black border border-white/10 rounded-2xl px-5 py-4 text-xs text-white flex-grow outline-none focus:border-red-600"
                    />
                    <button onClick={addCategory} className="bg-red-600 text-white px-6 py-4 rounded-2xl text-[10px] font-black shadow-[0_0_20px_red]">أضف</button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                    {categories.map(c => (
                        <div key={c} className="flex items-center gap-3 bg-red-600/5 px-4 py-2 rounded-full border border-red-600/20">
                            <img src={LOGO_URL} className="w-4 h-4 rounded-full" />
                            <span className="text-[10px] font-bold text-gray-300">{c}</span>
                            <button onClick={() => removeCategory(c)} className="text-red-500 text-sm font-black pr-2">×</button>
                        </div>
                    ))}
                </div>
            </div>
        )}
      </div>

      {/* واجهة الرفع */}
      <div className="mb-12 bg-gradient-to-br from-red-950/20 to-black p-8 rounded-[3rem] border border-red-600/30 relative">
        {isUploading && (
          <div className="absolute inset-0 bg-black/90 z-20 flex flex-col items-center justify-center rounded-[3rem] backdrop-blur-md">
             <div className="w-12 h-12 border-4 border-red-600 border-t-transparent rounded-full animate-spin mb-6"></div>
             <p className="text-red-500 text-xs font-black tracking-widest animate-pulse">جاري نقل الروح للسحابة...</p>
          </div>
        )}
        <h2 className="text-xl font-black mb-6 text-white italic">إرسال محتوى جديد</h2>
        
        <div className="flex flex-col gap-5 mb-8">
          <input 
            type="text" placeholder="عنوان الفيديو..." value={uploadTitle}
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
          فتح المعمل السحابي
        </button>
      </div>

      {/* المكتبة السحابية */}
      <div className="space-y-6">
        <div className="flex items-center justify-between px-2">
            <h2 className="text-xl font-black text-white italic">الأرشيف السحابي <span className="text-red-600">({videos.length})</span></h2>
            <button onClick={loadVideos} className="text-red-500 text-[10px] font-black tracking-widest uppercase hover:underline">تحديث القائمة ↻</button>
        </div>
        
        {loading ? (
          <div className="py-20 flex flex-col items-center gap-6">
            <div className="w-10 h-10 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-gray-600 text-[10px] font-black uppercase tracking-widest">مزامنة السجلات...</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {videos.map(v => (
                <div key={v.public_id} className={`bg-[#0a0a0a] border border-white/5 rounded-[2rem] p-5 flex flex-col gap-4 transition-all ${isProcessing === v.public_id ? 'opacity-30 blur-sm' : 'hover:border-red-600/30'}`}>
                <div className="flex items-center gap-5">
                    <div className="w-24 aspect-video bg-black rounded-2xl overflow-hidden shrink-0 border border-white/5 shadow-inner">
                    <video src={v.video_url} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-grow flex flex-col gap-2">
                    <input 
                        className="bg-transparent border-b border-white/5 w-full text-sm font-black text-white focus:border-red-600 outline-none pb-1"
                        defaultValue={v.title}
                        onBlur={(e) => handleUpdate(v, e.target.value, v.category)}
                    />
                    <div className="flex items-center justify-between">
                        <select 
                            className="bg-black text-[10px] text-red-500 font-bold outline-none rounded-lg px-2 py-1 border border-white/5"
                            defaultValue={v.category}
                            onChange={(e) => handleUpdate(v, v.title, e.target.value)}
                        >
                            {categories.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                        <span className="text-[8px] text-gray-600 font-black uppercase">{v.type}</span>
                    </div>
                    </div>
                </div>
                <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
                    <button 
                    onClick={() => handleDelete(v.public_id)}
                    className="px-6 py-2 bg-red-600/10 text-red-500 text-[10px] font-black rounded-xl border border-red-600/20 active:scale-95 transition-all"
                    >
                    حذف من السحابة
                    </button>
                </div>
                </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
