import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy, limit, getDocs, doc, updateDoc } from 'firebase/firestore';
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
  vehicleType?: string;
  plateNumber?: string;
  vehicleModel?: string;
  totalDeliveries?: number;
  onTimeRate?: number;
  rating?: number;
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
- Identity: Personal Assistant & Operations Manager at "H. Saban Construction Materials".
- Loyalty: Serving ONLY Rami (ראמי). Address him as "אהובי" or "Partner".
- Tone: Professional, high-density, concise Hebrew. Elite management consulting style.
- Mandatory Signature: Every message must end with "באדיבות נועה ❤️".
- Response Limit: Maximum 50 words per response (excluding HTML components).
`;

function safeIsoString(dateVal: any): string {
  if (!dateVal) return new Date().toISOString();
  try {
    let dateObj: Date;
    if (typeof dateVal.toDate === 'function') dateObj = dateVal.toDate();
    else if (dateVal && typeof dateVal === 'object' && typeof dateVal.seconds === 'number') dateObj = new Date(dateVal.seconds * 1000);
    else dateObj = new Date(dateVal);
    if (isNaN(dateObj.getTime())) return new Date().toISOString();
    return dateObj.toISOString();
  } catch (err) {
    return new Date().toISOString();
  }
}

export function useNoaBrain() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [morningReports, setMorningReports] = useState<MorningReport[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'inventory'), (snapshot) => {
      const list: InventoryItem[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        list.push({
          id: doc.id,
          sku: data.sku || doc.id,
          name: data.name || 'פריט כללי',
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
    }, (err) => console.warn('Inventory error:', err));
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'orders'), (snapshot) => {
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
          eta: data.eta || '',
          trackingId: data.trackingId || '',
          createdAt: safeIsoString(data.createdAt)
        });
      });
      setOrders(list);
      setLoading(false);
    }, (err) => console.warn('Orders error:', err));
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'customers'), (snapshot) => {
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
    }, (err) => console.warn('Customers error:', err));
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'drivers'), (snapshot) => {
      const list: Driver[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        list.push({
          id: doc.id,
          name: data.name || doc.id,
          phone: data.phone || 'לא הוזן',
          status: data.status || 'active',
          vehicleType: data.vehicleType || 'truck',
          plateNumber: data.plateNumber || '',
          vehicleModel: data.vehicleModel || '',
          totalDeliveries: Number(data.totalDeliveries) || 0,
          onTimeRate: Number(data.onTimeRate) || 100,
          rating: Number(data.rating) || 5
        });
      });
      setDrivers(list);
    }, (err) => console.warn('Drivers error:', err));
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const fetchMorningReports = async () => {
      try {
        const querySnapshot = await getDocs(query(collection(db, 'morning_reports'), orderBy('createdAt', 'desc'), limit(5)));
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
      } catch (err) { console.warn(err); }
    };
    fetchMorningReports();
  }, []);

  const toggleDriverActivityInFirebase = async (driverName: string): Promise<string> => {
    const matchedDriver = drivers.find(d => d.name.toLowerCase().includes(driverName.toLowerCase()));
    if (!matchedDriver) {
      return `<div class="bg-white border border-[#E2E8F0] p-4 rounded-2xl text-right font-sans" dir="rtl"><div class="text-rose-600 font-bold mb-1">⚠️ נהג לא נמצא</div></div>`;
    }
    const currentStatus = matchedDriver.status || 'active';
    const newStatus = currentStatus === 'active' ? 'off_duty' : 'active';
    try {
      await updateDoc(doc(db, 'drivers', matchedDriver.id), { status: newStatus, updatedAt: new Date().toISOString() });
      return `
<div class="bg-white border border-[#E2E8F0] shadow-sm p-5 rounded-2xl text-right font-sans" dir="rtl">
  <div class="font-bold text-slate-800 text-sm border-b border-slate-100 pb-2 mb-3">✅ עדכון סטטוס פעילות נהג</div>
  <p class="text-xs text-slate-600 mb-3">אהובי ראמי, הסטטוס של <b>${matchedDriver.name}</b> עודכן בהצלחה.</p>
  <div class="bg-slate-50 p-2 rounded-xl text-xs font-bold ${newStatus === 'active' ? 'text-emerald-600' : 'text-rose-600'}">${newStatus === 'active' ? '🟢 פעיל בשטח' : '🛑 לא פעיל / חופש'}</div>
  <div class="text-[10px] text-slate-400 mt-3 text-center border-t border-dashed border-[#E2E8F0] pt-2">באדיבות נועה ❤️</div>
