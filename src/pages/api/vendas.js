import { getSheetByTitle } from "@/lib/sheets";

function str(v) {
  return String(v ?? "").trim();
}

function normBool(v) {
  if (typeof v === "boolean") return v;
  const s = String(v ?? "").toLowerCase().trim();
  return s === "true" || s === "1" || s === "sim" || s === "yes";
}

function parseNumberBR(v) {
  if (v === null || v === undefined || v === "") return 0;
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  const s = String(v).trim().replace(/\./g, "").replace(",", ".");
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export default async function handler(req, res) {
  try {
    // ===== GET: LISTAR VENDAS + ITENS =====
    if (req.method === "GET") {
      const { date, limit } = req.query || {};
      const lim = Math.min(Math.max(parseInt(limit || "50", 10) || 50, 1), 500);

      const sheetVendas = await getSheetByTitle("vendas");
      const sheetVendaItens = await getSheetByTitle("venda_itens");

      const vendaRows = await sheetVendas.getRows();
      const itensRows = await sheetVendaItens.getRows();

      let vendas = vendaRows.map((r) => ({
        id: str(r.get("id")),
        data: str(r.get("data")),
        total: parseNumberBR(r.get("total")),
        forma_pagamento: str(r.get("forma_pagamento")),
        observacao: str(r.get("observacao")),
      }));

      // filtra por data se vier
      if (date) {
        vendas = vendas.filter((v) => v.data === String(date));
      }

      // ordena mais recente primeiro (por id timestamp)
      vendas.sort((a, b) => Number(b.id) - Number(a.id));

      // limita
      vendas = vendas.slice(0, lim);

      // indexa itens por venda_id
      const itensPorVenda = new Map();
      for (const r of itensRows) {
        const venda_id = str(r.get("venda_id"));
        if (!venda_id) continue;

        const item = {
          venda_id,
          produto_id: str(r.get("produto_id")),
          produto_nome: str(r.get("produto_nome")),
          qtd: parseNumberBR(r.get("qtd")),
          preco_unit: parseNumberBR(r.get("preco_unit")),
          custo_unit: parseNumberBR(r.get("custo_unit")),
          subtotal: parseNumberBR(r.get("subtotal")),
        };

        if (!itensPorVenda.has(venda_id)) itensPorVenda.set(venda_id, []);
        itensPorVenda.get(venda_id).push(item);
      }

      const vendasComItens = vendas.map((v) => ({
        ...v,
        itens: itensPorVenda.get(v.id) || [],
      }));

      return res.status(200).json({ ok: true, vendas: vendasComItens });
    }

    // ===== POST: CRIAR VENDA (igual ao que você já usou) =====
    if (req.method === "POST") {
      const { itens, forma_pagamento, observacao, data } = req.body || {};

      if (!Array.isArray(itens) || itens.length === 0) {
        return res.status(400).json({ ok: false, error: "Envie pelo menos 1 item." });
      }

      const vendaData = str(data) || todayISO();
      const vendaId = String(Date.now());

      const sheetProdutos = await getSheetByTitle("produtos");
      const sheetVendas = await getSheetByTitle("vendas");
      const sheetVendaItens = await getSheetByTitle("venda_itens");

      const prodRows = await sheetProdutos.getRows();

      const itensDetalhados = itens.map((it) => {
        const produto_id = str(it?.produto_id);
        const qtd = parseNumberBR(it?.qtd);

        if (!produto_id) throw new Error("Item sem produto_id.");
        if (!qtd || qtd <= 0) throw new Error(`Quantidade inválida no produto ${produto_id}.`);

        const row = prodRows.find((r) => str(r.get("id")) === produto_id);
        if (!row) throw new Error(`Produto não encontrado: ${produto_id}`);

        const ativo = normBool(row.get("ativo"));
        if (!ativo) throw new Error(`Produto inativo: ${str(row.get("nome")) || produto_id}`);

        const nome = str(row.get("nome"));
        const preco_unit = parseNumberBR(row.get("preco"));
        const custo_unit = parseNumberBR(row.get("custo"));
        const estoqueAtual = parseNumberBR(row.get("estoque"));

        if (estoqueAtual < qtd) {
          throw new Error(`Estoque insuficiente: ${nome} (tem ${estoqueAtual}, pediu ${qtd})`);
        }

        const subtotal = qtd * preco_unit;

        return {
          produto_id,
          produto_nome: nome,
          qtd,
          preco_unit,
          custo_unit,
          subtotal,
          _row: row,
          _estoqueAtual: estoqueAtual,
        };
      });

      const total = itensDetalhados.reduce((acc, it) => acc + it.subtotal, 0);

      await sheetVendas.addRow({
        id: vendaId,
        data: vendaData,
        total: total,
        forma_pagamento: str(forma_pagamento) || "nao_informado",
        observacao: str(observacao),
      });

      for (const it of itensDetalhados) {
        await sheetVendaItens.addRow({
          venda_id: vendaId,
          produto_id: it.produto_id,
          produto_nome: it.produto_nome,
          qtd: it.qtd,
          preco_unit: it.preco_unit,
          custo_unit: it.custo_unit,
          subtotal: it.subtotal,
        });
      }

      for (const it of itensDetalhados) {
        const novo = it._estoqueAtual - it.qtd;
        it._row.set("estoque", novo);
        await it._row.save();
      }

      return res.status(200).json({
        ok: true,
        venda: {
          id: vendaId,
          data: vendaData,
          total,
          itens: itensDetalhados.map((x) => ({
            produto_id: x.produto_id,
            produto_nome: x.produto_nome,
            qtd: x.qtd,
            preco_unit: x.preco_unit,
            subtotal: x.subtotal,
          })),
        },
      });
    }

    return res.status(405).json({ ok: false, error: "Use GET ou POST" });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message || "Erro interno" });
  }
}
