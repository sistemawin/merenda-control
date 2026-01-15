export const config = {
  api: {
    responseLimit: false,
    bodyParser: false,
  },
};

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

function toInt(v) {
  const n = Math.floor(toNumberBR(v));
  return Number.isFinite(n) ? n : 0;
}

function normalizeDate(v) {
  if (!v) return "";
  if (v instanceof Date && !isNaN(v.getTime())) function daysAgoISO(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);

  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

  const s = String(v).trim();
  if (!s) return "";

  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

  // DD/MM/YYYY
  const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;

  // ISO with time
  const iso = s.match(/^(\d{4}-\d{2}-\d{2})/);
  if (iso) return iso[1];

  return "";
}

function inRange(dateISO, startISO, endISO) {
  if (!dateISO) return false;
  if (startISO && dateISO < startISO) return false;
  if (endISO && dateISO > endISO) return false;
  return true;
}

function rowCell(row, idx) {
  return row?._rawData?.[idx] ?? "";
}

function daysAgoISO(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);

  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}


export default async function handler(req, res) {
  try {
    if (req.method !== "GET") {
      return res.status(405).json({ ok: false, error: "Use GET" });
    }

    // filtros:
    // - start=YYYY-MM-DD&end=YYYY-MM-DD
    // - preset=7|30|90 (ignora start/end se preset existir)
    const preset = String(req.query?.preset || "").trim(); // "7"|"30"|"90"
    let start = normalizeDate(req.query?.start);
    let end = normalizeDate(req.query?.end);

    if (preset === "0") {
  const hoje = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

  start = hoje;
  end = hoje; // somente hoje (não pega ontem/amanhã)
} else if (preset === "7" || preset === "30" || preset === "90") {
  start = daysAgoISO(Number(preset));
  end = ""; // até hoje
}

    const vendasSheet = await getSheetByTitle("vendas");
    const itensSheet = await getSheetByTitle("venda_itens");

    let despesasSheet = null;
    try {
      despesasSheet = await getSheetByTitle("despesas");
    } catch {}

    // ---------- VENDAS (A:id B:data C:total D:forma E:obs) ----------
    const vendasRows = await vendasSheet.getRows();
    const vendasAll = vendasRows.map((r) => ({
      id: String(rowCell(r, 0)).trim(),
      data: normalizeDate(rowCell(r, 1)),
      total: toNumberBR(rowCell(r, 2)),
      forma_pagamento: String(rowCell(r, 3)).trim(),
      observacao: String(rowCell(r, 4)).trim(),
    }));

    const vendas = vendasAll
      .filter((v) => v.id && v.data && v.total > 0)
      .filter((v) => inRange(v.data, start, end));

    const vendaIdToDate = new Map(vendas.map((v) => [v.id, v.data]));

    // ---------- ITENS (A:venda_id B:produto_id C:nome D:qtd E:preco F:custo G:subtotal) ----------
    const itensRows = await itensSheet.getRows();
    const itens = itensRows
      .map((r) => ({
        venda_id: String(rowCell(r, 0)).trim(),
        produto_id: String(rowCell(r, 1)).trim(),
        produto_nome: String(rowCell(r, 2)).trim(),
        qtd: toInt(rowCell(r, 3)),
        preco_unit: toNumberBR(rowCell(r, 4)),
        custo_unit: toNumberBR(rowCell(r, 5)),
      }))
      .filter((it) => it.venda_id && vendaIdToDate.has(it.venda_id));

    // ---------- DESPESAS (A:id B:data C:cat D:desc E:valor) ----------
    let despesas = [];
    if (despesasSheet) {
      const despesasRows = await despesasSheet.getRows();
      despesas = despesasRows
        .map((r) => ({
          id: String(rowCell(r, 0)).trim(),
          data: normalizeDate(rowCell(r, 1)),
          categoria: String(rowCell(r, 2)).trim(),
          descricao: String(rowCell(r, 3)).trim(),
          valor: toNumberBR(rowCell(r, 4)),
        }))
        .filter((d) => d.data && d.valor > 0)
        .filter((d) => inRange(d.data, start, end));
    }

    // ---------- MÉTRICAS ----------
    const vendasCount = vendas.length;
    const faturamento = vendas.reduce((a, v) => a + v.total, 0);
    const custoProdutos = itens.reduce((a, it) => a + it.custo_unit * it.qtd, 0);
    const totalDespesas = despesas.reduce((a, d) => a + d.valor, 0);

    const lucro = faturamento - custoProdutos - totalDespesas;
    const bilheteMedio = vendasCount > 0 ? faturamento / vendasCount : 0;
    const margemLucro = faturamento > 0 ? (lucro / faturamento) * 100 : 0;

    // ---------- RESUMO POR DIA ----------
    const porDia = new Map();
    function ensureDia(d) {
      if (!porDia.has(d)) {
        porDia.set(d, {
          data: d,
          vendas: 0,
          faturamento: 0,
          despesas: 0,
          custo: 0,
          lucro: 0,
        });
      }
      return porDia.get(d);
    }

    for (const v of vendas) {
      const o = ensureDia(v.data);
      o.vendas += 1;
      o.faturamento += v.total;
    }

    for (const it of itens) {
      const d = vendaIdToDate.get(it.venda_id);
      if (!d) continue;
      const o = ensureDia(d);
      o.custo += it.custo_unit * it.qtd;
    }

    for (const d of despesas) {
      const o = ensureDia(d.data);
      o.despesas += d.valor;
    }

    let diasNoPrejuizo = 0;
    for (const o of porDia.values()) {
      o.lucro = o.faturamento - o.custo - o.despesas;
      if (o.lucro < 0) diasNoPrejuizo++;
    }

    const resumoPorDia = Array.from(porDia.values()).sort((a, b) =>
      a.data < b.data ? -1 : 1
    );

    // ---------- MELHOR DIA (por lucro) ----------
    let melhorDia = null;
    for (const d of resumoPorDia) {
      if (!melhorDia || d.lucro > melhorDia.lucro) {
        melhorDia = { data: d.data, lucro: d.lucro, faturamento: d.faturamento };
      }
    }

    // ---------- LUCRO ACUMULADO ----------
    let acumulado = 0;
    const lucroAcumulado = resumoPorDia.map((d) => {
      acumulado += d.lucro;
      return { data: d.data, lucro_acumulado: acumulado };
    });

    // ---------- TOP PRODUTOS (no período) ----------
    const prodAgg = new Map(); // produto -> {produto,qtd,faturamento,lucro}
    for (const it of itens) {
      const key = it.produto_nome || it.produto_id || "Sem nome";
      if (!prodAgg.has(key)) prodAgg.set(key, { produto: key, qtd: 0, faturamento: 0, lucro: 0 });

      const obj = prodAgg.get(key);
      const qtd = it.qtd || 0;
      const fat = it.preco_unit * qtd;
      const cus = it.custo_unit * qtd;

      obj.qtd += qtd;
      obj.faturamento += fat;
      obj.lucro += fat - cus;
    }

    const topProdutos = Array.from(prodAgg.values())
      .sort((a, b) => b.qtd - a.qtd)
      .slice(0, 10);

    // ---------- ÚLTIMAS VENDAS (no período) ----------
    const ultimasVendas = [...vendas]
      .sort((a, b) => {
        if (a.data === b.data) return a.id < b.id ? 1 : -1;
        return a.data < b.data ? 1 : -1;
      })
      .slice(0, 10)
      .map((v) => ({
        id: v.id,
        data: v.data,
        total: v.total,
        forma_pagamento: v.forma_pagamento,
        observacao: v.observacao,
      }));

    return res.status(200).json({
      ok: true,
      filter: { start, end, preset: preset || "" },
      metrics: {
        vendas: vendasCount,
        faturamento,
        despesas: totalDespesas,
        custoProdutos,
        lucro,
        bilheteMedio,
        margemLucro,
        diasNoPrejuizo,
        lucroAcumuladoFinal: acumulado,
        melhorDia,
      },
      resumoPorDia,
      lucroAcumulado,
      topProdutos,
      ultimasVendas,
    });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message || "Erro interno" });
  }
}
