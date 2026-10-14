import { and, asc, eq, gte, lt } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { agendamento, barbeiro, cliente, servico } from "@/db/schema";
import { formatarReais } from "@/lib/dinheiro";
import { resolverPeriodo } from "@/lib/periodo";
import { exigirSessao } from "@/lib/sessao";
import { formatarDataLonga, formatarHora, ymdDe } from "@/lib/tempo";
import { SeletorPeriodo } from "../seletor-periodo";

export const dynamic = "force-dynamic";

export default async function Ganhos({ searchParams }: PageProps<"/painel/ganhos">) {
  const sessao = await exigirSessao();
  if (!sessao.barbeiroId) redirect("/painel/relatorios");
  const periodo = resolverPeriodo(await searchParams);

  const [eu] = await db.select().from(barbeiro).where(eq(barbeiro.id, sessao.barbeiroId));
  const itens = await db
    .select({
      id: agendamento.id,
      inicio: agendamento.inicio,
      status: agendamento.status,
      preco: agendamento.precoCentavos,
      servico: servico.nome,
      cliente: cliente.nome,
    })
    .from(agendamento)
    .innerJoin(servico, eq(servico.id, agendamento.servicoId))
    .innerJoin(cliente, eq(cliente.id, agendamento.clienteId))
    .where(
      and(
        eq(agendamento.barbeiroId, sessao.barbeiroId),
        gte(agendamento.inicio, periodo.iniInstante),
        lt(agendamento.inicio, periodo.fimInstante),
      ),
    )
    .orderBy(asc(agendamento.inicio));

  const atendidos = itens.filter((i) => i.status === "atendido");
  const faltas = itens.filter((i) => i.status === "faltou").length;
  const receita = atendidos.reduce((t, i) => t + i.preco, 0);
  const pct = eu?.comissaoPct ?? 0;
  const comissao = Math.round((receita * pct) / 100);
  const ticket = atendidos.length ? Math.round(receita / atendidos.length) : null;

  return (
    <div className="space-y-6">
      <SeletorPeriodo base="/painel/ganhos" periodo={periodo} />

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <Card rotulo="Meus ganhos (comissão)" valor={formatarReais(comissao)} destaque />
        <Card rotulo="Receita gerada" valor={formatarReais(receita)} />
        <Card rotulo="Atendimentos" valor={String(atendidos.length)} />
        <Card rotulo="Ticket médio" valor={ticket === null ? "—" : formatarReais(ticket)} />
        <Card rotulo="Faltas" valor={String(faltas)} />
        <Card rotulo="Minha comissão" valor={`${pct}%`} />
      </div>
      {pct === 0 && (
        <p className="text-xs text-muted">
          Sua comissão está em 0%. O percentual é definido pelo administrador da barbearia.
        </p>
      )}

      <section className="space-y-2">
        <h2 className="titulo text-xs text-muted">Atendimentos do período</h2>
        {atendidos.length === 0 && <p className="text-sm text-muted">Nenhum atendimento concluído neste período.</p>}
        {atendidos.map((a) => (
          <div key={a.id} className="card flex items-center justify-between gap-3 text-sm">
            <div className="min-w-0">
              <p className="truncate font-medium">{a.cliente}</p>
              <p className="truncate text-xs text-muted">
                {formatarDataLonga(ymdDe(a.inicio))} às {formatarHora(a.inicio)} · {a.servico}
              </p>
            </div>
            <p className="shrink-0 font-medium">{formatarReais(a.preco)}</p>
          </div>
        ))}
      </section>
    </div>
  );
}

function Card({ rotulo, valor, destaque = false }: { rotulo: string; valor: string; destaque?: boolean }) {
  return (
    <div className={`card !p-3 ${destaque ? "!border-silver-strong" : ""}`}>
      <p className="text-[10px] uppercase tracking-wider text-muted">{rotulo}</p>
      <p className="text-xl font-semibold">{valor}</p>
    </div>
  );
}
