import Link from "next/link";
import type { Periodo } from "@/lib/periodo";

export function SeletorPeriodo({ base, periodo }: { base: string; periodo: Periodo }) {
  const href = (tipo: string, ref: string) => `${base}?periodo=${tipo}&ref=${ref}`;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Link className="btn" href={href(periodo.tipo, periodo.anterior)} aria-label="Período anterior">‹</Link>
      <Link className="btn" href={`${base}?periodo=${periodo.tipo}`}>Hoje</Link>
      <Link className="btn" href={href(periodo.tipo, periodo.proximo)} aria-label="Próximo período">›</Link>
      <h1 className="titulo ml-1 text-sm">{periodo.rotulo}</h1>
      <div className="ml-auto flex gap-2">
        {(["dia", "semana", "mes"] as const).map((t) => (
          <Link key={t} className={`btn ${periodo.tipo === t ? "btn-primario" : ""}`} href={href(t, periodo.ref)}>
            {t === "mes" ? "Mês" : t === "dia" ? "Dia" : "Semana"}
          </Link>
        ))}
      </div>
    </div>
  );
}
