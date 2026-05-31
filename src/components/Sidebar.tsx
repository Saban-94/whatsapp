import React, { useState } from 'react';
import { 
  MessageSquare, 
  CircleDot, 
  MoreVertical, 
  Search, 
  Filter, 
  Pin, 
  Check, 
  CheckCheck, 
  X, 
  User, 
  Settings, 
  BookOpen,
  VolumeX,
  PlusSquare,
  Lock,
  ListTodo,
  LayoutDashboard,
  History
} from 'lucide-react';
import { Chat, UserProfile, StatusStory } from '../types';

interface SidebarProps {
  chats: Chat[];
  activeChatId: string | null;
  onSelectChat: (id: string) => void;
  currentUser: UserProfile;
  statuses: StatusStory[];
  onOpenStatus: () => void;
  onOpenProfile: () => void;
  onOpenNewChat: () => void;
  onOpenSettings: () => void;
  onOpenTasks: () => void;
  onOpenHistory: () => void;
  onMarkAllAsRead: () => void;
  searchTerm: string;
  onSearchChange: (val: string) => void;
  dir: 'rtl' | 'ltr';
  readReceiptsEnabled?: boolean;
  viewMode: 'chat' | 'orders';
  onViewModeChange: (mode: 'chat' | 'orders') => void;
}

