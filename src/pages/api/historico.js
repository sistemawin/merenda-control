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
    if (req.method !== "GET") {
      return res.status(405).json({ ok: false, error: "Use GET" });
    }

    const vendasSheet = await getSheetByTitle("vendas");
    const itensSheet = await getSheetByTitle("venda_itens");

    // vendas: A:id B:data C:total D:forma_pagamento E:observacao
    const vendasRows = await vendasSheet.getRows();
    const vendas = vendasRows
      .map((r) => ({
        id: String(rowCell(r, 0)).trim(),
        data: String(rowCell(r, 1)).trim(),
        total: toNumberBR(rowCell(r, 2)),
        forma_pagamento: String(rowCell(r, 3)).trim(),
        observacao: String(rowCell(r, 4)).trim(),
      }))
      .filter((v) => v.id);

    // itens: A:venda_id B:produto_id C:produto_nome D:qtd E:preco_unit F:custo_unit G:subtotal
    const itensRows = await itensSheet.getRows();
    const itens = itensRows
      .map((r) => {
        const qtd = Number(rowCell(r, 3) || 0);
        const preco_unit = toNumberBR(rowCell(r, 4));
        const subtotal_raw = toNumberBR(rowCell(r, 6));
        const subtotal = subtotal_raw || preco_unit * qtd;

        return {
          venda_id: String(rowCell(r, 0)).trim(),
          produto_id: String(rowCell(r, 1)).trim(),
          produto_nome: String(rowCell(r, 2)).trim(),
          qtd,
          preco_unit,
          subtotal,
        };
      })
      .filter((it) => it.venda_id);

    // agrupa itens por venda_id
    const itensPorVenda = new Map();
    for (const it of itens) {
      if (!itensPorVenda.has(it.venda_id)) itensPorVenda.set(it.venda_id, []);
      itensPorVenda.get(it.venda_id).push(it);
    }

    // monta histórico com itens
    const historico = vendas.map((v) => ({
      ...v,
      itens: itensPorVenda.get(v.id) || [],
    }));

    return res.status(200).json({ ok: true, historico });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message || "Erro interno" });
  }
}
