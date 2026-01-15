import { useEffect, useMemo, useState } from "react";
import AppShell from "@/components/AppShell";

function money(n) {
  const v = Number(n || 0);
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function todayISO() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function daysAgoISO(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

export default function MovimentosPage() {
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");
  const [lista, setLista] = useState([]);

  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [openId, setOpenId] = useState(null);

  async function carregar() {
    setLoading(true);
    setErro("");
    try {
      const r = await fetch("/api/movimentos", { cache: "no-store" });
      const j = await r.json();
      if (!j.ok) throw new Error(j.error || "Erro ao carregar histórico");
      setLista(j.historico || []);
    } catch (e) {
      setErro(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  const filtrado = useMemo(() => {
    return lista.filter((v) => {
      if (start && v.data < start) return false;
      if (end && v.data > end) return false;
      return true;
    });
  }, [lista, start, end]);

  return (
    <AppShell title="Histórico de Vendas">
      <h1 className="text-xl font-semibold mb-1">Histórico de vendas</h1>
      <p className="text-sm text-zinc-400 mb-4">
        Consulte vendas por período.
      </p>

      {/* FILTROS */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-4 mb-5">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
          <div>
            <label className="text-xs text-zinc-400">Data inicial</label>
            <input
              type="date"
              className="mt-1 w-full rounded-md bg-zinc-950 border border-zinc-800 px-3 py-2 text-sm"
              value={start}
              onChange={(e) => setStart(e.target.value)}
            />
          </div>

          <div>
            <label className="text-xs text-zinc-400">Data final</label>
            <input
              type="date"
              className="mt-1 w-full rounded-md bg-zinc-950 border border-zinc-800 px-3 py-2 text-sm"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
            />
          </div>

          <button
            onClick={() => {
              setStart(todayISO());
              setEnd(todayISO());
            }}
            className="px-3 py-2 rounded-md bg-zinc-800 hover:bg-zinc-700 text-sm"
            type="button"
          >
            Hoje
          </button>

          <button
            onClick={() => {
              setStart(daysAgoISO(7));
              setEnd(todayISO());
            }}
            className="px-3 py-2 rounded-md bg-zinc-800 hover:bg-zinc-700 text-sm"
            type="button"
          >
            7 dias
          </button>

          <button
            onClick={() => {
              setStart(daysAgoISO(30));
              setEnd(todayISO());
            }}
            className="px-3 py-2 rounded-md bg-zinc-800 hover:bg-zinc-700 text-sm"
            type="button"
          >
            30 dias
          </button>
        </div>
      </div>

      {erro && (
        <div className="mb-4 p-3 rounded-md border border-red-500/40 bg-red-500/10 text-red-200">
          {erro}
        </div>
      )}

      {/* LISTA */}
      <div className="overflow-auto rounded-xl border border-zinc-800">
        <table className="min-w-full text-sm">
          <thead className="bg-zinc-900/60">
            <tr className="text-left text-zinc-300">
              <th className="p-3">Data</th>
              <th className="p-3">Forma</th>
              <th className="p-3">Total</th>
              <th className="p-3">Ações</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td className="p-3 text-zinc-400" colSpan={4}>
                  Carregando...
                </td>
              </tr>
            ) : filtrado.length === 0 ? (
              <tr>
                <td className="p-3 text-zinc-400" colSpan={4}>
                  Nenhuma venda no período.
                </td>
              </tr>
            ) : (
              filtrado.map((v) => {
                const aberto = openId === v.id;
                return (
                  <>
                    <tr
                      key={v.id}
                      className="border-t border-zinc-800 hover:bg-zinc-900/40"
                    >
                      <td className="p-3">{v.data}</td>
                      <td className="p-3">{v.forma_pagamento}</td>
                      <td className="p-3 font-semibold">
                        {money(v.total)}
                      </td>
                      <td className="p-3">
                        <button
                          onClick={() =>
                            setOpenId(aberto ? null : v.id)
                          }
                          className="px-3 py-1 rounded-md bg-zinc-800 hover:bg-zinc-700 text-xs"
                        >
                          {aberto ? "Fechar" : "Ver itens"}
                        </button>
                      </td>
                    </tr>

                    {aberto && (
                      <tr className="border-t border-zinc-800 bg-zinc-950/30">
                        <td colSpan={4} className="p-3">
                          <ul className="text-sm space-y-1">
                            {(v.itens || []).map((it, idx) => (
                              <li key={idx}>
                                {it.qtd}× {it.produto_nome} —{" "}
                                <b>{money(it.subtotal)}</b>
                              </li>
                            ))}
                          </ul>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}
