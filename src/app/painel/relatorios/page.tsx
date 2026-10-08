import { and, eq, gte, lt } from "drizzle-orm";
import { db } from "@/db";
import { agendamento, barbeiro, lancamento, servico } from "@/db/schema";
import { formatarReais } from "@/lib/dinheiro";
import { resolverPeriodo } from "@/lib/periodo";
import { montarRelatorio } from "@/lib/relatorio";
import { SeletorPeriodo } from "../seletor-periodo";

export const dynamic = "force-dynamic";

export default async function Relatorios({ searchParams }: PageProps<"/painel/relatorios">) {
  const periodo = resolverPeriodo(await searchParams);

  const [ags, lancs] = await Promise.all([
    db
      .select({
        inicio: agendamento.inicio,
        status: agendamento.status,
        precoCentavos: agendamento.precoCentavos,
        servico: servico.nome,
        barbeiroId: barbeiro.id,
        barbeiro: barbeiro.nome,
        comissaoPct: barbeiro.comissaoPct,
      })
      .from(agendamento)
      .innerJoin(servico, eq(servico.id, agendamento.servicoId))
      .innerJoin(barbeiro, eq(barbeiro.id, agendamento.barbeiroId))
      .where(and(gte(agendamento.inicio, periodo.iniInstante), lt(agendamento.inicio, periodo.fimInstante))),
    db
      .select({ tipo: lancamento.tipo, valorCentavos: lancamento.valorCentavos })
      .from(lancamento)
      .where(and(gte(lancamento.data, periodo.iniInstante), lt(lancamento.data, periodo.fimInstante))),
  ]);

  const r = montarRelatorio(ags, lancs);
  const maxServ = Math.max(1, ...r.servicos.map((s) => s.qtd));
  const maxDia = Math.max(1, ...r.diasMaisCheios.map((d) => d.qtd));
  const maxHora = Math.max(1, ...r.horasMaisCheias.map((h) => h.qtd));
  const mostrarBarbeiros = r.barbeiros.length > 1 || r.barbeiros.some((b) => b.comissao > 0);

  return (
    <div className="space-y-6">
      <SeletorPeriodo base="/painel/relatorios" periodo={periodo} />

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <Card rotulo="Atendimentos" valor={String(r.atendimentos)} />
        <Card rotulo="Receita" valor={formatarReais(r.receita)} />
        <Card rotulo="Despesas" valor={formatarReais(r.despesas)} />
        <Card rotulo="Saldo" valor={formatarReais(r.saldo)} cor={r.saldo < 0 ? "text-danger" : "text-ok"} />
        <Card rotulo="Ticket médio" valor={r.ticketMedio === null ? "—" : formatarReais(r.ticketMedio)} />
        <Card
          rotulo="Taxa de faltas"
          valor={r.taxaFaltasPct === null ? "—" : `${r.taxaFaltasPct.toFixed(1).replace(".", ",")}%`}
          detalhe={`${r.faltas} falta${r.faltas === 1 ? "" : "s"}`}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Lista titulo="Serviços mais vendidos" vazio={r.servicos.length === 0}>
          {r.servicos.map((s) => (
            <Barra key={s.nome} nome={s.nome} valor={s.qtd} max={maxServ} texto={`${s.qtd} · ${formatarReais(s.receita)}`} />
          ))}
        </Lista>
        <Lista titulo="Dias mais cheios" vazio={r.diasMaisCheios.length === 0}>
          {r.diasMaisCheios.map((d) => (
            <Barra key={d.nome} nome={d.nome} valor={d.qtd} max={maxDia} texto={String(d.qtd)} />
          ))}
        </Lista>
        <Lista titulo="Horários mais cheios" vazio={r.horasMaisCheias.length === 0}>
          {r.horasMaisCheias.map((h) => (
            <Barra key={h.hora} nome={h.hora} valor={h.qtd} max={maxHora} texto={String(h.qtd)} />
          ))}
        </Lista>
        {mostrarBarbeiros && (
          <Lista titulo="Por barbeiro" vazio={r.barbeiros.length === 0}>
            {r.barbeiros.map((b) => (
              <div key={b.id} className="flex items-baseline justify-between gap-2 text-sm">
                <span className="truncate">{b.nome}</span>
                <span className="shrink-0 text-right">
                  {b.atendimentos} · {formatarReais(b.receita)}
                  <span className="block text-xs text-muted">comissão {formatarReais(b.comissao)}</span>
                </span>
              </div>
            ))}
          </Lista>
        )}
      </div>
      <p className="text-xs text-muted">
        Receita e despesas vêm dos lançamentos do período. Atendimentos, ticket médio e comissão consideram só agendamentos
        marcados como atendidos. Faltas = faltou ÷ (atendidos + faltas).
      </p>
    </div>
  );
}

function Card({ rotulo, valor, detalhe, cor = "" }: { rotulo: string; valor: string; detalhe?: string; cor?: string }) {
  return (
    <div className="card !p-3">
      <p className="text-[10px] uppercase tracking-wider text-muted">{rotulo}</p>
      <p className={`text-xl font-semibold ${cor}`}>{valor}</p>
      {detalhe && <p className="text-xs text-muted">{detalhe}</p>}
    </div>
  );
}

function Lista({ titulo, vazio, children }: { titulo: string; vazio: boolean; children: React.ReactNode }) {
  return (
    <section className="card space-y-3">
      <h2 className="titulo text-xs">{titulo}</h2>
      {vazio ? <p className="text-sm text-muted">Sem dados no período.</p> : children}
    </section>
  );
}

function Barra({ nome, valor, max, texto }: { nome: string; valor: number; max: number; texto: string }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between gap-2 text-sm">
        <span className="truncate capitalize">{nome}</span>
        <span className="shrink-0 text-muted">{texto}</span>
      </div>
      <div className="h-1.5 rounded bg-surface-2">
        <div className="h-1.5 rounded bg-silver" style={{ width: `${(valor / max) * 100}%` }} />
      </div>
    </div>
  );
}
