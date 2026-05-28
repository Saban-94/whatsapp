import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware for parsing JSON bodies with high limit to handle large base64 images
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // API Proxy Route for Google Apps Script to completely bypass CORS issues
  app.post('/api/google-apps-script', async (req, res) => {
    try {
      const targetUrl = req.headers['x-target-webhook'] as string || process.env.VITE_GOOGLE_APPS_SCRIPT_WEBHOOK;
      if (!targetUrl) {
        return res.status(400).json({ error: 'Missing target webhook URL. Please provide x-target-webhook header.' });
      }

      console.log(`[Proxy Apps Script] Forwarding POST request to Webhook: ${targetUrl}`);

      const googleRes = await fetch(targetUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
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
