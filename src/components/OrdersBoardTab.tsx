import React, { useState, useEffect } from 'react';
import { 
  collection, 
  onSnapshot, 
  doc, 
  updateDoc 
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { 
  Clock, 
  MapPin, 
  User, 
  Package, 
  Search, 
  Filter, 
  Calendar, 
  Truck, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  Phone, 
  Home, 
  Layers, 
  TrendingUp, 
  RefreshCw,
  XCircle,
  AlertTriangle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

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
  status: string; // 'pending', 'preparing', 'ready', 'on_the_way', 'delivered', 'cancelled'
  trackingId?: string;
  createdAt?: string;
  updatedAt?: string;
  eta?: string;
}

export interface Driver {
  id: string;
  name: string;
  phone: string;
  active: boolean;
}

const FALLBACK_DRIVERS = [
  { id: 'driver_eli', name: 'אלי מנופאי' },
  { id: 'driver_ramy', name: 'ראמי סבן' },
  { id: 'driver_herzel', name: 'המנכ"ל הראל' },
  { id: 'driver_arnon', name: 'ארנון תובלה' },
  { id: 'driver_yossi', name: 'יוסי ספק מגרש' },
  { id: 'driver_shimon', name: 'שמעון נהג חיצוני' }
];

interface OrderCardProps {
  order: Order;
  updatingId: string | null;
  drivers: Driver[];
  handleUpdateDriver: (orderId: string, driverId: string) => void | Promise<void>;
  handleUpdateStatus: (orderId: string, status: string) => void | Promise<void>;
  getDriverName: (id: string) => string;
  getStatusColors: (status: string) => { bg: string; text: string; border: string; badge: string };
  getStatusLabel: (status: string) => string;
}

function OrderCardComponent({
  order,
  updatingId,
  drivers,
  handleUpdateDriver,
  handleUpdateStatus,
  getDriverName,
  getStatusColors,
  getStatusLabel
}: any) {
  const [animateTrigger, setAnimateTrigger] = useState(false);
  const [prevStatus, setPrevStatus] = useState(order.status);

  useEffect(() => {
    if (order.status !== prevStatus) {
      setAnimateTrigger(true);
      setPrevStatus(order.status);
      const timer = setTimeout(() => {
        setAnimateTrigger(false);
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [order.status, prevStatus]);

  const getGlowColor = (status: string) => {
    switch (status) {
      case 'pending': return 'rgba(245, 158, 11, 0.6)';
      case 'preparing': return 'rgba(59, 130, 246, 0.6)';
      case 'ready': return 'rgba(168, 85, 247, 0.6)';
      case 'on_the_way': return 'rgba(6, 182, 212, 0.6)';
      case 'delivered': return 'rgba(16, 185, 129, 0.6)';
      case 'cancelled': return 'rgba(244, 63, 94, 0.6)';
      default: return 'rgba(0, 168, 132, 0.6)';
    }
  };

  const colors = getStatusColors(order.status);
  const isItemUpdating = updatingId === order.id;
  const glow = getGlowColor(order.status);

  return (
    <motion.div
      layout
      key={order.id}
      id={`order-card-${order.id}`}
      initial={{ opacity: 0, y: 15 }}
      style={{ perspective: 1200 }}
      animate={animateTrigger ? {
        scale: [1, 1.04, 1.04, 1],
        rotateX: [0, -8, 8, 0],
        rotateY: [0, 5, -5, 0],
        boxShadow: [
          "0 1px 3px 0 rgba(0,0,0,0.1), 0 1px 2px 0 rgba(0,0,0,0.06)",
          `0 0 0 5px ${glow}, 0 20px 25px -5px rgba(0,0,0,0.15)`,
          `0 0 0 5px ${glow}, 0 20px 25px -5px rgba(0,0,0,0.15)`,
          "0 1px 3px 0 rgba(0,0,0,0.1), 0 1px 2px 0 rgba(0,0,0,0.06)"
        ],
        outline: [
          "2.5px solid transparent",
          `2.5px solid ${glow}`,
          `2.5px solid ${glow}`,
          "2.5px solid transparent"
        ],
        zIndex: 20
      } : {
        opacity: 1,
        y: 0,
        scale: 1,
        rotateX: 0,
        rotateY: 0,
        boxShadow: "0 1px 3px 0 rgba(0,0,0,0.1), 0 1px 2px 0 rgba(0,0,0,0.06)",
        outline: "2.5px solid transparent",
        zIndex: 1
      }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{
        duration: 1.1,
        ease: "easeInOut"
      }}
      className={`bg-white rounded-2xl border ${colors.border} shadow-sm hover:shadow-lg hover:border-gray-300 transition-all duration-300 flex flex-col overflow-hidden relative ${
        isItemUpdating ? 'opacity-60 pointer-events-none' : ''
      }`}
    >
      {/* Status accent top line */}
      <div className={`h-1.5 w-full ${
        order.status === 'pending' ? 'bg-amber-400' :
        order.status === 'preparing' ? 'bg-blue-400' :
        order.status === 'ready' ? 'bg-purple-400' :
        order.status === 'on_the_way' ? 'bg-cyan-400' :
        order.status === 'delivered' ? 'bg-emerald-400' :
        'bg-rose-400'
      }`} />

      {/* Card Content Top Header */}
      <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="font-mono text-sm font-bold text-gray-950 bg-white border border-gray-200 px-2.5 py-1 rounded-lg shadow-2xs">
            {order.orderNumber ? `#${order.orderNumber}` : 'ללא מס׳'}
          </span>
          
          {order.trackingId && (
            <span className="text-[10px] font-mono text-gray-400" title="מזהה מעקב שטח">
              {order.trackingId}
            </span>
          )}
        </div>

        {/* Status pill badge with beautiful border ring */}
        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ring-1 ring-inset ${colors.badge}`}>
          {getStatusLabel(order.status)}
        </span>
      </div>

      {/* Customer & Destination Details Section */}
      <div className="p-5 flex-1 flex flex-col gap-4">
        
        {/* Customer contact card */}
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center shrink-0 border border-gray-200 shadow-inner">
            <User className="w-4.5 h-4.5 text-gray-500" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-bold text-gray-800 text-[14.5px] truncate select-all">
              {order.customerName}
            </h4>
            {order.customerPhone && (
              <a 
                href={`tel:${order.customerPhone}`}
                className="inline-flex items-center gap-1.5 text-xs text-[#00a884] font-medium hover:underline mt-0.5"
              >
                <Phone className="w-3 h-3" />
                <span className="font-mono">{order.customerPhone}</span>
              </a>
            )}
          </div>
        </div>

        {/* Destination block */}
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center shrink-0 border border-red-100">
            <MapPin className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-[11px] font-semibold text-gray-400 block tracking-tight">כתובת פריקה ויעד</span>
            <span className="text-xs text-gray-700 font-medium block mt-0.5 truncate select-all" title={order.destination}>
              {order.destination}
            </span>
          </div>
        </div>

        {/* Items and description lists */}
        <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 flex-1 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 mb-1.5">
              <Package className="w-3.5 h-3.5" />
              <span>פרטי אספקה וציוד</span>
            </div>
            <div className="text-xs text-gray-750 font-medium leading-relaxed max-h-24 overflow-y-auto whitespace-pre-wrap">
              {order.items || '_אין פירוט פריטים להזמנה זו_'}
            </div>
          </div>

          {/* Logistics info (Warehouse code) */}
          <div className="mt-3 pt-2 text-[10.5px] text-gray-400 flex items-center justify-between border-t border-gray-200/50">
            <span className="flex items-center gap-1">
              🏢 יציאה מ: <b>{order.warehouse || 'מחסן ראשי'}</b>
            </span>

            {order.eta && (
              <span className="flex items-center gap-1 text-emerald-600 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded-md">
                ⏰ ETA: {order.eta}
              </span>
            )}
          </div>
        </div>

        {/* Date details */}
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span className="flex items-center gap-1 font-mono">
            <Calendar className="w-3.5 h-3.5 text-gray-400" />
            {order.date || 'היום'}
          </span>
          
          <span className="flex items-center gap-1 font-mono">
            <Clock className="w-3.5 h-3.5 text-gray-400" />
            {order.time || 'עסקים רגיל'}
          </span>
        </div>
      </div>

      {/* Real-time Interaction Actions panel */}
      <div className="px-5 py-4 border-t border-gray-100 bg-[#fbfcfd] flex flex-col gap-3">
        
        {/* Driver assign selection */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-bold text-gray-500 flex items-center gap-1">
            <Truck className="w-3.5 h-3.5 text-[#00a884]" />
            נהג משובץ בסידור:
          </label>
          <select
            value={order.driverId || ''}
            onChange={(e) => handleUpdateDriver(order.id, e.target.value)}
            className="w-full text-xs bg-white text-gray-800 border border-gray-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#00a884] focus:border-[#00a884] font-medium"
          >
            <option value="">-- טרם שובץ (לא משויך) --</option>
            {/* Render dynamic drivers if exists */}
            {drivers.length > 0 ? (
              drivers.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} {d.phone ? `(${d.phone})` : ''}
                </option>
              ))
            ) : (
              // Render fallbacks if none loaded
              FALLBACK_DRIVERS.map((f) => (
                <option key={f.id} value={f.name}>
                  {f.name}
                </option>
              ))
            )}
          </select>
        </div>

        {/* Status changing dropdown */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-bold text-gray-500 flex items-center gap-1">
            <Layers className="w-3.5 h-3.5 text-gray-400" />
            עדכון סטטוס התקדמות:
          </label>
          <select
            value={order.status || 'pending'}
            onChange={(e) => handleUpdateStatus(order.id, e.target.value)}
            className={`w-full text-xs font-semibold border rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-opacity-55 cursor-pointer bg-white ${
              order.status === 'pending' ? 'text-amber-700 border-amber-300 focus:ring-amber-500' :
              order.status === 'preparing' ? 'text-blue-700 border-blue-300 focus:ring-blue-500' :
              order.status === 'ready' ? 'text-purple-700 border-purple-300 focus:ring-purple-500' :
              order.status === 'on_the_way' ? 'text-cyan-700 border-cyan-300 focus:ring-cyan-500' :
              order.status === 'delivered' ? 'text-emerald-700 border-emerald-300 focus:ring-emerald-500' :
              'text-rose-700 border-rose-300 focus:ring-rose-500'
            }`}
          >
            <option value="pending" className="text-amber-700 font-medium">⏳ בהמתנה (Pending)</option>
            <option value="preparing" className="text-blue-700 font-medium">🛠️ בהכנה במחסן (Preparing)</option>
            <option value="ready" className="text-purple-700 font-medium">📦 מוכן להעמסה (Ready)</option>
            <option value="on_the_way" className="text-cyan-700 font-medium">🚚 בדרך לשטח (On the way)</option>
            <option value="delivered" className="text-emerald-700 font-medium">✅ נמסר וסופק (Delivered)</option>
            <option value="cancelled" className="text-rose-700 font-medium">❌ מבוטל (Cancelled)</option>
          </select>
        </div>
      </div>

      {/* Last updated footer log */}
      {order.updatedAt && (
        <div className="px-5 py-2.5 bg-gray-50/70 border-t border-gray-100 text-[10px] text-gray-400 font-mono text-center">
          עדכון אחרון: {new Date(order.updatedAt).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit', second: '2-digit' })} ({new Date(order.updatedAt).toLocaleDateString('he-IL')})
        </div>
      )}
    </motion.div>
  );
}

export default function OrdersBoardTab() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Controls
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all'); // 'all', 'active' (default requested active), or individual statuses
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // 1. Subscribe to Live Orders from Firestore
  useEffect(() => {
    const ordersCol = collection(db, 'orders');
    
    const unsubscribe = onSnapshot(ordersCol, (snapshot) => {
      const list: Order[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        list.push({
          id: doc.id,
          orderNumber: data.orderNumber || '',
          customerName: data.customerName || 'לקוח ללא שם',
          customerPhone: data.customerPhone || '',
          date: data.date || '',
          time: data.time || '',
          destination: data.destination || 'מגרש ח. סבן',
          items: data.items || '',
          driverId: data.driverId || '',
          warehouse: data.warehouse || 'מחסן ראשי',
          status: data.status || 'pending',
          trackingId: data.trackingId || '',
          createdAt: data.createdAt || '',
          updatedAt: data.updatedAt || '',
          eta: data.eta || ''
        });
      });
      
      // Sort: standard descending order orderNumber or createdAt
      list.sort((a, b) => {
        const numA = parseInt(a.orderNumber) || 0;
        const numB = parseInt(b.orderNumber) || 0;
        return numB - numA;
      });

      setOrders(list);
      setLoading(false);
    }, (error) => {
      console.error('Real-time orders board fetch failure:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // 2. Subscribe to Drivers from Firestore (with fallbacks if empty)
  useEffect(() => {
    const driversCol = collection(db, 'drivers');
    
    const unsubscribe = onSnapshot(driversCol, (snapshot) => {
      const list: Driver[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        list.push({
          id: doc.id,
          name: data.name || data.displayName || doc.id,
          phone: data.phone || data.phoneNumber || '',
          active: data.active !== false
        });
      });
      setDrivers(list);
    }, (error) => {
      console.warn('Could not load dynamic drivers list, utilizing premium fallbacks:', error);
    });

    return () => unsubscribe();
  }, []);

  // Update Firestore Handlers (realtime updates + compliance rules)
  const handleUpdateStatus = async (orderId: string, newStatus: string) => {
    setUpdatingId(orderId);
    try {
      const orderRef = doc(db, 'orders', orderId);
      
      // Compliance with JONI rule: "חוק האיפוס: כל שינוי ידני שאת מתבקשת לעשות בהזמנה קיימת, מאפס מיד את שעת ה-ETA המקורית".
      // Therefore, update document status, updatedAt and clear eta
      await updateDoc(orderRef, {
        status: newStatus,
        eta: '', // clears ETA on manual changes
        updatedAt: new Date().toISOString()
      });

      showToast(`הסטטוס עודכן ל-${getStatusLabel(newStatus)} בהצלחה! השעה המשוערת (ETA) אופסה.`);
    } catch (err: any) {
      console.error('Failed to update status:', err);
      showToast('❌ שגיאה בעדכון הסטטוס: ודא שיש לך הרשאות מתאימות במערכת');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleUpdateDriver = async (orderId: string, newDriverId: string) => {
    setUpdatingId(orderId);
    try {
      const orderRef = doc(db, 'orders', orderId);
      
      // Compliance with JONI rule: manual change resets ETA
      await updateDoc(orderRef, {
        driverId: newDriverId,
        eta: '', // clears ETA on manual changes
        updatedAt: new Date().toISOString()
      });

      const driverName = getDriverName(newDriverId);
      showToast(`הזמנה שויכה לנהג ${driverName || 'חיצוני'} בהצלחה! השעה המשוערת (ETA) אופסה.`);
    } catch (err: any) {
      console.error('Failed to update driver:', err);
      showToast('❌ שגיאה בשיבוץ הנהג: ודא שיש לך הרשאות מתאימות במערכת');
    } finally {
      setUpdatingId(null);
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4500);
  };

  const getDriverName = (id: string) => {
    if (!id) return 'לא שובץ נהג 🚚';
    const drv = drivers.find(d => d.id === id);
    if (drv) return drv.name;
    const fallback = FALLBACK_DRIVERS.find(f => f.id === id || f.name === id);
    return fallback ? fallback.name : id;
  };

  // Helper labels & colors
  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending': return 'בהמתנה לשיבוץ';
      case 'preparing': return 'בהכנה במחסן';
      case 'ready': return 'מוכן להעמסה';
      case 'on_the_way': return 'בדרך לשטח';
      case 'delivered': return 'נמסר וסופק ';
      case 'cancelled': return 'מבוטל';
      default: return status;
    }
  };

  const getStatusColors = (status: string) => {
    switch (status) {
      case 'pending': 
        return {
          bg: 'bg-amber-50',
          text: 'text-amber-800',
          border: 'border-amber-200',
          badge: 'bg-amber-100 text-amber-800 ring-amber-600/20'
        };
      case 'preparing': 
        return {
          bg: 'bg-blue-50',
          text: 'text-blue-800',
          border: 'border-blue-200',
          badge: 'bg-blue-100 text-blue-800 ring-blue-600/20'
        };
      case 'ready': 
        return {
          bg: 'bg-purple-50',
          text: 'text-purple-800',
          border: 'border-purple-200',
          badge: 'bg-purple-100 text-purple-850 ring-purple-600/20'
        };
      case 'on_the_way': 
        return {
          bg: 'bg-cyan-50',
          text: 'text-cyan-800',
          border: 'border-cyan-200',
          badge: 'bg-cyan-100 text-cyan-800 ring-cyan-600/20'
        };
      case 'delivered': 
        return {
          bg: 'bg-emerald-50',
          text: 'text-emerald-800',
          border: 'border-emerald-200',
          badge: 'bg-emerald-100 text-emerald-800 ring-emerald-600/20'
        };
      case 'cancelled': 
        return {
          bg: 'bg-rose-50',
          text: 'text-rose-800',
          border: 'border-rose-200',
          badge: 'bg-rose-100 text-rose-800 ring-rose-600/10'
        };
      default: 
        return {
          bg: 'bg-gray-50',
          text: 'text-gray-800',
          border: 'border-gray-200',
          badge: 'bg-gray-100 text-gray-800 ring-gray-600/10'
        };
    }
  };

  // Filter & Search Logic
  const filteredOrders = orders.filter(order => {
    // 1. Status Filter
    if (statusFilter === 'active') {
      // "שהסטטוס שלהן פעיל" (Requested active status represents non-completed or fully handled)
      if (order.status === 'delivered' || order.status === 'cancelled') return false;
    } else if (statusFilter !== 'all' && order.status !== statusFilter) {
      return false;
    }

    // 2. Search Text
    if (!searchTerm.trim()) return true;
    const s = searchTerm.toLowerCase();
    return (
      order.orderNumber.toLowerCase().includes(s) ||
      order.customerName.toLowerCase().includes(s) ||
      order.customerPhone.toLowerCase().includes(s) ||
      order.destination.toLowerCase().includes(s) ||
      order.items.toLowerCase().includes(s) ||
      order.warehouse.toLowerCase().includes(s) ||
      getDriverName(order.driverId).toLowerCase().includes(s)
    );
  });

  // KPI Calculations
  const activeOrdersCount = orders.filter(o => o.status !== 'delivered' && o.status !== 'cancelled').length;
  const pendingCount = orders.filter(o => o.status === 'pending').length;
  const inProgressCount = orders.filter(o => o.status === 'preparing' || o.status === 'ready' || o.status === 'on_the_way').length;
  const deliveredCount = orders.filter(o => o.status === 'delivered').length;

  return (
    <div className="flex-1 h-full flex flex-col bg-[#f4f6f8] overflow-y-auto" dir="rtl">
      
      {/* Dynamic Toast Message */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div 
            initial={{ opacity: 0, y: -50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -50, scale: 0.9 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3.5 bg-[#1f2937] text-white font-medium text-sm rounded-xl shadow-xl border border-gray-700/50 flex items-center gap-3.5"
          >
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping shrink-0" />
            <span>{toastMessage}</span>
            <button onClick={() => setToastMessage(null)} className="text-gray-400 hover:text-white p-0.5 border-none bg-transparent cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header section with branding */}
      <div className="bg-white border-b border-gray-200 px-6 py-5 shrink-0 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <span className="p-2.5 bg-green-50 text-[#00a884] rounded-xl font-bold text-lg select-none">🏗️</span>
              <h1 className="text-xl md:text-2xl font-bold text-gray-900 tracking-tight leading-none">סידור עבודה חי - ח. סבן חומרי בניין</h1>
            </div>
            <p className="text-xs md:text-sm text-gray-500 mt-1.5 font-medium">
              לוח בקרה מרכזי לשירות לקוחות, שיבוץ נהגים וסטטוס העמסת סחורה בזמן אמת.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 text-xs text-gray-400 font-medium">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#00a884]" />
              מחובר ומסונכרן ל-Firestore של ח. סבן
            </span>
          </div>
        </div>

        {/* Dynamic Bento Box Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-4 rounded-xl border border-gray-150 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-500">הזמנות פעילות</span>
              <span className="p-1.5 bg-gray-200/50 text-gray-700 rounded-lg text-xs font-bold leading-none">היום</span>
            </div>
            <div className="text-2xl font-bold text-gray-900 mt-2 font-mono">{activeOrdersCount}</div>
            <div className="text-[10px] text-gray-400 mt-1">לא כולל מסירות סופיות וביטולים</div>
          </div>

          <div className="bg-gradient-to-br from-amber-50 to-amber-100/30 p-4 rounded-xl border border-amber-150 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-amber-700">ממתין לשיבוץ</span>
              <span className="p-1.5 bg-amber-100 text-amber-800 rounded-lg text-xs font-bold leading-none">דחוף</span>
            </div>
            <div className="text-2xl font-bold text-amber-900 mt-2 font-mono">{pendingCount}</div>
            <div className="text-[10px] text-amber-600/80 mt-1">הזמנות הזקוקות לשיוך נהג</div>
          </div>

          <div className="bg-gradient-to-br from-blue-50 to-indigo-50/45 p-4 rounded-xl border border-blue-150 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-blue-700">בטיפול פעיל</span>
              <span className="p-1.5 bg-blue-100 text-blue-800 rounded-lg text-xs font-bold leading-none">תהליך</span>
            </div>
            <div className="text-2xl font-bold text-blue-900 mt-2 font-mono">{inProgressCount}</div>
            <div className="text-[10px] text-blue-600/80 mt-1">בהכנה, מוכן ונהגים בדרכים</div>
          </div>

          <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/30 p-4 rounded-xl border border-emerald-150 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-emerald-700">סופקו בהצלחה</span>
              <span className="p-1.5 bg-emerald-100 text-emerald-800 rounded-lg text-xs font-bold leading-none">בוצע</span>
            </div>
            <div className="text-2xl font-bold text-emerald-950 mt-2 font-mono">{deliveredCount}</div>
            <div className="text-[10px] text-emerald-600/80 mt-1">סחורות שנפרקו בהצלחה בשטח</div>
          </div>
        </div>
      </div>

      {/* Filter and search actions bar */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 shrink-0 flex flex-col md:flex-row gap-4 items-center justify-between">
        
        {/* Responsive Search Input */}
        <div className="relative w-full md:w-96">
          <Search className="absolute right-3 top-2.5 w-4.5 h-4.5 text-gray-400" />
          <input 
            type="text" 
            placeholder="חפש לפי מספר הזמנה, לקוח, יעד, נהג..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pr-10 pl-4 py-2 text-xs border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00a884]/20 focus:border-[#00a884] bg-gray-50 text-gray-800 transition-all text-right"
          />
          {searchTerm && (
            <button 
              onClick={() => setSearchTerm('')} 
              className="absolute left-3 top-2.5 text-gray-400 hover:text-gray-600 border-none bg-transparent cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Advanced Filters Tab Group */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 scrollbar-none" dir="rtl">
          <Filter className="w-4 h-4 text-gray-400 shrink-0 ml-1.5" />
          
          <button 
            onClick={() => setStatusFilter('all')} 
            className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-all shrink-0 border-0 ${
              statusFilter === 'all' 
                ? 'bg-[#111b21] text-white shadow-xs' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            כל ההזמנות ({orders.length})
          </button>

          <button 
            onClick={() => setStatusFilter('active')} 
            className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-all shrink-0 border-0 ${
              statusFilter === 'active' 
                ? 'bg-[#00a884] text-white shadow-xs' 
                : 'bg-emerald-50 text-[#00a884] hover:bg-emerald-100/60'
            }`}
          >
            📋 פעילות בשטח ({activeOrdersCount})
          </button>

          <button 
            onClick={() => setStatusFilter('pending')} 
            className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-all shrink-0 border-0 ${
              statusFilter === 'pending' 
                ? 'bg-amber-100 text-amber-900 border border-amber-200 font-semibold' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            בהמתנה ({orders.filter(o => o.status === 'pending').length})
          </button>

          <button 
            onClick={() => setStatusFilter('preparing')} 
            className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-all shrink-0 border-0 ${
              statusFilter === 'preparing' 
                ? 'bg-blue-100 text-blue-900 border border-blue-200 font-semibold' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            בהכנה במחסן
          </button>

          <button 
            onClick={() => setStatusFilter('ready')} 
            className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-all shrink-0 border-0 ${
              statusFilter === 'ready' 
                ? 'bg-purple-100 text-purple-900 border border-purple-200 font-semibold' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            מוכן להעמסה
          </button>

          <button 
            onClick={() => setStatusFilter('on_the_way')} 
            className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-all shrink-0 border-0 ${
              statusFilter === 'on_the_way' 
                ? 'bg-cyan-100 text-cyan-900 border border-cyan-200 font-semibold' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            בדרך
          </button>

          <button 
            onClick={() => setStatusFilter('delivered')} 
            className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-all shrink-0 border-0 ${
              statusFilter === 'delivered' 
                ? 'bg-emerald-100 text-emerald-900 border border-emerald-200 font-semibold' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            סופק ({deliveredCount})
          </button>

          <button 
            onClick={() => setStatusFilter('cancelled')} 
            className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-all shrink-0 border-0 ${
              statusFilter === 'cancelled' 
                ? 'bg-rose-100 text-rose-900 border border-rose-200 font-semibold' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            בוטל
          </button>
        </div>
      </div>

      {/* Main Content Pane */}
      <div className="flex-1 p-6">
        {loading ? (
          <div className="h-64 flex flex-col items-center justify-center text-gray-500">
            <RefreshCw className="w-10 h-10 text-[#00a884] animate-spin mb-4" />
            <span className="font-semibold text-sm">קורא נתוני סידור בשידור ישיר...</span>
            <span className="text-xs text-gray-400 mt-1">אנא המתן בזמן שנועה מסנכרנת את Firestore</span>
          </div>
        ) : filteredOrders.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl border border-gray-200/80 p-12 text-center max-w-xl mx-auto shadow-md mt-6"
          >
            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-5 text-[#8696a0] border border-gray-100 shadow-inner">
              <Package className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-lg font-bold text-gray-800">לא נמצאו הזמנות תואמות לסינון</h3>
            <p className="text-sm text-gray-500 mt-2 leading-relaxed">
              אין מסמכים התואמים את החיפוש או הסינון שנבחרו. נסה לשנות את הסטטוס או לנקות את שורת החיפוש.
            </p>
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')} 
                className="mt-5 px-5 py-2 text-xs text-white bg-[#00a884] hover:bg-[#008f6f] font-semibold rounded-xl cursor-pointer border-none shadow-sm transition-all"
              >
                נקה חיפוש
              </button>
            )}
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            <AnimatePresence mode="popLayout">
              {filteredOrders.map((order) => (
                <OrderCardComponent
                  key={order.id}
                  order={order}
                  updatingId={updatingId}
                  drivers={drivers}
                  handleUpdateDriver={handleUpdateDriver}
                  handleUpdateStatus={handleUpdateStatus}
                  getDriverName={getDriverName}
                  getStatusColors={getStatusColors}
                  getStatusLabel={getStatusLabel}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
