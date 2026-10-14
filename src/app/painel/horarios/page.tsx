import { and, asc, eq, gte } from "drizzle-orm";
import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { bloqueio, horarioFuncionamento } from "@/db/schema";
import { exigirSessao } from "@/lib/sessao";
import { formatarDataLonga, formatarHora, hoje, instanteLocal, minParaHora, nomeDiaSemana, ymdDe } from "@/lib/tempo";

export const dynamic = "force-dynamic";

export default async function MeusHorarios() {
  const sessao = await exigirSessao();
  if (!sessao.barbeiroId) redirect("/painel/cadastros");

  const [faixas, bloqueios] = await Promise.all([
    db.select().from(horarioFuncionamento).where(eq(horarioFuncionamento.barbeiroId, sessao.barbeiroId)),
    db
      .select()
      .from(bloqueio)
      .where(and(eq(bloqueio.barbeiroId, sessao.barbeiroId), gte(bloqueio.fim, instanteLocal(hoje(), 0))))
      .orderBy(asc(bloqueio.inicio)),
  ]);

  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <h1 className="titulo text-sm">Minha grade semanal</h1>
        {[1, 2, 3, 4, 5, 6, 0].map((d) => {
          const f = faixas.filter((x) => x.diaSemana === d).sort((a, b) => a.abreMin - b.abreMin);
          return (
            <div key={d} className="card flex items-center justify-between text-sm">
              <span className="capitalize">{nomeDiaSemana(d)}</span>
              <span className={f.length ? "" : "text-muted"}>
                {f.length ? f.map((x) => `${minParaHora(x.abreMin)}–${minParaHora(x.fechaMin)}`).join("  ·  ") : "Folga"}
              </span>
            </div>
          );
        })}
        <p className="text-xs text-muted">Para alterar a grade, fale com o administrador.</p>
      </section>

      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="titulo text-xs text-muted">Próximas folgas e bloqueios</h2>
          <Link href="/painel/bloqueios" className="text-sm text-silver underline">
            Gerenciar
          </Link>
        </div>
        {bloqueios.length === 0 && <p className="text-sm text-muted">Nenhum bloqueio.</p>}
        {bloqueios.map((b) => (
          <div key={b.id} className="card text-sm">
            {formatarDataLonga(ymdDe(b.inicio))} · {formatarHora(b.inicio)}–
            {formatarHora(b.fim) === "00:00" ? "24:00" : formatarHora(b.fim)}
            {b.motivo ? <span className="text-muted"> · {b.motivo}</span> : null}
          </div>
        ))}
      </section>
    </div>
  );
}
