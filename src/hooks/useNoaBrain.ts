import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';

export interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  date: string; 
  time: string; 
  destination: string;
  items: string; 
  driverId: string;
  warehouse: string;
  status: string;
  trackingId: string;
  createdAt: string;
}

export interface MorningReport {
  id: string;
  date: string;
  workforce: string;
  equipmentStatus: string;
  notes: string;
  createdAt: string;
}

export interface Customer {
  id: string;
  address: string;
  contactPerson: string;
  customerNumber: string;
  name: string;
  phone: string;
  phoneNumber: string;
  totalOrders: number;
}

export function useNoaBrain() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [morningReports, setMorningReports] = useState<MorningReport[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  // 1. האזנה חיה להזמנות - ללא נתוני דמה
  useEffect(() => {
    const ordersCol = collection(db, 'orders');
    
    const unsubscribe = onSnapshot(ordersCol, (snapshot) => {
      const list: Order[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        list.push({
          id: doc.id,
          orderNumber: data.orderNumber || '',
          customerName: data.customerName || '',
          customerPhone: data.customerPhone || '',
          date: data.date || '',
          time: data.time || '',
          destination: data.destination || '',
          items: data.items || '',
          driverId: data.driverId || '',
          warehouse: data.warehouse || '',
          status: data.status || '',
          trackingId: data.trackingId || '',
          createdAt: data.createdAt ? new Date(data.createdAt?.toDate?.() || data.createdAt).toISOString() : new Date().toISOString()
        });
      });
      setOrders(list);
      setLoading(false);
    }, (err) => {
      console.warn('Orders listener error:', err);
      setOrders([]);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // 2. האזנה חיה ללקוחות - נתונים אמיתיים בלבד
  useEffect(() => {
    const customersCol = collection(db, 'customers');
    
    const unsubscribe = onSnapshot(customersCol, (snapshot) => {
      const list: Customer[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        list.push({
          id: doc.id,
          address: data.address || '',
          contactPerson: data.contactPerson || '',
          customerNumber: data.customerNumber || '',
          name: data.name || '',
          phone: data.phone || data.phoneNumber || '',
          phoneNumber: data.phoneNumber || data.phone || '',
          totalOrders: Number(data.totalOrders) || 0
        });
      });
      setCustomers(list);
    }, (err) => {
      console.warn('Customers listener error:', err);
      setCustomers([]);
    });

    return () => unsubscribe();
  }, []);

  // 3. שליפת דוחות בוקר - ללא נתוני דמה
  useEffect(() => {
    const fetchMorningReports = async () => {
      try {
        const reportsCol = collection(db, 'morning_reports');
        const q = query(reportsCol, orderBy('createdAt', 'desc'), limit(5));
        const querySnapshot = await getDocs(q);
        const list: MorningReport[] = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          list.push({
            id: doc.id,
            date: data.date || '',
            workforce: data.workforce || '',
            equipmentStatus: data.equipmentStatus || '',
            notes: data.notes || '',
            createdAt: data.createdAt ? new Date(data.createdAt?.toDate?.() || data.createdAt).toISOString() : new Date().toISOString()
          });
        });
        setMorningReports(list);
      } catch (err) {
        console.warn('Morning reports query error:', err);
        setMorningReports([]);
      }
    };

    fetchMorningReports();
  }, []);

  // 4. ניתוח בקשות ושליפת מידע אמת
  const getNoaAnalysis = async (userInput: string): Promise<string> => {
    const inputClean = userInput.trim().toLowerCase();
    
    // שליפת כלל הלקוחות במאגר
    if (inputClean.includes('טבלת לקוחות') || inputClean.includes('רשימת לקוחות') || inputClean.includes('כל הלקוחות')) {
      if (customers.length === 0) {
        return `*נועה AI* 🏢\nסרקתי את המאגר וכרגע אין לקוחות רשומים.`;
      }
      const allCustomersFormat = customers.map(c => 
        `👤 *${c.name}* (מס': ${c.customerNumber})\n📍 כתובת: ${c.address}\n📞 טלפון: ${c.phoneNumber}\n------------------------`
      ).join('\n');
      return `🏢 *דוח לקוחות פעילים - ח. סבן* 🏢\n\n${allCustomersFormat}`;
    }

    // ניהול שליפת לקוחות לפי שם
    if (inputClean.includes('לקוח') || inputClean.includes('כתובת') || inputClean.includes('טלפון')) {
      const searchTerms = inputClean.split(' ');
      const matchedCustomers = customers.filter(c => 
        searchTerms.some(term => term.length > 2 && (c.name || '').toLowerCase().includes(term))
      );

      if (matchedCustomers.length > 0) {
        const customersFormat = matchedCustomers.map(c => 
          `👤 לקוח: ${c.name}\n📍 כתובת: ${c.address}\n📞 טלפון: ${c.phoneNumber}\nאיש קשר: ${c.contactPerson}\nמספר לקוח במערכת: ${c.customerNumber}\nסה"כ הזמנות היסטוריות: ${c.totalOrders}\n------------------------`
        ).join('\n');
        return `*נועה AI - נתוני לקוחות מתוך המאגר* 🏢\n\n${customersFormat}\n_סונכרן מול קולקציית customers_`;
      } else if (customers.length > 0 && inputClean.includes('לקוחות')) {
         return `במאגר קיימים ${customers.length} לקוחות, אך לא מצאתי לקוח ספציפי שתואם לחיפוש שלך. אנא ציין שם.`;
      }
    }

    // ניהול שליפת הזמנות
    if (inputClean.includes('הזמנ') || inputClean.includes('משלוח') || inputClean.includes('אספק') || inputClean.includes('טרקינג')) {
      if (orders.length === 0) {
        return `*נועה AI - סטטוס הזמנות* 🏗️\n\nסרקתי את המאגר וכרגע אין הזמנות פעילות במערכת.`;
      }

      const activeOrdsFormat = orders.map(o => {
        return `📦 הזמנה #${o.orderNumber} | לקוח: ${o.customerName}\n📍 יעד: ${o.destination} | ⏰ שעה: ${o.time} | 📅 תאריך: ${o.date}\n🚚 נהג: ${o.driverId} | 🏢 יציאה מ: ${o.warehouse}\n🛒 תכולה: ${o.items}\nסטטוס: *${o.status}*\n_מזהה מעקב: ${o.trackingId}_\n------------------------`;
      }).join('\n');

      return `*נועה AI - דוח הזמנות פעיל ומפורט של ח. סבן* 🏗️\n\n${activeOrdsFormat}\n\n_הנתונים מסונכרנים בזמן אמת מול קולקציית Firestore_`;
    }

    // ניהול סטטוס בוקר
    if (inputClean.includes('בוקר') || inputClean.includes('דוח') || inputClean.includes('מצב') || inputClean.includes('צוות')) {
      if (morningReports.length === 0) {
        return `*נועה AI - סטטוס בוקר* ☀️\n\nטרם הוזן דוח בוקר להיום במערכת.`;
      }
      const latestRep = morningReports[0];
      return `*נועה AI - סטטוס בוקר יומי (${latestRep.date})* ☀️\n\n• *כוח אדם:* ${latestRep.workforce}\n• *סטטוס ציוד:* ${latestRep.equipmentStatus}\n• *הערות שטח:* ${latestRep.notes}\n\n_משוך מקולקציית morning_reports_`;
    }

    // תשובת ברירת מחדל אסינכרונית
    return `*הודעת עדכון - ח. סבן* 🏗️\n\n${userInput}\n\n_לכל שאלה ניתן לפנות למשרד._\nsent via JONI`;
  };

  return {
    orders,
    morningReports,
    customers,
    loading,
    getNoaAnalysis
  };
}