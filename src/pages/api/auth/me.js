import { getCookie, readToken } from "../../../lib/session";

export default function handler(req, res) {
  const token = getCookie(req, "mc_token");
  const data = token ? readToken(token) : null;
  if (!data) return res.status(200).json({ ok: true, user: null });
  return res.status(200).json({ ok: true, user: { usuario: data.usuario, role: data.role } });
}
