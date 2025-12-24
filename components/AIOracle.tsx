
import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from "@google/genai";

interface Message {
  role: 'user' | 'model';
  text: string;
}

function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

function encode(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

const AIOracle: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [messages, setMessages] = useState<Message[]>(() => {
    try {
      const saved = localStorage.getItem('al-hadiqa-ai-history');
      return saved ? JSON.parse(saved) : [];
    } catch (e) { return []; }
  });
  const [loading, setLoading] = useState(false);
  const [voiceLimit, setVoiceLimit] = useState(() => {
    try {
      const saved = localStorage.getItem('al-hadiqa-voice-limit-v3');
      const today = new Date().toDateString();
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.date === today) return parsed.count || 0;
      }
    } catch (e) {}
    return 0;
  });

  const scrollRef = useRef<HTMLDivElement>(null);
  const audioContextInRef = useRef<AudioContext | null>(null);
  const audioContextOutRef = useRef<AudioContext | null>(null);
  const liveSessionRef = useRef<any>(null);
  const nextStartTimeRef = useRef<number>(0);
  const activeSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  
  const currentTranscriptionInput = useRef('');
  const currentTranscriptionOutput = useRef('');

  useEffect(() => {
    localStorage.setItem('al-hadiqa-ai-history', JSON.stringify(messages));
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  useEffect(() => {
    const today = new Date().toDateString();
    localStorage.setItem('al-hadiqa-voice-limit-v3', JSON.stringify({ count: voiceLimit, date: today }));
  }, [voiceLimit]);

  const stopAllAudio = () => {
    activeSourcesRef.current.forEach(source => { try { source.stop(); } catch(e) {} });
    activeSourcesRef.current.clear();
    nextStartTimeRef.current = 0;
  };

  const handleToggleVoice = async () => {
    if (isVoiceActive) {
      setIsVoiceActive(false);
      stopAllAudio();
      if (liveSessionRef.current) {
          liveSessionRef.current.close?.();
          liveSessionRef.current = null;
      }
      return;
    }

    if (voiceLimit >= 10) {
      alert("أرواح الحديقة متعبة.. عد لاحقاً.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setIsVoiceActive(true);
      
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      audioContextInRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      audioContextOutRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
          systemInstruction: 'أنت الحديقة المرعبة AI. ردودك قصيرة، غامضة، ومرعبة جداً بالعربية.',
        },
        callbacks: {
          onopen: () => {
            const source = audioContextInRef.current!.createMediaStreamSource(stream);
            const scriptProcessor = audioContextInRef.current!.createScriptProcessor(4096, 1, 1);
            scriptProcessor.onaudioprocess = (e) => {
              if (!isVoiceActive) return;
              const inputData = e.inputBuffer.getChannelData(0);
              const int16 = new Int16Array(inputData.length);
              for (let i = 0; i < inputData.length; i++) int16[i] = inputData[i] * 32768;
              const pcmBlob = { data: encode(new Uint8Array(int16.buffer)), mimeType: 'audio/pcm;rate=16000' };
              sessionPromise.then(session => session.sendRealtimeInput({ media: pcmBlob }));
            };
            source.connect(scriptProcessor);
            scriptProcessor.connect(audioContextInRef.current!.destination);
          },
          onmessage: async (msg: LiveServerMessage) => {
            if (msg.serverContent?.interrupted) stopAllAudio();
            if (msg.serverContent?.inputTranscription) currentTranscriptionInput.current += msg.serverContent.inputTranscription.text;
            if (msg.serverContent?.outputTranscription) { currentTranscriptionOutput.current += msg.serverContent.outputTranscription.text; setLoading(true); }

            if (msg.serverContent?.turnComplete) {
              if (currentTranscriptionInput.current) {
                setMessages(prev => [...prev, { role: 'user', text: currentTranscriptionInput.current }, { role: 'model', text: currentTranscriptionOutput.current || "..." }]);
                setVoiceLimit(prev => prev + 1);
                currentTranscriptionInput.current = '';
                currentTranscriptionOutput.current = '';
                setLoading(false);
              }
            }

            const audioBase64 = msg.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (audioBase64 && audioContextOutRef.current) {
              const ctx = audioContextOutRef.current;
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
              const audioBuffer = await decodeAudioData(decode(audioBase64), ctx, 24000, 1);
              const source = ctx.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(ctx.destination);
              source.onended = () => activeSourcesRef.current.delete(source);
              activeSourcesRef.current.add(source);
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += audioBuffer.duration;
            }
          },
          onerror: (e) => { console.error(e); setIsVoiceActive(false); },
          onclose: () => { setIsVoiceActive(false); }
        }
      });
      liveSessionRef.current = await sessionPromise;
    } catch (err) { setIsVoiceActive(false); }
  };

  return (
    <>
      <button onClick={() => setIsOpen(true)} className="fixed bottom-24 right-6 z-[100] w-14 h-14 bg-red-600 rounded-full shadow-[0_0_20px_rgba(220,38,38,0.8)] border-2 border-red-400 flex items-center justify-center animate-bounce active:scale-90 transition-all">
        <img src="https://i.top4top.io/p_3643ksmii1.jpg" className="w-10 h-10 rounded-full object-cover" />
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-[101] bg-black/95 backdrop-blur-3xl flex flex-col p-4 animate-in fade-in zoom-in duration-300">
          <div className="flex items-center justify-between border-b border-red-600/30 pb-4 mb-4">
            <div className="flex items-center gap-3">
              <img src="https://i.top4top.io/p_3643ksmii1.jpg" className="w-11 h-11 rounded-full border-2 border-red-600 shadow-[0_0_15px_red] object-cover" />
              <div className="flex flex-col">
                <h2 className="text-sm font-black text-red-600 italic">الحديقة المرعبة AI</h2>
              </div>
            </div>
            <button onClick={() => { setIsOpen(false); if(isVoiceActive) handleToggleVoice(); }} className="text-gray-500 p-2"><svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12"/></svg></button>
          </div>

          <div ref={scrollRef} className="flex-grow overflow-y-auto space-y-6 mb-4 scrollbar-hide px-2">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-start' : 'justify-end'}`}>
                <div className={`max-w-[85%] p-5 rounded-[2rem] text-[13px] font-black shadow-2xl ${msg.role === 'user' ? 'bg-white/5 text-gray-300' : 'bg-red-950/40 text-red-500'}`}>{msg.text}</div>
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-4">
            <div className="flex justify-center">
              <button onClick={handleToggleVoice} className={`p-8 rounded-full transition-all shadow-2xl active:scale-75 ${isVoiceActive ? 'bg-red-600 shadow-[0_0_40px_red]' : 'bg-white/5 text-red-600 border border-red-600/20'}`}>
                <svg className={`w-10 h-10 ${isVoiceActive ? 'animate-pulse' : ''}`} fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/><path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
                </svg>
              </button>
            </div>
            <p className="text-center text-[8px] font-black text-red-600 uppercase tracking-widest">{isVoiceActive ? 'أنا أسمعك الآن...' : 'انقر للتحدث مع الأرواح'}</p>
          </div>
        </div>
      )}
    </>
  );
};

export default AIOracle;
