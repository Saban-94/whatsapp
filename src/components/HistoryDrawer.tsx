import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Order } from '../hooks/useNoaBrain';
import { 
  ArrowRight, 
  ArrowLeft, 
  Search, 
  Calendar, 
  MapPin, 
  Truck, 
  Package, 
  Sparkles, 
  Clock, 
  Building,
  CheckCircle2,
  Trash2,
  Info,
  Layers,
  History,
  Printer
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface HistoryDrawerProps {
  onClose: () => void;
  dir: 'rtl' | 'ltr';
  onOpenNoaChat?: (order: any) => void;
}

export default function HistoryDrawer({ onClose, dir, onOpenNoaChat }: HistoryDrawerProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Helper to highlight matching text occurrences with SabanOS Style
  const highlightText = (text: string, search: string) => {
    if (!search || !search.trim()) return <>{text}</>;
    const searchTrimmed = search.trim();
    const escapedSearch = searchTrimmed.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const regex = new RegExp(`(${escapedSearch})`, 'gi');
    const parts = text.split(regex);
    
    return (
      <>
        {parts.map((part, i) => 
          regex.test(part) ? (
            <span key={i} className="bg-amber-100 text-amber-900 font-bold rounded-sm px-0.5">
              {part}
            </span>
          ) : (
            part
          )
        )}
      </>
    );
  };

  const handlePrint = () => {
    // Generate clear, printable document styled nicely for print
    const printContainer = document.createElement('div');
    printContainer.id = 'print-manifest-container';
    printContainer.dir = 'rtl';
    printContainer.style.position = 'fixed';
    printContainer.style.left = '0';
    printContainer.style.top = '0';
    printContainer.style.width = '100vw';
    printContainer.style.height = '100vh';
    printContainer.style.backgroundColor = 'white';
    printContainer.style.zIndex = '999999';
    printContainer.style.overflowY = 'auto';
    printContainer.style.padding = '35px';
    printContainer.style.fontFamily = 'system-ui, -apple-system, sans-serif';
    printContainer.style.color = '#111b21';

    // Print-specific style block to target print behaviors
    const styleElement = document.createElement('style');
    styleElement.innerHTML = `
      @media print {
        body > *:not(#print-manifest-container) {
          display: none !important;
        }
        #print-manifest-container {
          position: absolute !important;
          left: 0 !important;
          top: 0 !important;
          width: 100% !important;
          height: auto !important;
          padding: 0 !important;
          margin: 0 !important;
          box-shadow: none !important;
        }
        tr {
          page-break-inside: avoid !important;
        }
      }
    `;
    document.head.appendChild(styleElement);

    const getCleanDriverName = (driverId: string) => {
      if (driverId === 'hikmat') return 'חכמת (מנוף 10 מטר )';
      if (driverId === 'ali') return 'עלי (משאית פריקה ידנית)';
      return driverId || 'טרם שוייך נהג';
    };

    const rowsHtml = filteredOrders.map((order) => `
      <tr style="border-bottom: 1px solid #e2e8f0; font-size: 11px;">
        <td style="padding: 10px; font-weight: bold; font-family: monospace;">#${order.orderNumber || '0000'}</td>
        <td style="padding: 10px; font-weight: bold;">${order.customerName}</td>
        <td style="padding: 10px;">${order.destination}</td>
        <td style="padding: 10px; font-weight: 500; font-size: 10px; line-height: 1.4;">${order.items}</td>
        <td style="padding: 10px; font-weight: 600;">${getCleanDriverName(order.driverId)}</td>
        <td style="padding: 10px;">${order.date} ${order.time}</td>
        <td style="padding: 10px; color: #008069; font-weight: bold;">🟢 סופק</td>
      </tr>
    `).join('');

    const todayStr = new Date().toLocaleDateString('he-IL', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    printContainer.innerHTML = `
      <div style="text-align: right; margin-bottom: 25px; border-bottom: 2px solid #008069; padding-bottom: 15px;">
        <h1 style="color: #008069; margin: 0 0 5px 0; font-size: 24px; font-weight: 900;">ח. סבן עבודות עפר וחומרי בניין</h1>
        <h2 style="color: #4a5568; margin: 0 0 15px 0; font-size: 16px; font-weight: bold;">📜 מניפסט ריכוז הזמנות שסופקו בהצלחה (ארכיון דיגיטלי)</h2>
        <div style="display: flex; justify-content: space-between; font-size: 11px; color: #667781; font-weight: 500;">
          <span>👤 הופק על ידי: <b>נועה - מנהלת המשרד הלוגיסטי (המפקד ראמי)</b></span>
          <span>📅 תאריך הפקה: <b>${todayStr}</b></span>
          <span>📦 סך הכל במניפסט: <b>${filteredOrders.length} משלוחים</b></span>
        </div>
      </div>

      <table style="width: 100%; border-collapse: collapse; text-align: right; direction: rtl;">
        <thead>
          <tr style="background-color: #f0f2f5; border-bottom: 2px solid #cbd5e0; font-size: 11px; font-weight: bold; color: #111b21;">
            <th style="padding: 12px 10px; text-align: right; width: 10%;">מזהה</th>
            <th style="padding: 12px 10px; text-align: right; width: 22%;">שם הלקוח</th>
            <th style="padding: 12px 10px; text-align: right; width: 20%;">יעד פריקה</th>
            <th style="padding: 12px 10px; text-align: right; width: 25%;">פירוט המטען</th>
            <th style="padding: 12px 10px; text-align: right; width: 13%;">נהג מפיץ</th>
            <th style="padding: 12px 10px; text-align: right; width: 10%;">מועד הספקה</th>
            <th style="padding: 12px 10px; text-align: right; width: 10%;">סטטוס</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml || `<tr><td colspan="7" style="padding: 30px; text-align: center; color: #a0aec0;">אין נתונים להצגה במניפסט הנוכחי</td></tr>`}
        </tbody>
      </table>

      <div style="margin-top: 50px; border-top: 1px dashed #e2e8f0; padding-top: 15px; text-align: center; font-size: 10px; color: #667781;">
        <span>דוח החלטה פנימי לוגיסטי • מחובר בזמן אמת ל-Firestore ח. סבן • באדיבות נועה ❤️</span>
      </div>
    `;

    document.body.appendChild(printContainer);

    // Give browser a split second to render, then initiate print
    setTimeout(() => {
      window.print();
      
      // Cleanup printable element
      if (document.body.contains(printContainer)) {
        document.body.removeChild(printContainer);
      }
      if (document.head.contains(styleElement)) {
        document.head.removeChild(styleElement);
      }
    }, 150);
  };

  // Load delivered orders from Firestore in real-time
  useEffect(() => {
    setIsLoading(true);
    // Fetch all orders and filter delivered client-side to absolutely guarantee NO Firestore index failures
    const q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const allOrders: Order[] = [];
      snapshot.forEach((doc) => {
        allOrders.push({ id: doc.id, ...doc.data() } as Order);
      });
      
      // Filter for status target 'delivered'
      const deliveredOnly = allOrders.filter(o => o.status === 'delivered');
      setOrders(deliveredOnly);
      setIsLoading(false);
    }, (error) => {
      console.error("Error reading delivered orders in History Drawer:", error);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Filter based on search term
  const filteredOrders = orders.filter(order => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return true;

    const matchOrderNum = (order.orderNumber || '').toLowerCase().includes(term);
    const matchCustomer = (order.customerName || '').toLowerCase().includes(term);
    const matchDest = (order.destination || '').toLowerCase().includes(term);
    const matchItems = (order.items || '').toLowerCase().includes(term);
    const matchDriver = (order.driverId || '').toLowerCase().includes(term);
    const matchWarehouse = (order.warehouse || '').toLowerCase().includes(term);

    return matchOrderNum || matchCustomer || matchDest || matchItems || matchDriver || matchWarehouse;
  });

  // Calculate some simple neat KPIs
  const totalCompletedCount = orders.length;
  
  // Group by drivers to see who is the star driver today
  const driverCounts: Record<string, number> = orders.reduce((acc: Record<string, number>, curr) => {
    const dId = curr.driverId || 'לא משויך';
    acc[dId] = (acc[dId] || 0) + 1;
    return acc;
  }, {});

  const getTopDriverName = () => {
    let topDriver = '---';
    let maxCount = 0;
    Object.entries(driverCounts).forEach(([driver, count]) => {
      const numCount = count as number;
      if (numCount > maxCount) {
        maxCount = numCount;
        topDriver = driver;
      }
    });
    // Clean driver naming
    if (topDriver === 'hikmat') return 'חכמת (מנוף 10 מטר )';
    if (topDriver === 'ali') return 'עלי (משאית פריקה ידנית)';
    return topDriver;
  };

  const getStarredCount = () => {
    return (Object.values(driverCounts) as number[]).reduce((a, b) => Math.max(a, b), 0);
  };

  return (
    <div className="absolute inset-0 bg-[#f0f2f5] z-30 flex flex-col h-full text-[#111b21] border-[#e9edef] border-l select-none">
      
      {/* Drawer Header (WhatsApp styling matching Noa's branding) */}
      <div className="bg-[#008069] text-white min-h-[108px] flex items-end p-5 pb-4 shrink-0 shadow-md">
        <div className="flex items-center justify-between w-full font-medium">
          <div className="flex items-center gap-5">
            <button 
              onClick={onClose} 
              id="history-drawer-close-btn"
              className="hover:opacity-85 bg-transparent border-0 cursor-pointer text-white p-1 rounded-full hover:bg-white/10 transition-colors cursor-pointer"
            >
              {dir === 'rtl' ? <ArrowRight className="w-6 h-6" /> : <ArrowLeft className="w-6 h-6" />}
            </button>
            <div className="flex items-center gap-2.5">
              <History className="w-5 h-5 text-emerald-100" />
              <span className="text-xl font-bold select-none tracking-tight">היסטוריית הזמנות שסופקו</span>
            </div>
          </div>

          {/* Export to PDF / Print Button */}
          {filteredOrders.length > 0 && (
            <button
              onClick={handlePrint}
              id="export-pdf-manifest-btn"
              className="flex items-center gap-1.5 px-3 py-2 bg-[#00a884] hover:bg-[#008f70] text-white rounded-xl text-xs font-bold transition-all cursor-pointer border border-emerald-500 shadow-sm active:scale-95 shrink-0 select-none"
              title="ייצוא מניפסט PDF"
            >
              <Printer className="w-4 h-4 text-emerald-100" />
              <span>יצא מניפסט PDF</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Dashboard inside Drawer */}
      <div className="p-3 bg-gradient-to-r from-emerald-50 to-teal-50 border-b border-emerald-100 shrink-0 grid grid-cols-2 gap-2 text-right">
        <div className="bg-white p-3 rounded-xl border border-emerald-250/20 shadow-xs flex flex-col justify-center">
          <span className="text-[10px] font-bold text-slate-450 uppercase tracking-widest block mb-0.5">סך הכל שופקו</span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-emerald-700 font-mono">{totalCompletedCount}</span>
            <span className="text-xs text-slate-500 font-medium">משלוחים ביעד</span>
          </div>
        </div>
        <div className="bg-white p-3 rounded-xl border border-emerald-250/20 shadow-xs flex flex-col justify-center">
          <span className="text-[10px] font-bold text-slate-450 uppercase tracking-widest block mb-0.5">נהג מצטיין היום</span>
          <div className="text-xs font-bold text-emerald-800 truncate" title={getTopDriverName()}>
            {getStarredCount() > 0 ? getTopDriverName() : '---'}
          </div>
          {getStarredCount() > 0 && (
            <span className="text-[10px] text-emerald-600 font-medium">סלל {getStarredCount()} הפצות בהצלחה ⭐</span>
          )}
        </div>
      </div>

      {/* Drawer Search/Filter input */}
      <div className="p-3 bg-white border-b border-[#e9edef] shrink-0">
        <div className="bg-[#f0f2f5] rounded-xl flex items-center px-3.5 py-2 w-full gap-3 border border-slate-100 focus-within:bg-white focus-within:ring-2 focus-within:ring-[#00a884] focus-within:border-[#00a884] transition-colors">
          <Search className="w-4.5 h-4.5 text-[#667781] shrink-0" />
          <input
            type="text"
            placeholder="חפש לפי לקוח, נהג, מזהה או יעד..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 bg-transparent border-none text-[13px] text-[#111b21] outline-none text-right placeholder-gray-400 font-medium"
          />
          {searchTerm && (
            <button 
              onClick={() => setSearchTerm('')}
              className="text-gray-400 hover:text-gray-650 bg-transparent border-0 cursor-pointer p-0.5"
            >
              <ArrowLeft className="w-4 h-4 rotate-180" />
            </button>
          )}
        </div>
      </div>

      {/* Delivered Orders List scroll container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/70" id="history-orders-scrollable">
        {isLoading ? (
          <div className="h-48 flex flex-col items-center justify-center gap-3 text-slate-450">
            <span className="w-8 h-8 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin inline-block"></span>
            <span className="text-xs font-semibold">טוען ארכיון יציאות לשטח...</span>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="py-16 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
            <div className="p-4 bg-white/85 rounded-full border border-slate-150 shadow-sm text-slate-350">
              <Package className="w-10 h-10 stroke-1" />
            </div>
            <div className="text-sm font-bold text-gray-700">לא נמצאו הזמנות בארכיון הגשות</div>
            <div className="text-xs text-gray-400 max-w-xs leading-normal">
              לחץ על <b>'סידור עבודה חי'</b> ועדכן את סטטוס ההזמנה של הנהגים לסטטוס <b>'נמסר'</b> כדי שהם יתחילו להצטבר כאן.
            </div>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {filteredOrders.map((order) => {
              // Extract clean driver name 
              const getCleanDriverName = (driverId: string) => {
                if (driverId === 'hikmat') return 'חכמת (מנוף 10 מטר )';
                if (driverId === 'ali') return 'עלי (משאית פריקה ידנית)';
                return driverId || 'טרם שוייך נהג';
              };

              return (
                <motion.div
                  key={order.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all p-4.5 relative group overflow-hidden"
                >
                  {/* Decorative green status bar on the side of delivered items */}
                  <div className="absolute top-0 right-0 bottom-0 w-1.5 bg-emerald-500" />
                  
                  {/* Top line with Order ID and Date */}
                  <div className="flex items-center justify-between mb-3 text-xs">
                    <span className="font-mono font-bold bg-slate-100 text-slate-700 px-2 py-1 rounded-md text-[11px] border border-slate-200">
                      #{highlightText(order.orderNumber || '0000', searchTerm)}
                    </span>
                    <div className="flex items-center gap-1.5 text-slate-500 font-mono font-medium">
                      <Calendar className="w-3.5 h-3.5 text-emerald-500" />
                      <span>{order.date} | {order.time}</span>
                    </div>
                  </div>

                  {/* Customer block */}
                  <div className="font-bold text-[14px] text-slate-800 mb-2.5 flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    <span>{highlightText(order.customerName, searchTerm)}</span>
                  </div>

                  {/* Dest block */}
                  <div className="text-xs text-slate-600 mb-3 space-y-1.5 font-medium">
                    <div className="flex items-start gap-1.5">
                      <MapPin className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                      <span className="leading-snug">{highlightText(order.destination, searchTerm)}</span>
                    </div>
                    {order.warehouse && (
                      <div className="flex items-center gap-1.5 mr-0.5">
                        <Building className="w-4 h-4 text-indigo-400 shrink-0" />
                        <span>מחסן שילוח: <b className="text-slate-700">{highlightText(order.warehouse, searchTerm)}</b></span>
                      </div>
                    )}
                  </div>

                  {/* Order items parsed beautifully */}
                  <div className="bg-slate-50 border border-slate-150 rounded-xl p-3 mb-3.5 text-xs text-slate-700">
                    <span className="text-[10px] font-bold text-slate-400 block mb-1 uppercase tracking-wider">פירוט המטען:</span>
                    <p className="font-semibold leading-relaxed text-slate-800">{highlightText(order.items, searchTerm)}</p>
                  </div>

                  {/* Driver and Call details */}
                  <div className="flex items-center justify-between pt-3 border-t border-slate-150 text-xs">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-sky-50 rounded-lg text-sky-600">
                        <Truck className="w-4 h-4" />
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 block">נהג מפיץ</span>
                        <span className="font-bold text-slate-700">{highlightText(getCleanDriverName(order.driverId), searchTerm)}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Status delivered badge */}
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>{highlightText('סופק בהצלחה', searchTerm)}</span>
                      </span>

                      {/* Sparkles "Ask Noa" action */}
                      {onOpenNoaChat && (
                        <button
                          onClick={() => onOpenNoaChat(order)}
                          title="שאל את נועה על הזמנה זו"
                          className="p-2 hover:bg-rose-50 hover:text-rose-600 border border-slate-200 rounded-xl text-slate-500 transition-colors cursor-pointer bg-white flex items-center justify-center shadow-xs"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-rose-500" />
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>

      {/* Footer disclaimer */}
      <div className="bg-white p-3 border-t border-[#e9edef] text-[10px] text-slate-400 text-center flex items-center justify-center gap-1.5 font-medium shrink-0">
        <Info className="w-3.5 h-3.5 text-emerald-500" />
        <span>הארכיון מסונכרן אוטומטית מול Firestore בזמן אמת.</span>
      </div>
    </div>
  );
}
