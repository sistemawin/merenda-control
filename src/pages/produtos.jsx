import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";

function money(n) {
  const v = Number(n || 0);
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function ProdutosPage() {
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");
  const [okMsg, setOkMsg] = useState("");
  const [produtos, setProdutos] = useState([]);

  const [form, setForm] = useState({
    id: "",
    nome: "",
    preco: "",
    custo: "",
    estoque: "",
    ativo: true,
  });

  // Se tiver valor aqui, estamos editando esse produto (por id)
  const [editingId, setEditingId] = useState(null);

  async function carregar() {
    setLoading(true);
    setErro("");
    try {
      const r = await fetch("/api/produtos", { cache: "no-store" });
      const j = await r.json();

      if (!j.ok) throw new Error(j.error || "Erro ao carregar produtos");

      // opcional: filtra linhas vazias (evita aparecer produtos em branco)
      const limpos = (j.produtos || []).filter(
        (p) => String(p.id || "").trim() || String(p.nome || "").trim()
      );

      setProdutos(limpos);
    } catch (e) {
      setErro(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  function editarProduto(p) {
    setErro("");
    setOkMsg("");
    setEditingId(p.id);

    setForm({
      id: p.id ?? "",
      nome: p.nome ?? "",
      preco: String(p.preco ?? ""),
      custo: String(p.custo ?? ""),
      estoque: String(p.estoque ?? ""),
      ativo: !!p.ativo,
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cancelarEdicao() {
    setEditingId(null);
    setForm({
      id: "",
      nome: "",
      preco: "",
      custo: "",
      estoque: "",
      ativo: true,
    });
  }

  async function salvar(e) {
    e.preventDefault();
    setErro("");
    setOkMsg("");

    if (!form.nome.trim()) {
      setErro("Digite o nome do produto.");
      return;
    }

    try {
      const r = await fetch("/api/produtos", {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          id: editingId || form.id, // garante id no editar
        }),
      });

      const j = await r.json();
      if (!j.ok) throw new Error(j.error || "Erro ao salvar");

      setOkMsg(editingId ? "Produto atualizado ✅" : "Produto salvo ✅");
      cancelarEdicao();
      await carregar();
    } catch (e2) {
      setErro(e2.message);
    }
  }

  async function excluirProduto(id, nome) {
    const ok = confirm(`Tem certeza que deseja excluir "${nome}"?`);
    if (!ok) return;

    setErro("");
    setOkMsg("");

    try {
      const r = await fetch("/api/produtos", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });

      const j = await r.json();
      if (!j.ok) throw new Error(j.error || "Erro ao excluir");

      setOkMsg("Produto excluído ✅");
      if (editingId === id) cancelarEdicao();
      await carregar();
    } catch (e) {
      setErro(e.message);
    }
  }

  return (
    <AppShell title="Produtos">
      <div className="flex items-start justify-between gap-4 mb-5">
        <div>
          <h1 className="text-xl font-semibold">Produtos</h1>
          <p className="text-sm text-zinc-400">
            Cadastre produtos e controle estoque (salva direto no Google Sheets).
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

      {/* Mensagens */}
      {erro ? (
        <div className="mb-4 p-3 rounded-md border border-red-500/40 bg-red-500/10 text-red-200">
          {erro}
        </div>
      ) : null}

      {okMsg ? (
        <div className="mb-4 p-3 rounded-md border border-green-500/40 bg-green-500/10 text-green-200">
          {okMsg}
        </div>
      ) : null}

      {/* Formulário */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-4 mb-5">
        <h2 className="font-semibold mb-3">
          {editingId ? `Editando produto (ID: ${editingId})` : "Adicionar produto"}
        </h2>

        <form onSubmit={salvar} className="grid grid-cols-1 md:grid-cols-6 gap-3">
          <div className="md:col-span-1">
            <label className="text-xs text-zinc-400">ID (opcional)</label>
            <input
              className="mt-1 w-full rounded-md bg-zinc-950 border border-zinc-800 px-3 py-2 text-sm"
              value={form.id}
              onChange={(e) => setForm((f) => ({ ...f, id: e.target.value }))}
              placeholder="Ex: 1"
            />
          </div>

          <div className="md:col-span-2">
            <label className="text-xs text-zinc-400">Nome</label>
            <input
              className="mt-1 w-full rounded-md bg-zinc-950 border border-zinc-800 px-3 py-2 text-sm"
              value={form.nome}
              onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
              placeholder="Ex: Coxinha"
            />
          </div>

          <div className="md:col-span-1">
            <label className="text-xs text-zinc-400">Preço</label>
            <input
              className="mt-1 w-full rounded-md bg-zinc-950 border border-zinc-800 px-3 py-2 text-sm"
              value={form.preco}
              onChange={(e) => setForm((f) => ({ ...f, preco: e.target.value }))}
              placeholder="Ex: 5,00"
            />
          </div>

          <div className="md:col-span-1">
            <label className="text-xs text-zinc-400">Custo</label>
            <input
              className="mt-1 w-full rounded-md bg-zinc-950 border border-zinc-800 px-3 py-2 text-sm"
              value={form.custo}
              onChange={(e) => setForm((f) => ({ ...f, custo: e.target.value }))}
              placeholder="Ex: 2,50"
            />
          </div>

          <div className="md:col-span-1">
            <label className="text-xs text-zinc-400">Estoque</label>
            <input
              className="mt-1 w-full rounded-md bg-zinc-950 border border-zinc-800 px-3 py-2 text-sm"
              value={form.estoque}
              onChange={(e) => setForm((f) => ({ ...f, estoque: e.target.value }))}
              placeholder="Ex: 30"
            />
          </div>

          <div className="md:col-span-6 flex items-center justify-between mt-2">
            <label className="flex items-center gap-2 text-sm text-zinc-300">
              <input
                type="checkbox"
                checked={form.ativo}
                onChange={(e) => setForm((f) => ({ ...f, ativo: e.target.checked }))}
              />
              Ativo
            </label>

            <div className="flex items-center gap-2">
              {editingId ? (
                <button
                  type="button"
                  onClick={cancelarEdicao}
                  className="px-4 py-2 rounded-md bg-zinc-800 hover:bg-zinc-700 font-semibold text-sm"
                >
                  Cancelar
                </button>
              ) : null}

              <button
                type="submit"
                className="px-4 py-2 rounded-md bg-indigo-600 hover:bg-indigo-500 font-semibold text-sm"
              >
                {editingId ? "Salvar alterações" : "Salvar produto"}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Tabela */}
      <div className="overflow-auto rounded-xl border border-zinc-800">
        <table className="min-w-full text-sm">
          <thead className="bg-zinc-900/60">
            <tr className="text-left text-zinc-300">
              <th className="p-3">ID</th>
              <th className="p-3">Nome</th>
              <th className="p-3">Preço</th>
              <th className="p-3">Custo</th>
              <th className="p-3">Estoque</th>
              <th className="p-3">Ativo</th>
              <th className="p-3">Criado em</th>
              <th className="p-3">Ações</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td className="p-3 text-zinc-400" colSpan={8}>
                  Carregando...
                </td>
              </tr>
            ) : produtos.length === 0 ? (
              <tr>
                <td className="p-3 text-zinc-400" colSpan={8}>
                  Nenhum produto cadastrado ainda.
                </td>
              </tr>
            ) : (
              produtos.map((p) => (
                <tr key={p.id} className="border-t border-zinc-800 hover:bg-zinc-900/40">
                  <td className="p-3 text-zinc-400">{p.id}</td>
                  <td className="p-3 font-medium">{p.nome}</td>
                  <td className="p-3">{money(p.preco)}</td>
                  <td className="p-3 text-zinc-300">{money(p.custo)}</td>
                  <td className="p-3">{p.estoque}</td>
                  <td className="p-3">
                    <span
                      className={
                        "px-2 py-1 rounded text-xs border " +
                        (p.ativo
                          ? "bg-green-500/15 text-green-300 border-green-500/30"
                          : "bg-zinc-800 text-zinc-300 border-zinc-700")
                      }
                    >
                      {p.ativo ? "Ativo" : "Inativo"}
                    </span>
                  </td>
                  <td className="p-3 text-zinc-400">{p.criado_em}</td>
                  <td className="p-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => editarProduto(p)}
                        className="px-3 py-1 rounded-md bg-zinc-800 hover:bg-zinc-700 text-xs"
                        type="button"
                      >
                        Editar
                      </button>

                      <button
                        onClick={() => excluirProduto(p.id, p.nome)}
                        className="px-3 py-1 rounded-md bg-red-600/80 hover:bg-red-600 text-xs"
                        type="button"
                      >
                        Excluir
                      </button>
                    </div>
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
