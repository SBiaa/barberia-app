// DADOS FICTÍCIOS, só para apresentação do sistema.
// Nunca rode contra o banco de produção: usa DEMO_DATABASE_URL (branch "demo" do Neon).
// Uso: DEMO_DATABASE_URL=... DEMO_EMAIL=... DEMO_SENHA=... npx tsx scripts/seed-demo.ts
import { config } from "dotenv";
import { randomBytes, randomUUID } from "node:crypto";

config({ path: ".env.local" });

async function main() {
  const url = process.env.DEMO_DATABASE_URL;
  const email = process.env.DEMO_EMAIL;
  const senha = process.env.DEMO_SENHA;
  if (!url || !email || !senha) throw new Error("Defina DEMO_DATABASE_URL, DEMO_EMAIL e DEMO_SENHA.");
  process.env.DATABASE_URL = url;

  const { db } = await import("../src/db");
  const s = await import("../src/db/schema");
  const { auth } = await import("../src/lib/auth");
  const { instanteLocal, hoje, somarDias, diaSemanaDe } = await import("../src/lib/tempo");

  // Admin de demonstração
  const ctx = await auth.$context;
  const user = await ctx.internalAdapter.createUser({ name: "Admin Demo", email, emailVerified: true } as never, undefined as never);
  await ctx.internalAdapter.linkAccount({
    id: randomUUID(),
    userId: user.id,
    accountId: user.id,
    providerId: "credential",
    password: await ctx.password.hash(senha),
  });

  const servicos = await db
    .insert(s.servico)
    .values([
      { nome: "Corte", precoCentavos: 4000, duracaoMin: 30 },
      { nome: "Barba", precoCentavos: 3000, duracaoMin: 30 },
      { nome: "Corte + Barba", precoCentavos: 6500, duracaoMin: 60 },
      { nome: "Sobrancelha", precoCentavos: 1500, duracaoMin: 15 },
    ])
    .returning();
  const barbeiros = await db
    .insert(s.barbeiro)
    .values([
      { nome: "Adelson (demo)", comissaoPct: 0 },
      { nome: "Rafael (demo)", comissaoPct: 40 },
    ])
    .returning();

  // Seg–sáb: 09–12 e 13–19 (sábado até 17); domingo folga
  for (const b of barbeiros) {
    const linhas = [];
    for (let d = 1; d <= 6; d++) {
      linhas.push({ barbeiroId: b.id, diaSemana: d, abreMin: 540, fechaMin: 720 });
      linhas.push({ barbeiroId: b.id, diaSemana: d, abreMin: 780, fechaMin: d === 6 ? 1020 : 1140 });
    }
    await db.insert(s.horarioFuncionamento).values(linhas);
  }

  const nomes = ["Carlos Souza", "Marcos Lima", "João Pereira", "Pedro Alves", "Lucas Ramos", "Rodrigo Dias",
    "Felipe Costa", "André Martins", "Bruno Rocha", "Thiago Nunes", "Gustavo Melo", "Diego Barros"];
  const clientes = await db
    .insert(s.cliente)
    .values(nomes.map((nome, i) => ({ nome, whatsapp: `5511999990${String(i).padStart(3, "0")}` })))
    .returning();

  // Pseudo-aleatório determinístico
  let seed = 7;
  const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);

  const hojeYmd = hoje();
  const linhas: (typeof s.agendamento.$inferInsert)[] = [];
  for (let off = -28; off <= 10; off++) {
    const dia = somarDias(hojeYmd, off);
    if (diaSemanaDe(dia) === 0) continue;
    for (const b of barbeiros) {
      // horários em passos de 30 min, sem sobreposição (serviços de 60 min ocupam 2 passos)
      const manha = [540, 570, 600, 630, 660, 690];
      const tarde = [780, 810, 840, 870, 900, 930, 960, 990, 1020, 1050, 1080, 1110];
      const livres = [...manha, ...tarde].filter((m) => diaSemanaDe(dia) !== 6 || m < 1020);
      const ocupados = new Set<number>();
      for (const m of livres) {
        if (ocupados.has(m) || rnd() > (off < 0 ? 0.6 : 0.4)) continue;
        const srv = servicos[Math.floor(rnd() * servicos.length)];
        const passos = Math.max(1, Math.ceil(srv.duracaoMin / 30));
        const cabe = Array.from({ length: passos }, (_, i) => m + i * 30).every(
          (x) => livres.includes(x) && !ocupados.has(x),
        );
        if (!cabe) continue;
        for (let i = 0; i < passos; i++) ocupados.add(m + i * 30);
        const inicio = instanteLocal(dia, m);
        const r = rnd();
        const status = off < 0 ? (r < 0.82 ? "atendido" : r < 0.92 ? "faltou" : "cancelado") : r < 0.9 ? "agendado" : "cancelado";
        linhas.push({
          id: randomUUID(),
          clienteId: clientes[Math.floor(rnd() * clientes.length)].id,
          barbeiroId: b.id,
          servicoId: srv.id,
          inicio,
          fim: new Date(inicio.getTime() + srv.duracaoMin * 60_000),
          precoCentavos: srv.precoCentavos,
          status,
          token: randomBytes(24).toString("base64url"),
        });
      }
    }
  }
  for (let i = 0; i < linhas.length; i += 50) await db.insert(s.agendamento).values(linhas.slice(i, i + 50));

  const formas = ["pix", "dinheiro", "cartao"] as const;
  const entradas = linhas
    .filter((l) => l.status === "atendido")
    .map((l, i) => ({
      tipo: "entrada" as const,
      valorCentavos: l.precoCentavos,
      categoria: "Atendimento",
      formaPagamento: formas[i % 3],
      data: l.inicio,
      agendamentoId: l.id,
    }));
  for (let i = 0; i < entradas.length; i += 50) await db.insert(s.lancamento).values(entradas.slice(i, i + 50));
  await db.insert(s.lancamento).values([
    { tipo: "saida", valorCentavos: 180000, categoria: "Aluguel", data: instanteLocal(hojeYmd, 720), descricao: "Demo" },
    { tipo: "saida", valorCentavos: 35000, categoria: "Produtos", data: instanteLocal(hojeYmd, 720), descricao: "Demo" },
  ]);

  await db.insert(s.bloqueio).values([
    { barbeiroId: barbeiros[1].id, inicio: instanteLocal(somarDias(hojeYmd, 3), 0), fim: instanteLocal(somarDias(hojeYmd, 4), 0), motivo: "Folga" },
  ]);

  console.log(`Demo pronta: ${servicos.length} serviços, ${barbeiros.length} barbeiros, ${clientes.length} clientes, ${linhas.length} agendamentos.`);
}

main().then(() => process.exit(0)).catch((e) => {
  console.error(e);
  process.exit(1);
});
