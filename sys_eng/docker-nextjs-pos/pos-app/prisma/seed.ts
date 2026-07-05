import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import { hashPassword } from "better-auth/crypto";
import { auth } from "../lib/auth";
import { PrismaClient } from "../lib/generated/prisma/client";
import {
  EmployeeRole,
  TableSessionStatus,
} from "../lib/generated/prisma/enums";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is required to seed the database.");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

const demoPassword = "abc12345";

async function resetDemoPassword(userId: string) {
  const passwordHash = await hashPassword(demoPassword);

  await prisma.account.deleteMany({
    where: {
      userId,
      providerId: "credential",
      id: {
        startsWith: "demo-credential-",
      },
    },
  });

  const result = await prisma.account.updateMany({
    where: {
      userId,
      providerId: "credential",
    },
    data: {
      password: passwordHash,
      updatedAt: new Date(),
    },
  });

  if (result.count > 0) {
    return;
  }

  await prisma.account.create({
    data: {
      id: `demo-credential-${userId}`,
      accountId: userId,
      providerId: "credential",
      userId,
      password: passwordHash,
    },
  });
}

async function createDemoAuthUser({
  name,
  email,
  username,
  displayUsername,
}: {
  name: string;
  email: string;
  username?: string;
  displayUsername?: string;
}) {
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    const nextUsername = username ?? null;
    const shouldUpdateUser =
      existingUser.username !== nextUsername ||
      existingUser.displayUsername !== displayUsername;
    const user = shouldUpdateUser
      ? await prisma.user.update({
          where: { id: existingUser.id },
          data: {
            username: nextUsername,
            displayUsername,
          },
        })
      : existingUser;

    await resetDemoPassword(user.id);

    return user;
  }

  const result = await auth.api.signUpEmail({
    body: {
      name,
      email,
      password: demoPassword,
      ...(username
        ? {
            username,
            displayUsername: displayUsername ?? name,
          }
        : {}),
    },
    headers: new Headers({
      origin: process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
    }),
  });

  await resetDemoPassword(result.user.id);

  return result.user;
}

async function seedDemoUsers() {
  const owner = await createDemoAuthUser({
    name: "Demo Owner",
    email: "test@example.com",
    displayUsername: "Owner",
  });

  await prisma.employeeProfile.upsert({
    where: { userId: owner.id },
    update: {
      loginCode: "111111",
      role: EmployeeRole.OWNER,
      active: true,
      resignedAt: null,
    },
    create: {
      userId: owner.id,
      loginCode: "111111",
      role: EmployeeRole.OWNER,
    },
  });

  const cashier = await createDemoAuthUser({
    name: "Demo Cashier",
    email: "cashier@example.com",
    displayUsername: "Cashier",
  });

  await prisma.employeeProfile.upsert({
    where: { userId: cashier.id },
    update: {
      loginCode: "222222",
      role: EmployeeRole.CASHIER,
      active: true,
      resignedAt: null,
    },
    create: {
      userId: cashier.id,
      loginCode: "222222",
      role: EmployeeRole.CASHIER,
    },
  });

  const customer = await createDemoAuthUser({
    name: "Demo Customer",
    email: "customer@example.com",
  });

  await prisma.customerProfile.upsert({
    where: { userId: customer.id },
    update: {
      displayName: "Demo Customer",
      marketingOptIn: true,
    },
    create: {
      userId: customer.id,
      displayName: "Demo Customer",
      marketingOptIn: true,
      loyaltyPointsBalance: 120,
    },
  });

  return {
    owner: { email: "test@example.com", employeeCode: "111111" },
    cashier: { email: "cashier@example.com", employeeCode: "222222" },
    customer: { email: "customer@example.com" },
  };
}

function demoTableToken(row: string, col: number) {
  const tableKey = `${row.toLowerCase()}${col}`;
  const tokenByTable: Record<string, string> = {
    a0: "dev-a0-Qw7n2F9kLx4pRt6VzB1s",
    a1: "dev-a1-Mp8c3YqN5sTz7Lw2Hd9r",
    a2: "dev-a2-Vb6j1KxR8mQp4Ns7Ty3c",
    b0: "dev-b0-Hr5t9WdL2qZx6Cb1Mn8p",
    b1: "dev-b1-Xn3v7PaK9rLs2Qw6Yt4d",
    b2: "dev-b2-Tc4m8NzP1yVq5Jk7Rb2s",
    c0: "dev-c0-Lw9p2QrX6nBm3Tv8Kz5j",
    c1: "dev-c1-Zk1r5VyM8qNp4Ls7Wb3t",
  };

  return tokenByTable[tableKey] ?? `dev-${tableKey}`;
}

