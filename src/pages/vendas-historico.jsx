import { useEffect, useMemo, useState } from "react";
import AppShell from "@/components/AppShell";

function money(n) {
  const v = Number(n || 0);
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function VendasHistoricoPage() {
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");
  const [vendas, setVendas] = useState([]);

  const [filtroData, setFiltroData] = useState(""); // yyyy-mm-dd
  const [limite, setLimite] = useState("50");

  async function carregar() {
    setLoading(true);
    setErro("");

    try {
      const qs = new URLSearchParams();
      if (filtroData) qs.set("date", filtroData);
      if (limite) qs.set("limit", limite);

      const r = await fetch(`/api/vendas?${qs.toString()}`, { cache: "no-store" });
      const j = await r.json();

      if (!j.ok) throw new Error(j.error || "Erro ao carregar histórico");
      setVendas(j.vendas || []);
    } catch (e) {
      setErro(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resumo = useMemo(() => {
    const total = vendas.reduce((acc, v) => acc + Number(v.total || 0), 0);
    const qtd = vendas.length;
    return { total, qtd };
  }, [vendas]);

  return (
    <AppShell title="Histórico de Vendas">
      <div className="flex items-start justify-between gap-4 mb-5">
        <div>
          <h1 className="text-xl font-semibold">Histórico de vendas</h1>
          <p className="text-sm text-zinc-400">
            Veja vendas registradas, itens e total.
          </p>
        </div>

        <button
          onClick={carregar}
          className="px-3 py-2 rounded-md bg-zinc-800 hover:bg-zinc-700 text-sm"
          type="button"
        >
          Recarregar
        </button>
      </div>

      {erro ? (
        <div className="mb-4 p-3 rounded-md border border-red-500/40 bg-red-500/10 text-red-200">
          {erro}
        </div>
      ) : null}

      <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-4 mb-5">
        <div className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
          <div className="md:col-span-2">
            <label className="text-xs text-zinc-400">Filtrar por data</label>
            <input
              type="date"
              className="mt-1 w-full rounded-md bg-zinc-950 border border-zinc-800 px-3 py-2 text-sm"
              value={filtroData}
              onChange={(e) => setFiltroData(e.target.value)}
            />
          </div>

          <div className="md:col-span-2">
            <label className="text-xs text-zinc-400">Limite</label>
            <input
              className="mt-1 w-full rounded-md bg-zinc-950 border border-zinc-800 px-3 py-2 text-sm"
              value={limite}
              onChange={(e) => setLimite(e.target.value)}
              placeholder="Ex: 50"
            />
          </div>

          <div className="md:col-span-2 flex gap-2">
            <button
              type="button"
              onClick={carregar}
              className="w-full px-4 py-2 rounded-md bg-indigo-600 hover:bg-indigo-500 font-semibold text-sm"
            >
              Aplicar
            </button>
            <button
              type="button"
              onClick={() => {
                setFiltroData("");
                setLimite("50");
                // recarrega com padrão
                setTimeout(carregar, 0);
              }}
              className="w-full px-4 py-2 rounded-md bg-zinc-800 hover:bg-zinc-700 font-semibold text-sm"
            >
              Limpar
            </button>
          </div>
        </div>

        <div className="mt-4 text-sm text-zinc-300">
          <span className="font-semibold">{resumo.qtd}</span> vendas • Total{" "}
          <span className="font-semibold">{money(resumo.total)}</span>
        </div>
      </div>

      <div className="space-y-3">
        {loading ? (
          <div className="text-zinc-400">Carregando...</div>
        ) : vendas.length === 0 ? (
          <div className="text-zinc-400">Nenhuma venda encontrada.</div>
        ) : (
          vendas.map((v) => (
            <div key={v.id} className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-4">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                <div>
                  <div className="text-sm text-zinc-400">Venda #{v.id}</div>
                  <div className="text-lg font-semibold">
                    {money(v.total)}{" "}
                    <span className="text-sm text-zinc-400 font-normal">
                      • {v.data || "sem data"} • {v.forma_pagamento || "nao_informado"}
                    </span>
                  </div>
                  {v.observacao ? (
                    <div className="text-sm text-zinc-300 mt-1">Obs: {v.observacao}</div>
                  ) : null}
                </div>
              </div>

              <div className="mt-3 overflow-auto rounded-lg border border-zinc-800">
                <table className="min-w-full text-sm">
                  <thead className="bg-zinc-900/60">
                    <tr className="text-left text-zinc-300">
                      <th className="p-3">Item</th>
                      <th className="p-3">Qtd</th>
                      <th className="p-3">Preço</th>
                      <th className="p-3">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(v.itens || []).length === 0 ? (
                      <tr>
                        <td className="p-3 text-zinc-400" colSpan={4}>
                          Nenhum item encontrado para esta venda.
                        </td>
                      </tr>
                    ) : (
                      (v.itens || []).map((it, idx) => (
                        <tr key={`${v.id}-${idx}`} className="border-t border-zinc-800">
                          <td className="p-3 font-medium">{it.produto_nome || it.produto_id}</td>
                          <td className="p-3">{it.qtd}</td>
                          <td className="p-3">{money(it.preco_unit)}</td>
                          <td className="p-3">{money(it.subtotal)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ))
        )}
      </div>
    </AppShell>
  );
}
