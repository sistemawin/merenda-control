import crypto from "crypto";

export function sha256(text) {
  return crypto.createHash("sha256").update(text).digest("hex");
}

export function makeId(prefix = "id") {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}
