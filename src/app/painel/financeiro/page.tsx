import { and, desc, gte, lt } from "drizzle-orm";
import { db } from "@/db";
import { lancamento } from "@/db/schema";
import { formatarReais } from "@/lib/dinheiro";
import { resolverPeriodo } from "@/lib/periodo";
import { formatarDataLonga, hoje, ymdDe } from "@/lib/tempo";
import { SeletorPeriodo } from "../seletor-periodo";
import { FormLancamento, RemoverLancamento } from "./forms";

export const dynamic = "force-dynamic";

const FORMA = { pix: "Pix", dinheiro: "Dinheiro", cartao: "Cartão" } as const;

export default async function Financeiro({ searchParams }: PageProps<"/painel/financeiro">) {
  const periodo = resolverPeriodo(await searchParams);
  const itens = await db
    .select()
    .from(lancamento)
    .where(and(gte(lancamento.data, periodo.iniInstante), lt(lancamento.data, periodo.fimInstante)))
    .orderBy(desc(lancamento.data));

  const entradas = itens.filter((i) => i.tipo === "entrada").reduce((t, i) => t + i.valorCentavos, 0);
  const saidas = itens.filter((i) => i.tipo === "saida").reduce((t, i) => t + i.valorCentavos, 0);

  return (
    <div className="space-y-4">
      <SeletorPeriodo base="/painel/financeiro" periodo={periodo} />

      <div className="grid grid-cols-3 gap-2">
        <Resumo rotulo="Entradas" valor={formatarReais(entradas)} />
        <Resumo rotulo="Saídas" valor={formatarReais(saidas)} />
        <Resumo rotulo="Saldo" valor={formatarReais(entradas - saidas)} destaque={entradas - saidas < 0 ? "text-danger" : "text-ok"} />
      </div>

      <FormLancamento hoje={hoje()} />

      <section className="space-y-2">
        {itens.length === 0 && <p className="text-sm text-muted">Nenhum lançamento neste período.</p>}
        {itens.map((i) => (
          <div key={i.id} className="card flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{i.categoria}</p>
              <p className="truncate text-xs text-muted">
                {formatarDataLonga(ymdDe(i.data))}
                {i.formaPagamento ? ` · ${FORMA[i.formaPagamento]}` : ""}
                {i.agendamentoId ? " · atendimento" : ""}
                {i.descricao ? ` · ${i.descricao}` : ""}
              </p>
            </div>
            <p className={`font-semibold ${i.tipo === "entrada" ? "text-ok" : "text-danger"}`}>
              {i.tipo === "saida" ? "−" : "+"} {formatarReais(i.valorCentavos)}
            </p>
            {!i.agendamentoId && <RemoverLancamento id={i.id} />}
          </div>
        ))}
      </section>
    </div>
  );
}

function Resumo({ rotulo, valor, destaque = "" }: { rotulo: string; valor: string; destaque?: string }) {
  return (
    <div className="card !p-3">
      <p className="text-[10px] uppercase tracking-wider text-muted">{rotulo}</p>
      <p className={`text-base font-semibold sm:text-xl ${destaque}`}>{valor}</p>
    </div>
  );
}
