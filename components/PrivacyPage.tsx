
import React from 'react';

const PrivacyPage: React.FC<{ onOpenAdmin: () => void }> = ({ onOpenAdmin }) => {
  const LOGO_URL = "https://i.top4top.io/p_3643ksmii1.jpg";

  return (
    <div className="flex flex-col gap-8 pb-32 animate-in fade-in slide-in-from-bottom-6 duration-700">
      <div className="p-10 rounded-[3rem] bg-gradient-to-br from-gray-900 to-black border border-white/10 flex items-center justify-between shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-red-600/5 rounded-full blur-3xl"></div>
        <div className="flex flex-col text-right relative z-10">
          <p className="text-[9px] text-red-600 font-black uppercase tracking-[0.5em] mb-1">System Core v4.5</p>
          <h2 className="text-xl font-black text-white italic">تهيئة النظام</h2>
        </div>
        <img src={LOGO_URL} className="w-14 h-14 rounded-full grayscale opacity-40 border-2 border-white/5 shadow-inner" />
      </div>

      <div className="bg-neutral-950/40 rounded-[3rem] p-10 border border-white/5 flex flex-col gap-12 text-right shadow-xl">
        <div className="space-y-4">
            <div className="flex items-center gap-3 justify-end">
                <span className="text-green-500 text-[10px] font-black uppercase">Active</span>
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
            </div>
            <p className="text-[11px] text-gray-500 font-bold leading-relaxed pr-2 border-r-2 border-red-900/30">
                بروتوكول التشفير مفعل حالياً. يتم تخزين بصمات التفاعل في مخازن محلية مشفرة 256-bit. لا توجد عمليات مزامنة خارجية مفعولة للمستخدم.
            </p>
        </div>

        <div className="space-y-6">
            <div className="h-[1px] w-full bg-gradient-to-l from-red-600/20 to-transparent"></div>
            
            <div className="flex flex-col gap-4">
                <button className="w-full py-5 bg-white/5 border border-white/5 text-gray-500 font-black text-[11px] rounded-2xl active:scale-95">
                    التحقق من الشهادات
                </button>
                <button className="w-full py-5 bg-white/5 border border-white/5 text-gray-500 font-black text-[11px] rounded-2xl active:scale-95">
                    سجل الوصول البرمجي
                </button>
            </div>
        </div>
        
        <div className="flex flex-col items-center pt-20">
          {/* المنطقة السرية المخفية تماماً - لا تظهر إلا للمطور عند النقر */}
          <div className="group relative opacity-0 hover:opacity-100 transition-opacity duration-1000">
            <div 
              onClick={onOpenAdmin}
              className="text-[6px] text-white/5 cursor-pointer p-16 select-none font-mono tracking-tighter"
            >
              AL_HADIQA_CORE_AUTH_0x506070_DEV_OVERRIDE
            </div>
          </div>
          <div className="mt-4 flex flex-col items-center gap-1">
             <div className="w-8 h-1 bg-red-900/10 rounded-full"></div>
             <p className="text-[7px] text-gray-800 font-bold uppercase tracking-[0.5em]">Secure Partition</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPage;
