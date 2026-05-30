import React, { useState, useEffect } from "react";
import { collection, onSnapshot, doc, updateDoc, query, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase'; // ודא שהנתיב תואם לפרויקט שלך
import {
  Package,
  Clock,
  Truck,
  Plus,
  CheckCircle,
  AlertCircle,
  Calendar,
  MapPin,
  Building,
  Trash2,
  X,
  Search,
  Sparkles,
  RefreshCw,
  SlidersHorizontal,
  Zap,
  Navigation,
  Phone,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

// --- Interfaces ---
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
}

// --- V0 Status Config ---
const statusConfig: Record<
  string,
  { label: string; color: string; glow: string; icon: React.ReactNode }
> = {
  pending: {
    label: "ממתין",
    color: "from-amber-500/20 to-amber-600/10",
    glow: "shadow-amber-500/20",
    icon: <Clock className="w-3.5 h-3.5" />,
  },
  preparing: {
    label: "בהכנה",
    color: "from-cyan-500/20 to-cyan-600/10",
    glow: "shadow-cyan-500/20",
    icon: <Building className="w-3.5 h-3.5" />,
  },
  ready: {
    label: "מוכן",
    color: "from-purple-500/20 to-purple-600/10",
    glow: "shadow-purple-500/20",
    icon: <CheckCircle className="w-3.5 h-3.5" />,
  },
  on_the_way: {
    label: "בדרך",
    color: "from-blue-500/20 to-blue-600/10",
    glow: "shadow-blue-500/20",
    icon: <Truck className="w-3.5 h-3.5" />,
  },
  delivered: {
    label: "נמסר",
    color: "from-emerald-500/20 to-emerald-600/10",
    glow: "shadow-emerald-500/20",
    icon: <Sparkles className="w-3.5 h-3.5" />,
  },
  cancelled: {
    label: "בוטל",
    color: "from-red-500/20 to-red-600/10",
    glow: "shadow-red-500/20",
    icon: <X className="w-3.5 h-3.5" />,
  },
};

// --- V0 Metric Card Component ---
function MetricCard({
  label, value, icon, active, onClick, accentColor,
}: {
  label: string; value: number; icon: React.ReactNode; active: boolean; onClick: () => void; accentColor: string;
}) {
  const getStylesForLabel = (lbl: string) => {
    const styleMap: Record<string, React.CSSProperties & { fontFamily?: string }> = {
      "כל ההזמנות": { marginLeft: "auto" },
      "פעילות בשטח": { marginLeft: "auto" },
      "בהכנה": { marginLeft: "auto" },
      "מוכן": {
        marginLeft: "auto",
        color: "rgba(205, 235, 172, 1)",
        borderWidth: "1px",
        borderColor: "rgba(124, 206, 126, 1)",
        boxShadow: "0 0 0 0 rgba(126, 211, 33, 1)",
        textShadow: "1px 1px 3px rgba(255, 255, 255, 1)",
        display: "inline-grid",
      },
      "נמסר": {
        marginLeft: "auto",
        backgroundColor: "rgba(7, 92, 6, 1)",
        color: "rgba(255, 255, 255, 1)",
        fontFamily: "Rubik 80s Fade, display",
        textShadow: "1px 1px 3px rgba(255, 255, 255, 1)",
        display: "flex",
        boxShadow: "0 0 0 0 rgba(219, 19, 19, 0)",
        fontWeight: "600",
        borderWidth: "1px",
        borderColor: "rgba(255, 255, 255, 1)",
      },
      "חסר נהג": { marginLeft: "auto" },
    };
    return styleMap[lbl] || {};
  };

  const buttonStyles = getStylesForLabel(label);

  return (
    <motion.button
      onClick={onClick}
      whileHover={{ y: -4, scale: 1.02 }}
      whileTap={{ y: 0, scale: 0.98 }}
      style={{ ...buttonStyles, opacity: 1 }}
      className={`relative overflow-hidden rounded-2xl p-4 text-right transition-all duration-300 cursor-pointer border-0
        ${active ? `bg-gradient-to-br ${accentColor} shadow-lg ring-1 ring-white/20` : "bg-gray-100 hover:bg-gray-200 dark:bg-gray-800"}`}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
      <div className="absolute -top-1/2 -right-1/2 w-full h-full bg-gradient-to-br from-white/10 to-transparent rotate-12 pointer-events-none" />
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">{label}</span>
          <div className={`p-1.5 rounded-lg ${active ? "bg-white/20" : "bg-gray-200 dark:bg-gray-700"}`}>
            {icon}
          </div>
        </div>
        <span className="text-3xl font-black font-mono text-gray-900 dark:text-white block">{value}</span>
      </div>
    </motion.button>
  );
}

// --- V0 Order Card Component (Connected to Firebase Props) ---
function OrderCard({
  order, drivers, onUpdate,
}: {
  key?: string;
  order: Order;
  drivers: Driver[];
  onUpdate: (id: string, field: keyof Order, value: string) => any;
}) {
  const status = statusConfig[order.status] || statusConfig.pending;
  const assignedDriver = drivers.find((d) => d.id === order.driverId || d.name === order.driverId);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9, y: -10 }}
      transition={{ type: "spring", damping: 25, stiffness: 200 }}
      className="group relative"
    >
      <div className={`absolute inset-0 rounded-3xl bg-gradient-to-br ${status.color} blur-xl opacity-40 group-hover:opacity-60 transition-opacity`} />
      
      <div className={`relative overflow-hidden rounded-3xl border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900 shadow-xl ${status.glow} transition-all duration-500`}>
        <div className="h-1 w-full bg-gradient-to-r from-blue-500 via-purple-500 to-blue-500 bg-[length:200%_100%] animate-[shimmer_3s_ease-in-out_infinite]" />
        
        <div className="relative p-5">
          {/* Header */}
          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="flex-1 min-w-0">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-100 dark:bg-white/10 mb-2">
                <Zap className="w-3 h-3 text-amber-500" />
                <span className="text-[10px] font-mono font-bold text-gray-600 dark:text-gray-300">
                  #{order.orderNumber || order.id.substring(0,5)}
                </span>
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white leading-tight truncate">
                {order.customerName}
              </h3>
              <div className="flex items-center gap-2 mt-1.5 text-gray-500">
                <MapPin className="w-3.5 h-3.5 text-red-500 shrink-0" />
                <span className="text-xs truncate">{order.destination}</span>
              </div>
            </div>
          </div>

          {/* Items */}
          <div className="relative rounded-2xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 p-4 mb-4">
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-2">תכולת המשלוח</span>
            <p className="text-sm text-gray-800 dark:text-gray-200 font-mono whitespace-pre-wrap leading-relaxed max-h-24 overflow-y-auto">
              {order.items}
            </p>
          </div>

          {/* Controls Grid */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            {/* ETA */}
            <div>
              <span className="text-[9px] font-bold text-gray-500 uppercase block mb-1.5">שעת הגעה (ETA)</span>
              <div className="relative">
                <Clock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="00:00"
                  value={order.eta || ""}
                  onChange={(e) => onUpdate(order.id, 'eta', e.target.value)}
                  className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl py-2.5 pr-10 pl-3 text-sm font-mono focus:ring-2 focus:ring-blue-500 transition-all text-right"
                />
              </div>
            </div>

            {/* Driver */}
            <div>
              <span className="text-[9px] font-bold text-gray-500 uppercase block mb-1.5">נהג משובץ</span>
              <select
                value={order.driverId || ""}
                onChange={(e) => onUpdate(order.id, 'driverId', e.target.value)}
                className={`w-full rounded-xl py-2.5 px-3 text-sm font-bold border focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer ${
                  order.driverId ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-amber-50 text-amber-700 border-amber-200"
                }`}
              >
                <option value="">לא משויך</option>
                <option value="hikmat">חכמת (מנוף)</option>
                <option value="ali">עלי (משאית)</option>
                {drivers.map((drv) => (
                  <option key={drv.id} value={drv.name}>{drv.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Footer Status */}
        <div className="px-5 py-3 bg-gray-50 dark:bg-white/5 border-t border-gray-100 dark:border-white/5 flex items-center justify-between">
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r ${status.color}`}>
            {status.icon}
            <span className="text-xs font-bold text-gray-800 dark:text-white">{status.label}</span>
          </div>

          <select
            value={order.status}
            onChange={(e) => onUpdate(order.id, 'status', e.target.value)}
            className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-white/10 rounded-xl py-2 px-3 text-xs font-bold focus:ring-2 focus:ring-blue-500 cursor-pointer shadow-sm"
          >
            <option value="pending">ממתין</option>
            <option value="preparing">בהכנה</option>
            <option value="ready">מוכן</option>
            <option value="on_the_way">בדרך</option>
            <option value="delivered">נמסר</option>
            <option value="cancelled">בוטל</option>
          </select>
        </div>
      </div>
    </motion.div>
  );
}

// --- Main App Component ---
export default function OrdersBoardTab() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [activeFilter, setActiveFilter] = useState<string>("active");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [loading, setLoading] = useState(true);

  // 1. Firebase Live Sync
  useEffect(() => {
    const q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));
      setOrders(list);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // 2. Update Handler (Firebase)
  const handleUpdate = async (orderId: string, field: keyof Order, value: string) => {
    try {
      const updates: any = { [field]: value, updatedAt: new Date().toISOString() };
      if (field === 'status' || field === 'driverId') updates.eta = ''; // חוק האיפוס
      await updateDoc(doc(db, 'orders', orderId), updates);
    } catch (error) {
      console.error("שגיאה בעדכון הפריט:", error);
    }
  };

  // 3. Metrics
  const totalCount = orders.length;
  const preparingCount = orders.filter((o) => o.status === "preparing").length;
  const readyCount = orders.filter((o) => o.status === "ready").length;
  const onTheWayCount = orders.filter((o) => o.status === "on_the_way").length;
  const deliveredCount = orders.filter((o) => o.status === "delivered").length;
  const unassignedCount = orders.filter((o) => !o.driverId && o.status !== 'delivered' && o.status !== 'cancelled').length;

  // 4. Filter Logic
  const filteredOrders = orders.filter((order) => {
    const searchMatch = !searchTerm || order.customerName.includes(searchTerm) || order.orderNumber?.includes(searchTerm);
    const filterMatch = 
      activeFilter === "all" ? true :
      activeFilter === "active" ? !['delivered', 'cancelled'].includes(order.status) :
      activeFilter === "unassigned" ? !order.driverId :
      order.status === activeFilter;
    
    return searchMatch && filterMatch;
  });

  return (
    <div className="min-h-screen bg-gray-50/50 dark:bg-gray-950" dir="rtl">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-gray-200 dark:border-white/5 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl">
        <div className="container mx-auto px-4 py-5">
          <div className="flex flex-col md:flex-row justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl md:text-3xl font-black" style={{ backgroundColor: 'rgba(184, 212, 246, 1)', backgroundRepeat: 'no-repeat', backgroundPosition: 'center', backgroundSize: 'cover', color: 'rgba(189, 16, 224, 1)' }}>לוח סידור</h1>
              <p className="text-sm" style={{ fontWeight: '600', borderWidth: '1px', borderColor: 'rgba(0, 0, 0, 0.45)' }}>מחובר בזמן אמת</p>
            </div>
            <div className="relative w-full md:w-72">
              <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="חיפוש הזמנה..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-gray-100 dark:bg-gray-800 rounded-2xl py-3 pr-11 pl-4 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>

          {/* KPI Buttons */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
            <MetricCard label="כל ההזמנות" value={totalCount} icon={<Package className="w-4 h-4" />} active={activeFilter === "all"} onClick={() => setActiveFilter("all")} accentColor="from-gray-500/20 to-gray-600/10" />
            <MetricCard label="פעילות בשטח" value={totalCount - deliveredCount} icon={<Zap className="w-4 h-4" />} active={activeFilter === "active"} onClick={() => setActiveFilter("active")} accentColor="from-blue-500/20 to-purple-600/10" />
            <MetricCard label="בהכנה" value={preparingCount} icon={<Building className="w-4 h-4 text-cyan-500" />} active={activeFilter === "preparing"} onClick={() => setActiveFilter("preparing")} accentColor="from-cyan-500/20 to-cyan-600/10" />
            <MetricCard label="מוכן" value={readyCount} icon={<CheckCircle className="w-4 h-4 text-purple-500" />} active={activeFilter === "ready"} onClick={() => setActiveFilter("ready")} accentColor="from-purple-500/20 to-purple-600/10" />
            <MetricCard label="נמסר" value={deliveredCount} icon={<Sparkles className="w-4 h-4 text-emerald-500" />} active={activeFilter === "delivered"} onClick={() => setActiveFilter("delivered")} accentColor="from-emerald-500/20 to-emerald-600/10" />
            <MetricCard label="חסר נהג" value={unassignedCount} icon={<AlertCircle className="w-4 h-4 text-amber-500" />} active={activeFilter === "unassigned"} onClick={() => setActiveFilter("unassigned")} accentColor="from-amber-500/20 to-amber-600/10" />
          </div>
        </div>
      </header>

      {/* Grid */}
      <main className="container mx-auto px-4 py-8">
        {loading ? (
          <div className="text-center text-gray-500 py-20 font-bold animate-pulse">מסנכרן נתונים מהשטח...</div>
        ) : filteredOrders.length === 0 ? (
          <div className="text-center text-gray-500 py-20 font-bold">אין הזמנות תואמות לסינון. הכל נקי! 🌿</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            <AnimatePresence mode="popLayout">
              {filteredOrders.map((order) => (
                <OrderCard key={order.id} order={order} drivers={drivers} onUpdate={handleUpdate} />
              ))}
            </AnimatePresence>
          </div>
        )}
      </main>
    </div>
  );
}
