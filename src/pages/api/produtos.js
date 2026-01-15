import { getSheetByTitle } from "@/lib/sheets";

function normBool(v) {
  if (typeof v === "boolean") return v;
  const s = String(v ?? "").toLowerCase().trim();
  return s === "true" || s === "1" || s === "sim" || s === "yes";
}

function str(v) {
  return String(v ?? "").trim();
}

export default async function handler(req, res) {
  try {
    const sheet = await getSheetByTitle("produtos");

    // LISTAR
    if (req.method === "GET") {
      const rows = await sheet.getRows();

      const produtos = rows
        .map((r) => ({
          id: str(r.get("id")),
          nome: str(r.get("nome")),
          preco: r.get("preco") ?? "",
          custo: r.get("custo") ?? "",
          estoque: r.get("estoque") ?? "",
          ativo: normBool(r.get("ativo")),
          criado_em: r.get("criado_em") ?? "",
        }))
        // remove linhas totalmente vazias (muito comum no Sheets)
        .filter((p) => p.id || p.nome);

      return res.status(200).json({ ok: true, produtos });
    }

    // CRIAR
    if (req.method === "POST") {
      const { id, nome, preco, custo, estoque, ativo } = req.body || {};

      if (!nome || !String(nome).trim()) {
        return res.status(400).json({ ok: false, error: "Nome é obrigatório" });
      }

      const newId = String(id || Date.now());
      const criado_em = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Sao_Paulo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
}).format(new Date());


      // addRow usa o header da planilha (linha 1) como chave
      await sheet.addRow({
        id: newId,
        nome: String(nome).trim(),
        preco: preco ?? "",
        custo: custo ?? "",
        estoque: estoque ?? "",
        ativo: !!ativo,
        criado_em,
      });

      return res.status(200).json({ ok: true });
    }

    // EDITAR
    if (req.method === "PUT") {
      const { id, nome, preco, custo, estoque, ativo } = req.body || {};
      if (!id) {
        return res.status(400).json({ ok: false, error: "id é obrigatório" });
      }

      const rows = await sheet.getRows();

      const row = rows.find((r) => str(r.get("id")) === str(id));
      if (!row) {
        return res.status(404).json({ ok: false, error: "Produto não encontrado" });
      }

      if (nome !== undefined) row.set("nome", String(nome).trim());
      if (preco !== undefined) row.set("preco", preco);
      if (custo !== undefined) row.set("custo", custo);
      if (estoque !== undefined) row.set("estoque", estoque);
      if (ativo !== undefined) row.set("ativo", !!ativo);

      await row.save();
      return res.status(200).json({ ok: true });
    }

    // EXCLUIR
    if (req.method === "DELETE") {
      const { id } = req.body || {};
      if (!id) {
        return res.status(400).json({ ok: false, error: "id é obrigatório" });
      }

      const rows = await sheet.getRows();

      const row = rows.find((r) => str(r.get("id")) === str(id));
      if (!row) {
        return res.status(404).json({ ok: false, error: "Produto não encontrado" });
      }

      await row.delete();
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ ok: false, error: "Método não permitido" });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message || "Erro interno" });
  }
}
