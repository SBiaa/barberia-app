import Link from "next/link";
import { and, asc, eq, gte, lt } from "drizzle-orm";
import { db } from "@/db";
import { agendamento, barbeiro, cliente, servico } from "@/db/schema";
import { formatarReais } from "@/lib/dinheiro";
import {
  agora,
  diaSemanaDe,
  formatarDataLonga,
  formatarHora,
  hoje,
  instanteLocal,
  somarDias,
  ymdDe,
  ymdValido,
} from "@/lib/tempo";
import { linkWhatsapp, mascararWhatsapp } from "@/lib/whatsapp";
import { linkAvaliacaoGoogle } from "@/lib/config";
import { msgAvaliacao, msgLembrete, whatsappCom } from "@/lib/mensagens";
import { urlSite } from "@/lib/site";
import { BotoesWhatsapp } from "./botoes-whatsapp";
import { AcoesAgendamento } from "./acoes-agendamento";
import { NovoAgendamento } from "./novo-agendamento";

export const dynamic = "force-dynamic";

const ROTULO = { agendado: "Agendado", atendido: "Atendido", faltou: "Faltou", cancelado: "Cancelado" } as const;
const COR = {
  agendado: "text-silver-strong",
  atendido: "text-ok",
  faltou: "text-danger",
  cancelado: "text-muted line-through",
} as const;

