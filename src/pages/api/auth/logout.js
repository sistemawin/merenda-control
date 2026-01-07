import { setCookie } from "../../../lib/session";

export default function handler(req, res) {
  setCookie(res, "mc_token", "", { maxAge: 0 });
  res.status(200).json({ ok: true });
}
