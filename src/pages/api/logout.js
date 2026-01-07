import cookie from "cookie";

export default function handler(req, res) {
  res.setHeader(
    "Set-Cookie",
    cookie.serialize("auth", "", {
      path: "/",
      expires: new Date(0),
    })
  );
  res.status(200).json({ ok: true });
}
