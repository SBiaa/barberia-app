import { diaSemanaDe, formatarDataLonga, hoje, instanteLocal, somarDias, ymdValido } from "./tempo";

export type TipoPeriodo = "dia" | "semana" | "mes";

export type Periodo = {
  tipo: TipoPeriodo;
  ref: string; // dia de referência
  ini: string; // ymd inclusivo
  fim: string; // ymd exclusivo
  iniInstante: Date;
  fimInstante: Date;
  rotulo: string;
  anterior: string;
  proximo: string;
};

const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

function mesDe(ymd: string, delta: number) {
  const [a, m] = ymd.split("-").map(Number);
  const d = new Date(Date.UTC(a, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-01`;
}

export function resolverPeriodo(sp: Record<string, string | string[] | undefined>): Periodo {
  const tipo: TipoPeriodo = sp.periodo === "dia" || sp.periodo === "semana" ? sp.periodo : "mes";
  const ref = typeof sp.ref === "string" && ymdValido(sp.ref) ? sp.ref : hoje();

  let ini: string, fim: string, rotulo: string, anterior: string, proximo: string;
  if (tipo === "dia") {
    ini = ref;
    fim = somarDias(ref, 1);
    rotulo = formatarDataLonga(ref);
    anterior = somarDias(ref, -1);
    proximo = somarDias(ref, 1);
  } else if (tipo === "semana") {
    ini = somarDias(ref, -((diaSemanaDe(ref) + 6) % 7)); // segunda
    fim = somarDias(ini, 7);
    rotulo = `${formatarDataLonga(ini)} a ${formatarDataLonga(somarDias(fim, -1))}`;
    anterior = somarDias(ref, -7);
    proximo = somarDias(ref, 7);
  } else {
    ini = mesDe(ref, 0);
    fim = mesDe(ref, 1);
    rotulo = `${MESES[Number(ini.slice(5, 7)) - 1]} de ${ini.slice(0, 4)}`;
    anterior = mesDe(ref, -1);
    proximo = mesDe(ref, 1);
  }
  return { tipo, ref, ini, fim, iniInstante: instanteLocal(ini, 0), fimInstante: instanteLocal(fim, 0), rotulo, anterior, proximo };
}
