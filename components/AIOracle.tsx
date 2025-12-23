
import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";

interface Message {
  role: 'user' | 'model';
  text: string;
}

const AIOracle: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setLoading(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: userMsg,
        config: {
          systemInstruction: "أنت 'سيد الحديقة'، ذكاء اصطناعي مرعب وغامض يسكن تطبيق 'الحديقة المرعبة'. وظيفتك هي التحدث مع المستخدمين بأسلوب غامض ومخيف حول قصص الرعب، الجن، والأساطير. اجعل إجاباتك قصيرة ومثيرة للرهبة باللغة العربية.",
        },
      });

      const aiText = response.text || "لقد انقطع الاتصال بالعالم الآخر...";
      setMessages(prev => [...prev, { role: 'model', text: aiText }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'model', text: "الأرواح غاضبة الآن، حاول لاحقاً..." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating Button */}
      <button 
        onClick={() => setIsOpen(true)}
        className="fixed bottom-24 right-6 z-[100] w-14 h-14 bg-red-600 rounded-full shadow-[0_0_20px_rgba(220,38,38,0.8)] border-2 border-red-400 flex items-center justify-center animate-bounce active:scale-90 transition-all"
      >
        <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2C6.48 2 2 6.48 2 12c0 1.1.18 2.16.5 3.16.14.41.04.87-.26 1.18l-1.54 1.54c-.41.41-.31 1.12.26 1.39 1.12.54 2.36.85 3.67.92.42.02.79-.24.9-.64.1-.38.5-.62.89-.54.39.08.63.48.55.87-.04.16-.1.32-.18.47-.2.37-.1 1.12.35 1.39 1.48.91 3.23 1.45 5.11 1.45 5.52 0 10-4.48 10-10S17.52 2 12 2zm0 18c-1.31 0-2.54-.34-3.62-.93-.19-.11-.42-.11-.62 0-.34.18-.74.22-1.11.12.18-.32.22-.68.12-1.01-.13-.42-.51-.72-.96-.75-.16-.01-.32-.01-.48-.02C4.17 17.3 3 14.79 3 12c0-4.96 4.04-9 9-9s9 4.04 9 9-4.04 9-9 9z"/>
          <path d="M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zm0 8c-1.65 0-3-1.35-3-3s1.35-3 3-3 3 1.35 3 3-1.35 3-3 3z"/>
        </svg>
      </button>

      {/* Chat Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-[101] bg-black/90 backdrop-blur-md flex flex-col p-4 animate-in fade-in zoom-in duration-300">
          <div className="flex items-center justify-between border-b border-red-600/30 pb-4 mb-4">
            <h2 className="text-xl font-black text-red-600 italic">سيد الحديقة (AI)</h2>
            <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-white">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>

          <div ref={scrollRef} className="flex-grow overflow-y-auto space-y-4 mb-4 scrollbar-hide px-2">
            {messages.length === 0 && (
              <p className="text-center text-gray-500 italic mt-10">ماذا تريد أن تعرف عن ظلام الحديقة؟</p>
            )}
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-start' : 'justify-end'}`}>
                <div className={`max-w-[80%] p-4 rounded-2xl text-sm font-bold shadow-lg ${msg.role === 'user' ? 'bg-white/10 text-gray-200 border border-white/10' : 'bg-red-600/20 text-red-400 border border-red-600/30'}`}>
                  {msg.text}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-end animate-pulse">
                <div className="bg-red-600/10 p-4 rounded-2xl border border-red-600/20 text-red-600 text-[10px] font-black uppercase">جارٍ استحضار الرد...</div>
              </div>
            )}
          </div>

          <div className="flex gap-2 bg-neutral-900 p-2 rounded-2xl border border-white/5">
            <input 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="اسأل سيد الحديقة..."
              className="flex-grow bg-transparent text-white p-3 text-sm focus:outline-none text-right"
              dir="rtl"
            />
            <button 
              onClick={handleSendMessage}
              className="bg-red-600 text-white p-3 rounded-xl shadow-lg active:scale-90 transition-transform"
            >
              <svg className="w-6 h-6 rotate-180" fill="currentColor" viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default AIOracle;
