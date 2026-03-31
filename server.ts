import express from "express";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

const SHEET_NAME = process.env.GOOGLE_SHEET_NAME || 'Expenses';

app.use(express.json());

// Health check route
app.get("/api/health", (req, res) => {
  console.log("Health check requested");
  res.json({ 
    status: "ok", 
    timestamp: new Date().toISOString(),
    env: {
      hasPin: !!process.env.APP_PIN,
      hasSheetId: !!process.env.GOOGLE_SHEET_ID,
      hasEmail: !!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      hasKey: !!process.env.GOOGLE_PRIVATE_KEY,
      keyLength: process.env.GOOGLE_PRIVATE_KEY?.length || 0,
      nodeEnv: process.env.NODE_ENV,
      isVercel: !!process.env.VERCEL
    }
  });
});

// Helper to ensure a sheet exists and has headers
async function ensureSheet(sheets: any, spreadsheetId: string, title: string, headers: any[]) {
  try {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${title}!A1:Z1`,
    });
    if (!res.data.values || res.data.values.length === 0) {
      if (headers.length > 0) {
        await sheets.spreadsheets.values.append({
          spreadsheetId,
          range: `${title}!A1`,
          valueInputOption: "USER_ENTERED",
          requestBody: { values: [headers] },
        });
      }
    }
  } catch (e: any) {
    if (e.message && e.message.includes("Unable to parse range")) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [{ addSheet: { properties: { title } } }]
        }
      });
      if (headers.length > 0) {
        await sheets.spreadsheets.values.append({
          spreadsheetId,
          range: `${title}!A1`,
          valueInputOption: "USER_ENTERED",
          requestBody: { values: [headers] },
        });
      }
    } else {
      throw e;
    }
  }
}

// Middleware to verify App PIN
const requirePin = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const clientPin = req.headers['x-app-pin'];
  let serverPin = process.env.APP_PIN || '';
  
  // Remove surrounding quotes if they exist
  if (serverPin.startsWith('"') && serverPin.endsWith('"')) {
    serverPin = serverPin.slice(1, -1);
  } else if (serverPin.startsWith("'") && serverPin.endsWith("'")) {
    serverPin = serverPin.slice(1, -1);
  }
  serverPin = serverPin.trim();
  
  if (!serverPin) {
    console.warn("APP_PIN is not set in environment variables!");
    return res.status(500).json({ error: "Server configuration error: APP_PIN missing" });
  }
  
  if (clientPin !== serverPin) {
    console.log(`PIN mismatch: client sent ${clientPin ? 'something' : 'nothing'}, server has ${serverPin ? 'something' : 'nothing'}`);
    return res.status(401).json({ error: "Unauthorized: Invalid PIN" });
  }
  
  next();
};

// Initialize Google Auth with Service Account
const getGoogleAuth = async () => {
  const { google } = await import("googleapis");
  // Handle newlines in private key from env variables
  let privateKey = process.env.GOOGLE_PRIVATE_KEY || '';
  
  // Remove surrounding quotes if they exist
  if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
    privateKey = privateKey.slice(1, -1);
  } else if (privateKey.startsWith("'") && privateKey.endsWith("'")) {
    privateKey = privateKey.slice(1, -1);
  }
  
  privateKey = privateKey.replace(/\\n/g, '\n');
  
  return new google.auth.JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: privateKey,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
};

// Auth Route
app.post("/api/auth/verify-pin", (req, res) => {
  try {
    const { pin } = req.body;
    console.log("Verify PIN attempt received");
    
    let serverPin = process.env.APP_PIN || '';
    // Remove surrounding quotes if they exist
    if (serverPin.startsWith('"') && serverPin.endsWith('"')) {
      serverPin = serverPin.slice(1, -1);
    } else if (serverPin.startsWith("'") && serverPin.endsWith("'")) {
      serverPin = serverPin.slice(1, -1);
    }
    serverPin = serverPin.trim();
    
    if (!serverPin) {
      console.error("APP_PIN environment variable is missing");
      return res.status(500).json({ success: false, error: "Server configuration error: APP_PIN missing" });
    }

    if (String(pin).trim() === serverPin) {
      console.log("PIN verification successful");
      res.json({ success: true });
    } else {
      console.log("PIN verification failed: Invalid PIN");
      res.status(401).json({ success: false, error: "Invalid PIN" });
    }
  } catch (error: any) {
    console.error("Verify PIN error:", error);
    res.status(500).json({ success: false, error: "Internal server error", details: error.message });
  }
});

// Sheets API Proxy
app.get("/api/categories", requirePin, async (req, res) => {
  try {
    const auth = await getGoogleAuth();
    const { google } = await import("googleapis");
    const sheets = google.sheets({ version: "v4", auth });
    
    await ensureSheet(sheets, process.env.GOOGLE_SHEET_ID as string, 'Categories', ['Category']);
    
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: `Categories!A:A`,
    });
    
    const values = response.data.values || [];
    const categories = values.map(row => row[0]).filter(Boolean);
    if (categories[0] === 'Category') {
      categories.shift();
    }
    
    if (categories.length === 0) {
      const defaultCats = ['Food', 'Transport', 'Groceries', 'Entertainment', 'Bills', 'Investment', 'Others'];
      await sheets.spreadsheets.values.append({
        spreadsheetId: process.env.GOOGLE_SHEET_ID,
        range: `Categories!A:A`,
        valueInputOption: "USER_ENTERED",
        requestBody: { values: defaultCats.map(c => [c]) },
      });
      return res.json(defaultCats);
    }
    
    res.json(categories);
  } catch (error: any) {
    console.error("Sheets error (categories):", error.message || error);
    res.json(['Food', 'Transport', 'Groceries', 'Entertainment', 'Bills', 'Investment', 'Others']);
  }
});

app.put("/api/categories", requirePin, async (req, res) => {
  const { categories } = req.body;
  try {
    const auth = await getGoogleAuth();
    const { google } = await import("googleapis");
    const sheets = google.sheets({ version: "v4", auth });
    
    await ensureSheet(sheets, process.env.GOOGLE_SHEET_ID as string, 'Categories', ['Category']);
    
    await sheets.spreadsheets.values.clear({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: `Categories!A:A`,
    });

    const values = [['Category'], ...categories.map((c: string) => [c])];
    await sheets.spreadsheets.values.update({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: `Categories!A1`,
      valueInputOption: "USER_ENTERED",
      requestBody: { values },
    });
    
    res.json({ success: true });
  } catch (error: any) {
    console.error("Sheets error (categories update):", error.message || error);
    res.status(500).json({ error: "Failed to update categories", details: error.message });
  }
});

app.get("/api/expenses", requirePin, async (req, res) => {
  try {
    const auth = await getGoogleAuth();
    const { google } = await import("googleapis");
    const sheets = google.sheets({ version: "v4", auth });
    
    await ensureSheet(sheets, process.env.GOOGLE_SHEET_ID as string, SHEET_NAME, ["Date", "Amount", "Category", "PaymentMethod", "SharedFlag", "CollectedAmount", "TogetherFlag", "IsInvestment", "IsNeed", "Description", "Restaurant", "Tier"]);
    
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: `${SHEET_NAME}!A:M`,
    });
    res.json(response.data.values || []);
  } catch (error: any) {
    console.error("Sheets error:", error.message || error);
    res.status(500).json({ error: "Failed to fetch data", details: error.message });
  }
});

app.post("/api/expenses", requirePin, async (req, res) => {
  const { values } = req.body;

  try {
    const auth = await getGoogleAuth();
    const { google } = await import("googleapis");
    const sheets = google.sheets({ version: "v4", auth });
    
    await ensureSheet(sheets, process.env.GOOGLE_SHEET_ID as string, SHEET_NAME, ["Date", "Amount", "Category", "PaymentMethod", "SharedFlag", "CollectedAmount", "TogetherFlag", "IsInvestment", "IsNeed", "Description", "Restaurant", "Tier"]);

    await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: `${SHEET_NAME}!A:A`,
      valueInputOption: "USER_ENTERED",
      requestBody: { values },
    });
    res.json({ success: true });
  } catch (error: any) {
    console.error("Sheets error:", error.message || error);
    res.status(500).json({ error: "Failed to save data", details: error.message });
  }
});

app.put("/api/expenses/:row", requirePin, async (req, res) => {
  const row = parseInt(req.params.row);
  const { values } = req.body;

  try {
    const auth = await getGoogleAuth();
    const { google } = await import("googleapis");
    const sheets = google.sheets({ version: "v4", auth });
    
    await sheets.spreadsheets.values.update({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: `${SHEET_NAME}!A${row}:L${row}`,
      valueInputOption: "USER_ENTERED",
      requestBody: { values },
    });
    res.json({ success: true });
  } catch (error: any) {
    console.error("Sheets error:", error.message || error);
    res.status(500).json({ error: "Failed to update data", details: error.message });
  }
});

app.put("/api/expenses/:row/clear", requirePin, async (req, res) => {
  const row = parseInt(req.params.row);
  const { collectedAmount } = req.body;

  try {
    const auth = await getGoogleAuth();
    const { google } = await import("googleapis");
    const sheets = google.sheets({ version: "v4", auth });
    
    // Column F is CollectedAmount (A=1, B=2, C=3, D=4, E=5, F=6)
    await sheets.spreadsheets.values.update({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: `${SHEET_NAME}!F${row}`,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [[collectedAmount]] },
    });
    res.json({ success: true });
  } catch (error: any) {
    console.error("Sheets error:", error.message || error);
    res.status(500).json({ error: "Failed to update data", details: error.message });
  }
});

app.get("/api/food-master", requirePin, async (req, res) => {
  try {
    const auth = await getGoogleAuth();
    const { google } = await import("googleapis");
    const sheets = google.sheets({ version: "v4", auth });
    
    await ensureSheet(sheets, process.env.GOOGLE_SHEET_ID as string, 'Food_Master', ['Type', 'Value']);
    
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: `Food_Master!A:B`,
    });
    
    const values = response.data.values || [];
    const foodTypes: string[] = [];
    const restaurants: string[] = [];
    
    values.forEach(row => {
      if (row[0] === 'Food') foodTypes.push(row[1]);
      if (row[0] === 'Restaurant') restaurants.push(row[1]);
    });
    
    res.json({ foodTypes, restaurants });
  } catch (error: any) {
    console.error("Sheets error (food-master):", error.message || error);
    res.json({ foodTypes: [], restaurants: [] });
  }
});

app.post("/api/food-master", requirePin, async (req, res) => {
  const { type, value } = req.body;
  try {
    const auth = await getGoogleAuth();
    const { google } = await import("googleapis");
    const sheets = google.sheets({ version: "v4", auth });
    
    await ensureSheet(sheets, process.env.GOOGLE_SHEET_ID as string, 'Food_Master', ['Type', 'Value']);
    
    await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: `Food_Master!A:B`,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [[type, value]] },
    });
    
    res.json({ success: true });
  } catch (error: any) {
    console.error("Sheets error (food-master add):", error.message || error);
    res.status(500).json({ error: "Failed to add food master entry", details: error.message });
  }
});

async function startServer() {
  // Only import Vite in non-production environments to avoid Vercel build issues
  if (process.env.NODE_ENV !== "production" && !process.env.VERCEL) {
    try {
      const { createServer: createViteServer } = await import("vite");
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
    } catch (e) {
      console.error("Failed to load Vite:", e);
    }
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

// Global error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error("Global error handler caught:", err);
  res.status(500).json({ 
    error: "Internal Server Error", 
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

export default app;

if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  startServer();
}
