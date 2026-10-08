CREATE EXTENSION IF NOT EXISTS btree_gist;--> statement-breakpoint
ALTER TABLE "agendamento" ADD CONSTRAINT "agendamento_sem_sobreposicao"
  EXCLUDE USING gist (
    "barbeiro_id" WITH =,
    tstzrange("inicio", "fim", '[)') WITH &&
  ) WHERE ("status" IN ('agendado', 'atendido'));--> statement-breakpoint
ALTER TABLE "agendamento" ADD CONSTRAINT "agendamento_fim_apos_inicio" CHECK ("fim" > "inicio");--> statement-breakpoint
ALTER TABLE "horario_funcionamento" ADD CONSTRAINT "horario_faixa_valida" CHECK ("dia_semana" BETWEEN 0 AND 6 AND "abre_min" >= 0 AND "fecha_min" <= 1440 AND "fecha_min" > "abre_min");--> statement-breakpoint
ALTER TABLE "bloqueio" ADD CONSTRAINT "bloqueio_fim_apos_inicio" CHECK ("fim" > "inicio");--> statement-breakpoint
ALTER TABLE "barbeiro" ADD CONSTRAINT "barbeiro_comissao_valida" CHECK ("comissao_pct" BETWEEN 0 AND 100);--> statement-breakpoint
ALTER TABLE "servico" ADD CONSTRAINT "servico_valores_validos" CHECK ("preco_centavos" >= 0 AND "duracao_min" > 0);--> statement-breakpoint
ALTER TABLE "lancamento" ADD CONSTRAINT "lancamento_valor_positivo" CHECK ("valor_centavos" > 0);
