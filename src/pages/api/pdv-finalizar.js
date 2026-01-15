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

function normBool(v) {
  if (typeof v === "boolean") return v;
  const s = String(v ?? "").toLowerCase().trim();
  return s === "true" || s === "1" || s === "sim" || s === "yes";
}

function rowCell(row, idx) {
  return row?._rawData?.[idx] ?? "";
}

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ ok: false, error: "Use POST" });
    }

    const body = req.body || {};
    const forma_pagamento = String(body.forma_pagamento || "nao_informado").trim();
    const observacao = String(body.observacao || "").trim();
    const itens = Array.isArray(body.itens) ? body.itens : [];
    const baixarEstoque = body.baixarEstoque !== false; // default true

    if (itens.length === 0) {
      return res.status(400).json({ ok: false, error: "Carrinho vazio." });
    }

    for (const it of itens) {
      const pid = String(it.produto_id || "").trim();
      const qtd = Number(it.qtd || 0);
      if (!pid) return res.status(400).json({ ok: false, error: "Item sem produto_id" });
      if (!Number.isFinite(qtd) || qtd <= 0) {
        return res.status(400).json({ ok: false, error: "Quantidade inválida em um item." });
      }
    }

    const vendasSheet = await getSheetByTitle("vendas");
    const itensSheet = await getSheetByTitle("venda_itens");
    const produtosSheet = await getSheetByTitle("produtos");

    // produtos por coluna (não depende do nome do cabeçalho)
    // A:id B:nome C:preco D:custo E:estoque F:ativo G:criado_em
    const prodRows = await produtosSheet.getRows();

    const prodById = new Map();
    for (const r of prodRows) {
      const id = String(rowCell(r, 0)).trim();
      if (!id) continue;

      const nome = String(rowCell(r, 1)).trim();
      const preco = toNumberBR(rowCell(r, 2));
      const custo = toNumberBR(rowCell(r, 3));
      const estoqueRaw = String(rowCell(r, 4)).trim();
      const ativo = normBool(rowCell(r, 5));

      prodById.set(id, {
        row: r,
        id,
        nome,
        preco,
        custo,
        estoqueRaw,
        ativo,
      });
    }

    const vendaId = String(Date.now());
    const data = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Sao_Paulo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
}).format(new Date());

    let total = 0;
    const itensParaSalvar = [];

    for (const it of itens) {
      const pid = String(it.produto_id).trim();
      const qtd = Number(it.qtd || 0);

      const p = prodById.get(pid);
      if (!p) {
        return res.status(400).json({
          ok: false,
          error: `Produto não encontrado no Sheets (id=${pid}). Confira a coluna A (id) na aba produtos.`,
        });
      }
      if (!p.ativo) {
        return res.status(400).json({ ok: false, error: `Produto inativo: ${p.nome || pid}` });
      }

      const preco_unit = toNumberBR(it.preco_unit ?? p.preco);
      const custo_unit = toNumberBR(it.custo_unit ?? p.custo);
      const subtotal = preco_unit * qtd;

      total += subtotal;

      itensParaSalvar.push({
        venda_id: vendaId,
        produto_id: pid,
        produto_nome: p.nome,
        qtd,
        preco_unit,
        custo_unit,
        subtotal,
      });
    }

    // salva venda
    await vendasSheet.addRow({
      id: vendaId,
      data,
      total,
      forma_pagamento,
      observacao,
    });

    // salva itens
    for (const it of itensParaSalvar) {
      await itensSheet.addRow({
        venda_id: it.venda_id,
        produto_id: it.produto_id,
        produto_nome: it.produto_nome,
        qtd: it.qtd,
        preco_unit: it.preco_unit,
        custo_unit: it.custo_unit,
        subtotal: it.subtotal,
      });
    }

    // baixa estoque (se tiver número)
    if (baixarEstoque) {
      for (const it of itensParaSalvar) {
        const p = prodById.get(it.produto_id);
        if (!p) continue;

        // se estoque estiver vazio, não mexe
        if (!p.estoqueRaw) continue;

        const atual = toNumberBR(p.estoqueRaw);
        const novo = Math.max(0, atual - Number(it.qtd || 0));

        // coluna E (estoque)
        p.row._rawData[4] = String(novo);
        await p.row.save();
      }
    }

    return res.status(200).json({ ok: true, vendaId, data, total });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message || "Erro interno" });
  }
}
