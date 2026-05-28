import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Search, 
  Users, 
  CheckCircle2, 
  Loader2, 
  Plus, 
  Trash, 
  UserPlus, 
  ShieldAlert, 
  Phone, 
  Sparkles,
  RefreshCw,
  LogOut,
  Globe
} from 'lucide-react';
import { Chat } from '../types';
import { auth, loginAndGetAccessToken, logout } from '../lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';

interface AdminPanelProps {
  isOpen: boolean;
  onClose: () => void;
  chats: Chat[];
  onImportContact: (name: string, phone: string, avatarUrl: string) => void;
  onDeleteChat: (chatId: string) => void;
}

export default function AdminPanel({ isOpen, onClose, chats, onImportContact, onDeleteChat }: AdminPanelProps) {
  const [googleUser, setGoogleUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [googleContacts, setGoogleContacts] = useState<any[]>([]);
  const [isLoadingContacts, setIsLoadingContacts] = useState(false);
  const [contactsSearchTerm, setContactsSearchTerm] = useState('');
  const [usersSearchTerm, setUsersSearchTerm] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);

  // Monitor Auth State for the admin
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setGoogleUser(user);
    });
    return () => unsubscribe();
  }, []);

  // Handle Google OAuth authorization and retrieving the access token
  const handleConnectGoogle = async () => {
    setIsLoadingContacts(true);
    setErrorMsg(null);
    try {
      const response = await loginAndGetAccessToken();
      if (response && response.accessToken) {
        setAccessToken(response.accessToken);
        setGoogleUser(response.user);
        // Fetch contacts immediately
        await fetchGoogleContacts(response.accessToken);
      } else {
        throw new Error('לא התקבל מפתח גישה של Google. אנא ודא שאישרת גישה לאנשי הקשר.');
      }
    } catch (err: any) {
      console.error('Google authorization error:', err);
      setErrorMsg(err.message || 'התחברות ל-Google נכשלה. אנא ודא שהמערכת מאושרת.');
    } finally {
      setIsLoadingContacts(false);
    }
  };

  // Fetch contacts from Google People API
  const fetchGoogleContacts = async (token: string) => {
    setIsLoadingContacts(true);
    setErrorMsg(null);
    try {
      const res = await fetch(
        'https://people.googleapis.com/v1/people/me/connections?personFields=names,phoneNumbers,photos&pageSize=120',
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
          },
        }
      );

      if (!res.ok) {
        if (res.status === 401) {
          // Token might have expired
          setAccessToken(null);
          throw new Error('פג תוקף החיבור לחשבון Google. אנא התחבר מחדש.');
        }
        throw new Error(`שגיאה בגישה לשרתי גוגל: ${res.statusText}`);
      }

      const data = await res.json();
      const connections = data.connections || [];
      
      const mapped = connections.map((person: any) => {
        const nameObj = person.names?.[0];
        const displayName = nameObj?.displayName || 'איש קשר ללא שם';
        const phoneObj = person.phoneNumbers?.[0];
        const phoneNumber = phoneObj?.value || 'ללא מספר';
        const photoObj = person.photos?.[0];
        const photoUrl = photoObj?.url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150&q=80';
        
        return {
          id: person.resourceName,
          name: displayName,
          phone: phoneNumber,
          avatarUrl: photoUrl,
        };
      });

      setGoogleContacts(mapped);
    } catch (err: any) {
      console.error('Failed to fetch Google contacts:', err);
      setErrorMsg(err.message || 'נכשל בניסיונות למשוך אנשי קשר מחשבון Google.');
    } finally {
      setIsLoadingContacts(false);
    }
  };

  const handleManualRefresh = () => {
    if (accessToken) {
      fetchGoogleContacts(accessToken);
    } else {
      handleConnectGoogle();
    }
  };

  const handleDisconnect = async () => {
    await logout();
    setGoogleUser(null);
    setAccessToken(null);
    setGoogleContacts([]);
  };

  const executeImport = (contact: { name: string; phone: string; avatarUrl: string }) => {
    try {
      onImportContact(contact.name, contact.phone, contact.avatarUrl);
      setImportSuccess(`איש הקשר "${contact.name}" יובא בהצלחה כשיחה פעילה!`);
      setTimeout(() => setImportSuccess(null), 4000);
    } catch (err) {
      console.error('Import failed', err);
    }
  };

  const filteredGoogleContacts = googleContacts.filter((c) => {
    const term = contactsSearchTerm.toLowerCase();
    return c.name.toLowerCase().includes(term) || c.phone.toLowerCase().includes(term);
  });

  const filteredAppUsers = chats.filter((chat) => {
    const term = usersSearchTerm.toLowerCase();
    return chat.name.toLowerCase().includes(term) || (chat.phoneNumber && chat.phoneNumber.toLowerCase().includes(term));
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md" dir="rtl">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        transition={{ type: 'spring', damping: 25, stiffness: 350 }}
        className="relative w-full max-w-5xl h-[85vh] bg-white/95 backdrop-blur-2xl rounded-2xl shadow-2xl border border-white/40 flex flex-col overflow-hidden text-gray-800"
      >
        {/* Apple-style frosted glass top bar */}
        <div className="px-6 py-4 flex items-center justify-between border-b border-gray-100 bg-white/40/60 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <span className="p-1.5 rounded-lg bg-[#007AFF]/10 text-[#007AFF]">
              <Users className="w-5 h-5 animate-pulse" />
            </span>
            <div>
              <h2 className="text-lg font-bold text-gray-900 tracking-tight flex items-center gap-2">
                פאנל ניהול נסתר - Saban AI Drive 
                <span className="text-xs font-mono font-normal bg-[#007AFF]/15 text-[#007AFF] px-2.5 py-0.5 rounded-full">
                  מנהל מערכת
                </span>
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">ניהול משתמשים וייבוא אנשי קשר אמיתיים מ-Google Contacts</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-1 px-3 rounded-xl border border-gray-200 bg-white hover:bg-gray-100 text-gray-500 hover:text-gray-850 flex items-center gap-1.5 text-xs transition-transform cursor-pointer shadow-xs active:scale-95"
          >
            <X className="w-4 h-4" /> סגור ממשק
          </button>
        </div>

        {/* Content Workspace Split */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-0">
          
          {/* LEFT SIDEBAR: Active App Chats/Users (40%) */}
          <div className="w-full md:w-[42%] border-l border-gray-100 flex flex-col bg-slate-50/50">
            <div className="p-4 border-b border-gray-100">
              <span className="text-xs font-bold text-[#007AFF] block uppercase mb-2 select-none">
                ניהול משתמשים באפליקציה ({chats.length})
              </span>
              <div className="relative">
                <Search className="absolute right-3 top-2.5 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="חפש משתמש פעיל במערכת..."
                  value={usersSearchTerm}
                  onChange={(e) => setUsersSearchTerm(e.target.value)}
                  className="w-full bg-white pr-9 pl-3 py-1.5 rounded-xl text-xs border border-gray-200 focus:outline-none focus:ring-1 focus:ring-[#007AFF]"
                />
              </div>
            </div>

            {/* App Users Table / List */}
            <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
              {filteredAppUsers.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-center text-gray-400">
                  <ShieldAlert className="w-8 h-8 opacity-40 mb-2" />
                  <p className="text-xs font-medium">לא נמצאו משתמשים פתוחים התואמים לחיפוש</p>
                </div>
              ) : (
                filteredAppUsers.map((user) => (
                  <div 
                    key={user.id}
                    className="flex items-center justify-between p-3 bg-white rounded-xl border border-gray-100 shadow-xs hover:border-[#007AFF]/30 transition-all group"
                  >
                    <div className="flex items-center gap-3 text-right">
                      <div className="relative">
                        <img 
                          src={user.avatar} 
                          alt={user.name} 
                          className="w-10 h-10 rounded-full object-cover border border-gray-100"
                          referrerPolicy="no-referrer"
                        />
                        {user.isOnline && (
                          <span className="absolute bottom-0 left-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-gray-800 truncate">{user.name}</p>
                        <p className="text-[10px] text-gray-500 font-mono mt-0.5">{user.phoneNumber || 'אין מספר'}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[9px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded hover:bg-slate-200 font-mono select-none">
                        מזהה: {user.id}
                      </span>
                      {user.id !== '1' ? (
                        deletingUserId === user.id ? (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => {
                                onDeleteChat(user.id);
                                setDeletingUserId(null);
                              }}
                              className="text-[10px] bg-red-500 hover:bg-red-600 font-bold text-white px-2 py-1 rounded-lg cursor-pointer transition-colors border-0"
                              title="אשר מחיקה"
                            >
                              מחק
                            </button>
                            <button
                              onClick={() => setDeletingUserId(null)}
                              className="text-[10px] bg-gray-200 hover:bg-gray-300 font-medium text-gray-700 px-2 py-1 rounded-lg cursor-pointer transition-colors border-0"
                              title="בטל"
                            >
                              בטל
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setDeletingUserId(user.id)}
                            className="p-1.5 rounded-lg border border-red-100 hover:bg-red-50 text-red-500 cursor-pointer active:scale-90 transition-transform"
                            title="מחק שיחה"
                          >
                            <Trash className="w-3.5 h-3.5" />
                          </button>
                        )
                      ) : (
                        <span className="text-[10px] text-green-600 font-medium bg-green-50 px-2 py-0.5 rounded-full">
                          קבוע (AI)
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* RIGHT SIDEBAR: Google Contacts Integration (58%) */}
          <div className="flex-1 flex flex-col bg-white">
            <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-xs font-bold text-[#007AFF] block uppercase mb-1">
                  סנכרון אנשי קשר מגוגל (Google People API)
                </span>
                {googleUser ? (
                  <p className="text-xs text-gray-650 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                    מחובר כאל: <span className="font-semibold text-gray-800">{googleUser.email}</span>
                  </p>
                ) : (
                  <p className="text-xs text-gray-500">חבר את חשבון המנהל לייבוא אנשי קשר במקום הזנת דמה</p>
                )}
              </div>

              <div className="flex items-center gap-2">
                {googleUser ? (
                  <>
                    <button 
                      onClick={handleManualRefresh}
                      disabled={isLoadingContacts}
                      className="p-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 flex items-center justify-center transition-colors cursor-pointer"
                      title="רענן אנשי קשר"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isLoadingContacts ? 'animate-spin' : ''}`} />
                    </button>
                    <button
                      onClick={handleDisconnect}
                      className="p-1.5 px-3 rounded-lg border border-red-200 bg-white hover:bg-red-50 text-red-600 flex items-center gap-1.5 text-xs font-medium cursor-pointer transition-colors"
                    >
                      <LogOut className="w-3.5 h-3.5" /> התנתק
                    </button>
                  </>
                ) : (
                  <button
                    onClick={handleConnectGoogle}
                    disabled={isLoadingContacts}
                    className="bg-[#007AFF] hover:bg-[#005ecb] text-white p-2 px-4 rounded-xl text-xs font-semibold flex items-center gap-2 shadow-xs transition-colors cursor-pointer active:scale-95 disabled:opacity-50"
                  >
                    {isLoadingContacts ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Globe className="w-4 h-4" />
                    )}
                    חבר חשבון Google
                  </button>
                )}
              </div>
            </div>

            {/* Notification Bar */}
            <AnimatePresence>
              {importSuccess && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-green-50 border-b border-green-100 text-green-700 p-3 text-xs font-semibold text-center flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-4 h-4 text-green-500" />
                  <span>{importSuccess}</span>
                </motion.div>
              )}
              {errorMsg && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-red-50 border-b border-red-100 text-red-700 p-3 text-xs font-semibold text-center flex items-center justify-center gap-2"
                >
                  <ShieldAlert className="w-4 h-4 text-red-500" />
                  <span>{errorMsg}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Google Contacts List Screen area */}
            {!googleUser ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-gray-50/30">
                <div className="w-16 h-16 rounded-3xl bg-slate-100 flex items-center justify-center text-gray-400 mb-4 border border-dashed border-gray-200">
                  <UserPlus className="w-8 h-8" />
                </div>
                <h3 className="text-sm font-bold text-gray-900">לא מחובר לחשבון Google Contacts</h3>
                <p className="text-xs text-gray-500 max-w-sm mt-1.5 leading-relaxed">
                  עליך להתחבר פעם אחת עם חשבון גוגל כדי שנוכל לייבא אנשי קשר אמיתיים ישירות דרך Google People API למערכת וואטסאפ ווב לניהול השטח של ח. סבן.
                </p>
                <button
                  onClick={handleConnectGoogle}
                  className="mt-5 bg-white border border-gray-300 hover:bg-gray-50 text-gray-800 shadow-xs px-5 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-transform active:scale-95"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.85z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.85c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  <span>התחבר עם Google</span>
                </button>
              </div>
            ) : isLoadingContacts ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 bg-gray-50/10">
                <Loader2 className="w-10 h-10 text-[#007AFF] animate-spin mb-3" />
                <p className="text-xs font-medium text-gray-700">מושך אנשי קשר פעילים מחשבון Google...</p>
              </div>
            ) : (
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="p-4 border-b border-gray-100 bg-white">
                  <div className="relative">
                    <Search className="absolute right-3 top-2.5 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="חפש ברשימת אנשי הקשר שלך מגוגל..."
                      value={contactsSearchTerm}
                      onChange={(e) => setContactsSearchTerm(e.target.value)}
                      className="w-full bg-slate-55 bg-gray-50 pr-9 pl-3 py-2 rounded-xl text-xs border border-gray-100 focus:outline-none focus:ring-1 focus:ring-[#007AFF]"
                    />
                  </div>
                </div>

                {/* Contacts Result Scrollable list */}
                <div className="flex-1 overflow-y-auto p-4 grid grid-cols-1 sm:grid-cols-2 gap-3 min-h-0 bg-slate-50/20">
                  {filteredGoogleContacts.length === 0 ? (
                    <div className="col-span-full flex flex-col items-center justify-center py-12 text-center text-gray-400">
                      <Users className="w-10 h-10 opacity-30 mb-2" />
                      <h4 className="text-xs font-bold text-gray-600">ארכיון אנשי הקשר ריק</h4>
                      <p className="text-[11px] text-gray-500 mt-1 max-w-xs">
                        לא נמצאו אנשי קשר התואמים לביטוי החיפוש הבא או שרשימת אנשי הקשר בגנדרל ריקה.
                      </p>
                    </div>
                  ) : (
                    filteredGoogleContacts.map((contact) => (
                      <div 
                        key={contact.id}
                        className="flex gap-3 items-center justify-between p-3.5 bg-white border border-gray-100 hover:border-[#007AFF]/35 shadow-xs rounded-xl hover:shadow-sm transition-all text-right group"
                      >
                        <div className="flex items-center gap-3 text-right overflow-hidden">
                          <img 
                            src={contact.avatarUrl} 
                            alt={contact.name} 
                            className="w-11 h-11 rounded-full object-cover border border-gray-100 shrink-0"
                            referrerPolicy="no-referrer"
                          />
                          <div className="min-w-0">
                            <h4 className="text-xs font-bold text-gray-900 truncate" title={contact.name}>{contact.name}</h4>
                            <p className="text-[10px] text-gray-500 mt-1 flex items-center gap-1 font-mono">
                              <Phone className="w-2.5 h-2.5" /> {contact.phone}
                            </p>
                          </div>
                        </div>

                        <button
                          onClick={() => executeImport(contact)}
                          className="bg-[#007AFF] hover:bg-[#005ecb] text-white p-1.5 px-3 rounded-lg text-[10px] font-bold shrink-0 flex items-center gap-1 cursor-pointer transition-transform active:scale-95 shadow-xs"
                        >
                          <Plus className="w-3.5 h-3.5" /> ייבא שיחה
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

        </div>

        {/* Footer info lock for safety */}
        <div className="px-6 py-3 border-t border-gray-100 bg-gray-55 bg-gray-50/70 text-center select-none">
          <p className="text-[11px] text-gray-400 font-medium">
            מערכת ניהול מבוזרת JONI - אבטחה כפולה ומקושרת לענן Firebase של Saban Workspace.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
