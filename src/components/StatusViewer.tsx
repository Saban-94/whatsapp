import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Play, Pause, ChevronLeft, ChevronRight } from 'lucide-react';
import { StatusStory } from '../types';

interface StatusViewerProps {
  stories: StatusStory[];
  onClose: () => void;
  onMarkAsViewed: (id: string) => void;
  dir: 'rtl' | 'ltr';
}

export default function StatusViewer({ stories, onClose, onMarkAsViewed, dir }: StatusViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const currentStory = stories[currentIndex];

  useEffect(() => {
    if (!currentStory || currentStory.viewed) return;
    onMarkAsViewed(currentStory.id);
  }, [currentIndex, currentStory?.id, currentStory?.viewed, onMarkAsViewed]);

  useEffect(() => {
    if (isPaused) return;

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          handleNext();
          return 0;
        }
        return prev + 1.5; // Controls the speed of stories (~6 seconds)
      });
    }, 100);

    return () => clearInterval(interval);
  }, [currentIndex, isPaused]);

  const handleNext = () => {
    setProgress(0);
    if (currentIndex < stories.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    setProgress(0);
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    } else {
      // Stay on first but reset progress
      setProgress(0);
    }
  };

  if (!currentStory) return null;

  return (
    <div className="fixed inset-0 bg-[#0b141a]/95 z-50 flex flex-col justify-between select-none p-4" dir="rtl">
      {/* Top Controls Bar */}
      <div className="max-w-xl mx-auto w-full flex flex-col gap-3.5 z-10 pt-2">
        {/* Progress Bars Indicator */}
        <div className="flex gap-1.5 w-full px-1">
          {stories.map((story, idx) => {
            let widthVal = '0%';
            if (idx < currentIndex) widthVal = '100%';
            else if (idx === currentIndex) widthVal = `${progress}%`;

            return (
              <div key={story.id} className="h-1 bg-white/30 rounded-full flex-1 overflow-hidden">
                <div 
                  className="h-full bg-white transition-all duration-100 ease-linear"
                  style={{ width: widthVal }}
                />
              </div>
            );
          })}
        </div>

        {/* User Info & Close / Pause Actions */}
        <div className="flex items-center justify-between w-full px-2">
          <div className="flex items-center gap-3">
            <img 
              src={currentStory.userAvatar} 
              alt={currentStory.userName} 
              className="w-10 h-10 rounded-full object-cover border border-white/20"
              referrerPolicy="no-referrer"
            />
            <div className="text-white text-right">
              <div className="font-semibold text-sm">{currentStory.userName}</div>
              <div className="text-[11px] text-white/60 font-mono">{currentStory.timestamp}</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={() => setIsPaused(!isPaused)} 
              className="text-white hover:bg-white/10 p-2 rounded-full cursor-pointer bg-transparent border-0"
              title={isPaused ? "הפעל" : "השהה"}
            >
              {isPaused ? <Play className="w-5 h-5 fill-white" /> : <Pause className="w-5 h-5 fill-white" />}
            </button>
            <button 
              onClick={onClose} 
              className="text-white hover:bg-white/10 p-2 rounded-full cursor-pointer bg-transparent border-0"
              title="סגור"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Story Image & Navigation Chevron Area */}
      <div className="flex-1 max-w-xl mx-auto w-full flex items-center justify-center relative mt-4 mb-4">
        {/* Previous Hotspot/Button */}
        <button 
          onClick={handlePrev} 
          className="absolute right-[-48px] top-1/2 transform -translate-y-1/2 text-white/50 hover:text-white p-2 hover:bg-white/5 rounded-full z-10 hidden sm:block bg-transparent border-0 cursor-pointer"
        >
          {dir === 'rtl' ? <ChevronRight className="w-8 h-8" /> : <ChevronLeft className="w-8 h-8" />}
        </button>

        {/* Next Hotspot/Button */}
        <button 
          onClick={handleNext} 
          className="absolute left-[-48px] top-1/2 transform -translate-y-1/2 text-white/50 hover:text-white p-2 hover:bg-white/5 rounded-full z-10 hidden sm:block bg-transparent border-0 cursor-pointer"
        >
          {dir === 'rtl' ? <ChevronLeft className="w-8 h-8" /> : <ChevronRight className="w-8 h-8" />}
        </button>

        {/* Mobile Touch Area Split */}
        <div className="absolute inset-0 flex z-0">
          <div onClick={handlePrev} className="w-1/3 h-full cursor-pointer flex items-center justify-end" />
          <div onClick={() => setIsPaused(!isPaused)} className="w-1/3 h-full cursor-pointer" />
          <div onClick={handleNext} className="w-1/3 h-full cursor-pointer flex items-center justify-start" />
        </div>

        {/* Story Content Frame */}
        <div className="w-[92%] sm:w-full h-full max-h-[70vh] rounded-lg overflow-hidden flex items-center justify-center bg-black/40 border border-white/5 relative shadow-2xl z-2">
          <AnimatePresence mode="wait">
            <motion.img
              key={currentStory.id}
              src={currentStory.mediaUrl}
              alt="Story Content"
              className="w-full h-full object-contain pointer-events-none"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.22 }}
              referrerPolicy="no-referrer"
            />
          </AnimatePresence>
        </div>
      </div>

      {/* Reply Input Area at the Bottom */}
      <div className="max-w-xl mx-auto w-full z-10 pb-4 text-center px-1">
        <div className="bg-[#202c33] rounded-full px-5 py-2.5 flex items-center gap-3 border border-white/10 shadow-lg">
          <input
            type="text"
            placeholder="השב לסטורי..."
            className="flex-1 bg-transparent border-none text-white outline-hidden text-sm text-right"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                alert('התגובה נשלחה בהצלחה בפרטי!');
                onClose();
              }
            }}
          />
        </div>
        <p className="text-[11px] text-white/40 mt-3 font-mono">
          תגובות לסטורי יישלחו כהודעה פרטית למשתמש
        </p>
      </div>
    </div>
  );
}
