import React, { useState, useEffect } from 'react';
import { initialChats, currentUserProfile, mockStatuses } from './data/mockData';
import { Chat, Message, UserProfile, StatusStory } from './types';
import Sidebar from './components/Sidebar';
import ChatWindow from './components/ChatWindow';
import StatusViewer from './components/StatusViewer';
import { ProfileDrawer, NewChatDrawer, SettingsDrawer } from './components/Drawers';
import TasksDrawer from './components/TasksDrawer';
import { motion, AnimatePresence } from 'motion/react';
import AdminPanel from './components/AdminPanel';
import { sendJoniMessage, db } from './lib/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { saveUserLocally } from './lib/storageUtils';
import { useNoaBrain } from './hooks/useNoaBrain';
import OrdersBoardTab from './components/OrdersBoardTab';

export default function App() {
  const { getNoaAnalysis } = useNoaBrain();

  const [chats, setChats] = useState<Chat[]>(() => {
    const saved = localStorage.getItem('whatsapp_clone_chats');
    return saved ? JSON.parse(saved) : initialChats;
  });

  const [currentUser, setCurrentUser] = useState<UserProfile>(() => {
    const saved = localStorage.getItem('whatsapp_clone_user');
    return saved ? JSON.parse(saved) : currentUserProfile;
  });

  const [statuses, setStatuses] = useState<StatusStory[]>(() => {
    const saved = localStorage.getItem('whatsapp_clone_statuses');
    return saved ? JSON.parse(saved) : mockStatuses;
  });

  const [activeChatId, setActiveChatId] = useState<string | null>('1'); // Matches active chat
  const [sidebarSearchTerm, setSidebarSearchTerm] = useState('');
  const [statusViewerOpen, setStatusViewerOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'chat' | 'orders'>('chat');

  // Helper to sync single chat to the correct Firestore collection (chats / internal_team_chats)
  const syncChatToFirestore = async (chat: Chat) => {
    try {
      const isInternalTeam = chat.isGroup ||
        chat.name.includes('משרד') ||
        chat.name.includes('צוות') ||
        chat.name.includes('הנהלת') ||
        chat.name.includes('פרויקט') ||
        ['g1', 'g2', 'g3'].includes(chat.id) ||
        chat.id.startsWith('imported-team-') ||
        false;

      const collectionName = isInternalTeam ? 'internal_team_chats' : 'chats';
      const docRef = doc(db, collectionName, chat.id);

      // Clean undefined or non-serializable fields
      const messagesClean = chat.messages.map(m => ({
        id: m.id || '',
        text: m.text || '',
        isOutgoing: !!m.isOutgoing,
        timestamp: m.timestamp || '',
        status: m.status || 'sent',
        mediaType: m.mediaType || 'text',
        mediaUrl: m.mediaUrl || null,
        mediaDuration: m.mediaDuration || null
      }));

      await setDoc(docRef, {
        id: chat.id,
        name: chat.name,
        avatar: chat.avatar,
        statusText: chat.statusText || 'זמין/ה',
        unreadCount: chat.unreadCount || 0,
        phoneNumber: chat.phoneNumber || '',
        description: chat.description || '',
        isGroup: !!chat.isGroup,
        isOnline: !!chat.isOnline,
        isTyping: !!chat.isTyping,
        pinned: !!chat.pinned,
        messages: messagesClean,
        updatedAt: new Date().toISOString()
      }, { merge: true });
    } catch (err) {
      console.warn(`Sync warning for chat ${chat.id}:`, err);
    }
  };

  // 1. Mount-time load of chats from verified Firestore collections
  useEffect(() => {
    const loadChatsFromFirestore = async () => {
      try {
        const { getDocs, collection } = await import('firebase/firestore');
        const [customerSnapshot, teamSnapshot] = await Promise.all([
          getDocs(collection(db, 'chats')),
          getDocs(collection(db, 'internal_team_chats'))
        ]);

        let loadedChatsMap: Record<string, Chat> = {};

        customerSnapshot.forEach(doc => {
          const d = doc.data();
          if (d.id) loadedChatsMap[d.id] = d as Chat;
        });

        teamSnapshot.forEach(doc => {
          const d = doc.data();
          if (d.id) loadedChatsMap[d.id] = d as Chat;
        });

        const loadedChatsList = Object.values(loadedChatsMap);

        if (loadedChatsList.length > 0) {
          console.log(`Successfully restored ${loadedChatsList.length} chats from Firestore db!`);
          
          setChats(prev => {
            const merged = [...prev];
            loadedChatsList.forEach(srvChat => {
              const idx = merged.findIndex(c => c.id === srvChat.id);
              if (idx !== -1) {
                merged[idx] = { ...merged[idx], ...srvChat };
              } else {
                merged.unshift(srvChat);
              }
            });
            return merged;
          });
        }
      } catch (err) {
        console.warn('Could not bootstrap load chats from Firestore, utilizing cached localStorage:', err);
      }
    };

    loadChatsFromFirestore();
  }, []);

  // 2. Synchronize any changed chat state to Firestore
  useEffect(() => {
    if (chats && chats.length > 0) {
      chats.forEach(chat => {
        syncChatToFirestore(chat);
      });
    }
  }, [chats]);
  
  // Drawer slider control
  const [activeDrawer, setActiveDrawer] = useState<'profile' | 'newChat' | 'settings' | 'tasks' | null>(null);

  // Wallpaper options: classic, green, blue, dark, white
  const [wallpaperTheme, setWallpaperTheme] = useState<'classic' | 'green' | 'blue' | 'dark' | 'white'>(() => {
    const saved = localStorage.getItem('whatsapp_clone_theme');
    return (saved as any) || 'classic';
  });

  // Sidebar position layout toggle: 'left' or 'right'
  const [sidebarPosition, setSidebarPosition] = useState<'left' | 'right'>(() => {
    const saved = localStorage.getItem('whatsapp_clone_sidebar_pos');
    return (saved as any) || 'right'; // Default to RTL layout: right
  });

  // Read receipts toggle setting (blue ticks): defaults to true
  const [readReceiptsEnabled, setReadReceiptsEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem('whatsapp_clone_read_receipts');
    return saved !== 'false';
  });

  // PWA and Mobile-Responsive States
  const [isMobile, setIsMobile] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    // Start index list view initially on mobile devices for the best onboarding feel
    if (window.innerWidth < 768) {
      setActiveChatId(null);
    }

    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallBanner(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Identify iOS Safari users so we can display neat "Add to Home Screen" instructions
    const checkIOS = () => {
      const userAgent = window.navigator.userAgent.toLowerCase();
      const isIOSDevice = /iphone|ipad|ipod/.test(userAgent);
      const isStandalone = (window.navigator as any).standalone === true;
      setIsIOS(isIOSDevice && !isStandalone);
    };
    checkIOS();

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User prompt conversion outcome: ${outcome}`);
    setDeferredPrompt(null);
    setShowInstallBanner(false);
  };

  const playIncomingSound = () => {
    try {
      const audio = new Audio();
      audio.onerror = () => {
        console.warn('Audio sound failed to load or asset is unavailable. Continuing silently.');
      };
      audio.src = 'https://assets.mixkit.co/active_storage/sfx/2869/2869-84.wav';
      audio.volume = 0.45;
      
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch(err => {
          console.warn('Audio playback was prevented by autoplay engine or load issues:', err);
        });
      }
    } catch (err) {
      console.warn('Synchronous error playing notification audio:', err);
    }
  };

  // Persist states to local storage
  useEffect(() => {
    localStorage.setItem('whatsapp_clone_chats', JSON.stringify(chats));
  }, [chats]);

  useEffect(() => {
    saveUserLocally(currentUser);
  }, [currentUser]);

  useEffect(() => {
    localStorage.setItem('whatsapp_clone_statuses', JSON.stringify(statuses));
  }, [statuses]);

  useEffect(() => {
    localStorage.setItem('whatsapp_clone_theme', wallpaperTheme);
  }, [wallpaperTheme]);

  useEffect(() => {
    localStorage.setItem('whatsapp_clone_sidebar_pos', sidebarPosition);
  }, [sidebarPosition]);

  useEffect(() => {
    localStorage.setItem('whatsapp_clone_read_receipts', String(readReceiptsEnabled));
  }, [readReceiptsEnabled]);

  // Handle active chat changes to clear unread metrics
  useEffect(() => {
    if (activeChatId) {
      setChats(prevChats => {
        const hasUnread = prevChats.some(c => c.id === activeChatId && c.unreadCount > 0);
        if (!hasUnread) return prevChats;
        return prevChats.map(c => 
          c.id === activeChatId ? { ...c, unreadCount: 0 } : c
        );
      });
    }
  }, [activeChatId]);

  // Create standard helper to format times
  const getFormattedTime = () => {
    const now = new Date();
    return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  };

  // ---------------- MESSAGE SENDING & SIMULATED AUTOMATIC BOT REPLY ----------------
  const handleSendMessage = (
    chatId: string, 
    text: string, 
    mediaType: 'text' | 'image' | 'voice' = 'text', 
    mediaUrl?: string
  ) => {
    const newMessageId = `${chatId}-${Date.now()}`;
    const timestamp = getFormattedTime();

    const newMessage: Message = {
      id: newMessageId,
      text,
      isOutgoing: true,
      timestamp,
      status: 'sent',
      mediaType,
      mediaUrl,
      mediaDuration: mediaType === 'voice' ? '0:06' : undefined
    };

    // Find current targeted chat to check for real phone numbers mapped for JONI integration or if it's a group chat
    const targetedChat = chats.find(c => c.id === chatId);
    const isGroupChat = targetedChat ? !!targetedChat.isGroup : false;
    
    // Choose a random member for the group keying if it's a group chat
    const groupMembers = ['רועי', 'דודו', 'שירה', 'אבא'];
    const chosenGroupMember = isGroupChat 
      ? groupMembers[Math.floor(Math.random() * groupMembers.length)]
      : undefined;

    if (targetedChat && targetedChat.phoneNumber) {
      console.log(`JONI: Dispatching message to Firebase queue for phone ${targetedChat.phoneNumber}...`);
      sendJoniMessage(targetedChat.phoneNumber, text, mediaType, mediaUrl).then((result) => {
        console.log("JONI message dispatch finished success:", result);
      }).catch(err => {
        console.error("JONI message dispatch caught error:", err);
      });
    }

    // 1. Append the outgoing message
    setChats(prevChats => {
      const updated = prevChats.map(chat => {
        if (chat.id === chatId) {
          return {
            ...chat,
            messages: [...chat.messages, newMessage]
          };
        }
        return chat;
      });
      
      // Pull sent chat to top of list!
      const targetChat = updated.find(c => c.id === chatId);
      const remaining = updated.filter(c => c.id !== chatId);
      return targetChat ? [targetChat, ...remaining] : updated;
    });

    // 2. Simulate progressive message status states
    setTimeout(() => {
      setChats(prev => prev.map(c => {
        if (c.id === chatId) {
          return {
            ...c,
            messages: c.messages.map(m => m.id === newMessageId ? { ...m, status: 'delivered' } : m)
          };
        }
        return c;
      }));
    }, 400);

    setTimeout(() => {
      setChats(prev => prev.map(c => {
        if (c.id === chatId) {
          return {
            ...c,
            messages: c.messages.map(m => m.id === newMessageId ? { ...m, status: 'read' } : m)
          };
        }
        return c;
      }));
    }, 1100);

    // 3. Trigger progressive typing and custom smart auto-replies in Hebrew
    setTimeout(() => {
      // Begin "Typing..." state
      setChats(prev => prev.map(c => {
        if (c.id === chatId) {
          return {
            ...c,
            isOnline: true,
            isTyping: true,
            typingUser: chosenGroupMember,
            statusText: isGroupChat ? `${chosenGroupMember} is typing...` : 'הקלדה...'
          };
        }
        return c;
      }));
    }, 1300);

    setTimeout(async () => {
      // Craft responsive Hebrew automatic sentences based on matching chat titles!
      const replyingChat = chats.find(c => c.id === chatId);
      if (!replyingChat) return;

      let replyText = 'שמעתי אותך! נמשיך לדבר בעברית תוך כמה דקות 👍';
      const lowercaseUserText = text.toLowerCase();

      if (replyingChat.name.includes('נועה')) {
        replyText = await getNoaAnalysis(text);
      } else if (replyingChat.name.includes('אמא')) {
        if (lowercaseUserText.includes('שבת') || lowercaseUserText.includes('אוכל')) {
          replyText = 'האוכל כמעט מוכן חמוד שלי! הכנתי לך מנה מיוחדת ועוגת שוקולד 🍰';
        } else if (lowercaseUserText.includes('אורן') || lowercaseUserText.includes('ילדים')) {
          replyText = 'מתגעגעת המון לילדים! תמסור להם נשיקה ענקית מסבתא';
        } else {
          replyText = 'רוצה שאכין לך משהו נוסף לנשנש? המון בהצלחה בעבודה!';
        }
      } else if (replyingChat.name.includes('עבודה') || replyingChat.name.includes('רום')) {
        if (lowercaseUserText.includes('עיצוב') || lowercaseUserText.includes('טקסט')) {
          replyText = 'בדקתי את זה בפרודקשן, נראה מדהים ומהיר מאוד!';
        } else {
          replyText = 'סבבה לגמרי, אעדכן אותך מיד כשזה יועבר לבדיקה של מנהל המוצר.';
        }
      } else if (replyingChat.isGroup) {
        replyText = `${chosenGroupMember || 'חבר קבוצה'}: סגרנו לגמרי! כולנו מגיעים מחר בערב.`;
      } else if (replyingChat.name.includes('לקוחות') || replyingChat.name.includes('סיבוס')) {
        replyText = 'שירות לקוחות אוטומטי: תודה על פנייתך. נציג אנושי יענה בהקדם.';
      } else {
        replyText = 'הבנתי לגמרי, נשמע מעולה. נדבר בהמשך השבוע ואעדכן!';
      }

      const botMessageId = `bot-${chatId}-${Date.now()}`;
      const botMessage: Message = {
        id: botMessageId,
        text: replyText,
        isOutgoing: false,
        timestamp: getFormattedTime()
      };

      playIncomingSound();

      setChats(prev => {
        const updated = prev.map(chat => {
          if (chat.id === chatId) {
            // Restore actual status
            const originalStatus = chat.isGroup 
              ? 'דודו, אמא, רועי, שירה...' 
              : chat.name.includes('עבודה') 
                ? 'נראה לאחרונה היום ב-12:15'
                : chat.name.includes('אמא')
                  ? 'מחובר/ת'
                  : 'זמין/ה בוואטסאפ';

            return {
              ...chat,
              isTyping: false,
              typingUser: undefined,
              statusText: originalStatus,
              messages: [...chat.messages, botMessage],
              unreadCount: activeChatId === chatId ? 0 : chat.unreadCount + 1
            };
          }
          return chat;
        });

        // Pull active chat containing bot reply up on list
        const replyChatObj = updated.find(c => c.id === chatId);
        const remaining = updated.filter(c => c.id !== chatId);
        return replyChatObj ? [replyChatObj, ...remaining] : updated;
      });

    }, 3200);
  };

  // ---------------- SIDEBAR ACTIONS & MANAGEMENT ----------------
  const handleAddNewContact = (name: string, phone: string, avatarUrl: string) => {
    const newChatId = `${chats.length + 1}`;
    const newChatObj: Chat = {
      id: newChatId,
      name,
      avatar: avatarUrl,
      statusText: 'זמין/ה בוואטסאפ',
      isOnline: false,
      unreadCount: 0,
      phoneNumber: phone,
      description: 'נהנה/ית להשתמש בוואטסאפ ווב!',
      messages: [
        {
          id: `new-${newChatId}`,
          text: `התחלת שיחה חדשה ומאובטחת עם ${name}! מוצפן מקצה לקצה 👋`,
          timestamp: getFormattedTime(),
          isOutgoing: false
        }
      ]
    };

    setChats(prev => [newChatObj, ...prev]);
    setActiveChatId(newChatId);
  };

  const handleImportContact = (name: string, phone: string, avatarUrl: string) => {
    const existing = chats.find(c => c.phoneNumber === phone || c.name === name);
    if (existing) {
      setActiveChatId(existing.id);
      setIsAdminOpen(false);
      return;
    }

    const newChatId = `imported-${Date.now()}`;
    const newChatObj: Chat = {
      id: newChatId,
      name,
      avatar: avatarUrl,
      statusText: 'זמין/ה (מתואם JONI)',
      isOnline: true,
      unreadCount: 0,
      phoneNumber: phone,
      description: 'איש קשר סונכרן מ-Google Contacts 🔄',
      messages: [
        {
          id: `new-${newChatId}`,
          text: `סנכרנת בהצלחה את השיחה עם ${name}! מוצפן ומאובטח דרך מערכת JONI 🔒`,
          timestamp: getFormattedTime(),
          isOutgoing: false
        }
      ]
    };

    setChats(prev => [newChatObj, ...prev]);
    setActiveChatId(newChatId);
    setIsAdminOpen(false);
  };

  const handleDeleteChatCompletely = (chatId: string) => {
    if (chatId === '1') return;
    setChats(prev => prev.filter(c => c.id !== chatId));
    if (activeChatId === chatId) {
      setActiveChatId('1');
    }
  };

  const handleTogglePinChat = (chatId: string) => {
    setChats(prev => prev.map(c => c.id === chatId ? { ...c, pinned: !c.pinned } : c));
  };

  const handleMarkAllAsRead = () => {
    setChats(prev => prev.map(c => ({ ...c, unreadCount: 0 })));
    alert('כל השיחות סומנו כנקראו בהצלחה!');
  };

  const handleMarkStatusAsViewed = (id: string) => {
    setStatuses(prev => prev.map(st => {
      if (st.id === id) {
        if (st.viewed) return st;
        return { ...st, viewed: true };
      }
      return st;
    }));
  };

  const handleDeleteChatHistory = (chatId: string) => {
    setChats(prev => prev.map(c => c.id === chatId ? { ...c, messages: [], unreadCount: 0 } : c));
  };

  const handleClearChatsToDefault = () => {
    localStorage.removeItem('whatsapp_clone_chats');
    localStorage.removeItem('whatsapp_clone_statuses');
    localStorage.removeItem('whatsapp_clone_user');
    setChats(initialChats);
    setStatuses(mockStatuses);
    setCurrentUser(currentUserProfile);
    setActiveChatId('1');
  };

  // ---------------- SEARCH FILTERING ----------------
  const filteredChats = chats.filter(chat => {
    const term = sidebarSearchTerm.trim().toLowerCase();
    if (!term) return true;

    // Search by Chat name OR message texts inside chat
    const matchName = (chat.name || '').toLowerCase().includes(term);
    const matchMsgs = chat.messages.some(m => (m.text || '').toLowerCase().includes(term));
    return matchName || matchMsgs;
  });

  const activeChat = chats.find(c => c.id === activeChatId) || null;

  return (
    <div id="whatsapp-web-app-root" className="h-[100dvh] w-screen flex flex-col bg-[#e1e2e3] font-sans antialiased overflow-hidden pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]" dir="rtl">
      {/* Top Banner Accent behind the desk frame (hidden on mobile) */}
      {!isMobile && (
        <div className="absolute top-0 inset-x-0 h-[127px] bg-[#00a884] z-0 select-none pointer-events-none" />
      )}

      {/* Primary Application Container Grid */}
      <div className={`flex-grow relative z-10 flex overflow-hidden ${
        isMobile 
          ? 'w-full h-full bg-white' 
          : 'w-full max-w-7xl mx-auto h-[95vh] my-auto bg-[#f0f2f5] shadow-2xl rounded-sm border border-gray-300 self-center'
      }`}>
        
        {/* Sidebar and Chat Layout wrapper based on Custom direction order preference */}
        <div className={`w-full h-full flex flex-row ${!isMobile && sidebarPosition === 'left' ? 'flex-row-reverse' : ''}`}>
          
          {/* LEFT/RIGHT CHAT INDEX PANEL - Hidden on mobile if a chat is active */}
          {(!isMobile || activeChatId === null) && (
            <div className={`${
              isMobile 
                ? 'w-full h-full' 
                : 'w-[30%] min-w-[340px] max-w-[420px]'
            } h-full bg-white relative flex flex-col z-10 border-l border-r border-[#e9edef]`}>
              {/* Drawer Sliding System with Motion effects */}
              <AnimatePresence>
                {activeDrawer === 'profile' && (
                  <motion.div 
                    initial={{ x: sidebarPosition === 'right' ? 380 : -380 }} 
                    animate={{ x: 0 }} 
                    exit={{ x: sidebarPosition === 'right' ? 380 : -380 }} 
                    transition={{ type: 'tween', duration: 0.22 }}
                    className="absolute inset-0 z-20"
                  >
                    <ProfileDrawer 
                      dir="rtl"
                      profile={currentUser} 
                      onUpdateProfile={setCurrentUser} 
                      onClose={() => setActiveDrawer(null)} 
                    />
                  </motion.div>
                )}

                {activeDrawer === 'newChat' && (
                  <motion.div 
                    initial={{ x: sidebarPosition === 'right' ? 380 : -380 }} 
                    animate={{ x: 0 }} 
                    exit={{ x: sidebarPosition === 'right' ? 380 : -380 }} 
                    transition={{ type: 'tween', duration: 0.22 }} 
                    className="absolute inset-0 z-20"
                  >
                    <NewChatDrawer 
                      dir="rtl"
                      chats={chats}
                      onSelectChat={(id) => {
                        setActiveChatId(id);
                        setActiveDrawer(null);
                      }}
                      onAddNewContact={handleAddNewContact}
                      onClose={() => setActiveDrawer(null)}
                    />
                  </motion.div>
                )}

                {activeDrawer === 'settings' && (
                  <motion.div 
                    initial={{ x: sidebarPosition === 'right' ? 380 : -380 }} 
                    animate={{ x: 0 }} 
                    exit={{ x: sidebarPosition === 'right' ? 380 : -380 }} 
                    transition={{ type: 'tween', duration: 0.22 }} 
                    className="absolute inset-0 z-20"
                  >
                    <SettingsDrawer 
                      dir="rtl"
                      currentTheme={wallpaperTheme}
                      onThemeChange={setWallpaperTheme}
                      sidebarPosition={sidebarPosition}
                      onSidebarPositionChange={setSidebarPosition}
                      onClearChats={handleClearChatsToDefault}
                      onClose={() => setActiveDrawer(null)}
                      readReceiptsEnabled={readReceiptsEnabled}
                      onReadReceiptsEnabledChange={setReadReceiptsEnabled}
                    />
                  </motion.div>
                )}

                {activeDrawer === 'tasks' && (
                  <motion.div 
                    initial={{ x: sidebarPosition === 'right' ? 380 : -380 }} 
                    animate={{ x: 0 }} 
                    exit={{ x: sidebarPosition === 'right' ? 380 : -380 }} 
                    transition={{ type: 'tween', duration: 0.22 }} 
                    className="absolute inset-0 z-20"
                  >
                    <TasksDrawer 
                      onClose={() => setActiveDrawer(null)}
                      dir="rtl"
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Sidebar View */}
              <Sidebar 
                dir="rtl"
                chats={filteredChats}
                activeChatId={activeChatId}
                onSelectChat={(id) => {
                  setActiveChatId(id);
                  setViewMode('chat');
                }}
                currentUser={currentUser}
                statuses={statuses}
                onOpenStatus={() => setStatusViewerOpen(true)}
                onOpenProfile={() => setActiveDrawer('profile')}
                onOpenNewChat={() => setActiveDrawer('newChat')}
                onOpenSettings={() => setActiveDrawer('settings')}
                onOpenTasks={() => setActiveDrawer('tasks')}
                onMarkAllAsRead={handleMarkAllAsRead}
                searchTerm={sidebarSearchTerm}
                onSearchChange={setSidebarSearchTerm}
                readReceiptsEnabled={readReceiptsEnabled}
                viewMode={viewMode}
                onViewModeChange={setViewMode}
              />
            </div>
          )}

          {/* CHAT SCREEN ACTIVE AREA - Hidden on mobile if no chat is active */}
          {(!isMobile || activeChatId !== null || viewMode === 'orders') && (
            <div className="flex-1 h-full flex flex-col relative bg-[#efeae2]">
              {viewMode === 'orders' ? (
                <OrdersBoardTab />
              ) : (
                <ChatWindow 
                  dir="rtl"
                  chat={activeChat}
                  onSendMessage={handleSendMessage}
                  currentUser={currentUser}
                  wallpaperTheme={wallpaperTheme}
                  onBackToMenu={() => setActiveChatId(null)}
                  onDeleteChat={handleDeleteChatCompletely}
                  chats={chats}
                  onOpenAdmin={() => setIsAdminOpen(true)}
                  onTogglePinChat={handleTogglePinChat}
                  readReceiptsEnabled={readReceiptsEnabled}
                />
              )}
            </div>
          )}

        </div>

      </div>

      {/* Android/Chrome Custom Installation Banner */}
      {showInstallBanner && (
        <div className="fixed top-4 left-4 right-4 md:left-auto md:w-96 bg-white rounded-xl shadow-2xl p-4 border border-gray-150 z-50 flex items-center justify-between select-none animate-bounce" dir="rtl">
          <div className="flex items-center gap-3">
            <img src="https://img.icons8.com/color/48/000000/whatsapp--v1.png" alt="WhatsApp" className="w-10 h-10 shrink-0" />
            <div className="text-right">
              <div className="font-semibold text-sm text-gray-900">התקן את האפליקציה במכשיר!</div>
              <div className="text-xs text-gray-500">לחוויית ניהול מהירה ומסך מלא ללא שורת הדפדפן 📱</div>
            </div>
          </div>
          <div className="flex gap-1 shrink-0">
            <button onClick={() => setShowInstallBanner(false)} className="px-2.5 py-1.5 text-xs text-gray-400 hover:text-gray-600 bg-transparent border-0 cursor-pointer">
              סגור
            </button>
            <button onClick={handleInstallClick} className="px-4 py-1.5 text-xs text-white bg-[#00a884] hover:bg-[#008f6f] font-semibold rounded-lg shadow-sm cursor-pointer border-0 active:scale-95 transition-all">
              התקן
            </button>
          </div>
        </div>
      )}

      {/* iOS Instructions Floating Drawer (Share -> Add to Home Screen) */}
      {isIOS && (
        <div className="fixed bottom-4 left-4 right-4 bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl p-4 border border-gray-200/50 z-50 select-none text-right flex flex-col gap-2 transition-transform" dir="rtl">
          <div className="flex items-start gap-3">
            <img src="https://img.icons8.com/color/48/000000/whatsapp--v1.png" alt="WhatsApp" className="w-10 h-10 shrink-0 object-cover rounded-xl" />
            <div className="flex-1">
              <div className="font-semibold text-sm text-gray-900">הוסף את וואטסאפ למסך הבית!</div>
              <div className="text-[11px] text-gray-600 mt-1 leading-relaxed">
                לחץ על כפתור השיתוף בתפריט הדפדפן <b>(כפתור השיתוף <span className="inline-block px-1 py-0.5 bg-gray-100 rounded">📄</span>)</b> ולאחר מכן גלול מטה ובחר באפשרות <b>'הוסף למסך הבית' <span className="inline-block px-1.5 py-0.5 bg-gray-100 rounded font-bold">+</span></b>.
              </div>
            </div>
            <button onClick={() => setIsIOS(false)} className="text-gray-400 hover:text-gray-650 bg-transparent border-0 cursor-pointer p-1">
              ✕
            </button>
          </div>
        </div>
      )}

      {/* FULL SCREEN DYNAMIC STATUS STORY VIEW MODAL */}
      <AnimatePresence>
        {statusViewerOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 overflow-hidden"
          >
            <StatusViewer 
              stories={statuses}
              dir="rtl"
              onClose={() => setStatusViewerOpen(false)}
              onMarkAsViewed={handleMarkStatusAsViewed}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ADMIN PANEL DRAWER */}
      <AnimatePresence>
        {isAdminOpen && (
          <AdminPanel 
            isOpen={isAdminOpen}
            onClose={() => setIsAdminOpen(false)}
            chats={chats}
            onImportContact={handleImportContact}
            onDeleteChat={handleDeleteChatCompletely}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
