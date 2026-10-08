import { asc } from "drizzle-orm";
import { db } from "@/db";
import { barbeiro, horarioFuncionamento, servico } from "@/db/schema";
import { minParaHora } from "@/lib/tempo";
import { BarbeiroForm, GradeHorarios, ServicoForm } from "./forms";

export const dynamic = "force-dynamic";

export default async function Cadastros() {
  const [servicos, barbeiros, horarios] = await Promise.all([
    db.select().from(servico).orderBy(asc(servico.nome)),
    db.select().from(barbeiro).orderBy(asc(barbeiro.nome)),
    db.select().from(horarioFuncionamento),
  ]);

  const grade = (barbeiroId: string) =>
    Array.from({ length: 7 }, (_, dia) =>
      horarios
        .filter((h) => h.barbeiroId === barbeiroId && h.diaSemana === dia)
        .sort((a, b) => a.abreMin - b.abreMin)
        .map((h) => `${minParaHora(h.abreMin)}-${minParaHora(h.fechaMin)}`)
        .join(", "),
    );

  return (
    <div className="space-y-10">
      <section className="space-y-3">
        <h1 className="titulo text-sm">Serviços</h1>
        {servicos.map((s) => (
          <ServicoForm key={s.id} servico={{ id: s.id, nome: s.nome, precoCentavos: s.precoCentavos, duracaoMin: s.duracaoMin, ativo: s.ativo }} />
        ))}
        <ServicoForm />
      </section>

      <section className="space-y-3">
        <h1 className="titulo text-sm">Barbeiros e horários de funcionamento</h1>
        <p className="text-sm text-muted">
          Informe as faixas de cada dia, separadas por vírgula (ex.: <code>09:00-12:00, 13:00-19:00</code>). O intervalo entre
          as faixas é o almoço. Deixe vazio para folga.
        </p>
        {barbeiros.map((b) => (
          <div key={b.id} className="card space-y-4">
            <BarbeiroForm barbeiro={{ id: b.id, nome: b.nome, comissaoPct: b.comissaoPct, ativo: b.ativo }} />
            <GradeHorarios barbeiroId={b.id} inicial={grade(b.id)} />
          </div>
        ))}
        <BarbeiroForm />
      </section>
    </div>
  );
}
