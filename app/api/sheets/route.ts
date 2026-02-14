import { NextRequest } from "next/server";
import {
  getGoogleSheetsClient,
  SPREADSHEET_ID,
} from "@/lib/google-sheets-client";

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Generate unique ID with prefix
 */
function generateId(prefix: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `${prefix}_${timestamp}_${random}`;
}

/**
 * Append row to Google Sheets
 */
async function appendToSheet(sheetName: string, values: unknown[][]) {
  const sheets = getGoogleSheetsClient();
  const response = await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetName}!A:Z`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values },
  });
  return response.data;
}

/**
 * Read rows from Google Sheets
 */
async function getSheetData(sheetName: string, range = "A2:Z") {
  const sheets = getGoogleSheetsClient();
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetName}!${range}`,
  });
  return response.data.values || [];
}

/**
 * Convert sheet rows to objects
 */
function rowsToObjects(rows: string[][], headers: string[]) {
  return rows.map((row) => {
    const obj: Record<string, unknown> = {};
    headers.forEach((header, index) => {
      obj[header] = row[index] || "";
    });
    return obj;
  });
}

/**
 * Find row index by ID
 */
async function findRowIndexById(
  sheetName: string,
  id: string,
): Promise<number | null> {
  const rows = await getSheetData(sheetName, "A2:A");
  const rowIndex = rows.findIndex((row) => row[0] === id);
  return rowIndex !== -1 ? rowIndex + 2 : null; // +2 for 1-indexed and header row
}

/**
 * Update row in Google Sheets
 */
async function updateSheetRow(
  sheetName: string,
  rowIndex: number,
  values: unknown[],
) {
  const sheets = getGoogleSheetsClient();
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetName}!A${rowIndex}:Z${rowIndex}`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [values] },
  });
}

/**
 * Delete row (hard delete - removes the row entirely)
 */
async function deleteSheetRow(sheetName: string, rowIndex: number) {
  const sheets = getGoogleSheetsClient();

  // Get sheet ID by name
  const spreadsheet = await sheets.spreadsheets.get({
    spreadsheetId: SPREADSHEET_ID,
  });
  const sheet = spreadsheet.data.sheets?.find(
    (s) => s.properties?.title === sheetName,
  );
  if (!sheet?.properties) throw new Error(`Sheet not found: ${sheetName}`);
  const sheetId = sheet!.properties!.sheetId!;

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: {
      requests: [
        {
          deleteDimension: {
            range: {
              sheetId,
              dimension: "ROWS",
              startIndex: rowIndex - 1, // 0-indexed
              endIndex: rowIndex, // exclusive
            },
          },
        },
      ],
    },
  });
}

// ============================================================================
// API HANDLERS
// ============================================================================

/**
 * GET Handler - Read data from Google Sheets
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sheet = searchParams.get("sheet");
    const action = searchParams.get("action");

    if (action === "list" && sheet) {
      const rows = await getSheetData(sheet);

      // Define headers based on sheet type
      const headers: Record<string, string[]> = {
        expenses: ["id", "date", "category", "amount", "memo", "createdAt"],
        income: ["id", "date", "category", "amount", "memo", "createdAt"],
        savings: [
          "id",
          "date",
          "category",
          "account",
          "amount",
          "memo",
          "createdAt",
        ],
        investments_transactions: [
          "id",
          "date",
          "type",
          "name",
          "investmentType",
          "amount",
          "currentPrice",
          "memo",
          "createdAt",
        ],
      };

      const data = rowsToObjects(rows, headers[sheet] || []);
      return Response.json({ success: true, data, error: null });
    }

    return Response.json(
      { success: false, data: null, error: "Invalid parameters" },
      { status: 400 },
    );
  } catch (error) {
    console.error("Sheets API GET error:", error);
    return Response.json(
      {
        success: false,
        data: null,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

/**
 * POST Handler - Create, Update, Delete operations
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sheet, action, id, ...data } = body;

    // ========================================================================
    // CREATE Operation
    // ========================================================================
    if (action === "create") {
      const timestamp = new Date().toISOString();
      let row: unknown[];

      // Map form data to sheet row based on sheet type
      switch (sheet) {
        case "expenses":
          row = [
            generateId("EXP"),
            data.date,
            data.category,
            data.amount,
            data.memo || "",
            timestamp,
          ];
          break;

        case "income":
          row = [
            generateId("INC"),
            data.date,
            data.category,
            data.amount,
            data.memo || "",
            timestamp,
          ];
          break;

        case "savings":
          row = [
            generateId("SAV"),
            data.date,
            data.category,
            data.account || "",
            data.amount,
            data.memo || "",
            timestamp,
          ];
          break;

        case "investments_transactions":
          row = [
            generateId("INV"),
            data.date,
            data.type,
            data.name,
            data.investmentType,
            data.amount,
            data.currentPrice || "",
            data.memo || "",
            timestamp,
          ];
          break;

        default:
          return Response.json(
            { success: false, data: null, error: `Unknown sheet: ${sheet}` },
            { status: 400 },
          );
      }

      await appendToSheet(sheet, [row]);
      return Response.json({ success: true, data: null, error: null });
    }

    // ========================================================================
    // UPDATE Operation
    // ========================================================================
    if (action === "update") {
      const rowIndex = await findRowIndexById(sheet, id);
      if (!rowIndex) {
        return Response.json(
          { success: false, data: null, error: "Entry not found" },
          { status: 404 },
        );
      }

      let row: unknown[];
      switch (sheet) {
        case "expenses":
          row = [
            id,
            data.date,
            data.category,
            data.amount,
            data.memo || "",
            data.createdAt,
          ];
          break;

        case "income":
          row = [
            id,
            data.date,
            data.category,
            data.amount,
            data.memo || "",
            data.createdAt,
          ];
          break;

        case "savings":
          row = [
            id,
            data.date,
            data.category,
            data.account || "",
            data.amount,
            data.memo || "",
            data.createdAt,
          ];
          break;

        case "investments_transactions":
          row = [
            id,
            data.date,
            data.type,
            data.name,
            data.investmentType,
            data.amount,
            data.currentPrice || "",
            data.memo || "",
            data.createdAt,
          ];
          break;

        default:
          return Response.json(
            { success: false, data: null, error: `Unknown sheet: ${sheet}` },
            { status: 400 },
          );
      }

      await updateSheetRow(sheet, rowIndex, row);
      return Response.json({ success: true, data: null, error: null });
    }

    // ========================================================================
    // DELETE Operation
    // ========================================================================
    if (action === "delete") {
      const rowIndex = await findRowIndexById(sheet, id);
      if (!rowIndex) {
        return Response.json(
          { success: false, data: null, error: "Entry not found" },
          { status: 404 },
        );
      }

      await deleteSheetRow(sheet, rowIndex);
      return Response.json({ success: true, data: null, error: null });
    }

    return Response.json(
      { success: false, data: null, error: `Unknown action: ${action}` },
      { status: 400 },
    );
  } catch (error) {
    console.error("Sheets API POST error:", error);
    return Response.json(
      {
        success: false,
        data: null,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

// Enable dynamic rendering (disable caching)
export const dynamic = "force-dynamic";
