import { Chat, UserProfile, StatusStory } from '../types';

export const currentUserProfile: UserProfile = {
  name: 'אריאל כהן',
  avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&h=150&q=80',
  status: 'זמין/ה בוואטסאפ',
  phoneNumber: '+972 54-123-4567',
};

export const initialChats: Chat[] = [
  {
    id: '1',
    name: 'אמא ❤️',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=150&h=150&q=80',
    statusText: 'מחובר/ת',
    isOnline: true,
    unreadCount: 2,
    pinned: true,
    phoneNumber: '+972 50-777-1234',
    description: 'מתי אתם באים לשבת?',
    messages: [
      {
        id: '1-1',
        text: 'היי חמודי, אתה בא לשבת בסוף?',
        timestamp: '10:04',
        isOutgoing: false,
      },
      {
        id: '1-2',
        text: 'כן אמא, נגיע עם הילדים בסביבות חמש',
        timestamp: '10:15',
        isOutgoing: true,
        status: 'read',
      },
      {
        id: '1-3',
        text: 'יופי מעולה! הכנתי את הבורקס שאתה אוהב וגם גפילטע פיש',
        timestamp: '10:16',
        isOutgoing: false,
      },
      {
        id: '1-4',
        text: 'אל תשכחו להביא את המשחק קופסה של רוני',
        timestamp: '10:17',
        isOutgoing: false,
      },
    ],
  },
  {
    id: '2',
    name: 'רום - עבודה 💼',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&h=150&q=80',
    statusText: 'נראה לאחרונה היום ב-12:15',
    isOnline: false,
    unreadCount: 0,
    pinned: true,
    phoneNumber: '+972 52-987-6543',
    description: 'הפרויקט החדש',
    messages: [
      {
        id: '2-1',
        text: 'אריאל, תוכל להציץ על העיצובים החדשים של הוואטסאפ?',
        timestamp: '09:30',
        isOutgoing: false,
      },
      {
        id: '2-2',
        text: 'בטח, זה נראה ממש פיקס. אהבתי במיוחד את השדרוג של ה-RTL',
        timestamp: '09:41',
        isOutgoing: true,
        status: 'read',
      },
      {
        id: '2-3',
        text: 'מעולה, העליתי את זה לשרת. תבדוק אם הכל עולה כמו שצריך בגרסה הרשמית',
        timestamp: '12:15',
        isOutgoing: false,
      },
    ],
  },
  {
    id: '3',
    name: 'קבוצת משפחה 👨‍👩‍👧‍👦',
    avatar: 'https://images.unsplash.com/photo-1511895426328-dc8714191300?auto=format&fit=crop&w=150&h=150&q=80',
    statusText: 'דודו, אמא, רועי, שירה...',
    isOnline: false,
    isGroup: true,
    unreadCount: 5,
    phoneNumber: 'קבוצה משפחתית (8 משתתפים)',
    description: 'המשפחה המורחבת',
    messages: [
      {
        id: '3-1',
        text: 'מזל טוב לעידן על הרישיון! 🎉🚗',
        timestamp: 'אתמול',
        isOutgoing: false,
      },
      {
        id: '3-2',
        text: 'וואו בשעה טובה! סע בזהירות חבר',
        timestamp: 'אתמול',
        isOutgoing: false,
      },
      {
        id: '3-3',
        text: 'תודה רבה לכולם, מבטיח לעשות סיבוב לכל הדודים',
        timestamp: 'אתמול',
        isOutgoing: false,
      },
      {
        id: '3-4',
        text: 'מי מביא את הקינוח למחר בלילה??',
        timestamp: '08:12',
        isOutgoing: false,
      },
      {
        id: '3-5',
        text: 'אני יכול לקנות אבטיח וגבינה בולגרית 🍉',
        timestamp: '08:30',
        isOutgoing: false,
      },
    ],
  },
  {
    id: '4',
    name: 'נועה הראל 🌿',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&h=150&q=80',
    statusText: 'הקלדה...',
    isOnline: true,
    isTyping: true,
    unreadCount: 1,
    phoneNumber: '+972 54-555-5678',
    description: 'סטודיו ליוגה',
    messages: [
      {
        id: '4-1',
        text: 'היי, השיעור יוגה היום מתחיל בחמש או בחמש וחצי?',
        timestamp: '13:00',
        isOutgoing: false,
      },
      {
        id: '4-2',
        text: 'היי נועה, השיעור הוזז לחמש וחצי היום בגלל הבריזה בסארונה',
        timestamp: '13:05',
        isOutgoing: true,
        status: 'read',
      },
      {
        id: '4-3',
        text: 'מעולה, אגיע עם המזרן שלי. נתראה שם!',
        timestamp: '13:07',
        isOutgoing: false,
      },
    ],
  },
  {
    id: '5',
    name: 'עמית מילואים ⛺',
    avatar: 'https://images.unsplash.com/photo-1542909168-82c3e7fdca5c?auto=format&fit=crop&w=150&h=150&q=80',
    statusText: 'נראה לאחרונה אתמול ב-21:40',
    isOnline: false,
    unreadCount: 0,
    phoneNumber: '+972 50-111-2222',
    messages: [
      {
        id: '5-1',
        text: 'שומע, מתי המפגש סוף מחזור שלנו בתל אביב?',
        timestamp: 'אתמול',
        isOutgoing: false,
      },
      {
        id: '5-2',
        text: 'סגרנו על יום חמישי הבא בפאב ברדיצ׳בסקי',
        timestamp: 'אתמול',
        isOutgoing: true,
        status: 'read',
      },
      {
        id: '5-3',
        text: 'אש! סגרתי ביומן. יש בירה חינם למילואימניקים?',
        timestamp: 'אתמול',
        isOutgoing: false,
      },
    ],
  },
  {
    id: '6',
    name: 'שירות לקוחות סיבוס 🥗',
    avatar: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=150&h=150&q=80',
    statusText: 'חשבון עסקי מאומת',
    isOnline: false,
    unreadCount: 0,
    phoneNumber: '+972 9-971-0010',
    messages: [
      {
        id: '6-1',
        text: 'שלום אריאל, פנייתך בנושא עדכון התקציב החודשי התקבלה ומטופלת בהצלחה.',
        timestamp: '25 במאי',
        isOutgoing: false,
      },
      {
        id: '6-2',
        text: 'תודה, תוך כמה זמן זה יתעדכן באפליקציה?',
        timestamp: '25 במאי',
        isOutgoing: true,
        status: 'read',
      },
      {
        id: '6-3',
        text: 'השינוי יחול החל מה-1 לחודש הבא בהתאם למדיניות החברה שלך. נשמח לעמוד לרשותך תמיד.',
        timestamp: '25 במאי',
        isOutgoing: false,
      },
    ],
  },
  {
    id: '7',
    name: 'גיל הקבלן 🛠️',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&h=150&q=80',
    statusText: 'נראה לאחרונה ב-20:00',
    isOnline: false,
    unreadCount: 0,
    phoneNumber: '+972 52-222-3333',
    messages: [
      {
        id: '7-1',
        text: 'השיש למטבח הגיע לאתר, נראה ממש יפה.',
        timestamp: '24 במאי',
        isOutgoing: false,
      },
      {
        id: '7-2',
        text: 'יש מצב לתמונה של החיבורים בקצוות?',
        timestamp: '24 במאי',
        isOutgoing: true,
        status: 'read',
      },
      {
        id: '7-3',
        text: 'שלחתי לך בוואטסאפ השני של העבודה. תציץ שם הכל מורכב חלק.',
        timestamp: '24 במאי',
        isOutgoing: false,
      },
    ],
  },
  {
    id: '8',
    name: 'שירה (מקהלה) 🎶',
    avatar: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?auto=format&fit=crop&w=150&h=150&q=80',
    statusText: 'זמינה בוואטסאפ',
    isOnline: false,
    unreadCount: 0,
    phoneNumber: '+972 54-888-9999',
    messages: [
      {
        id: '8-1',
        text: 'היי, אל תשכח להביא את התווים החדשים לחזרת הערב!',
        timestamp: '22 במאי',
        isOutgoing: false,
      },
      {
        id: '8-2',
        text: 'הכל מודפס ומסודר בקלסר, נתראה בשמונה.',
        timestamp: '22 במאי',
        isOutgoing: true,
        status: 'read',
      },
    ],
  }
];

export const mockStatuses: StatusStory[] = [
  {
    id: 's1',
    userName: 'אמא ❤️',
    userAvatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=150&h=150&q=80',
    mediaUrl: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=800&q=80', // delicious food
    mediaType: 'image',
    timestamp: 'היום, 11:20',
    viewed: false,
  },
  {
    id: 's2',
    userName: 'נועה הראל 🌿',
    userAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&h=150&q=80',
    mediaUrl: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=800&q=80', // yoga outdoor
    mediaType: 'image',
    timestamp: 'היום, 09:15',
    viewed: false,
  },
  {
    id: 's3',
    userName: 'רום - עבודה 💼',
    userAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&h=150&q=80',
    mediaUrl: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=800&q=80', // coding desk
    mediaType: 'image',
    timestamp: 'אתמול, 22:00',
    viewed: true,
  }
];
