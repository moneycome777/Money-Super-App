import express from "express";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;
const distPath = path.join(process.cwd(), "dist");

const SHEET_NAME = process.env.GOOGLE_SHEET_NAME || 'Expenses';
const isProd = process.env.NODE_ENV === "production" || !!process.env.VERCEL;

app.use(express.json());

  if (isProd) {
    // Serve static files from the Vite build output
    // Use a more robust path for Vercel
    const staticPath = path.join(process.cwd(), "dist");
    app.use(express.static(staticPath, {
      maxAge: '1d',
      immutable: true,
      fallthrough: true // Allow falling through to the SPA fallback if file not found
    }));
  }

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

// Rate limiter for PIN verification
const failedAttempts = new Map<string, { count: number, lockedUntil: number }>();
const MAX_ATTEMPTS = 5;
const LOCKOUT_TIME = 15 * 60 * 1000; // 15 minutes

// Auth Route
app.post("/api/auth/verify-pin", (req, res) => {
  try {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const attempt = failedAttempts.get(ip);
    
    if (attempt && attempt.lockedUntil > Date.now()) {
      const remainingMinutes = Math.ceil((attempt.lockedUntil - Date.now()) / 60000);
      return res.status(429).json({ 
        success: false, 
        error: `Too many failed attempts. Try again in ${remainingMinutes} minutes.` 
      });
    }

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
      failedAttempts.delete(ip); // Reset on success
      res.json({ success: true });
    } else {
      console.log("PIN verification failed: Invalid PIN");
      
      // Increment failed attempts
      const newCount = (attempt?.count || 0) + 1;
      if (newCount >= MAX_ATTEMPTS) {
        failedAttempts.set(ip, { count: newCount, lockedUntil: Date.now() + LOCKOUT_TIME });
        return res.status(429).json({ 
          success: false, 
          error: `Too many failed attempts. Try again in 15 minutes.` 
        });
      } else {
        failedAttempts.set(ip, { count: newCount, lockedUntil: 0 });
        res.status(401).json({ success: false, error: `Invalid PIN. ${MAX_ATTEMPTS - newCount} attempts remaining.` });
      }
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
      return res.json(defaultCats.sort((a, b) => a.localeCompare(b)));
    }
    
    res.json(categories.sort((a: string, b: string) => a.localeCompare(b)));
  } catch (error: any) {
    console.error("Sheets error (categories):", error.message || error);
    res.json(['Food', 'Transport', 'Groceries', 'Entertainment', 'Bills', 'Investment', 'Others'].sort((a, b) => a.localeCompare(b)));
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

app.get("/api/settings", requirePin, async (req, res) => {
  try {
    const auth = await getGoogleAuth();
    const { google } = await import("googleapis");
    const sheets = google.sheets({ version: "v4", auth });
    
    await ensureSheet(sheets, process.env.GOOGLE_SHEET_ID as string, 'Settings', ['Key', 'Value']);
    
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: `Settings!A:B`,
    });
    
    const values = response.data.values || [];
    const settings: Record<string, string> = {};
    
    values.forEach(row => {
      if (row[0] && row[0] !== 'Key') {
        settings[row[0]] = row[1] || '';
      }
    });
    
    res.json(settings);
  } catch (error: any) {
    console.error("Sheets error (settings):", error.message || error);
    res.json({});
  }
});

app.put("/api/settings", requirePin, async (req, res) => {
  const { key, value } = req.body;
  try {
    const auth = await getGoogleAuth();
    const { google } = await import("googleapis");
    const sheets = google.sheets({ version: "v4", auth });
    
    await ensureSheet(sheets, process.env.GOOGLE_SHEET_ID as string, 'Settings', ['Key', 'Value']);
    
    // Get current settings to find the row
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: `Settings!A:B`,
    });
    
    const values = response.data.values || [];
    let rowIndex = -1;
    
    for (let i = 0; i < values.length; i++) {
      if (values[i][0] === key) {
        rowIndex = i + 1; // 1-indexed
        break;
      }
    }
    
    if (rowIndex !== -1) {
      // Update existing
      await sheets.spreadsheets.values.update({
        spreadsheetId: process.env.GOOGLE_SHEET_ID,
        range: `Settings!B${rowIndex}`,
        valueInputOption: "USER_ENTERED",
        requestBody: { values: [[value]] },
      });
    } else {
      // Append new
      await sheets.spreadsheets.values.append({
        spreadsheetId: process.env.GOOGLE_SHEET_ID,
        range: `Settings!A:B`,
        valueInputOption: "USER_ENTERED",
        requestBody: { values: [[key, value]] },
      });
    }
    
    res.json({ success: true });
  } catch (error: any) {
    console.error("Sheets error (settings update):", error.message || error);
    res.status(500).json({ error: "Failed to update settings", details: error.message });
  }
});

