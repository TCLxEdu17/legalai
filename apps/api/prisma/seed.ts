import { PrismaClient, UserRole } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  console.log('Iniciando seed do banco de dados...');

  // Criar usuário admin padrão
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@legalai.com.br';
  const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@123456';

  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail },
  });

  if (!existingAdmin) {
    const passwordHash = await argon2.hash(adminPassword);

    const admin = await prisma.user.create({
      data: {
        name: 'Administrador',
        email: adminEmail,
        passwordHash,
        role: UserRole.ADMIN,
        isActive: true,
      },
    });

    console.log(`Admin criado: ${admin.email} (ID: ${admin.id})`);
  } else {
    console.log(`Admin já existe: ${adminEmail}`);
  }

  // Criar usuário demo
  const demoEmail = process.env.DEMO_EMAIL || 'demo@legalai.com.br';
  const demoPassword = process.env.DEMO_PASSWORD || 'Demo@123456';

  const existingDemo = await prisma.user.findUnique({
    where: { email: demoEmail },
  });

  if (!existingDemo) {
    const passwordHash = await argon2.hash(demoPassword);

    const demo = await prisma.user.create({
      data: {
        name: 'Usuário Demo',
        email: demoEmail,
        passwordHash,
        role: UserRole.USER,
        isActive: true,
      },
    });

    console.log(`Demo criado: ${demo.email} (ID: ${demo.id})`);
  } else {
    console.log(`Demo já existe: ${demoEmail}`);
  }

  // Criar fontes de demonstração para o painel de fontes automáticas
  const demoSources = [
    {
      name: 'STJ — Pesquisa de Jurisprudência',
      description: 'Superior Tribunal de Justiça — base de jurisprudências para demonstração',
      baseUrl: 'https://scon.stj.jus.br/SCON/',
      sourceType: 'html-list',
      parserType: 'html-list',
      scheduleCron: '*/20 * * * *',
      isActive: false,
      configJson: {
        listSelector: 'a.resultado-ementa',
        contentSelector: '.texto-ementa',
        maxPages: 3,
        note: 'Fonte de demonstração — configure os seletores corretos antes de ativar',
      },
    },
    {
      name: 'TJSP — Acórdãos',
      description: 'Tribunal de Justiça de São Paulo — acórdãos e decisões',
      baseUrl: 'https://esaj.tjsp.jus.br/cjsg/resultadoCompleta.do',
      sourceType: 'html-list',
      parserType: 'html-list',
      scheduleCron: '0 3 * * 1',
      isActive: false,
      configJson: {
        listSelector: 'a.docLink',
        contentSelector: '.ementaClass',
        maxPages: 2,
        note: 'Fonte de demonstração — configure os seletores corretos antes de ativar',
      },
    },
  ];

  for (const sourceData of demoSources) {
    const existing = await prisma.externalSource.findFirst({
      where: { name: sourceData.name },
    });

    if (!existing) {
      await prisma.externalSource.create({ data: sourceData });
      console.log(`Fonte de demo criada: ${sourceData.name}`);
    }
  }

  console.log('Seed concluído com sucesso!');
  console.log('');
  console.log('Credenciais de acesso:');
  console.log(`  Admin: ${adminEmail} / ${adminPassword}`);
  console.log(`  Demo:  ${demoEmail} / ${demoPassword}`);
}

main()
  .catch((e) => {
    console.error('Erro no seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
