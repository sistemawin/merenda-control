import cookie from "cookie";
import { getSheetByTitle } from "@/lib/sheets";
import bcrypt from "bcryptjs";
import cookie from "cookie";

function rowCell(row, idx) {
  return row?._rawData?.[idx] ?? "";
}

function isActive(v) {
  const s = String(v ?? "").trim().toLowerCase();
  if (!s) return true;
  return s === "true" || s === "1" || s === "sim" || s === "yes";
}

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ ok: false, error: "Use POST" });
    }

    const { usuario, senha } = req.body || {};
    const u = String(usuario ?? "").trim();
    const p = String(senha ?? "");

    if (!u || !p) {
      return res.status(400).json({ ok: false, error: "Informe usuário e senha" });
    }

    const sheet = await getSheetByTitle("usuarios");
    const rows = await sheet.getRows();

    // A=usuario B=senha_hash C=role D=ativo
    const row = rows.find((r) => {
      const user = String(rowCell(r, 0)).trim();
      const ativo = rowCell(r, 3);
      return user === u && isActive(ativo);
    });

    if (!row) {
      return res.status(401).json({ ok: false, error: "Usuário ou senha expirados" });
    }

    // ⚠️ remove aspas/apóstrofos acidentais do começo/fim
    const rawHash = String(rowCell(row, 1)).trim();
    const hash = rawHash.replace(/^['"]+|['"]+$/g, "");

    if (!hash || hash.length < 30) {
      return res.status(401).json({ ok: false, error: "Usuário ou senha expirados" });
    }

    const ok = bcrypt.compareSync(p, hash);
    if (!ok) {
      return res.status(401).json({ ok: false, error: "Usuário ou senha expirados" });
    }

    const role = String(rowCell(row, 2)).trim() || "user";

    res.setHeader(
      "Set-Cookie",
      cookie.serialize("auth", JSON.stringify({ usuario: u, role }), {
        httpOnly: true,
        path: "/",
        sameSite: "lax",
        maxAge: 60 * 60 * 8, // 8h
      })
    );

    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message || "Erro interno" });
  }
}
