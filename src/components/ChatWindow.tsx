import React, { useState, useRef, useEffect, useCallback } from 'react';
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
  Sparkles,
  Info,
  Play,
  Pause,
  Download,
  Loader2,
  Copy,
  Pin
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Chat, Message, UserProfile } from '../types';
import DoodleBackground from './DoodleBackground';
import { storage, db } from '../lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { Virtuoso } from 'react-virtuoso';
import { MessageBubble } from './MessageBubble';
import { useNoaBrain } from '../hooks/useNoaBrain';

// דרישות לממשק הפרופס
interface ChatWindowProps {
  chat: Chat | null;
  onSendMessage: (id: string, text: string, mediaType?: 'text' | 'image' | 'voice', mediaUrl?: string) => void;
  currentUser: UserProfile;
  dir: 'rtl' | 'ltr';
  wallpaperTheme?: string;
  onBackToMenu?: () => void;
  onDeleteChat: (id: string) => void;
  chats: Chat[];
  onOpenAdmin: () => void;
  onTogglePinChat?: (id: string) => void;
  readReceiptsEnabled?: boolean;
  prefilledText?: string;
  onClearPrefilledText?: () => void;
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
  onOpenAdmin,
  onTogglePinChat,
  readReceiptsEnabled = true,
  prefilledText = '',
  onClearPrefilledText,
}: ChatWindowProps) {
  const [inputText, setInputText] = useState('');

  // Automatically pre-fill the chat input when navigated from an order detail card
  useEffect(() => {
    if (prefilledText) {
      setInputText(prefilledText);
      if (onClearPrefilledText) {
        onClearPrefilledText();
      }
    }
  }, [prefilledText, onClearPrefilledText]);

  const { getNoaAnalysis } = useNoaBrain();
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [showDetailsPanel, setShowDetailsPanel] = useState(false);
  const [showSearchInChat, setShowSearchInChat] = useState(false);
  const [chatSearchQuery, setChatSearchQuery] = useState('');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [voicePlayingId, setVoicePlayingId] = useState<string | null>(null);

  // Camera variables and state
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [cameraFacing, setCameraFacing] = useState<'user' | 'environment'>('environment');
  const [isCameraUploading, setIsCameraUploading] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const startCamera = async (facing: 'user' | 'environment' = 'environment') => {
    setCapturedPhoto(null);
    setIsCameraOpen(true);
    setCameraFacing(facing);
    
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false
      });
      setCameraStream(stream);
    } catch (err: any) {
      console.error('Error starting camera stream:', err);
      alert('לא ניתן לגשת למצלמה. אנא ודא/י שאישרת הרשאות מצלמה בדפדפן.');
      setIsCameraOpen(false);
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setIsCameraOpen(false);
    setCapturedPhoto(null);
  };

  const switchCamera = () => {
    const nextFacing = cameraFacing === 'user' ? 'environment' : 'user';
    startCamera(nextFacing);
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      setCapturedPhoto(dataUrl);
      
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
        setCameraStream(null);
      }
    }
  };

  const sendCameraPhoto = async () => {
    if (!capturedPhoto) return;
    setIsCameraUploading(true);
    try {
      // Decode data URL to blob synchronously without using fetch()
      const arr = capturedPhoto.split(',');
      const mimeMatch = arr[0].match(/:(.*?);/);
      const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
      const bstr = atob(arr[1]);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);
      while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
      }
      const blob = new Blob([u8arr], { type: mime });
      
      const { ref, uploadBytes, getDownloadURL } = await import('firebase/storage');
      const filename = `camera_${Date.now()}.jpg`;
      const fileRef = ref(storage, `chats/${chat.id}/${filename}`);
      
      console.log('Uploading camera photo to Firebase Storage path:', fileRef.fullPath);
      await uploadBytes(fileRef, blob);
      
      const downloadUrl = await getDownloadURL(fileRef);
      console.log('Successfully uploaded camera photo:', downloadUrl);
      
      onSendMessage(chat.id, filename, 'image', downloadUrl);
      stopCamera();
    } catch (error: any) {
      console.error('Failed to upload camera photo:', error);
      alert(`שגיאה בהעלאת התצלום: ${error.message || 'שגיאה כללית'}`);
    } finally {
      setIsCameraUploading(false);
    }
  };

  useEffect(() => {
    if (isCameraOpen && cameraStream && videoRef.current) {
      videoRef.current.srcObject = cameraStream;
    }
  }, [isCameraOpen, cameraStream]);

  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [cameraStream]);

  // New states for Responsive layout, Media tabs and copy status
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [activeMediaTab, setActiveMediaTab] = useState<'images' | 'docs'>('images');
  const [copyStatus, setCopyStatus] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleCopyPhone = (phoneNum: string) => {
    if (!phoneNum) return;
    navigator.clipboard.writeText(phoneNum);
    setCopyStatus(true);
    setTimeout(() => setCopyStatus(false), 2000);
  };

  // States for interactively managing orders status and drivers actions
  const [activeActionOrderId, setActiveActionOrderId] = useState<string | null>(null);
  const [activeActionType, setActiveActionType] = useState<'driver-select' | 'status-select' | null>(null);

  const driversInApp = [
    { id: 'hezi', name: 'חזי (סיירת)', phone: '054-1111111' },
    { id: 'sami', name: 'סאמי (מובילים כבדים)', phone: '054-2222222' },
    { id: 'avi', name: 'אבי (מחסן ותובלה)', phone: '054-3333333' },
    { id: 'shimon', name: 'שמעון (ג׳וני הובלות)', phone: '054-4444444' }
  ];

  const statusChoices = [
    { value: 'pending', label: 'ממתין ⏳' },
    { value: 'preparing', label: 'בהכנה 🛠️' },
    { value: 'ready', label: 'מוכן לעליה 📦' },
    { value: 'on_the_way', label: 'בדרך 🚚' },
    { value: 'delivered', label: 'נמסר ✅' },
    { value: 'cancelled', label: 'בוטל ❌' }
  ];

  const handleSelectDriver = async (driverId: string) => {
    if (!activeActionOrderId) return;
    try {
      const orderRef = doc(db, 'orders', activeActionOrderId);
      await updateDoc(orderRef, {
        driverId: driverId,
        eta: '', // Reset original ETA
        updatedAt: new Date().toISOString()
      });
    } catch (err) {
      console.error("Failed to assign driver in Firestore:", err);
    } finally {
      setActiveActionOrderId(null);
      setActiveActionType(null);
    }
  };

  const handleSelectStatus = async (statusValue: string) => {
    if (!activeActionOrderId) return;
    try {
      const orderRef = doc(db, 'orders', activeActionOrderId);
      await updateDoc(orderRef, {
        status: statusValue,
        eta: '', // Reset original ETA
        updatedAt: new Date().toISOString()
      });
    } catch (err) {
      console.error("Failed to update status in Firestore:", err);
    } finally {
      setActiveActionOrderId(null);
      setActiveActionType(null);
    }
  };

  // Listen to 'noa-action' events dispatched by interactive components
  useEffect(() => {
    const handleNoaActionEvent = async (e: Event) => {
      const customEvent = e as CustomEvent;
      if (!customEvent.detail) return;
      
      const { action, orderId, field, value } = customEvent.detail;
      
      if (action === 'update-order') {
        const targetId = orderId || activeActionOrderId;
        if (!targetId) return;
        try {
          const orderRef = doc(db, 'orders', targetId);
          const updateData: any = {
            updatedAt: new Date().toISOString()
          };
          
          if (field === 'status') {
            updateData.status = value;
            updateData.eta = ''; // Reset ETA
          } else if (field === 'driverId') {
            updateData.driverId = value;
            updateData.eta = ''; // Reset ETA
          } else {
            updateData[field] = value;
          }
          
          await updateDoc(orderRef, updateData);
        } catch (err) {
          console.error("Failed to update order via direct action:", err);
        }
      } else if (action === 'open-driver-select') {
        setActiveActionOrderId(orderId);
        setActiveActionType('driver-select');
      } else if (action === 'open-status-select') {
        setActiveActionOrderId(orderId);
        setActiveActionType('status-select');
      }
    };
    
    window.addEventListener('noa-action', handleNoaActionEvent);
    return () => {
      window.removeEventListener('noa-action', handleNoaActionEvent);
    };
  }, [activeActionOrderId]);

  // Auto reset delete confirmation when header menu is toggled off
  useEffect(() => {
    if (!isMenuOpen) {
      setShowDeleteConfirm(false);
    }
  }, [isMenuOpen]);
  const [voiceProgress, setVoiceProgress] = useState(0);
  const [isNoaProcessing, setIsNoaProcessing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // States for the newly requested "forward message" functionality
  const [messageToForward, setMessageToForward] = useState<Message | null>(null);
  const [forwardSearchQuery, setForwardSearchQuery] = useState('');
  const [forwardSentMap, setForwardSentMap] = useState<Record<string, boolean>>({});

  // Refs for real file uploads
  const imageInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);

  // טיימר לניגון הודעות קוליות
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

  const virtuosoRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // גלילה אוטומטית למטה מעודכנת להתמודדות עם רכיבי HTML עשירים וגירסאות שונות של גודל תוכן
  useEffect(() => {
    if (chat?.messages && chat.messages.length > 0) {
      const triggerScroll = () => {
        // 1. גלילה ישירה של Virtuoso (מהירה)
        if (virtuosoRef.current) {
          virtuosoRef.current.scrollToIndex({
            index: chat.messages.length - 1,
            align: 'end',
            behavior: 'smooth'
          });
        }
        // 2. גלילה על בסיס ה-Ref של סוף הרכיבים (אמינה עבור אלמנטים דינמיים מורכבים)
        if (messagesEndRef.current) {
          messagesEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
        }
      };

      // הפעלה מיידית
      triggerScroll();

      // הפעלות מדורגות כדי לאפשר לכל התמונות, רכיבי ה-HTML המותאמים של נועה והסידורים הדינמיים להיטען ולהתייצב
      const timer1 = setTimeout(triggerScroll, 80);
      const timer2 = setTimeout(triggerScroll, 300);
      const timer3 = setTimeout(triggerScroll, 850);

      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
        clearTimeout(timer3);
      };
    }
  }, [chat?.messages?.length, chat?.isTyping]);

  // פונקציית הורדה בטוחה עם Firebase Storage וגלישה לפולבק למניעת קריסה
  const handleDownloadFile = useCallback(async (url?: string, filename: string = 'file') => {
    if (!url) {
      console.warn('Cannot download file: URL is empty.');
      return;
    }

    try {
      const { ref, getDownloadURL } = await import('firebase/storage');
      let finalUrl = url;
      
      // אם הנתיב הוא Firebase Storage (כתובת gs:// או HTTP ייחודי של Firebase)
      if (url.startsWith('gs://') || url.includes('firebasestorage.googleapis.com')) {
        try {
          let storageRef;
          if (url.startsWith('gs://')) {
            storageRef = ref(storage, url);
          } else {
            // חילוץ נתיב הקובץ מתוך קישור ה-URL
            const decodedUrl = decodeURIComponent(url);
            const pathStartIndex = decodedUrl.indexOf('/o/') + 3;
            const pathEndIndex = decodedUrl.indexOf('?');
            if (pathStartIndex > 2 && pathEndIndex > pathStartIndex) {
              const storagePath = decodedUrl.substring(pathStartIndex, pathEndIndex);
              storageRef = ref(storage, storagePath);
            } else {
              storageRef = ref(storage, url);
            }
          }
          finalUrl = await getDownloadURL(storageRef);
        } catch (storageError) {
          console.error("Firebase Storage getDownloadURL failure:", storageError);
          // במקרה של שגיאה, המשך עם ה-URL המקורי כפולבק
        }
      }

      console.log('Downloading file from URL:', finalUrl);
      const res = await fetch(finalUrl);
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const blob = await res.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = blobUrl;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (error: any) {
      console.error('Download failed (likely CORS policy or invalid path):', error);
      
      // פתרון פולבק למניעת אי-נוחות לקוח: פתיחה בטאב נפרד להורדה ישירה דרך הדפדפן
      try {
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('target', '_blank');
        link.setAttribute('rel', 'noopener noreferrer');
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } catch (fallbackError) {
        console.error('Fallback download failed as well:', fallbackError);
        alert(`שגיאת אבטחה (CORS): לא ניתן להוריד את הקובץ ישירות. אנא לחץ לחיצה ימנית על התמונה או הקישור ושמור ידנית.`);
      }
    }
  }, []);

  if (!chat) {
    return (
      <div className="flex-1 bg-[#f8f9fa] flex flex-col items-center justify-center p-8 border-r border-[#e9edef] text-center select-none" dir="rtl">
        <div className="max-w-md flex flex-col items-center justify-center gap-6 mt-[-40px]">
          <div className="w-[280px] h-[190px] flex items-center justify-center relative mb-2">
            <svg viewBox="0 0 440 290" fill="none" className="text-[#aebac1] w-full h-full">
              <path d="M220 50C130 50 60 110 60 180C60 210 70 240 90 260L75 295C75 295 105 290 120 282C150 295 185 300 220 300C310 300 380 240 380 180C380 110 310 50 220 50Z" stroke="currentColor" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="200" cy="180" r="12" fill="currentColor"/>
              <path d="M240 180H310" stroke="currentColor" strokeWidth="12" strokeLinecap="round"/>
              <path d="M130 140H310" stroke="currentColor" strokeWidth="12" strokeLinecap="round"/>
            </svg>
          </div>
          <h1 className="text-[32px] font-light text-[#41525d] select-none leading-none">מערכת תפעול - ח. סבן</h1>
          <p className="text-[#667781] text-sm leading-relaxed max-w-sm mt-1">
            המערכת מסונכרנת בזמן אמת. בחר שיחה מהתפריט כדי לצפות בהזמנות, דוחות או לשלוח הודעות מתוזמנות.
          </p>
        </div>
        <div className="absolute bottom-10 text-[12px] text-[#8696a0] flex items-center gap-1">
          <Lock className="w-3.5 h-3.5" />
          <span>מאובטח ומוצפן. פותח עבור ראמי</span>
        </div>
      </div>
    );
  }

  // פונקציה להעלאת קבצים אמיתית ל-Firebase Storage
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, mediaType: 'image' | 'doc') => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const { ref, uploadBytes, getDownloadURL } = await import('firebase/storage');
      const fileRef = ref(storage, `chats/${chat.id}/${Date.now()}_${file.name}`);
      
      console.log('Uploading file to Firebase Storage path:', fileRef.fullPath);
      await uploadBytes(fileRef, file);
      
      const downloadUrl = await getDownloadURL(fileRef);
      console.log('Successfully uploaded and retrieved download URL:', downloadUrl);
      
      // שליחת הודעה עם הקישור האמיתי לקובץ
      onSendMessage(chat.id, file.name, mediaType === 'image' ? 'image' : 'text', downloadUrl);
    } catch (error: any) {
      console.error('Failed to upload file to Firebase Storage:', error);
      alert(`שגיאה בהעלאת קובץ: ${error.message || 'אנא ודא שחיבור ה-Firebase תקין והגדרות ה-CORS מאושרות'}`);
    } finally {
      setIsUploading(false);
      event.target.value = '';
    }
  };

  // שדרוג 1: פונקציית שליחה מותאמת לפרוטוקול JONI

  const handleSend = () => {
    if (!inputText.trim()) return;
    
    onSendMessage(chat.id, inputText.trim(), 'text');
    setInputText('');
    setShowEmojiPicker(false);
  };

  // שדרוג 2: שילוב מנוע "נועה" לשדרוג טקסט
  const handleAskNoa = async () => {
    if (!inputText.trim()) return;
    setIsNoaProcessing(true);
    try {
      const enhancedText = await getNoaAnalysis(inputText);
      setInputText(enhancedText);
    } catch (err) {
      console.error("Failed to fetch Noa response:", err);
    } finally {
      setIsNoaProcessing(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleSend();
  };

  // שדרוג 3: הכנה להעלאת קבצים אמיתית
  const handleSendMedia = (type: 'image' | 'voice' | 'document') => {
    if (type === 'image') {
      imageInputRef.current?.click();
    } else if (type === 'voice') {
      onSendMessage(chat.id, 'הודעה קולית', 'voice');
    } else if (type === 'document') {
      docInputRef.current?.click();
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

  const filteredMessages = chat.messages.filter(msg => 
    (msg.text || '').toLowerCase().includes((chatSearchQuery || '').toLowerCase())
  );

  const mediaImages = chat.messages.filter(msg => msg.mediaType === 'image' && msg.mediaUrl);
  const mediaDocs = chat.messages.filter(msg => 
    (msg.mediaType === 'doc' && msg.mediaUrl) || 
    (msg.text || '').toLowerCase().endsWith('.pdf') || 
    (msg.mediaUrl && msg.mediaType !== 'image' && msg.mediaType !== 'voice' && !(msg.text || '').includes('הודעה קולית'))
  );

  const emojis = ['😃', '😂', '👍', '❤️', '🙏', '🔥', '🎉', '💡', '🏗️', '📦', '🚚', '📋', '✅', '⏳', '🛑', '⚠️', '👷'];

  return (
    <div className="flex-1 flex h-full overflow-hidden relative" dir={dir}>
      <div className="flex-1 flex flex-col h-full bg-[#efeae2] relative overflow-hidden">
        
        {/* Header */}
        <div 
          id="chat-window-header" 
          onDoubleClick={onOpenAdmin} 
          className="h-[60px] bg-white/80 backdrop-blur-md px-4 py-2.5 flex items-center justify-between z-10 select-none border-b border-gray-200 cursor-pointer"
          title="לחיצה כפולה לפתיחת פאנל ניהול"
        >
          <div className="flex items-center gap-3">
            {onBackToMenu && (
              <button onClick={onBackToMenu} className="lg:hidden p-1 hover:bg-gray-100 rounded-full text-[#007AFF] mr-[-5px]">
                <ArrowLeft className="w-5.5 h-5.5" />
              </button>
            )}

            <div 
              onClick={() => { setShowDetailsPanel(!showDetailsPanel); setShowSearchInChat(false); }}
              className="relative cursor-pointer flex items-center gap-3 active:opacity-50 transition-opacity"
            >
              <img src={chat.avatar || undefined} alt={chat.name} className="w-10 h-10 rounded-full object-cover shadow-sm" />
              <div className="text-right">
                <span className="font-semibold text-[15px] text-gray-900 block leading-tight">{chat.name}</span>
                <div className="h-4 overflow-hidden relative mt-0.5 min-w-[120px]">
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.span
                      key={chat.isTyping ? 'typing' : `status-${chat.statusText || ''}`}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.18, ease: "easeOut" }}
                      className={`text-[12px] block absolute right-0 left-0 text-right ${chat.isTyping ? 'text-[#007AFF] font-medium' : 'text-gray-500'}`}
                    >
                      {chat.isTyping 
                        ? (chat.isGroup && chat.typingUser ? `User ${chat.typingUser} is typing...` : 'מקליד/ה...') 
                        : chat.statusText}
                    </motion.span>
                  </AnimatePresence>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 text-[#007AFF]">
            <button className="hover:bg-gray-100 p-2 rounded-full transition-colors"><Video className="w-5 h-5" /></button>
            <button className="hover:bg-gray-100 p-2 rounded-full transition-colors"><Phone className="w-4.5 h-4.5" /></button>
            <span className="w-px h-5 bg-gray-300 mx-1" />
            <button 
              onClick={() => { setShowSearchInChat(!showSearchInChat); setShowDetailsPanel(false); }}
              className={`hover:bg-gray-100 p-2 rounded-full transition-colors ${showSearchInChat ? 'bg-blue-50' : ''}`}
            >
              <Search className="w-5 h-5" />
            </button>
            
            <div className="relative">
              <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="hover:bg-gray-100 p-2 rounded-full transition-colors">
                <MoreVertical className="w-5.5 h-5.5" />
              </button>
              {isMenuOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setIsMenuOpen(false)} />
                  <div className="absolute left-0 mt-2 w-48 bg-white/95 backdrop-blur-xl rounded-xl shadow-lg py-1.5 z-20 border border-gray-100 text-right text-[13px]">
                    <button onClick={() => { setShowDetailsPanel(true); setIsMenuOpen(false); }} className="w-full px-4 py-2.5 hover:bg-gray-50 flex items-center gap-3 text-gray-800">
                      <Info className="w-4 h-4 text-gray-400" /> פרטי איש קשר
                    </button>
                    <button 
                      onClick={() => {
                        if (onTogglePinChat) {
                          onTogglePinChat(chat.id);
                        }
                        setIsMenuOpen(false);
                      }}
                      className="w-full px-4 py-2.5 hover:bg-gray-50 flex items-center gap-3 text-gray-800 border-t border-gray-100/50"
                    >
                      <Pin className={`w-4 h-4 ${chat?.pinned ? 'text-[#008069]' : 'text-gray-450'} rotate-45 transform`} />
                      <span>{chat?.pinned ? 'בטל נעצה' : 'נעץ שיחה'}</span>
                    </button>
                    <div className="h-px bg-gray-100 my-1" />
                    {showDeleteConfirm ? (
                      <div className="flex items-center justify-between px-4 py-2.5 bg-red-50/70 text-xs animation-fade-in select-none">
                        <span className="text-red-600 font-medium">בטוח?</span>
                        <div className="flex gap-1.5">
                          <button
                            onClick={() => {
                              onDeleteChat(chat.id);
                              setShowDeleteConfirm(false);
                              setIsMenuOpen(false);
                            }}
                            className="bg-red-500 font-bold text-white px-2 py-0.5 rounded cursor-pointer hover:bg-red-600 transition-colors border-0"
                          >
                            מחק
                          </button>
                          <button
                            onClick={() => setShowDeleteConfirm(false)}
                            className="bg-gray-200 font-medium text-gray-700 px-2 py-0.5 rounded cursor-pointer hover:bg-gray-300 transition-colors border-0"
                          >
                            ביטול
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowDeleteConfirm(true);
                        }} 
                        className="w-full px-4 py-2.5 hover:bg-red-50 flex items-center gap-3 text-red-500 font-medium text-right border-0 bg-transparent cursor-pointer"
                      >
                        <X className="w-4 h-4" /> מחק שיחה
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        <DoodleBackground />

        {/* High performance Virtualized Message List */}
        {chat.messages.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 select-none text-center relative z-1" style={{ backgroundColor: getWallpaperBg() }}>
            <div className="py-20 text-center text-gray-400 text-sm">אין הודעות. התחל להקליד או בקש מנועה לנסח עבורך.</div>
          </div>
        ) : (
          <Virtuoso
            ref={virtuosoRef}
            data={chat.messages}
            alignToBottom={true}
            followOutput="smooth"
            defaultItemHeight={85}
            computeItemKey={(index, item) => item.id || String(index)}
            className="flex-1 w-full h-full select-text relative z-1 outline-none font-sans"
            style={{ backgroundColor: getWallpaperBg() }}
            components={{
              Header: () => (
                <div className="flex justify-center mb-4 mt-4 select-none">
                  <div className="bg-[#f2f2f7]/90 text-gray-600 text-[11px] py-1.5 px-4 rounded-full shadow-sm flex items-center gap-1.5 border border-white/50 backdrop-blur-sm">
                    <Lock className="w-3.5 h-3.5 text-[#008069]" />
                    <span>ההודעות מוצפנות ומשותפות אוטומטית דרך JONI</span>
                  </div>
                </div>
              ),
              Footer: () => (
                <div ref={messagesEndRef} style={{ height: '2px' }} className="w-full" />
              )
            }}
            itemContent={(_index, msg) => (
              <div className="px-6 py-1">
                <MessageBubble
                  msg={msg}
                  isGroup={!!chat.isGroup}
                  voicePlayingId={voicePlayingId}
                  setVoicePlayingId={setVoicePlayingId}
                  voiceProgress={voiceProgress}
                  handleDownloadFile={handleDownloadFile}
                  setMessageToForward={setMessageToForward}
                  setForwardSentMap={setForwardSentMap}
                  setForwardSearchQuery={setForwardSearchQuery}
                  readReceiptsEnabled={readReceiptsEnabled}
                />
              </div>
            )}
          />
        )}

        {/* Input Area */}
        <div className="bg-white/80 backdrop-blur-md px-4 py-3 flex items-center gap-3 z-10 relative border-t border-gray-200">
          
          {/* Hidden inputs for real file uploads */}
          <input
            type="file"
            ref={imageInputRef}
            onChange={(e) => handleFileUpload(e, 'image')}
            accept="image/*"
            style={{ display: 'none' }}
          />
          <input
            type="file"
            ref={docInputRef}
            onChange={(e) => handleFileUpload(e, 'doc')}
            accept=".pdf,.doc,.docx,.xls,.xlsx,.txt"
            style={{ display: 'none' }}
          />

          {isUploading && (
            <div className="absolute inset-0 bg-white/95 backdrop-blur-xs flex items-center justify-center gap-3 z-20 transition-all">
              <Loader2 className="w-5 h-5 text-[#007AFF] animate-spin" />
              <span className="text-sm text-gray-700 font-medium">מעלה קובץ מאובטח ל-Drive של ח. סבן...</span>
            </div>
          )}
          
          {/* Noa AI Button */}
          <button 
            onClick={handleAskNoa}
            disabled={!inputText.trim() || isNoaProcessing}
            className={`p-2 rounded-full transition-all ${inputText.trim() ? 'bg-purple-100 text-purple-600 hover:bg-purple-200' : 'bg-gray-100 text-gray-400'}`}
            title="בקש מנועה לנסח"
          >
            <Sparkles className={`w-5 h-5 ${isNoaProcessing ? 'animate-pulse' : ''}`} />
          </button>

          <div className="flex items-center gap-2 text-gray-500">
            <button onClick={() => { setShowAttachMenu(!showAttachMenu); setShowEmojiPicker(false); }} className="p-2 hover:bg-gray-100 rounded-full transition-colors relative" title="צרף קובץ">
              <Paperclip className="w-5.5 h-5.5" />
              {showAttachMenu && (
                <div className="absolute bottom-14 right-0 flex flex-col gap-3 bg-white p-3 rounded-2xl shadow-xl border border-gray-100 z-30">
                  <div onClick={() => { startCamera('environment'); setShowAttachMenu(false); }} className="w-12 h-12 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center hover:scale-105 transition-transform cursor-pointer" title="צילום מצלמה שטח"><Camera className="w-5 h-5" /></div>
                  <div onClick={() => handleSendMedia('image')} className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center hover:scale-105 transition-transform cursor-pointer" title="גלריית תמונות"><Image className="w-5 h-5" /></div>
                  <div onClick={() => handleSendMedia('voice')} className="w-12 h-12 rounded-full bg-green-100 text-green-600 flex items-center justify-center hover:scale-105 transition-transform cursor-pointer" title="הודעה קולית"><Mic className="w-5 h-5" /></div>
                  <div onClick={() => handleSendMedia('document')} className="w-12 h-12 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center hover:scale-105 transition-transform cursor-pointer" title="מסמך"><File className="w-5 h-5" /></div>
                </div>
              )}
            </button>
            <button onClick={() => startCamera('environment')} className="p-2 hover:bg-gray-100 text-gray-500 hover:text-amber-500 rounded-full transition-all cursor-pointer" title="צילום תמונה מהמצלמה">
              <Camera className="w-5.5 h-5.5" />
            </button>
          </div>

          <div className="flex-1 relative">
             <button onClick={() => { setShowEmojiPicker(!showEmojiPicker); setShowAttachMenu(false); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <Smile className="w-5.5 h-5.5" />
             </button>
            <input
              type="text"
              placeholder="הודעה חדשה..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyPress}
              className="w-full bg-[#f2f2f7] rounded-full py-2.5 pl-4 pr-11 outline-none text-[15px] text-gray-900 focus:bg-white focus:ring-2 focus:ring-[#007AFF]/20 transition-all"
            />
            {showEmojiPicker && (
              <div className="absolute bottom-14 right-0 bg-white rounded-2xl shadow-xl p-4 border border-gray-100 w-72">
                <div className="grid grid-cols-6 gap-2 text-2xl">
                  {emojis.map((em, i) => (
                    <button key={i} onClick={() => setInputText(p => p + em)} className="hover:scale-125 transition-transform">{em}</button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div>
            {inputText.trim() ? (
              <button onClick={handleSend} className="w-10 h-10 rounded-full bg-[#007AFF] text-white flex items-center justify-center hover:bg-blue-600 transition-colors shadow-sm">
                <Send className="w-5 h-5 transform rotate-180 -ml-1" />
              </button>
            ) : (
              <button className="w-10 h-10 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center hover:bg-gray-200 transition-colors">
                <Mic className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* DETAILS PANEL (פרטי איש קשר) */}
      <AnimatePresence>
        {showDetailsPanel && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: isMobile ? '100%' : '380px', opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ type: 'tween', duration: 0.22 }}
            className={`h-full bg-white border-r md:border-r-0 md:border-l border-[#e9edef] flex flex-col z-20 overflow-hidden shrink-0 text-right ${
              isMobile ? 'absolute inset-0' : 'relative'
            }`}
          >
            {/* Header */}
            <div className="h-[60px] bg-white px-4 border-b border-[#e9edef] flex items-center justify-between select-none shrink-0">
              <span className="font-semibold text-[16px] text-[#111b21]">פרטי איש קשר</span>
              <button 
                onClick={() => setShowDetailsPanel(false)} 
                className="text-[#667781] hover:bg-gray-105 p-1 rounded-full cursor-pointer bg-transparent border-0 transition-colors"
              >
                <X className="w-5.5 h-5.5" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto pb-6">
              
              {/* Profile Card */}
              <div className="flex flex-col items-center justify-center py-6 px-4 bg-white shadow-xs border-b border-gray-100">
                <img 
                  src={chat.avatar || undefined} 
                  alt={chat.name} 
                  className="w-[110px] h-[110px] rounded-full object-cover shadow-sm border border-gray-150 mb-3"
                  referrerPolicy="no-referrer"
                />
                <h3 className="font-semibold text-base text-[#111b21] leading-tight text-center">{chat.name}</h3>
                <span className="text-xs text-gray-500 font-mono mt-1 text-center select-all">{chat.phoneNumber || 'אין מספר טלפון'}</span>
                
                {chat.isOnline ? (
                  <span className="text-xs text-[#00a884] font-semibold mt-2 flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-[#1fa96c] inline-block animate-pulse" />
                    מחובר/ת כעת
                  </span>
                ) : (
                  <span className="text-xs text-gray-400 mt-2">לא מחובר</span>
                )}
              </div>

              {/* Bio & About Section */}
              <div className="bg-white px-6 py-4 border-b border-gray-100">
                <span className="text-[12px] text-[#008069] font-semibold block mb-2 select-none">אודות</span>
                <p className="text-sm text-gray-700 leading-relaxed font-normal">
                  {chat.description || "מערכת תפעול משרד ח. סבן - מזכירה אישית JONI AI - שירות לקוחות."}
                </p>
                <div className="flex items-center justify-between mt-3 bg-gray-50 rounded-lg p-2.5 border border-gray-150">
                  <span className="text-xs text-gray-600 truncate font-mono select-all">{chat.phoneNumber || 'ללא מספר קשר'}</span>
                  <button 
                    onClick={() => handleCopyPhone(chat.phoneNumber || '')}
                    className="p-1.5 text-[#008069] bg-white border border-gray-205 hover:bg-gray-50 rounded shadow-xs flex items-center justify-center cursor-pointer text-[11px] gap-1 font-semibold"
                    title="העתק מספר טלפון"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>{copyStatus ? 'הועתק!' : 'העתק'}</span>
                  </button>
                </div>
              </div>

              {/* MEDIA & FILES ACCORDION PANEL (המדיה והקבצים) */}
              <div className="bg-white px-6 py-4 border-b border-gray-100 flex flex-col">
                <div className="flex items-center justify-between mb-3 select-none">
                  <span className="text-[14px] text-[#111b21] font-semibold">מדיה וקבצים JONI</span>
                  <span className="text-[11px] font-bold text-[#008069] px-2 py-0.5 bg-[#e2efeb] rounded-full">
                    {mediaImages.length + mediaDocs.length} פריטים
                  </span>
                </div>

                {/* Sub Tab selection */}
                <div className="flex bg-gray-100 rounded-lg p-0.5 mb-3.5 select-none text-[11px] font-medium">
                  <button
                    onClick={() => setActiveMediaTab('images')}
                    className={`flex-1 text-center py-1.5 rounded-md transition-all cursor-pointer border-0 ${
                      activeMediaTab === 'images' ? 'bg-[#008069] text-white shadow-xs font-semibold' : 'text-gray-600 bg-transparent hover:text-gray-900'
                    }`}
                  >
                    תמונות וסרטונים ({mediaImages.length})
                  </button>
                  <button
                    onClick={() => setActiveMediaTab('docs')}
                    className={`flex-1 text-center py-1.5 rounded-md transition-all cursor-pointer border-0 ${
                      activeMediaTab === 'docs' ? 'bg-[#008069] text-white shadow-xs font-semibold' : 'text-gray-600 bg-transparent hover:text-gray-900'
                    }`}
                  >
                    מסמכים ({mediaDocs.length})
                  </button>
                </div>

                {/* Media contents list/grid */}
                {activeMediaTab === 'images' ? (
                  mediaImages.length === 0 ? (
                    <div className="py-8 text-center text-xs text-gray-400 select-none flex flex-col items-center justify-center gap-1.5 bg-gray-50 rounded-xl border border-dashed border-gray-200/80">
                      <Image className="w-7 h-7 text-gray-300 stroke-1" />
                      <span>אין תמונות או סרטונים בשיחה זו</span>
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-2 max-h-[280px] overflow-y-auto pr-1">
                      {mediaImages.map((msg) => (
                        <div 
                          key={msg.id}
                          className="relative aspect-square rounded-lg overflow-hidden border border-gray-150 bg-gray-100 group/item cursor-pointer"
                          onClick={() => handleDownloadFile(msg.mediaUrl, msg.text)}
                          title="לחץ להורדה מיידית"
                        >
                          <img 
                            src={msg.mediaUrl || undefined} 
                            alt={msg.text} 
                            className="w-full h-full object-cover group-hover/item:scale-105 transition-transform duration-250" 
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/item:opacity-100 flex items-center justify-center transition-all">
                            <Download className="w-5 h-5 text-white" />
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                ) : (
                  mediaDocs.length === 0 ? (
                    <div className="py-8 text-center text-xs text-gray-400 select-none flex flex-col items-center justify-center gap-1.5 bg-gray-50 rounded-xl border border-dashed border-gray-200/80">
                      <File className="w-7 h-7 text-gray-300 stroke-1" />
                      <span>אין מסמכים בשיחה זו</span>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                      {mediaDocs.map((msg) => (
                        <div 
                          key={msg.id}
                          onClick={() => handleDownloadFile(msg.mediaUrl, msg.text)}
                          className="flex items-center gap-3 p-2 bg-gray-50/50 hover:bg-gray-100 border border-gray-150 rounded-lg transition-colors cursor-pointer text-right group/d"
                          title="לחץ להורדה"
                        >
                          <div className="w-8 h-8 rounded bg-[#efeff4] text-[#007AFF] flex items-center justify-center font-bold text-xs shrink-0 select-none border border-gray-200">
                            <File className="w-4 h-4 text-[#007AFF]" />
                          </div>
                          <div className="flex-1 min-w-0 pr-0.5">
                            <p className="text-xs font-semibold text-gray-800 truncate leading-tight" title={msg.text}>{msg.text}</p>
                            <span className="text-[9px] text-gray-400 font-mono block mt-1">{msg.timestamp}</span>
                          </div>
                          <button 
                            className="p-1 px-1.5 bg-white border border-gray-200 group-hover/d:border-[#007AFF] text-gray-500 group-hover/d:text-[#007AFF] rounded shrink-0 transition-colors flex items-center justify-center shadow-2xs"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )
                )}
              </div>

              {/* Encryption Notice */}
              <div className="p-5 select-none text-center bg-gray-50/40 text-[11px] text-[#667781] leading-relaxed flex flex-col items-center justify-center gap-2">
                <Lock className="w-4 h-4 text-[#008069]" />
                <span>ההודעות והשיחות מוצפנות מקצה לקצה בצורה מלאה דרך JONI Smart Office.</span>
              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* SEARCH PANEL (חיפוש בשיחה) */}
      <AnimatePresence>
        {showSearchInChat && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: isMobile ? '100%' : '380px', opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ type: 'tween', duration: 0.22 }}
            className={`h-full bg-white border-r md:border-r-0 md:border-l border-[#e9edef] flex flex-col z-20 overflow-hidden shrink-0 text-right ${
              isMobile ? 'absolute inset-0' : 'relative'
            }`}
          >
            {/* Header */}
            <div className="h-[60px] bg-white px-4 border-b border-[#e9edef] flex items-center justify-between select-none shrink-0">
              <span className="font-semibold text-[16px] text-[#111b21]">חיפוש הודעות</span>
              <button 
                onClick={() => setShowSearchInChat(false)} 
                className="text-[#667781] hover:bg-gray-105 p-1 rounded-full cursor-pointer bg-transparent border-0 transition-colors"
              >
                <X className="w-5.5 h-5.5" />
              </button>
            </div>

            {/* Input Search Block */}
            <div className="p-3 bg-white border-b border-[#e9edef]">
              <div className="bg-[#f0f2f5] rounded-xl flex items-center px-3.5 py-1.5 gap-2 border border-transparent focus-within:bg-white focus-within:ring-2 focus-within:ring-[#007AFF]/25 transition-all">
                <Search className="w-4.5 h-4.5 text-[#667781]" />
                <input
                  type="text"
                  placeholder="חפש הודעות..."
                  value={chatSearchQuery}
                  onChange={(e) => setChatSearchQuery(e.target.value)}
                  className="flex-1 bg-transparent border-none text-sm text-right outline-hidden"
                  autoFocus
                />
                {chatSearchQuery && (
                  <button onClick={() => setChatSearchQuery('')} className="bg-transparent border-0 p-0 text-gray-400 hover:text-gray-650">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Results Panel */}
            <div className="flex-1 overflow-y-auto bg-white p-4">
              {chatSearchQuery.trim() === '' ? (
                <div className="text-center text-xs text-gray-400 py-16 px-4 select-none flex flex-col items-center justify-center gap-1">
                  <span>הקלד מילה או ביטוי כדי לחפש בהודעות השיחה</span>
                </div>
              ) : filteredMessages.length === 0 ? (
                <div className="text-center text-xs text-gray-400 py-16 px-4 select-none">
                  לא נמצאו הודעות תואמות בשיחה זו
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="text-[11px] text-[#008069] font-semibold mb-2 uppercase select-none">
                    נמצאו {filteredMessages.length} הודעות תואמות
                  </div>
                  {filteredMessages.map((msg) => (
                    <div 
                      key={msg.id}
                      className="p-3 rounded-lg bg-[#f0f2f5]/60 hover:bg-[#f0f2f5] transition-all border border-gray-150/50 text-right cursor-pointer"
                    >
                      <div className="flex justify-between items-center mb-1">
                        <span className={`text-[10px] font-bold ${msg.isOutgoing ? 'text-blue-600' : 'text-[#008069]'}`}>
                          {msg.isOutgoing ? 'נשלח ממך' : chat.name}
                        </span>
                        <span className="text-[9px] text-gray-400 font-mono">{msg.timestamp}</span>
                      </div>
                      <p className="text-xs text-gray-700 leading-normal line-clamp-3 select-text">{msg.text}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL FORWARD MESSAGE */}
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
                .filter(c => (c.name || '').toLowerCase().includes((forwardSearchQuery || '').toLowerCase()))
                .map((targetChat) => {
                  const hasSent = !!forwardSentMap[targetChat.id];
                  return (
                    <div 
                      key={targetChat.id}
                      className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg transition-colors border-b border-[#f0f2f5]/60"
                    >
                      <div className="flex items-center gap-3">
                        <img 
                          src={targetChat.avatar || undefined} 
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
                          onSendMessage(targetChat.id, messageToForward.text, messageToForward.mediaType, messageToForward.mediaUrl);
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
              {chats.filter(c => (c.name || '').toLowerCase().includes((forwardSearchQuery || '').toLowerCase())).length === 0 && (
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

      {/* Popup/Modal for Update Status or Assign Driver */}
      <AnimatePresence>
        {activeActionType && activeActionOrderId && (
          <div className="fixed inset-0 z-55 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => { setActiveActionOrderId(null); setActiveActionType(null); }}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs"
            />
            
            {/* Modal Card */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              transition={{ type: 'spring', duration: 0.35 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden border border-slate-100 relative z-10 text-right"
              dir="rtl"
            >
              {/* Header */}
              <div className="px-5 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between select-none">
                <h3 className="font-bold text-sm text-slate-800">
                  {activeActionType === 'driver-select' ? 'שבץ נהג להזמנה 👤' : 'עדכן סטטוס הזמנה 🔄'}
                </h3>
                <button 
                  onClick={() => { setActiveActionOrderId(null); setActiveActionType(null); }}
                  className="p-1.5 hover:bg-slate-200 rounded-full text-slate-400 border-0 bg-transparent cursor-pointer transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              
              {/* Content */}
              <div className="p-5 max-h-[320px] overflow-y-auto space-y-2">
                {activeActionType === 'driver-select' ? (
                  driversInApp.map(d => (
                    <button
                      key={d.id}
                      onClick={() => handleSelectDriver(d.id)}
                      className="w-full text-right p-3 rounded-xl border border-slate-200 hover:border-[#3B82F6] hover:bg-blue-50/40 transition-all font-sans cursor-pointer flex items-center justify-between outline-none"
                    >
                      <div className="text-sm font-bold text-slate-800">{d.name}</div>
                      <div className="text-xs text-slate-500 font-mono">{d.phone}</div>
                    </button>
                  ))
                ) : (
                  statusChoices.map(sc => (
                    <button
                      key={sc.value}
                      onClick={() => handleSelectStatus(sc.value)}
                      className="w-full text-right p-3 rounded-xl border border-slate-200 hover:border-[#3B82F6] hover:bg-blue-50/40 transition-all font-sans cursor-pointer flex items-center justify-between outline-none"
                    >
                      <div className="text-sm font-bold text-slate-800">{sc.label}</div>
                      <div className="text-[10px] uppercase font-mono tracking-wider font-bold text-slate-400">{sc.value}</div>
                    </button>
                  ))
                )}
              </div>
              
              {/* Footer */}
              <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-100 text-left select-none">
                <button
                  onClick={() => { setActiveActionOrderId(null); setActiveActionType(null); }}
                  className="px-4 py-1.5 text-xs font-semibold bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-lg cursor-pointer transition-all"
                >
                  ביטול
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CAMERA OVERLAY */}
      <AnimatePresence>
        {isCameraOpen && (
          <div className="fixed inset-0 z-55 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={stopCamera}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
            />

            {/* Modal Card */}
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 30 }}
              transition={{ type: 'spring', duration: 0.4 }}
              className="bg-black rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden border border-zinc-800 relative z-10 text-right flex flex-col h-[520px] max-h-[85vh]"
              dir="rtl"
            >
              {/* Header */}
              <div className="px-5 py-4 border-b border-zinc-800 bg-zinc-900 flex items-center justify-between select-none">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse animate-duration-1000"></span>
                  <h3 className="font-bold text-sm text-zinc-100 font-sans">
                    {capturedPhoto ? 'תצוגה מקדימה - צילום שטח' : 'צילום מאובטח מרחוק - ח. סבן'}
                  </h3>
                </div>
                <button 
                  onClick={stopCamera}
                  disabled={isCameraUploading}
                  className="p-1.5 hover:bg-zinc-800 rounded-full text-zinc-400 border-0 bg-transparent cursor-pointer transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Viewfinder/Preview Window */}
              <div className="flex-1 bg-black relative flex items-center justify-center overflow-hidden">
                {!capturedPhoto ? (
                  <>
                    <video 
                      ref={videoRef}
                      autoPlay 
                      playsInline 
                      muted
                      className="w-full h-full object-cover max-h-full"
                    />
                    {/* Retro Camera Grid overlay */}
                    <div className="absolute inset-0 border-[20px] border-black/40 pointer-events-none flex items-center justify-center">
                      <div className="w-full h-full border border-white/20 relative">
                        <div className="absolute top-1/2 left-0 right-0 h-px bg-white/10" />
                        <div className="absolute left-1/2 top-0 bottom-0 w-px bg-white/10" />
                      </div>
                    </div>
                  </>
                ) : (
                  <img 
                    src={capturedPhoto} 
                    alt="תצלום שטח" 
                    className="w-full h-full object-contain"
                  />
                )}

                {isCameraUploading && (
                  <div className="absolute inset-0 bg-black/75 backdrop-blur-xs flex flex-col items-center justify-center gap-3 z-20 font-sans">
                    <Loader2 className="w-8 h-8 text-[#007AFF] animate-spin" />
                    <span className="text-sm text-zinc-200 font-medium font-sans">מעלה תצלום מאובטח ל-SabanOS Cloud...</span>
                  </div>
                )}
              </div>

              {/* Controls footer */}
              <div className="px-6 py-5 bg-zinc-900 border-t border-zinc-800 flex items-center justify-between select-none">
                {!capturedPhoto ? (
                  <>
                    {/* Switch Camera */}
                    <button
                      onClick={switchCamera}
                      className="p-3 text-zinc-300 hover:bg-zinc-800 rounded-full hover:text-white transition-colors border-0 bg-transparent cursor-pointer flex items-center gap-1.5 text-xs font-semibold"
                      title="החלף מצלמה (קדמית/אחורית)"
                    >
                      <Camera className="w-5 h-5" />
                      <span className="font-sans">החלף כיוון</span>
                    </button>

                    {/* Shutter Circle Button */}
                    <button
                      onClick={capturePhoto}
                      className="w-16 h-16 rounded-full border-4 border-white bg-zinc-900 flex items-center justify-center hover:scale-105 transition-transform active:scale-95 cursor-pointer relative mx-auto"
                      title="צלם תמונה"
                    >
                      <div className="w-12 h-12 rounded-full bg-white transition-colors" />
                    </button>

                    {/* Cancel/Exit */}
                    <button
                      onClick={stopCamera}
                      className="px-4 py-2 text-xs font-semibold bg-zinc-850 hover:bg-zinc-800 text-zinc-200 rounded-xl cursor-pointer transition-all border-0 font-sans"
                    >
                      ביטול
                    </button>
                  </>
                ) : (
                  <>
                    {/* Cancel/Retake */}
                    <button
                      onClick={() => startCamera(cameraFacing)}
                      disabled={isCameraUploading}
                      className="px-5 py-2.5 text-xs font-bold text-zinc-300 hover:bg-zinc-800 rounded-xl cursor-pointer transition-colors flex items-center gap-1.5 border border-zinc-700 bg-transparent font-sans"
                    >
                      <span>🔄 צילום מחדש</span>
                    </button>

                    {/* Send captured photo */}
                    <button
                      onClick={sendCameraPhoto}
                      disabled={isCameraUploading}
                      className="px-6 py-2.5 text-xs font-bold bg-[#007AFF] hover:bg-blue-600 text-white rounded-xl cursor-pointer transition-colors flex items-center gap-2 shadow-lg hover:shadow-cyan-500/10 border-0 font-sans"
                    >
                      <span>שלח תמונה 🚀</span>
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
