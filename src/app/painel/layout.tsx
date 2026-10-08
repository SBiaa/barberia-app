import Link from "next/link";
import { exigirSessao } from "@/lib/sessao";
import { Sair } from "./sair";

export const metadata = { title: "Painel | Barbearia Adelson Cerqueira", robots: { index: false } };

export default async function PainelLayout({ children }: LayoutProps<"/painel">) {
  await exigirSessao();
  return (
    <div className="mx-auto w-full max-w-4xl flex-1 px-4 py-4">
      <nav className="mb-6 flex items-center gap-4 border-b border-line pb-3 text-sm">
        <span className="titulo hidden sm:inline">Painel</span>
        <Link href="/painel" className="hover:text-silver-strong">Agenda</Link>
        <Link href="/painel/clientes" className="hover:text-silver-strong">Clientes</Link>
        <Link href="/painel/financeiro" className="hover:text-silver-strong">Financeiro</Link>
        <Link href="/painel/relatorios" className="hover:text-silver-strong">Relatórios</Link>
        <Link href="/painel/bloqueios" className="hover:text-silver-strong">Bloqueios</Link>
        <Link href="/painel/cadastros" className="hover:text-silver-strong">Cadastros</Link>
        <span className="ml-auto"><Sair /></span>
      </nav>
      {children}
    </div>
  );
}
