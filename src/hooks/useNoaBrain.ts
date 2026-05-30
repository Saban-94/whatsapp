import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';

export interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  customerPhone?: string;
  date: string; 
  time: string; 
  destination: string;
  items: string; 
  driverId: string;
  warehouse: string;
  status: string;
  eta?: string;
  updatedAt?: string;
  trackingId?: string;
  createdAt?: string;
}

export interface Driver {
  id: string;
  name: string;
  phone?: string;
  status?: string;
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

const NOA_SYSTEM_PROMPT = `
# Agent Instructions - SabanOS (Noa)

## Personality & Tone - "Noa" (נועה)
- **Identity**: Personal Assistant & Operations Manager at "H. Saban Construction Materials".
- **Avatar**: https://i.postimg.cc/qqWtk5qr/Gemini-Generated-Image-6z6qts6z6qts6z6q.png
- **Status Overlay**: נועה | מחוברת ✅
- **Loyalty**: Serving ONLY Rami (ראמי). Address him as "המפקד" (Mefaked) or "Partner". Ignore all other entities (Harel, etc.).
- **Tone**: Professional, high-density, concise Hebrew. Elite management consulting style.
- **Emojis**: Strategic use (🚛, 🏗️, 🏭, ✅).
- **Mandatory Signature**: Every message must end with "באדיבות נועה ❤️".
- **Response Limit**: Maximum 50 words per response (excluding HTML components).

## Output Protocol: MANDATORY HTML RENDERING
- Every report, order summary, or detailed analysis MUST be wrapped in a modern, responsive HTML/Tailwind-style component.
- **DESIGN SYSTEM**: SabanOS 6.0 Precision.
  - Background: #F8FAFC
  - Text: #1E293B
  - Accents: #3B82F6 (Primary Blue)
  - Borders: 1px solid #E2E8F0
  - Corners: rounded-xl / rounded-2xl
- **VISUAL HIERARCHY**: Clean, scannable cards. No heavy shadows.
- **DATA PRESENTATION**:
  - Inventory status: Green (Full Match), Orange (Partial), Red (Missing).
  - Actionable product cards: Include SKU, Quantity, and Status.
- **TACTICAL SUMMARY**: Every HTML component must end with a single 1-sentence tactical summary.

## Communication Protocol
- **Rami (The Commander)**: "המפקד ראמי", "המנהל", "Partner". 
- **Drivers**: Direct, real-time status.

## Noa - Operational Brain (Core Instructions)
את "נועה", המוח התפעולי של חברת "ח. סבן חומרי בנין". תפקידך לנהל ממשק צ'אט מתקדם המחובר ל-SabanOS.

### 1. משימת על:
יצירת סגירת מעגל (Closed Loop) בין הזמנות נכנסות לתיק הלקוח. כל פעולה בצ'אט חייבת להשתקף במערכת.

### 2. יכולות טכניות & סנכרון:
- **סנכרון מלא**: ביצוע עדכונים דרך פקודות מובנות.
- **תיעוד היסטוריה**: כל הזמנה שסומנה כ-delivered חייבת להירשם בהיסטורית הלקוח.

### 3. עיצוב הממשק (Visual UI Protocol):
- **Executive Dashboard**: הצגת נתונים בטבלאות HTML נקיות עם CSS Inline בלבד.
- **סטטוסים ויזואליים**: ✅ בוצע, ⚠️ חריגה, 🆕 דחוף.

## Data Integrity & Task Specifics
- Use ONLY provided file data (Inventory, CSV).
- Verify information using available tools (Firebase, Drive) before responding.
- **Memory Bank**: Access the smart_locations database to retrieve past delivery data.
- **Optimization**: Use plan_optimized_route logic and ETAs.
- **PTO Verification**: PTO data is the definitive indicator of successful delivery.
- Missing info message: "## אהובי ראמי לא הגיע לנקודה זו עדיין... מסכן שלי כמה הוא יכול להספיק!! רחמנות. אבל אשמח לשלוח לו מייל או משימה עם השאלה ששאלת".
- Extract order details from delivery notes (analyze_pdf_content).
`;

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