async function seedDemoTableSessions() {
  const tables = await prisma.diningTable.findMany({
    orderBy: [{ row: "asc" }, { col: "asc" }],
  });

  for (const table of tables) {
    await prisma.tableSession.upsert({
      where: {
        publicToken: demoTableToken(table.row, table.col),
      },
      update: {
        tableId: table.id,
        status: TableSessionStatus.OPEN,
        submittedAt: null,
        closedAt: null,
      },
      create: {
        tableId: table.id,
        publicToken: demoTableToken(table.row, table.col),
        status: TableSessionStatus.OPEN,
      },
    });
  }

  return tables.map((table) => ({
    label: table.label ?? `${table.row}${table.col}`,
    token: demoTableToken(table.row, table.col),
  }));
}

async function main() {
  await prisma.restaurantSettings.upsert({
    where: { id: 1 },
    update: {
      name: "Big Fish House",
      publicUrl: "http://localhost:8080",
      receiptFooter: "Thank you for visiting Big Fish House.",
      supportedLocales: ["en", "es"],
    },
    create: {
      id: 1,
      name: "Big Fish House",
      publicUrl: "http://localhost:8080",
      receiptFooter: "Thank you for visiting Big Fish House.",
      supportedLocales: ["en", "es"],
    },
  });

  await prisma.diningTable.createMany({
    data: [
      { row: "A", col: 0, label: "A0 Window", seats: 4 },
      { row: "A", col: 1, label: "A1 Window", seats: 2 },
      { row: "A", col: 2, label: "A2 Window", seats: 4 },
      { row: "B", col: 0, label: "B0 Center", seats: 4 },
      { row: "B", col: 1, label: "B1 Center", seats: 6 },
      { row: "B", col: 2, label: "B2 Center", seats: 4 },
      { row: "C", col: 0, label: "C0 Booth", seats: 4 },
      { row: "C", col: 1, label: "C1 Booth", seats: 6 },
    ],
    skipDuplicates: true,
  });

  const noodleSoup = await prisma.menuItem.upsert({
    where: { id: 1 },
    update: {
      priceCents: 1399,
      categoryKey: "noodles",
      sortOrder: 10,
      active: true,
    },
    create: {
      id: 1,
      priceCents: 1399,
      categoryKey: "noodles",
      sortOrder: 10,
    },
  });

  await prisma.menuItemTranslation.createMany({
    data: [
      {
        menuItemId: noodleSoup.id,
        locale: "en",
        name: "Beef Noodle Soup",
        description: "Slow-braised beef with noodles in a rich broth.",
        ingredients: "Beef, wheat noodles, broth, scallions",
        category: "Noodles",
      },
      {
        menuItemId: noodleSoup.id,
        locale: "es",
        name: "Sopa de Fideos con Res",
        description: "Res cocida lentamente con fideos en caldo.",
        ingredients: "Res, fideos de trigo, caldo, cebollín",
        category: "Fideos",
      },
    ],
    skipDuplicates: true,
  });

  const milkTea = await prisma.menuItem.upsert({
    where: { id: 2 },
    update: {
      priceCents: 499,
      categoryKey: "drinks",
      sortOrder: 20,
      active: true,
    },
    create: {
      id: 2,
      priceCents: 499,
      categoryKey: "drinks",
      sortOrder: 20,
    },
  });

  await prisma.menuItemTranslation.createMany({
    data: [
      {
        menuItemId: milkTea.id,
        locale: "en",
        name: "Milk Tea",
        description: "Classic sweet milk tea served cold.",
        ingredients: "Black tea, milk, sugar",
        category: "Drinks",
      },
      {
        menuItemId: milkTea.id,
        locale: "es",
        name: "Té con Leche",
        description: "Té dulce clásico con leche, servido frío.",
        ingredients: "Té negro, leche, azúcar",
        category: "Bebidas",
      },
    ],
    skipDuplicates: true,
  });

  const demoUsers = await seedDemoUsers();
  const demoTableSessions = await seedDemoTableSessions();

  console.log("Seeded demo data:", {
    menuItems: [noodleSoup.id, milkTea.id],
    demoTableSessions,
    demoUsers,
    password: demoPassword,
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
