import React, { useState, useMemo } from 'react';
import { 
  Download, 
  FileText, 
  Eye, 
  X, 
  ZoomIn, 
  ZoomOut, 
  ChevronLeft, 
  ChevronRight, 
  Maximize2,
  Image as ImageIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Message } from '../types';

interface MediaGalleryProps {
  messages: Message[];
  handleDownloadFile: (url: string, filename: string) => Promise<void> | void;
}

export function MediaGallery({ messages, handleDownloadFile }: MediaGalleryProps) {
  const [activeTab, setActiveTab] = useState<'media' | 'docs'>('media');
  
  // Lightbox Modal State
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [zoomScale, setZoomScale] = useState<number>(1);

  // 1. MAXIMUM PERFORMANCE OPTIMIZATION: Filter & aggregate shared attachments via useMemo
  const mediaImages = useMemo(() => {
    if (!messages) return [];
    return messages.filter(msg => msg.mediaType === 'image' && msg.mediaUrl);
  }, [messages]);

  const mediaDocs = useMemo(() => {
    if (!messages) return [];
    return messages.filter(msg => 
      (msg.mediaType === 'doc' && msg.mediaUrl) || 
      (msg.text || '').toLowerCase().endsWith('.pdf') || 
      (msg.mediaUrl && msg.mediaType !== 'image' && msg.mediaType !== 'voice' && !(msg.text || '').includes('הודעה קולית'))
    );
  }, [messages]);

  // Lightbox Navigation helpers
  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (lightboxIndex === null || mediaImages.length === 0) return;
    setLightboxIndex((prev) => (prev !== null && prev > 0 ? prev - 1 : mediaImages.length - 1));
    setZoomScale(1); // Reset zoom on image change
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (lightboxIndex === null || mediaImages.length === 0) return;
    setLightboxIndex((prev) => (prev !== null && prev < mediaImages.length - 1 ? prev + 1 : 0));
    setZoomScale(1); // Reset zoom on image change
  };

  const currentLightboxImage = lightboxIndex !== null ? mediaImages[lightboxIndex] : null;

  const handleZoomIn = (e: React.MouseEvent) => {
    e.stopPropagation();
    setZoomScale(prev => Math.min(prev + 0.25, 3));
  };

  const handleZoomOut = (e: React.MouseEvent) => {
    e.stopPropagation();
    setZoomScale(prev => Math.max(prev - 0.25, 0.75));
  };

  return (
    <div className="w-full flex flex-col" id="media-gallery-container text-right" dir="rtl">
      
      {/* 2. Compact Selection Tab Group (SabanOS 6.0 High-Density styling) */}
      <div className="flex bg-[#F1F5F9] rounded-xl p-1 mb-4 select-none text-[12px] font-bold border border-slate-200">
        <button
          onClick={() => setActiveTab('media')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg transition-all cursor-pointer border-0 ${
            activeTab === 'media' 
              ? 'bg-[#008069] text-white shadow-sm font-bold' 
              : 'text-slate-600 hover:text-slate-900 bg-transparent'
          }`}
        >
          <span>מדיה 📷</span>
          <span className={`px-1.5 py-0.2 text-[10px] rounded-full font-semibold ${activeTab === 'media' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'}`}>
            {mediaImages.length}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('docs')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg transition-all cursor-pointer border-0 ${
            activeTab === 'docs' 
              ? 'bg-[#008069] text-white shadow-sm font-bold' 
              : 'text-slate-600 hover:text-slate-900 bg-transparent'
          }`}
        >
          <span>מסמכים 📄</span>
          <span className={`px-1.5 py-0.2 text-[10px] rounded-full font-semibold ${activeTab === 'docs' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'}`}>
            {mediaDocs.length}
          </span>
        </button>
      </div>

      {/* Tabs Content */}
      <AnimatePresence mode="wait">
        {activeTab === 'media' ? (
          <motion.div
            key="media-tab"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="w-full"
          >
            {mediaImages.length === 0 ? (
              <div className="py-10 text-center text-xs text-slate-400 select-none flex flex-col items-center justify-center gap-2 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                <ImageIcon className="w-8 h-8 text-slate-300 stroke-[1.5]" />
                <span className="font-semibold text-slate-500">אין תמונות או סרטונים בשיחה זו</span>
              </div>
            ) : (
              /* 3. MASONRY GRID (Tailwind columns for organic Masonry effect) */
              <div className="columns-2 gap-2 sm:columns-3 max-h-[360px] overflow-y-auto pr-1">
                {mediaImages.map((msg, index) => (
                  <div
                    key={msg.id}
                    onClick={() => {
                      setLightboxIndex(index);
                      setZoomScale(1);
                    }}
                    className="relative break-inside-avoid mb-2 rounded-xl overflow-hidden border border-[#E2E8F0] shadow-sm bg-slate-100 group/image cursor-pointer hover:border-[#008069] transition-all duration-200"
                  >
                    <img
                      src={msg.mediaUrl}
                      alt={msg.text || 'תמונת מדיה'}
                      loading="lazy" /* Browser Native Lazy Loading optimized */
                      className="w-full object-cover rounded-xl group-hover/image:scale-103 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-black/45 opacity-0 group-hover/image:opacity-100 flex items-center justify-center transition-opacity duration-200">
                      <Eye className="w-5 h-5 text-white" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="docs-tab"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="w-full"
          >
            {mediaDocs.length === 0 ? (
              <div className="py-10 text-center text-xs text-slate-400 select-none flex flex-col items-center justify-center gap-2 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                <FileText className="w-8 h-8 text-slate-300 stroke-[1.5]" />
                <span className="font-semibold text-slate-500">אין מסמכים בשיחה זו</span>
              </div>
            ) : (
              /* Documents Tab: Responsive detailed list of files with download support */
              <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
                {mediaDocs.map((msg) => {
                  const isPdf = msg.text.toLowerCase().endsWith('.pdf') || (msg.mediaUrl || '').toLowerCase().includes('.pdf');
                  return (
                    <div 
                      key={msg.id}
                      onClick={() => handleDownloadFile(msg.mediaUrl || '', msg.text)}
                      className="flex items-center gap-3 p-2.5 bg-white hover:bg-slate-50 border border-[#E2E8F0] rounded-xl transition-all cursor-pointer group/doc"
                      title="לחץ להורדה מיידית"
                    >
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 select-none border transition-colors ${
                        isPdf 
                          ? 'bg-rose-50 border-rose-100 text-rose-500' 
                          : 'bg-blue-50 border-blue-100 text-blue-500'
                      }`}>
                        <FileText className="w-4.5 h-4.5" />
                      </div>
                      <div className="flex-1 min-w-0 text-right">
                        <p className="text-xs font-bold text-slate-800 truncate leading-snug group-hover/doc:text-[#008069] transition-colors" title={msg.text}>
                          {msg.text}
                        </p>
                        <span className="text-[9px] text-slate-400 font-mono block mt-0.5">{msg.timestamp}</span>
                      </div>
                      <button 
                        className="p-1.5 bg-white border border-slate-250 hover:bg-[#e2efeb] hover:text-[#008069] hover:border-[#008069] text-slate-500 rounded-lg shrink-0 transition-colors flex items-center justify-center shadow-xs"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 4. Interactive Fullscreen Lightbox Modal */}
      <AnimatePresence>
        {lightboxIndex !== null && currentLightboxImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/95 z-50 flex flex-col items-center justify-between p-4 backdrop-blur-md select-none"
            onClick={() => setLightboxIndex(null)}
          >
            {/* Lightbox Header */}
            <div 
              className="w-full flex items-center justify-between text-white p-2 z-10"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setLightboxIndex(null)}
                  className="p-2 hover:bg-white/10 rounded-full transition-colors text-white/80 hover:text-white"
                  title="סגור"
                >
                  <X className="w-6 h-6" />
                </button>
                <div className="text-right">
                  <h4 className="text-sm font-bold truncate max-w-[200px] sm:max-w-xs">{currentLightboxImage.text || 'תמונת מסירה/מדיה'}</h4>
                  <p className="text-xs text-white/50">{currentLightboxImage.timestamp}</p>
                </div>
              </div>

              {/* Controls */}
              <div className="flex items-center gap-2">
                <button 
                  onClick={handleZoomIn}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white/80 hover:text-white"
                  title="התקרבות"
                >
                  <ZoomIn className="w-5 h-5" />
                </button>
                <button 
                  onClick={handleZoomOut}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white/80 hover:text-white"
                  title="התרחקות"
                >
                  <ZoomOut className="w-5 h-5" />
                </button>
                <button 
                  onClick={() => handleDownloadFile(currentLightboxImage.mediaUrl || '', currentLightboxImage.text || 'media.jpg')}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white/80 hover:text-white"
                  title="הורדת קובץ"
                >
                  <Download className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Lightbox Main Image Frame */}
            <div 
              className="relative flex-1 w-full flex items-center justify-center overflow-hidden"
              onClick={() => setLightboxIndex(null)}
            >
              {/* Previous Button */}
              {mediaImages.length > 1 && (
                <button
                  onClick={handlePrev}
                  className="absolute left-4 p-3 bg-white/10 hover:bg-white/15 rounded-full transition-all text-white border border-white/10 z-10 hover:scale-105 active:scale-95"
                  title="הקודם"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
              )}

              {/* The Image Itself */}
              <motion.div
                key={lightboxIndex}
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: zoomScale, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                transition={{ type: 'spring', damping: 25, stiffness: 180 }}
                className="max-w-full max-h-[75vh] flex items-center justify-center p-2"
                onClick={e => e.stopPropagation()}
              >
                <img
                  src={currentLightboxImage.mediaUrl}
                  alt={currentLightboxImage.text || 'תמונה מלאה'}
                  className="max-w-full max-h-[75vh] object-contain rounded-lg shadow-2xl pointer-events-none select-none"
                />
              </motion.div>

              {/* Next Button */}
              {mediaImages.length > 1 && (
                <button
                  onClick={handleNext}
                  className="absolute right-4 p-3 bg-white/10 hover:bg-white/15 rounded-full transition-all text-white border border-white/10 z-10 hover:scale-105 active:scale-95"
                  title="הבא"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              )}
            </div>

            {/* Lightbox Footer counter */}
            <div className="text-white/40 text-xs pb-4 font-semibold">
              {lightboxIndex + 1} מתוך {mediaImages.length}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
