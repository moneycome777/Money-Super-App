const fs = require('fs');
let data = fs.readFileSync('api/index.ts', 'utf8');

const target = `app.put("/api/expenses/:row/clear", requirePin, async (req, res) => {`;
const replacement = `app.put("/api/expenses/:row/fund", requirePin, async (req, res) => {
  const row = parseInt(req.params.row);

  try {
    const auth = await getGoogleAuth();
    const { google } = await import("googleapis");
    const sheets = google.sheets({ version: "v4", auth });
    
    await sheets.spreadsheets.values.update({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: \`\${SHEET_NAME}!O\${row}\`,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [["TRUE"]] },
    });

    res.json({ success: true });
  } catch (error: any) {
    console.error("Sheets error:", error.message || error);
    res.status(500).json({ error: "Failed to update data", details: error.message });
  }
});

app.put("/api/expenses/:row/clear", requirePin, async (req, res) => {`;

data = data.replace(target, replacement);
fs.writeFileSync('api/index.ts', data);
