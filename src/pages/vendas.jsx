import { useEffect, useMemo, useState } from "react";
import AppShell from "@/components/AppShell";

function money(n) {
  const v = Number(n || 0);
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function parseNumberBR(v) {
  if (v === null || v === undefined || v === "") return 0;
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  const s = String(v).trim().replace(/\./g, "").replace(",", ".");
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

export default function VendasPage() {
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");
  const [okMsg, setOkMsg] = useState("");

  const [produtos, setProdutos] = useState([]);

  // item atual (pra adicionar)
  const [produtoId, setProdutoId] = useState("");
  const [qtd, setQtd] = useState("1");

  // carrinho
  const [itens, setItens] = useState([]);

  // venda
  const [forma, setForma] = useState("pix");
  const [obs, setObs] = useState("");

  async function carregarProdutos() {
    setLoading(true);
    setErro("");
    try {
      const r = await fetch("/api/produtos", { cache: "no-store" });
      const j = await r.json();
      if (!j.ok) throw new Error(j.error || "Erro ao carregar produtos");

      // só ativos e com id/nome
      const list = (j.produtos || []).filter((p) => p?.ativo && p?.id && p?.nome);
      setProdutos(list);
      if (!produtoId && list.length) setProdutoId(String(list[0].id));
    } catch (e) {
      setErro(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregarProdutos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const produtoSelecionado = useMemo(() => {
    return produtos.find((p) => String(p.id) === String(produtoId));
  }, [produtos, produtoId]);

  const total = useMemo(() => {
    return itens.reduce((acc, it) => acc + Number(it.subtotal || 0), 0);
  }, [itens]);

  function adicionarItem() {
    setErro("");
    setOkMsg("");

    if (!produtoSelecionado) {
      setErro("Selecione um produto.");
      return;
    }

    const quantidade = parseNumberBR(qtd);
    if (!quantidade || quantidade <= 0) {
      setErro("Quantidade inválida.");
      return;
    }

    const preco = parseNumberBR(produtoSelecionado.preco);
    const subtotal = quantidade * preco;

    // Se já existir no carrinho, soma a quantidade
    setItens((prev) => {
      const idx = prev.findIndex((x) => String(x.produto_id) === String(produtoSelecionado.id));
      if (idx >= 0) {
        const novo = [...prev];
        const existente = novo[idx];
        const novaQtd = parseNumberBR(existente.qtd) + quantidade;
        novo[idx] = {
          ...existente,
          qtd: String(novaQtd),
          subtotal: novaQtd * parseNumberBR(existente.preco_unit),
        };
        return novo;
      }

      return [
        ...prev,
        {
          produto_id: String(produtoSelecionado.id),
          produto_nome: String(produtoSelecionado.nome),
          qtd: String(quantidade),
          preco_unit: preco,
          subtotal,
        },
      ];
    });

    setQtd("1");
  }

  function removerItem(produto_id) {
    setItens((prev) => prev.filter((x) => String(x.produto_id) !== String(String(produto_id))));
  }

  async function finalizarVenda() {
    setErro("");
    setOkMsg("");

    if (itens.length === 0) {
      setErro("Adicione pelo menos 1 item.");
      return;
    }

    try {
      const payload = {
        forma_pagamento: forma,
        observacao: obs,
        itens: itens.map((x) => ({
          produto_id: x.produto_id,
          qtd: x.qtd,
        })),
      };

      const r = await fetch("/api/vendas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const j = await r.json();
      if (!j.ok) throw new Error(j.error || "Erro ao salvar venda");

      setOkMsg(`Venda registrada ✅ (ID ${j?.venda?.id})`);
      setItens([]);
      setObs("");

      // recarrega produtos pra refletir estoque baixado
      await carregarProdutos();
    } catch (e) {
      setErro(e.message);
    }
  }

  return (
    <AppShell title="Vendas">
      <div className="flex items-start justify-between gap-4 mb-5">
        <div>
          <h1 className="text-xl font-semibold">Nova venda</h1>
          <p className="text-sm text-zinc-400">
            Registre o pedido do cliente e baixe o estoque automaticamente.
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

      {/* Adicionar item */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-4 mb-5">
        <h2 className="font-semibold mb-3">Adicionar item</h2>

        <div className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
          <div className="md:col-span-3">
            <label className="text-xs text-zinc-400">Produto</label>
            <select
              className="mt-1 w-full rounded-md bg-zinc-950 border border-zinc-800 px-3 py-2 text-sm"
              value={produtoId}
              onChange={(e) => setProdutoId(e.target.value)}
              disabled={loading}
            >
              {produtos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nome} (Estoque: {p.estoque})
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-1">
            <label className="text-xs text-zinc-400">Qtd</label>
            <input
              type="number"
              inputMode="numeric"
              pattern="[0-9]*"
              min="1"
              step="1"
              className="mt-1 w-full rounded-md bg-zinc-950 border border-zinc-800 px-3 py-2 text-sm"
              value={qtd}
              onChange={(e) => {
                // deixa o usuário apagar e digitar ("" temporário é OK)
                const val = e.target.value;
                if (val === "") return setQtd("");
                // aceita só dígitos (evita "e", "-", etc em alguns teclados)
                if (/^\d+$/.test(val)) setQtd(val);
              }}
              onBlur={() => {
                // quando sai do campo, normaliza: vazio -> 1, zero -> 1
                const n = parseInt(qtd || "1", 10);
                if (!Number.isFinite(n) || n < 1) setQtd("1");
                else setQtd(String(n));
              }}
              onKeyDown={(e) => {
                // evita o Enter/Go do celular “sair da tela” ou disparar submit/ação estranha
                if (e.key === "Enter") e.preventDefault();
              }}
              placeholder="Ex: 2"
            />
          </div>

          <div className="md:col-span-2 flex gap-2">
            <button
              type="button"
              onClick={adicionarItem}
              className="w-full px-4 py-2 rounded-md bg-indigo-600 hover:bg-indigo-500 font-semibold text-sm"
              disabled={loading}
            >
              Adicionar
            </button>
          </div>
        </div>

        {produtoSelecionado ? (
          <p className="mt-3 text-sm text-zinc-400">
            Preço: <span className="text-zinc-200">{money(produtoSelecionado.preco)}</span>
          </p>
        ) : null}
      </div>

      {/* Carrinho */}
      <div className="rounded-xl border border-zinc-800 overflow-auto mb-5">
        <table className="min-w-full text-sm">
          <thead className="bg-zinc-900/60">
            <tr className="text-left text-zinc-300">
              <th className="p-3">Produto</th>
              <th className="p-3">Qtd</th>
              <th className="p-3">Preço</th>
              <th className="p-3">Subtotal</th>
              <th className="p-3">Ações</th>
            </tr>
          </thead>
          <tbody>
            {itens.length === 0 ? (
              <tr>
                <td className="p-3 text-zinc-400" colSpan={5}>
                  Nenhum item adicionado ainda.
                </td>
              </tr>
            ) : (
              itens.map((it) => (
                <tr key={it.produto_id} className="border-t border-zinc-800 hover:bg-zinc-900/40">
                  <td className="p-3 font-medium">{it.produto_nome}</td>
                  <td className="p-3">{it.qtd}</td>
                  <td className="p-3">{money(it.preco_unit)}</td>
                  <td className="p-3">{money(it.subtotal)}</td>
                  <td className="p-3">
                    <button
                      type="button"
                      onClick={() => removerItem(it.produto_id)}
                      className="px-3 py-1 rounded-md bg-red-600/80 hover:bg-red-600 text-xs"
                    >
                      Remover
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Finalizar */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-4">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div className="w-full md:w-1/2">
            <label className="text-xs text-zinc-400">Forma de pagamento</label>
            <select
              className="mt-1 w-full rounded-md bg-zinc-950 border border-zinc-800 px-3 py-2 text-sm"
              value={forma}
              onChange={(e) => setForma(e.target.value)}
            >
              <option value="pix">PIX</option>
              <option value="dinheiro">Dinheiro</option>
              <option value="cartao">Cartão</option>
              <option value="nao_informado">Não informado</option>
            </select>
          </div>

          <div className="w-full md:w-1/2">
            <label className="text-xs text-zinc-400">Observação (opcional)</label>
            <input
              className="mt-1 w-full rounded-md bg-zinc-950 border border-zinc-800 px-3 py-2 text-sm"
              value={obs}
              onChange={(e) => setObs(e.target.value)}
              placeholder="Ex: sem gelo, troco, cliente aguardando..."
            />
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <div className="text-lg font-semibold">
            Total: <span className="text-zinc-200">{money(total)}</span>
          </div>

          <button
            type="button"
            onClick={finalizarVenda}
            className="px-5 py-2 rounded-md bg-green-600 hover:bg-green-500 font-semibold"
          >
            Finalizar venda
          </button>
        </div>
      </div>
    </AppShell>
  );
}