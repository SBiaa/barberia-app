import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { db } from "@/db";
import { barbeiro } from "@/db/schema";
import { auth } from "@/lib/auth";
import { exigirSessao } from "@/lib/sessao";
import { AlterarSenha } from "./alterar-senha";

export const dynamic = "force-dynamic";
export const metadata = { title: "Meu perfil | Barbearia Adelson Cerqueira" };

export default async function Perfil() {
  const sessao = await exigirSessao();
  const s = await auth.api.getSession({ headers: await headers() });
  const [b] = sessao.barbeiroId
    ? await db.select().from(barbeiro).where(eq(barbeiro.id, sessao.barbeiroId))
    : [];

  return (
    <div className="space-y-6">
      <section className="card space-y-1">
        <h1 className="titulo text-sm">Meu perfil</h1>
        <p className="text-lg font-semibold">{sessao.nome}</p>
        <p className="text-sm text-muted">{s?.user.email}</p>
        {b && <p className="text-sm text-muted">Comissão: {b.comissaoPct}%</p>}
      </section>

      <section className="space-y-3">
        <h2 className="titulo text-sm">Alterar minha senha</h2>
        <AlterarSenha />
      </section>
    </div>
  );
}