export default async function Agenda({ searchParams }: PageProps<"/painel">) {
  const sp = await searchParams;
  const dia = typeof sp.dia === "string" && ymdValido(sp.dia) ? sp.dia : hoje();
  const semana = sp.vista === "semana";
  const barbeiroFiltro = typeof sp.barbeiro === "string" ? sp.barbeiro : undefined;

  // Semana começa na segunda.
  const dow = diaSemanaDe(dia);
  const inicioVista = semana ? somarDias(dia, -((dow + 6) % 7)) : dia;
  const fimVista = somarDias(inicioVista, semana ? 7 : 1);

  const [linkGoogle, barbeiros, servicos, itens] = await Promise.all([
    linkAvaliacaoGoogle(),
    db.select().from(barbeiro).where(eq(barbeiro.ativo, true)).orderBy(asc(barbeiro.nome)),
    db.select().from(servico).where(eq(servico.ativo, true)).orderBy(asc(servico.nome)),
    db
      .select({
        id: agendamento.id,
        inicio: agendamento.inicio,
        fim: agendamento.fim,
        status: agendamento.status,
        preco: agendamento.precoCentavos,
        token: agendamento.token,
        lembreteEm: agendamento.lembreteEnviadoEm,
        avaliacaoEm: agendamento.avaliacaoPedidaEm,
        barbeiro: barbeiro.nome,
        servico: servico.nome,
        cliente: cliente.nome,
        whatsapp: cliente.whatsapp,
      })
      .from(agendamento)
      .innerJoin(barbeiro, eq(barbeiro.id, agendamento.barbeiroId))
      .innerJoin(servico, eq(servico.id, agendamento.servicoId))
      .innerJoin(cliente, eq(cliente.id, agendamento.clienteId))
      .where(
        and(
          gte(agendamento.inicio, instanteLocal(inicioVista, 0)),
          lt(agendamento.inicio, instanteLocal(fimVista, 0)),
          barbeiroFiltro ? eq(agendamento.barbeiroId, barbeiroFiltro) : undefined,
        ),
      )
      .orderBy(asc(agendamento.inicio)),
  ]);

  const passo = semana ? 7 : 1;
  const qs = (d: string, extra: Record<string, string> = {}) => {
    const p = new URLSearchParams({ dia: d, ...(semana ? { vista: "semana" } : {}), ...extra });
    if (barbeiroFiltro) p.set("barbeiro", barbeiroFiltro);
    return `/painel?${p}`;
  };

  const porDia = new Map<string, typeof itens>();
  for (const it of itens) {
    const k = ymdDe(it.inicio);
    porDia.set(k, [...(porDia.get(k) ?? []), it]);
  }
  const dias = semana ? Array.from({ length: 7 }, (_, i) => somarDias(inicioVista, i)) : [dia];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Link className="btn" href={qs(somarDias(dia, -passo))}>‹</Link>
        <Link className="btn" href={qs(hoje())}>Hoje</Link>
        <Link className="btn" href={qs(somarDias(dia, passo))}>›</Link>
        <h1 className="titulo ml-1 text-sm">
          {semana ? `Semana de ${formatarDataLonga(inicioVista)}` : formatarDataLonga(dia)}
        </h1>
        <div className="ml-auto flex gap-2">
          <Link className={`btn ${!semana ? "btn-primario" : ""}`} href={`/painel?dia=${dia}${barbeiroFiltro ? `&barbeiro=${barbeiroFiltro}` : ""}`}>Dia</Link>
          <Link className={`btn ${semana ? "btn-primario" : ""}`} href={qs(dia, { vista: "semana" })}>Semana</Link>
        </div>
      </div>

      {barbeiros.length > 1 && (
        <div className="flex flex-wrap gap-2 text-sm">
          <Link className={`btn ${!barbeiroFiltro ? "btn-primario" : ""}`} href={`/painel?dia=${dia}${semana ? "&vista=semana" : ""}`}>Todos</Link>
          {barbeiros.map((b) => (
            <Link key={b.id} className={`btn ${barbeiroFiltro === b.id ? "btn-primario" : ""}`}
              href={`/painel?dia=${dia}${semana ? "&vista=semana" : ""}&barbeiro=${b.id}`}>
              {b.nome}
            </Link>
          ))}
        </div>
      )}

      <NovoAgendamento
        dia={dia}
        barbeiros={barbeiros.map((b) => ({ id: b.id, nome: b.nome }))}
        servicos={servicos.map((s) => ({ id: s.id, nome: s.nome }))}
      />

      {dias.map((d) => {
        const lista = porDia.get(d) ?? [];
        return (
          <section key={d} className="space-y-2">
            {semana && <h2 className="titulo pt-2 text-xs text-muted">{formatarDataLonga(d)}</h2>}
            {lista.length === 0 && <p className="text-sm text-muted">Nenhum agendamento.</p>}
            {lista.map((a) => (
              <article key={a.id} className="card flex flex-wrap items-center gap-3">
                <div className="w-24 shrink-0">
                  <p className="text-lg font-semibold">{formatarHora(a.inicio)}</p>
                  <p className="text-xs text-muted">até {formatarHora(a.fim)}</p>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{a.cliente}</p>
                  <p className="truncate text-sm text-muted">
                    {a.servico} · {a.barbeiro} · {formatarReais(a.preco)}
                  </p>
                  <a className="text-sm text-silver underline" href={linkWhatsapp(a.whatsapp)} target="_blank" rel="noreferrer">
                    {mascararWhatsapp(a.whatsapp)}
                  </a>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className={`text-xs ${COR[a.status]}`}>{ROTULO[a.status]}</span>
                  <BotoesWhatsapp
                    id={a.id}
                    lembrete={
                      a.status === "agendado" && a.inicio > agora()
                        ? whatsappCom(a.whatsapp, msgLembrete({ nome: a.cliente, inicio: a.inicio, servico: a.servico, link: `${urlSite()}/agendamento/${a.token}` }))
                        : undefined
                    }
                    avaliacao={
                      a.status === "atendido" && linkGoogle
                        ? whatsappCom(a.whatsapp, msgAvaliacao({ nome: a.cliente, linkGoogle }))
                        : undefined
                    }
                    lembreteEnviado={!!a.lembreteEm}
                    avaliacaoEnviada={!!a.avaliacaoEm}
                  />
                  <AcoesAgendamento id={a.id} status={a.status} dia={ymdDe(a.inicio)} hora={formatarHora(a.inicio)} />
                </div>
              </article>
            ))}
          </section>
        );
      })}
    </div>
  );
}