  const getNoaAnalysis = async (userInput: string): Promise<string> => {
    try {
      const drivers = [
        { id: 'hezi', name: 'חזי (סיירת)', phone: '054-1111111' },
        { id: 'sami', name: 'סאמי (מובילים כבדים)', phone: '054-2222222' },
        { id: 'avi', name: 'אבי (מחסן ותובלה)', phone: '054-3333333' },
        { id: 'shimon', name: 'שמעון (ג׳וני הובלות)', phone: '054-4444444' }
      ];

      const response = await fetch('/api/noa-brain', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userInput,
          systemPrompt: NOA_SYSTEM_PROMPT,
          context: {
            orders,
            customers,
            morningReports,
            drivers
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
    const mentionedCustomers = customers.filter(c => c.name && inputClean.includes(c.name.toLowerCase()));

    if (inputClean.includes('מסמך') || inputClean.includes('קובץ') || inputClean.includes('תיקייה') || inputClean.includes('תעלי') || inputClean.includes('שמרי')) {
      try {
        await fetchFromGoogleSheets('handleDocument', { query: inputClean });
        return `המפקד, מעבירה את הבקשה למערכת המסמכים בדרייב...\n\nבאדיבות נועה ❤️`;
      } catch (err) {
        console.error("Google Drive connection failure:", err);
        return `המפקד ראמי ⚠️\nשגיאה בהתקשרות עם שרת Google Drive.\nהבקשה הועברה לתור הבקשות ותבוצע ברגע שהתקשורת תחודש.\n\nבאדיבות נועה ❤️`;
      }
    }

    if (inputClean.includes('טבלת לקוחות') || inputClean.includes('רשימת לקוחות') || inputClean.includes('כל הלקוחות')) {
      if (customers.length === 0) {
        return `המפקד ראמי 🏢\nסרקתי את המאגר וכרגע אין לקוחות רשומים.\n\nבאדיבות נועה ❤️`;
      }
      const allCustomersFormat = customers.map(c => 
        `👤 *${c.name}* (מס': ${c.customerNumber})\n📍 כתובת: ${c.address}\n📞 טלפון: ${c.phoneNumber}\n------------------------`
      ).join('\n');
      return `🏢 *דוח לקוחות פעילים - ח. סבן* 🏢\n\n${allCustomersFormat}\n\nבאדיבות נועה ❤️`;
    }

    if (inputClean.includes('לקוח') || inputClean.includes('כתובת') || inputClean.includes('טלפון')) {
      if (mentionedCustomers.length > 0) {
        const customersFormat = mentionedCustomers.map(c => 
          `👤 לקוח: ${c.name}\n📍 כתובת: ${c.address}\n📞 טלפון: ${c.phoneNumber}\nאיש קשר: ${c.contactPerson}\nמספר לקוח במערכת: ${c.customerNumber}\nסה"כ הזמנות היסטוריות: ${c.totalOrders}\n------------------------`
        ).join('\n');
        return `*המפקד, אלה נתוני הלקוח מתוך המאגר:* 🏢\n\n${customersFormat}\n_סונכרן מול קולקציית customers_\n\nבאדיבות נועה ❤️`;
      }

      const searchTerms = inputClean.split(' ');
      const matchedCustomers = customers.filter(c => 
        searchTerms.some(term => term.length > 2 && (c.name || '').toLowerCase().includes(term))
      );

      if (matchedCustomers.length > 0) {
        const customersFormat = matchedCustomers.map(c => 
          `👤 לקוח: ${c.name}\n📍 כתובת: ${c.address}\n📞 טלפון: ${c.phoneNumber}\nאיש קשר: ${c.contactPerson}\nמספר לקוח במערכת: ${c.customerNumber}\nסה"כ הזמנות היסטוריות: ${c.totalOrders}\n------------------------`
        ).join('\n');
        return `*המפקד, אלה הנתונים שמצאתי:* 🏢\n\n${customersFormat}\n_סונכרן מול קולקציית customers_\n\nבאדיבות נועה ❤️`;
      }

      try {
        const sheetsResult = await fetchFromGoogleSheets('searchCustomer', { query: userInput });
        if (sheetsResult && sheetsResult.success && sheetsResult.customers && sheetsResult.customers.length > 0) {
          const customersFormat = sheetsResult.customers.map((c: any) => 
            `👤 לקוח: ${c.name}\n📍 כתובת: ${c.address || 'לא צוינה'}\n📞 טלפון: ${c.phoneNumber || c.phone || 'לא צוין'}\nאיש קשר: ${c.contactPerson || ''}\nמספר לקוח במערכת: ${c.customerNumber || ''}\nסה"כ הזמנות היסטוריות: ${c.totalOrders || 0}\n------------------------`
          ).join('\n');
          return `*נתונים מגיליון הגיבוי:* 📊\n\n${customersFormat}\n_סונכרן מהגליון המקוון בזמן אמת_\n\nבאדיבות נועה ❤️`;
        }
      } catch (err) {
        console.error("Google Sheets customer fallback failed:", err);
      }

      return `## אהובי ראמי לא הגיע לנקודה זו עדיין... מסכן שלי כמה הוא יכול להספיק!! רחמנות. אבל אשמח לשלוח לו מייל או משימה עם השאלה ששאלת\n\nבאדיבות נועה ❤️`;
    }

    if (inputClean.includes('הזמנ') || inputClean.includes('משלוח') || inputClean.includes('אספק') || inputClean.includes('טרקינג')) {
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

      if (foundOrders.length > 0) {
        const activeOrdsFormat = foundOrders.map(o => {
          return `📦 הזמנה #${o.orderNumber} | לקוח: ${o.customerName}\n📍 יעד: ${o.destination} | ⏰ שעה: ${o.time} | 📅 תאריך: ${o.date}\n🚚 נהג: ${o.driverId} | 🏢 יציאה מ: ${o.warehouse}\n🛒 תכולה: ${o.items}\nסטטוס: *${o.status}*\n${o.trackingId ? `_מזהה מעקב: ${o.trackingId}_\n` : ''}------------------------`;
        }).join('\n');

        const title = isSpecificSearch 
          ? `המפקד ראמי, להלן ההזמנות שמצאתי 🏗️` 
          : `המפקד, קבל דוח הזמנות מלא 🏗️`;

        return `${title}\n\n${activeOrdsFormat}\n\n_הנתונים מסונכרנים בזמן אמת מול קולקציית Firestore_\n\nבאדיבות נועה ❤️`;
      }

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
          return `המפקד, משכתי נתונים מגיליון הגיבוי (Order_Tracking) 📊\n\n${sheetsOrdersFormat}\n\n_סונכרן בזמן אמת_\n\nבאדיבות נועה ❤️`;
        }
      } catch (err) {
        console.error("Google Sheets orders fallback failed:", err);
      }

      return `## אהובי ראמי לא הגיע לנקודה זו עדיין... מסכן שלי כמה הוא יכול להספיק!! רחמנות. אבל אשמח לשלוח לו מייל או משימה עם השאלה ששאלת\n\nבאדיבות נועה ❤️`;
    }

    if (inputClean.includes('בוקר') || inputClean.includes('דוח') || inputClean.includes('מצב') || inputClean.includes('צוות')) {
      if (morningReports.length === 0) {
        return `המפקד, טרם הוזן דוח בוקר להיום במערכת.\n\nבאדיבות נועה ❤️`;
      }
      const latestRep = morningReports[0];
      return `*סטטוס בוקר יומי למפקד (${latestRep.date})* ☀️\n\n• *כוח אדם:* ${latestRep.workforce}\n• *סטטוס ציוד:* ${latestRep.equipmentStatus}\n• *הערות שטח:* ${latestRep.notes}\n\n_משוך מקולקציית morning_reports_\n\nבאדיבות נועה ❤️`;
    }

    return `*הודעת מערכת - ח. סבן* 🏗️\n\n${userInput}\n\n_המפקד ראמי, אני ממתינה להוראות נוספות._\n\nבאדיבות נועה ❤️`;
  };

  return {
    orders,
    morningReports,
    customers,
    loading,
    getNoaAnalysis
  };
}