// src/lib/dateBR.js
export function hojeISO_BR() {
  // YYYY-MM-DD no fuso do Brasil
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function agoraISO_BR() {
  // YYYY-MM-DDTHH:mm:ss (local BR) - bom pra "criado_em"
  const dt = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(new Date());

  // sv-SE vem tipo: "2026-01-14 21:56:00"
  return dt.replace(" ", "T");
}