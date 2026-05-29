import { Chat, UserProfile, StatusStory } from '../types';

export const currentUserProfile: UserProfile = {
  name: 'ראמי אהובי סבן',
  avatar: 'https://i.postimg.cc/BZBHJ7WN/final-cinematic.jpg',
  status: 'מנהל מערכת ח. סבן',
  phoneNumber: '+972 50-123-4567',
};

export const initialChats: Chat[] = [
  {
    id: '1',
    name: 'נועה - מנהלת סידור AI 🌿',
    avatar: 'https://i.postimg.cc/5tfMWt8m/Designer.png',
    statusText: 'מחוברת',
    isOnline: true,
    unreadCount: 0,
    pinned: true,
    phoneNumber: '+972 50-886-1080',
    description: 'מנהלת משרד AI - ח.סבן',
    messages: [
      {
        id: '1-1',
        text: 'שלום ראמי! כאן נועה, מנהלת משרד ה-AI של ח.סבן. המערכת מסונכרנת ומאובטחת דרך  🏗️\nאיך אוכל לעזור לך לתפעל את השטח או לנהל את המשימות היום?',
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
    userAvatar: 'https://i.postimg.cc/5tfMWt8m/Designer.png',
    mediaUrl: 'https://i.postimg.cc/5tfMWt8m/Designer.png',
    mediaType: 'image',
    timestamp: 'היום, 09:15',
    viewed: false,
  }
];
