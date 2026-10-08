import { eq } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { agendamento, barbeiro, servico } from "@/db/schema";
import { formatarReais } from "@/lib/dinheiro";
import { agora, formatarDataLonga, formatarHora, ymdDe } from "@/lib/tempo";
import { Gerenciar } from "./gerenciar";

export const dynamic = "force-dynamic";
export const metadata = { title: "Seu agendamento", robots: { index: false } };

const ROTULO_STATUS = {
  agendado: "Confirmado",
  atendido: "Atendido",
  faltou: "Não compareceu",
  cancelado: "Cancelado",
} as const;

export default async function Page({ params, searchParams }: PageProps<"/agendamento/[token]">) {
  const { token } = await params;
  const { novo } = await searchParams;

  const [ag] = await db
    .select({
      id: agendamento.id,
      inicio: agendamento.inicio,
      fim: agendamento.fim,
      status: agendamento.status,
      preco: agendamento.precoCentavos,
      barbeiroId: agendamento.barbeiroId,
      barbeiro: barbeiro.nome,
      servico: servico.nome,
    })
    .from(agendamento)
    .innerJoin(barbeiro, eq(barbeiro.id, agendamento.barbeiroId))
    .innerJoin(servico, eq(servico.id, agendamento.servicoId))
    .where(eq(agendamento.token, token));
  if (!ag) notFound();

  const futuro = ag.inicio > agora();
  const podeAlterar = ag.status === "agendado" && futuro;
  const duracaoMin = Math.round((ag.fim.getTime() - ag.inicio.getTime()) / 60_000);

  return (
    <main className="mx-auto w-full max-w-md flex-1 px-4 py-8">
      <header className="mb-6 text-center">
        <p className="text-xs uppercase tracking-[0.3em] text-muted">Barbearia</p>
        <h1 className="titulo mt-1 text-xl">Adelson Cerqueira</h1>
      </header>

      {novo && ag.status === "agendado" && (
        <p className="mb-4 rounded-lg border border-ok/40 bg-ok/10 p-3 text-center text-sm text-ok">
          Agendamento confirmado! Guarde este link para cancelar ou remarcar.
        </p>
      )}

      <section className="card space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="titulo text-sm">Seu horário</h2>
          <span className={`text-xs ${ag.status === "cancelado" ? "text-danger" : "text-silver"}`}>
            {ROTULO_STATUS[ag.status]}
          </span>
        </div>
        <p className="text-2xl font-semibold">
          {formatarDataLonga(ymdDe(ag.inicio))} às {formatarHora(ag.inicio)}
        </p>
        <dl className="grid grid-cols-2 gap-y-2 text-sm">
          <dt className="text-muted">Serviço</dt>
          <dd className="text-right">{ag.servico}</dd>
          <dt className="text-muted">Barbeiro</dt>
          <dd className="text-right">{ag.barbeiro}</dd>
          <dt className="text-muted">Duração</dt>
          <dd className="text-right">{duracaoMin} min</dd>
          <dt className="text-muted">Valor</dt>
          <dd className="text-right">{formatarReais(ag.preco)}</dd>
        </dl>
      </section>

      {podeAlterar ? (
        <Gerenciar token={token} />
      ) : (
        <p className="mt-4 text-center text-sm text-muted">Este agendamento não pode mais ser alterado.</p>
      )}

      <p className="mt-8 text-center text-sm">
        <Link href="/" className="text-silver underline">
          Fazer um novo agendamento
        </Link>
      </p>
    </main>
  );
}
