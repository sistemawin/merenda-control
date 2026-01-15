import { useEffect, useMemo, useState } from "react";
import AppShell from "@/components/AppShell";

function money(n) {
  const v = Number(n || 0);
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function toNumberBR(v) {
  if (v === null || v === undefined) return 0;
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  const s = String(v).trim();
  if (!s) return 0;
  const clean = s.replace(/\s/g, "").replace("R$", "").replace(/\./g, "").replace(",", ".");
  const n = Number(clean);
  return Number.isFinite(n) ? n : 0;
}

export default function PDVPage() {
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");
  const [okMsg, setOkMsg] = useState("");

  const [produtos, setProdutos] = useState([]);
  const [busca, setBusca] = useState("");
  const [mostrarLista, setMostrarLista] = useState(false);

  const [carrinho, setCarrinho] = useState([]); // {produto_id, nome, preco_unit, custo_unit, qtd}
  const [forma, setForma] = useState("pix");
  const [obs, setObs] = useState("");
  const [baixarEstoque, setBaixarEstoque] = useState(true);

  async function carregarProdutos() {
    setLoading(true);
    setErro("");
    try {
      const r = await fetch("/api/produtos", { cache: "no-store" });
      const j = await r.json();
      if (!j.ok) throw new Error(j.error || "Erro ao carregar produtos");

      const lista = (j.produtos || [])
        .map((p) => ({
          id: String(p.id ?? "").trim(),
          nome: String(p.nome ?? "").trim(),
          preco: toNumberBR(p.preco),
          custo: toNumberBR(p.custo),
          estoque: String(p.estoque ?? "").trim(),
          ativo: !!p.ativo,
        }))
        .filter((p) => p.id && p.nome && p.ativo);

      setProdutos(lista);
    } catch (e) {
      setErro(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregarProdutos();
  }, []);

  const produtosFiltrados = useMemo(() => {
    if (!mostrarLista) return [];

    const q = busca.trim().toLowerCase();
    if (!q) return []; // não mostra tudo, só pesquisando

    return produtos.filter((p) => p.nome.toLowerCase().includes(q));
  }, [busca, produtos, mostrarLista]); // ✅ corrigido

  const total = useMemo(() => {
    return carrinho.reduce(
      (acc, it) => acc + Number(it.qtd || 0) * Number(it.preco_unit || 0),
      0
    );
  }, [carrinho]);

  function adicionar(p) {
    setErro("");
    setOkMsg("");

    setCarrinho((old) => {
      const idx = old.findIndex((x) => x.produto_id === p.id);
      if (idx >= 0) {
        const copia = [...old];
        copia[idx] = { ...copia[idx], qtd: Number(copia[idx].qtd || 0) + 1 };
        return copia;
      }
      return [
        ...old,
        {
          produto_id: p.id,
          nome: p.nome,
          preco_unit: p.preco,
          custo_unit: p.custo,
          qtd: 1,
        },
      ];
    });
  }

  // ✅ BUGFIX: não remover item quando o input fica "" enquanto o usuário digita
  function mudarQtd(produto_id, qtd) {
    if (qtd === "") {
      setCarrinho((old) =>
        old.map((it) =>
          it.produto_id === produto_id ? { ...it, qtd: "" } : it
        )
      );
      return;
    }

    const n = Math.max(1, parseInt(String(qtd), 10) || 1);

    setCarrinho((old) =>
      old.map((it) => (it.produto_id === produto_id ? { ...it, qtd: n } : it))
    );
  }

  function normalizarQtd(produto_id, qtdAtual) {
    if (qtdAtual === "" || qtdAtual === null || qtdAtual === undefined) {
      setCarrinho((old) =>
        old.map((it) =>
          it.produto_id === produto_id ? { ...it, qtd: 1 } : it
        )
      );
    }
  }

  function remover(produto_id) {
    setCarrinho((old) => old.filter((it) => it.produto_id !== produto_id));
  }

  function limpar() {
    setCarrinho([]);
    setForma("pix");
    setObs("");
    setErro("");
    setOkMsg("");
  }

  async function finalizar() {
    setErro("");
    setOkMsg("");

    if (carrinho.length === 0) {
      setErro("Carrinho vazio.");
      return;
    }

    const carrinhoNormalizado = carrinho.map((it) => ({
      ...it,
      qtd: it.qtd === "" ? 1 : Number(it.qtd || 0),
    }));

    try {
      const r = await fetch("/api/pdv-finalizar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          forma_pagamento: forma,
          observacao: obs,
          baixarEstoque,
          itens: carrinhoNormalizado.map((it) => ({
            produto_id: it.produto_id,
            qtd: Number(it.qtd || 0),
            preco_unit: Number(it.preco_unit || 0),
            custo_unit: Number(it.custo_unit || 0),
          })),
        }),
      });

      const j = await r.json();
      if (!j.ok) throw new Error(j.error || "Erro ao finalizar venda");

      setOkMsg(`Venda registrada ✅ (Total: ${money(j.total)})`);
      limpar();
      await carregarProdutos();
    } catch (e) {
      setErro(e.message);
    }
  }

  return (
    <AppShell title="PDV">
      <div className="flex items-start justify-between gap-4 mb-5">
        <div>
          <h1 className="text-xl font-semibold">PDV (Caixa)</h1>
          <p className="text-sm text-zinc-400">
            Adicione itens e finalize a venda. Salva no Google Sheets.
          </p>
        </div>

        <button
          onClick={carregarProdutos}
          className="px-3 py-2 rounded-md bg-zinc-800 hover:bg-zinc-700 text-sm"
          type="button"
        >
          Recarregar produtos
        </button>
      </div>

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

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        {/* LISTA DE PRODUTOS */}
        <div className="lg:col-span-3 rounded-xl border border-zinc-800 bg-zinc-900/30 p-4">
          <div className="flex items-center justify-between gap-3 mb-3">
            <h2 className="font-semibold">Produtos</h2>

            <input
              className="w-full max-w-sm rounded-md bg-zinc-950 border border-zinc-800 px-3 py-2 text-sm"
              placeholder="Buscar produto pelo nome..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />

            {/* ✅ Botão Abrir/Fechar */}
            <button
              type="button"
              onClick={() => setMostrarLista((v) => !v)}
              className="px-3 py-2 rounded-md bg-zinc-800 hover:bg-zinc-700 text-sm whitespace-nowrap"
            >
              {mostrarLista ? "Fechar" : "Abrir"}
            </button>
          </div>

          {!mostrarLista ? (
            <div className="text-sm text-zinc-400">
              Lista fechada. Clique em <b>Abrir</b> para pesquisar e adicionar.
            </div>
          ) : (
            <div className="overflow-auto rounded-lg border border-zinc-800">
              <table className="min-w-full text-sm">
                <thead className="bg-zinc-900/60">
                  <tr className="text-left text-zinc-300">
                    <th className="p-3">Produto</th>
                    <th className="p-3">Preço</th>
                    <th className="p-3">Estoque</th>
                    <th className="p-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td className="p-3 text-zinc-400" colSpan={4}>
                        Carregando...
                      </td>
                    </tr>
                  ) : produtosFiltrados.length === 0 ? (
                    <tr>
                      <td className="p-3 text-zinc-400" colSpan={4}>
                        Digite um nome para pesquisar.
                      </td>
                    </tr>
                  ) : (
                    produtosFiltrados.map((p) => (
                      <tr key={p.id} className="border-t border-zinc-800">
                        <td className="p-3">
                          <div className="font-medium">{p.nome}</div>
                          <div className="text-xs text-zinc-500">ID: {p.id}</div>
                        </td>
                        <td className="p-3">{money(p.preco)}</td>
                        <td className="p-3 text-zinc-300">{p.estoque || "—"}</td>
                        <td className="p-3">
                          <button
                            onClick={() => adicionar(p)}
                            className="px-3 py-2 rounded-md bg-indigo-600 hover:bg-indigo-500 text-sm font-semibold"
                            type="button"
                          >
                            + Adicionar
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* CARRINHO */}
        <div className="lg:col-span-2 rounded-xl border border-zinc-800 bg-zinc-900/30 p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">Carrinho</h2>
            <button
              onClick={limpar}
              className="px-3 py-2 rounded-md bg-zinc-800 hover:bg-zinc-700 text-sm"
              type="button"
            >
              Limpar
            </button>
          </div>

          {carrinho.length === 0 ? (
            <div className="text-sm text-zinc-400">Adicione produtos para começar.</div>
          ) : (
            <div className="space-y-3">
              {carrinho.map((it) => (
                <div
                  key={it.produto_id}
                  className="rounded-lg border border-zinc-800 bg-zinc-950/40 p-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-medium">{it.nome}</div>
                      <div className="text-xs text-zinc-500">ID: {it.produto_id}</div>
                      <div className="text-xs text-zinc-400 mt-1">
                        Preço: {money(it.preco_unit)}
                      </div>
                    </div>

                    <button
                      onClick={() => remover(it.produto_id)}
                      className="px-3 py-1 rounded-md bg-red-600/80 hover:bg-red-600 text-xs"
                      type="button"
                    >
                      Remover
                    </button>
                  </div>

                  <div className="mt-3 flex items-center gap-2">
                    <span className="text-xs text-zinc-400">Qtd</span>
                    <input
                      className="w-20 rounded-md bg-zinc-950 border border-zinc-800 px-2 py-1 text-sm"
                      type="number"
                      min="1"
                      value={it.qtd}
                      onChange={(e) => mudarQtd(it.produto_id, e.target.value)}
                      onBlur={() => normalizarQtd(it.produto_id, it.qtd)}
                    />
                    <div className="ml-auto text-sm font-semibold">
                      {money(Number(it.qtd || 0) * Number(it.preco_unit || 0))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* pagamento/obs */}
          <div className="mt-4 grid grid-cols-1 gap-3">
            <div>
              <label className="text-xs text-zinc-400">Forma de pagamento</label>
              <select
                className="mt-1 w-full rounded-md bg-zinc-950 border border-zinc-800 px-3 py-2 text-sm"
                value={forma}
                onChange={(e) => setForma(e.target.value)}
              >
                <option value="pix">Pix</option>
                <option value="dinheiro">Dinheiro</option>
                <option value="cartao">Cartão</option>
                <option value="nao_informado">Não informado</option>
              </select>
            </div>

            <div>
              <label className="text-xs text-zinc-400">Observação (opcional)</label>
              <input
                className="mt-1 w-full rounded-md bg-zinc-950 border border-zinc-800 px-3 py-2 text-sm"
                placeholder="Ex: fiado, troco, pedido especial..."
                value={obs}
                onChange={(e) => setObs(e.target.value)}
              />
            </div>

            <label className="flex items-center gap-2 text-sm text-zinc-300">
              <input
                type="checkbox"
                checked={baixarEstoque}
                onChange={(e) => setBaixarEstoque(e.target.checked)}
              />
              Baixar estoque ao finalizar
            </label>

            <div className="flex items-center justify-between pt-2 border-t border-zinc-800">
              <div>
                <div className="text-xs text-zinc-400">Total</div>
                <div className="text-2xl font-semibold">{money(total)}</div>
              </div>

              <button
                onClick={finalizar}
                className="px-4 py-3 rounded-md bg-emerald-600 hover:bg-emerald-500 font-semibold"
                type="button"
                disabled={loading}
              >
                Finalizar venda
              </button>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
