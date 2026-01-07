import { getSheetByTitle } from "@/lib/sheets";

function rowCell(row, idx) {
  return row?._rawData?.[idx] ?? "";
}

export default async function handler(req, res) {
  try {
    const sheet = await getSheetByTitle("usuarios");
    const rows = await sheet.getRows();

    const sample = rows.slice(0, 10).map((r) => ({
      usuario_colA: String(rowCell(r, 0)).trim(),
      hash_colB_len: String(rowCell(r, 1)).trim().length,
      role_colC: String(rowCell(r, 2)).trim(),
      ativo_colD: String(rowCell(r, 3)).trim(),
      raw: r._rawData,
    }));

    return res.status(200).json({ ok: true, count: rows.length, sample });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
}
