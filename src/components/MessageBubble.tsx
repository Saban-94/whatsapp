import React from 'react';
import { 
  Download, 
  File, 
  Play, 
  Pause, 
  CornerUpLeft, 
  CheckCheck, 
  Check 
} from 'lucide-react';
import { Message } from '../types';

const cleanNoaHtml = (text: string): string => {
  if (!text) return '';
  let cleaned = text.replace(/```(html|xml)/gi, '');
  cleaned = cleaned.replace(/```/g, '');
  return cleaned.trim();
};

interface MessageBubbleProps {
  msg: Message;
  isGroup: boolean;
  voicePlayingId: string | null;
  setVoicePlayingId: (id: string | null) => void;
  voiceProgress: number;
  handleDownloadFile: (url?: string, filename?: string) => void;
  setMessageToForward: (msg: Message | null) => void;
  setForwardSentMap: (map: Record<string, boolean>) => void;
  setForwardSearchQuery: (query: string) => void;
  readReceiptsEnabled?: boolean;
}

export const MessageBubble = React.memo(({
  msg,
  isGroup,
  voicePlayingId,
  setVoicePlayingId,
  voiceProgress,
  handleDownloadFile,
  setMessageToForward,
  setForwardSentMap,
  setForwardSearchQuery,
  readReceiptsEnabled = true
}: MessageBubbleProps) => {
  const isOut = msg.isOutgoing;
  
  return (
    <div className={`flex ${isOut ? 'justify-start' : 'justify-end'} mb-2`}>
      <div className={`max-w-[70%] rounded-2xl px-3.5 py-2 pb-5.5 shadow-xs relative text-right group ${
        isOut ? 'bg-[#007AFF] text-white rounded-br-sm' : 'bg-white text-gray-900 rounded-bl-sm border border-gray-100'
      }`}>
        
        {isGroup && !isOut && (
          <div className="text-[11px] font-semibold text-blue-600 mb-1">חבר צוות</div>
        )}

        {msg.mediaType === 'image' && (
          <div className="rounded-xl overflow-hidden mb-2 max-h-[250px] relative group/img">
            {/* Referrer policy parameter is included for secure asset fetching */}
            <img src={msg.mediaUrl || undefined} alt="Attachment" className="w-full h-full object-cover rounded-xl" referrerPolicy="no-referrer" />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 flex items-center justify-center transition-opacity">
              <button 
                onClick={() => handleDownloadFile(msg.mediaUrl, msg.text)}
                className="bg-white/95 text-gray-800 p-2 rounded-full shadow-md hover:bg-white flex items-center justify-center transition-all hover:scale-105 cursor-pointer border-0"
                title="הורד קובץ"
              >
                <Download className="w-4 h-4 text-[#007AFF]" />
              </button>
            </div>
          </div>
        )}

        {((msg.mediaUrl && msg.mediaType !== 'image' && msg.mediaType !== 'voice') || msg.text?.endsWith('.pdf')) ? (
          <div className="flex items-center gap-3 bg-black/5 hover:bg-black/10 transition-colors p-2.5 rounded-lg border border-black/10 mb-2 min-w-[210px] text-right">
            <div className="w-10 h-10 rounded-md bg-white/80 text-red-500 flex items-center justify-center font-bold text-xs shrink-0 select-none shadow-xs">
              <File className="w-5 h-5 text-red-500" />
            </div>
            <div className="flex-1 text-right min-w-0 font-sans">
              <p className="text-xs font-semibold truncate text-gray-850" title={msg.text}>{msg.text}</p>
              <p className="text-[10px] text-gray-400">מסמך מאובטח JONI - ח. סבן</p>
            </div>
            <button
              onClick={() => handleDownloadFile(msg.mediaUrl, msg.text)}
              className="bg-white text-gray-700 hover:text-[#007AFF] border border-gray-205 p-1.5 rounded-md hover:bg-gray-50 flex items-center justify-center cursor-pointer shrink-0"
              title="הורד קובץ"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>
        ) : msg.mediaType === 'voice' ? (
          <div className="flex items-center gap-3 py-1">
            <button 
              onClick={() => setVoicePlayingId(voicePlayingId === msg.id ? null : msg.id)} 
              className={`w-9 h-9 rounded-full flex items-center justify-center transition-transform cursor-pointer border-0 ${
                isOut ? 'bg-white text-[#007AFF]' : 'bg-[#007AFF] text-white'
              }`}
            >
              {voicePlayingId === msg.id ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
            </button>
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-0.5 w-[120px] px-1 opacity-80">
                {Array.from({ length: 15 }).map((_, i) => (
                  <span 
                    key={i} 
                    className={`w-1 rounded-full ${
                      voicePlayingId === msg.id && i < (voiceProgress % 15) 
                        ? (isOut ? 'bg-blue-200' : 'bg-blue-400') 
                        : (isOut ? 'bg-white/40' : 'bg-gray-300')
                    }`} 
                    style={{ height: `${Math.max(4, 4 + Math.sin(i * 1.5) * 12)}px` }} 
                  />
                ))}
              </div>
              <span className={`text-[10px] font-mono ${isOut ? 'text-blue-100' : 'text-gray-500'}`}>{msg.mediaDuration || '0:12'}</span>
            </div>
          </div>
        ) : (msg.text && (msg.text.includes('<div') || msg.text.includes('<table') || msg.text.includes('<button'))) ? (
          <div 
            className="text-[14px] leading-relaxed font-sans text-right"
            dangerouslySetInnerHTML={{ __html: cleanNoaHtml(msg.text || '') }}
          />
        ) : (
          <p className="text-[15px] leading-relaxed whitespace-pre-wrap pl-10 pt-0.5 font-sans font-normal">{msg.text}</p>
        )}

        <div className="absolute bottom-1.5 left-2.5 flex items-center gap-1.5 select-none opacity-85">
          {/* Hover Arrow Forward button */}
          <button
            onClick={() => {
              setMessageToForward(msg);
              setForwardSentMap({});
              setForwardSearchQuery('');
            }}
            className="opacity-0 group-hover:opacity-100 transition-all text-gray-500 hover:text-[#007AFF] cursor-pointer p-0.5 rounded-full hover:bg-black/5 flex items-center justify-center bg-transparent border-0"
            title="העבר הודעה"
          >
            <CornerUpLeft className="w-3.5 h-3.5" />
          </button>

          <span className={`text-[10px] font-mono ${isOut ? 'text-blue-100' : 'text-gray-400'}`}>{msg.timestamp}</span>
          {isOut && (
            <span>
              {msg.status === 'read' ? (
                <CheckCheck className={`w-3.5 h-3.5 ${readReceiptsEnabled ? 'text-white' : 'text-blue-200'}`} />
              ) : msg.status === 'delivered' ? (
                <CheckCheck className="w-3.5 h-3.5 text-blue-200" />
              ) : (
                <Check className="w-3.5 h-3.5 text-blue-200" />
              )}
            </span>
          )}
        </div>
      </div>
    </div>
  );
});

MessageBubble.displayName = 'MessageBubble';
