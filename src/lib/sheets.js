import { GoogleSpreadsheet } from "google-spreadsheet";
import { JWT } from "google-auth-library";

function getAuth() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = (process.env.GOOGLE_PRIVATE_KEY || "").replace(/\\n/g, "\n");

  if (!email || !key) {
    throw new Error("Credenciais do Google não configuradas no .env.local");
  }

  return new JWT({
    email,
    key,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
}

export async function getSheetByTitle(title) {
  const sheetId = process.env.GOOGLE_SHEET_ID;
  if (!sheetId) throw new Error("GOOGLE_SHEET_ID não configurado no .env.local");

  const doc = new GoogleSpreadsheet(sheetId, getAuth());
  await doc.loadInfo();

  const sheet = doc.sheetsByTitle[title];
  if (!sheet) throw new Error(`Aba '${title}' não encontrada na planilha`);

  return sheet;
}
