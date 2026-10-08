import Link from "next/link";
import { desc, eq, ilike, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { agendamento, cliente } from "@/db/schema";
import { formatarReais } from "@/lib/dinheiro";
import { msgRetorno, whatsappCom } from "@/lib/mensagens";
import { urlSite } from "@/lib/site";
import { agora, formatarDataLonga, ymdDe } from "@/lib/tempo";
import { mascararWhatsapp } from "@/lib/whatsapp";

export const dynamic = "force-dynamic";

export default async function Clientes({ searchParams }: PageProps<"/painel/clientes">) {
  const sp = await searchParams;
  const busca = typeof sp.q === "string" ? sp.q.trim().slice(0, 60) : "";
  const diasParam = Number(typeof sp.sumidos === "string" ? sp.sumidos : 0);
  const sumidos = Number.isInteger(diasParam) && diasParam > 0 ? Math.min(diasParam, 730) : 0;

  const rows = await db
    .select({
      id: cliente.id,
      nome: cliente.nome,
      whatsapp: cliente.whatsapp,
      visitas: sql<number>`count(*) filter (where ${agendamento.status} = 'atendido')::int`,
      gasto: sql<number>`coalesce(sum(${agendamento.precoCentavos}) filter (where ${agendamento.status} = 'atendido'), 0)::int`,
      ultima: sql<Date | null>`max(${agendamento.inicio}) filter (where ${agendamento.status} = 'atendido')`,
      proximo: sql<Date | null>`min(${agendamento.inicio}) filter (where ${agendamento.status} = 'agendado' and ${agendamento.inicio} > now())`,
    })
    .from(cliente)
    .leftJoin(agendamento, eq(agendamento.clienteId, cliente.id))
    .where(busca ? or(ilike(cliente.nome, `%${busca}%`), ilike(cliente.whatsapp, `%${busca.replace(/\D/g, "") || "—"}%`)) : undefined)
    .groupBy(cliente.id)
    .orderBy(desc(sql`max(${agendamento.inicio})`))
    .limit(300);

  const agoraMs = agora().getTime();
  const lista = rows
    .map((r) => ({
      ...r,
      ultima: r.ultima ? new Date(r.ultima) : null,
      proximo: r.proximo ? new Date(r.proximo) : null,
      diasSemVir: r.ultima ? Math.floor((agoraMs - new Date(r.ultima).getTime()) / 86_400_000) : null,
    }))
    .filter((r) => r.whatsapp.startsWith("55"))
    .filter((r) => !sumidos || (r.diasSemVir !== null && r.diasSemVir >= sumidos && !r.proximo));

  return (
    <div className="space-y-4">
      <h1 className="titulo text-sm">Clientes</h1>
      <form className="flex flex-wrap gap-2">
        <input name="q" defaultValue={busca} placeholder="Buscar por nome ou WhatsApp" className="campo flex-1" />
        <select name="sumidos" defaultValue={String(sumidos)} className="campo !w-auto">
          <option value="0">Todos</option>
          <option value="30">Sumidos há 30+ dias</option>
          <option value="45">Sumidos há 45+ dias</option>
          <option value="60">Sumidos há 60+ dias</option>
          <option value="90">Sumidos há 90+ dias</option>
        </select>
        <button className="btn btn-primario">Filtrar</button>
      </form>
      <p className="text-xs text-muted">
        {lista.length} cliente{lista.length === 1 ? "" : "s"}
        {sumidos ? `: atendidos há ${sumidos}+ dias e sem novo horário marcado` : ""}
      </p>

      <div className="space-y-2">
        {lista.length === 0 && <p className="text-sm text-muted">Nenhum cliente encontrado.</p>}
        {lista.map((c) => (
          <article key={c.id} className="card flex flex-wrap items-center gap-3">
            <div className="min-w-0 flex-1">
              <Link href={`/painel/clientes/${c.id}`} className="block truncate font-medium hover:text-silver-strong">
                {c.nome}
              </Link>
              <p className="text-sm text-muted">{mascararWhatsapp(c.whatsapp)}</p>
              <p className="text-xs text-muted">
                {c.visitas} visita{c.visitas === 1 ? "" : "s"} · {formatarReais(c.gasto)}
                {c.ultima ? ` · última: ${formatarDataLonga(ymdDe(c.ultima))} (${c.diasSemVir}d)` : " · sem atendimentos"}
                {c.proximo ? ` · próximo: ${formatarDataLonga(ymdDe(c.proximo))}` : ""}
              </p>
            </div>
            <a
              className="btn !min-h-9 !px-3 text-xs"
              target="_blank"
              rel="noreferrer"
              href={whatsappCom(c.whatsapp, msgRetorno({ nome: c.nome, linkAgendar: urlSite() }))}
            >
              Chamar no WhatsApp
            </a>
          </article>
        ))}
      </div>
    </div>
  );
}
