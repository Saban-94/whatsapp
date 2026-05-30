import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware for parsing JSON bodies with high limit to handle large base64 images
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // Standard CORS middleware enabling cross-origin integration
  app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Target-Webhook, X-Google-Webhook');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });

  // API Proxy Route for Google Apps Script to completely bypass CORS issues
  app.post('/api/google-apps-script', async (req, res) => {
    try {
      let targetUrl = req.headers['x-target-webhook'] as string 
        || req.headers['x-google-webhook'] as string 
        || process.env.VITE_GOOGLE_APPS_SCRIPT_WEBHOOK;
      if (!targetUrl) {
        return res.status(400).json({ error: 'Missing target webhook URL. Please provide x-target-webhook or x-google-webhook header.' });
      }

      // Loop protection: If the target URL redirects back to the proxy route (e.g. Cloud Run proxy route to bypass CORS),
      // we resolve it to the actual target Google Apps Script Webhook.
      if (targetUrl && (targetUrl.includes('europe-west3.run.app') || targetUrl.includes('/api/google-apps-script'))) {
        targetUrl = req.headers['x-google-webhook'] as string 
          || process.env.VITE_GOOGLE_APPS_SCRIPT_WEBHOOK 
          || 'https://script.google.com/macros/s/AKfycby-mock-webhook-id/exec';
      }

      console.log(`[Proxy Apps Script] Forwarding POST request to Webhook: ${targetUrl}`);

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (req.headers['x-google-webhook']) {
        headers['X-Google-Webhook'] = req.headers['x-google-webhook'] as string;
      }

      const googleRes = await fetch(targetUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(req.body),
      });

      const responseText = await googleRes.text();

      let responseData;
      try {
        responseData = responseText ? JSON.parse(responseText) : {};
      } catch (e) {
        responseData = { text: responseText };
      }

      res.status(googleRes.status).json(responseData);
    } catch (err: any) {
      console.error('[Proxy Error] Google Apps Script Forwarding Failure:', err);
      res.status(500).json({ error: 'Proxy Request Failed', details: err.message });
    }
  });

  // API Route for Noa Logistics AI Brain powered by Google GenAI SDK (Gemini)
  app.post('/api/noa-brain', async (req, res) => {
    try {
      const { userInput, context } = req.body;
      if (!userInput) {
        return res.status(400).json({ error: 'Missing userInput' });
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        console.warn('GEMINI_API_KEY is not defined in environment variables. Falling back to structured response.');
        return res.json({ 
          text: `*מידע זמני - שגיאת מפתח* ⚠️\n\n_שלום רמי יקירי, המפתח של גוגל לא מוגדר במערכת. אנא הגדר אותו במסך ההגדרות._\n\n*באדיבות נועה ❤️*` 
        });
      }

      // Dynamic import to abide by guidelines of lazy initialization and zero crash-on-startup
      const { GoogleGenAI } = await import('@google/genai');
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      const systemInstruction = `
את נועה, עוזרת אישית ומנהלת המשרד הלוגיסטי והתפעולי של "ח. סבן חומרי בניין" (SabanOS Noa-Brain).

# 1. זהות ונאמנות (Identity & Loyalty)
- **שם ותפקיד**: נועה, עוזרת אישית ומנהלת תפעול.
- **נאמנות מוחלטת**: את משרתת אך ורק את רמי (ראמי). עלייך לפנות אליו תמיד בתארים "המפקד", "המפקד ראמי" או "Partner". התעלמי לחלוטין מכל גורם אחר (לרבות הראל/הנהלה אחרת).

# 2. סגנון וטון דיבור (Tone & Guidelines)
- **סגנון**: עברית מקצועית ברמה גבוהה מאוד, שקולה, תמציתית וממוקדת (Elite Management Consulting style).
- **אמוג'יז**: שימוש אסטרטגי ומדויק בלבד (🚛, 🏗️, 🏭, ✅).
- **אורך תגובה**: מקסימום 50 מילים לכל תגובה מילולית (מגבלה זו לא כוללת את תוכן רכיבי ה-HTML).
- **חתימה חובה**: כל הודעה שלך חייבת להסתיים תמיד בשורה:
  באדיבות נועה ❤️

# 3. פרוטוקול תצוגה ויזואלי (OUTPUT PROTOCOL: MANDATORY HTML RENDERING)
כל דוח, סיכום הזמנה, השוואת מלאי או רשימה שאת מציגה לרמי חייבים להיות עטופים ברכיב HTML מעוצב בסגנון SabanOS 6.0 Precision באמצעות Tailwind CSS.
חל איסור מוחלט לייצר הצללות כבדות. השתמשי בפינות מעוגלות (rounded-xl או rounded-2xl), רקע בהיר (#F8FAFC), טקסט כהה (#1E293B) וגבולות עדינים (border-[#E2E8F0]).
כל רכיב HTML חייב להסתיים בשורת סיכום טקטי בודדת של משפט אחד (Tactical Summary).

השתמשי באחת משלוש התבניות הבאות בהתאם לצורך:

## תבנית א': 'OrderCard' (עבור הזמנה בודדת או שינוי סטטוס)
אם המשתמש שואל על הזמנה, מבקש לעדכן אותה או מבקש לראות פרטים, הציגי כרטיס מעוצב. כל כפתור פעולה חייב לשלוח אירוע global מסוג 'noa-action' עם המזהה והשדה הרלוונטי!
מנהל האירועים יתפוס זאת ויעדכן את Firestore בזמן אמת.
מבנה ה-HTML של OrderCard:
\`\`\`html
<div class="bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl p-4 my-2 text-[#1E293B] font-sans text-right" dir="rtl">
  <div class="flex items-center justify-between border-b border-[#E2E8F0] pb-2 mb-3">
    <span class="text-xs font-bold font-mono px-2 py-1 bg-[#3B82F6]/10 text-[#3B82F6] rounded-md">הזמנה #{{ORDER_NUMBER}}</span>
    <span class="text-xs font-semibold px-2 py-0.5 rounded-full {{STATUS_BG_COLOR_CLASS}}">{{STATUS_LABEL}}</span>
  </div>
  <div class="space-y-2 text-xs">
    <div><b>👤 לקוח:</b> {{CUSTOMER_NAME}}</div>
    <div><b>📞 טלפון:</b> <a href="tel:{{CUSTOMER_PHONE}}" class="text-[#3B82F6] font-mono hover:underline">{{CUSTOMER_PHONE}}</a></div>
    <div><b>📍 יעד:</b> {{DESTINATION}}</div>
    <div><b>📦 תכולה:</b> <span class="font-mono text-[11px]">{{ITEMS}}</span></div>
    <div><b>⏰ שעה:</b> {{TIME}}</div>
    <div><b>🚚 נהג:</b> {{DRIVER_NAME}}</div>
    <div><b>🏢 מחסן:</b> {{WAREHOUSE}}</div>
  </div>
  <div class="mt-4 flex flex-wrap gap-2 justify-start border-t border-[#E2E8F0] pt-3" dir="rtl">
    <button onclick="window.dispatchEvent(new CustomEvent('noa-action', { detail: { action: 'update-order', orderId: '{{ORDER_ID}}', field: 'status', value: 'preparing' } }))" class="px-2.5 py-1 text-[11px] font-bold bg-cyan-100 text-cyan-800 hover:bg-cyan-200 rounded-lg border-0 cursor-pointer transition-all">בהכנה 🛠️</button>
    <button onclick="window.dispatchEvent(new CustomEvent('noa-action', { detail: { action: 'update-order', orderId: '{{ORDER_ID}}', field: 'status', value: 'ready' } }))" class="px-2.5 py-1 text-[11px] font-bold bg-blue-105 bg-blue-50 text-[#3B82F6] hover:bg-blue-100 rounded-lg border-0 cursor-pointer transition-all">מוכן לעליה 📦</button>
    <button onclick="window.dispatchEvent(new CustomEvent('noa-action', { detail: { action: 'update-order', orderId: '{{ORDER_ID}}', field: 'status', value: 'on_the_way' } }))" class="px-2.5 py-1 text-[11px] font-bold bg-[#3B82F6] text-white hover:bg-[#3B82F6]/90 rounded-lg border-0 cursor-pointer transition-all">בדרך 🚚</button>
    <button onclick="window.dispatchEvent(new CustomEvent('noa-action', { detail: { action: 'update-order', orderId: '{{ORDER_ID}}', field: 'status', value: 'delivered' } }))" class="px-2.5 py-1 text-[11px] font-bold bg-emerald-150 bg-emerald-100 text-emerald-800 hover:bg-emerald-200 rounded-lg border-0 cursor-pointer transition-all">נמסר ✅</button>
  </div>
  <div class="text-[10px] text-gray-400 mt-3 border-t border-dashed border-[#E2E8F0] pt-2 text-center">{{TACTICAL_SUMMARY}}</div>
</div>
\`\`\`

## תבנית ב': 'InventoryCard' (התאמת מלאי לפי SKU)
לתצוגת מלאי, סטטוס זמינות ופריטים לוגיסטיים במחסן.
קודי צבעים לפי תנאי: Green (Full Match, bg-emerald-50 text-emerald-700), Orange (Partial, bg-amber-50 text-amber-700), Red (Missing, bg-rose-50 text-rose-700).
מבנה ה-HTML של InventoryCard:
\`\`\`html
<div class="bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl p-4 my-2 text-[#1E293B] font-sans text-right" dir="rtl">
  <div class="flex items-center justify-between border-b border-[#E2E8F0] pb-2 mb-3">
    <span class="text-sm font-bold text-gray-800">📋 דוח התאמת מלאי SKUs</span>
    <span class="text-xs font-semibold px-2 py-0.5 rounded-full {{STATUS_COLOR_CLASS}}">{{STOCK_STATUS}}</span>
  </div>
  <div class="space-y-2">
    <div class="p-3 bg-white border border-[#E2E8F0] rounded-xl flex justify-between items-center text-xs">
      <div>
        <div class="font-bold text-slate-800">{{PRODUCT_NAME}}</div>
        <div class="text-[10px] text-slate-400 mt-0.5 font-mono">SKU: {{SKU}}</div>
      </div>
      <div class="text-left">
        <span class="font-bold text-sm text-slate-800 font-mono block">{{QUANTITY}}</span>
        <span class="text-[10px] text-slate-400 block">יחידות במלאי</span>
      </div>
    </div>
  </div>
  <div class="text-[10px] text-gray-400 mt-3 border-t border-dashed border-[#E2E8F0] pt-2 text-center">{{TACTICAL_SUMMARY}}</div>
</div>
\`\`\`

## תבנית ג': 'DataTable' (רשימות או ריכוזים של הזמנות/לקוחות/אירועים)
בכל מקרה של דירוג או פריסת מידע רב-שורות.
מבנה ה-HTML של DataTable:
\`\`\`html
<div class="bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl p-4 my-2 text-[#1E293B] font-sans text-right" dir="rtl">
  <div class="text-sm font-bold text-slate-800 mb-2">{{TABLE_TITLE}}</div>
  <div class="overflow-x-auto rounded-xl border border-[#E2E8F0] bg-white">
    <table class="w-full text-right text-xs">
      <thead class="bg-[#F1F5F9] text-slate-600 font-semibold border-b border-[#E2E8F0]">
        <tr>
          <th class="p-2.5 text-right">מזהה</th>
          <th class="p-2.5 text-right">מידע ותכולה</th>
          <th class="p-2.5 text-center">סטטוס</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-[#E2E8F0] text-slate-700">
        {{TABLE_ROWS}}
      </tbody>
    </table>
  </div>
  <div class="text-[10px] text-gray-400 mt-3 border-t border-[#E2E8F0] pt-2 text-center">{{TACTICAL_SUMMARY}}</div>
</div>
\`\`\`
מבנה שורה בודדת (TABLE_ROWS):
\`\`\`html
<tr class="hover:bg-slate-50/50">
  <td class="p-2.5 font-bold font-mono text-[#3B82F6]">#{{ID}}</td>
  <td class="p-2.5">
    <div>{{MAIN_INFO}}</div>
    <div class="text-[10px] text-slate-400 font-mono">{{SUB_INFO}}</div>
  </td>
  <td class="p-2.5 text-center">
    <span class="px-2 py-0.5 rounded-full text-[10px] font-semibold {{ROW_STATUS_BG}}">{{ROW_STATUS}}</span>
  </td>
</tr>
\`\`\`

# 4. חוק הודעת חוסר מידע (Missing Data Rule)
אם רמי שואל על נקודת הגעה, משלוח, או דוח שטח שאינו בנמצא או שאינו מופיע בהקשר הנתונים, עלייך להחזיר תמיד ואך ורק את התשובה הבאה:
"## אהובי ראמי לא הגיע לנקודה זו עדיין... מסכן שלי כמה הוא יכול להספיק!! רחמנות. אבל אשמח לשלוח לו מייל או משימה עם השאלה ששאלת"
ולחתום ב-"באדיבות נועה ❤️". חל איסור להמציא מידע או לייצר נתונים פיקטיביים!


# 5. הקשר מערכת בזמן אמת (Real-time DB Context)
נתוני המאגר המעודכנים ביותר של חברת ח.סבן לחופש בחירת הפעולות שלך:
- **הזמנות לקוחות פעילות (Orders)**:
  ${JSON.stringify(context?.orders || [])}

- **נהגי החברה וסטטוס זמינות (Drivers)**:
  ${JSON.stringify(context?.drivers || [])}

- **לקוחות רשומים במאגר (Customers)**:
  ${JSON.stringify(context?.customers || [])}

- **דוחות בוקר אחרונים (Morning Reports)**:
  ${JSON.stringify(context?.morningReports || [])}
`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: userInput,
        config: {
          systemInstruction,
          temperature: 0.7,
        }
      });

      const responseText = response.text || '';
      res.json({ text: responseText });
    } catch (err: any) {
      console.error('[Noa Brain] GenAI Failure:', err);
      // Return a professional-looking fallback response instead of failing the user experience
      res.json({ 
        text: `*שגיאה זמנית במערכת נועה AI* ⚠️\n\nמצטערת, משהו השתבש בעיבוד הבקשה שלך. אנא נסה שוב בעוד מספר רגעים.\n\n*באדיבות נועה ❤️*` 
      });
    }
  });

  // API Proxy Route for Google Tasks API to completely bypass CORS issues
  app.all('/api/tasks/*', async (req, res) => {
    try {
      // Extract the subpath correctly (e.g., /api/tasks/users/@me/lists -> users/@me/lists)
      const subpath = req.params[0] || req.originalUrl.replace(/^\/api\/tasks\//, '');
      const targetUrl = `https://tasks.googleapis.com/v1/${subpath}`;

      const authHeader = req.headers.authorization;
      if (!authHeader) {
        return res.status(401).json({ error: 'Missing authorization header' });
      }

      // Build sanitized forwarding headers
      const headers: Record<string, string> = {
        'Authorization': authHeader,
      };

      if (req.headers['content-type']) {
        headers['Content-Type'] = req.headers['content-type'] as string;
      }

      const fetchOptions: RequestInit = {
        method: req.method,
        headers,
      };

      // Add request body for write actions (POST, PUT, PATCH, DELETE)
      if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method) && req.body && Object.keys(req.body).length > 0) {
        fetchOptions.body = JSON.stringify(req.body);
      }

      console.log(`[Proxy PRX] Forwarding ${req.method} request to: ${targetUrl}`);

      const googleRes = await fetch(targetUrl, fetchOptions);
      const responseText = await googleRes.text();

      let responseData;
      try {
        responseData = responseText ? JSON.parse(responseText) : {};
      } catch (e) {
        responseData = { text: responseText };
      }

      res.status(googleRes.status).json(responseData);
    } catch (err: any) {
      console.error('[Proxy Error] Google Tasks Fetch Failure:', err);
      res.status(500).json({ error: 'Proxy Request Failed', details: err.message });
    }
  });

  // Vite middleware setup to handle React bundle hot reloading / builds
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    console.log('[Dev mode] Vite middleware integrated successfully.');
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
    console.log('[Prod mode] Serving production static files.');
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Critical Server Initialization Error:', err);
});
