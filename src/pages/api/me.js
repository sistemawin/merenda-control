import { parseCookie, verifyToken } from "../../lib/auth";

export default async function handler(req, res) {
  const secret = process.env.APP_SECRET;
  if (!secret) return res.status(500).json({ ok: false, error: "APP_SECRET não configurado" });

  const token = parseCookie(req, "mc_session");
  const data = verifyToken(token, secret);

  if (!data) return res.status(401).json({ ok: false });

  res.status(200).json({ ok: true, usuario: data.usuario, role: data.role });
}
