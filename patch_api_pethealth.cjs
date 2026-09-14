const fs = require('fs');
let data = fs.readFileSync('api/index.ts', 'utf8');

const target = `// --- Wealth Endpoints ---`;
const replacement = `// --- Pet Health Endpoints ---
app.get("/api/pet-health", requirePin, async (req, res) => {
  try {
    const auth = await getGoogleAuth();
    const { google } = await import("googleapis");
    const sheets = google.sheets({ version: "v4", auth });
    
    await ensureSheet(sheets, process.env.GOOGLE_SHEET_ID as string, 'pet_health', ["Type", "LastConsumed", "FrequencyMonths"]);
    
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: \`pet_health!A:C\`,
    });
    
    let data = [];
    if (response.data.values && response.data.values.length > 1) {
      data = response.data.values.slice(1).map((row: any, index: number) => ({
        rowIndex: index + 2,
        type: row[0],
        lastConsumed: row[1] || '',
        frequencyMonths: parseFloat(row[2]) || 0
      }));
    } else {
      // Seed default data if empty
      const defaultData = [
        ["Deworm", "2026-09-13", "3"],
        ["Kutu", "2026-09-13", "1"],
        ["Heart Pill", "2026-08-20", "1"],
        ["Vaccine", "2026-06-30", "12"]
      ];
      await sheets.spreadsheets.values.append({
        spreadsheetId: process.env.GOOGLE_SHEET_ID,
        range: \`pet_health!A:C\`,
        valueInputOption: "USER_ENTERED",
        requestBody: { values: defaultData },
      });
      data = defaultData.map((row, index) => ({
        rowIndex: index + 2,
        type: row[0],
        lastConsumed: row[1],
        frequencyMonths: parseFloat(row[2])
      }));
    }
    
    res.json(data);
  } catch (error: any) {
    console.error("Sheets error:", error.message || error);
    res.status(500).json({ error: "Failed to fetch pet health data", details: error.message });
  }
});

app.put("/api/pet-health/:row", requirePin, async (req, res) => {
  const row = parseInt(req.params.row);
  const { lastConsumed } = req.body;
  
  try {
    const auth = await getGoogleAuth();
    const { google } = await import("googleapis");
    const sheets = google.sheets({ version: "v4", auth });
    
    await sheets.spreadsheets.values.update({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: \`pet_health!B\${row}\`,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [[lastConsumed]] },
    });
    
    res.json({ success: true });
  } catch (error: any) {
    console.error("Sheets error:", error.message || error);
    res.status(500).json({ error: "Failed to update pet health data", details: error.message });
  }
});

// --- Wealth Endpoints ---`;

data = data.replace(target, replacement);
fs.writeFileSync('api/index.ts', data);
