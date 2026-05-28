import React, { useState, useRef, useEffect } from 'react';
import { 
  Search, 
  MoreVertical, 
  Smile, 
  Paperclip, 
  Mic, 
  Send, 
  Phone, 
  Video, 
  Check, 
  CheckCheck, 
  CornerUpLeft, 
  ArrowLeft,
  X,
  Lock,
  File,
  Image,
  Camera,
  User,
  MapPin,
  Play,
  Pause,
  Info
} from 'lucide-react';
import { Chat, Message, UserProfile } from '../types';
import DoodleBackground from './DoodleBackground';

interface ChatWindowProps {
  chat: Chat | null;
  onSendMessage: (id: string, text: string, mediaType?: 'text' | 'image' | 'voice') => void;
  currentUser: UserProfile;
  dir: 'rtl' | 'ltr';
  wallpaperTheme?: string;
  onBackToMenu?: () => void;
  onDeleteChat: (id: string) => void;
  chats: Chat[];
}

export default function ChatWindow({
  chat,
  onSendMessage,
  currentUser,
  dir,
  wallpaperTheme = 'classic',
  onBackToMenu,
  onDeleteChat,
  chats,
}: ChatWindowProps) {
  const [inputText, setInputText] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [showDetailsPanel, setShowDetailsPanel] = useState(false);
  const [showSearchInChat, setShowSearchInChat] = useState(false);
  const [chatSearchQuery, setChatSearchQuery] = useState('');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [voicePlayingId, setVoicePlayingId] = useState<string | null>(null);
  const [voiceProgress, setVoiceProgress] = useState(0);

  // States for the newly requested "forward message" functionality
  const [messageToForward, setMessageToForward] = useState<Message | null>(null);
  const [forwardSearchQuery, setForwardSearchQuery] = useState('');
  const [forwardSentMap, setForwardSentMap] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!voicePlayingId) {
      setVoiceProgress(0);
      return;
    }
    const interval = setInterval(() => {
      setVoiceProgress(p => p + 1);
    }, 250);
    return () => clearInterval(interval);
  }, [voicePlayingId]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of conversation
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chat?.messages, chat?.isTyping]);

  if (!chat) {
    return (
      <div className="flex-1 bg-[#f8f9fa] flex flex-col items-center justify-center p-8 border-r border-[#e9edef] text-center select-none" dir="rtl">
        <div className="max-w-md flex flex-col items-center justify-center gap-6 mt-[-40px]">
          {/* WhatsApp Splash Screen Placeholder Logo */}
          <div className="w-[280px] h-[190px] flex items-center justify-center relative mb-2">
            <svg viewBox="0 0 440 290" fill="none" className="text-[#aebac1] w-full h-full">
              <path d="M220 50C130 50 60 110 60 180C60 210 70 240 90 260L75 295C75 295 105 290 120 282C150 295 185 300 220 300C310 300 380 240 380 180C380 110 310 50 220 50Z" stroke="currentColor" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="200" cy="180" r="12" fill="currentColor"/>
              <path d="M240 180H310" stroke="currentColor" strokeWidth="12" strokeLinecap="round"/>
              <path d="M130 140H310" stroke="currentColor" strokeWidth="12" strokeLinecap="round"/>
            </svg>
          </div>
          <h1 className="text-[32px] font-light text-[#41525d] select-none leading-none">WhatsApp Web</h1>
          <p className="text-[#667781] text-sm leading-relaxed max-w-sm mt-1">
            שלח וקבל הודעות מבלי להשאיר את הטלפון שלך מחובר ישירות. השתמש בוואטסאפ בעד 4 מכשירים מקושרים בו-זמנית.
          </p>
        </div>
        <div className="absolute bottom-10 text-[12px] text-[#8696a0] flex items-center gap-1">
          <Lock className="w-3.5 h-3.5" />
          <span>מוצפן מקצה לקצה. מסופק על ידי Google AI Studio</span>
        </div>
      </div>
    );
  }

  const handleSend = () => {
    if (!inputText.trim()) return;
    onSendMessage(chat.id, inputText.trim());
    setInputText('');
    setShowEmojiPicker(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSend();
    }
  };

  const handleSendMedia = (type: 'image' | 'voice') => {
    if (type === 'image') {
      const urls = [
        'https://images.unsplash.com/photo-1513542789411-b6a5d4f31634?auto=format&fit=crop&w=500&q=80',
        'https://images.unsplash.com/photo-1490730141103-6cac27aaab94?auto=format&fit=crop&w=500&q=80',
        'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=500&q=80'
      ];
      const randomUrl = urls[Math.floor(Math.random() * urls.length)];
      onSendMessage(chat.id, 'צלם אומנותי של שבת 📸', 'image');
    } else if (type === 'voice') {
      onSendMessage(chat.id, 'הודעה קולית הוקלטה 🎤', 'voice');
    }
    setShowAttachMenu(false);
  };

  const getWallpaperBg = () => {
    switch (wallpaperTheme) {
      case 'green': return '#e2efeb';
      case 'blue': return '#e2e7ef';
      case 'dark': return '#202c33';
      case 'white': return '#ffffff';
      case 'classic':
      default: return '#efeae2';
    }
  };

  // Filter messages based on chat search
  const filteredMessages = chat.messages.filter(msg => 
    msg.text.toLowerCase().includes(chatSearchQuery.toLowerCase())
  );

  const emojis = ['😃', '😂', '👍', '❤️', '🙏', '🔥', '🎉', '💡', '😍', '🤔', '😎', '👏', '🙌', '😡', '😢', '😂', '😜', '🚀', '☕', '🍉'];

  return (
    <div className="flex-1 flex h-full overflow-hidden relative" dir={dir}>
      
      {/* Main Chat Core Pane */}
      <div className="flex-1 flex flex-col h-full bg-[#efeae2] relative overflow-hidden">
        
        {/* Active Chat Header */}
        <div id="chat-window-header" className="h-[60px] bg-[#f0f2f5] px-4 py-2.5 flex items-center justify-between z-10 select-none">
          <div className="flex items-center gap-3">
            {onBackToMenu && (
              <button onClick={onBackToMenu} className="lg:hidden p-1 hover:bg-gray-250 rounded-full text-gray-550 mr-[-5px]">
                <ArrowLeft className="w-5.5 h-5.5" />
              </button>
            )}

            {/* Avatar block clickable to slide open Details */}
            <div 
              onClick={() => {
                setShowDetailsPanel(!showDetailsPanel);
                setShowSearchInChat(false);
              }}
              className="relative cursor-pointer flex items-center gap-3 active:opacity-8"
              title="פרטי איש קשר"
            >
              <img 
                src={chat.avatar} 
                alt={chat.name} 
                className="w-10 h-10 rounded-full object-cover"
                referrerPolicy="no-referrer"
              />
              <div className="text-right">
                <span className="font-semibold text-sm text-[#111b21] block leading-tight">{chat.name}</span>
                <span className={`text-[11px] block mt-0.5 ${chat.isTyping ? 'text-[#00a884] font-medium' : 'text-[#667781]'}`}>
                  {chat.isTyping ? 'הקלדה...' : chat.statusText}
                </span>
              </div>
            </div>
          </div>

          {/* Core action utilities */}
          <div className="flex items-center gap-5 text-[#54656f]">
            <button className="hover:bg-gray-200/50 p-2 rounded-full cursor-pointer bg-transparent border-0" title="שיחת שבת וידאו (מדומה)">
              <Video className="w-5 h-5" />
            </button>
            <button className="hover:bg-gray-200/50 p-2 rounded-full cursor-pointer bg-transparent border-0" title="שיחת שבת קולית (מדומה)">
              <Phone className="w-4.5 h-4.5" />
            </button>
            <span className="w-px h-5 bg-gray-300" />
            <button 
              onClick={() => {
                setShowSearchInChat(!showSearchInChat);
                setShowDetailsPanel(false);
              }}
              className={`hover:bg-gray-200/50 p-2 rounded-full cursor-pointer bg-transparent border-0 ${showSearchInChat ? 'bg-gray-250/80 text-[#008069]' : ''}`}
              title="חפש הודעות בשיחה"
            >
              <Search className="w-5 h-5" />
            </button>
            
            {/* Extended menu dropdown */}
            <div className="relative">
              <button 
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="hover:bg-gray-200/50 p-2 rounded-full cursor-pointer bg-transparent border-0"
                title="אפשרויות שיחה"
              >
                <MoreVertical className="w-5.5 h-5.5" />
              </button>

              {isMenuOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setIsMenuOpen(false)} />
                  <div className="absolute left-0 mt-2 w-48 bg-white rounded-lg shadow-xl py-1.5 z-20 border border-gray-100 text-right text-xs">
                    <button 
                      onClick={() => { setShowDetailsPanel(true); setIsMenuOpen(false); }}
                      className="w-full text-right px-4 py-2.5 hover:bg-gray-50 flex items-center gap-2.5 text-gray-700 bg-transparent border-0 cursor-pointer"
                    >
                      <Info className="w-4 h-4 text-gray-400" />
                      <span>פרטי איש קשר</span>
                    </button>
                    <button 
                      onClick={() => {
                        if (window.confirm('האם אתה בטוח שברצונך לנקות את ההודעות בשיחה זו?')) {
                          onDeleteChat(chat.id);
                        }
                        setIsMenuOpen(false);
                      }}
                      className="w-full text-right px-4 py-2.5 hover:bg-gray-50 flex items-center gap-2.5 text-[#ea0038] font-medium bg-transparent border-0 cursor-pointer border-t border-gray-100"
                    >
                      <X className="w-4 h-4" />
                      <span>מחק שיחה לצמיתות</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Dynamic Tile Doodle Background */}
        <DoodleBackground />

        {/* Message Streams Area */}
        <div 
          ref={chatContainerRef}
          className="flex-1 overflow-y-auto px-6 py-4 space-y-2 select-text relative z-1"
          style={{ backgroundColor: getWallpaperBg() }}
        >
          {/* Encryption Lock Safe Signage */}
          <div className="flex justify-center mb-4 select-none">
            <div className="bg-[#ffeecd]/90 text-[#54656f] text-[11px] leading-normal py-1.5 px-3.5 rounded-lg shadow-xs text-center max-w-sm flex items-start gap-1.5 border border-[#e6dbbb] font-sans">
              <Lock className="w-3 h-3 text-[#54656f] mt-0.5 shrink-0" />
              <span className="text-right">ההודעות והשיחות מוצפנות מקצה לקצה. לאף גורם חיצוני או לחברת וואטסאפ אין גישה לתוכן השיחות שלך.</span>
            </div>
          </div>

          {/* Render individual messages */}
          {chat.messages.length === 0 ? (
            <div className="py-20 text-center select-none text-gray-400 text-xs">
              אין הודעות בצ׳אט זה. הקלד הודעה מטה על מנת לדבר!
            </div>
          ) : (
            chat.messages.map((msg) => {
              const isOut = msg.isOutgoing;
              return (
                <div 
                  key={msg.id}
                  className={`flex ${isOut ? 'justify-start' : 'justify-end'} mb-1.5`}
                >
                  {/* Speech Bubble Container */}
                  <div 
                    className={`max-w-[65%] rounded-lg px-2.5 py-1.5 shadow-xs relative text-right select-text group ${
                      isOut 
                        ? 'bg-[#d9fdd3] text-[#111b21] rounded-tr-none' 
                        : 'bg-white text-[#111b21] rounded-tl-none'
                    }`}
                  >
                    {/* Tiny visual bubble tail arrow (WhatsApp web signature styling) */}
                    <div className={`absolute top-0 w-2.5 h-3 overflow-hidden ${
                      isOut ? 'right-[-9px]' : 'left-[-9px]'
                    }`}>
                      <div className={`w-3 h-3 transform rotate-45 ${
                        isOut ? 'bg-[#d9fdd3] -translate-x-1.5 -translate-y-1.5' : 'bg-white translate-x-1.5 -translate-y-1.5'
                      }`} />
                    </div>

                    {/* Group names color indicators */}
                    {chat.isGroup && !isOut && (
                      <div className="text-[11px] font-semibold text-[#006e5a] mb-0.5 truncate select-none">
                        {chat.name.includes('משפחה') ? 'רועי' : 'חבר עבודה'}
                      </div>
                    )}

                    {/* Rendering image attachments */}
                    {msg.mediaType === 'image' && (
                      <div className="rounded overflow-hidden mb-1.5 max-h-[300px] border border-black/5">
                        <img 
                          src={msg.mediaUrl || 'https://images.unsplash.com/photo-1513542789411-b6a5d4f31634?auto=format&fit=crop&w=400&q=80'} 
                          alt="Attachment Photo" 
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    )}

                    {/* Rendering voice speech messages */}
                    {msg.mediaType === 'voice' ? (
                      <div className="flex items-center gap-2.5 py-1 px-1">
                        <button 
                          onClick={() => setVoicePlayingId(voicePlayingId === msg.id ? null : msg.id)}
                          className="w-8 h-8 rounded-full bg-[#008069] text-white flex items-center justify-center hover:scale-105 transition-all outline-hidden border-0 cursor-pointer"
                        >
                          {voicePlayingId === msg.id ? <Pause className="w-3.5 h-3.5 fill-white" /> : <Play className="w-3.5 h-3.5 fill-white translate-x-[-1px]" />}
                        </button>
                        <div className="flex flex-col flex-1 gap-1">
                          {/* Simulated wavy audio bar */}
                          <div className="h-5 flex items-center gap-0.5 w-[140px] px-1">
                            {Array.from({ length: 18 }).map((_, i) => {
                              const ht = 4 + Math.sin(i * 1.5) * 14;
                              return (
                                <span 
                                  key={i} 
                                  className={`w-[3px] rounded-full transition-all ${
                                    voicePlayingId === msg.id && i < (voiceProgress % 18) ? 'bg-[#53bdeb]' : 'bg-gray-400'
                                  }`} 
                                  style={{ height: `${Math.max(4, ht)}px` }}
                                />
                              );
                            })}
                          </div>
                          <span className="text-[10px] text-gray-500 font-mono text-left">{msg.mediaDuration || '0:06'}</span>
                        </div>
                      </div>
                    ) : (
                      /* Rendering text body */
                      <p className="text-[14px] leading-relaxed break-words whitespace-pre-wrap select-text pl-12 pr-1 pt-0.5">
                        {msg.text}
                      </p>
                    )}

                    {/* Bottom Status metadata container (Timestamp & doubleTicks) */}
                    <div className="absolute bottom-1 left-2.5 flex items-center gap-1 select-none">
                      {/* Hover Arrow Forward button */}
                      <button
                        onClick={() => {
                          setMessageToForward(msg);
                          setForwardSentMap({});
                          setForwardSearchQuery('');
                        }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-[#667781] hover:text-[#00a884] cursor-pointer p-0.5 rounded-full hover:bg-black/5 transition-transform hover:scale-110 active:scale-95 flex items-center justify-center mr-1 bg-transparent border-0"
                        title="העבר הודעה"
                      >
                        <CornerUpLeft className="w-3.5 h-3.5 mirror" />
                      </button>

                      <span className="text-[9.5px] text-[#667781] font-mono">{msg.timestamp}</span>
                      {isOut && (
                        <span>
                          {msg.status === 'read' ? (
                            <CheckCheck className="w-3.5 h-3.5 text-[#53bdeb]" />
                          ) : msg.status === 'delivered' ? (
                            <CheckCheck className="w-3.5 h-3.5 text-[#667781]" />
                          ) : (
                            <Check className="w-3.5 h-3.5 text-[#667781]" />
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Utility & Emoji Row Bottom */}
        <div id="chat-input-row" className="bg-[#f0f2f5] px-4 py-2.5 flex items-center gap-3.5 z-10 relative border-t border-[#e9edef] select-none">
          
          <div className="flex items-center gap-4 text-[#54656f]">
            {/* Emoji toggle icon */}
            <div className="relative">
              <button 
                onClick={() => {
                  setShowEmojiPicker(!showEmojiPicker);
                  setShowAttachMenu(false);
                }}
                className={`hover:bg-gray-200/60 p-1.5 rounded-full cursor-pointer transition-colors border-0 bg-transparent ${showEmojiPicker ? 'text-[#008069]' : ''}`}
                title="אימוג׳ים"
              >
                <Smile className="w-5.5 h-5.5" />
              </button>

              {/* Emoji Selector Panel */}
              {showEmojiPicker && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowEmojiPicker(false)} />
                  <div className="absolute bottom-14 right-[-10px] bg-white rounded-lg shadow-xl p-3 z-20 border border-gray-100 w-64 text-right">
                    <span className="text-[11px] font-semibold text-gray-400 block mb-2 select-none pr-1">אימוג׳ים נפוצים</span>
                    <div className="grid grid-cols-5 gap-2 text-center text-xl">
                      {emojis.map((em, i) => (
                        <button
                          key={i}
                          onClick={() => {
                            setInputText(prev => prev + em);
                          }}
                          className="hover:bg-gray-100 p-1 rounded cursor-pointer transition-colors bg-transparent border-0"
                        >
                          {em}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Attachment pop up list */}
            <div className="relative">
              <button 
                onClick={() => {
                  setShowAttachMenu(!showAttachMenu);
                  setShowEmojiPicker(false);
                }}
                className={`hover:bg-gray-200/60 p-1.5 rounded-full cursor-pointer transition-colors border-0 bg-transparent ${showAttachMenu ? 'text-[#008069]' : ''}`}
                title="צרף קובץ"
              >
                <Paperclip className="w-5.5 h-5.5" />
              </button>

              {showAttachMenu && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowAttachMenu(false)} />
                  <div className="absolute bottom-14 right-1 flex flex-col gap-2 z-20">
                    <button 
                      onClick={() => handleSendMedia('image')}
                      className="w-10 h-10 rounded-full bg-[#bf59cf] hover:scale-105 text-white flex items-center justify-center shadow-lg transition-all border-0 cursor-pointer" 
                      title="תמונה"
                    >
                      <Image className="w-5 h-5" />
                    </button>
                    <button 
                      onClick={() => handleSendMedia('voice')}
                      className="w-10 h-10 rounded-full bg-[#00a884] hover:scale-105 text-white flex items-center justify-center shadow-lg transition-all border-0 cursor-pointer" 
                      title="הודעה קולית"
                    >
                      <Mic className="w-5 h-5" />
                    </button>
                    <button 
                      onClick={() => { alert('שליחת מסמכים מדומה מופעלת'); setShowAttachMenu(false); }}
                      className="w-10 h-10 rounded-full bg-[#1b76df] hover:scale-105 text-white flex items-center justify-center shadow-lg transition-all border-0 cursor-pointer" 
                      title="מסמך"
                    >
                      <File className="w-5 h-5" />
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Primary Text Entry Field */}
          <div className="flex-1">
            <input
              type="text"
              placeholder="הקלד הודעה..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyPress}
              className="w-full bg-white rounded-lg py-2.5 px-4 outline-hidden text-[14px] text-[#111b21] shadow-xs placeholder-gray-400 focus:ring-1 focus:ring-[#00a884]"
            />
          </div>

          {/* Dynamic Send / Mic Trigger Icon */}
          <div>
            {inputText.trim() ? (
              <button 
                onClick={handleSend}
                className="w-10 h-10 rounded-full bg-[#008069] text-white hover:bg-[#006e5a] transition-all flex items-center justify-center cursor-pointer border-0 shadow-sm"
                title="שלח"
              >
                <Send className="w-5 h-5 transform mirror" style={{ transform: dir === 'rtl' ? 'scaleX(-1) translateX(-2px)' : '' }} />
              </button>
            ) : (
              <button 
                onClick={() => {
                  onSendMessage(chat.id, 'הקלטה קולית החלה... מדומה לשימושיות', 'voice');
                }}
                className="hover:bg-gray-200/60 p-2.5 rounded-full cursor-pointer bg-transparent border-0 text-[#54656f]"
                title="הקלט הודעה קולית"
              >
                <Mic className="w-5.5 h-5.5" />
              </button>
            )}
          </div>

        </div>
      </div>

      {/* Slide-out Contact Info Details Pane */}
      {showDetailsPanel && (
        <div className="w-[30%] min-w-[280px] bg-white border-r border-[#e9edef] h-full flex flex-col z-20 text-[#111b21]">
          {/* Header */}
          <div className="bg-white h-[60px] border-b border-[#e9edef] px-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={() => setShowDetailsPanel(false)} className="hover:bg-gray-100 p-1.5 rounded-full text-gray-550 cursor-pointer bg-transparent border-0">
                <X className="w-5 h-5" />
              </button>
              <span className="font-semibold text-[15px]">פרטי איש קשר</span>
            </div>
          </div>

          {/* Body content */}
          <div className="flex-1 overflow-y-auto p-5 space-y-5 text-right">
            {/* Main Avatar Center */}
            <div className="flex flex-col items-center justify-center text-center border-b border-gray-100 pb-5">
              <img 
                src={chat.avatar} 
                alt={chat.name} 
                className="w-24 h-24 rounded-full object-cover shadow-xs border mb-3.5"
                referrerPolicy="no-referrer"
              />
              <h2 className="font-bold text-lg">{chat.name}</h2>
              <p className="text-xs text-[#667781] font-mono mt-1">{chat.phoneNumber || 'ללא מספר'}</p>
            </div>

            {/* Profile Status Description */}
            <div className="border-b border-gray-100 pb-4">
              <span className="text-[11px] text-[#25d366] font-bold block mb-1">אודות וסטטוס</span>
              <p className="text-sm font-medium text-gray-700 leading-normal">{chat.description || 'זמין/ה בוואטסאפ לכל שיחה.'}</p>
            </div>

            {/* Simulated shared images grid */}
            <div>
              <span className="text-[11px] text-[#25d366] font-bold block mb-3.5">מדיה וקישורים משותפים</span>
              <div className="grid grid-cols-3 gap-2">
                <img src="https://images.unsplash.com/photo-1513542789411-b6a5d4f31634?auto=format&fit=crop&w=100&h=100&q=80" className="w-full h-16 object-cover rounded shadow-2xs" alt="Media thumbnail 1" referrerPolicy="no-referrer" />
                <img src="https://images.unsplash.com/photo-1490730141103-6cac27aaab94?auto=format&fit=crop&w=100&h=100&q=80" className="w-full h-16 object-cover rounded shadow-2xs" alt="Media thumbnail 2" referrerPolicy="no-referrer" />
                <img src="https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=100&h=100&q=80" className="w-full h-16 object-cover rounded shadow-2xs" alt="Media thumbnail 3" referrerPolicy="no-referrer" />
              </div>
            </div>

            {/* Option to mute */}
            <div className="py-2 flex items-center justify-between border-t border-b border-gray-100 mt-2">
              <span className="text-[13px] text-gray-700">השתק התראות</span>
              <input type="checkbox" className="accent-[#008069]" />
            </div>

            <div className="text-[11px] text-[#667781] leading-relaxed pt-2">
              שיחות עם {chat.name} מוצפנות באמצעות הטכנולוגיות המתקדמות ביותר של Signal.
            </div>
          </div>
        </div>
      )}

      {/* Slide-out Search inside the current Chat window */}
      {showSearchInChat && (
        <div className="w-[30%] min-w-[280px] bg-white border-r border-[#e9edef] h-full flex flex-col z-20 text-[#111b21]">
          {/* Header */}
          <div className="bg-white h-[60px] border-b border-[#e9edef] px-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={() => setShowSearchInChat(false)} className="hover:bg-gray-100 p-1.5 rounded-full text-gray-550 cursor-pointer bg-transparent border-0">
                <X className="w-5 h-5" />
              </button>
              <span className="font-semibold text-[15px]">חיפוש הודעות בשיחה</span>
            </div>
          </div>

          {/* Search Inputs */}
          <div className="p-3 border-b border-[#e9edef]">
            <div className="bg-[#f0f2f5] rounded-lg flex items-center px-3 py-1.5 gap-2 border border-transparent focus-within:bg-white focus-within:ring-1 focus-within:ring-[#00a884]">
              <Search className="w-4 h-4 text-[#667781]" />
              <input
                type="text"
                placeholder="חפש מילים בשיחה..."
                value={chatSearchQuery}
                onChange={(e) => setChatSearchQuery(e.target.value)}
                className="flex-1 bg-transparent border-none text-xs text-right outline-hidden"
              />
            </div>
          </div>

          {/* Search Results Display */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
            {!chatSearchQuery ? (
              <div className="text-center text-gray-400 text-xs py-12">
                הקלד מילה כלשהי (למשל: "אמא" או "שיש") כדי לחפש היסטוריית שיחה.
              </div>
            ) : filteredMessages.length === 0 ? (
              <div className="text-center text-gray-400 text-xs py-12">
                אין תוצאות התואמות לחיפוש הנוכחי מתוך {chat.messages.length} הודעות.
              </div>
            ) : (
              <div>
                <span className="text-[10px] text-gray-400 font-semibold block mb-3 text-right">נמצאו {filteredMessages.length} תוצאות בשיחה זו</span>
                <div className="space-y-2">
                  {filteredMessages.map((msg) => (
                    <button
                      key={msg.id}
                      onClick={() => {
                        // In high-fidelity we can simulate highlighting message in chat stream
                        alert(`ההודעה נשלחה ב-${msg.timestamp}`);
                      }}
                      className="w-full text-right bg-gray-50 hover:bg-[#f0f2f5] p-3 rounded border border-gray-150 transition-colors flex flex-col gap-1.5 select-none cursor-pointer"
                    >
                      <div className="flex justify-between items-center w-full">
                        <span className="text-[10px] text-[#008069] font-bold">{msg.isOutgoing ? 'אני' : chat.name}</span>
                        <span className="text-[9px] text-[#667781] font-mono">{msg.timestamp}</span>
                      </div>
                      <p className="text-xs text-gray-700 leading-normal line-clamp-2">{msg.text}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 4. MODAL FORWARD MESSAGE */}
      {messageToForward && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4" dir="rtl">
          {/* Backdrop Closer */}
          <div className="absolute inset-0" onClick={() => setMessageToForward(null)} />
          
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-sm overflow-hidden relative z-10 text-[#111b21] border border-gray-150 flex flex-col max-h-[80vh]">
            {/* Header */}
            <div className="bg-[#008069] text-white p-4 flex items-center justify-between">
              <span className="font-semibold text-sm select-none">העברת הודעה אל...</span>
              <button 
                onClick={() => setMessageToForward(null)}
                className="text-white hover:bg-white/10 p-1 rounded-full cursor-pointer bg-transparent border-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Selected Message Info Preview */}
            <div className="bg-[#f0f2f5] p-3 border-b border-[#e9edef] text-right">
              <span className="text-[10px] text-[#667781] block mb-1 font-semibold">תוכן ההודעה המועברת:</span>
              <p className="text-xs text-gray-700 font-normal line-clamp-2 italic bg-white/80 p-2 rounded">
                "{messageToForward.text}"
              </p>
            </div>

            {/* Filter Input Search bar */}
            <div className="p-3 bg-white border-b border-[#e9edef]">
              <div className="bg-[#f0f2f5] rounded-lg flex items-center px-3 py-1.5 gap-2 border border-transparent focus-within:bg-white focus-within:ring-1 focus-within:ring-[#00a884]">
                <Search className="w-4 h-4 text-[#667781] shrink-0" />
                <input
                  type="text"
                  placeholder="חפש איש קשר..."
                  value={forwardSearchQuery}
                  onChange={(e) => setForwardSearchQuery(e.target.value)}
                  className="flex-1 bg-transparent border-none text-xs text-right outline-hidden"
                  autoFocus
                />
              </div>
            </div>

            {/* Modal Scrollable Chat Choices */}
            <div className="flex-1 overflow-y-auto bg-white p-2 space-y-1">
              {chats
                .filter(c => c.name.toLowerCase().includes(forwardSearchQuery.toLowerCase()))
                .map((targetChat) => {
                  const hasSent = !!forwardSentMap[targetChat.id];
                  return (
                    <div 
                      key={targetChat.id}
                      className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg transition-colors border-b border-[#f0f2f5]/60"
                    >
                      <div className="flex items-center gap-3">
                        <img 
                          src={targetChat.avatar} 
                          alt={targetChat.name} 
                          className="w-9 h-9 rounded-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                        <div className="text-right">
                          <span className="font-semibold text-xs text-[#111b21] block leading-tight">{targetChat.name}</span>
                          <span className="text-[10px] text-[#667781] block mt-0.5">{targetChat.phoneNumber || 'ללא מספר'}</span>
                        </div>
                      </div>

                      {/* Action trigger: 'Send' or 'Sent ✓' */}
                      <button
                        onClick={() => {
                          onSendMessage(targetChat.id, messageToForward.text, messageToForward.mediaType);
                          setForwardSentMap(prev => ({ ...prev, [targetChat.id]: true }));
                        }}
                        disabled={hasSent}
                        className={`text-xs px-3 py-1 rounded font-medium transition-all border cursor-pointer ${
                          hasSent 
                            ? 'bg-[#e2efeb] text-[#00a884] border-transparent font-semibold' 
                            : 'bg-[#008069] hover:bg-[#006e5a] text-white border-transparent'
                        }`}
                      >
                        {hasSent ? 'הועבר ✓' : 'שלח'}
                      </button>
                    </div>
                  );
                })}
              {chats.filter(c => c.name.toLowerCase().includes(forwardSearchQuery.toLowerCase())).length === 0 && (
                <div className="text-center text-xs text-gray-400 py-8">
                  לא נמצאו אנשי קשר תואמים
                </div>
              )}
            </div>

            {/* Footer with Finish Close trigger */}
            <div className="p-3 bg-gray-50 border-t border-[#e9edef] flex justify-end">
              <button
                onClick={() => setMessageToForward(null)}
                className="bg-[#008069] hover:bg-[#006e5a] text-white font-medium text-xs px-4 py-2 rounded-md transition-colors cursor-pointer border-0"
              >
                סגור
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