app.get("/api/expenses", requirePin, async (req, res) => {
  try {
    const auth = await getGoogleAuth();
    const { google } = await import("googleapis");
    const sheets = google.sheets({ version: "v4", auth });
    
    await ensureSheet(sheets, process.env.GOOGLE_SHEET_ID as string, SHEET_NAME, ["Date", "Amount", "Category", "PaymentMethod", "SharedFlag", "CollectedAmount", "TogetherFlag", "IsInvestment", "IsNeed", "Description", "Restaurant", "Tier", "PetCategory", "NextDueDate"]);
    
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: `${SHEET_NAME}!A:N`,
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
    
    await ensureSheet(sheets, process.env.GOOGLE_SHEET_ID as string, SHEET_NAME, ["Date", "Amount", "Category", "PaymentMethod", "SharedFlag", "CollectedAmount", "TogetherFlag", "IsInvestment", "IsNeed", "Description", "Restaurant", "Tier", "PetCategory", "NextDueDate"]);

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
      range: `${SHEET_NAME}!A${row}:N${row}`,
      valueInputOption: "USER_ENTERED",
      requestBody: { values },
    });
    res.json({ success: true });
  } catch (error: any) {
    console.error("Sheets error:", error.message || error);
    res.status(500).json({ error: "Failed to update data", details: error.message });
  }
});

// Life Log API Routes
app.get("/api/life-log", requirePin, async (req, res) => {
  try {
    const auth = await getGoogleAuth();
    const { google } = await import("googleapis");
    const sheets = google.sheets({ version: "v4", auth });
    
    await ensureSheet(sheets, process.env.GOOGLE_SHEET_ID as string, 'life_log', ["Timestamp", "Raw_Text", "Tags", "Due_Date", "AI_Summary", "Status"]);
    
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: `life_log!A:F`,
    });
    
    const values = response.data.values || [];
    // Skip header row and filter out completed items
    const dataRows = values.slice(1).filter(row => row[5] !== 'Completed');
    const recentRows = dataRows.slice(-1000);
    
    res.json(recentRows);
  } catch (error: any) {
    console.error("Sheets error (life-log):", error.message || error);
    res.status(500).json({ error: "Failed to fetch life log data", details: error.message });
  }
});

app.post("/api/life-log", requirePin, async (req, res) => {
  const { values } = req.body;

  try {
    const auth = await getGoogleAuth();
    const { google } = await import("googleapis");
    const sheets = google.sheets({ version: "v4", auth });
    
    await ensureSheet(sheets, process.env.GOOGLE_SHEET_ID as string, 'life_log', ["Timestamp", "Raw_Text", "Tags", "Due_Date", "AI_Summary", "Status"]);

    await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: `life_log!A:A`,
      valueInputOption: "USER_ENTERED",
      requestBody: { values },
    });
    res.json({ success: true });
  } catch (error: any) {
    console.error("Sheets error (life-log post):", error.message || error);
    res.status(500).json({ error: "Failed to save life log data", details: error.message });
  }
});

app.put("/api/life-log/:row/complete", requirePin, async (req, res) => {
  const row = parseInt(req.params.row);
  try {
    const auth = await getGoogleAuth();
    const { google } = await import("googleapis");
    const sheets = google.sheets({ version: "v4", auth });
    
    await sheets.spreadsheets.values.update({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: `life_log!F${row}`,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [['Completed']] },
    });
    res.json({ success: true });
  } catch (error: any) {
    console.error("Sheets error (life-log complete):", error.message || error);
    res.status(500).json({ error: "Failed to mark life log as completed", details: error.message });
  }
});

// Fitness API Routes
app.get("/api/fitness", requirePin, async (req, res) => {
  try {
    const auth = await getGoogleAuth();
    const { google } = await import("googleapis");
    const sheets = google.sheets({ version: "v4", auth });
    
    await ensureSheet(sheets, process.env.GOOGLE_SHEET_ID as string, 'fitness_log', ["Timestamp", "Date", "Activity_Type", "Workout_Data", "Notes"]);
    
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: `fitness_log!A:E`,
    });
    
    const values = response.data.values || [];
    const dataRows = values.slice(1);
    res.json(dataRows);
  } catch (error: any) {
    console.error("Sheets error (fitness):", error.message || error);
    res.status(500).json({ error: "Failed to fetch fitness data", details: error.message });
  }
});

