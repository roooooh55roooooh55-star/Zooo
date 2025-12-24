
import React from 'react';

const PrivacyPage: React.FC<{ onOpenAdmin: () => void }> = ({ onOpenAdmin }) => {
  const fullPolicyUrl = "https://www.google.com";

  return (
    <div className="flex flex-col gap-8 pb-32 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="p-8 rounded-[2.5rem] bg-gradient-to-br from-gray-800/40 to-transparent border border-white/10 shadow-2xl">
        <h1 className="text-3xl font-black italic mb-2 text-white text-right">سياسة الخصوصية</h1>
        <p className="text-xs text-gray-500 font-bold uppercase tracking-widest opacity-60 text-right">Privacy Policy & Terms</p>
      </div>

      <div className="bg-neutral-900/50 rounded-[2.5rem] p-8 border border-white/5 flex flex-col gap-6 text-right leading-relaxed shadow-xl">
        <section>
          <h2 className="text-xl font-bold text-red-600 mb-3 drop-shadow-[0_0_8px_rgba(220,38,38,0.5)]">1. جمع المعلومات</h2>
          <p className="text-gray-400 text-sm">نحن في "الحديقة" نهتم بخصوصيتك. يتم تخزين بيانات تفاعلك محلياً على جهازك لتقديم تجربة مخصصة ومستمرة.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-red-600 mb-3 drop-shadow-[0_0_8px_rgba(220,38,38,0.5)]">2. استخدام البيانات</h2>
          <p className="text-gray-400 text-sm">تُستخدم المعلومات لتحسين الاقتراحات وتسهيل خاصية "مكمل رعب" للعودة إلى ما بدأته.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-red-600 mb-3 drop-shadow-[0_0_8px_rgba(220,38,38,0.5)]">3. أمن المعلومات</h2>
          <p className="text-gray-400 text-sm">نستخدم تقنيات حديثة لحماية بياناتك، ولا نشارك معلوماتك مع أي أطراف خارجية.</p>
        </section>

        <div className="mt-8 pt-8 border-t border-white/5 flex flex-col items-center gap-6">
          <a 
            href={fullPolicyUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-4 bg-red-600 border border-red-400 hover:bg-red-700 text-white font-black text-center rounded-2xl shadow-[0_0_25px_rgba(220,38,38,0.6)] transition-all active:scale-95 flex items-center justify-center gap-3 group"
          >
            <span>عرض السياسة الكاملة</span>
          </a>
          
          <div className="mt-10 flex flex-col items-center gap-2">
            <span 
              onClick={onOpenAdmin}
              className="text-[10px] text-white/5 cursor-pointer hover:text-red-900/40 transition-colors p-4"
            >
              النسخة 3.5.0 - Al-Hadiqa Dev
            </span>
            <p className="text-[7px] text-gray-800 font-bold uppercase tracking-widest">Secure Core v4.2</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPage;
