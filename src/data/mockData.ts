import { Chat, UserProfile, StatusStory } from '../types';

export const currentUserProfile: UserProfile = {
  name: 'הראל סבן',
  avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&h=150&q=80',
  status: 'מנהל מערכת ח. סבן',
  phoneNumber: '+972 50-123-4567',
};

export const initialChats: Chat[] = [
  {
    id: '1',
    name: 'נועה - מנהלת משרד AI 🌿',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&h=150&q=80',
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
    userAvatar: 'https://media-mrs2-2.cdn.whatsapp.net/v/t61.24694-24/620186722_866557896271587_5747987865837500471_n.jpg?stp=dst-jpg_s96x96_tt6&ccb=11-4&oh=01_Q5Aa4gFf4IZoof3NAWPSi7HFtXckD3qWLYZzjcIBqk24jJIZ0A&oe=6A24D36B&_nc_sid=5e03e0&_nc_cat=111',
    mediaUrl: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=800&q=80',
    mediaType: 'image',
    timestamp: 'היום, 09:15',
    viewed: false,
  }
];
