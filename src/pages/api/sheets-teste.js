import { getDoc } from "../../lib/sheets";

export default async function handler(req, res) {
  try {
    const doc = await getDoc();
    const abas = Object.values(doc.sheetsByTitle).map((s) => s.title);
    res.status(200).json({ ok: true, planilha: doc.title, abas });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
}
