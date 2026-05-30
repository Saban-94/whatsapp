import React, { useState, useEffect } from 'react';
import { 
  collection, 
  onSnapshot, 
  doc, 
  updateDoc, 
  addDoc,
  deleteDoc,
  query,
  orderBy
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { 
  Package, 
  Clock, 
  Truck, 
  User, 
  Plus, 
  CheckCircle, 
  AlertCircle, 
  Filter, 
  Calendar, 
  MapPin, 
  Building,
  Trash2,
  X,
  Search,
  Sparkles,
  RefreshCw,
  TrendingUp,
  SlidersHorizontal
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Interfaces matching firebase-blueprint.json and App state
interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  customerPhone?: string;
  date: string;
  time: string;
  destination: string;
  items: string;
  driverId: string;
  warehouse: 'החרש' | 'התלמיד' | string;
  status: 'pending' | 'preparing' | 'ready' | 'on_the_way' | 'delivered' | 'cancelled' | string;
  eta?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface Driver {
  id: string;
  name: string;
  phone?: string;
  vehicleType?: 'truck' | 'crane' | string;
  status?: 'active' | 'off_duty' | string;
}

export default function OrdersBoardTab() {
  const [liveOrders, setLiveOrders] = useState<Order[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  
  // Create order modal state
  const [isNewOrderModalOpen, setIsNewOrderModalOpen] = useState(false);
  const [newOrder, setNewOrder] = useState<Partial<Order>>({
    orderNumber: '',
    customerName: '',
    date: new Date().toISOString().split('T')[0],
    time: new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit', hour12: false }),
    destination: '',
    items: '',
    driverId: '',
    warehouse: 'החרש',
    status: 'pending',
    eta: ''
  });
  
  const [formError, setFormError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // 1. Live read of Orders from Firestore
  useEffect(() => {
    const ordersCol = collection(db, 'orders');
    const q = query(ordersCol, orderBy('date', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
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
          warehouse: data.warehouse || 'החרש',
          status: data.status || 'pending',
          eta: data.eta || '',
          createdAt: data.createdAt || '',
          updatedAt: data.updatedAt || ''
        });
      });
      setLiveOrders(list);
      setLoading(false);
    }, (err) => {
      console.error('Failed to read live orders:', err);
      handleFirestoreError(err, OperationType.LIST, 'orders');
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // 2. Live read of Drivers from Firestore
  useEffect(() => {
    const driversCol = collection(db, 'drivers');
    
    const unsubscribe = onSnapshot(driversCol, (snapshot) => {
      const list: Driver[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        list.push({
          id: doc.id,
          name: data.name || '',
          phone: data.phone || '',
          vehicleType: data.vehicleType || 'truck',
          status: data.status || 'active'
        });
      });
      // Fallback standard drivers list if Firestore is empty
      if (list.length === 0) {
        setDrivers([
          { id: 'drv_1', name: 'ראמי סבן', phone: '052-1111111' },
          { id: 'drv_2', name: 'אמיר ח\'ורי', phone: '054-2222222' },
          { id: 'drv_3', name: 'יוסף סבאח', phone: '050-3333333' },
          { id: 'drv_4', name: 'אלי קדוש', phone: '053-4444444' }
        ]);
      } else {
        setDrivers(list);
      }
    }, (err) => {
      console.warn('Drivers query error, using fallback drivers:', err);
      setDrivers([
        { id: 'drv_1', name: 'ראמי סבן', phone: '052-1111111' },
        { id: 'drv_2', name: 'אמיר ח\'ורי', phone: '054-2222222' },
        { id: 'drv_3', name: 'יוסף סבאח', phone: '050-3333333' },
        { id: 'drv_4', name: 'אלי קדוש', phone: '053-4444444' }
      ]);
    });

    return () => unsubscribe();
  }, []);

  // 3. Update Order Driver and Status in Firestore
  const handleUpdateOrderStatus = async (orderId: string, itemStatus: string) => {
    setActionLoading(orderId + '-status');
    try {
      const docRef = doc(db, 'orders', orderId);
      await updateDoc(docRef, {
        status: itemStatus,
        updatedAt: new Date().toISOString()
      });
    } catch (err: any) {
      console.error('Failed to update order status:', err);
      // Suppress alert in UI context, let user know cleanly
      alert(`שגיאת עדכון סטטוס: ${err.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleUpdateOrderDriver = async (orderId: string, selectedDriverId: string) => {
    setActionLoading(orderId + '-driver');
    try {
      const docRef = doc(db, 'orders', orderId);
      await updateDoc(docRef, {
        driverId: selectedDriverId,
        updatedAt: new Date().toISOString()
      });
    } catch (err: any) {
      console.error('Failed to update order driver:', err);
      alert(`שגיאת עדכון נהג: ${err.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleUpdateOrderEta = async (orderId: string, etaValue: string) => {
    setActionLoading(orderId + '-eta');
    try {
      const docRef = doc(db, 'orders', orderId);
      await updateDoc(docRef, {
        eta: etaValue,
        updatedAt: new Date().toISOString()
      });
    } catch (err: any) {
      console.error('Failed to update order ETA:', err);
    } finally {
      setActionLoading(null);
    }
  };

  // 4. Create New Order in Firestore
  const handleCreateOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    
    // Validation
    if (!newOrder.customerName?.trim()) {
      setFormError('שם הלקוח הוא שדה חובה');
      return;
    }
    if (!newOrder.orderNumber?.trim()) {
      setFormError('מספר הזמנה (נתור) הוא שדה חובה');
      return;
    }
    if (!newOrder.destination?.trim()) {
      setFormError('יעד/כתובת הוא שדה חובה');
      return;
    }
    if (!newOrder.items?.trim()) {
      setFormError('תכולת ההזמנה היא שדה חובה');
      return;
    }

    try {
      const payload: Omit<Order, 'id'> = {
        orderNumber: newOrder.orderNumber.trim(),
        customerName: newOrder.customerName.trim(),
        date: newOrder.date || '',
        time: newOrder.time || '',
        destination: newOrder.destination.trim(),
        items: newOrder.items.trim(),
        driverId: newOrder.driverId || '',
        warehouse: newOrder.warehouse || 'החרש',
        status: newOrder.status || 'pending',
        eta: newOrder.eta || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await addDoc(collection(db, 'orders'), payload);
      
      // Send JONI Outbox notification message about the new order as Noa!
      if (payload.driverId) {
        const assignedDriver = drivers.find(d => d.id === payload.driverId || d.name === payload.driverId);
        const phoneToNotify = assignedDriver?.phone || '';
        if (phoneToNotify) {
          const sanitizedPhone = phoneToNotify.replace(/[^\d+]/g, '');
          if (sanitizedPhone) {
            await addDoc(collection(db, 'joni_outbox'), {
              phoneNumber: sanitizedPhone,
              text: `🔔 שלום, כאן נועה מח. סבן.\nשובצה עבורך הזמנה חדשה #${payload.orderNumber} לקוח: *${payload.customerName}*.\n📍 יעד: ${payload.destination}\n🏢 יציאה מ: ${payload.warehouse}\n⏰ שעה: ${payload.time} | תאריך: ${payload.date}\nסע בזהירות!`,
              mediaType: 'text',
              timestamp: new Date().toISOString(),
              source: 'Saban Air Logistics PWA',
              status: 'pending_joni'
            });
          }
        }
      }

      setIsNewOrderModalOpen(false);
      // Reset form
      setNewOrder({
        orderNumber: '',
        customerName: '',
        date: new Date().toISOString().split('T')[0],
        time: new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit', hour12: false }),
        destination: '',
        items: '',
        driverId: '',
        warehouse: 'החרש',
        status: 'pending',
        eta: ''
      });
    } catch (err: any) {
      console.error('Failed to save order to Firestore:', err);
      setFormError(`שגיאת שמירה: ${err.message}`);
    }
  };

  // Delete Order
  const handleDeleteOrder = async (orderId: string) => {
    if (!window.confirm('האם את בטוחה שברצונך למחוק הזמנה זו מהמאגר הלוגיסטי המרכזי?')) return;
    try {
      await deleteDoc(doc(db, 'orders', orderId));
    } catch (err: any) {
      alert(`מחיקה נכשלה: ${err.message}`);
    }
  };

  // Safe soft filtering calculations
  const totalCount = liveOrders.length;
  const preparingCount = liveOrders.filter(o => o.status === 'preparing').length;
  const readyCount = liveOrders.filter(o => o.status === 'ready').length;
  const deliveryCount = liveOrders.filter(o => o.status === 'on_the_way').length;
  const completedCount = liveOrders.filter(o => o.status === 'delivered').length;
  const unassignedCount = liveOrders.filter(o => !o.driverId).length;

  // Filter orders listing based on search + active filter
  const searchedOrders = liveOrders.filter(order => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      (order.customerName || '').toLowerCase().includes(term) ||
      (order.orderNumber || '').toLowerCase().includes(term) ||
      (order.destination || '').toLowerCase().includes(term) ||
      (order.items || '').toLowerCase().includes(term)
    );
  });

  // Apply CRITICAL "soft" filter logic as requested
  const filteredOrders = searchedOrders.filter(order => 
    activeFilter === 'all' || 
    order.status === activeFilter || 
    (activeFilter === 'unassigned' && !order.driverId)
  );

  // Status mapping for Hebrew text, styling properties
  const statusConfig: Record<string, { label: string; color: string; border: string; bg: string; text: string }> = {
    pending: { label: 'ממתין', color: '#FFB020', border: 'border-amber-200', bg: 'bg-amber-50/60', text: 'text-amber-800' },
    preparing: { label: 'בהכנה במחסן', color: '#14B8A6', border: 'border-teal-200', bg: 'bg-teal-50/60', text: 'text-teal-800' },
    ready: { label: 'מוכן להעמסה', color: '#3B82F6', border: 'border-blue-200', bg: 'bg-blue-50/60', text: 'text-blue-800' },
    on_the_way: { label: 'יצא לדרך 🚚', color: '#8B5CF6', border: 'border-purple-200', bg: 'bg-purple-50/60', text: 'text-purple-800' },
    delivered: { label: 'נמסר בהצלחה', color: '#10B981', border: 'border-green-200', bg: 'bg-green-50/60', text: 'text-green-800' },
    cancelled: { label: 'מבוטל', color: '#EF4444', border: 'border-red-200', bg: 'bg-red-50/60', text: 'text-red-800' }
  };

  const getStatusStyle = (status: string) => {
    return statusConfig[status] || { label: status, color: '#6B7280', border: 'border-gray-200', bg: 'bg-gray-50/60', text: 'text-gray-800' };
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#F4F6F8]" dir="rtl">
      
      {/* 1. Header Filter Controls and Stats Panel */}
      <div className="p-5 md:p-6 bg-white border-b border-gray-200 select-none shrink-0 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5">
          <div className="text-right">
            <span className="text-[10px] font-bold text-[#007AFF] uppercase tracking-wider block mb-1">
              שירותי תובלה ולוגיסטיקה - ח. סבן בע"מ
            </span>
            <h3 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
              <Package className="w-5 h-5 text-[#007AFF]" />
              מערכת בקרה ומעקב הזמנות בזמן אמת לנהגים ולקוחות
            </h3>
          </div>
          
          <div className="flex items-center gap-2.5">
            {/* Quick search input */}
            <div className="relative w-full sm:w-64">
              <Search className="absolute right-3 top-2.5 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="חיפוש הזמנות, לקוח, תכולה..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-50 pr-9 pl-3 py-2 rounded-xl text-xs border border-slate-200 focus:outline-none focus:ring-1 focus:ring-[#007AFF] focus:bg-white transition-all text-right"
              />
            </div>
            
            {/* Create new order trigger */}
            <button
              onClick={() => setIsNewOrderModalOpen(true)}
              className="px-4 py-2 bg-[#007AFF] hover:bg-[#005ecb] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-md shadow-[#007AFF]/10 active:scale-95 transition-transform"
            >
              <Plus className="w-4 h-4" />
              <span>הזמנה חדשה</span>
            </button>
          </div>
        </div>

        {/* 3D Smart Metrics Cards / Buttons Grid as requested by customer */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5 mt-2">
          
          {/* Card 1: All Orders */}
          <div
            onClick={() => setActiveFilter('all')}
            className={`cursor-pointer transition-all duration-200 transform rounded-xl p-3.5 border text-right flex flex-col justify-between ${
              activeFilter === 'all'
                ? 'bg-slate-900 border-slate-900 text-white shadow-lg translate-y-[-2px] ring-2 ring-slate-900/10'
                : 'bg-white border-slate-200 text-slate-700 hover:-translate-y-1 hover:shadow-md active:translate-y-1 active:shadow-inner'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold block opacity-80 uppercase font-mono">כלל ההזמנות</span>
              <Package className={`w-4 h-4 ${activeFilter === 'all' ? 'text-[#007AFF]' : 'text-slate-400'}`} />
            </div>
            <div className="mt-2.5">
              <span className="text-2xl font-extrabold font-mono block tracking-tight">{totalCount}</span>
              <span className="text-[9px] block opacity-70 mt-0.5">סנכרון מלא מול Firestore</span>
            </div>
          </div>

          {/* Card 2: Preparing */}
          <div
            onClick={() => setActiveFilter('preparing')}
            className={`cursor-pointer transition-all duration-200 transform rounded-xl p-3.5 border text-right flex flex-col justify-between ${
              activeFilter === 'preparing'
                ? 'bg-teal-600 border-teal-600 text-white shadow-lg translate-y-[-2px]'
                : 'bg-white border-slate-200 text-teal-900 hover:-translate-y-1 hover:shadow-md active:translate-y-1 active:shadow-inner'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold block opacity-80 uppercase">בהכנה במחסן</span>
              <Building className="w-4 h-4 opacity-70" />
            </div>
            <div className="mt-2.5">
              <span className="text-2xl font-extrabold font-mono block tracking-tight">{preparingCount}</span>
              <span className="text-[9px] block opacity-70 mt-0.5">פריטים נארזים ליד שילוח</span>
            </div>
          </div>

          {/* Card 3: Ready */}
          <div
            onClick={() => setActiveFilter('ready')}
            className={`cursor-pointer transition-all duration-200 transform rounded-xl p-3.5 border text-right flex flex-col justify-between ${
              activeFilter === 'ready'
                ? 'bg-blue-600 border-blue-600 text-white shadow-lg translate-y-[-2px]'
                : 'bg-white border-slate-200 text-blue-900 hover:-translate-y-1 hover:shadow-md active:translate-y-1 active:shadow-inner'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold block opacity-80 uppercase">מוכן להעמסה</span>
              <CheckCircle className="w-4 h-4 opacity-70" />
            </div>
            <div className="mt-2.5">
              <span className="text-2xl font-extrabold font-mono block tracking-tight">{readyCount}</span>
              <span className="text-[9px] block opacity-70 mt-0.5">ממתין למנוף / משאית שטח</span>
            </div>
          </div>

          {/* Card 4: On The Way */}
          <div
            onClick={() => setActiveFilter('on_the_way')}
            className={`cursor-pointer transition-all duration-200 transform rounded-xl p-3.5 border text-right flex flex-col justify-between ${
              activeFilter === 'on_the_way'
                ? 'bg-purple-600 border-purple-600 text-white shadow-lg translate-y-[-2px]'
                : 'bg-white border-slate-200 text-purple-900 hover:-translate-y-1 hover:shadow-md active:translate-y-1 active:shadow-inner'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold block opacity-80 uppercase">בדרך ללקוח</span>
              <Truck className="w-4 h-4 opacity-70" />
            </div>
            <div className="mt-2.5">
              <span className="text-2xl font-extrabold font-mono block tracking-tight">{deliveryCount}</span>
              <span className="text-[9px] block opacity-70 mt-0.5">נהגים פעילים בשליחות שטח</span>
            </div>
          </div>

          {/* Card 5: Delivered */}
          <div
            onClick={() => setActiveFilter('delivered')}
            className={`cursor-pointer transition-all duration-200 transform rounded-xl p-3.5 border text-right flex flex-col justify-between ${
              activeFilter === 'delivered'
                ? 'bg-green-600 border-green-600 text-white shadow-lg translate-y-[-2px]'
                : 'bg-white border-slate-200 text-green-900 hover:-translate-y-1 hover:shadow-md active:translate-y-1 active:shadow-inner'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold block opacity-80 uppercase">נמסר בהצלחה</span>
              <Sparkles className="w-4 h-4 opacity-70" />
            </div>
            <div className="mt-2.5">
              <span className="text-2xl font-extrabold font-mono block tracking-tight">{completedCount}</span>
              <span className="text-[9px] block opacity-70 mt-0.5">חתום וסגור הבוקר</span>
            </div>
          </div>

          {/* Card 6: Unassigned */}
          <div
            onClick={() => setActiveFilter('unassigned')}
            className={`cursor-pointer transition-all duration-200 transform rounded-xl p-3.5 border text-right flex flex-col justify-between ${
              activeFilter === 'unassigned'
                ? 'bg-amber-600 border-amber-600 text-white shadow-lg translate-y-[-2px]'
                : 'bg-white border-slate-200 text-amber-900 hover:-translate-y-1 hover:shadow-md active:translate-y-1 active:shadow-inner'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold block opacity-80 uppercase">הזמנות ללא נהג</span>
              <AlertCircle className="w-4 h-4 opacity-70 text-amber-500 animate-pulse" />
            </div>
            <div className="mt-2.5">
              <span className="text-2xl font-extrabold font-mono block text-[#FFB020] tracking-tight">{unassignedCount}</span>
              <span className="text-[9px] block opacity-70 mt-0.5 text-amber-600 font-semibold">דרוש שיוך נהג מיידי</span>
            </div>
          </div>

        </div>
      </div>

      {/* 2. Scrollable Body containing the Gorgeous Order Cards */}
      <div className="flex-1 overflow-y-auto p-5 md:p-6 lg:p-8">
        
        {loading ? (
          <div className="flex flex-col items-center justify-center p-32 text-center text-slate-500 bg-white rounded-3xl border border-slate-100">
            <RefreshCw className="w-10 h-10 text-[#007AFF] animate-spin mb-4" />
            <h4 className="text-sm font-bold text-slate-900">טוען הזמנות מהמאגר...</h4>
            <p className="text-xs text-slate-400 mt-1">נועה עורכת את המידע ומחברת את Firestore לפקודות שטח</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-20 text-center bg-white rounded-3xl border border-slate-150 shadow-xs max-w-xl mx-auto mt-10">
            <Package className="w-12 h-12 text-slate-300 mb-3" />
            <span className="text-sm font-extrabold text-slate-950">אין הזמנות תואמות לחיפוש או לסינון זה</span>
            <p className="text-xs text-slate-500 mt-2 max-w-sm">
              תוכלי לשנות את פילטר הבקרה למצב <b>"כלל ההזמנות"</b> או ליצור הזמנה לוגיסטית חדשה ישירות למערכת בעזרת כפתור "הזמנה חדשה" למעלה.
            </p>
            <button
              onClick={() => { setActiveFilter('all'); setSearchTerm(''); }}
              className="mt-4 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-colors cursor-pointer border-0"
            >
              אפס סינונים
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence mode="popLayout">
              {filteredOrders.map((order) => {
                const statusInfo = getStatusStyle(order.status);
                const assignedDriver = drivers.find(d => d.id === order.driverId || d.name === order.driverId);
                
                return (
                  <motion.div
                    key={order.id}
                    layout
                    initial={{ opacity: 0, scale: 0.96, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -10 }}
                    transition={{ type: 'spring', damping: 22, stiffness: 220 }}
                    className={`bg-white/95 backdrop-blur-md rounded-2xl border ${statusInfo.border} shadow-sm hover:shadow-md transition-all flex flex-col justify-between overflow-hidden text-right relative group`}
                  >
                    
                    {/* Status Top Strip Glow Accent */}
                    <div className="h-1.5 w-full" style={{ backgroundColor: statusInfo.color }} />

                    {/* Card Content (Fluid padding) */}
                    <div className="p-4 md:p-5 flex-1 flex flex-col justify-between gap-4">
                      
                      {/* Section 1: Customer Info and Action Button */}
                      <div>
                        <div className="flex items-start justify-between gap-2.5 mb-1.5">
                          <div className="min-w-0">
                            <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-mono select-none block w-max uppercase mb-1">
                              מס' נתור: #{order.orderNumber}
                            </span>
                            <h4 className="text-base font-extrabold text-slate-900 leading-snug truncate">
                              {order.customerName}
                            </h4>
                          </div>
                          
                          {/* Quick delete for offices */}
                          <button
                            onClick={() => handleDeleteOrder(order.id)}
                            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all cursor-pointer border-0 bg-transparent"
                            title="מחק הזמנה במאגר"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Customer Address or Delivery Destination */}
                        <div className="text-xs text-slate-500 flex items-center gap-1.5 leading-snug mt-1 border-b border-dashed border-slate-100 pb-3">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">{order.destination}</span>
                        </div>
                      </div>

                      {/* Section 2: Items Details List (Spacious & Legible) */}
                      <div className="bg-slate-50/70 p-3 rounded-xl border border-slate-100/50">
                        <span className="text-[10px] text-slate-400 block font-medium mb-1 select-none">תכולת שילוח:</span>
                        <p className="text-xs font-semibold text-slate-800 leading-relaxed font-mono whitespace-pre-wrap">
                          {order.items}
                        </p>
                      </div>

                      {/* Section 3: Distribution / Driver Assignment */}
                      <div className="flex flex-col gap-2 border-t border-slate-100 pt-3 select-none">
                        
                        <div className="grid grid-cols-2 gap-3">
                          
                          {/* Date and Time Details */}
                          <div>
                            <span className="text-[10px] text-slate-400 block mb-0.5">זמן הגעה מבוקש:</span>
                            <div className="flex items-center gap-1.5 text-xs text-slate-700 font-mono">
                              <Calendar className="w-3.5 h-3.5 text-slate-400" />
                              <span>{order.date} | {order.time}</span>
                            </div>
                          </div>

                          {/* Warehouse Facility Destination */}
                          <div>
                            <span className="text-[10px] text-slate-400 block mb-0.5">מקום יציאה/מחסן:</span>
                            <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded-md block w-max">
                              {order.warehouse}
                            </span>
                          </div>

                        </div>

                        {/* ETA Setting block */}
                        <div className="mt-1 flex items-center gap-2">
                          <div className="w-1/2">
                            <span className="text-[10px] text-slate-400 block mb-0.5">שעת הגעה בפועל/ETA:</span>
                            <div className="flex items-center gap-1 relative">
                              <Clock className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-2" />
                              <input
                                type="text"
                                placeholder="למשל 11:30"
                                value={order.eta || ''}
                                onChange={(e) => handleUpdateOrderEta(order.id, e.target.value)}
                                className="w-full text-xs font-mono font-bold bg-slate-50 border border-slate-200 text-slate-800 rounded-lg py-1.5 pr-7 pl-2 focus:outline-none focus:ring-1 focus:ring-[#007AFF] focus:bg-white text-right"
                              />
                            </div>
                          </div>
                          
                          {/* Assigned Carrier */}
                          <div className="w-1/2">
                            <span className="text-[10px] text-slate-400 block mb-0.5">שיבוץ נהג תובלה:</span>
                            <div className="relative">
                              <select
                                value={order.driverId || ''}
                                onChange={(e) => handleUpdateOrderDriver(order.id, e.target.value)}
                                className={`w-full text-xs font-bold border rounded-lg p-1.5 pr-2 pl-6 focus:outline-none focus:ring-1 focus:ring-[#007AFF] appearance-none text-right cursor-pointer ${
                                  order.driverId 
                                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                                    : 'bg-amber-50/50 border-amber-200 text-amber-800 font-semibold'
                                }`}
                              >
                                <option value="">⚠️ לא משויך נהג</option>
                                {drivers.map((drv) => (
                                  <option key={drv.id} value={drv.name}>
                                    🚚 {drv.name}
                                  </option>
                                ))}
                              </select>
                              <div className="pointer-events-none absolute left-2.5 top-2.5 flex items-center text-slate-500">
                                <Truck className="w-3 h-3" />
                              </div>
                            </div>
                          </div>

                        </div>

                      </div>

                    </div>

                    {/* Card Status & Action Bottom Control Bar */}
                    <div className="bg-slate-50 px-4 py-3 border-t border-slate-100 flex items-center justify-between gap-3 select-none">
                      <div className="flex items-center gap-1.5 text-right">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shadow-2xs ${statusInfo.border} ${statusInfo.bg} ${statusInfo.text}`}>
                          {statusInfo.label}
                        </span>
                        {actionLoading === order.id + '-status' && (
                          <RefreshCw className="w-3 h-3 text-[#007AFF] animate-spin" />
                        )}
                      </div>

                      {/* Interactive wide touch-friendly select dropdown */}
                      <div className="relative w-44">
                        <select
                          value={order.status}
                          disabled={actionLoading !== null}
                          onChange={(e) => handleUpdateOrderStatus(order.id, e.target.value)}
                          className="w-full text-[11px] font-bold bg-white border border-slate-200 text-slate-700 rounded-lg py-1 px-3 pr-2 pl-6 focus:outline-none focus:ring-1 focus:ring-[#007AFF] cursor-pointer text-right appearance-none"
                        >
                          <option value="pending">⏳ ממתין לתור</option>
                          <option value="preparing">⚙️ בהכנה במחסן</option>
                          <option value="ready">📦 מוכן להעמסה</option>
                          <option value="on_the_way">🚚 יצא לדרך / בנסיעה</option>
                          <option value="delivered">✅ נמסר בהצלחה</option>
                          <option value="cancelled">❌ מבוטל</option>
                        </select>
                        <div className="pointer-events-none absolute left-2 top-2 flex items-center text-slate-400">
                          <SlidersHorizontal className="w-3 h-3" />
                        </div>
                      </div>
                    </div>

                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}

      </div>

      {/* 3. POPUP MODAL: Create New Order */}
      <AnimatePresence>
        {isNewOrderModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm select-none" dir="rtl">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl border border-slate-100 w-full max-w-lg overflow-hidden flex flex-col text-right text-slate-850"
            >
              
              {/* Modal Top Banner inside */}
              <div className="bg-[#007AFF] text-white px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Package className="w-5 h-5 animate-pulse" />
                  <div>
                    <h3 className="text-sm font-bold">הקמת הודעת משלוח להזמנה לוגיסטית חדשה</h3>
                    <p className="text-[10px] text-white/80 mt-0.5">הזנה ישירה לקולקציית active orders ומסוף JONI PWA</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsNewOrderModalOpen(false)}
                  className="p-1 hover:bg-white/10 rounded-lg transition-colors cursor-pointer text-white border-0 bg-transparent"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Form Content */}
              <form onSubmit={handleCreateOrderSubmit} className="p-6 flex flex-col gap-4 overflow-y-auto max-h-[75vh]">
                
                {formError && (
                  <div className="p-3 bg-red-50 border border-red-100 text-red-700 rounded-xl text-xs font-semibold flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">מספר הזמנה (מס׳ נתור) *</label>
                    <input
                      type="text"
                      placeholder="קוד הזמנה, למשל: 94827"
                      value={newOrder.orderNumber}
                      onChange={(e) => setNewOrder({ ...newOrder, orderNumber: e.target.value })}
                      required
                      className="w-full bg-slate-50 border border-slate-200 text-xs rounded-xl p-2.5 focus:outline-none focus:ring-1 focus:ring-[#007AFF] focus:bg-white text-right"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">שם הלקוח / יעד *</label>
                    <input
                      type="text"
                      placeholder="למשל: סלטי שמיר בעמ"
                      value={newOrder.customerName}
                      onChange={(e) => setNewOrder({ ...newOrder, customerName: e.target.value })}
                      required
                      className="w-full bg-slate-50 border border-slate-200 text-xs rounded-xl p-2.5 focus:outline-none focus:ring-1 focus:ring-[#007AFF] focus:bg-white text-right"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">כתובת יעד למשלוח *</label>
                  <input
                    type="text"
                    placeholder="למשל: רחוב החרש 12, אשקלון"
                    value={newOrder.destination}
                    onChange={(e) => setNewOrder({ ...newOrder, destination: e.target.value })}
                    required
                    className="w-full bg-slate-50 border border-slate-200 text-xs rounded-xl p-2.5 focus:outline-none focus:ring-1 focus:ring-[#007AFF] focus:bg-white text-right"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">תכולת שילוח מפורטת (פריטים וכמויות) *</label>
                  <textarea
                    rows={3}
                    placeholder="הקלדי פריטים, למשל:&#10;50 משטחי פוליסטירן&#10;12 קופסאות ברגים ענקיים"
                    value={newOrder.items}
                    onChange={(e) => setNewOrder({ ...newOrder, items: e.target.value })}
                    required
                    className="w-full bg-slate-50 border border-slate-200 text-xs rounded-xl p-2.5 focus:outline-none focus:ring-1 focus:ring-[#007AFF] focus:bg-white resize-none text-right font-mono"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">תאריך יעד</label>
                    <input
                      type="date"
                      value={newOrder.date}
                      onChange={(e) => setNewOrder({ ...newOrder, date: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 text-xs rounded-xl p-2.5 focus:outline-none focus:ring-1 focus:ring-[#007AFF] focus:bg-white text-center font-mono"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">שעת הגעה משוערת</label>
                    <input
                      type="text"
                      placeholder="שעה, למשל: 08:30"
                      value={newOrder.time}
                      onChange={(e) => setNewOrder({ ...newOrder, time: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 text-xs rounded-xl p-2.5 focus:outline-none focus:ring-1 focus:ring-[#007AFF] focus:bg-white text-center font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">אתר מחסן אספקה</label>
                    <select
                      value={newOrder.warehouse}
                      onChange={(e) => setNewOrder({ ...newOrder, warehouse: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 text-xs rounded-xl p-2.5 focus:outline-none focus:ring-1 focus:ring-[#007AFF] text-right"
                    >
                      <option value="החרש">החרש (ראשי)</option>
                      <option value="התלמיד">התלמיד (אתר מזרח)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">שיבוץ נהג התחלתי</label>
                    <select
                      value={newOrder.driverId}
                      onChange={(e) => setNewOrder({ ...newOrder, driverId: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 text-xs rounded-xl p-2.5 focus:outline-none focus:ring-1 focus:ring-[#007AFF] text-right"
                    >
                      <option value="">נא לבחור נהג שילוח</option>
                      {drivers.map((drv) => (
                        <option key={drv.id} value={drv.name}>
                          {drv.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex gap-2.5 mt-4 justify-end border-t border-slate-100 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsNewOrderModalOpen(false)}
                    className="px-4.5 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-500 rounded-xl text-xs font-bold transition-all cursor-pointer bg-white text-center"
                  >
                    ביטול
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 bg-[#007AFF] hover:bg-[#005ecb] text-white rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer transition-transform active:scale-95 text-center shadow-md shadow-[#007AFF]/10"
                  >
                    <span>שמור ורשום הזמנה במאגר 🏗️</span>
                  </button>
                </div>

              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
