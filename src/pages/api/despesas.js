import { getSheetByTitle } from "@/lib/sheets";

function toNumberBR(v) {
  if (v === null || v === undefined) return 0;
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;

  const s = String(v).trim();
  if (!s) return 0;

  const clean = s
    .replace(/\s/g, "")
    .replace("R$", "")
    .replace(/\./g, "")
    .replace(",", ".");

  const n = Number(clean);
  return Number.isFinite(n) ? n : 0;
}

function rowCell(row, idx) {
  return row?._rawData?.[idx] ?? "";
}

export default async function handler(req, res) {
  try {
    const sheet = await getSheetByTitle("despesas");

    // LISTAR
    if (req.method === "GET") {
      const rows = await sheet.getRows();
      const despesas = rows
  .map((r) => ({
    id: String(rowCell(r, 0)).trim(),
    data: normalizeDate(rowCell(r, 1)), // 👈 AQUI É O PONTO-CHAVE
    descricao: String(rowCell(r, 2)).trim(),
    valor: toNumberBR(rowCell(r, 3)),
    categoria: String(rowCell(r, 4)).trim(),
  }))
  .filter((d) => d.data && d.valor > 0);

      return res.status(200).json({ ok: true, despesas });
    }

    // CRIAR
    if (req.method === "POST") {
      const { data, descricao, valor, categoria } = req.body || {};

      if (!data || !descricao || !valor) {
        return res
          .status(400)
          .json({ ok: false, error: "Preencha data, descrição e valor." });
      }

      await sheet.addRow({
        id: String(Date.now()),
        data,
        descricao: String(descricao).trim(),
        valor: toNumberBR(valor),
        categoria: String(categoria || "").trim(),
      });

      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ ok: false, error: "Método não permitido" });
  } catch (e) {
    return res
      .status(500)
      .json({ ok: false, error: e.message || "Erro interno" });
  }
}
