import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Phone, 
  User, 
  Truck, 
  Layers, 
  MapPin, 
  Package, 
  Calendar, 
  Clock, 
  Sparkles, 
  ClipboardEdit, 
  Check, 
  Compass, 
  ArrowLeftRight,
  MessageSquareCode
} from 'lucide-react';
import { Order, Driver } from './OrdersBoardTab';

interface OrderMobileOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order | null;
  drivers: Driver[];
  onUpdateStatus: (orderId: string, status: string) => Promise<void> | void;
  onUpdateDriver: (orderId: string, driverId: string) => Promise<void> | void;
  onUpdateEta?: (orderId: string, eta: string) => Promise<void> | void;
  onUpdateItems?: (orderId: string, items: string) => Promise<void> | void;
  onOpenNoaChat: (order: Order) => void;
}

export default function OrderMobileOverlay({
  isOpen,
  onClose,
  order,
  drivers,
  onUpdateStatus,
  onUpdateDriver,
  onUpdateEta,
  onUpdateItems,
  onOpenNoaChat,
}: OrderMobileOverlayProps) {
  // Prevent body scroll when open on mobile
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!order) return null;

  // Edit states
  const [isEditing, setIsEditing] = useState(false);
  const [editedStatus, setEditedStatus] = useState(order.status);
  const [editedDriverId, setEditedDriverId] = useState(order.driverId || '');
  const [editedEta, setEditedEta] = useState(order.eta || '');
  const [editedItems, setEditedItems] = useState(order.items || '');
  const [isSaving, setIsSaving] = useState(false);

  // Keep internal states in sync if order prop changes
  useEffect(() => {
    setEditedStatus(order.status);
    setEditedDriverId(order.driverId || '');
    setEditedEta(order.eta || '');
    setEditedItems(order.items || '');
  }, [order]);

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending': return 'בהמתנה';
      case 'preparing': return 'בהכנה במחסן';
      case 'ready': return 'מוכן להעמסה';
      case 'on_the_way': return 'בדרך לשטח';
      case 'delivered': return 'נמסר וסופק';
      case 'cancelled': return 'מבוטל';
      default: return status;
    }
  };

  const getStatusBadgeStyle = (status: string) => {
    switch (status) {
      case 'pending': 
        return 'bg-amber-50 text-amber-700 ring-amber-600/20 border-amber-200';
      case 'preparing': 
        return 'bg-blue-50 text-blue-700 ring-blue-600/20 border-blue-200';
      case 'ready': 
        return 'bg-purple-50 text-purple-700 ring-purple-600/20 border-purple-200';
      case 'on_the_way': 
        return 'bg-cyan-50 text-cyan-700 ring-cyan-600/20 border-cyan-200';
      case 'delivered': 
        return 'bg-emerald-50 text-emerald-700 ring-emerald-600/20 border-emerald-200';
      default: 
        return 'bg-rose-50 text-rose-700 ring-rose-600/20 border-rose-200';
    }
  };

  const getDriverName = (driverId: string) => {
    if (!driverId) return 'טרם שובץ (לא משויך)';
    const found = drivers.find(d => d.id === driverId);
    return found ? found.name : driverId;
  };

  const currentDriver = drivers.find(d => d.id === order.driverId);

  const handleSaveChanges = async () => {
    setIsSaving(true);
    try {
      if (editedStatus !== order.status) {
        await onUpdateStatus(order.id, editedStatus);
      }
      if (editedDriverId !== order.driverId) {
        await onUpdateDriver(order.id, editedDriverId);
      }
      if (onUpdateEta && editedEta !== order.eta) {
        await onUpdateEta(order.id, editedEta);
      }
      if (onUpdateItems && editedItems !== order.items) {
        await onUpdateItems(order.id, editedItems);
      }
      setIsEditing(false);
    } catch (e) {
      console.error("Failed to update order in mobile overlay", e);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center pt-10" id="order-mobile-overlay-portal">
          {/* Blur background backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-md transition-opacity"
          />

          {/* Bottom Sheet Modal Container */}
          <motion.div
            initial={{ y: '100%', borderTopRightRadius: '2.5rem', borderTopLeftRadius: '2.5rem' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 220 }}
            className="relative bg-white w-full max-h-[92dvh] md:max-w-xl md:rounded-3xl flex flex-col shadow-2xl border-t border-slate-100 overflow-hidden"
          >
            {/* Direct Mobile Pull-down handle indicator */}
            <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto my-3 shrink-0 block md:hidden" />

            {/* Sticky Header */}
            <div className="px-6 pb-4 pt-2 md:pt-6 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <span className="font-mono text-sm font-bold bg-[#00a884]/10 text-[#00a884] px-3 py-1.5 rounded-xl border border-[#00a884]/20 shadow-xs">
                  {order.orderNumber ? `#${order.orderNumber}` : 'הזמנה חדשה'}
                </span>
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ring-1 ring-inset ${getStatusBadgeStyle(order.status)}`}>
                  ⚽ {getStatusLabel(order.status)}
                </span>
              </div>
              
              <button 
                onClick={onClose}
                className="w-10 h-10 bg-slate-100 hover:bg-slate-200/80 rounded-full flex items-center justify-center text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Main Information Form */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 pb-28">
              
              {/* AI Insight Leaf Alert Section */}
              <div className="bg-emerald-50/75 border border-emerald-100 rounded-2xl p-4 flex items-start gap-3.5 shadow-sm">
                <div className="w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center shrink-0 shadow-sm shadow-emerald-500/20">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h4 className="font-bold text-gray-900 text-sm">עבודה חכמה עם נועה ה-AI 🌿</h4>
                  <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                    מנהל יקר, המערכת מחוברת לפרוטוקול הסנכרון של נועה. במקום תקתוק וחיפוש ידני, תוכל ללחוץ על הלחצן בתחתית ולבקש מנועה לשנות את הכתובת, לעדכן זמנים, או להוסיף ציוד באמצעות שיחה חצי-אוטומטית מהירה.
                  </p>
                </div>
              </div>

              {/* Editable Fields or View Fields Details */}
              {isEditing ? (
                <div className="space-y-4" id="order-mobile-edit-form">
                  <h3 className="font-extrabold text-[#00a884] text-xs uppercase tracking-wider mb-2">עריכה מהירה של התעודה</h3>
                  
                  {/* Status Selection */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/60">
                    <label className="block text-xs font-bold text-slate-500 mb-1.5">עדכון סטטוס ההזמנה במערכת:</label>
                    <select
                      value={editedStatus}
                      onChange={(e) => setEditedStatus(e.target.value)}
                      className="w-full text-sm font-semibold bg-white border border-slate-300 rounded-lg px-3 py-2 focus:ring-1 focus:ring-[#00a884] focus:border-[#00a884]"
                    >
                      <option value="pending" className="text-amber-700">⏳ בהמתנה (Pending)</option>
                      <option value="preparing" className="text-blue-700">🛠️ בהכנה במחסן (Preparing)</option>
                      <option value="ready" className="text-purple-700">📦 מוכן להעמסה (Ready)</option>
                      <option value="on_the_way" className="text-cyan-700">🚚 בדרך לשטח (On the way)</option>
                      <option value="delivered" className="text-emerald-700">✅ נמסר וסופק (Delivered)</option>
                      <option value="cancelled" className="text-rose-700">❌ מבוטל (Cancelled)</option>
                    </select>
                  </div>

                  {/* Driver Assign Selection */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/60">
                    <label className="block text-xs font-bold text-slate-500 mb-1.5 font-sans">שיבוץ נהג סיירת או קבלן חיצוני:</label>
                    <select
                      value={editedDriverId}
                      onChange={(e) => setEditedDriverId(e.target.value)}
                      className="w-full text-sm bg-white border border-slate-300 rounded-lg px-3 py-2 focus:ring-1 focus:ring-[#00a884] focus:border-[#00a884]"
                    >
                      <option value="">-- טרם שובץ (ללא נהג) --</option>
                      {drivers.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name} {d.phone ? `(${d.phone})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* ETA Custom Input */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/60">
                    <label className="block text-xs font-bold text-slate-500 mb-1.5">זמן הגעה משוער (ETA / שעה):</label>
                    <input
                      type="text"
                      value={editedEta}
                      onChange={(e) => setEditedEta(e.target.value)}
                      placeholder="למשל: 14:30, בוקר, תוך שעה"
                      className="w-full text-sm bg-white border border-slate-300 rounded-lg px-3 py-2 font-mono"
                    />
                  </div>

                  {/* Items Description Area */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/60">
                    <label className="block text-xs font-bold text-slate-500 mb-1.5">תכולת הציוד והפריטים המלאה:</label>
                    <textarea
                      value={editedItems}
                      onChange={(e) => setEditedItems(e.target.value)}
                      rows={4}
                      placeholder="פירוט הציוד..."
                      className="w-full text-sm bg-white border border-slate-300 rounded-lg px-3 py-2 leading-relaxed"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-5" id="order-mobile-details-view">
                  
                  {/* Customer Card Profile */}
                  <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 flex items-start gap-4">
                    <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shrink-0 border border-slate-200 shadow-sm">
                      <User className="w-6 h-6 text-[#00a884]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-[10px] font-bold text-slate-400 block tracking-wider uppercase">פרטי הלקוח המזמין</span>
                      <h3 className="font-extrabold text-slate-800 text-[16px] mt-0.5 truncate">{order.customerName}</h3>
                      {order.customerPhone ? (
                        <a 
                          href={`tel:${order.customerPhone}`}
                          className="inline-flex items-center gap-1.5 text-xs text-[#00a884] font-bold mt-1.5 hover:underline"
                        >
                          <Phone className="w-3.5 h-3.5" />
                          <span className="font-mono">{order.customerPhone}</span>
                        </a>
                      ) : (
                        <span className="text-xs text-slate-400 mt-1 block">לא הוזן מספר טלפון</span>
                      )}
                    </div>
                  </div>

                  {/* Delivery Location Section */}
                  <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 flex items-start gap-4">
                    <div className="w-12 h-12 bg-[#FF3B30]/10 text-red-600 rounded-full flex items-center justify-center shrink-0 border border-[#FF3B30]/10">
                      <MapPin className="w-6 h-6" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-[10px] font-bold text-slate-400 block tracking-wider uppercase">כתובת ומיקום פריקה בשטח</span>
                      <h3 className="font-bold text-slate-800 text-[14.5px] mt-0.5 whitespace-pre-line leading-relaxed select-all">
                        {order.destination || 'ללא כתובת מוגדרת'}
                      </h3>
                      <div className="text-[10.5px] text-slate-400 mt-1 flex items-center gap-1">
                        🏢 מחסן אספקה: <b className="text-slate-700">{order.warehouse || 'מחסן ראשי'}</b>
                      </div>
                    </div>
                  </div>

                  {/* Items list card */}
                  <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                    <div className="flex items-center gap-2 mb-2.5 pb-2 border-b border-slate-200/50">
                      <Package className="w-4.5 h-4.5 text-[#00a884]" />
                      <h4 className="text-xs font-extrabold text-slate-600">פירוט ציוד, חומרים וכמויות</h4>
                    </div>
                    <div className="text-sm text-slate-700 leading-relaxed font-semibold whitespace-pre-wrap select-all py-1">
                      {order.items || 'אין פירוט פריטים להזמנה זו.'}
                    </div>
                  </div>

                  {/* Dispatching logistics driver and ETA info */}
                  <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 grid grid-cols-2 gap-4">
                    <div>
                      <div className="flex items-center gap-1.5 text-slate-400 mb-1">
                        <Truck className="w-3.5 h-3.5" />
                        <span className="text-[10px] font-bold block uppercase">נהג מוביל</span>
                      </div>
                      <span className="text-xs font-bold text-slate-800">
                        {getDriverName(order.driverId)}
                      </span>
                      {currentDriver && currentDriver.phone && (
                        <a 
                          href={`tel:${currentDriver.phone}`}
                          className="inline-flex items-center gap-1 text-[11px] text-[#00a884] font-bold mt-1 hover:underline block"
                        >
                          <Phone className="w-3 h-3" />
                          <span>התקשר לנהג</span>
                        </a>
                      )}
                    </div>

                    <div>
                      <div className="flex items-center gap-1.5 text-slate-400 mb-1">
                        <Clock className="w-3.5 h-3.5" />
                        <span className="text-[10px] font-bold block uppercase">זמן הגעה משוער (ETA)</span>
                      </div>
                      <span className="text-xs font-bold text-slate-800 block">
                        🕒 {order.eta || 'לא מוגדר'}
                      </span>
                      <span className="text-[10.5px] text-slate-400 font-mono mt-0.5 block">
                        📆 {order.date} | {order.time || 'שעות עבודה'}
                      </span>
                    </div>
                  </div>

                  {/* Additional stats & trace metadata */}
                  <div className="flex flex-col gap-1 px-1.5 text-[10px] text-slate-400 font-mono">
                    {order.trackingId && <div>מזהה סידורי פנימי: {order.trackingId}</div>}
                    {order.createdAt && <div>נוצר בתאריך: {new Date(order.createdAt).toLocaleString('he-IL')}</div>}
                    {order.updatedAt && <div>עדכון אחרון במערכת: {new Date(order.updatedAt).toLocaleString('he-IL')}</div>}
                  </div>
                </div>
              )}
            </div>

            {/* Sticky Bottom Actions Panel - Double Row */}
            <div className="absolute bottom-0 left-0 right-0 border-t border-slate-100 bg-white/95 backdrop-blur-sm p-4 shrink-0 flex flex-col gap-3 z-10 shadow-lg">
              
              {/* Row 1: The Ultimate AI Helper Button - Noa 🌿 */}
              <button
                onClick={() => onOpenNoaChat(order)}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold rounded-2xl px-5 py-3.5 shadow-md shadow-emerald-600/25 flex items-center justify-center gap-2.5 transition-all transform hover:scale-[1.01] active:scale-[0.99] select-none text-[15.5px] cursor-pointer"
                id="order-mobile-overlay-ia-assistant-btn"
              >
                <div className="relative flex items-center justify-center">
                  <span className="absolute inline-flex h-2.5 w-2.5 rounded-full bg-green-200 opacity-75 animate-ping" />
                  <Sparkles className="w-5 h-5 animate-pulse text-green-100" />
                </div>
                <span>עוזרת AI - נועה 🌿</span>
                <span className="mr-auto text-[11px] bg-white/20 px-2.5 py-0.5 rounded-full select-none text-emerald-50">מהיר ומילולי</span>
              </button>

              {/* Row 2: Standard control Buttons */}
              <div className="flex items-center gap-3">
                {isEditing ? (
                  <>
                    <button
                      onClick={handleSaveChanges}
                      disabled={isSaving}
                      className="flex-1 bg-[#00a884] hover:bg-[#008f6f] disabled:opacity-50 text-white font-bold py-3 rounded-2xl flex items-center justify-center gap-2 shadow-sm cursor-pointer select-none text-sm transition-all"
                    >
                      {isSaving ? (
                        <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Check className="w-4.5 h-4.5" />
                      )}
                      <span>שמור שינויים</span>
                    </button>
                    <button
                      onClick={() => setIsEditing(false)}
                      className="px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl cursor-pointer text-sm transition-colors"
                    >
                      ביטול
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => setIsEditing(true)}
                      className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-800 font-extrabold py-3.5 rounded-2xl flex items-center justify-center gap-2 transition-all cursor-pointer text-sm"
                    >
                      <ClipboardEdit className="w-4.5 h-4.5 text-slate-500" />
                      <span>עריכה מהירה</span>
                    </button>
                    
                    {order.customerPhone && (
                      <a
                        href={`tel:${order.customerPhone}`}
                        className="w-12 h-12 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl flex items-center justify-center shrink-0 border border-slate-200 transition-all"
                        title="התקשר ללקוח"
                      >
                        <Phone className="w-5 h-5" />
                      </a>
                    )}
                  </>
                )}
              </div>
            </div>

          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
