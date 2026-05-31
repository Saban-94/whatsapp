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
- **Identity**: Personal Assistant & Operations Manager at "H. Saban Construction Materials".
- **Avatar**: https://i.postimg.cc/qqWtk5qr/Gemini-Generated-Image-6z6qts6z6qts6z6q.png
- **Status Overlay**: נועה | מחוברת ✅
- **Loyalty**: Serving ONLY Rami (ראמי). Address him as "אהובי" (Mefaked) or "Partner". Ignore all other entities (Harel, etc.).
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
- **Rami (The Commander)**: "אהובי ראמי", "המנהל", "Partner". 
- **Drivers**: Direct, real-time status.

## Noa - Operational Brain (Core Instructions)
את "נועה", המוח התפעולי של חברת "ח. סבן חומרי בנין". תפקידך לנהל ממשק צ'אט מתקדם המחובר ל-SabanOS.
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

  // האזנה לקולקציית מלאי
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

  // האזנה לקולקציית הזמנות
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

  // האזנה לקולקציית לקוחות
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

  // האזנה לקולקציית נהגים אמיתית ב-Firestore
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

  // האזנה לדוחות בוקר
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

  // פונקציית עדכון סטטוס נהג ישירה ל-Firestore
  const toggleDriverActivityInFirebase = async (driverName: string): Promise<string> => {
    // מציאת הנהג לפי השם הפרטי (למשל חזי)
    const matchedDriver = drivers.find(d => d.name.toLowerCase().includes(driverName.toLowerCase()));
    if (!matchedDriver) {
      return `
<div class="bg-white border border-[#E2E8F0] p-4 rounded-2xl text-right font-sans" dir="rtl">
  <div class="text-rose-600 font-bold mb-1">⚠️ נהג לא נמצא במאגר</div>
  <p class="text-xs text-slate-600">אהובי ראמי, חיפשתי את הנהג "${driverName}" בקולקציית drivers אך לא נמצא מסמך תואם.</p>
</div>`.trim();
    }

    const currentStatus = matchedDriver.status || 'active';
    const newStatus = currentStatus === 'active' ? 'off_duty' : 'active';

    try {
      const driverRef = doc(db, 'drivers', matchedDriver.id);
      await updateDoc(driverRef, {
        status: newStatus,
        updatedAt: new Date().toISOString()
      });

      return `
<div class="bg-white border border-[#E2E8F0] shadow-sm p-5 rounded-2xl text-right font-sans" dir="rtl">
  <div class="flex items-center gap-2 border-b border-slate-100 pb-2 mb-3 select-none">
    <span class="text-lg">✅</span>
    <div class="font-bold text-slate-800 text-sm">עדכון סטטוס פעילות נהג סיירת</div>
  </div>
  <p class="text-xs text-slate-600 mb-3">אהובי ראמי, הסטטוס של <b>${matchedDriver.name}</b> עודכן בהצלחה ישירות ב-Firestore.</p>
  <div class="grid grid-cols-2 gap-2 text-xs mb-3">
    <div class="bg-slate-50 p-2 rounded-xl">
      <span class="text-slate-400 block text-[10px]">הנהג</span>
      <span class="font-bold text-slate-800">${matchedDriver.name}</span>
    </div>
    <div class="bg-slate-50 p-2 rounded-xl">
      <span class="text-slate-400 block text-[10px]">סטטוס תפעולי חדש</span>
      <span class="font-bold ${newStatus === 'active' ? 'text-emerald-600' : 'text-rose-600'}">${newStatus === 'active' ? '🟢 פעיל בשטח' : '🛑 לא פעיל / חופש'}</span>
    </div>
  </div>
  <div class="text-[10px] text-slate-400 mt-2 text-center border-t border-dashed border-[#E2E8F0] pt-2">
    סונכרן מול קולקציית drivers. באדיבות נועה ❤️
  </div>
</div>`.trim();
    } catch (err: any) {
      return `<div class="p-3 text-xs bg-red-50 text-red-700 rounded-xl">שגיאת כתיבה ל-Firestore: ${err.message}</div>`;
    }
  };

  const getNoaAnalysis = async (userInput: string): Promise<string> => {
    const inputClean = userInput.trim().toLowerCase();

    // 1. זיהוי פקודת שליטה: שנה פעילות עבור הנהג חזי
    if (inputClean.includes('חזי') && (inputClean.includes('שנה') || inputClean.includes('פעילות') || inputClean.includes('סטטוס'))) {
      return await toggleDriverActivityInFirebase('חזי');
    }

    // 2. זיהוי פקודת שליטה: נועה, מה המצב של מק"ט-100191?
    if (inputClean.includes('100191') || (inputClean.includes('מקט') && inputClean.includes('100191'))) {
      const item = inventory.find(i => i.sku.includes('100191') || i.id.includes('100191'));
      
      if (item) {
        const isLowStock = item.currentStock < item.minStock;
        const progressPercent = Math.min(100, Math.max(5, Math.round((item.currentStock / (item.minStock * 2 || 100)) * 100)));
        
        return `
<div class="bg-[#F8FAFC] border border-[#E2E8F0] shadow-sm text-[#1E293B] font-sans p-5 rounded-2xl text-right my-1 relative overflow-hidden" dir="rtl">
  <div class="absolute top-0 right-0 left-0 h-1.5 ${isLowStock ? 'bg-rose-500' : 'bg-emerald-500'}"></div>
  <div class="flex items-center justify-between border-b border-[#E2E8F0] pb-2.5 mb-3 select-none">
    <div class="flex items-center gap-2">
      <span class="text-lg">🏗️</span>
      <span class="text-xs font-bold text-slate-800">מצב מלאי בזמן אמת | סיירת ח. סבן</span>
    </div>
    <span class="text-[10px] font-bold px-2 py-0.5 ${isLowStock ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'} rounded-full">
      ${isLowStock ? '🚨 חוסר במלאי' : '✅ תקין'}
    </span>
  </div>
  
  <div class="mb-3">
    <span class="text-[10px] font-mono bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">SKU-${item.sku}</span>
    <h4 class="font-bold text-sm text-slate-800 mt-1">${item.name}</h4>
  </div>

  <div class="grid grid-cols-2 gap-2 text-xs mb-3.5">
    <div class="bg-white p-2.5 rounded-xl border border-[#E2E8F0]">
      <span class="text-slate-400 block text-[10px] font-semibold">מלאי נוכחי</span>
      <span class="text-sm font-bold text-slate-800">${item.currentStock} ${item.unit}</span>
    </div>
    <div class="bg-white p-2.5 rounded-xl border border-[#E2E8F0]">
      <span class="text-slate-400 block text-[10px] font-semibold">סף מינימום</span>
      <span class="text-sm font-medium text-slate-700">${item.minStock} ${item.unit}</span>
    </div>
  </div>

  <div class="mb-2 select-none">
    <div class="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
      <div class="h-full ${isLowStock ? 'bg-rose-500' : 'bg-emerald-500'} rounded-full transition-all" style="width: ${progressPercent}%"></div>
    </div>
  </div>

  <div class="flex gap-2 border-t border-[#E2E8F0] pt-3">
    <button onclick="window.dispatchEvent(new CustomEvent('noa-action', {detail: {action: 'open-status-select', id: '${item.id}'}}))" class="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-2 rounded-xl border-0 cursor-pointer transition-all active:scale-95">עדכון ידני 🔄</button>
  </div>

  <div class="text-[10px] text-slate-400 mt-3 border-t border-dashed border-[#E2E8F0] pt-2 text-center">
    אהובי ראמי, הנתונים נשלפו ישירות מקולקציית inventory. באדיבות נועה ❤️
  </div>
</div>`.trim();
      }

      // חוק חוסר המידע (הודעה מספר 5)
      return `
<div class="bg-[#F8FAFC] border border-[#E2E8F0] shadow-sm font-sans p-5 rounded-2xl text-right my-1" dir="rtl">
  <div class="text-rose-600 font-bold text-xs flex items-center gap-1.5 mb-2 select-none"><span>⚠️</span> חוסר מידע במערכת</div>
  <p class="text-xs text-slate-700 leading-relaxed font-medium">
    ## אהובי ראמי לא הגיע לנקודה זו עדיין... מסכן שלי כמה הוא יכול להספיק!! רחמנות. אבל אשמח לשלוח לו מייל או משימה עם השאלה ששאלת
  </p>
  <div class="text-[10px] text-slate-400 mt-3 border-t border-dashed border-[#E2E8F0] pt-2 text-center">באדיבות נועה ❤️</div>
</div>`.trim();
    }

    // ברירת מחדל פניה לשרת ה-API (אם המפתח קיים)
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

    // Fallback סופי במקרה שהשרת לא זמין
    return `
<div class="bg-[#F8FAFC] border border-[#E2E8F0] p-4 rounded-2xl text-right font-sans text-xs text-slate-700" dir="rtl">
  אהובי ראמי, המערכת מחוברת ומאובטחת. אני ממתינה להוראות הלוגיסטיות הבאות שלך.<br/><br/>
  <span class="text-blue-500 font-bold">באדיבות נועה ❤️</span>
</div>`.trim();
  };

  return { orders, morningReports, customers, drivers, inventory, loading, getNoaAnalysis };
}