app.post("/api/fitness", requirePin, async (req, res) => {
  const { values } = req.body;
  try {
    const auth = await getGoogleAuth();
    const { google } = await import("googleapis");
    const sheets = google.sheets({ version: "v4", auth });
    
    await ensureSheet(sheets, process.env.GOOGLE_SHEET_ID as string, 'fitness_log', ["Timestamp", "Date", "Activity_Type", "Workout_Data", "Notes"]);

    await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: `fitness_log!A:A`,
      valueInputOption: "USER_ENTERED",
      requestBody: { values },
    });
    res.json({ success: true });
  } catch (error: any) {
    console.error("Sheets error (fitness post):", error.message || error);
    res.status(500).json({ error: "Failed to save fitness data", details: error.message });
  }
});

// Vault API Routes
app.get("/api/vault", requirePin, async (req, res) => {
  try {
    const auth = await getGoogleAuth();
    const { google } = await import("googleapis");
    const sheets = google.sheets({ version: "v4", auth });
    
    await ensureSheet(sheets, process.env.GOOGLE_SHEET_ID as string, '_stealth_vault', ["Timestamp", "Type", "Goal_Name", "Amount", "Due_Date", "Monthly_Contribution"]);
    
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: `_stealth_vault!A:F`,
    });
    
    const values = response.data.values || [];
    // Skip header row
    const dataRows = values.slice(1);
    
    res.json(dataRows);
  } catch (error: any) {
    console.error("Sheets error (vault):", error.message || error);
    res.status(500).json({ error: "Failed to fetch vault data", details: error.message });
  }
});

app.post("/api/vault", requirePin, async (req, res) => {
  const { values } = req.body;

  try {
    const auth = await getGoogleAuth();
    const { google } = await import("googleapis");
    const sheets = google.sheets({ version: "v4", auth });
    
    await ensureSheet(sheets, process.env.GOOGLE_SHEET_ID as string, '_stealth_vault', ["Timestamp", "Type", "Goal_Name", "Amount", "Due_Date", "Monthly_Contribution"]);

    await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: `_stealth_vault!A:A`,
      valueInputOption: "USER_ENTERED",
      requestBody: { values },
    });
    res.json({ success: true });
  } catch (error: any) {
    console.error("Sheets error (vault post):", error.message || error);
    res.status(500).json({ error: "Failed to save vault data", details: error.message });
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

// --- Insights Endpoints ---
app.get("/api/insights", requirePin, async (req, res) => {
  try {
    const auth = await getGoogleAuth();
    const { google } = await import("googleapis");
    const sheets = google.sheets({ version: "v4", auth });
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;

    await ensureSheet(sheets, spreadsheetId!, "Insights", ["ID", "Timestamp", "Title", "Context", "Category", "ReviewCount", "LastReviewedAt", "Status"]);

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: "Insights!A2:H",
    });

    const rows = response.data.values || [];
    const insights = rows.map((row, index) => ({
      rowIndex: index + 2,
      id: row[0] || '',
      timestamp: row[1] || '',
      title: row[2] || '',
      context: row[3] || '',
      category: row[4] || '',
      reviewCount: parseInt(row[5]) || 0,
      lastReviewedAt: row[6] || null,
      status: row[7] || 'ACTIVE'
    }));

    res.json(insights);
  } catch (error: any) {
    console.error("Error fetching insights:", error);
    res.status(500).json({ error: "Failed to fetch insights" });
  }
});

app.post("/api/insights", requirePin, async (req, res) => {
  try {
    const { timestamp, title, context, category } = req.body;
    const auth = await getGoogleAuth();
    const { google } = await import("googleapis");
    const sheets = google.sheets({ version: "v4", auth });
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;

    const id = Date.now().toString();
    const newRow = [
      id,
      timestamp,
      title,
      context,
      category,
      "0", // reviewCount
      "", // lastReviewedAt
      "ACTIVE" // status
    ];

    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: "Insights!A:H",
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [newRow] },
    });

    res.json({ success: true, id });
  } catch (error: any) {
    console.error("Error adding insight:", error);
    res.status(500).json({ error: "Failed to add insight" });
  }
});

app.put("/api/insights/:rowIndex", requirePin, async (req, res) => {
  try {
    const { rowIndex } = req.params;
    const { title, context, category } = req.body;
    const auth = await getGoogleAuth();
    const { google } = await import("googleapis");
    const sheets = google.sheets({ version: "v4", auth });
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `Insights!C${rowIndex}:E${rowIndex}`,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [[title, context, category]] },
    });

    res.json({ success: true });
  } catch (error: any) {
    console.error("Error updating insight:", error);
    res.status(500).json({ error: "Failed to update insight" });
  }
});

