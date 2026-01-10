import { GoogleSpreadsheet } from "google-spreadsheet";
import { JWT } from "google-auth-library";

function getAuth() {
 const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;

  const key = (process.env.GOOGLE_PRIVATE_KEY || "")
    .trim()
    // remove aspas caso a Vercel tenha salvo "..."
    .replace(/^"+|"+$/g, "")
    // aceita tanto \n literal quanto quebra real
    .replace(/\\n/g, "\n")
    .replace(/\r\n/g, "\n");

  const sheetId = process.env.GOOGLE_SHEET_ID;

  if (!email || !key || !sheetId) {
    throw new Error("Credenciais do Google não configuradas");
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
