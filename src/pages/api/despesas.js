import { getSheetByTitle } from "@/lib/sheets";

// ---------- utils ----------
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

function normalizeDate(v) {
  if (!v) return "";

  // Date object -> YYYY-MM-DD no fuso de SP
  if (v instanceof Date && !isNaN(v.getTime())) {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Sao_Paulo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(v);
  }

  const s = String(v).trim();
  if (!s) return "";

  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

  // DD/MM/YYYY
  const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;

  // ISO com hora -> pega só a data
  const iso = s.match(/^(\d{4}-\d{2}-\d{2})/);
  if (iso) return iso[1];

  return "";
}

export default async function handler(req, res) {
  try {
    const sheet = await getSheetByTitle("despesas");

    // =====================
    // LISTAR (GET)
    // =====================
    if (req.method === "GET") {
      const rows = await sheet.getRows();

      // A=id | B=data | C=categoria | D=descricao | E=valor
      const despesas = rows
        .map((r) => ({
          id: String(rowCell(r, 0)).trim(),        // A: id
          data: normalizeDate(rowCell(r, 1)),      // B: data
          categoria: String(rowCell(r, 2)).trim(), // C: categoria
          descricao: String(rowCell(r, 3)).trim(), // D: descricao
          valor: toNumberBR(rowCell(r, 4)),        // E: valor
        }))
        .filter((d) => d.id && d.data); // mantém tudo que tem id e data

      return res.status(200).json({ ok: true, despesas });
    }

    // =====================
    // CRIAR (POST)
    // =====================
    if (req.method === "POST") {
      const { data, descricao, valor, categoria } = req.body || {};

      if (!data || !descricao || valor === undefined || valor === null || valor === "") {
        return res
          .status(400)
          .json({ ok: false, error: "Preencha data, descrição e valor." });
      }

      await sheet.addRow({
        id: String(Date.now()),
        data: normalizeDate(data),
        categoria: String(categoria || "").trim(),
        descricao: String(descricao).trim(),
        valor: toNumberBR(valor),
      });

      return res.status(200).json({ ok: true });
    }

    // =====================
    // EDITAR (PUT)
    // =====================
    if (req.method === "PUT") {
      const { id } = req.query || {};
      const { data, descricao, valor, categoria } = req.body || {};

      if (!id) {
        return res.status(400).json({ ok: false, error: "Informe o id." });
      }

      if (!data || !descricao || valor === undefined || valor === null || valor === "") {
        return res
          .status(400)
          .json({ ok: false, error: "Preencha data, descrição e valor." });
      }

      const rows = await sheet.getRows();
      const row = rows.find((r) => String(rowCell(r, 0)).trim() === String(id).trim());

      if (!row) {
        return res.status(404).json({ ok: false, error: "Despesa não encontrada." });
      }

      // Atualiza respeitando as colunas
      // A=id | B=data | C=categoria | D=descricao | E=valor
      row._rawData[1] = normalizeDate(data);               // B
      row._rawData[2] = String(categoria || "").trim();    // C
      row._rawData[3] = String(descricao || "").trim();    // D
      row._rawData[4] = toNumberBR(valor);                 // E

      await row.save();
      return res.status(200).json({ ok: true });
    }

    // =====================
    // REMOVER (DELETE)
    // =====================
    if (req.method === "DELETE") {
      const { id } = req.query || {};

      if (!id) {
        return res.status(400).json({ ok: false, error: "Informe o id." });
      }

      const rows = await sheet.getRows();
      const row = rows.find((r) => String(rowCell(r, 0)).trim() === String(id).trim());

      if (!row) {
        return res.status(404).json({ ok: false, error: "Despesa não encontrada." });
      }

      await row.delete();
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ ok: false, error: "Método não permitido" });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message || "Erro interno" });
  }
}