app.put("/api/insights/:rowIndex/review", requirePin, async (req, res) => {
  try {
    const { rowIndex } = req.params;
    const { reviewCount, lastReviewedAt, status } = req.body;
    const auth = await getGoogleAuth();
    const { google } = await import("googleapis");
    const sheets = google.sheets({ version: "v4", auth });
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `Insights!F${rowIndex}:H${rowIndex}`,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [[reviewCount.toString(), lastReviewedAt || "", status]] },
    });

    res.json({ success: true });
  } catch (error: any) {
    console.error("Error updating insight:", error);
    res.status(500).json({ error: "Failed to update insight" });
  }
});

app.get("/api/insight-summaries", requirePin, async (req, res) => {
  try {
    const auth = await getGoogleAuth();
    const { google } = await import("googleapis");
    const sheets = google.sheets({ version: "v4", auth });
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;

    await ensureSheet(sheets, spreadsheetId!, "InsightSummaries", ["ID", "Month", "Summary"]);

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: "InsightSummaries!A2:C",
    });

    const rows = response.data.values || [];
    const summaries = rows.map((row, index) => ({
      rowIndex: index + 2,
      id: row[0] || '',
      month: row[1] || '',
      summary: row[2] || ''
    }));

    res.json(summaries);
  } catch (error: any) {
    console.error("Error fetching insight summaries:", error);
    res.status(500).json({ error: "Failed to fetch insight summaries" });
  }
});

app.post("/api/insight-summaries", requirePin, async (req, res) => {
  try {
    const { month, summary } = req.body;
    const auth = await getGoogleAuth();
    const { google } = await import("googleapis");
    const sheets = google.sheets({ version: "v4", auth });
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;

    const id = Date.now().toString();
    const newRow = [id, month, summary];

    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: "InsightSummaries!A:C",
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [newRow] },
    });

    res.json({ success: true, id });
  } catch (error: any) {
    console.error("Error adding insight summary:", error);
    res.status(500).json({ error: "Failed to add insight summary" });
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

// Wealth API Routes
app.get("/api/wealth-log", requirePin, async (req, res) => {
  try {
    const auth = await getGoogleAuth();
    const { google } = await import("googleapis");
    const sheets = google.sheets({ version: "v4", auth });
    
    await ensureSheet(sheets, process.env.GOOGLE_SHEET_ID as string, 'wealth_log', ["Date", "Type", "Category", "AmountMYR", "AmountUSD", "PriceUSD", "Units", "Notes"]);
    
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: `wealth_log!A:H`,
    });
    
    res.json(response.data.values || []);
  } catch (error: any) {
    console.error("Sheets error (wealth-log):", error.message || error);
    res.status(500).json({ error: "Failed to fetch wealth data", details: error.message });
  }
});

app.post("/api/wealth-log", requirePin, async (req, res) => {
  const { values } = req.body;
  try {
    const auth = await getGoogleAuth();
    const { google } = await import("googleapis");
    const sheets = google.sheets({ version: "v4", auth });
    
    await ensureSheet(sheets, process.env.GOOGLE_SHEET_ID as string, 'wealth_log', ["Date", "Type", "Category", "AmountMYR", "AmountUSD", "PriceUSD", "Units", "Notes"]);

    await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: `wealth_log!A:A`,
      valueInputOption: "USER_ENTERED",
      requestBody: { values },
    });
    res.json({ success: true });
  } catch (error: any) {
    console.error("Sheets error (wealth post):", error.message || error);
    res.status(500).json({ error: "Failed to save wealth data", details: error.message });
  }
});

app.put("/api/wealth-log/:rowIndex", requirePin, async (req, res) => {
  const { rowIndex } = req.params;
  const { values } = req.body;
  
  try {
    const auth = await getGoogleAuth();
    const { google } = await import("googleapis");
    const sheets = google.sheets({ version: "v4", auth });

    await sheets.spreadsheets.values.update({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: `wealth_log!A${rowIndex}:H${rowIndex}`,
      valueInputOption: "USER_ENTERED",
      requestBody: { values },
    });
    
    res.json({ success: true });
  } catch (error: any) {
    console.error("Sheets error (wealth put):", error.message || error);
    res.status(500).json({ error: "Failed to update wealth data", details: error.message });
  }
});

