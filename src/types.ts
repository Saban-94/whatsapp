export interface Message {
  id: string;
  text: string;
  timestamp: string; // Formatted like "14:32"
  isOutgoing: boolean;
  status?: 'sent' | 'delivered' | 'read';
  mediaType?: 'text' | 'image' | 'voice' | 'doc';
  mediaUrl?: string;
  mediaDuration?: string; // e.g. "0:12" for voice messages
}

export interface Chat {
  id: string;
  name: string;
  avatar: string;
  statusText: string; // e.g., "online" or "קליק הקלדה..." or "נראה לאחרונה ב-..."
  isOnline: boolean;
  isTyping?: boolean;
  typingUser?: string;
  messages: Message[];
  unreadCount: number;
  pinned?: boolean;
  isGroup?: boolean;
  phoneNumber?: string;
  description?: string;
}

export interface UserProfile {
  name: string;
  avatar: string;
  status: string;
  phoneNumber: string;
}

export interface StatusStory {
  id: string;
  userName: string;
  userAvatar: string;
  mediaUrl: string;
  mediaType: 'image' | 'video';
  timestamp: string;
  viewed: boolean;
}
