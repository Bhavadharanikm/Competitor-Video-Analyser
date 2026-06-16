import { google } from "googleapis";
import { NextResponse } from "next/server";

const SPREADSHEET_ID = "12U6x0wYO5TFkoEzEKx1oJfzKLQv1sm5TgDsQGRlfLaI";
const SHEET_GID = 303378926;

export async function GET() {
  try {
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      },
      scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
    });

    const sheets = google.sheets({ version: "v4", auth });

    // Find the sheet tab name from gid
    const meta = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
    const tab = meta.data.sheets?.find(
      (s) => s.properties?.sheetId === SHEET_GID
    );
    const range = tab?.properties?.title ?? "Sheet1";

    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range,
    });

    const rows = res.data.values ?? [];
    const headers = rows[0] ?? [];
    const data = rows.slice(1).map((row) => {
      const obj: Record<string, string> = {};
      headers.forEach((h: string, i: number) => { obj[h] = row[i] ?? ""; });
      return obj;
    });

    return NextResponse.json({ headers, rows: data });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
