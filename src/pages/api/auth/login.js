import { getSheet } from "../../../lib/sheets";
import { sha256 } from "../../../lib/security";
import { issueToken, setCookie } from "../../../lib/session";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ ok: false, error: "Use POST" });

  try {
    const { usuario, senha } = req.body || {};
    if (!usuario || !senha) return res.status(400).json({ ok: false, error: "Informe usuario e senha" });

    const sheet = await getSheet("usuarios");
    const rows = await sheet.getRows();

    const u = rows.find((r) => String(r.usuario || "").trim() === String(usuario).trim());
    if (!u) return res.status(401).json({ ok: false, error: "Usuário ou senha inválidos" });

    const ativo = String(u.ativo || "").toLowerCase();
    if (ativo === "false" || ativo === "0") return res.status(403).json({ ok: false, error: "Usuário desativado" });

    const hash = sha256(senha);
    if (String(u.senha_hash || "").trim() !== hash) {
      return res.status(401).json({ ok: false, error: "Usuário ou senha inválidos" });
    }

    const token = issueToken({ usuario: String(u.usuario), role: String(u.role || "user") });
    setCookie(res, "mc_token", token, { maxAge: 60 * 60 * 12 });

    return res.status(200).json({ ok: true });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
}
