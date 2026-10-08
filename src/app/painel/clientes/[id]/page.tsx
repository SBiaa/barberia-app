import Link from "next/link";
import { notFound } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { agendamento, barbeiro, cliente, servico } from "@/db/schema";
import { formatarReais } from "@/lib/dinheiro";
import { formatarDataLonga, formatarHora, ymdDe } from "@/lib/tempo";
import { mascararWhatsapp } from "@/lib/whatsapp";
import { BotaoAnonimizar } from "./anonimizar";

export const dynamic = "force-dynamic";

const ROTULO = { agendado: "Agendado", atendido: "Atendido", faltou: "Faltou", cancelado: "Cancelado" } as const;

export default async function ClienteDetalhe({ params }: PageProps<"/painel/clientes/[id]">) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const [c] = await db.select().from(cliente).where(eq(cliente.id, id));
  if (!c) notFound();

  const historico = await db
    .select({
      id: agendamento.id,
      inicio: agendamento.inicio,
      status: agendamento.status,
      preco: agendamento.precoCentavos,
      servico: servico.nome,
      barbeiro: barbeiro.nome,
    })
    .from(agendamento)
    .innerJoin(servico, eq(servico.id, agendamento.servicoId))
    .innerJoin(barbeiro, eq(barbeiro.id, agendamento.barbeiroId))
    .where(eq(agendamento.clienteId, id))
    .orderBy(desc(agendamento.inicio));

  const anonimo = c.whatsapp.startsWith("removido-");

  return (
    <div className="space-y-4">
      <Link href="/painel/clientes" className="text-sm text-muted hover:text-silver">‹ Clientes</Link>
      <header>
        <h1 className="titulo text-lg">{c.nome}</h1>
        {!anonimo && <p className="text-sm text-muted">{mascararWhatsapp(c.whatsapp)}</p>}
      </header>

      <section className="space-y-2">
        <h2 className="titulo text-xs text-muted">Histórico</h2>
        {historico.length === 0 && <p className="text-sm text-muted">Sem agendamentos.</p>}
        {historico.map((h) => (
          <div key={h.id} className="card flex items-center justify-between gap-3 text-sm">
            <div>
              <p className="font-medium">
                {formatarDataLonga(ymdDe(h.inicio))} às {formatarHora(h.inicio)}
              </p>
              <p className="text-muted">{h.servico} · {h.barbeiro}</p>
            </div>
            <div className="text-right">
              <p>{formatarReais(h.preco)}</p>
              <p className="text-xs text-muted">{ROTULO[h.status]}</p>
            </div>
          </div>
        ))}
      </section>

      {!anonimo && (
        <section className="card space-y-2">
          <h2 className="titulo text-xs">Privacidade (LGPD)</h2>
          <p className="text-sm text-muted">
            Se o cliente pedir a exclusão dos dados, remova nome e WhatsApp. Agendamentos futuros são cancelados e o
            histórico financeiro permanece sem identificação.
          </p>
          <BotaoAnonimizar id={c.id} />
        </section>
      )}
    </div>
  );
}
