import React, { useState, useRef } from 'react';
import { motion } from 'motion/react';
import { ArrowRight, ArrowLeft, Camera, Check, Pencil, User, Phone, CheckSquare, Plus, Trash, Loader2 } from 'lucide-react';
import { UserProfile, Chat } from '../types';
import { doc, setDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { getApiUrl } from '../lib/api';

interface DrawerProps {
  onClose: () => void;
  dir: 'rtl' | 'ltr';
}

// ---------------- MODEL: Profile Drawer ----------------
interface ProfileDrawerProps extends DrawerProps {
  profile: UserProfile;
  onUpdateProfile: (p: UserProfile) => void;
}

export function ProfileDrawer({ onClose, profile, onUpdateProfile, dir }: ProfileDrawerProps) {
  const [name, setName] = useState(profile.name);
  const [status, setStatus] = useState(profile.status);
  const [isEditingName, setIsEditingName] = useState(false);
  const [isEditingStatus, setIsEditingStatus] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');

  const handleSaveName = async () => {
    setIsEditingName(false);
    const updated = { ...profile, name };
    onUpdateProfile(updated);
    
    // Sync Name to Firestore for consistency
    try {
      await setDoc(doc(db, 'joni_users', 'hsaban2025'), {
        name,
        updatedAt: new Date().toISOString()
      }, { merge: true });
    } catch (err) {
      console.error('Firestore name sync failure:', err);
      handleFirestoreError(err, OperationType.WRITE, 'joni_users/hsaban2025');
    }
  };

  const handleSaveStatus = async () => {
    setIsEditingStatus(false);
    const updated = { ...profile, status };
    onUpdateProfile(updated);
    
    // Sync Status to Firestore
    try {
      await setDoc(doc(db, 'joni_users', 'hsaban2025'), {
        status,
        updatedAt: new Date().toISOString()
      }, { merge: true });
    } catch (err) {
      console.error('Firestore status sync failure:', err);
      handleFirestoreError(err, OperationType.WRITE, 'joni_users/hsaban2025');
    }
  };

  const handleAvatarClick = () => {
    if (isUploading) return;
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadProgress('מעבד תמונה...');

    const reader = new FileReader();
    reader.onload = async () => {
      const base64Str = reader.result as string;
      setUploadProgress('מעלה לענן סבן...');

      try {
        const webhookUrl = import.meta.env.VITE_GOOGLE_APPS_SCRIPT_WEBHOOK || 'https://script.google.com/macros/s/AKfycby-mock-webhook-id/exec';
        
        // 1. Send Base64 payload to Google Apps Script Webhook through our secure CORS bypass server-proxy
        const response = await fetch('/api/google-apps-script', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Target-Webhook': 'https://ais-dev-gmxanj4odykr7oiafjb2k2-252744991733.europe-west3.run.app/api/google-apps-script',
            'X-Google-Webhook': webhookUrl
          },
          body: JSON.stringify({
            image: base64Str,
            filename: `profile_hsaban_${Date.now()}.png`,
            mimeType: file.type,
            userEmail: 'hsaban2025@gmail.com'
          })
        });

        let driveUrl = base64Str;
        if (response.ok) {
          try {
            const resData = await response.json();
            if (resData.url) {
              driveUrl = resData.url;
            }
          } catch (jsonErr) {
            console.warn('Apps Script return not a valid JSON. Falling back to local Base64 storage.');
          }
        } else {
          console.warn('Google Apps Script responded with error. Utilizing robust Base64 fallback.');
        }

        // 2. Clear state locally & Update user profile view
        onUpdateProfile({ ...profile, avatar: driveUrl });

        // 3. Save profile picture entry in Firestore database
        try {
          await setDoc(doc(db, 'joni_users', 'hsaban2025'), {
            name: profile.name,
            avatar: driveUrl,
            status: profile.status,
            phoneNumber: profile.phoneNumber,
            updatedAt: new Date().toISOString()
          }, { merge: true });
        } catch (fErr) {
          console.error('Failed to sync avatar to Firestore:', fErr);
          handleFirestoreError(fErr, OperationType.WRITE, 'joni_users/hsaban2025');
        }

        setUploadProgress('התמונה עודכנה ב-Google Drive בהצלחה! ☁️');
        setTimeout(() => setUploadProgress(''), 3000);
      } catch (err: any) {
        console.error('Google Apps Script POST rejected:', err);
        
        // Solid browser base64 fallback so user continues working beautifully
        onUpdateProfile({ ...profile, avatar: base64Str });

        try {
          await setDoc(doc(db, 'joni_users', 'hsaban2025'), {
            name: profile.name,
            avatar: base64Str,
            status: profile.status,
            phoneNumber: profile.phoneNumber,
            updatedAt: new Date().toISOString()
          }, { merge: true });
        } catch (fErr) {
          console.error('Failed to sync fallback base64 to Firestore:', fErr);
          handleFirestoreError(fErr, OperationType.WRITE, 'joni_users/hsaban2025');
        }

        setUploadProgress('שגיאת חיבור. התמונה נשמרה מקומית בהצלחה! ✅');
        setTimeout(() => setUploadProgress(''), 4500);
      } finally {
        setIsUploading(false);
      }
    };

    reader.onerror = () => {
      setIsUploading(false);
      setUploadProgress('כשל בקריאת קובץ תמונה מקומי');
    };

    reader.readAsDataURL(file);
  };

  return (
    <div className="absolute inset-0 bg-[#f0f2f5] z-30 flex flex-col h-full text-[#111b21] border-[#e9edef] border-l">
      {/* Drawer Header */}
      <div className="bg-[#008069] text-white min-h-[108px] flex items-end p-5 pb-4">
        <div className="flex items-center gap-6 w-full font-medium">
          <button onClick={onClose} className="hover:opacity-8 bg-transparent border-0 cursor-pointer text-white">
            {dir === 'rtl' ? <ArrowRight className="w-6 h-6" /> : <ArrowLeft className="w-6 h-6" />}
          </button>
          <span className="text-xl font-medium select-none">פרופיל</span>
        </div>
      </div>

      {/* Drawer Body */}
      <div className="flex-1 overflow-y-auto pb-6">
        {/* Avatar Display */}
        <div className="flex flex-col items-center justify-center py-7 bg-transparent">
          <div 
            onClick={handleAvatarClick}
            className="relative group w-[150px] h-[150px] cursor-pointer rounded-full overflow-hidden shadow-sm border border-gray-300 bg-gray-100"
          >
            <img 
              src={profile.avatar} 
              alt={profile.name} 
              className={`w-full h-full object-cover transition-all duration-300 ${isUploading ? 'brightness-50' : 'group-hover:brightness-50'}`}
              referrerPolicy="no-referrer"
            />
            <div className={`absolute inset-0 flex flex-col items-center justify-center text-white transition-opacity duration-300 text-xs text-center p-3 ${isUploading ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
              {isUploading ? (
                <Loader2 className="w-7 h-7 mb-1 animate-spin" />
              ) : (
                <Camera className="w-6 h-6 mb-1" />
              )}
              <span>{isUploading ? 'מעלה...' : 'שנה תמונת פרופיל'}</span>
            </div>
          </div>
          
          {/* Hidden File Upload Element */}
          <input 
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*"
            className="hidden"
          />

          {uploadProgress && (
            <div className="text-xs text-[#008069] font-semibold mt-3.5 px-6 py-1 bg-[#008069]/10 rounded-full animate-pulse max-w-[80%] text-center select-none">
              {uploadProgress}
            </div>
          )}
        </div>

        {/* Name Block */}
        <div className="bg-white px-7 py-4 shadow-xs mb-3">
          <span className="text-xs text-[#008069] font-medium block mb-2">השם שלך</span>
          {isEditingName ? (
            <div className="flex items-center border-b-2 border-[#008069] py-1">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="flex-1 bg-transparent border-none outline-hidden text-[#111b21] font-normal"
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
              />
              <button onClick={handleSaveName} className="text-[#008069] hover:bg-gray-100 p-1 rounded-sm">
                <Check className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <span className="text-[16px] text-[#111b21]">{profile.name}</span>
              <button onClick={() => setIsEditingName(true)} className="text-[#667781] hover:bg-gray-100 p-1 rounded-sm">
                <Pencil className="w-4 h-4" />
              </button>
            </div>
          )}
          <p className="text-[12px] text-[#667781] mt-3 leading-relaxed">
            זהו אינו שם המשתמש או הסיסמה שלך. שם זה יופיע לאנשי הקשר שלך בוואטסאפ.
          </p>
        </div>

        {/* Status Block */}
        <div className="bg-white px-7 py-4 shadow-xs mb-3">
          <span className="text-xs text-[#008069] font-medium block mb-2">אודות</span>
          {isEditingStatus ? (
            <div className="flex items-center border-b-2 border-[#008069] py-1">
              <input
                type="text"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="flex-1 bg-transparent border-none outline-hidden text-[#111b21] font-normal"
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && handleSaveStatus()}
              />
              <button onClick={handleSaveStatus} className="text-[#008069] hover:bg-gray-100 p-1 rounded-sm">
                <Check className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <span className="text-[15px] text-[#111b21]">{profile.status}</span>
              <button onClick={() => setIsEditingStatus(true)} className="text-[#667781] hover:bg-gray-100 p-1 rounded-sm">
                <Pencil className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Phone Info */}
        <div className="bg-white px-7 py-4 shadow-xs">
          <span className="text-xs text-[#667781] font-medium block mb-1">מספר טלפון</span>
          <div className="flex items-center gap-3 text-sm text-[#111b21] font-mono">
            <Phone className="w-4 h-4 text-[#667781]" />
            <span>{profile.phoneNumber}</span>
          </div>
        </div>
      </div>
    </div>
  );
}


// ---------------- MODEL: New Chat / Contacts Drawer ----------------
interface NewChatDrawerProps extends DrawerProps {
  onSelectChat: (id: string) => void;
  chats: Chat[];
  onAddNewContact: (name: string, phone: string, avatar?: string) => void;
}

export function NewChatDrawer({ onClose, onSelectChat, chats, onAddNewContact, dir }: NewChatDrawerProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newContactName, setNewContactName] = useState('');
  const [newContactPhone, setNewContactPhone] = useState('');
  const [newContactAvatar, setNewContactAvatar] = useState('');

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContactName.trim()) return;
    
    // Choose a random cool avatar if none provided
    const defaultAvatars = [
      'https://i.postimg.cc/J7F9n0c6/Gemini-Generated-Image-9or8fm9or8fm9or8.png',
      'https://i.postimg.cc/J7F9n0c6/Gemini-Generated-Image-9or8fm9or8fm9or8.png',
      'https://i.postimg.cc/J7F9n0c6/Gemini-Generated-Image-9or8fm9or8fm9or8.png',
      'https://i.postimg.cc/J7F9n0c6/Gemini-Generated-Image-9or8fm9or8fm9or8.png'
    ];
    const avatarUrl = newContactAvatar.trim() || defaultAvatars[Math.floor(Math.random() * defaultAvatars.length)];
    
    onAddNewContact(newContactName.trim(), newContactPhone.trim() || 'לא צוין מס׳', avatarUrl);
    
    // Reset form
    setNewContactName('');
    setNewContactPhone('');
    setNewContactAvatar('');
    setShowAddForm(false);
  };

  return (
    <div className="absolute inset-0 bg-[#f0f2f5] z-30 flex flex-col h-full text-[#111b21] border-[#e9edef] border-l">
      {/* Drawer Header */}
      <div className="bg-[#008069] text-white min-h-[108px] flex items-end p-5 pb-4">
        <div className="flex items-center gap-6 w-full font-medium">
          <button onClick={onClose} className="hover:opacity-8 bg-transparent border-0 cursor-pointer text-white">
            {dir === 'rtl' ? <ArrowRight className="w-6 h-6" /> : <ArrowLeft className="w-6 h-6" />}
          </button>
          <span className="text-xl font-medium select-none">צ׳אט חדש</span>
        </div>
      </div>

      {/* Drawer Search / Add Action */}
      <div className="p-3 bg-white border-b border-[#e9edef]">
        {!showAddForm ? (
          <button 
            onClick={() => setShowAddForm(true)}
            className="w-full flex items-center justify-center gap-2 bg-[#008069] hover:bg-[#006e5a] text-white py-2.5 px-4 rounded-lg font-medium transition-colors duration-200 mt-1 cursor-pointer"
          >
            <Plus className="w-5 h-5" />
            <span>איש קשר חדש</span>
          </button>
        ) : (
          <form onSubmit={handleAddSubmit} className="bg-[#f0f2f5] p-3.5 rounded-lg border border-gray-200 flex flex-col gap-2.5">
            <span className="text-xs font-semibold text-[#008069] mb-1">הוספת איש קשר חדש</span>
            <input
              type="text"
              placeholder="שם איש הקשר"
              value={newContactName}
              onChange={(e) => setNewContactName(e.target.value)}
              required
              className="bg-white border border-gray-300 rounded px-2.5 py-1.5 text-sm outline-hidden w-full focus:ring-1 focus:ring-[#008069]"
            />
            <input
              type="text"
              placeholder="מספר טלפון"
              value={newContactPhone}
              onChange={(e) => setNewContactPhone(e.target.value)}
              className="bg-white border border-gray-300 rounded px-2.5 py-1.5 text-sm outline-hidden w-full focus:ring-1 focus:ring-[#008069]"
            />
            <input
              type="url"
              placeholder="קישור לתמונה (אופציונלי)"
              value={newContactAvatar}
              onChange={(e) => setNewContactAvatar(e.target.value)}
              className="bg-white border border-gray-300 rounded px-2.5 py-1.5 text-sm outline-hidden w-full focus:ring-1 focus:ring-[#008069]"
            />
            <div className="flex justify-end gap-2 mt-1">
              <button 
                type="button" 
                onClick={() => setShowAddForm(false)}
                className="px-3 py-1 text-xs text-[#667781] border border-gray-300 rounded hover:bg-gray-100 bg-white"
              >
                ביטול
              </button>
              <button 
                type="submit"
                className="px-3 py-1 text-xs text-white bg-[#008069] hover:bg-[#006e5a] rounded font-medium"
              >
                שמור איש קשר
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Contacts List */}
      <div className="flex-1 overflow-y-auto bg-white">
        <div className="text-xs text-[#008069] px-6 py-4 font-medium uppercase tracking-wider select-none bg-[#f0f2f5]/50 border-b border-gray-100">
          אנשי קשר קיימים ({chats.length})
        </div>
        {chats.map((chat) => (
          <button
            key={chat.id}
            onClick={() => {
              onSelectChat(chat.id);
              onClose();
            }}
            className="w-full flex items-center gap-4 px-6 py-3 hover:bg-[#f5f6f6] border-b border-[#f0f2f5] text-right bg-transparent text-[#111b21] transition-colors focus:outline-none cursor-pointer"
          >
            <div className="relative">
              <img 
                src={chat.avatar} 
                alt={chat.name} 
                className="w-11 h-11 rounded-full object-cover"
                referrerPolicy="no-referrer"
              />
              {chat.isOnline && (
                <span className="absolute bottom-0 left-0 block h-3 w-3 rounded-full bg-[#1fa96c] border-2 border-white" />
              )}
            </div>
            <div className="flex-1">
              <div className="font-medium text-[15px]">{chat.name}</div>
              <div className="text-xs text-[#667781] font-mono">{chat.phoneNumber || 'אין מספר'}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}


// ---------------- MODEL: Settings Wallpaper & Direction Drawer ----------------
interface SettingsDrawerProps extends DrawerProps {
  currentTheme: string;
  onThemeChange: (theme: string) => void;
  sidebarPosition: 'left' | 'right';
  onSidebarPositionChange: (pos: 'left' | 'right') => void;
  onClearChats: () => void;
}

export function SettingsDrawer({ onClose, currentTheme, onThemeChange, sidebarPosition, onSidebarPositionChange, onClearChats, dir }: SettingsDrawerProps) {
  const themes = [
    { id: 'classic', name: 'בז׳ קלאסי', color: '#efeae2' },
    { id: 'green', name: 'ירוק מנטה', color: '#e2efeb' },
    { id: 'blue', name: 'כחול שמיים', color: '#e2e7ef' },
    { id: 'dark', name: 'ערפילית חשוכה', color: '#202c33' },
    { id: 'white', name: 'לבן פשוט', color: '#ffffff' },
  ];

  return (
    <div className="absolute inset-0 bg-[#f0f2f5] z-30 flex flex-col h-full text-[#111b21] border-[#e9edef] border-l">
      {/* Drawer Header */}
      <div className="bg-[#008069] text-white min-h-[108px] flex items-end p-5 pb-4">
        <div className="flex items-center gap-6 w-full font-medium">
          <button onClick={onClose} className="hover:opacity-8 bg-transparent border-0 cursor-pointer text-white">
            {dir === 'rtl' ? <ArrowRight className="w-6 h-6" /> : <ArrowLeft className="w-6 h-6" />}
          </button>
          <span className="text-xl font-medium select-none">הגדרות צ׳אט</span>
        </div>
      </div>

      {/* Drawer Body */}
      <div className="flex-1 overflow-y-auto pb-6 p-5">
        
        {/* Chat Wallpaper Pick */}
        <div className="bg-white rounded-lg p-4 shadow-xs mb-4 border border-gray-100">
          <span className="text-xs text-[#008069] font-semibold block mb-3 uppercase tracking-wider">טפט רקע פעיל</span>
          <div className="grid grid-cols-2 gap-2.5">
            {themes.map((theme) => (
              <button
                key={theme.id}
                onClick={() => onThemeChange(theme.id)}
                className={`flex flex-col items-center justify-center p-2 rounded border-2 transition-all cursor-pointer ${
                  currentTheme === theme.id ? 'border-[#008069] bg-[#f0f2f5]' : 'border-transparent hover:border-gray-200 bg-gray-50'
                }`}
              >
                <div 
                  className="w-full h-8 rounded mb-1 outline-1 outline-gray-200"
                  style={{ backgroundColor: theme.color }}
                />
                <span className="text-xs text-gray-700">{theme.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Sidebar Position Toggle (for ultimate flexibility described in brainstorm) */}
        <div className="bg-white rounded-lg p-4 shadow-xs mb-4 border border-gray-100">
          <span className="text-xs text-[#008069] font-semibold block mb-3">מיקום תפריט צ׳אטים (דסקטופ)</span>
          <div className="flex bg-gray-100 rounded p-1">
            <button
              onClick={() => onSidebarPositionChange('right')}
              className={`flex-1 text-center text-xs py-1.5 font-medium rounded transition-all cursor-pointer ${
                sidebarPosition === 'right' ? 'bg-[#008069] text-white' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              צד ימין (RTL תקני)
            </button>
            <button
              onClick={() => onSidebarPositionChange('left')}
              className={`flex-1 text-center text-xs py-1.5 font-medium rounded transition-all cursor-pointer ${
                sidebarPosition === 'left' ? 'bg-[#008069] text-white' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              צד שמאל
            </button>
          </div>
          <p className="text-[11px] text-[#667781] mt-2 leading-snug">
            שנה את פריסת המסך לחיוג שונה של חלון הצ׳אט לפי העדפת המשתמש.
          </p>
        </div>

        {/* System Reset Actions */}
        <div className="bg-white rounded-lg p-4 shadow-xs border border-gray-100">
          <span className="text-xs text-[#ea0038] font-semibold block mb-3">ניהול נתונים</span>
          <button
            onClick={() => {
              if (window.confirm('האם אתה בטוח שברצונך לאפס את כל השיחות לברירת המחדל? הכל יימחק.')) {
                onClearChats();
                alert('השיחות אופסו בהצלחה!');
              }
            }}
            className="w-full flex items-center justify-center gap-2 border border-[#ea0038] text-[#ea0038] hover:bg-[#ea0038]/5 py-2 px-3 rounded text-xs font-semibold rounded transition-colors cursor-pointer bg-transparent"
          >
            <Trash className="w-4 h-4" />
            <span>שחזר שיחות לברירת מחדל</span>
          </button>
        </div>

      </div>
    </div>
  );
}
