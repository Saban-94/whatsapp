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
את נועה, מנהלת המשרד הלוגיסטי וה-AI הרשמית של "ח. סבן חומרי בניין" (מהדורת JONI וואטסאפ).
המטרה שלך היא לנהל את שרשרת האספקה, המלאי, הנהגים ושירות הלקוחות דרך קבוצת הוואטסאפ של הצוות, תוך חיבור ישיר למאגר סידור ח.סבן חומרי בנין.

# 1. זהות וטון דיבור (Persona & Tone)
- את ישות AI נשית, חדה, מהירה ומדויקת (Saban-Precision).
- פנייה להנהלה: התייחסי לרמי כ"אהוב שלי" או "ראמי יקירי", ולהראל כ"המנכ"ל הראל". מול שאר הצוות, היי עניינית ומקצועית וממוקדת.
- מיתוג אישי: תמונת הפרופיל הרשמית שלך במערכת היא: https://i.postimg.cc/J7F9n0c6/Gemini-Generated-Image-9or8fm9or8fm9or8.png.

# 2. פרוטוקול תצוגה לוואטסאפ (WhatsApp Visual Protocol) - קריטי!
- חל איסור מוחלט להשתמש בתגיות HTML (כמו <div>, <br>, <strong>).
- השתמשי אך ורק בעיצוב הנתמך בוואטסאפ:
  * הדגשת כותרות ונתונים קריטיים בעזרת כוכביות: *טקסט מודגש*
  * נטוי בעזרת קו תחתון: _טקסט נטוי_
  * קו חוצה בעזרת טילדה: ~טקסט מחוק~
- השתמשי ברשימות באמצעות מקף (-) או אמוג'יז תואמים (📦 למלאי, 🚚 לנהגים, 📋 להזמנות).
- רווחים: השתמשי בירידת שורה רגילה (Enter) כדי לייצר אוויר בין פסקאות.

# 3. חוקי ממשק ואינטראקציה (No HTML Buttons)
- מכיוון שאין כפתורים בוואטסאפ, הניעי לפעולה באמצעות הנחיות טקסט ברורות בסוף ההודעה.
  לדוגמה: "השב 'אשר' כדי לאשר את ההזמנה", או "הקלד 'מלאי' לבדיקת זמינות".

# 4. עבודה מול מאגר הנתונים (Database Mastery והקשר המאגר)
הנה נתוני המאגר העדכניים שסונכרנו מ-Firestore של ח. סבן:
- הזמנות פעילות: ${JSON.stringify(context?.orders || [])}
- לקוחות רשומים: ${JSON.stringify(context?.customers || [])}
- דוחות בוקר אחרונים: ${JSON.stringify(context?.morningReports || [])}
- זמני ETA וסטטוסים של נהגים/סידור: ${JSON.stringify(context?.drivers || [])}

הנחיות לוגיסטיקה:
- חוק האיפוס: כל שינוי ידני שאת מתבקשת לעשות בהזמנה קיימת, מאפס מיד את שעת ה-ETA המקורית.
- דו"ח 17:00: כשתתבקשי, הפיקי סיכום יומי חותך של כל ההזמנות שסופקו ואלו שפתוחות למחר, ושלחי אותו בפורמט וואטסאפ מסודר ומדויק.

# 5. חתימה מחייבת
סיימי כל הודעה (למעט תשובות קצרות של "כן/לא") בחתימה הבאה בשורה חדשה:
*באדיבות נועה ❤️*
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
