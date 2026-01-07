import Link from "next/link";

export default function AppShell({ children, title }) {
  async function sair() {
    await fetch("/api/logout");
    window.location.href = "/login";
  }

  return (
    <div className="flex min-h-screen bg-slate-900 text-white">
      {/* MENU */}
      <aside className="w-56 p-4 bg-slate-950 border-r border-slate-800 flex flex-col justify-between">
        <div>
          <h2 className="text-lg font-semibold mb-6">Merenda Control</h2>

          <nav className="flex flex-col gap-3 text-sm">
            <Link href="/dashboard">📊 Dashboard</Link>
            <Link href="/pdv">🧾 Caixa</Link>
            <Link href="/produtos">📦 Produtos</Link>
            <Link href="/movimentos">📜 Histórico</Link>
            <Link href="/despesas">💸 Despesas</Link>
          </nav>
        </div>

        <button
          onClick={sair}
          className="mt-6 text-sm text-red-400 hover:text-red-300"
        >
          🚪 Sair
        </button>
      </aside>

      {/* CONTEÚDO */}
      <main className="flex-1 p-6">
        {title ? <h1 className="text-xl font-semibold mb-4">{title}</h1> : null}
        {children}
      </main>
    </div>
  );
}
