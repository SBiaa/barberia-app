import { asc, eq, gte } from "drizzle-orm";
import { db } from "@/db";
import { barbeiro, bloqueio } from "@/db/schema";
import { formatarDataLonga, formatarHora, hoje, instanteLocal, ymdDe } from "@/lib/tempo";
import { FormBloqueio, RemoverBloqueio } from "./forms";

export const dynamic = "force-dynamic";

export default async function Bloqueios() {
  const [barbeiros, lista] = await Promise.all([
    db.select().from(barbeiro).where(eq(barbeiro.ativo, true)).orderBy(asc(barbeiro.nome)),
    db
      .select({
        id: bloqueio.id,
        inicio: bloqueio.inicio,
        fim: bloqueio.fim,
        motivo: bloqueio.motivo,
        barbeiro: barbeiro.nome,
      })
      .from(bloqueio)
      .innerJoin(barbeiro, eq(barbeiro.id, bloqueio.barbeiroId))
      .where(gte(bloqueio.fim, instanteLocal(hoje(), 0)))
      .orderBy(asc(bloqueio.inicio)),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="titulo text-sm">Bloquear horários</h1>
      <p className="text-sm text-muted">
        Folga, almoço ou imprevisto: o horário some da página de agendamento. Agendamentos já marcados dentro do
        bloqueio continuam na agenda para você remarcar ou cancelar.
      </p>
      <FormBloqueio barbeiros={barbeiros.map((b) => ({ id: b.id, nome: b.nome }))} dia={hoje()} />

      <section className="space-y-2">
        <h2 className="titulo text-xs text-muted">Próximos bloqueios</h2>
        {lista.length === 0 && <p className="text-sm text-muted">Nenhum bloqueio.</p>}
        {lista.map((b) => (
          <div key={b.id} className="card flex items-center justify-between gap-3">
            <div>
              <p className="font-medium">
                {formatarDataLonga(ymdDe(b.inicio))} · {formatarHora(b.inicio)}–{formatarHora(b.fim) === "00:00" ? "24:00" : formatarHora(b.fim)}
              </p>
              <p className="text-sm text-muted">
                {b.barbeiro}
                {b.motivo ? ` · ${b.motivo}` : ""}
              </p>
            </div>
            <RemoverBloqueio id={b.id} />
          </div>
        ))}
      </section>
    </div>
  );
}
