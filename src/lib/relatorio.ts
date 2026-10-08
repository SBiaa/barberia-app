import { diaSemanaDe, nomeDiaSemana, ymdDe } from "./tempo";
import { TZDate } from "@date-fns/tz";
import { ZONA } from "./tempo";

export type AgRel = {
  inicio: Date;
  status: "agendado" | "atendido" | "faltou" | "cancelado";
  precoCentavos: number;
  servico: string;
  barbeiroId: string;
  barbeiro: string;
  comissaoPct: number;
};
export type LancRel = { tipo: "entrada" | "saida"; valorCentavos: number };

export type Relatorio = {
  atendimentos: number;
  faltas: number;
  taxaFaltasPct: number | null;
  receita: number;
  despesas: number;
  saldo: number;
  ticketMedio: number | null;
  servicos: { nome: string; qtd: number; receita: number }[];
  diasMaisCheios: { nome: string; qtd: number }[];
  horasMaisCheias: { hora: string; qtd: number }[];
  barbeiros: { id: string; nome: string; atendimentos: number; receita: number; comissao: number }[];
};

export function montarRelatorio(ags: AgRel[], lancs: LancRel[]): Relatorio {
  const atendidos = ags.filter((a) => a.status === "atendido");
  const faltas = ags.filter((a) => a.status === "faltou").length;
  const receita = lancs.filter((l) => l.tipo === "entrada").reduce((t, l) => t + l.valorCentavos, 0);
  const despesas = lancs.filter((l) => l.tipo === "saida").reduce((t, l) => t + l.valorCentavos, 0);
  const receitaAtend = atendidos.reduce((t, a) => t + a.precoCentavos, 0);

  const porServico = new Map<string, { qtd: number; receita: number }>();
  const porBarbeiro = new Map<string, { nome: string; pct: number; atendimentos: number; receita: number }>();
  for (const a of atendidos) {
    const s = porServico.get(a.servico) ?? { qtd: 0, receita: 0 };
    porServico.set(a.servico, { qtd: s.qtd + 1, receita: s.receita + a.precoCentavos });
    const b = porBarbeiro.get(a.barbeiroId) ?? { nome: a.barbeiro, pct: a.comissaoPct, atendimentos: 0, receita: 0 };
    porBarbeiro.set(a.barbeiroId, { ...b, atendimentos: b.atendimentos + 1, receita: b.receita + a.precoCentavos });
  }

  // Movimento = tudo que ocupou/ocupa a agenda (exclui cancelados).
  const ocupados = ags.filter((a) => a.status !== "cancelado");
  const dias = new Map<number, number>();
  const horas = new Map<number, number>();
  for (const a of ocupados) {
    const d = diaSemanaDe(ymdDe(a.inicio));
    dias.set(d, (dias.get(d) ?? 0) + 1);
    const h = new TZDate(a.inicio.getTime(), ZONA).getHours();
    horas.set(h, (horas.get(h) ?? 0) + 1);
  }

  return {
    atendimentos: atendidos.length,
    faltas,
    taxaFaltasPct: atendidos.length + faltas > 0 ? (faltas / (atendidos.length + faltas)) * 100 : null,
    receita,
    despesas,
    saldo: receita - despesas,
    ticketMedio: atendidos.length > 0 ? Math.round(receitaAtend / atendidos.length) : null,
    servicos: [...porServico].map(([nome, v]) => ({ nome, ...v })).sort((a, b) => b.qtd - a.qtd),
    diasMaisCheios: [...dias].map(([d, qtd]) => ({ nome: nomeDiaSemana(d), qtd })).sort((a, b) => b.qtd - a.qtd),
    horasMaisCheias: [...horas]
      .map(([h, qtd]) => ({ hora: `${String(h).padStart(2, "0")}h`, qtd }))
      .sort((a, b) => b.qtd - a.qtd)
      .slice(0, 5),
    barbeiros: [...porBarbeiro]
      .map(([id, b]) => ({
        id,
        nome: b.nome,
        atendimentos: b.atendimentos,
        receita: b.receita,
        comissao: Math.round((b.receita * b.pct) / 100),
      }))
      .sort((a, b) => b.receita - a.receita),
  };
}
