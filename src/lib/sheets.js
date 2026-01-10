import { GoogleSpreadsheet } from "google-spreadsheet";
import { JWT } from "google-auth-library";

function getAuth() {
  const b64 = process.env.GOOGLE_SERVICE_ACCOUNT_JSON_B64;

  if (!b64) {
    throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON_B64 não configurado");
  }

  const json = JSON.parse(Buffer.from(b64, "base64").toString("utf8"));

  const email = json.client_email;
  const key = (json.private_key || "").replace(/\\n/g, "\n");

  if (!email || !key) {
    throw new Error("Credenciais do Google inválidas");
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
