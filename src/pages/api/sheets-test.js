import { getDoc } from "../../lib/sheets";

export default async function handler(req, res) {
  try {
    const doc = await getDoc();

    const sheetNames = Object.values(doc.sheetsByTitle).map(
      (s) => s.title
    );

    res.status(200).json({
      ok: true,
      planilha: doc.title,
      abas: sheetNames,
    });
  } catch (err) {
    res.status(500).json({
      ok: false,
      error: err.message,
    });
  }
}
