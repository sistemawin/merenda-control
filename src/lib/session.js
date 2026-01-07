import crypto from "crypto";

function requiredEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Variável de ambiente faltando: ${name}`);
  return v;
}

export function issueToken(payloadObj) {
  const payload = JSON.stringify({
    ...payloadObj,
    exp: Date.now() + 1000 * 60 * 60 * 12, // 12 horas
  });

  const sig = crypto
    .createHmac("sha256", requiredEnv("AUTH_SECRET"))
    .update(payload)
    .digest("hex");

  return Buffer.from(payload).toString("base64") + "." + sig;
}

export function readToken(token) {
  try {
    const [data, sig] = token.split(".");
    const payload = Buffer.from(data, "base64").toString("utf8");

    const expected = crypto
      .createHmac("sha256", requiredEnv("AUTH_SECRET"))
      .update(payload)
      .digest("hex");

    if (sig !== expected) return null;

    const parsed = JSON.parse(payload);
    if (Date.now() > parsed.exp) return null;

    return parsed;
  } catch {
    return null;
  }
}

export function setCookie(res, name, value, options = {}) {
  const parts = [
    `${name}=${encodeURIComponent(value)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
  ];
  if (options.maxAge === 0) parts.push("Max-Age=0");
  if (options.maxAge && options.maxAge > 0) parts.push(`Max-Age=${options.maxAge}`);
  // Em produção (Vercel) você pode ativar Secure automaticamente
  if (process.env.NODE_ENV === "production") parts.push("Secure");
  res.setHeader("Set-Cookie", parts.join("; "));
}

export function getCookie(req, name) {
  const raw = req.headers.cookie || "";
  const cookies = raw.split(";").map((c) => c.trim());
  const found = cookies.find((c) => c.startsWith(name + "="));
  if (!found) return null;
  return decodeURIComponent(found.split("=").slice(1).join("="));
}
