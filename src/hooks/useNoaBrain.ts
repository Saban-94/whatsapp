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

export interface InventoryItem {
  id: string;
  sku: string;
  name: string;
  description?: string;
  currentStock: number;
  minStock: number;
  unit: string;
  price?: number;
  category?: string;
  imageUrl?: string;
  updatedAt?: string;
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
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const invCol = collection(db, 'inventory');
    const unsubscribe = onSnapshot(invCol, (snapshot) => {
      const list: InventoryItem[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        list.push({
          id: doc.id,
          sku: data.sku || '',
          name: data.name || '',
          description: data.description || '',
          currentStock: Number(data.currentStock) || 0,
          minStock: Number(data.minStock) || 0,
          unit: data.unit || 'יח\'',
          price: Number(data.price) || 0,
          category: data.category || '',
          imageUrl: data.imageUrl || '',
          updatedAt: data.updatedAt || ''
        });
      });
      setInventory(list);
    }, (err) => {
      console.warn('Inventory listener error:', err);
      setInventory([]);
    });

    return () => unsubscribe();
  }, []);

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

  // Helper for driver names
  const getDriverName = (driverId: string) => {
    switch (driverId) {
      case 'hezi': return 'חזי (סיירת)';
      case 'sami': return 'סאמי (מובילים כבדים)';
      case 'avi': return 'אבי (מחסן ותובלה)';
      case 'shimon': return 'שמעון (ג׳וני הובלות)';
      default: return driverId || 'טרם שובץ';
    }
  };

  // Helper for formatting status tags
  const getStatusLabelText = (status: string) => {
    switch (status) {
      case 'pending': return '⏳ בהמתנה';
      case 'preparing': return '🛠️ בהכנה במחסן';
      case 'ready': return '📦 מוכן לעליה';
      case 'on_the_way': return '🚚 בדרך לשטח';
      case 'delivered': return '✅ נמסר וסופק';
      case 'cancelled': return '❌ מבוטל';
      default: return status || 'בטיפול';
    }
  };

  const getStatusBgClassText = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-amber-50 text-amber-700 border border-amber-200';
      case 'preparing': return 'bg-blue-50 text-blue-700 border border-blue-200';
      case 'ready': return 'bg-purple-50 text-purple-700 border border-purple-200';
      case 'on_the_way': return 'bg-cyan-50 text-cyan-700 border border-cyan-200';
      case 'delivered': return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
      case 'cancelled': return 'bg-rose-50 text-rose-700 border border-rose-250';
      default: return 'bg-slate-50 text-slate-700 border border-slate-200';
    }
  };

  // Safe wrapper to convert anything to strict styled HTML matching SabanOS 6.0
  const formatToStrictHtml = (title: string, text: string, type: 'error' | 'success' | 'info' = 'info'): string => {
    const icon = type === 'error' ? '⚠️' : type === 'success' ? '✅' : '🏗️';
    const accentBg = type === 'error' ? 'bg-rose-50 border-rose-100 text-rose-800' : type === 'success' ? 'bg-emerald-50 border-emerald-100 text-emerald-800' : 'bg-blue-50 border-blue-100 text-blue-800';
    
    return `
<div class="bg-[#F8FAFC] border border-[#E2E8F0] shadow-sm text-[#1E293B] font-sans p-5 rounded-2xl text-right my-2" dir="rtl">
  <div class="flex items-center gap-2 px-3 py-1.5 rounded-xl border ${accentBg} mb-3.5 font-bold text-xs select-none">
    <span class="text-base">${icon}</span>
    <span>${title}</span>
  </div>
  <p class="text-xs leading-relaxed text-slate-650 font-medium whitespace-pre-line px-1">
    ${text}
  </p>
  <div class="text-[10px] text-slate-400 mt-4 border-t border-dashed border-[#E2E8F0] pt-2 text-center leading-relaxed">
    המפקד ראמי, המידע זמין לך בכל עת. באדיבות נועה ❤️
  </div>
</div>`.trim();
  };

  // Automated Event Listener to support action delegation natively in standard chat inputs
  useEffect(() => {
    const simulateChatInputAndSend = (text: string) => {
      const inputEl = document.querySelector('input[placeholder="הודעה חדשה..."]') as HTMLInputElement;
      if (inputEl) {
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
        nativeInputValueSetter?.call(inputEl, text);
        inputEl.dispatchEvent(new Event('input', { bubbles: true }));
        setTimeout(() => {
          const sendBtn = document.querySelector('button svg.rotate-180')?.parentElement || 
                          document.querySelector('button[onClick*="handleSend"]');
          if (sendBtn) {
            (sendBtn as HTMLButtonElement).click();
          } else {
            inputEl.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true }));
          }
        }, 100);
      }
    };

    const handleNoaActionGlobal = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (!customEvent.detail) return;
      
      const { action, id, value } = customEvent.detail;
      
      if (action === 'show-driver-tasks') {
        const driverId = id;
        const driverName = getDriverName(driverId);
        simulateChatInputAndSend(`הציגי משימות של הנהג ${driverName}`);
      } else if (action === 'change-driver-active') {
        const driverId = id;
        const driverName = getDriverName(driverId);
        simulateChatInputAndSend(`שנה פעילות עבור הנהג ${driverName}`);
      } else if (action === 'view-tasks') {
        simulateChatInputAndSend('הציגי משימות פעילות');
      }
    };

    window.addEventListener('noa-action', handleNoaActionGlobal);
    return () => {
      window.removeEventListener('noa-action', handleNoaActionGlobal);
    };
  }, []);

  const getNoaAnalysis = async (userInput: string): Promise<string> => {
    const driversInApp = [
      { id: 'hezi', name: 'חזי (סיירת)', phone: '054-1111111' },
      { id: 'sami', name: 'סאמי (מובילים כבדים)', phone: '054-2222222' },
      { id: 'avi', name: 'אבי (מחסן ותובלה)', phone: '054-3333333' },
      { id: 'shimon', name: 'שמעון (ג׳וני הובלות)', phone: '054-4444444' }
    ];

    try {

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
            drivers: driversInApp,
            inventory
          }
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data && data.text) {
          let outputText = data.text;
          // Ensure that the output is wrapped/converted into pure styled HTML to obey strict output protocols
          if (!outputText.includes('<div') && !outputText.includes('<table')) {
            outputText = formatToStrictHtml("עדכון מערכת Noa AI", outputText, "info");
          }
          return outputText;
        }
      }
    } catch (err) {
      console.error('Failed to communicate with Noa Brain server endpoint:', err);
    }

    // --- Core Rule-Based Local Fallback Engine (Forces Clean, Structured Interactive HTML Components in All Cases) ---
    const inputClean = userInput.trim().toLowerCase();
    const mentionedCustomers = customers.filter(c => c.name && inputClean.includes(c.name.toLowerCase()));

    // 0. Inventory & SKU lookup handler
    if (
      inputClean.includes('מלאי') || 
      inputClean.includes('סחורה') || 
      inputClean.includes('מוצר') || 
      inputClean.includes('פריט') || 
      inputClean.includes('sku') || 
      /\d{4,}/.test(inputClean)
    ) {
      // Extract SKU logic from text: e.g. "SKU-100191" or "100191" or "sku 100191"
      const skuMatch = userInput.match(/sku[-_ ]?([a-zA-Z0-9]+)/i) || userInput.match(/(?:sku)?[-_ ]?(\d{4,})/i);
      const skuQuery = skuMatch ? skuMatch[1] : '';

      let matchedItems = inventory;
      if (skuQuery) {
        matchedItems = inventory.filter(item => 
          item.sku.toLowerCase().includes(skuQuery.toLowerCase()) ||
          skuQuery.toLowerCase().includes(item.sku.toLowerCase())
        );
      } else {
        // Look for specific material names of items mentioned in our query
        const searchTerms = inputClean.split(' ').filter(word => word.length > 2 && !['מלאי', 'הציגי', 'תציגי', 'כמה', 'יש', 'מצב', 'של', 'את'].includes(word));
        if (searchTerms.length > 0) {
          matchedItems = inventory.filter(item => 
            searchTerms.some(term => 
              (item.name || '').toLowerCase().includes(term) ||
              (item.sku || '').toLowerCase().includes(term)
            )
          );
        }
      }

      if (matchedItems.length > 0) {
        const itemsCardsHtml = matchedItems.map(item => {
          const isLowStock = item.currentStock < item.minStock;
          const statusBgClass = isLowStock ? 'bg-rose-50 text-rose-700 border border-rose-100' : 'bg-emerald-50 text-emerald-800 border border-emerald-100';
          const statusLabel = isLowStock ? '🔴 חוסר במלאי / מתחת למינימום' : '🟢 מלאי תקין ומאושר';
          const statusProgressPercent = Math.min(100, Math.max(0, (item.currentStock / (item.minStock || 1)) * 50));
          
          return `
<div class="bg-white rounded-xl p-4 border border-[#E2E8F0] mb-3 hover:shadow-xs transition-all relative overflow-hidden text-right" dir="rtl">
  <div class="absolute top-0 right-0 left-0 h-1 ${isLowStock ? 'bg-rose-500' : 'bg-emerald-500'}"></div>
  <div class="flex items-start gap-4 mt-1">
    ${item.imageUrl ? `
      <img src="${item.imageUrl}" alt="${item.name}" referrerpolicy="no-referrer" class="w-16 h-16 rounded-lg object-cover border border-gray-150 shrink-0" />
    ` : `
      <div class="w-16 h-16 rounded-lg bg-slate-100 border border-gray-150 flex items-center justify-center shrink-0">
        <span class="text-2xl">📦</span>
      </div>
    `}
    <div class="flex-1 min-w-0 font-sans">
      <div class="flex items-center justify-between mb-1">
        <span class="text-[10px] font-bold font-mono bg-slate-100 text-slate-600 px-2 py-0.5 rounded">SKU-${item.sku}</span>
        <span class="text-[11px] font-semibold px-2 py-0.5 rounded-full ${statusBgClass}">
          ${item.currentStock} ${item.unit}
        </span>
      </div>
      <h4 class="font-bold text-sm text-slate-800 leading-snug">${item.name}</h4>
      ${item.description ? `<p class="text-[11px] text-slate-500 mt-1.5 leading-relaxed">${item.description}</p>` : ''}
      
      <div class="grid grid-cols-2 gap-x-4 gap-y-1.5 mt-3 pt-3 border-t border-dashed border-[#E2E8F0] text-[11px] text-slate-600">
        <div><b>📦 כמות נוכחית:</b> ${item.currentStock} ${item.unit}</div>
        <div><b>📉 סף מינימום:</b> ${item.minStock} ${item.unit}</div>
        ${item.price ? `<div><b>💰 מחיר מחירון:</b> ₪${item.price}</div>` : ''}
        ${item.category ? `<div><b>🏷️ קטגוריה:</b> ${item.category}</div>` : ''}
      </div>

      <div class="mt-3.5 flex items-center gap-2 select-none">
        <div class="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
          <div class="h-full rounded-full ${isLowStock ? 'bg-rose-500' : 'bg-emerald-500'}" style="width: ${statusProgressPercent}%"></div>
        </div>
        <span class="text-[10px] font-bold text-slate-500 shrink-0">${statusLabel}</span>
      </div>
    </div>
  </div>
</div>
          `;
        }).join('\n');

        return `
<div class="bg-[#F8FAFC] border border-[#E2E8F0] shadow-sm text-[#1E293B] font-sans p-5 rounded-2xl text-right my-2" dir="rtl">
  <div class="flex items-center justify-between border-b border-[#E2E8F0] pb-2.5 mb-4 select-none">
    <div class="flex items-center gap-2">
      <span class="text-xl">📦</span>
      <span class="text-sm font-bold text-slate-800">כרטיס מוצר ומצב מלאי - ח. סבן חומרי בניין</span>
    </div>
    <span class="text-[10px] font-bold px-2 py-0.5 bg-blue-50 text-[#3B82F6] rounded-full">סנכרון Firestore</span>
  </div>
  
  <div class="space-y-1">
    ${itemsCardsHtml}
  </div>
  
  <div class="text-[10px] text-slate-400 mt-2.5 border-t border-dashed border-[#E2E8F0] pt-2 text-center select-none font-sans leading-relaxed">
    המפקד ראמי, נתוני המלאי מסונכרנים בזמן אמת. באדיבות נועה ❤️
  </div>
</div>`.trim();
      }

      const inputSearchDisplay = skuQuery ? `SKU-${skuQuery}` : userInput;
      return `
<div class="bg-[#F8FAFC] border border-[#E2E8F0] shadow-sm text-[#1E293B] font-sans p-5 rounded-2xl text-right my-2" dir="rtl">
  <div class="flex items-center gap-2 text-rose-600 mb-3 font-semibold text-sm select-none">
    <span>⚠️</span>
    <span>פריט לא נמצא במלאי במחסן</span>
  </div>
  <p class="text-xs leading-relaxed text-slate-600 font-medium">
    המפקד ראמי, סרקתי את קולקציית inventory ב-Firestore עבור <b>"${inputSearchDisplay}"</b> ואין מזהה תואם במחסני ח. סבן.
  </p>
  <div class="text-[10px] text-slate-400 mt-3 border-t border-dashed border-[#E2E8F0] pt-2 text-center select-none">
    המפקד, אני איתך בכל שלב. באדיבות נועה ❤️
  </div>
</div>`.trim();
    }

    // 1. Google Drive Documents Handling
    if (inputClean.includes('מסמך') || inputClean.includes('קובץ') || inputClean.includes('תיקייה') || inputClean.includes('תעלי') || inputClean.includes('שמרי')) {
      try {
        await fetchFromGoogleSheets('handleDocument', { query: inputClean });
        return formatToStrictHtml("סנכרון Google Drive", "המפקד ראמי,\nמעבירת את הבקשה למערכת המסמכים השופטים ב-Google Drive.\nניהול קובצי המזכר התבצע ישירות לשורש תיקיות העבודה של ח. סבן.", "success");
      } catch (err) {
        console.error("Google Drive connection failure:", err);
        return formatToStrictHtml("שגיאת Google Drive", "המפקד ראמי, החיבור עם שרת הדרייב נתקל בשגיאה רגעית.\nהבקשה הוכנסה לתור הביצוע ותאותחל ברגע שהרשת תתייצב.", "error");
      }
    }

    // 2. Customers Table Query
    if (inputClean.includes('טבלת לקוחות') || inputClean.includes('רשימת לקוחות') || inputClean.includes('כל הלקוחות')) {
      if (customers.length === 0) {
        return formatToStrictHtml("דוח לקוחות פעילים", "המפקד ראמי 🏢\nסרקתי את המאגר וכרגע אין לקוחות רשומים בקולקציית customers.", "error");
      }
      
      const rowsHtml = customers.map((c, i) => `
        <tr class="${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'} hover:bg-slate-50 transition-all select-none">
          <td class="p-3 font-bold font-mono text-[#3B82F6]">#${c.customerNumber || 'C' + i}</td>
          <td class="p-3">
            <div class="font-bold text-slate-800">${c.name}</div>
            <div class="text-[10px] text-slate-500 mt-0.5">👤 איש קשר: ${c.contactPerson || 'לא הוזן'} | 📞 ${c.phoneNumber || c.phone || 'ללא'}</div>
            <div class="text-[10px] text-slate-400">📍 יעד: ${c.address || 'לא צוינה'}</div>
          </td>
          <td class="p-3 text-center">
            <span class="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-800">${c.totalOrders || 0} הזמנות</span>
          </td>
        </tr>
      `).join('');

      return `
<div class="bg-[#F8FAFC] border border-[#E2E8F0] shadow-sm text-[#1E293B] font-sans p-5 rounded-2xl text-right my-2" dir="rtl">
  <div class="flex items-center justify-between border-b border-[#E2E8F0] pb-2.5 mb-4 select-none">
    <div class="flex items-center gap-2">
      <span class="text-xl">🏢</span>
      <span class="text-sm font-bold text-slate-800">דוח לקוחות פעילים לשנת 2026 - ח. סבן חומרי בניין</span>
    </div>
    <span class="text-[10px] font-bold px-2 py-0.5 bg-blue-50 text-[#3B82F6] rounded-full">מתוך המאגר</span>
  </div>
  
  <div class="overflow-x-auto rounded-xl border border-[#E2E8F0] bg-white">
    <table class="w-full text-right text-xs">
      <thead class="bg-[#F1F5F9] text-slate-600 font-semibold border-b border-[#E2E8F0]">
        <tr>
          <th class="p-2.5 text-right">מזהה לקוח</th>
          <th class="p-2.5 text-right">פרטי התקשרות וסיווג</th>
          <th class="p-2.5 text-center">ריכוז פעילות</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-[#E2E8F0] text-slate-700">
        ${rowsHtml}
      </tbody>
    </table>
  </div>
  
  <div class="mt-4 flex flex-wrap gap-2 justify-start border-t border-[#E2E8F0] pt-3">
    <button onclick="window.dispatchEvent(new CustomEvent('noa-action', {detail: {action: 'view-tasks', id: ''}}))" class="px-3 py-1.5 text-xs font-bold bg-blue-50 text-[#3B82F6] hover:bg-blue-100 rounded-lg border-0 cursor-pointer transition-all">הצג משימות פעילות 📋</button>
  </div>
  <div class="text-[10px] text-slate-400 mt-2.5 border-t border-dashed border-[#E2E8F0] pt-2 text-center select-none font-sans leading-relaxed">
    המפקד ראמי, להלן טבלת לקוחות מלאה פעילה במערכת. באדיבות נועה ❤️
  </div>
</div>`.trim();
    }

    // 3. Customer Specific Search Card Falling Back
    if (inputClean.includes('לקוח') || inputClean.includes('כתובת') || inputClean.includes('טלפון')) {
      if (mentionedCustomers.length > 0) {
        const cardsHtml = mentionedCustomers.map(c => `
<div class="bg-[#F8FAFC] border border-[#E2E8F0] shadow-sm text-[#1E293B] font-sans p-5 rounded-2xl text-right my-2" dir="rtl">
  <div class="flex items-center justify-between border-b border-[#E2E8F0] pb-2.5 mb-4 select-none">
    <div class="flex items-center gap-2">
      <span class="text-xl">👤</span>
      <span class="text-sm font-bold text-slate-800">כרטיס לקוח: ${c.name}</span>
    </div>
    <span class="text-[10px] font-bold px-2 py-0.5 bg-blue-50 text-[#3B82F6] rounded-full">סנכרון Firestore</span>
  </div>
  <div class="space-y-2.5 text-xs text-slate-700">
    <div><b>👤 לקוח:</b> ${c.name}</div>
    <div><b>📍 כתובת יעד:</b> ${c.address || 'לא צוינה'}</div>
    <div><b>📞 טלפון:</b> <a href="tel:${c.phoneNumber || c.phone}" class="text-[#3B82F6] font-mono hover:underline font-bold">${c.phoneNumber || c.phone || 'לא צוין'}</a></div>
    <div><b>👤 איש קשר:</b> ${c.contactPerson || 'לא צוין'}</div>
    <div><b>📄 מספר לקוח במערכת:</b> <span class="font-mono bg-slate-100 px-1.5 py-0.5 rounded">${c.customerNumber}</span></div>
    <div><b>📊 סה"כ הזמנות היסטוריות:</b> <span class="font-semibold text-slate-800">${c.totalOrders} הזמנות</span></div>
  </div>
  <div class="mt-4 flex flex-wrap gap-2 justify-start border-t border-[#E2E8F0] pt-3">
    <button onclick="window.dispatchEvent(new CustomEvent('noa-action', {detail: {action: 'view-tasks', id: ''}}))" class="px-3 py-1.5 text-xs font-bold bg-blue-50 text-[#3B82F6] hover:bg-blue-100 rounded-lg border-0 cursor-pointer transition-all">הצג משימות 📋</button>
  </div>
  <div class="text-[10px] text-slate-400 mt-3 border-t border-dashed border-[#E2E8F0] pt-2 text-center select-none font-sans">
    המפקד ראמי, פרטי הלקוח מסונכרנים לקולקציית customers. באדיבות נועה ❤️
  </div>
</div>
      `).join('\n');
        return cardsHtml;
      }

      // Sheets fallbacks for customer search
      try {
        const sheetsResult = await fetchFromGoogleSheets('searchCustomer', { query: userInput });
        if (sheetsResult && sheetsResult.success && sheetsResult.customers && sheetsResult.customers.length > 0) {
          const cardsHtml = sheetsResult.customers.map((c: any) => `
<div class="bg-[#F8FAFC] border border-[#E2E8F0] shadow-sm text-[#1E293B] font-sans p-5 rounded-2xl text-right my-2" dir="rtl">
  <div class="flex items-center justify-between border-b border-[#E2E8F0] pb-2.5 mb-4 select-none">
    <div class="flex items-center gap-2">
      <span class="text-xl">👤</span>
      <span class="text-sm font-bold text-slate-800">גיליון גיבוי - לקוח: ${c.name}</span>
    </div>
    <span class="text-[10px] font-bold px-2 py-0.5 bg-amber-50 text-amber-700 rounded-full">מקוון</span>
  </div>
  <div class="space-y-2.5 text-xs text-slate-700">
    <div><b>👤 לקוח:</b> ${c.name}</div>
    <div><b>📍 כתובת יעד:</b> ${c.address || 'לא צוינה'}</div>
    <div><b>📞 טלפון:</b> <span class="text-slate-800 font-mono font-bold">${c.phoneNumber || c.phone || 'לא צוין'}</span></div>
    <div><b>👤 איש קשר:</b> ${c.contactPerson || ''}</div>
    <div><b>📄 מספר לקוח:</b> <span class="font-mono bg-slate-100 px-1.5 py-0.5 rounded">${c.customerNumber || ''}</span></div>
    <div><b>📊 הזמנות מצרפיות:</b> <span class="font-semibold text-slate-800">${c.totalOrders || 0}</span></div>
  </div>
  <div class="text-[10px] text-slate-400 mt-3 border-t border-dashed border-[#E2E8F0] pt-2 text-center select-none font-sans">
    המפקד ראמי, נתוני גיבוי מסונכרנים מהשרת. באדיבות נועה ❤️
  </div>
</div>
          `).join('\n');
          return cardsHtml;
        }
      } catch (err) {
        console.error("Google Sheets customer fallback failed:", err);
      }

      // No match fallback HTML (Requirement 5)
      return `
<div class="bg-[#F8FAFC] border border-[#E2E8F0] shadow-sm text-[#1E293B] font-sans p-5 rounded-2xl text-right my-2" dir="rtl">
  <div class="flex items-center gap-2 text-rose-600 mb-3 font-semibold text-sm select-none">
    <span>⚠️</span>
    <span>חוסר מידע במערכת</span>
  </div>
  <p class="text-xs leading-relaxed text-slate-600 font-medium">
    המפקד ראמי לא הגיע לנקודה זו עדיין... מסכן שלי כמה הוא יכול להספיק!! רחמנות. אבל אשמח לשלוח לו מייל או משימה עם השאלה ששאלת.
  </p>
  <div class="mt-4 flex flex-wrap gap-2 justify-start border-t border-[#E2E8F0] pt-3">
    <button onclick="window.dispatchEvent(new CustomEvent('noa-action', {detail: {action: 'view-tasks', id: ''}}))" class="px-3 py-1.5 text-xs font-bold bg-blue-50 text-[#3B82F6] hover:bg-blue-100 rounded-lg border-0 cursor-pointer transition-all font-sans">הצג משימות 📋</button>
  </div>
  <div class="text-[10px] text-slate-400 mt-2.5 border-t border-dashed border-[#E2E8F0] pt-2 text-center select-none leading-relaxed">
    המפקד, אני איתך בכל שלב. באדיבות נועה ❤️
  </div>
</div>`.trim();
    }

    // 4. Orders Query & Detailed Order Cards
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
          const statusLabel = getStatusLabelText(o.status);
          const statusBg = getStatusBgClassText(o.status);
          const driverName = getDriverName(o.driverId);
          return `
<div class="bg-[#F8FAFC] border border-[#E2E8F0] shadow-sm text-[#1E293B] font-sans p-5 rounded-2xl text-right my-2" dir="rtl">
  <div class="flex items-center justify-between border-b border-[#E2E8F0] pb-2.5 mb-3 select-none">
    <span class="text-xs font-bold font-mono px-2 py-1 bg-[#3B82F6]/10 text-[#3B82F6] rounded-md">הזמנה #${o.orderNumber || o.id.slice(0, 5)}</span>
    <span class="text-xs font-semibold px-2 py-0.5 rounded-full ${statusBg}">${statusLabel}</span>
  </div>
  <div class="space-y-2 text-xs text-slate-700">
    <div><b>👤 לקוח:</b> ${o.customerName}</div>
    <div><b>📍 יעד:</b> ${o.destination}</div>
    <div><b>⏰ שעה:</b> ${o.time} | 📅 תאריך: ${o.date}</div>
    <div><b>🚚 נהג:</b> ${driverName}</div>
    <div><b>🏢 יציאה מ:</b> ${o.warehouse}</div>
    <div class="bg-white p-2.5 rounded-xl border border-[#E2E8F0] text-[11px] font-mono leading-relaxed mt-2">
      <b>📦 פירוט פריטים וציוד:</b><br/>
      ${o.items}
    </div>
  </div>
  <div class="mt-4 flex flex-wrap gap-1.5 justify-start border-t border-[#E2E8F0] pt-3 animate-fade-in" dir="rtl">
    <button onclick="window.dispatchEvent(new CustomEvent('noa-action', {detail: {action: 'open-driver-select', orderId: '${o.id}'}}))" class="px-2.5 py-1 text-[11px] font-bold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg border border-indigo-100 cursor-pointer transition-all">שבץ נהג 👤</button>
    <button onclick="window.dispatchEvent(new CustomEvent('noa-action', {detail: {action: 'open-status-select', orderId: '${o.id}'}}))" class="px-2.5 py-1 text-[11px] font-bold bg-amber-50 text-amber-700 hover:bg-amber-100 rounded-lg border border-amber-100 cursor-pointer transition-all">עדכן סטטוס 🔄</button>
    <button onclick="window.dispatchEvent(new CustomEvent('noa-action', {detail: {action: 'update-order', orderId: '${o.id}', field: 'status', value: 'preparing'}}))" class="px-2.5 py-1 text-[11px] font-bold bg-blue-50 text-[#3B82F6] hover:bg-blue-100 rounded-lg border-0 cursor-pointer transition-all">בהכנה 🛠️</button>
    <button onclick="window.dispatchEvent(new CustomEvent('noa-action', {detail: {action: 'update-order', orderId: '${o.id}', field: 'status', value: 'ready'}}))" class="px-2.5 py-1 text-[11px] font-bold bg-purple-50 text-purple-700 hover:bg-purple-100 rounded-lg border-0 cursor-pointer transition-all">מוכן לעליה 📦</button>
    <button onclick="window.dispatchEvent(new CustomEvent('noa-action', {detail: {action: 'update-order', orderId: '${o.id}', field: 'status', value: 'on_the_way'}}))" class="px-2.5 py-1 text-[11px] font-bold bg-cyan-50 text-cyan-700 hover:bg-cyan-100 rounded-lg border-0 cursor-pointer transition-all">בדרך 🚚</button>
    <button onclick="window.dispatchEvent(new CustomEvent('noa-action', {detail: {action: 'update-order', orderId: '${o.id}', field: 'status', value: 'delivered'}}))" class="px-2.5 py-1 text-[11px] font-bold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg border-0 cursor-pointer transition-all">נמסר ✅</button>
    <button onclick="window.dispatchEvent(new CustomEvent('noa-action', {detail: {action: 'update-order', orderId: '${o.id}', field: 'eta', value: ''}}))" class="px-2.5 py-1 text-[11px] font-bold bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-lg border-0 cursor-pointer transition-all">איפוס הגעה 🕒</button>
  </div>
  <div class="text-[10px] text-slate-400 mt-3 border-t border-dashed border-[#E2E8F0] pt-2 text-center select-none font-sans leading-relaxed">
    המפקד ראמי, נתוני ההזמנה של ${o.customerName} מעוגנים ב-Firestore. באדיבות נועה ❤️
  </div>
</div>
          `;
        }).join('\n');
        return activeOrdsFormat;
      }

      // Sheets fallbacks for orders
      try {
        const sheetsResult = await fetchFromGoogleSheets('searchOrders', { sheetName: 'Order_Tracking', query: inputClean });
        if (sheetsResult && sheetsResult.success && sheetsResult.orders && sheetsResult.orders.length > 0) {
          const sheetsOrdersFormat = sheetsResult.orders.map((o: any) => {
            const orderNum = o.orderNumber || o.id || o.OrderNumber || 'לא ידוע';
            const customerName = o.customerName || o.Customer || o.name || 'לא ידוע';
            const destination = o.destination || o.Destination || o.address || 'לא צוין';
            const time = o.time || o.Time || '';
            const date = o.date || o.Date || '';
            const statusLabelText = getStatusLabelText(o.status || 'pending');
            const statusBg = getStatusBgClassText(o.status || 'pending');
            const driverName = getDriverName(o.driverId || '');
            const warehouse = o.warehouse || o.Warehouse || 'ראשי';
            const items = o.items || o.Items || 'ללא פריטים';
            const id = o.id || o.orderNumber || '';
            return `
<div class="bg-[#F8FAFC] border border-[#E2E8F0] shadow-sm text-[#1E293B] font-sans p-5 rounded-2xl text-right my-2" dir="rtl">
  <div class="flex items-center justify-between border-b border-[#E2E8F0] pb-2.5 mb-3 select-none">
    <span class="text-xs font-bold font-mono px-2 py-1 bg-amber-50 text-amber-700 rounded-md">גיבוי - הזמנה #${orderNum}</span>
    <span class="text-xs font-semibold px-2 py-0.5 rounded-full ${statusBg}">${statusLabelText}</span>
  </div>
  <div class="space-y-2 text-xs text-slate-700">
    <div><b>👤 לקוח:</b> ${customerName}</div>
    <div><b>📍 יעד:</b> ${destination}</div>
    <div><b>⏰ שעה:</b> ${time} | 📅 תאריך: ${date}</div>
    <div><b>🚚 נהג:</b> ${driverName}</div>
    <div><b>🏢 יציאה מ:</b> ${warehouse}</div>
    <div class="bg-white p-2.5 rounded-xl border border-[#E2E8F0] text-[11px] font-mono leading-relaxed mt-2">
      <b>📦 פירוט פריטים וציוד:</b><br/>
      ${items}
    </div>
  </div>
  <div class="text-[10px] text-slate-400 mt-3 border-t border-dashed border-[#E2E8F0] pt-2 text-center select-none font-sans leading-relaxed">
    המפקד ראמי, נתוני הזמנת גיבוי משוכים בהצלחה מהענן. באדיבות נועה ❤️
  </div>
</div>
            `;
          }).join('\n');
          return sheetsOrdersFormat;
        }
      } catch (err) {
        console.error("Google Sheets orders fallback failed:", err);
      }

      // No match fallback HTML (Requirement 5)
      return `
<div class="bg-[#F8FAFC] border border-[#E2E8F0] shadow-sm text-[#1E293B] font-sans p-5 rounded-2xl text-right my-2" dir="rtl">
  <div class="flex items-center gap-2 text-rose-600 mb-3 font-semibold text-sm select-none">
    <span>⚠️</span>
    <span>חוסר מידע במערכת</span>
  </div>
  <p class="text-xs leading-relaxed text-slate-600 font-medium">
    המפקד ראמי לא הגיע לנקודה זו עדיין... מסכן שלי כמה הוא יכול להספיק!! רחמנות. אבל אשמח לשלוח לו מייל או משימה עם השאלה ששאלת.
  </p>
  <div class="mt-4 flex flex-wrap gap-2 justify-start border-t border-[#E2E8F0] pt-3">
    <button onclick="window.dispatchEvent(new CustomEvent('noa-action', {detail: {action: 'view-tasks', id: ''}}))" class="px-3 py-1.5 text-xs font-bold bg-blue-50 text-[#3B82F6] hover:bg-blue-100 rounded-lg border-0 cursor-pointer transition-all font-sans">הצג משימות 📋</button>
  </div>
  <div class="text-[10px] text-slate-400 mt-2.5 border-t border-dashed border-[#E2E8F0] pt-2 text-center select-none leading-relaxed">
    המפקד, אני איתך בכל שלב. באדיבות נועה ❤️
  </div>
</div>`.trim();
    }

    // 5. Morning Reports Query Response
    if (inputClean.includes('בוקר') || inputClean.includes('דוח') || inputClean.includes('מצב') || inputClean.includes('צוות')) {
      if (morningReports.length === 0) {
        return formatToStrictHtml("דוח תפעולי", "המפקד ראמי,\nטרם הוזן דוח בוקר יומי להיום במאגר morning_reports.", "error");
      }
      const latestRep = morningReports[0];
      return `
<div class="bg-[#F8FAFC] border border-[#E2E8F0] shadow-sm text-[#1E293B] font-sans p-5 rounded-2xl text-right my-2" dir="rtl">
  <div class="flex items-center justify-between border-b border-[#E2E8F0] pb-2.5 mb-4 select-none">
    <div class="flex items-center gap-2">
      <span class="text-xl">☀️</span>
      <span class="text-sm font-bold text-slate-800">דוח סטטוס בוקר תפעולי</span>
    </div>
    <span class="text-[10px] font-bold px-2 py-0.5 bg-amber-50 text-amber-700 rounded-full">${latestRep.date}</span>
  </div>
  
  <div class="space-y-3 text-xs text-slate-700">
    <div class="flex items-start gap-2 bg-white p-2.5 rounded-xl border border-[#E2E8F0]">
      <span class="text-base">👥</span>
      <div>
        <div class="font-bold text-slate-800">כוח אדם תפעולי:</div>
        <div class="mt-0.5 text-slate-600">${latestRep.workforce}</div>
      </div>
    </div>
    
    <div class="flex items-start gap-2 bg-white p-2.5 rounded-xl border border-[#E2E8F0]">
      <span class="text-base">🛠️</span>
      <div>
        <div class="font-bold text-slate-800 font-sans">סטטוס מכונות וציוד שטח:</div>
        <div class="mt-0.5 text-slate-600">${latestRep.equipmentStatus}</div>
      </div>
    </div>
    
    <div class="flex items-start gap-2 bg-white p-2.5 rounded-xl border border-[#E2E8F0]">
      <span class="text-base">📝</span>
      <div>
        <div class="font-bold text-slate-800">הערות ותובנות שטח:</div>
        <div class="mt-0.5 text-slate-600">${latestRep.notes}</div>
      </div>
    </div>
  </div>
  
  <div class="mt-4 flex flex-wrap gap-2 justify-start border-t border-[#E2E8F0] pt-3">
    <button onclick="window.dispatchEvent(new CustomEvent('noa-action', {detail: {action: 'view-tasks', id: ''}}))" class="px-3 py-1.5 text-xs font-bold bg-blue-50 text-[#3B82F6] hover:bg-blue-100 rounded-lg border-0 cursor-pointer transition-all">הצג משימות 📋</button>
  </div>
  
  <div class="text-[10px] text-slate-400 mt-2.5 border-t border-dashed border-[#E2E8F0] pt-2 text-center select-none leading-relaxed font-sans">
    המפקד ראמי, דוח בוקר משוך מקולקציית morning_reports. באדיבות נועה ❤️
  </div>
</div>`.trim();
    }

    // 6. Driver Query / Status Handling fallback
    if (inputClean.includes('נהג') || inputClean.includes('נהגים') || inputClean.includes('חזי') || inputClean.includes('סאמי') || inputClean.includes('אבי') || inputClean.includes('שמעון')) {
      const rowsHtml = driversInApp.map((d, i) => `
        <tr class="${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/45'} hover:bg-slate-50 transition-all select-none">
          <td class="p-3">
            <div class="font-bold text-slate-800">${d.name}</div>
            <div class="text-[10px] text-slate-400 font-mono">ID: ${d.id}</div>
          </td>
          <td class="p-3">
            <div class="font-mono text-[#3B82F6] font-bold">${d.phone}</div>
            <div class="text-[10px] text-emerald-600">סיירת תפעול פעילה 🟢</div>
          </td>
          <td class="p-3 text-center">
            <div class="flex flex-col gap-1.5 items-center">
              <button onclick="window.dispatchEvent(new CustomEvent('noa-action', {detail: {action: 'show-driver-tasks', id: '${d.id}', value: '${d.name}'}}))" class="px-2 py-1 text-[10px] font-bold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg border-0 cursor-pointer transition-all w-full">הצג משימות 📋</button>
              <button onclick="window.dispatchEvent(new CustomEvent('noa-action', {detail: {action: 'change-driver-active', id: '${d.id}', value: '${d.name}'}}))" class="px-2 py-1 text-[10px] font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg border-0 cursor-pointer transition-all w-full">סטטוס פעילות 🔄</button>
            </div>
          </td>
        </tr>
      `).join('');

      return `
<div class="bg-[#F8FAFC] border border-[#E2E8F0] shadow-sm text-[#1E293B] font-sans p-5 rounded-2xl text-right my-2" dir="rtl">
  <div class="flex items-center justify-between border-b border-[#E2E8F0] pb-2.5 mb-4 select-none">
    <div class="flex items-center gap-2">
      <span class="text-xl">🚚</span>
      <span class="text-sm font-bold text-slate-800">שיבוץ נהגי סיירת וספקים - ח. סבן</span>
    </div>
    <span class="text-[10px] font-bold px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-full">מחובר סיירת במערכת</span>
  </div>
  
  <div class="overflow-x-auto rounded-xl border border-[#E2E8F0] bg-white">
    <table class="w-full text-right text-xs">
      <thead class="bg-[#F1F5F9] text-slate-600 font-semibold border-b border-[#E2E8F0]">
        <tr>
          <th class="p-2.5 text-right">נהג סיירת</th>
          <th class="p-2.5 text-right">סיווג וקשר</th>
          <th class="p-2.5 text-center">פקודות שליטה</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-[#E2E8F0] text-slate-700">
        ${rowsHtml}
      </tbody>
    </table>
  </div>
  
  <div class="text-[10px] text-slate-400 mt-3 border-t border-dashed border-[#E2E8F0] pt-2 text-center select-none leading-relaxed">
    המפקד ראמי, סטטוס נהגי החברה ודרכי יצירת הקשר מסונכרנים בזמן אמת. באדיבות נועה ❤️
  </div>
</div>`.trim();
    }

    // Default System Update Visual Card
    return formatToStrictHtml("עדכון לוגיסטי - ח. סבן", userInput, "info");
  };

  return {
    orders,
    morningReports,
    customers,
    inventory,
    loading,
    getNoaAnalysis
  };
}