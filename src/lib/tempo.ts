import { TZDate } from "@date-fns/tz";

export const ZONA = "America/Sao_Paulo";

/** Instante (UTC) correspondente a "ymd" às "minutos" desde 00:00 em São Paulo. */
export function instanteLocal(ymd: string, minutos: number): Date {
  const [a, m, d] = ymd.split("-").map(Number);
  const t = new TZDate(a, m - 1, d, Math.floor(minutos / 60), minutos % 60, 0, 0, ZONA);
  return new Date(t.getTime());
}

/** "YYYY-MM-DD" do instante, no calendário de São Paulo. */
export function ymdDe(instante: Date): string {
  const t = new TZDate(instante.getTime(), ZONA);
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
}

export function hoje(): string {
  return ymdDe(new Date());
}

/** 0 = domingo … 6 = sábado, do dia "ymd". */
export function diaSemanaDe(ymd: string): number {
  const [a, m, d] = ymd.split("-").map(Number);
  return new TZDate(a, m - 1, d, 12, 0, 0, 0, ZONA).getDay();
}

export function somarDias(ymd: string, n: number): string {
  const [a, m, d] = ymd.split("-").map(Number);
  const t = new TZDate(a, m - 1, d + n, 12, 0, 0, 0, ZONA);
  return ymdDe(new Date(t.getTime()));
}

export function ymdValido(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  return somarDias(s, 0) === s;
}

export function minutosDoDia(instante: Date): number {
  const t = new TZDate(instante.getTime(), ZONA);
  return t.getHours() * 60 + t.getMinutes();
}

export function formatarHora(instante: Date): string {
  const min = minutosDoDia(instante);
  return minParaHora(min);
}

export function minParaHora(min: number): string {
  return `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
}

export function horaParaMin(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

const DIAS = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];
export const nomeDiaSemana = (i: number) => DIAS[i];

export function formatarDataLonga(ymd: string): string {
  const [, m, d] = ymd.split("-").map(Number);
  return `${DIAS[diaSemanaDe(ymd)]}, ${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}`;
}

export const agora = () => new Date();
