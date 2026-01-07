import { useState } from "react";
import { useRouter } from "next/router";

export default function LoginPage() {
  const router = useRouter();
  const [usuario, setUsuario] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");

  async function entrar(e) {
    e.preventDefault();
    setErro("");

    try {
      const r = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usuario, senha }),
      });

      const j = await r.json();
      if (!j.ok) throw new Error(j.error || "Erro");

      // limpa estados antes de entrar
      setUsuario("");
      setSenha("");

      router.replace("/dashboard");
    } catch (e2) {
      setErro(e2.message);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white p-4">
      <form
        onSubmit={entrar}
        autoComplete="off"
        className="w-full max-w-sm p-6 rounded-xl bg-slate-800 border border-slate-700"
      >
        <h1 className="text-xl font-semibold mb-4 text-center">
          Merenda Control
        </h1>

        {erro ? (
          <div className="mb-3 p-2 text-sm bg-red-500/20 border border-red-500/40 rounded">
            {erro}
          </div>
        ) : null}

        <input
          autoComplete="off"
          className="w-full mb-3 px-3 py-2 rounded bg-slate-900 border border-slate-700"
          placeholder="Usuário"
          value={usuario}
          onChange={(e) => setUsuario(e.target.value)}
        />

        <input
          type="password"
          autoComplete="new-password"
          className="w-full mb-4 px-3 py-2 rounded bg-slate-900 border border-slate-700"
          placeholder="Senha"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
        />

        <button className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 rounded font-semibold">
          Entrar
        </button>
      </form>
    </div>
  );
}
