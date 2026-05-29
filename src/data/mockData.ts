import { Chat, UserProfile, StatusStory } from '../types';

export const currentUserProfile: UserProfile = {
  name: 'הראל סבן',
  avatar: 'https://i.postimg.cc/DwXbz2Hq/20251215-160105.jpg',
  status: 'מנהל מערכת ח. סבן',
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
    phoneNumber: '+972 54-555-5678',
    description: 'מנהלת משרד AI - ח. סבן',
    messages: [
      {
        id: '1-1',
        text: 'שלום הראל! כאן נועה, מנהלת משרד ה-AI של ח. סבן. המערכת מסונכרנת ומאובטחת דרך JONI 🏗️\nאיך אוכל לעזור לך לתפעל את השטח או לנהל את המשימות היום?',
        timestamp: '08:00',
        isOutgoing: false,
      }
    ],
  }
];

export const mockStatuses: StatusStory[] = [
  {
    id: 's1',
    userName: 'נועה - מנהלת משרד AI 🌿',
    userAvatar: 'https://i.postimg.cc/J7F9n0c6/Gemini-Generated-Image-9or8fm9or8fm9or8.png',
    mediaUrl: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=800&q=80',
    mediaType: 'image',
    timestamp: 'היום, 09:15',
    viewed: false,
  }
];
