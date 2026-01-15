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

export default function DespesasPage() {
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");
  const [okMsg, setOkMsg] = useState("");
  const [lista, setLista] = useState([]);

  const [data, setData] = useState(todayISO());
  const [descricao, setDescricao] = useState("");
  const [valor, setValor] = useState("");
  const [categoria, setCategoria] = useState("");

  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");

  async function carregar() {
    setLoading(true);
    setErro("");
    try {
      const r = await fetch("/api/despesas", { cache: "no-store" });
      const j = await r.json();
      if (!j.ok) throw new Error(j.error || "Erro ao carregar despesas");
      setLista(j.despesas || []);
    } catch (e) {
      setErro(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  async function salvar(e) {
    e.preventDefault();
    setErro("");
    setOkMsg("");

    try {
      const r = await fetch("/api/despesas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data, descricao, valor, categoria }),
      });

      const j = await r.json();
      if (!j.ok) throw new Error(j.error || "Erro ao salvar");

      setOkMsg("Despesa registrada ✅");
      setDescricao("");
      setValor("");
      setCategoria("");
      await carregar();
    } catch (e) {
      setErro(e.message);
    }
  }

  const filtrado = useMemo(() => {
    return lista.filter((d) => {
      if (start && d.data < start) return false;
      if (end && d.data > end) return false;
      return true;
    });
  }, [lista, start, end]);

  return (
    <AppShell title="Despesas">
      <h1 className="text-xl font-semibold mb-1">Despesas</h1>
      <p className="text-sm text-zinc-400 mb-4">
        Controle de gastos do estabelecimento.
      </p>

      {/* FORM */}
      <form
        onSubmit={salvar}
        className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-4 mb-5 grid grid-cols-1 md:grid-cols-5 gap-3"
      >
        <input
          type="date"
          className="rounded-md bg-zinc-950 border border-zinc-800 px-3 py-2 text-sm"
          value={data}
          onChange={(e) => setData(e.target.value)}
        />

        <input
          className="rounded-md bg-zinc-950 border border-zinc-800 px-3 py-2 text-sm"
          placeholder="Descrição"
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
        />

        <input
          className="rounded-md bg-zinc-950 border border-zinc-800 px-3 py-2 text-sm"
          placeholder="Valor"
          value={valor}
          onChange={(e) => setValor(e.target.value)}
        />

        <input
          className="rounded-md bg-zinc-950 border border-zinc-800 px-3 py-2 text-sm"
          placeholder="Categoria (opcional)"
          value={categoria}
          onChange={(e) => setCategoria(e.target.value)}
        />

        <button
          className="rounded-md bg-red-600 hover:bg-red-500 font-semibold"
          type="submit"
        >
          Registrar
        </button>
      </form>

      {/* FILTROS */}
      <div className="flex gap-3 mb-4">
        <input
          type="date"
          className="rounded-md bg-zinc-950 border border-zinc-800 px-3 py-2 text-sm"
          value={start}
          onChange={(e) => setStart(e.target.value)}
        />
        <input
          type="date"
          className="rounded-md bg-zinc-950 border border-zinc-800 px-3 py-2 text-sm"
          value={end}
          onChange={(e) => setEnd(e.target.value)}
        />
      </div>

      {erro && (
        <div className="mb-4 p-3 rounded-md border border-red-500/40 bg-red-500/10 text-red-200">
          {erro}
        </div>
      )}
      {okMsg && (
        <div className="mb-4 p-3 rounded-md border border-green-500/40 bg-green-500/10 text-green-200">
          {okMsg}
        </div>
      )}

      {/* LISTA */}
      <div className="overflow-auto rounded-xl border border-zinc-800">
        <table className="min-w-full text-sm">
          <thead className="bg-zinc-900/60">
            <tr className="text-left text-zinc-300">
              <th className="p-3">Data</th>
              <th className="p-3">Descrição</th>
              <th className="p-3">Categoria</th>
              <th className="p-3">Valor</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} className="p-3 text-zinc-400">
                  Carregando...
                </td>
              </tr>
            ) : filtrado.length === 0 ? (
              <tr>
                <td colSpan={4} className="p-3 text-zinc-400">
                  Nenhuma despesa no período.
                </td>
              </tr>
            ) : (
              filtrado.map((d, i) => (
                <tr key={i} className="border-t border-zinc-800">
                  <td className="p-3">{d.data}</td>
                  <td className="p-3">{d.descricao}</td>
                  <td className="p-3">{d.categoria || "—"}</td>
                  <td className="p-3 font-semibold text-red-400">
                    {money(d.valor)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}
