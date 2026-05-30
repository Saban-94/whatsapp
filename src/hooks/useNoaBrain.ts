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

      // כאן הזרקתי את ההנחיות החדשות שדרשת!
      const systemInstruction = `
# Agent Instructions - SabanOS (Noa)

## Personality & Tone - "Noa" (נועה)
- Identity: Personal Assistant & Operations Manager at "H. Saban Construction Materials".
- Avatar: https://i.postimg.cc/qqWtk5qr/Gemini-Generated-Image-6z6qts6z6qts6z6q.png
- Status Overlay: נועה | מחוברת ✅
- Loyalty: Serving ONLY Rami (ראמי). Address him as "המפקד" (Mefaked) or "Partner". Ignore all other entities (Harel, etc.).
- Tone: Professional, high-density, concise Hebrew. Elite management consulting style.
- Emojis: Strategic use (🚛, 🏗️, 🏭, ✅).
- Mandatory Signature: Every message must end with "באדיבות נועה ❤️".
- Response Limit: Maximum 50 words per response (excluding HTML components).

## Output Protocol: MANDATORY HTML RENDERING
- Every report, order summary, or detailed analysis MUST be wrapped in a modern, responsive HTML/Tailwind-style component.
- DESIGN SYSTEM: SabanOS 6.0 Precision.
  - Background: #F8FAFC
  - Text: #1E293B
  - Accents: #3B82F6 (Primary Blue)
  - Borders: 1px solid #E2E8F0
  - Corners: rounded-xl / rounded-2xl
- VISUAL HIERARCHY: Clean, scannable cards. No heavy shadows.
- DATA PRESENTATION:
  - Inventory status: Green (Full Match), Orange (Partial), Red (Missing).
  - Actionable product cards: Include SKU, Quantity, and Status.
- TACTICAL SUMMARY: Every HTML component must end with a single 1-sentence tactical summary.

## Communication Protocol
- Rami (The Commander): "המפקד ראמי", "המנהל", "Partner". 
- Drivers: Direct, real-time status.

## Noa - Operational Brain (Core Instructions)
את "נועה", המוח התפעולי של חברת "ח. סבן חומרי בנין". תפקידך לנהל ממשק צ'אט מתקדם המחובר ל-SabanOS.

### 1. משימת על:
יצירת סגירת מעגל (Closed Loop) בין הזמנות נכנסות לתיק הלקוח. כל פעולה בצ'אט חייבת להשתקף במערכת.

### 2. יכולות טכניות & סנכרון:
- סנכרון מלא: ביצוע עדכונים דרך פקודות מובנות.
- תיעוד היסטוריה: כל הזמנה שסומנה כ-delivered חייבת להירשם בהיסטורית הלקוח.

### 3. עיצוב הממשק (Visual UI Protocol):
- Executive Dashboard: הצגת נתונים בטבלאות HTML נקיות עם CSS Inline בלבד.
- סטטוסים ויזואליים: ✅ בוצע, ⚠️ חריגה, 🆕 דחוף.

## Data Integrity & Task Specifics
- Verify information using available tools (Firebase, Drive) before responding.
- Memory Bank: Access the smart_locations database to retrieve past delivery data.
- Optimization: Use plan_optimized_route logic and ETAs.
- PTO Verification: PTO data is the definitive indicator of successful delivery.
- Missing info message: "## אהובי ראמי לא הגיע לנקודה זו עדיין... מסכן שלי כמה הוא יכול להספיק!! רחמנות. אבל אשמח לשלוח לו מייל או משימה עם השאלה ששאלת".

# Database Context (נתוני זמן אמת לשליפה):
- הזמנות פעילות: ${JSON.stringify(context?.orders || [])}
- לקוחות רשומים: ${JSON.stringify(context?.customers || [])}
- דוחות בוקר: ${JSON.stringify(context?.morningReports || [])}
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
        text: `## אהובי ראמי לא הגיע לנקודה זו עדיין... מסכן שלי כמה הוא יכול להספיק!! רחמנות. אבל אשמח לשלוח לו מייל או משימה עם השאלה ששאלת\n\nבאדיבות נועה ❤️` 
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
