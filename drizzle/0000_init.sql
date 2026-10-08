CREATE TYPE "public"."forma_pagamento" AS ENUM('pix', 'dinheiro', 'cartao');--> statement-breakpoint
CREATE TYPE "public"."status_agendamento" AS ENUM('agendado', 'atendido', 'faltou', 'cancelado');--> statement-breakpoint
CREATE TYPE "public"."tipo_lancamento" AS ENUM('entrada', 'saida');--> statement-breakpoint
CREATE TABLE "agendamento" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cliente_id" uuid NOT NULL,
	"barbeiro_id" uuid NOT NULL,
	"servico_id" uuid NOT NULL,
	"inicio" timestamp with time zone NOT NULL,
	"fim" timestamp with time zone NOT NULL,
	"preco_centavos" integer NOT NULL,
	"status" "status_agendamento" DEFAULT 'agendado' NOT NULL,
	"token" text NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "barbeiro" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nome" text NOT NULL,
	"ativo" boolean DEFAULT true NOT NULL,
	"comissao_pct" integer DEFAULT 0 NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bloqueio" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"barbeiro_id" uuid NOT NULL,
	"inicio" timestamp with time zone NOT NULL,
	"fim" timestamp with time zone NOT NULL,
	"motivo" text
);
--> statement-breakpoint
CREATE TABLE "cliente" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nome" text NOT NULL,
	"whatsapp" text NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "horario_funcionamento" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"barbeiro_id" uuid NOT NULL,
	"dia_semana" integer NOT NULL,
	"abre_min" integer NOT NULL,
	"fecha_min" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lancamento" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tipo" "tipo_lancamento" NOT NULL,
	"valor_centavos" integer NOT NULL,
	"categoria" text NOT NULL,
	"forma_pagamento" "forma_pagamento",
	"data" timestamp with time zone NOT NULL,
	"descricao" text,
	"agendamento_id" uuid
);
--> statement-breakpoint
CREATE TABLE "servico" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nome" text NOT NULL,
	"preco_centavos" integer NOT NULL,
	"duracao_min" integer NOT NULL,
	"ativo" boolean DEFAULT true NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "agendamento" ADD CONSTRAINT "agendamento_cliente_id_cliente_id_fk" FOREIGN KEY ("cliente_id") REFERENCES "public"."cliente"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agendamento" ADD CONSTRAINT "agendamento_barbeiro_id_barbeiro_id_fk" FOREIGN KEY ("barbeiro_id") REFERENCES "public"."barbeiro"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agendamento" ADD CONSTRAINT "agendamento_servico_id_servico_id_fk" FOREIGN KEY ("servico_id") REFERENCES "public"."servico"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bloqueio" ADD CONSTRAINT "bloqueio_barbeiro_id_barbeiro_id_fk" FOREIGN KEY ("barbeiro_id") REFERENCES "public"."barbeiro"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "horario_funcionamento" ADD CONSTRAINT "horario_funcionamento_barbeiro_id_barbeiro_id_fk" FOREIGN KEY ("barbeiro_id") REFERENCES "public"."barbeiro"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lancamento" ADD CONSTRAINT "lancamento_agendamento_id_agendamento_id_fk" FOREIGN KEY ("agendamento_id") REFERENCES "public"."agendamento"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "agendamento_token_uq" ON "agendamento" USING btree ("token");--> statement-breakpoint
CREATE INDEX "agendamento_barbeiro_inicio_idx" ON "agendamento" USING btree ("barbeiro_id","inicio");--> statement-breakpoint
CREATE INDEX "agendamento_cliente_idx" ON "agendamento" USING btree ("cliente_id");--> statement-breakpoint
CREATE INDEX "bloqueio_barbeiro_inicio_idx" ON "bloqueio" USING btree ("barbeiro_id","inicio");--> statement-breakpoint
CREATE UNIQUE INDEX "cliente_whatsapp_uq" ON "cliente" USING btree ("whatsapp");--> statement-breakpoint
CREATE INDEX "horario_barbeiro_idx" ON "horario_funcionamento" USING btree ("barbeiro_id");--> statement-breakpoint
CREATE UNIQUE INDEX "lancamento_agendamento_uq" ON "lancamento" USING btree ("agendamento_id");--> statement-breakpoint
CREATE INDEX "lancamento_data_idx" ON "lancamento" USING btree ("data");--> statement-breakpoint
CREATE INDEX "account_userId_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "session_userId_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" USING btree ("identifier");