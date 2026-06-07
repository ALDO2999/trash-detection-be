import 'dotenv/config';
import { PrismaClient, Role } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcryptjs';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter } as any);

async function main() {
  // Seed petugas
  const petugasPassword = await bcrypt.hash('petugas123', 10);
  const petugas = await prisma.user.upsert({
    where: { email: 'petugas@wastesortai.id' },
    update: {},
    create: {
      name: 'Petugas Waste Sort AI',
      email: 'petugas@wastesortai.id',
      password: petugasPassword,
      role: Role.PETUGAS,
      isVerified: true,
    },
  });
  console.log('Petugas created:', petugas.email);

  // Seed voucher — skip jika sudah ada
  const voucherCount = await prisma.voucher.count();
  if (voucherCount === 0) {
    await prisma.voucher.createMany({
      data: [
        { name: 'Voucher Rp10.000', description: 'Voucher belanja senilai Rp10.000', pointCost: 100, value: 10000, stock: 50 },
        { name: 'Voucher Rp25.000', description: 'Voucher belanja senilai Rp25.000', pointCost: 250, value: 25000, stock: 30 },
        { name: 'Voucher Rp50.000', description: 'Voucher belanja senilai Rp50.000', pointCost: 500, value: 50000, stock: 20 },
        { name: 'Voucher Rp100.000', description: 'Voucher belanja senilai Rp100.000', pointCost: 1000, value: 100000, stock: 10 },
      ],
    });
    console.log('Vouchers seeded: 4');
  } else {
    console.log('Vouchers already exist, skipping.');
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
