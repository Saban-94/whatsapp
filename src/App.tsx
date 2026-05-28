import React, { useState, useEffect } from 'react';
import { initialChats, currentUserProfile, mockStatuses } from './data/mockData';
import { Chat, Message, UserProfile, StatusStory } from './types';
import Sidebar from './components/Sidebar';
import ChatWindow from './components/ChatWindow';
import StatusViewer from './components/StatusViewer';
import { ProfileDrawer, NewChatDrawer, SettingsDrawer } from './components/Drawers';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const [chats, setChats] = useState<Chat[]>(() => {
    // Attempt to load from localStorage to keep state fresh across runs!
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

  const [activeChatId, setActiveChatId] = useState<string | null>('1'); // Match Mom as active chat by default
  const [sidebarSearchTerm, setSidebarSearchTerm] = useState('');
  const [statusViewerOpen, setStatusViewerOpen] = useState(false);
  
  // Drawer slider control
  const [activeDrawer, setActiveDrawer] = useState<'profile' | 'newChat' | 'settings' | null>(null);

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

  // Persist states to local storage
  useEffect(() => {
    localStorage.setItem('whatsapp_clone_chats', JSON.stringify(chats));
  }, [chats]);

  useEffect(() => {
    localStorage.setItem('whatsapp_clone_user', JSON.stringify(currentUser));
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

  // Handle active chat changes to clear unread metrics
  useEffect(() => {
    if (activeChatId) {
      setChats(prevChats => 
        prevChats.map(c => 
          c.id === activeChatId ? { ...c, unreadCount: 0 } : c
        )
      );
    }
  }, [activeChatId]);

  // Create standard helper to format times
  const getFormattedTime = () => {
    const now = new Date();
    return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  };

  // ---------------- MESSAGE SENDING & SIMULATED AUTOMATIC BOT REPLY ----------------
  const handleSendMessage = (chatId: string, text: string, mediaType: 'text' | 'image' | 'voice' = 'text') => {
    const newMessageId = `${chatId}-${Date.now()}`;
    const timestamp = getFormattedTime();

    const newMessage: Message = {
      id: newMessageId,
      text,
      isOutgoing: true,
      timestamp,
      status: 'sent',
      mediaType,
      mediaUrl: mediaType === 'image' ? 'https://images.unsplash.com/photo-1513542789411-b6a5d4f31634?auto=format&fit=crop&w=500&q=80' : undefined,
      mediaDuration: mediaType === 'voice' ? '0:06' : undefined
    };

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
    // 'sent' -> 300ms -> 'delivered' -> 800ms -> 'read' (if still active)
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
            statusText: 'הקלדה...'
          };
        }
        return c;
      }));
    }, 1300);

    setTimeout(() => {
      // Craft responsive Hebrew automatic sentences based on matching chat titles!
      const replyingChat = chats.find(c => c.id === chatId);
      if (!replyingChat) return;

      let replyText = 'שמעתי אותך! נמשיך לדבר בעברית תוך כמה דקות 👍';
      const lowercaseUserText = text.toLowerCase();

      if (replyingChat.name.includes('אמא')) {
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
        const members = ['רועי', 'דודו', 'שירה', 'אבא'];
        const randomMember = members[Math.floor(Math.random() * members.length)];
        replyText = `${randomMember}: סגרנו לגמרי! כולנו מגיעים מחר בערב.`;
      } else if (replyingChat.name.includes('נועה')) {
        replyText = 'כן, הסטודיו נקי וממוזג, מחכים לך היום בחמש וחצי 🙌🧘';
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

  const handleMarkAllAsRead = () => {
    setChats(prev => prev.map(c => ({ ...c, unreadCount: 0 })));
    alert('כל השיחות סומנו כנקראו בהצלחה!');
  };

  const handleMarkStatusAsViewed = (id: string) => {
    setStatuses(prev => prev.map(st => st.id === id ? { ...st, viewed: true } : st));
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
    const matchName = chat.name.toLowerCase().includes(term);
    const matchMsgs = chat.messages.some(m => m.text.toLowerCase().includes(term));
    return matchName || matchMsgs;
  });

  const activeChat = chats.find(c => c.id === activeChatId) || null;

  return (
    <div id="whatsapp-web-app-root" className="h-screen w-screen flex flex-col bg-[#e1e2e3] font-sans antialiased overflow-hidden" dir="rtl">
      {/* Top Banner Accent behind the desk frame */}
      <div className="absolute top-0 inset-x-0 h-[127px] bg-[#00a884] z-0 select-none pointer-events-none" />

      {/* Primary Application Container Grid */}
      <div className="flex-1 w-full max-w-7xl mx-auto h-[95vh] my-auto relative z-10 flex bg-[#f0f2f5] shadow-2xl overflow-hidden self-center rounded-sm border border-gray-300">
        
        {/* Sidebar and Chat Layout wrapper based on Custom direction order preference */}
        <div className={`w-full h-full flex flex-row ${sidebarPosition === 'left' ? 'flex-row-reverse' : ''}`}>
          
          {/* 30% LEFT/RIGHT CHAT INDEX PANEL */}
          <div className="w-[30%] min-w-[340px] max-w-[420px] h-full bg-white relative flex flex-col z-10 border-l border-r border-[#e9edef]">
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
                    onSelectChat={setActiveChatId}
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
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Sidebar View */}
            <Sidebar 
              dir="rtl"
              chats={filteredChats}
              activeChatId={activeChatId}
              onSelectChat={setActiveChatId}
              currentUser={currentUser}
              statuses={statuses}
              onOpenStatus={() => setStatusViewerOpen(true)}
              onOpenProfile={() => setActiveDrawer('profile')}
              onOpenNewChat={() => setActiveDrawer('newChat')}
              onOpenSettings={() => setActiveDrawer('settings')}
              onMarkAllAsRead={handleMarkAllAsRead}
              searchTerm={sidebarSearchTerm}
              onSearchChange={setSidebarSearchTerm}
            />
          </div>

          {/* 70% CHAT SCREEN ACTIVE AREA */}
          <div className="flex-1 h-full flex flex-col relative bg-[#efeae2]">
            <ChatWindow 
              dir="rtl"
              chat={activeChat}
              onSendMessage={handleSendMessage}
              currentUser={currentUser}
              wallpaperTheme={wallpaperTheme}
              onDeleteChat={handleDeleteChatHistory}
              chats={chats}
            />
          </div>

        </div>

      </div>

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
    </div>
  );
}
