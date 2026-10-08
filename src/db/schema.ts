import {
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export * from "./auth-schema";

// Valores monetários sempre em centavos (inteiro). Datas em timestamptz (UTC);
// a conversão para America/Sao_Paulo acontece em src/lib/tempo.ts.

export const statusAgendamento = pgEnum("status_agendamento", [
  "agendado",
  "atendido",
  "faltou",
  "cancelado",
]);
export const tipoLancamento = pgEnum("tipo_lancamento", ["entrada", "saida"]);
export const formaPagamento = pgEnum("forma_pagamento", [
  "pix",
  "dinheiro",
  "cartao",
]);

export const barbeiro = pgTable("barbeiro", {
  id: uuid("id").primaryKey().defaultRandom(),
  nome: text("nome").notNull(),
  ativo: boolean("ativo").notNull().default(true),
  comissaoPct: integer("comissao_pct").notNull().default(0),
  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
});

export const servico = pgTable("servico", {
  id: uuid("id").primaryKey().defaultRandom(),
  nome: text("nome").notNull(),
  precoCentavos: integer("preco_centavos").notNull(),
  duracaoMin: integer("duracao_min").notNull(),
  ativo: boolean("ativo").notNull().default(true),
  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
});

// Uma linha por faixa de trabalho. Almoço = duas faixas no mesmo dia
// (ex.: 09:00–12:00 e 13:00–19:00). Dia sem linha = folga.
// abre/fecha em minutos desde 00:00 (horário local de São Paulo).
export const horarioFuncionamento = pgTable(
  "horario_funcionamento",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    barbeiroId: uuid("barbeiro_id")
      .notNull()
      .references(() => barbeiro.id, { onDelete: "cascade" }),
    diaSemana: integer("dia_semana").notNull(), // 0 = domingo … 6 = sábado
    abreMin: integer("abre_min").notNull(),
    fechaMin: integer("fecha_min").notNull(),
  },
  (t) => [index("horario_barbeiro_idx").on(t.barbeiroId)],
);

export const bloqueio = pgTable(
  "bloqueio",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    barbeiroId: uuid("barbeiro_id")
      .notNull()
      .references(() => barbeiro.id, { onDelete: "cascade" }),
    inicio: timestamp("inicio", { withTimezone: true }).notNull(),
    fim: timestamp("fim", { withTimezone: true }).notNull(),
    motivo: text("motivo"),
  },
  (t) => [index("bloqueio_barbeiro_inicio_idx").on(t.barbeiroId, t.inicio)],
);

// LGPD: apenas nome e WhatsApp.
export const cliente = pgTable(
  "cliente",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    nome: text("nome").notNull(),
    whatsapp: text("whatsapp").notNull(), // só dígitos, com DDI (55…)
    criadoEm: timestamp("criado_em", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [uniqueIndex("cliente_whatsapp_uq").on(t.whatsapp)],
);

// A exclusão de sobreposição (mesmo barbeiro, intervalos que se cruzam,
// status agendado/atendido) é garantida por constraint no banco — ver
// drizzle/0001_agendamento_sem_conflito.sql.
export const agendamento = pgTable(
  "agendamento",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clienteId: uuid("cliente_id")
      .notNull()
      .references(() => cliente.id),
    barbeiroId: uuid("barbeiro_id")
      .notNull()
      .references(() => barbeiro.id),
    servicoId: uuid("servico_id")
      .notNull()
      .references(() => servico.id),
    inicio: timestamp("inicio", { withTimezone: true }).notNull(),
    fim: timestamp("fim", { withTimezone: true }).notNull(),
    // Preço no momento da marcação (o catálogo pode mudar depois).
    precoCentavos: integer("preco_centavos").notNull(),
    status: statusAgendamento("status").notNull().default("agendado"),
    token: text("token").notNull(),
    lembreteEnviadoEm: timestamp("lembrete_enviado_em", { withTimezone: true }),
    avaliacaoPedidaEm: timestamp("avaliacao_pedida_em", { withTimezone: true }),
    criadoEm: timestamp("criado_em", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("agendamento_token_uq").on(t.token),
    index("agendamento_barbeiro_inicio_idx").on(t.barbeiroId, t.inicio),
    index("agendamento_cliente_idx").on(t.clienteId),
  ],
);

export const lancamento = pgTable(
  "lancamento",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tipo: tipoLancamento("tipo").notNull(),
    valorCentavos: integer("valor_centavos").notNull(),
    categoria: text("categoria").notNull(),
    formaPagamento: formaPagamento("forma_pagamento"),
    data: timestamp("data", { withTimezone: true }).notNull(),
    descricao: text("descricao"),
    agendamentoId: uuid("agendamento_id").references(() => agendamento.id),
  },
  (t) => [
    uniqueIndex("lancamento_agendamento_uq").on(t.agendamentoId),
    index("lancamento_data_idx").on(t.data),
  ],
);

// Configurações simples chave/valor (ex.: link de avaliação do Google).
export const configuracao = pgTable("configuracao", {
  chave: text("chave").primaryKey(),
  valor: text("valor").notNull(),
});