export default function Sidebar({
  chats,
  activeChatId,
  onSelectChat,
  currentUser,
  statuses,
  onOpenStatus,
  onOpenProfile,
  onOpenNewChat,
  onOpenSettings,
  onOpenTasks,
  onOpenHistory,
  onMarkAllAsRead,
  searchTerm,
  onSearchChange,
  dir,
  readReceiptsEnabled = true,
  viewMode,
  onViewModeChange
}: SidebarProps) {
  const [showDropdown, setShowDropdown] = useState(false);

  // Check if there are unviewed status stories to highlight the Status ring green
  const hasUnviewedStatus = statuses.some(s => !s.viewed);

  // Separate pinned and unpinned chats
  const pinnedChats = chats.filter(c => c.pinned);
  const regularChats = chats.filter(c => !c.pinned);

  const renderChatItem = (chat: Chat) => {
    const isActive = activeChatId === chat.id;
    const lastMessage = chat.messages[chat.messages.length - 1];
    
    return (
      <button
        key={chat.id}
        id={`chat-item-${chat.id}`}
        onClick={() => onSelectChat(chat.id)}
        className={`w-full flex items-center gap-3 px-3.5 py-3 border-b border-[#f0f2f5] text-right bg-transparent transition-colors focus:outline-none cursor-pointer group ${
          isActive ? 'bg-[#f0f2f5]' : 'hover:bg-[#f5f6f6]'
        }`}
      >
        {/* Contact Avatar */}
        <div className="relative shrink-0">
          <img 
            src={chat.avatar || undefined} 
            alt={chat.name} 
            className="w-12 h-12 rounded-full object-cover"
            referrerPolicy="no-referrer"
          />
          {chat.isOnline && (
            <span className="absolute bottom-0 left-0 block h-3.5 w-3.5 rounded-full bg-[#1fa96c] border-2 border-white" />
          )}
        </div>

        {/* Text Context */}
        <div className="flex-1 min-w-0 flex flex-col justify-between h-11">
          {/* Top Line: Name and Date */}
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-[15px] text-[#111b21] truncate w-[70%] select-none">
              {chat.name}
            </h3>
            <span className={`text-[11px] font-mono ${chat.unreadCount > 0 ? 'text-[#00a884] font-semibold' : 'text-[#667781]'}`}>
              {lastMessage ? lastMessage.timestamp : 'אין הודעות'}
            </span>
          </div>

          {/* Bottom Line: Message & Badges */}
          <div className="flex items-center justify-between">
            <div className="text-xs truncate w-[85%] text-right flex items-center gap-1">
              {/* If user is active typing */}
              {chat.isTyping ? (
                <span className="text-[#00a884] font-medium animate-pulse select-none">
                  {chat.isGroup && chat.typingUser ? `User ${chat.typingUser} is typing...` : 'מקליד/ה...'}
                </span>
              ) : (
                <>
                  {/* Status doubleTicks if outgoing last message */}
                  {lastMessage && lastMessage.isOutgoing && (
                    <span className="shrink-0 select-none">
                      {lastMessage.status === 'read' ? (
                        <CheckCheck className={`w-4 h-4 ${readReceiptsEnabled ? 'text-[#53bdeb]' : 'text-[#667781]'}`} />
                      ) : lastMessage.status === 'delivered' ? (
                        <CheckCheck className="w-4 h-4 text-[#667781]" />
                      ) : (
                        <Check className="w-4 h-4 text-[#667781]" />
                      )}
                    </span>
                  )}
                  <span className="text-[#667781] truncate">
                    {lastMessage ? lastMessage.text : 'לחץ להתחלת שיחה באנגלית או בעברית'}
                  </span>
                </>
              )}
            </div>

            {/* Badges and Pins */}
            <div className="flex items-center gap-1.5 shrink-0 select-none">
              {chat.pinned && (
                <Pin className="w-3.5 h-3.5 text-[#667781] transform rotate-45" />
              )}
              {chat.unreadCount > 0 && (
                <span className="bg-[#25d366] text-white text-[11px] font-bold min-w-[20px] h-5 rounded-full px-1.5 flex items-center justify-center shadow-xs">
                  {chat.unreadCount}
                </span>
              )}
            </div>
          </div>
        </div>
      </button>
    );
  };

  return (
    <div className="flex flex-col h-full bg-white text-[#111b21]" dir="rtl">
      {/* Sidebar Header */}
      <div className="bg-[#f0f2f5] h-[60px] px-4 flex items-center justify-between border-l border-[#e9edef]/80 relative z-20">
        
        {/* User profile picture */}
        <div 
          onClick={onOpenProfile}
          className="relative cursor-pointer group shrink-0"
          title="הפרופיל שלי"
        >
          <img 
            src={currentUser.avatar || undefined} 
            alt={currentUser.name} 
            className="w-10 h-10 rounded-full object-cover border border-gray-300 group-hover:opacity-90 transition-opacity"
            referrerPolicy="no-referrer"
          />
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-5 text-[#54656f]">
          {/* Live Orders Board Trigger */}
          <button 
            onClick={() => onViewModeChange(viewMode === 'chat' ? 'orders' : 'chat')}
            className={`p-1.5 rounded-full cursor-pointer transition-colors border-0 flex items-center justify-center ${
              viewMode === 'orders' 
                ? 'bg-[#00a884]/15 text-[#00a884] shadow-xs' 
                : 'hover:bg-[#d9dbd9]/60 text-amber-600 hover:text-amber-700'
            }`}
            title="סידור עבודה ולוח הזמנות חי"
          >
            <LayoutDashboard className="w-5.5 h-5.5" />
          </button>

          {/* Completed Orders History Trigger */}
          <button 
            onClick={onOpenHistory}
            className="hover:bg-[#d9dbd9]/60 p-2 rounded-full cursor-pointer transition-colors bg-transparent border-0 text-emerald-600 hover:text-emerald-700"
            title="היסטוריית הזמנות שסופקו"
            id="sidebar-history-btn"
          >
            <History className="w-5.5 h-5.5" />
          </button>

          {/* Tasks Trigger */}
          <button 
            onClick={onOpenTasks}
            className="hover:bg-[#d9dbd9]/60 p-2 rounded-full cursor-pointer transition-colors bg-transparent border-0 text-[#4285F4] hover:text-[#357ae8]"
            title="משימות Google Tasks"
          >
            <ListTodo className="w-5.5 h-5.5" />
          </button>

          {/* Status Trigger */}
          <button 
            onClick={onOpenStatus}
            className="hover:bg-[#d9dbd9]/60 p-2 rounded-full cursor-pointer transition-colors relative bg-transparent border-0"
            title="עדכוני סטטוס"
          >
            <CircleDot className={`w-5.5 h-5.5 ${hasUnviewedStatus ? 'text-[#00a884] animate-pulse' : 'text-[#54656f]'}`} />
            {hasUnviewedStatus && (
              <span className="absolute top-1.5 right-1.5 block h-2.5 w-2.5 rounded-full bg-[#25d366] ring-2 ring-[#f0f2f5]" />
            )}
          </button>

          {/* New Chat Trigger */}
          <button 
            onClick={onOpenNewChat}
            className="hover:bg-[#d9dbd9]/60 p-2 rounded-full cursor-pointer transition-colors bg-transparent border-0"
            title="צ׳אט חדש"
          >
            <MessageSquare className="w-5.5 h-5.5" />
          </button>

          {/* Settings Menu Toggle */}
          <div className="relative">
            <button 
              onClick={() => setShowDropdown(!showDropdown)}
              className="hover:bg-[#d9dbd9]/60 p-2 rounded-full cursor-pointer transition-colors relative bg-transparent border-0"
              title="תפריט"
            >
              <MoreVertical className="w-5.5 h-5.5" />
            </button>

            {/* Premium WhatsApp Menu Dropdown */}
            {showDropdown && (
              <>
                {/* Backdrop overlay to close dropdown safely */}
                <div className="fixed inset-0 z-10" onClick={() => setShowDropdown(false)} />
                <div className="absolute left-0 mt-2.5 w-52 bg-white rounded-lg shadow-xl py-1.5 z-20 border border-gray-100 text-right text-sm">
                  <button 
                    onClick={() => { onViewModeChange(viewMode === 'chat' ? 'orders' : 'chat'); setShowDropdown(false); }}
                    className="w-full text-right px-4 py-2.5 hover:bg-gray-50 flex items-center gap-3 text-emerald-600 font-semibold bg-transparent border-b border-gray-100 cursor-pointer"
                  >
                    <LayoutDashboard className="w-4 h-4 text-[#00a884]" />
                    <span>{viewMode === 'chat' ? 'סידור עבודה חי 🏗️' : 'שיחות מסנג׳ר 💬'}</span>
                  </button>
                  <button 
                    onClick={() => { onOpenHistory(); setShowDropdown(false); }}
                    className="w-full text-right px-4 py-2.5 hover:bg-gray-50 flex items-center gap-3 text-emerald-700 font-semibold bg-transparent border-b border-gray-100 cursor-pointer"
                  >
                    <History className="w-4 h-4 text-[#00a884]" />
                    <span>היסטוריית הזמנות שסופקו 📜</span>
                  </button>
                  <button 
                    onClick={() => { onOpenNewChat(); setShowDropdown(false); }}
                    className="w-full text-right px-4 py-2.5 hover:bg-gray-50 flex items-center gap-3 text-gray-700 font-normal bg-transparent border-0 cursor-pointer"
                  >
                    <PlusSquare className="w-4 h-4 text-gray-400" />
                    <span>איש קשר וצ׳אט חדש</span>
                  </button>
                  <button 
                    onClick={() => { onOpenProfile(); setShowDropdown(false); }}
                    className="w-full text-right px-4 py-2.5 hover:bg-gray-50 flex items-center gap-3 text-gray-700 font-normal bg-transparent border-0 cursor-pointer"
                  >
                    <User className="w-4 h-4 text-gray-400" />
                    <span>הפרופיל שלי</span>
                  </button>
                  <button 
                    onClick={() => { onOpenSettings(); setShowDropdown(false); }}
                    className="w-full text-right px-4 py-2.5 hover:bg-gray-50 flex items-center gap-3 text-gray-700 font-normal bg-transparent border-0 cursor-pointer"
                  >
                    <Settings className="w-4 h-4 text-gray-400" />
                    <span>הגדרות וקבוצות</span>
                  </button>
                  <button 
                    onClick={() => { onOpenTasks(); setShowDropdown(false); }}
                    className="w-full text-right px-4 py-2.5 hover:bg-gray-50 flex items-center gap-3 text-gray-700 font-normal bg-transparent border-0 cursor-pointer"
                  >
                    <ListTodo className="w-4 h-4 text-[#4285F4]" />
                    <span>משימות JONI Tasks</span>
                  </button>
                  <button 
                    onClick={() => { onMarkAllAsRead(); setShowDropdown(false); }}
                    className="w-full text-right px-4 py-2.5 hover:bg-gray-50 flex items-center gap-3 text-gray-700 font-normal bg-transparent border-0 cursor-pointer border-t border-gray-100"
                  >
                    <BookOpen className="w-4 h-4 text-gray-400" />
                    <span>סמן הכל כנקרא</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Broadcast Notification Alert (mimics the blue backup banner of WhatsApp, clickable to close) */}
      <div className="bg-[#53bdeb] text-[#111b21] py-3.5 px-4 flex items-center gap-4.5 select-none relative">
        <div className="bg-white rounded-full p-2 text-[#53bdeb] shrink-0">
          <CircleDot className="w-5 h-5" />
        </div>
        <div className="flex-1 text-right">
          <div className="font-semibold text-xs leading-tight">קבל הודעות במחשב כאשר הטלפון כבוי</div>
          <div className="text-[10px] text-[#111b21]/80 leading-normal mt-0.5">הגרסה הרשמית של וואטסאפ ווב סנכרנה את הנתונים שלך.</div>
        </div>
        <button 
          onClick={(e) => {
            const el = e.currentTarget.parentElement;
            if (el) el.style.display = 'none';
          }}
          className="text-[#111b21]/60 hover:text-black hover:bg-black/5 rounded p-0.5 cursor-pointer bg-transparent border-0 absolute top-2 left-2"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Search Input Area */}
      <div className="p-2.5 bg-white flex items-center gap-2 border-b border-[#e9edef]">
        <div className="bg-[#f0f2f5] rounded-lg flex items-center px-3.5 py-1.5 flex-1 gap-4.5 border-b border-transparent focus-within:bg-white focus-within:ring-1 focus-within:ring-[#00a884]">
          <Search className="w-4.5 h-4.5 text-[#667781] shrink-0" />
          <input
            type="text"
            placeholder="חפש או התחל צ׳אט חדש..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="flex-1 bg-transparent border-none text-[13px] text-[#111b21] outline-hidden text-right placeholder-gray-400"
          />
          {searchTerm && (
            <button 
              onClick={() => onSearchChange('')}
              className="text-gray-400 hover:text-gray-650 bg-transparent border-0 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <button className="text-[#54656f] hover:bg-gray-100 p-1.5 rounded-full border-0 cursor-pointer bg-transparent" title="צנן שיחות שלא נקראו">
          <Filter className="w-5 h-5" />
        </button>
      </div>

      {/* Chat List Box */}
      <div className="flex-1 overflow-y-auto bg-white">
        {chats.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-xs leading-relaxed">
            אין שיחות זמינות.<br/>לחץ על כפתור <b>צ׳אט חדש</b> כדי להוסיף חבר.
          </div>
        ) : (
          <>
            {/* Pinned Chats Section */}
            {pinnedChats.length > 0 && (
              <div>
                <div className="text-[11px] text-[#667781] px-4 py-1.5 bg-[#f0f2f5]/40 font-semibold border-b border-[#f0f2f5] tracking-wider select-none text-right">
                  שיחות נעוצות
                </div>
                {pinnedChats.map(renderChatItem)}
              </div>
            )}

            {/* All Chats Section */}
            <div>
              {pinnedChats.length > 0 && regularChats.length > 0 && (
                <div className="text-[11px] text-[#667781] px-4 py-1.5 bg-[#f0f2f5]/40 font-semibold border-b border-[#f0f2f5] tracking-wider select-none text-right">
                  כל השיחות
                </div>
              )}
              {regularChats.map(renderChatItem)}
            </div>
          </>
        )}
      </div>

      {/* Footer Encryption Sign off */}
      <div className="py-2.5 px-4 bg-[#f0f2f5]/50 border-t border-[#e9edef] text-center text-[10px] text-[#8696a0] flex items-center justify-center gap-1.5 select-none">
        <Lock className="w-3 h-3 text-[#8696a0]" />
        <span>מוצפן מקצה לקצה</span>
      </div>
    </div>
  );
}