app.delete("/api/wealth-log/:rowIndex", requirePin, async (req, res) => {
  const { rowIndex } = req.params;
  
  try {
    const auth = await getGoogleAuth();
    const { google } = await import("googleapis");
    const sheets = google.sheets({ version: "v4", auth });

    await sheets.spreadsheets.values.clear({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: `wealth_log!A${rowIndex}:H${rowIndex}`,
    });
    
    res.json({ success: true });
  } catch (error: any) {
    console.error("Sheets error (wealth delete):", error.message || error);
    res.status(500).json({ error: "Failed to delete wealth data", details: error.message });
  }
});

app.get("/api/wealth-config", requirePin, async (req, res) => {
  try {
    const auth = await getGoogleAuth();
    const { google } = await import("googleapis");
    const sheets = google.sheets({ version: "v4", auth });
    
    await ensureSheet(sheets, process.env.GOOGLE_SHEET_ID as string, 'wealth_config', ["Key", "Value"]);
    
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: `wealth_config!A:B`,
    });
    
    res.json(response.data.values || []);
  } catch (error: any) {
    console.error("Sheets error (wealth-config):", error.message || error);
    res.status(500).json({ error: "Failed to fetch wealth config", details: error.message });
  }
});

app.put("/api/wealth-config", requirePin, async (req, res) => {
  const { key, value } = req.body;
  try {
    const auth = await getGoogleAuth();
    const { google } = await import("googleapis");
    const sheets = google.sheets({ version: "v4", auth });
    
    await ensureSheet(sheets, process.env.GOOGLE_SHEET_ID as string, 'wealth_config', ["Key", "Value"]);
    
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: `wealth_config!A:B`,
    });
    
    const values = response.data.values || [];
    let rowIndex = -1;
    for (let i = 0; i < values.length; i++) {
        if (values[i][0] === key) {
            rowIndex = i + 1;
            break;
        }
    }

    if (rowIndex !== -1) {
        await sheets.spreadsheets.values.update({
            spreadsheetId: process.env.GOOGLE_SHEET_ID,
            range: `wealth_config!B${rowIndex}`,
            valueInputOption: "USER_ENTERED",
            requestBody: { values: [[value.toString()]] },
        });
    } else {
        await sheets.spreadsheets.values.append({
            spreadsheetId: process.env.GOOGLE_SHEET_ID,
            range: `wealth_config!A:B`,
            valueInputOption: "USER_ENTERED",
            requestBody: { values: [[key, value.toString()]] },
        });
    }
    res.json({ success: true });
  } catch (error: any) {
    console.error("Sheets error (wealth-config update):", error.message || error);
    res.status(500).json({ error: "Failed to update wealth config", details: error.message });
  }
});

app.get("/api/stock-price", requirePin, async (req, res) => {
  const symbol = req.query.symbol as string;
  if (!symbol) return res.status(400).json({ error: "Symbol is required" });

  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1y`;
    const response = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    const data = await response.json() as any;

    if (!data.chart || !data.chart.result || data.chart.result.length === 0) {
      throw new Error("Symbol not found");
    }

    const result = data.chart.result[0];
    const prices = result.indicators.quote[0].close || [];
    const timestamps = result.timestamp || [];
    
    // Filter out nulls
    const validPrices = prices.filter((p: any) => p !== null);

    if (validPrices.length === 0) throw new Error("No pricing data found");

    const currentPrice = validPrices[validPrices.length - 1];
    
    // Calculate MA200 if we have enough points
    let ma200 = 0;
    if (validPrices.length >= 200) {
      const last200 = validPrices.slice(-200);
      ma200 = last200.reduce((a: number, b: number) => a + b, 0) / 200;
    } else {
        // Fallback to average of available points if less than 200
        ma200 = validPrices.reduce((a: number, b: number) => a + b, 0) / validPrices.length;
    }

    const prevPrice = validPrices.length > 1 ? validPrices[validPrices.length - 2] : currentPrice;
    const changePercent = ((currentPrice - prevPrice) / prevPrice) * 100;

    res.json({
      symbol,
      currentPrice,
      ma200,
      changePercent,
      lastUpdated: timestamps.length > 0 ? new Date(timestamps[timestamps.length - 1] * 1000).toISOString() : new Date().toISOString()
    });
  } catch (error: any) {
    console.error("Stock price error:", error.message);
    res.status(500).json({ error: "Failed to fetch stock price", details: error.message });
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

if (isProd) {
  // SPA fallback - must be last
  app.get("*", (req, res, next) => {
    // Don't fallback for API routes or files that should have been caught by express.static
    if (req.path.startsWith('/api') || req.path.includes('.')) return next();
    
    res.sendFile(path.join(distPath, "index.html"), (err) => {
      if (err) {
        res.status(404).send("Application not built. Please run 'npm run build'.");
      }
    });
  });
}

export default app;

if (!isProd) {
  startServer();
}
