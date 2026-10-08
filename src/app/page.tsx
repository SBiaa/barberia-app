import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { barbeiro, servico } from "@/db/schema";
import { Agendar } from "./_agendar/agendar";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [servicos, barbeiros] = await Promise.all([
    db.select().from(servico).where(eq(servico.ativo, true)).orderBy(asc(servico.nome)),
    db.select().from(barbeiro).where(eq(barbeiro.ativo, true)).orderBy(asc(barbeiro.nome)),
  ]);

  return (
    <main className="mx-auto w-full max-w-md flex-1 px-4 py-8">
      <header className="mb-8 text-center">
        <p className="text-xs uppercase tracking-[0.3em] text-muted">Barbearia</p>
        <h1 className="titulo mt-1 text-2xl">Adelson Cerqueira</h1>
        <p className="mt-2 text-sm text-muted">Agende seu horário em poucos toques</p>
      </header>
      {servicos.length === 0 || barbeiros.length === 0 ? (
        <p className="card text-center text-sm text-muted">
          Agenda online em breve. Por enquanto, fale com a gente pelo WhatsApp.
        </p>
      ) : (
        <Agendar
          servicos={servicos.map((s) => ({
            id: s.id,
            nome: s.nome,
            precoCentavos: s.precoCentavos,
            duracaoMin: s.duracaoMin,
          }))}
          barbeiros={barbeiros.map((b) => ({ id: b.id, nome: b.nome }))}
        />
      )}
    </main>
  );
}
