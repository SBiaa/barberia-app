CREATE TABLE "configuracao" (
	"chave" text PRIMARY KEY NOT NULL,
	"valor" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "agendamento" ADD COLUMN "lembrete_enviado_em" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "agendamento" ADD COLUMN "avaliacao_pedida_em" timestamp with time zone;