import Link from "next/link";
import { exigirSessao } from "@/lib/sessao";
import { Sair } from "./sair";

export const metadata = { title: "Painel | Barbearia Adelson Cerqueira", robots: { index: false } };

export default async function PainelLayout({ children }: LayoutProps<"/painel">) {
  const sessao = await exigirSessao();
  const itens = sessao.ehAdmin
    ? [
        ["/painel", "Agenda"],
        ["/painel/clientes", "Clientes"],
        ["/painel/financeiro", "Financeiro"],
        ["/painel/relatorios", "Relatórios"],
        ["/painel/bloqueios", "Bloqueios"],
        ["/painel/cadastros", "Cadastros"],
      ]
    : [
        ["/painel", "Minha agenda"],
        ["/painel/ganhos", "Meus ganhos"],
        ["/painel/horarios", "Meus horários"],
        ["/painel/bloqueios", "Folgas"],
        ["/painel/clientes", "Meus clientes"],
      ];
  return (
    <div className="mx-auto w-full max-w-4xl flex-1 px-4 py-4">
      <nav className="mb-6 flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-line pb-3 text-sm">
        <span className="titulo hidden sm:inline">{sessao.ehAdmin ? "Painel" : sessao.nome}</span>
        {itens.map(([href, rotulo]) => (
          <Link key={href} href={href} className="hover:text-silver-strong">
            {rotulo}
          </Link>
        ))}
        <span className="ml-auto">
          <Sair />
        </span>
      </nav>
      {children}
    </div>
  );
}
