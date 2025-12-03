
import React, { useState, useEffect } from 'react';
import { Flame, Sparkles, Music, VolumeX } from 'lucide-react';
import RoastForm from './components/RoastForm';
import RoastResult from './components/RoastResult';
import { generateRoast } from './services/geminiService';
import { RoastMode, RoastResultData, RoastLanguage } from './types';
import { LOADING_MESSAGES, APP_NAME } from './constants';
import { playSuccess, toggleBackgroundMusic, playClick } from './services/soundService';

const App: React.FC = () => {
  const [result, setResult] = useState<RoastResultData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingMsg, setLoadingMsg] = useState(LOADING_MESSAGES[0]);
  const [currentLanguage, setCurrentLanguage] = useState<RoastLanguage>('English');
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);

  // Cycle loading messages
  useEffect(() => {
    let interval: any;
    if (isLoading) {
      interval = setInterval(() => {
        setLoadingMsg(LOADING_MESSAGES[Math.floor(Math.random() * LOADING_MESSAGES.length)]);
      }, 2000);
    }
    return () => clearInterval(interval);
  }, [isLoading]);

  const handleRoastSubmit = async (mode: RoastMode, language: RoastLanguage, text: string, file: File | null) => {
    setIsLoading(true);
    setError(null);
    setResult(null);
    setCurrentLanguage(language);

    try {
      const data = await generateRoast(mode, language, text, file);
      setResult(data);
      playSuccess(); // Play cheerful sound on success
    } catch (err: any) {
      setError(err.message || "Something went wrong.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setResult(null);
    setError(null);
  };

  const handleToggleMusic = () => {
    playClick();
    const newState = !isMusicPlaying;
    setIsMusicPlaying(newState);
    toggleBackgroundMusic(newState);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-black text-white flex flex-col items-center p-4 selection:bg-pink-500/30 overflow-x-hidden">
      
      {/* Navbar / Header */}
      <header className="w-full max-w-4xl flex items-center justify-between py-6 mb-4 animate-fade-in">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl shadow-lg shadow-orange-900/20 animate-float">
            <Flame className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
            {APP_NAME}
          </h1>
        </div>
        
        {/* Music Toggle */}
        <button
          onClick={handleToggleMusic}
          className={`
            p-2.5 rounded-full transition-all duration-300 border backdrop-blur-md
            ${isMusicPlaying 
              ? 'bg-purple-500/20 text-purple-300 border-purple-500/30 hover:bg-purple-500/30 shadow-[0_0_15px_rgba(168,85,247,0.3)]' 
              : 'bg-gray-800/40 text-gray-400 border-white/10 hover:bg-gray-700/50 hover:text-white'}
          `}
          title={isMusicPlaying ? "Pause Background Music" : "Play Background Music"}
        >
          {isMusicPlaying ? (
            <div className="flex items-center gap-2">
               <Music className="w-5 h-5 animate-pulse" />
               <span className="hidden sm:inline text-xs font-medium">Playing</span>
            </div>
          ) : (
            <VolumeX className="w-5 h-5" />
          )}
        </button>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-4xl flex flex-col items-center justify-center pb-12">
        
        {/* Intro Text (only show if no result) */}
        {!result && !isLoading && (
          <div className="text-center mb-10 space-y-4 max-w-xl animate-fade-in-up">
            <h2 className="text-4xl md:text-5xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 leading-tight">
              Discover Your Vibe
            </h2>
            <p className="text-gray-400 text-lg leading-relaxed">
              Upload a selfie or describe yourself. Choose between a gentle roast, a wholesome compliment, or a bit of both.
            </p>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center space-y-8 animate-fade-in my-16">
            <div className="relative w-28 h-28">
              {/* Outer Glow */}
              <div className="absolute inset-0 rounded-full blur-xl bg-blue-500/20 animate-pulse-slow"></div>
              
              {/* Spinning Rings */}
              <div className="absolute inset-0 border-[3px] border-gray-800 rounded-full"></div>
              <div className="absolute inset-0 border-[3px] border-t-blue-500 border-r-transparent border-b-purple-500 border-l-transparent rounded-full animate-spin"></div>
              <div className="absolute inset-2 border-[3px] border-t-transparent border-r-pink-500 border-b-transparent border-l-indigo-500 rounded-full animate-spin-slow"></div>
              
              {/* Center Icon */}
              <div className="absolute inset-0 flex items-center justify-center">
                 <Sparkles className="w-8 h-8 text-white/80 animate-pulse" />
              </div>
            </div>
            
            <div className="text-center space-y-2">
              <p className="text-xl font-semibold text-white tracking-wide animate-pulse">
                Analyzing Vibes...
              </p>
              <p className="text-sm text-gray-400 h-5 transition-all duration-300">
                {loadingMsg}
              </p>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="w-full max-w-lg mb-8 p-6 bg-red-500/10 border border-red-500/30 rounded-2xl text-center text-red-200 animate-fade-in backdrop-blur-sm">
            <p className="font-semibold mb-2 text-lg">Oops!</p>
            <p className="mb-4 text-red-300/80">{error}</p>
            <button 
              onClick={() => setError(null)}
              className="px-6 py-2 text-sm bg-red-500/20 hover:bg-red-500/30 rounded-full transition-all hover:scale-105 active:scale-95"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Form or Result */}
        {!isLoading && !result && !error && (
          <div className="w-full animate-slide-up">
            <RoastForm onSubmit={handleRoastSubmit} isLoading={isLoading} />
          </div>
        )}

        {result && (
          <RoastResult 
            result={result} 
            onReset={handleReset} 
            language={currentLanguage}
          />
        )}

      </main>

      {/* Footer */}
      <footer className="w-full max-w-4xl py-6 border-t border-gray-800/50 text-center text-sm text-gray-600 animate-fade-in">
        <p>AI Roast Meter &copy; {new Date().getFullYear()}. Powered by Gemini.</p>
        <p className="mt-1 text-xs opacity-75">Remember: It's all in good fun!</p>
      </footer>
    </div>
  );
};

export default App;
