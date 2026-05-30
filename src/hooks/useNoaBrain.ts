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
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      return await response.json();
    } catch (err) {
      console.error('fetchFromGoogleSheets failure:', err);
      throw err;
    }
  };

  const getNoaAnalysis = async (userInput: string): Promise<string> => {
    try {
      const response = await fetch('/api/noa-brain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userInput,
          context: { orders, customers, morningReports }
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data && data.text) return data.text;
      }
    } catch (err) {
      console.error('Failed to communicate with Noa Brain server endpoint:', err);
    }

    const inputClean = userInput.trim().toLowerCase();
    const mentionedCustomers = customers.filter(c => c.name && inputClean.includes(c.name.toLowerCase()));

    if (inputClean.includes('הזמנ') || inputClean.includes('משלוח') || inputClean.includes('אספק') || inputClean.includes('טרקינג')) {
      let foundOrders: Order[] = [];
      let isSpecificSearch = false;

      if (mentionedCustomers.length > 0) {
        isSpecificSearch = true;
        const c = mentionedCustomers[0];
        foundOrders = orders.filter(o => 
          o.customerName && (o.customerName.toLowerCase().includes(c.name.toLowerCase()) || c.name.toLowerCase().includes(o.customerName.toLowerCase()))
        );
      } else {
        const searchTerms = inputClean.split(' ').filter(word => word.length > 2);
        const keywordsToSkip = ['הזמנ', 'הזמנה', 'הזמנות', 'משלוח', 'משלוחים', 'אספק', 'אספקה', 'טרקינג', 'דוח', 'רשימה'];
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
        // WhatsApp Business Rich HTML Cards
        const activeOrdsFormat = foundOrders.map(o => `
<div class="bg-white border border-slate-200 rounded-2xl p-4 mb-3 shadow-sm text-right font-sans" dir="rtl">
  <div class="flex justify-between items-center border-b border-slate-100 pb-3 mb-3">
    <div class="font-bold text-slate-800 text-[15px] flex items-center gap-2">
      <span class="text-lg">📦</span> הזמנה #${o.orderNumber || o.id.substring(0,5)}
    </div>
    <div class="bg-blue-50 text-blue-700 text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wide border border-blue-100">
      ${o.status}
    </div>
  </div>
  
  <div class="grid grid-cols-2 gap-2 text-xs text-slate-600 mb-4">
    <div class="bg-slate-50 p-2.5 rounded-xl">
      <span class="font-semibold text-slate-400 block mb-0.5 text-[10px]">לקוח</span>
      <span class="font-medium text-slate-800 truncate block">${o.customerName}</span>
    </div>
    <div class="bg-slate-50 p-2.5 rounded-xl">
      <span class="font-semibold text-slate-400 block mb-0.5 text-[10px]">יעד פריקה</span>
      <span class="font-medium text-slate-800 truncate block" title="${o.destination}">${o.destination}</span>
    </div>
    <div class="bg-slate-50 p-2.5 rounded-xl">
      <span class="font-semibold text-slate-400 block mb-0.5 text-[10px]">מועד אספקה</span>
      <span class="font-medium text-slate-800">${o.date} | ${o.time}</span>
    </div>
    <div class="bg-slate-50 p-2.5 rounded-xl">
      <span class="font-semibold text-slate-400 block mb-0.5 text-[10px]">נהג משובץ</span>
      <span class="font-medium text-slate-800">${o.driverId || 'טרם שובץ'}</span>
    </div>
  </div>

  <div class="bg-[#F8FAFC] p-3 rounded-xl border border-slate-100 text-[11px] text-slate-700 whitespace-pre-wrap font-mono mb-4 shadow-inner">
    <div class="font-bold text-slate-800 mb-1.5 flex items-center gap-1.5"><span class="text-sm">🛒</span> תכולת משלוח:</div>
    ${o.items || 'אין פירוט פריטים'}
  </div>

  <div class="flex gap-2 border-t border-slate-100 pt-3">
    <button class="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-2.5 rounded-xl transition-all shadow-sm active:scale-95" onclick="window.dispatchEvent(new CustomEvent('noa-action', {detail: {action: 'update-status', orderId: '${o.id}'}}))">עדכן סטטוס</button>
    <button class="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold py-2.5 rounded-xl transition-all active:scale-95" onclick="window.dispatchEvent(new CustomEvent('noa-action', {detail: {action: 'assign-driver', orderId: '${o.id}'}}))">שבץ נהג</button>
  </div>
</div>`).join('');

        const title = isSpecificSearch 
          ? `<div class="font-bold text-lg mb-4 text-slate-800 flex items-center gap-2"><span class="text-2xl">🏗️</span> המפקד, הנה ההזמנות שמצאתי:</div>` 
          : `<div class="font-bold text-lg mb-4 text-slate-800 flex items-center gap-2"><span class="text-2xl">🏗️</span> המפקד, דוח הזמנות בזמן אמת:</div>`;

        return `${title}\n<div class="flex flex-col gap-1">\n${activeOrdsFormat}\n</div>\n<div class="mt-4 pt-3 border-t border-slate-200 text-[10px] text-slate-400 font-medium text-center">\nמסונכרן מול ה-Firestore של סבן<br/><br/><span class="text-blue-500 font-bold">באדיבות נועה ❤️</span>\n</div>`;
      }

      return `<div class="bg-red-50 text-red-600 p-4 rounded-xl border border-red-100 font-medium text-sm text-center" dir="rtl">המפקד ראמי, לא מצאתי הזמנות התואמות לחיפוש שלך במערכת. 🔍<br/><br/><span class="text-red-400 font-bold text-xs">באדיבות נועה ❤️</span></div>`;
    }

    return `<div class="bg-slate-50 p-4 rounded-xl border border-slate-200 text-slate-700 text-sm font-medium" dir="rtl">המפקד, אני כאן. לא זיהיתי פקודה לחיפוש הזמנות בהודעה שלך.<br/><br/><span class="text-blue-500 font-bold text-xs">באדיבות נועה ❤️</span></div>`;
  };

  return { orders, morningReports, customers, loading, getNoaAnalysis };
}
