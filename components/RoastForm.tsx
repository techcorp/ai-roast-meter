import React, { useState, useRef, useEffect } from 'react';
import { RoastMode, RoastLanguage } from '../types';
import { MODE_CONFIG, LANGUAGES } from '../constants';
import { Camera, Upload, X, Type as TypeIcon, Aperture, Globe, Image as ImageIcon, Loader2 } from 'lucide-react';
import { playClick, playCapture, playHover, playCameraStart, playCameraStop } from '../services/soundService';

interface RoastFormProps {
  onSubmit: (mode: RoastMode, language: RoastLanguage, text: string, file: File | null) => void;
  isLoading: boolean;
}

const RoastForm: React.FC<RoastFormProps> = ({ onSubmit, isLoading }) => {
  const [selectedMode, setSelectedMode] = useState<RoastMode>(RoastMode.GENTLE_ROAST);
  const [selectedLanguage, setSelectedLanguage] = useState<RoastLanguage>('English');
  const [textInput, setTextInput] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isImageLoading, setIsImageLoading] = useState(false);
  
  // Focus state
  const [focusPoint, setFocusPoint] = useState<{ x: number, y: number, visible: boolean } | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const handleModeChange = (mode: RoastMode) => {
    playClick();
    setSelectedMode(mode);
  };

  const handleLanguageChange = (lang: RoastLanguage) => {
    playClick();
    setSelectedLanguage(lang);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setIsImageLoading(true);
      const file = e.target.files[0];
      setSelectedFile(file);
      
      // Simulate upload/processing delay for better UX
      setTimeout(() => {
        const url = URL.createObjectURL(file);
        setPreviewUrl(url);
        setIsImageLoading(false);
      }, 1200);
    }
  };

  const clearFile = () => {
    playClick();
    setSelectedFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Ensure video element gets the stream when it mounts
  useEffect(() => {
    if (isCameraOpen && videoRef.current && streamRef.current) {
      const video = videoRef.current;
      video.srcObject = streamRef.current;
      video.play().catch(e => console.error("Error playing video:", e));
    }
  }, [isCameraOpen]);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop();
      });
      streamRef.current = null;
    }
    setIsCameraOpen(false);
    setFocusPoint(null);
  };

  const startCamera = async () => {
    playClick();
    
    // 1. Cleanup any existing streams first
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    // Add a small delay to ensure hardware is fully released by the browser
    await new Promise(resolve => setTimeout(resolve, 100));

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      alert("Camera API is not supported in this browser.");
      return;
    }

    try {
      let stream: MediaStream | null = null;

      // 2. Attempt: Standard User Camera (Most compatible)
      try {
        stream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: "user" } 
        });
      } catch (e) {
        console.warn("Standard camera request failed, trying fallback...", e);
      }

      // 3. Attempt: Any Video Source (Fallback for desktop/older devices)
      if (!stream) {
        try {
          stream = await navigator.mediaDevices.getUserMedia({ video: true });
        } catch (e) {
           console.warn("Fallback camera request failed", e);
        }
      }
      
      if (!stream) {
        throw new Error("Could not initialize any camera source.");
      }

      // Store stream and open camera UI
      streamRef.current = stream;
      setIsCameraOpen(true);
      playCameraStart();

      // Attempt to enable continuous autofocus if supported
      try {
        const track = stream.getVideoTracks()[0];
        const capabilities = (track.getCapabilities && track.getCapabilities()) as any;
        if (capabilities && capabilities.focusMode) {
          await track.applyConstraints({
            advanced: [{ focusMode: 'continuous' }] as any
          });
        }
      } catch (e) {
        // Ignore focus capability errors
      }

    } catch (err: any) {
      console.error("Error accessing camera:", err);
      let errorMessage = "Could not access camera.";
      
      // Detailed error handling with actionable advice
      if (err.name === "NotReadableError" || err.message.includes("Could not start video source")) {
        errorMessage = "⚠️ Camera Busy or Not Readable\n\nIt looks like another app (like Zoom, Meet, or another tab) is using your camera. Please close other apps and try again.";
      } else if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        errorMessage = "🚫 Camera Permission Denied\n\nPlease allow camera access in your browser settings (look for the lock icon in the address bar) and reload the page.";
      } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
        errorMessage = "📷 No Camera Found\n\nWe couldn't detect a camera on your device. Please connect a camera or check your device settings.";
      } else if (err.name === "OverconstrainedError") {
        errorMessage = "⚠️ Camera Constraints Error\n\nYour camera doesn't support the requested settings. We'll try a basic connection next time.";
      } else if (err.name === "AbortError") {
        errorMessage = "⚠️ Hardware Error\n\nThe video stream was stopped. Please refresh the page and try again.";
      } else if (err.name === "SecurityError") {
        errorMessage = "🔒 Security Error\n\nCamera access is disabled in your browser settings. Please enable media support.";
      }
      
      alert(errorMessage);
      stopCamera(); // Ensure cleanup happens
    }
  };

  const handleStopCamera = () => {
    playCameraStop();
    stopCamera();
  };

  const capturePhoto = () => {
    playCapture();
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');

      if (context) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        // Mirror the image to match the user experience (selfie mode)
        context.translate(canvas.width, 0);
        context.scale(-1, 1);
        
        context.drawImage(video, 0, 0, canvas.width, canvas.height);

        canvas.toBlob((blob) => {
          if (blob) {
            setIsImageLoading(true);
            stopCamera();
            
            const file = new File([blob], "camera-capture.jpg", { type: "image/jpeg" });
            setSelectedFile(file);
            
            // Simulate processing delay
            setTimeout(() => {
              setPreviewUrl(URL.createObjectURL(file));
              setIsImageLoading(false);
            }, 800);
          }
        }, 'image/jpeg');
      }
    }
  };

  const handleVideoClick = async (e: React.MouseEvent<HTMLDivElement>) => {
    if (!videoRef.current || !streamRef.current) return;

    // Calculate click position relative to the container
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Show visual indicator
    setFocusPoint({ x, y, visible: true });
    playHover();
    
    // Hide indicator after animation
    setTimeout(() => {
      setFocusPoint(prev => prev ? { ...prev, visible: false } : null);
    }, 600);

    // Attempt to trigger hardware autofocus
    try {
      const track = streamRef.current.getVideoTracks()[0];
      if (!track.getCapabilities) return;
      
      const capabilities = track.getCapabilities() as any;

      if (capabilities) {
        // Try 'continuous' focus mode first which usually re-triggers focus
        if (capabilities.focusMode && capabilities.focusMode.includes('continuous')) {
           await track.applyConstraints({
            advanced: [{ focusMode: 'continuous' }] as any
          });
        } 
        // Fallback to manual focus if supported
        else if (capabilities.focusMode && capabilities.focusMode.includes('manual')) {
           const constraint = {
             advanced: [{
               focusMode: 'manual',
               pointsOfInterest: [{ x: x / rect.width, y: y / rect.height }]
             }]
           };
           await track.applyConstraints(constraint as any);
        }
      }
    } catch (err) {
      // Focus errors are non-critical
      console.debug("Focus constraint failed", err);
    }
  };

  // Cleanup camera on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!textInput.trim() && !selectedFile) {
      alert("Please provide either a photo or a description!");
      return;
    }
    playClick();
    onSubmit(selectedMode, selectedLanguage, textInput, selectedFile);
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-lg mx-auto space-y-6">
      
      {/* Mode Selection */}
      <div className="grid grid-cols-3 gap-2 p-1.5 bg-gray-800/60 rounded-2xl backdrop-blur-md border border-gray-700/50 shadow-inner">
        {Object.values(RoastMode).map((mode) => {
          const config = MODE_CONFIG[mode];
          const Icon = config.icon;
          const isSelected = selectedMode === mode;
          
          return (
            <button
              key={mode}
              type="button"
              onClick={() => handleModeChange(mode)}
              className={`
                relative flex flex-col items-center justify-center p-3 rounded-xl transition-all duration-300 ease-out
                ${isSelected 
                  ? 'bg-gray-700 shadow-lg scale-[1.02] ring-1 ring-white/10' 
                  : 'hover:bg-gray-700/40 opacity-70 hover:opacity-100 hover:scale-[1.01]'}
              `}
            >
              <Icon className={`w-6 h-6 mb-1.5 transition-transform duration-300 ${isSelected ? 'scale-110 ' + config.color : config.color}`} />
              <span className={`text-xs font-medium transition-colors ${isSelected ? 'text-white' : 'text-gray-400'}`}>
                {mode === RoastMode.GENTLE_ROAST ? 'Roast' : mode === RoastMode.COMPLIMENT ? 'Compliment' : 'Mix'}
              </span>
              {isSelected && (
                <div className={`absolute -bottom-1 w-10 h-1 rounded-full ${config.color.replace('text-', 'bg-')} shadow-[0_0_8px_currentColor] opacity-80`} />
              )}
            </button>
          );
        })}
      </div>

      {/* Description and Language Selection */}
      <div className="flex flex-col items-center gap-3 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
        <div className="text-center text-sm text-gray-400 font-medium tracking-wide">
          {MODE_CONFIG[selectedMode].description}
        </div>
        
        <div className="flex items-center gap-2 bg-gray-800/40 rounded-full p-1 border border-gray-700/50 backdrop-blur-sm">
          <Globe className="w-4 h-4 text-gray-500 ml-2" />
          <div className="flex gap-1">
            {LANGUAGES.map((lang) => (
              <button
                key={lang}
                type="button"
                onClick={() => handleLanguageChange(lang)}
                className={`
                  px-3 py-1 text-xs rounded-full transition-all duration-200 font-medium
                  ${selectedLanguage === lang 
                    ? 'bg-gray-700 text-white shadow-sm' 
                    : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700/30'}
                `}
              >
                {lang}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Inputs Container */}
      <div className="space-y-4 bg-gray-800/80 rounded-3xl p-6 border border-gray-700/50 shadow-xl backdrop-blur-sm animate-fade-in-up" style={{ animationDelay: '200ms' }}>
        
        {/* Image Upload/Camera Area */}
        <div className="relative group">
           {isCameraOpen ? (
             <div 
                className="relative rounded-2xl overflow-hidden bg-black aspect-video flex flex-col items-center justify-center border border-gray-700 shadow-2xl cursor-crosshair"
                onClick={handleVideoClick}
             >
                {/* Mirror the video preview for natural feel */}
                <video 
                  ref={videoRef} 
                  autoPlay 
                  playsInline 
                  muted 
                  className="w-full h-full object-cover" 
                  style={{ transform: "scaleX(-1)" }}
                />
                <canvas ref={canvasRef} className="hidden" />
                
                {/* Focus Indicator */}
                {focusPoint && focusPoint.visible && (
                  <div 
                    className="absolute border-2 border-yellow-400/80 rounded-lg shadow-[0_0_15px_rgba(250,204,21,0.6)] pointer-events-none"
                    style={{
                      left: focusPoint.x,
                      top: focusPoint.y,
                      width: '80px',
                      height: '80px',
                      transform: 'translate(-50%, -50%)',
                      animation: 'focusPing 0.4s ease-out forwards'
                    }}
                  >
                     {/* Corner marks for aesthetic */}
                     <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-yellow-400"></div>
                     <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-yellow-400"></div>
                     <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-yellow-400"></div>
                     <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-yellow-400"></div>
                  </div>
                )}
                
                {/* Refined Focus Animation */}
                <style>{`
                  @keyframes focusPing {
                    0% { transform: translate(-50%, -50%) scale(1.3); opacity: 0; }
                    20% { transform: translate(-50%, -50%) scale(1.1); opacity: 1; }
                    100% { transform: translate(-50%, -50%) scale(1); opacity: 0; }
                  }
                `}</style>

                <div className="absolute bottom-6 flex items-center gap-8 z-20" onClick={(e) => e.stopPropagation()}>
                  <button 
                    type="button"
                    onClick={handleStopCamera}
                    className="p-3.5 bg-gray-900/60 text-white rounded-full hover:bg-red-500/80 transition-all backdrop-blur-md border border-white/10 hover:scale-110"
                    title="Cancel"
                  >
                    <X className="w-6 h-6" />
                  </button>
                  
                  {/* Enhanced Capture Button */}
                  <div className="relative flex items-center justify-center group/capture">
                    <div className="absolute inset-0 rounded-full bg-white/40 blur-lg animate-pulse"></div>
                    <button 
                      type="button"
                      onClick={capturePhoto}
                      className="relative z-10 p-5 bg-white text-black rounded-full transition-all duration-300 shadow-[0_0_30px_rgba(255,255,255,0.2)] ring-4 ring-white/30 hover:scale-105 active:scale-95 group-hover/capture:ring-white/50"
                      title="Capture"
                    >
                      <Aperture className="w-8 h-8" />
                    </button>
                  </div>
                </div>
             </div>
           ) : isImageLoading ? (
            // Uploading / Processing Animation
            <div className="relative rounded-2xl overflow-hidden bg-gray-800/40 aspect-video flex flex-col items-center justify-center border border-gray-700/50 shadow-inner">
              <div className="absolute inset-0 bg-gradient-to-t from-gray-900/50 to-transparent"></div>
              <div className="relative z-10 flex flex-col items-center animate-pulse">
                <div className="w-16 h-16 mb-4 rounded-2xl bg-gray-700/50 flex items-center justify-center shadow-lg ring-1 ring-white/10">
                  <ImageIcon className="w-8 h-8 text-gray-500 animate-pulse" />
                </div>
                <div className="flex items-center gap-2 text-blue-400 font-medium">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Processing Image...</span>
                </div>
              </div>
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-800">
                <div className="h-full bg-blue-500 animate-[progress_1.5s_ease-in-out_infinite]"></div>
              </div>
              <style>{`
                @keyframes progress {
                  0% { width: 0%; opacity: 0; }
                  50% { width: 70%; opacity: 1; }
                  100% { width: 100%; opacity: 0; }
                }
              `}</style>
            </div>
           ) : !previewUrl ? (
             // Split Design for Upload / Camera
            <div className="border-2 border-dashed border-gray-600/50 rounded-2xl p-6 flex flex-col items-center justify-center transition-all hover:border-gray-500 hover:bg-gray-700/10 bg-gray-800/20">
              
              <div className="flex w-full items-center justify-center gap-4 sm:gap-12 py-6">
                
                {/* File Upload Option */}
                <div 
                  onClick={() => { playClick(); fileInputRef.current?.click(); }}
                  className="flex flex-col items-center cursor-pointer group/upload p-4 rounded-2xl hover:bg-gray-700/40 transition-all duration-300 hover:-translate-y-1"
                >
                  <div className="w-16 h-16 rounded-2xl bg-gray-700/50 flex items-center justify-center mb-3 group-hover/upload:bg-blue-500/20 group-hover/upload:text-blue-400 transition-colors shadow-lg border border-gray-600/30 group-hover/upload:border-blue-500/30">
                    <Upload className="w-8 h-8 text-gray-400 group-hover/upload:text-blue-400 transition-colors" />
                  </div>
                  <span className="text-sm font-semibold text-gray-300 group-hover/upload:text-blue-400 transition-colors">Upload File</span>
                </div>

                <div className="h-20 w-px bg-gradient-to-b from-transparent via-gray-600 to-transparent"></div>

                {/* Camera Option */}
                <div 
                  onClick={startCamera}
                  className="flex flex-col items-center cursor-pointer group/camera p-4 rounded-2xl hover:bg-gray-700/40 transition-all duration-300 hover:-translate-y-1"
                >
                  <div className="w-16 h-16 rounded-2xl bg-gray-700/50 flex items-center justify-center mb-3 group-hover/camera:bg-purple-500/20 group-hover/camera:text-purple-400 transition-colors shadow-lg border border-gray-600/30 group-hover/camera:border-purple-500/30">
                    <Camera className="w-8 h-8 text-gray-400 group-hover/camera:text-purple-400 transition-colors" />
                  </div>
                  <span className="text-sm font-semibold text-gray-300 group-hover/camera:text-purple-400 transition-colors">Take Photo</span>
                </div>

              </div>
              <p className="text-xs text-gray-500 mt-2">Add a selfie for a full analysis</p>
            </div>
           ) : (
             // Preview State
             <div className="relative rounded-2xl overflow-hidden bg-black aspect-video flex items-center justify-center border border-gray-700 group/preview shadow-2xl">
               <img src={previewUrl} alt="Preview" className="h-full w-full object-contain" />
               <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/preview:opacity-100 transition-opacity duration-300 flex items-center justify-center backdrop-blur-[2px]">
                 <button
                   type="button"
                   onClick={clearFile}
                   className="px-6 py-3 bg-red-500/90 text-white rounded-full hover:bg-red-600 transition-all hover:scale-105 shadow-xl flex items-center gap-2 font-medium backdrop-blur-sm border border-red-400/20"
                 >
                   <X className="w-5 h-5" />
                   <span>Remove Photo</span>
                 </button>
               </div>
             </div>
           )}
           <input 
             type="file" 
             ref={fileInputRef}
             className="hidden" 
             accept="image/*"
             onChange={handleFileChange}
           />
        </div>

        {/* Text Input */}
        <div className="relative group/text">
          <div className="absolute top-3 left-3 text-gray-500 transition-colors group-focus-within/text:text-blue-500">
            <TypeIcon className="w-5 h-5" />
          </div>
          <textarea
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            placeholder="Or describe yourself here... (e.g. 'I love coding and coffee too much')"
            className="w-full bg-gray-900/40 border border-gray-700/50 rounded-xl py-3 pl-10 pr-4 text-sm text-gray-200 focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/50 outline-none transition-all placeholder:text-gray-600 resize-none h-24 hover:bg-gray-900/60"
          />
        </div>
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isLoading || isImageLoading || (!textInput && !selectedFile)}
        className={`
          w-full py-4 rounded-xl font-bold text-lg shadow-xl flex items-center justify-center gap-3 transition-all duration-300 transform
          ${isLoading || isImageLoading || (!textInput && !selectedFile) 
            ? 'bg-gray-800 text-gray-600 cursor-not-allowed border border-gray-700' 
            : 'bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 text-white hover:shadow-blue-500/25 active:scale-[0.98] hover:translate-y-[-2px]'}
        `}
      >
        {isLoading ? (
          <>
            <div className="animate-spin rounded-full h-5 w-5 border-2 border-white/30 border-t-white"></div>
            <span>Processing Vibe...</span>
          </>
        ) : (
          <>
            <Upload className="w-5 h-5" />
            <span>Generate {selectedMode === RoastMode.GENTLE_ROAST ? 'Roast' : 'Result'}</span>
          </>
        )}
      </button>

    </form>
  );
};

export default RoastForm;