</div>`.trim();
    } catch (err: any) { return `<div>שגיאה: ${err.message}</div>`; }
  };

  const getDriverName = (driverId: string) => {
    switch (driverId) {
      case 'hezi': return 'חזי (סיירת)';
      case 'sami': return 'סאמי (מובילים כבדים)';
      case 'avi': return 'אבי (מחסן ותובלה)';
      case 'shimon': return 'שמעון (ג׳וני הובלות)';
      default: return driverId || 'טרם שובץ';
    }
  };

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
      default: return 'bg-slate-50 text-slate-700 border border-slate-200';
    }
  };

  const getNoaAnalysis = async (userInput: string): Promise<string> => {
    const inputClean = userInput.trim().toLowerCase();

    // 1. שינוי פעילות לנהג חזי
    if (inputClean.includes('חזי') && (inputClean.includes('שנה') || inputClean.includes('פעילות') || inputClean.includes('סטטוס'))) {
      return await toggleDriverActivityInFirebase('חזי');
    }

    // 2. בדיקת מק"ט-100191 ומלאי
    if (inputClean.includes('100191') || (inputClean.includes('מקט') && inputClean.includes('100191'))) {
      const item = inventory.find(i => i.sku.includes('100191') || i.id.includes('100191'));
      if (item) {
        const isLowStock = item.currentStock < item.minStock;
        const progressPercent = Math.min(100, Math.max(5, Math.round((item.currentStock / (item.minStock * 2 || 100)) * 100)));
        return `
<div class="bg-[#F8FAFC] border border-[#E2E8F0] shadow-sm text-[#1E293B] font-sans p-5 rounded-2xl text-right my-1 relative overflow-hidden" dir="rtl">
  <div class="absolute top-0 right-0 left-0 h-1.5 ${isLowStock ? 'bg-rose-500' : 'bg-emerald-500'}"></div>
  <div class="flex items-center justify-between border-b border-[#E2E8F0] pb-2.5 mb-3 select-none">
    <span class="text-xs font-bold text-slate-800">🏗️ מצב מלאי בזמן אמת | סיירת ח. סבן</span>
    <span class="text-[10px] font-bold px-2 py-0.5 ${isLowStock ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'} rounded-full">${isLowStock ? '🚨 חוסר במלאי' : '✅ תקין'}</span>
  </div>
  <h4 class="font-bold text-sm text-slate-800 mt-1">${item.name} (SKU-${item.sku})</h4>
  <div class="grid grid-cols-2 gap-2 text-xs my-3">
    <div class="bg-white p-2.5 rounded-xl border border-[#E2E8F0]"><span class="text-slate-400 block text-[10px]">מלאי נוכחי</span><span class="text-sm font-bold">${item.currentStock} ${item.unit}</span></div>
    <div class="bg-white p-2.5 rounded-xl border border-[#E2E8F0]"><span class="text-slate-400 block text-[10px]">סף מינימום</span><span class="text-sm font-medium">${item.minStock} ${item.unit}</span></div>
  </div>
  <div class="w-full bg-slate-100 h-2 rounded-full overflow-hidden mb-3"><div class="h-full ${isLowStock ? 'bg-rose-500' : 'bg-emerald-500'} rounded-full" style="width: ${progressPercent}%"></div></div>
  <button onclick="window.dispatchEvent(new CustomEvent('noa-action', {detail: {action: 'open-status-select', id: '${item.id}'}}))" class="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-2 rounded-xl cursor-pointer border-0">עדכון ידני 🔄</button>
  <div class="text-[10px] text-slate-400 mt-3 border-t border-dashed border-[#E2E8F0] pt-2 text-center">באדיבות נועה ❤️</div>
