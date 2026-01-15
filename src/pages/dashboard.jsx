import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

function money(n) {
  const v = Number(n || 0);
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function percent(n) {
  return `${Number(n || 0).toFixed(1)}%`;
}

// dd/mm/aaaa -> yyyy-mm-dd
function toISOFromBR(s) {
  if (!s) return "";
  const m = String(s).trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return "";
  return `${m[3]}-${m[2]}-${m[1]}`;
}

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");
  const [data, setData] = useState(null);

  // filtros manuais
  const [startBR, setStartBR] = useState(""); // dd/mm/aaaa
  const [endBR, setEndBR] = useState(""); // dd/mm/aaaa

  // preset rápido
  const [preset, setPreset] = useState("0"); // 0 | 7 | 30 | 90 | all | manual

  async function carregar(
  { mode = "preset", presetOverride } = {}
) {
    setLoading(true);
    setErro("");
    try {
      let url = "/api/dashboard";
      const p = presetOverride ?? preset;

      if (mode === "manual") {
        const start = toISOFromBR(startBR);
        const end = toISOFromBR(endBR);
        const qs = [];
        if (start) qs.push(`start=${encodeURIComponent(start)}`);
        if (end) qs.push(`end=${encodeURIComponent(end)}`);
        if (qs.length) url += `?${qs.join("&")}`;
      } else if (mode === "preset") {
  const p = presetOverride ?? preset; // usa o override do "Hoje" se existir
  if (p !== "all") url += `?preset=${encodeURIComponent(p)}`;
}

      const r = await fetch(url, { cache: "no-store" });
      const j = await r.json();
      if (!j.ok) throw new Error(j.error || "Erro ao carregar dashboard");

      // garantir arrays
      j.resumoPorDia = Array.isArray(j.resumoPorDia) ? j.resumoPorDia : [];
      j.lucroAcumulado = Array.isArray(j.lucroAcumulado) ? j.lucroAcumulado : [];
      j.topProdutos = Array.isArray(j.topProdutos) ? j.topProdutos : [];
      j.ultimasVendas = Array.isArray(j.ultimasVendas) ? j.ultimasVendas : [];

      setData(j);
    } catch (e) {
      setErro(e.message);
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
  setPreset("0");
  carregar({ mode: "preset" }, "0");
}, []);

  const m = data?.metrics || {};
  const resumo = data?.resumoPorDia || [];
  const lucroAcumulado = data?.lucroAcumulado || [];
  const topProdutos = data?.topProdutos || [];
  const ultimasVendas = data?.ultimasVendas || [];

  return (
    <AppShell title="Painel">
      <div className="mb-4">
        <h1 className="text-xl font-semibold">Dashboard</h1>
        <p className="text-sm text-zinc-400">
          Financeiro + Operação com filtros por período
        </p>
      </div>

      {erro ? (
        <div className="mb-4 p-3 rounded-md border border-red-500/40 bg-red-500/10 text-red-200">
          {erro}
        </div>
      ) : null}

      {/* PRESETS */}
      <div className="flex flex-wrap gap-2 mb-4">
        {[
          { k: "0", label: "Hoje" },
          { k: "7", label: "7 dias" },
          { k: "30", label: "30 dias" },
          { k: "90", label: "90 dias" },
          { k: "all", label: "Tudo" },
        ].map((b) => (
          <button
            key={b.k}
            onClick={() => {
              setPreset(b.k);
              carregar({ mode: "preset", presetOverride: b.k });
            }}
            className={`px-3 py-2 rounded-md text-sm ${
              preset === b.k ? "bg-indigo-600" : "bg-zinc-800 hover:bg-zinc-700"
            }`}
            type="button"
          >
            {b.label}
          </button>
        ))}

        <button
          onClick={() => carregar({ mode: "preset" })}
          className="px-3 py-2 rounded-md text-sm bg-zinc-800 hover:bg-zinc-700"
          type="button"
        >
          Recarregar
        </button>
      </div>

      {/* FILTRO MANUAL */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
          <div>
            <label className="text-xs text-zinc-400">Início (dd/mm/aaaa)</label>
            <input
              className="mt-1 w-full rounded-md bg-zinc-950 border border-zinc-800 px-3 py-2 text-sm"
              placeholder="01/01/2026"
              value={startBR}
              onChange={(e) => setStartBR(e.target.value)}
            />
          </div>

          <div>
            <label className="text-xs text-zinc-400">Fim (dd/mm/aaaa)</label>
            <input
              className="mt-1 w-full rounded-md bg-zinc-950 border border-zinc-800 px-3 py-2 text-sm"
              placeholder="31/01/2026"
              value={endBR}
              onChange={(e) => setEndBR(e.target.value)}
            />
          </div>

          <button
            onClick={() => {
              setPreset("manual");
              carregar({ mode: "manual" });
            }}
            className="px-4 py-2 rounded-md bg-indigo-600 hover:bg-indigo-500 font-semibold text-sm"
            type="button"
          >
            Aplicar datas
          </button>

          <button
            onClick={() => {
              setStartBR("");
              setEndBR("");
              setPreset("30");
              carregar({ mode: "preset" });
            }}
            className="px-4 py-2 rounded-md bg-zinc-800 hover:bg-zinc-700 font-semibold text-sm"
            type="button"
          >
            Limpar
          </button>

          <div className="text-xs text-zinc-400">
            {data?.filter?.start || data?.filter?.end ? (
              <div>
                Período ativo:{" "}
                <span className="text-zinc-200">
                  {data.filter.start || "…"} até {data.filter.end || "hoje"}
                </span>
              </div>
            ) : (
              <div>Período ativo: padrão</div>
            )}
          </div>
        </div>
      </div>

      {/* CARDS FINANCEIROS */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-6">
        <Card title="Vendas" value={loading ? "…" : m.vendas || 0} />
        <Card title="Faturamento" value={loading ? "…" : money(m.faturamento)} />
        <Card title="Despesas" value={loading ? "…" : money(m.despesas)} />
        <Card title="Lucro" value={loading ? "…" : money(m.lucro)} />
        <Card title="Margem" value={loading ? "…" : percent(m.margemLucro)} />
        <Card
          title="Dias no prejuízo"
          value={loading ? "…" : m.diasNoPrejuizo ?? 0}
          danger
        />
      </div>

      {/* CARDS EXTRA */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card title="Bilhete médio" value={loading ? "…" : money(m.bilheteMedio)} />
        <Card
          title="Lucro acumulado"
          value={loading ? "…" : money(m.lucroAcumuladoFinal)}
        />
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-4">
          <div className="text-sm text-zinc-400">Melhor dia</div>
          <div className="text-base font-semibold mt-1">
            {m?.melhorDia ? (
              <>
                {m.melhorDia.data}{" "}
                <span className="text-sm text-zinc-400">
                  (Lucro {money(m.melhorDia.lucro)})
                </span>
              </>
            ) : (
              "—"
            )}
          </div>
        </div>
      </div>

      {/* GRÁFICO FATURAMENTO x LUCRO */}
      <Section title="Faturamento x Lucro por dia">
        <div style={{ width: "100%", height: 320 }}>
          <ResponsiveContainer>
            <LineChart data={resumo}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis dataKey="data" stroke="#a1a1aa" />
              <YAxis stroke="#a1a1aa" />
              <Tooltip formatter={(v) => money(v)} labelStyle={{ color: "#000" }} />
              <Line
                type="monotone"
                dataKey="faturamento"
                stroke="#6366f1"
                strokeWidth={2}
                name="Faturamento"
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="lucro"
                stroke="#22c55e"
                strokeWidth={2}
                name="Lucro"
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="despesas"
                stroke="#ef4444"
                strokeWidth={2}
                name="Despesas"
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Section>

      {/* GRÁFICO LUCRO ACUMULADO */}
      <Section title="Lucro acumulado">
        <div style={{ width: "100%", height: 320 }}>
          <ResponsiveContainer>
            <LineChart data={lucroAcumulado}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis dataKey="data" stroke="#a1a1aa" />
              <YAxis stroke="#a1a1aa" />
              <Tooltip formatter={(v) => money(v)} labelStyle={{ color: "#000" }} />
              <Line
                type="monotone"
                dataKey="lucro_acumulado"
                stroke="#f59e0b"
                strokeWidth={2}
                name="Lucro acumulado"
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Section>

      {/* TOP PRODUTOS (GRÁFICO) */}
      <Section title="Top produtos no período (quantidade)">
        <div style={{ width: "100%", height: 320 }}>
          <ResponsiveContainer>
            <BarChart data={topProdutos}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis
  dataKey="produto"
  stroke="#a1a1aa"
  interval={0}
  angle={-45}
  textAnchor="end"
  height={70}
  tick={{ fontSize: 11 }}
/>
              <YAxis stroke="#a1a1aa" />
              <Tooltip />
              <Bar dataKey="qtd" fill="#38bdf8" name="Quantidade" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Section>

      {/* TABELAS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* TABELA TOP PRODUTOS */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-4">
          <h2 className="font-semibold mb-3">Produtos mais vendidos (período)</h2>

          <div className="overflow-auto rounded-lg border border-zinc-800">
            <table className="min-w-full text-sm">
              <thead className="bg-zinc-900/60">
                <tr className="text-left text-zinc-300">
                  <th className="p-3">Produto</th>
                  <th className="p-3">Qtd</th>
                  <th className="p-3">Faturamento</th>
                  <th className="p-3">Lucro</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td className="p-3 text-zinc-400" colSpan={4}>
                      Carregando…
                    </td>
                  </tr>
                ) : topProdutos.length === 0 ? (
                  <tr>
                    <td className="p-3 text-zinc-400" colSpan={4}>
                      Nenhum dado ainda.
                    </td>
                  </tr>
                ) : (
                  topProdutos.map((p) => (
                    <tr key={p.produto} className="border-t border-zinc-800">
                      <td className="p-3">{p.produto}</td>
                      <td className="p-3">{p.qtd}</td>
                      <td className="p-3">{money(p.faturamento)}</td>
                      <td className="p-3">{money(p.lucro)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* TABELA ÚLTIMAS VENDAS */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-4">
          <h2 className="font-semibold mb-3">Últimas vendas (período)</h2>

          <div className="overflow-auto rounded-lg border border-zinc-800">
            <table className="min-w-full text-sm">
              <thead className="bg-zinc-900/60">
                <tr className="text-left text-zinc-300">
                  <th className="p-3">Data</th>
                  <th className="p-3">Forma</th>
                  <th className="p-3">Total</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td className="p-3 text-zinc-400" colSpan={3}>
                      Carregando…
                    </td>
                  </tr>
                ) : ultimasVendas.length === 0 ? (
                  <tr>
                    <td className="p-3 text-zinc-400" colSpan={3}>
                      Nenhuma venda ainda.
                    </td>
                  </tr>
                ) : (
                  ultimasVendas.map((v) => (
                    <tr key={v.id} className="border-t border-zinc-800">
                      <td className="p-3">{v.data}</td>
                      <td className="p-3">{v.forma_pagamento || "—"}</td>
                      <td className="p-3 font-semibold">{money(v.total)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function Card({ title, value, danger }) {
  return (
    <div
      className={`rounded-xl border p-4 ${
        danger ? "border-red-500/40 bg-red-500/10" : "border-zinc-800 bg-zinc-900/30"
      }`}
    >
      <div className="text-sm text-zinc-400">{title}</div>
      <div className="text-2xl font-semibold mt-1">{value}</div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-4 mb-6">
      <h2 className="font-semibold mb-4">{title}</h2>
      {children}
    </div>
  );
}
