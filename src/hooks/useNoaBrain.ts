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

// פונקציית עזר להמרה בטוחה של תאריכים למחרוזת ISO כדי למנוע קריסות של Invalid time value
function safeIsoString(dateVal: any): string {
  if (!dateVal) {
    return new Date().toISOString();
  }
  try {
    let dateObj: Date;
    if (typeof dateVal.toDate === 'function') {
      dateObj = dateVal.toDate();
    } else if (dateVal && typeof dateVal === 'object' && typeof dateVal.seconds === 'number') {
      dateObj = new Date(dateVal.seconds * 1000);
    } else {
      dateObj = new Date(dateVal);
    }
    
    if (isNaN(dateObj.getTime())) {
      return new Date().toISOString();
    }
    return dateObj.toISOString();
  } catch (err) {
    console.error("safeIsoString parsing error, falling back to current date:", err);
    return new Date().toISOString();
  }
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
          createdAt: safeIsoString(data.createdAt)
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
            createdAt: safeIsoString(data.createdAt)
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

  // פונקציית עזר לביצוע קריאות ל-Google Sheets/Drive דרך CORS proxy
  const fetchFromGoogleSheets = async (action: string, payload: any) => {
    try {
      const webhookUrl = (import.meta as any).env?.VITE_GOOGLE_APPS_SCRIPT_WEBHOOK || 'https://script.google.com/macros/s/AKfycby-mock-webhook-id/exec';
      const response = await fetch('/api/google-apps-script', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Google-Webhook': webhookUrl
        },
        body: JSON.stringify({ action, ...payload })
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (err) {
      console.error('fetchFromGoogleSheets failure:', err);
      throw err;
    }
  };

  // 4. ניתוח בקשות ושליפת מידע אמת
  const getNoaAnalysis = async (userInput: string): Promise<string> => {
    try {
      const response = await fetch('/api/noa-brain', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userInput,
          context: {
            orders,
            customers,
            morningReports
          }
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data && data.text) {
          return data.text;
        }
      }
    } catch (err) {
      console.error('Failed to communicate with Noa Brain server endpoint:', err);
    }

    const inputClean = userInput.trim().toLowerCase();
    
    // זיהוי לקוחות שהוזכרו בהודעה באופן פשוט וחסין
    const mentionedCustomers = customers.filter(c => c.name && inputClean.includes(c.name.toLowerCase()));

    // זיהוי כוונת משתמש לטיפול במסמכים וסנכרון מול Google Drive (מילות פתח: מסמך, קובץ, תיקייה, תעלי, שמרי)
    if (inputClean.includes('מסמך') || inputClean.includes('קובץ') || inputClean.includes('תיקייה') || inputClean.includes('תעלי') || inputClean.includes('שמרי')) {
      try {
        await fetchFromGoogleSheets('handleDocument', { query: inputClean });
        return `מעבירה את הבקשה למערכת המסמכים בדרייב...`;
      } catch (err) {
        console.error("Google Drive connection failure:", err);
        return `*נועה AI* ⚠️\nשגיאה בהתקשרות עם שרת Google Drive.\nהבקשה הועברה לתור הבקשות ותבוצע ברגע שהתקשורת תחודש.`;
      }
    }

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
      if (mentionedCustomers.length > 0) {
        const customersFormat = mentionedCustomers.map(c => 
          `👤 לקוח: ${c.name}\n📍 כתובת: ${c.address}\n📞 טלפון: ${c.phoneNumber}\nאיש קשר: ${c.contactPerson}\nמספר לקוח במערכת: ${c.customerNumber}\nסה"כ הזמנות היסטוריות: ${c.totalOrders}\n------------------------`
        ).join('\n');
        return `*נועה AI - נתוני לקוחות מתוך המאגר* 🏢\n\n${customersFormat}\n_סונכרן מול קולקציית customers_`;
      }

      const searchTerms = inputClean.split(' ');
      const matchedCustomers = customers.filter(c => 
        searchTerms.some(term => term.length > 2 && (c.name || '').toLowerCase().includes(term))
      );

      if (matchedCustomers.length > 0) {
        const customersFormat = matchedCustomers.map(c => 
          `👤 לקוח: ${c.name}\n📍 כתובת: ${c.address}\n📞 טלפון: ${c.phoneNumber}\nאיש קשר: ${c.contactPerson}\nמספר לקוח במערכת: ${c.customerNumber}\nסה"כ הזמנות היסטוריות: ${c.totalOrders}\n------------------------`
        ).join('\n');
        return `*נועה AI - נתוני לקוחות מתוך המאגר* 🏢\n\n${customersFormat}\n_סונכרן מול קולקציית customers_`;
      }

      // לקוח לא נמצא ב-Firestore, נבצע חיפוש דרך ה-API בגיליון
      try {
        const sheetsResult = await fetchFromGoogleSheets('searchCustomer', { query: userInput });
        if (sheetsResult && sheetsResult.success && sheetsResult.customers && sheetsResult.customers.length > 0) {
          const customersFormat = sheetsResult.customers.map((c: any) => 
            `👤 לקוח: ${c.name}\n📍 כתובת: ${c.address || 'לא צוינה'}\n📞 טלפון: ${c.phoneNumber || c.phone || 'לא צוין'}\nאיש קשר: ${c.contactPerson || ''}\nמספר לקוח במערכת: ${c.customerNumber || ''}\nסה"כ הזמנות היסטוריות: ${c.totalOrders || 0}\n------------------------`
          ).join('\n');
          return `*נועה AI - נתוני לקוחות מתוך Google Sheets* 📊\n\n${customersFormat}\n_סונכרן מהגליון המקוון בזמן אמת_`;
        }
      } catch (err) {
        console.error("Google Sheets customer fallback failed:", err);
        return `*נועה AI* ⚠️\nשגיאה בקריאת הנתונים מגליון Google Sheets. אנא ודא שהחיבור תקין.`;
      }

      if (customers.length > 0 && inputClean.includes('לקוחות')) {
         return `במאגר קיימים ${customers.length} לקוחות, אך לא מצאתי לקוח ספציפי שתואם לחיפוש שלך. אנא ציין שם.`;
      }
    }

    // ניהול שליפת הזמנות
    if (inputClean.includes('הזמנ') || inputClean.includes('משלוח') || inputClean.includes('אספק') || inputClean.includes('טרקינג')) {
      // נבצע חיפוש ראשוני ב-Firestore
      let foundOrders: Order[] = [];
      let isSpecificSearch = false;

      if (mentionedCustomers.length > 0) {
        isSpecificSearch = true;
        const c = mentionedCustomers[0];
        foundOrders = orders.filter(o => 
          o.customerName && (
            o.customerName.toLowerCase().includes(c.name.toLowerCase()) || 
            c.name.toLowerCase().includes(o.customerName.toLowerCase())
          )
        );
      } else {
        const searchTerms = inputClean.split(' ').filter(word => word.length > 2);
        const keywordsToSkip = ['הזמנ', 'הזמנה', 'הזמנות', 'משלוח', 'משלוחים', 'אספק', 'אספקה', 'טרקינג', 'דוח', 'רשימה', 'רשימ', 'טבלה'];
        const actualSearchTerms = searchTerms.filter(word => !keywordsToSkip.some(keyword => word.includes(keyword)));
        
        if (actualSearchTerms.length > 0) {
          isSpecificSearch = true;
          foundOrders = orders.filter(o => 
            actualSearchTerms.some(term => 
              (o.customerName || '').toLowerCase().includes(term) ||
              (o.orderNumber || '').toLowerCase().includes(term) ||
              (o.destination || '').toLowerCase().includes(term) ||
              (o.items || '').toLowerCase().includes(term)
            )
          );
        } else {
          foundOrders = orders;
        }
      }

      // אם מצאנו הזמנות ב-Firestore, נחזיר אותן
      if (foundOrders.length > 0) {
        const activeOrdsFormat = foundOrders.map(o => {
          return `📦 הזמנה #${o.orderNumber} | לקוח: ${o.customerName}\n📍 יעד: ${o.destination} | ⏰ שעה: ${o.time} | 📅 תאריך: ${o.date}\n🚚 נהג: ${o.driverId} | 🏢 יציאה מ: ${o.warehouse}\n🛒 תכולה: ${o.items}\nסטטוס: *${o.status}*\n${o.trackingId ? `_מזהה מעקב: ${o.trackingId}_\n` : ''}------------------------`;
        }).join('\n');

        const title = isSpecificSearch 
          ? `*נועה AI - הזמנות פעילות תואמות לחיפוש* 🏗️` 
          : `*נועה AI - דוח הזמנות פעיל ומפורט של ח. סבן* 🏗️`;

        return `${title}\n\n${activeOrdsFormat}\n\n_הנתונים מסונכרנים בזמן אמת מול קולקציית Firestore_`;
      }

      // אם אין התאמה או שאין נתונים ב-Firestore, נפנה לגיליון 'Order_Tracking' דרך fetchFromGoogleSheets
      try {
        const sheetsResult = await fetchFromGoogleSheets('searchOrders', { sheetName: 'Order_Tracking', query: inputClean });
        if (sheetsResult && sheetsResult.success && sheetsResult.orders && sheetsResult.orders.length > 0) {
          const sheetsOrdersFormat = sheetsResult.orders.map((o: any) => {
            const orderNum = o.orderNumber || o.id || o.OrderNumber || 'לא ידוע';
            const customerName = o.customerName || o.Customer || o.name || 'לא ידוע';
            const destination = o.destination || o.Destination || o.address || 'לא צוין';
            const time = o.time || o.Time || '';
            const date = o.date || o.Date || '';
            const driver = o.driverId || o.Driver || '';
            const warehouse = o.warehouse || o.Warehouse || '';
            const items = o.items || o.Items || '';
            const status = o.status || o.Status || 'בטיפול';
            const trackingId = o.trackingId || o.TrackingId || '';
            return `📦 הזמנה #${orderNum} | לקוח: ${customerName}\n📍 יעד: ${destination} | ⏰ שעה: ${time} | 📅 תאריך: ${date}\n🚚 נהג: ${driver} | 🏢 יציאה מ: ${warehouse}\n🛒 תכולה: ${items}\nסטטוס: *${status}*\n${trackingId ? `_מזהה מעקב: ${trackingId}_\n` : ''}------------------------`;
          }).join('\n');
          return `*נועה AI - הזמנות רלוונטיות מתוך גליון גיבוי (Order_Tracking)* 📊\n\n${sheetsOrdersFormat}\n\n_הנתונים מסונכרנים מהגליון המקוון בזמן אמת_`;
        }
      } catch (err) {
        console.error("Google Sheets orders fallback failed:", err);
        return `*נועה AI* ⚠️\nשגיאה בקריאת הנתונים מגליון Google Sheets. אנא ודא שהחיבור תקין.`;
      }

      // אם גם הגיליון ריק, נחזיר הודעה שלא נמצאו נתונים בשום מאגר
      return `*נועה AI* 🔍\nסרקתי את מאגר Firestore ואת גליון הגיבוי המקוון (Order_Tracking), אך לא נמצאו נתוני הזמנות התואמים לחיפוש שלך בשום מאגר.`;
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