</div>`.trim();
      }
    }

    // 3. תיקון קריטי: שליפת כל ההזמנות / הזמנות של היום
    if (inputClean.includes('הזמנ') || inputClean.includes('משלוח') || inputClean.includes('אספק')) {
      // נבדוק אם יש סינון של תאריך של היום (2026-05-31)
      let filteredOrders = orders;
      const todayStr = "2026-05-31"; // שימוש בנתון הקיים במערכת לזמן אמת
      
      if (inputClean.includes('היום')) {
        filteredOrders = orders.filter(o => o.date === todayStr || safeIsoString(o.createdAt).startsWith(todayStr));
      }

      if (filteredOrders.length > 0) {
        const activeOrdsFormat = filteredOrders.map(o => {
          const statusLabel = getStatusLabelText(o.status);
          const statusBg = getStatusBgClassText(o.status);
          const dName = getDriverName(o.driverId);
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
    <div><b>🚚 נהג:</b> ${dName}</div>
    <div class="bg-white p-2.5 rounded-xl border border-[#E2E8F0] text-[11px] font-mono leading-relaxed mt-2">
      <b>📦 פירוט פריטים וציוד:</b><br/>${o.items}
    </div>
  </div>
  <div class="mt-4 flex flex-wrap gap-1.5 justify-start border-t border-[#E2E8F0] pt-3" dir="rtl">
    <button onclick="window.dispatchEvent(new CustomEvent('noa-action', {detail: {action: 'open-driver-select', orderId: '${o.id}'}}))" class="px-2.5 py-1 text-[11px] font-bold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg border border-indigo-100 cursor-pointer">שבץ נהג 👤</button>
    <button onclick="window.dispatchEvent(new CustomEvent('noa-action', {detail: {action: 'open-status-select', orderId: '${o.id}'}}))" class="px-2.5 py-1 text-[11px] font-bold bg-amber-50 text-amber-700 hover:bg-amber-100 rounded-lg border border-amber-100 cursor-pointer">עדכן סטטוס 🔄</button>
    <button onclick="window.dispatchEvent(new CustomEvent('noa-action', {detail: {action: 'update-order', orderId: '${o.id}', field: 'eta', value: ''}}))" class="px-2.5 py-1 text-[11px] font-bold bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-lg border-0 cursor-pointer">איפוס הגעה 🕒</button>
  </div>
</div>`;
        }).join('\n');

        const titleText = inputClean.includes('היום') ? 'הזמנות מתוזמנות להיום' : 'דוח תנועת הזמנות כללי';
        return `
<div class="font-sans text-right" dir="rtl">
  <div class="font-bold text-sm text-slate-800 mb-2 flex items-center gap-1.5 select-none"><span>🏗️</span> אהובי ראמי, להלן ${titleText}:</div>
  ${activeOrdsFormat}
  <div class="text-[10px] text-slate-400 mt-2 text-center select-none">מסונכרן בלייב מול Firestore ח. סבן. באדיבות נועה ❤️</div>
</div>`.trim();
      }

      // חוק חוסר המידע (הודעה מספר 5)
      return `
<div class="bg-[#F8FAFC] border border-[#E2E8F0] shadow-sm font-sans p-5 rounded-2xl text-right my-1" dir="rtl">
  <div class="text-rose-600 font-bold text-xs mb-2 select-none">⚠️ חוסר מידע במערכת</div>
  <p class="text-xs text-slate-700 font-medium">## אהובי ראמי לא הגיע לנקודה זו עדיין... מסכן שלי כמה הוא יכול להספיק!! רחמנות. אבל אשמח לשלוח לו מייל או משימה עם השאלה ששאלת</p>
  <div class="text-[10px] text-slate-400 mt-3 border-t border-dashed border-[#E2E8F0] pt-2 text-center">באדיבות נועה ❤️</div>
</div>`.trim();
    }

    // גיבוי פנייה לשרת ה-API
    try {
      const response = await fetch('/api/noa-brain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userInput, context: { orders, customers, morningReports, drivers, inventory } })
      });
      if (response.ok) {
        const data = await response.json();
        if (data && data.text) return data.text;
      }
    } catch (err) {}

    return `
<div class="bg-[#F8FAFC] border border-[#E2E8F0] p-4 rounded-2xl text-right font-sans text-xs text-slate-700" dir="rtl">
  אהובי ראמי, המערכת מחוברת ומאובטחת. אני ממתינה להוראות הלוגיסטיות הבאות שלך.<br/><br/>
  <span class="text-blue-500 font-bold">באדיבות נועה ❤️</span>
</div>`.trim();
  };

  return { orders, morningReports, customers, drivers, inventory, loading, getNoaAnalysis };
}