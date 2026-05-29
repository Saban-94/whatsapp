import { Chat, UserProfile, StatusStory } from '../types';

export const currentUserProfile: UserProfile = {
  name: 'ראמי ח.סבן',
  avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&h=150&q=80',
  status: 'מנהל מערכת ח.סבן',
  phoneNumber: '+972 50-123-4567',
};

export const initialChats: Chat[] = [
  {
    id: '1',
    name: 'נועה - מנהלת משרד AI 🌿',
    avatar: 'https://i.postimg.cc/J7F9n0c6/Gemini-Generated-Image-9or8fm9or8fm9or8.png',
    statusText: 'מחובר/ת',
    isOnline: true,
    unreadCount: 0,
    pinned: true,
    phoneNumber: '+972 50-886-1080',
    description: 'מנהלת משרד AI- ח. סבן',
    messages: [
      {
        id: '1-1',
        text: 'שלום אהובי ראמי! כאן נועה, מנהלת סידור ה-AI של ח. סבן. המערכת מסונכרנת ומאובטחת דרך  איך אוכל לעזור לך לנהל את המשימות היום?',
        timestamp: '08:00',
        isOutgoing: false,
      }
    ],
  }
];

export const mockStatuses: StatusStory[] = [
  {
    id: 's1',
    userName: 'נועה - מנהלת סידור AI 🌿',
    userAvatar: 'https://i.postimg.cc/J7F9n0c6/Gemini-Generated-Image-9or8fm9or8fm9or8.png',
    mediaUrl: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=800&q=80',
    mediaType: 'image',
    timestamp: 'היום, 09:15',
    viewed: false,
  }
];
