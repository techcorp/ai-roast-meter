import React, { useState, useEffect } from 'react';
import { RoastResultData, RoastMode, RoastLanguage } from '../types';
import { MODE_CONFIG } from '../constants';
import { RefreshCw, Share2, Copy, Check, Volume2, Square, ArrowLeft } from 'lucide-react';
import { playClick } from '../services/soundService';

interface RoastResultProps {
  result: RoastResultData;
  onReset: () => void;
  language: RoastLanguage;
}

const RoastResult: React.FC<RoastResultProps> = ({ result, onReset, language }) => {
  const [copied, setCopied] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);

  // Determine which config to use based on the returned type string
  let modeKey = RoastMode.GENTLE_ROAST;
  if (result.roastType.includes("Compliment")) modeKey = RoastMode.COMPLIMENT;
  else if (result.roastType.includes("Wholesome Roast")) modeKey = RoastMode.WHOLESOME_ROAST;

  const config = MODE_CONFIG[modeKey];
  const Icon = config.icon;

  const shareText = `${result.vibe} \n\n${result.message}\n\n— AI Roast Meter`;
  const encodedText = encodeURIComponent(shareText);

  // Load voices - Chrome loads them asynchronously
  useEffect(() => {
    const updateVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      setAvailableVoices(voices);
    };

    updateVoices();
    window.speechSynthesis.onvoiceschanged = updateVoices;

    return () => {
      window.speechSynthesis.cancel();
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  const handleSpeak = () => {
    playClick();

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(result.message);
    
    // --- Intelligent Voice Selection ---
    let selectedVoice: SpeechSynthesisVoice | null = null;
    
    if (language === 'Hindi') {
      utterance.lang = 'hi-IN';
      // Prioritize natural sounding "Google" voices if available for Hindi
      selectedVoice = availableVoices.find(v => v.lang === 'hi-IN' && v.name.includes('Google'))
        || availableVoices.find(v => v.lang === 'hi-IN')
        || availableVoices.find(v => v.lang === 'hi')
        || availableVoices.find(v => v.name.toLowerCase().includes('hindi'))
        || null;
    } else if (language === 'Roman Urdu') {
      // Roman Urdu is written in English script but needs an Indian accent to sound natural.
      // 'en-IN' (English India) is usually the best match for the phonetics.
      utterance.lang = 'en-IN';
      selectedVoice = availableVoices.find(v => v.lang === 'en-IN' && v.name.includes('Google'))
        || availableVoices.find(v => v.lang === 'en-IN')
        || availableVoices.find(v => v.name.includes('India') && v.lang.includes('en'))
        // Fallback to British English as it's often phonetically closer than US for South Asian languages
        || availableVoices.find(v => v.lang === 'en-GB')
        || null;
    } else {
      // Default English
      utterance.lang = 'en-US';
      selectedVoice = availableVoices.find(v => v.name.includes('Google US'))
        || availableVoices.find(v => v.lang.startsWith('en-US')) 
        || availableVoices.find(v => v.default)
        || null;
    }

    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }

    // Adjust rate/pitch slightly for more personality
    utterance.rate = 1.0; 
    utterance.pitch = 1.0;

    utterance.onend = () => setIsSpeaking(false);
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onerror = (e) => {
      console.error("Speech playback error:", e);
      setIsSpeaking(false);
    };
    
    window.speechSynthesis.speak(utterance);
  };

  const handleNativeShare = async () => {
    playClick();
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'AI Roast Meter Result',
          text: shareText,
        });
      } catch (err) {
        console.error("Share failed:", err);
      }
    } else {
      handleCopy();
    }
  };

  const handleCopy = () => {
    playClick();
    navigator.clipboard.writeText(shareText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleReset = () => {
    playClick();
    onReset();
  };

  const openShare = (url: string) => {
    playClick();
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="w-full max-w-lg mx-auto animate-fade-in-up">
      <div className={`
        relative overflow-hidden rounded-[2rem] border ${config.borderColor} ${config.bgColor} backdrop-blur-xl p-8 shadow-2xl
      `}>
        {/* Background Decorative Elements */}
        <div className={`absolute -top-20 -right-20 w-64 h-64 ${config.color.replace('text-', 'bg-')} opacity-10 blur-[80px] rounded-full pointer-events-none animate-pulse-slow`}></div>
        <div className={`absolute -bottom-20 -left-20 w-64 h-64 ${config.color.replace('text-', 'bg-')} opacity-5 blur-[80px] rounded-full pointer-events-none animate-pulse-slow`}></div>

        {/* Back Button (Icon) */}
        <button
          onClick={handleReset}
          className="absolute top-6 left-6 p-2 rounded-full bg-black/20 hover:bg-black/40 text-gray-400 hover:text-white transition-all z-20 backdrop-blur-sm border border-white/5 group"
          title="Back to Main Page"
        >
          <ArrowLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" />
        </button>

        <div className="relative z-10 text-center">
          
          {/* Header Icon */}
          <div className="inline-flex items-center justify-center p-5 bg-gray-900/50 rounded-full mb-8 border border-gray-700/50 shadow-inner animate-pop-in backdrop-blur-sm">
            <Icon className={`w-10 h-10 ${config.color}`} />
          </div>

          {/* Vibe Check */}
          <div className="mb-8 opacity-0 animate-fade-in-up" style={{ animationDelay: '200ms' }}>
            <span className="inline-block px-4 py-1.5 rounded-full bg-black/40 text-xs font-semibold uppercase tracking-wider text-gray-400 border border-white/5 mb-3">
              Vibe Check
            </span>
            <h3 className="text-3xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-white via-gray-200 to-gray-400 animate-bounce-subtle">
              {result.vibe}
            </h3>
          </div>

          <div className="w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent my-8 opacity-0 animate-fade-in" style={{ animationDelay: '300ms' }}></div>

          {/* The Message */}
          <div className="relative group mb-8">
            <p className="text-xl md:text-2xl text-gray-100 leading-relaxed font-medium opacity-0 animate-fade-in-up" style={{ animationDelay: '400ms' }}>
              "{result.message}"
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 opacity-0 animate-fade-in-up" style={{ animationDelay: '600ms' }}>
            
            {/* Try Again */}
            <button 
              onClick={handleReset}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-gray-800/80 hover:bg-gray-700/80 text-white font-semibold transition-all duration-300 border border-gray-600/50 shadow-lg hover:translate-y-[-2px]"
            >
              <RefreshCw className="w-4 h-4" />
              Try Again
            </button>
            
            {/* Speak Button with Visualizer */}
            <button
              onClick={handleSpeak}
              className={`
                w-full sm:w-auto relative flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-semibold transition-all duration-300 shadow-lg overflow-hidden
                ${isSpeaking 
                  ? 'bg-indigo-600 text-white ring-2 ring-indigo-400 ring-offset-2 ring-offset-gray-900' 
                  : 'bg-gray-800/80 hover:bg-gray-700/80 text-indigo-300 border border-indigo-500/30 hover:border-indigo-500/50 hover:translate-y-[-2px]'}
              `}
              title="Read Aloud"
            >
              {isSpeaking ? (
                <>
                  {/* Dynamic Visualizer */}
                  <div className="flex items-center gap-1 h-4">
                    <div className="w-1 bg-white rounded-full animate-[soundWave_0.6s_ease-in-out_infinite]" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-1 bg-white rounded-full animate-[soundWave_0.8s_ease-in-out_infinite]" style={{ animationDelay: '0.2s' }}></div>
                    <div className="w-1 bg-white rounded-full animate-[soundWave_0.5s_ease-in-out_infinite]" style={{ animationDelay: '0.4s' }}></div>
                    <div className="w-1 bg-white rounded-full animate-[soundWave_0.7s_ease-in-out_infinite]" style={{ animationDelay: '0.1s' }}></div>
                  </div>
                  <span className="text-sm ml-2">Stop</span>
                </>
              ) : (
                <>
                  <Volume2 className="w-4 h-4" />
                  <span>Listen</span>
                </>
              )}
            </button>

            {/* Main Share */}
            <button 
              onClick={handleNativeShare}
              className={`w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl ${config.color.replace('text-', 'bg-').replace('500', '600')} hover:brightness-110 text-white font-semibold transition-all duration-300 shadow-lg animate-pulse-slow hover:animate-none hover:translate-y-[-2px] hover:shadow-xl`}
            >
              {copied ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
              {copied ? 'Copied!' : 'Share'}
            </button>
          </div>

          {/* Social Share Icons */}
          <div className="mt-8 pt-6 border-t border-white/5 opacity-0 animate-fade-in" style={{ animationDelay: '800ms' }}>
            <p className="text-[10px] text-gray-500 mb-4 uppercase tracking-[0.2em] font-bold">Share on Social</p>
            <div className="flex items-center justify-center gap-4">
              {/* X / Twitter */}
              <button
                onClick={() => openShare(`https://twitter.com/intent/tweet?text=${encodedText}`)}
                className="p-3 bg-black hover:bg-gray-900 text-white rounded-full transition-all duration-300 hover:scale-110 shadow-lg border border-gray-700 hover:border-gray-500"
                title="Share on X"
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" aria-hidden="true"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"></path></svg>
              </button>
              {/* WhatsApp */}
              <button
                onClick={() => openShare(`https://api.whatsapp.com/send?text=${encodedText}`)}
                className="p-3 bg-[#25D366] hover:brightness-110 text-white rounded-full transition-all duration-300 hover:scale-110 shadow-lg"
                title="Share on WhatsApp"
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" aria-hidden="true"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              </button>
               {/* LinkedIn */}
               <button
                onClick={() => openShare(`https://www.linkedin.com/feed/?shareActive=true&text=${encodedText}`)}
                className="p-3 bg-[#0077b5] hover:brightness-110 text-white rounded-full transition-all duration-300 hover:scale-110 shadow-lg"
                title="Share on LinkedIn"
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" aria-hidden="true"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
              </button>
            </div>
          </div>

          {/* Back to Main Page Button */}
          <div className="mt-6 opacity-0 animate-fade-in" style={{ animationDelay: '900ms' }}>
            <button
              onClick={handleReset}
              className="flex items-center justify-center gap-2 mx-auto text-gray-500 hover:text-white transition-colors text-sm font-medium group py-2"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              Back to Main Page
            </button>
          </div>

        </div>
        
        {/* Updated Visualizer Keyframes */}
        <style>{`
          @keyframes soundWave {
            0%, 100% { height: 4px; opacity: 0.7; }
            50% { height: 18px; opacity: 1; }
          }
        `}</style>
      </div>
    </div>
  );
};

export default RoastResult;