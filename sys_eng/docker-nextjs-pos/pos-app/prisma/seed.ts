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

// Ablaze's fallback restaurant palette. Owners can override these later, but
// fresh local/demo restaurants should immediately feel like the Ablaze brand.
const ablazeDefaultTheme = {
  logoUrl: null,
  primaryColor: "#ff6a1a",
  accentColor: "#ffd166",
  backgroundColor: "#100b0b",
  textColor: "#fff7ed",
};

const demoIngredients = [
  { name: "Beef" },
  { name: "Wheat noodles", commonAllergen: true, allergenNote: "Contains wheat/gluten" },
  { name: "Scallions" },
  { name: "Black tea" },
  { name: "Milk", commonAllergen: true, allergenNote: "Contains dairy" },
  { name: "Pork" },
  { name: "Cabbage" },
  { name: "Wheat wrapper", commonAllergen: true, allergenNote: "Contains wheat/gluten" },
  { name: "Rice" },
  { name: "Chicken" },
  { name: "Egg", commonAllergen: true, allergenNote: "Contains egg" },
  { name: "Shrimp", commonAllergen: true, allergenNote: "Contains shellfish" },
  { name: "Garlic" },
  { name: "Butter", commonAllergen: true, allergenNote: "Contains dairy" },
  { name: "Mango" },
  { name: "Cream", commonAllergen: true, allergenNote: "Contains dairy" },
  { name: "Gelatin" },
];

const demoMenuItems = [
  {
    id: 1,
    priceCents: 1399,
    categoryKey: "noodles",
    sortOrder: 10,
    imageUrl:
      "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=900&q=80",
    ingredients: ["Beef", "Wheat noodles", "Scallions"],
    translations: [
      {
        locale: "en",
        name: "Beef Noodle Soup",
        description: "Slow-braised beef with noodles in a rich broth.",
        ingredients: "Beef, wheat noodles, broth, scallions",
        category: "Noodles",
      },
      {
        locale: "es",
        name: "Sopa de Fideos con Res",
        description: "Res cocida lentamente con fideos en caldo.",
        ingredients: "Res, fideos de trigo, caldo, cebollín",
        category: "Fideos",
      },
    ],
  },
  {
    id: 2,
    priceCents: 499,
    categoryKey: "drinks",
    sortOrder: 80,
    imageUrl:
      "https://images.unsplash.com/photo-1558857563-b371033873b8?auto=format&fit=crop&w=900&q=80",
    ingredients: ["Black tea", "Milk"],
    translations: [
      {
        locale: "en",
        name: "Milk Tea",
        description: "Classic sweet milk tea served cold.",
        ingredients: "Black tea, milk, sugar",
        category: "Drinks",
      },
      {
        locale: "es",
        name: "Té con Leche",
        description: "Té dulce clásico con leche, servido frío.",
        ingredients: "Té negro, leche, azúcar",
        category: "Bebidas",
      },
    ],
  },
  {
    id: 3,
    priceCents: 899,
    categoryKey: "appetizers",
    sortOrder: 20,
    imageUrl:
      "https://images.unsplash.com/photo-1496116218417-1a781b1c416c?auto=format&fit=crop&w=900&q=80",
    ingredients: ["Pork", "Cabbage", "Wheat wrapper"],
    translations: [
      {
        locale: "en",
        name: "Pork Dumplings",
        description: "Pan-seared dumplings with soy dipping sauce.",
        ingredients: "Pork, cabbage, ginger, wheat wrapper",
        category: "Appetizers",
      },
      {
        locale: "es",
        name: "Dumplings de Cerdo",
        description: "Dumplings dorados con salsa de soya.",
        ingredients: "Cerdo, repollo, jengibre, masa de trigo",
        category: "Entradas",
      },
    ],
  },
  {
    id: 4,
    priceCents: 1599,
    categoryKey: "rice",
    sortOrder: 30,
    imageUrl:
      "https://images.unsplash.com/photo-1603133872878-684f208fb84b?auto=format&fit=crop&w=900&q=80",
    ingredients: ["Rice", "Chicken", "Egg"],
    translations: [
      {
        locale: "en",
        name: "Chicken Fried Rice",
        description: "Wok-fried rice with chicken, egg, peas, and carrots.",
        ingredients: "Rice, chicken, egg, peas, carrots",
        category: "Rice",
      },
      {
        locale: "es",
        name: "Arroz Frito con Pollo",
        description: "Arroz al wok con pollo, huevo, arvejas y zanahoria.",
        ingredients: "Arroz, pollo, huevo, arvejas, zanahoria",
        category: "Arroz",
      },
    ],
  },
  {
    id: 5,
    priceCents: 1799,
    categoryKey: "seafood",
    sortOrder: 40,
    imageUrl:
      "https://images.unsplash.com/photo-1559847844-5315695dadae?auto=format&fit=crop&w=900&q=80",
    ingredients: ["Shrimp", "Garlic", "Butter"],
    translations: [
      {
        locale: "en",
        name: "Garlic Shrimp",
        description: "Sautéed shrimp with garlic butter and herbs.",
        ingredients: "Shrimp, garlic, butter, parsley",
        category: "Seafood",
      },
      {
        locale: "es",
        name: "Camarones al Ajo",
        description: "Camarones salteados con mantequilla de ajo y hierbas.",
        ingredients: "Camarones, ajo, mantequilla, perejil",
        category: "Mariscos",
      },
    ],
  },
  {
    id: 6,
    priceCents: 699,
    categoryKey: "desserts",
    sortOrder: 90,
    imageUrl:
      "https://images.unsplash.com/photo-1551024506-0bccd828d307?auto=format&fit=crop&w=900&q=80",
    ingredients: ["Mango", "Cream", "Gelatin"],
    translations: [
      {
        locale: "en",
        name: "Mango Pudding",
        description: "Chilled mango pudding with cream.",
        ingredients: "Mango, cream, sugar, gelatin",
        category: "Desserts",
      },
      {
        locale: "es",
        name: "Pudín de Mango",
        description: "Pudín frío de mango con crema.",
        ingredients: "Mango, crema, azúcar, gelatina",
        category: "Postres",
      },
    ],
  },
];

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

async function resetDemoOperationalData() {
  await prisma.auditEvent.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.checkout.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.tableSessionOwnershipTransfer.deleteMany();
  await prisma.tableSessionItem.deleteMany();
  await prisma.tableSessionParticipant.deleteMany();
  await prisma.tableSession.deleteMany();
  await prisma.menuItemIngredient.deleteMany();
  await prisma.menuItemTranslation.deleteMany();
  await prisma.menuItem.deleteMany();
  await prisma.ingredient.deleteMany();
  await prisma.diningTable.deleteMany();
}

async function seedDemoIngredients() {
  const ingredientByName = new Map<string, number>();

  for (const ingredient of demoIngredients) {
    const savedIngredient = await prisma.ingredient.create({
      data: {
        name: ingredient.name,
        commonAllergen: ingredient.commonAllergen ?? false,
        allergenNote: ingredient.allergenNote,
      },
    });

    ingredientByName.set(savedIngredient.name, savedIngredient.id);
  }

  return ingredientByName;
}

async function seedDemoMenuItems() {
  const ingredientByName = await seedDemoIngredients();

  for (const item of demoMenuItems) {
    await prisma.menuItem.create({
      data: {
        id: item.id,
        priceCents: item.priceCents,
        categoryKey: item.categoryKey,
        sortOrder: item.sortOrder,
        imageUrl: item.imageUrl,
        active: true,
        translations: {
          create: item.translations,
        },
        ingredients: {
          create: item.ingredients
            .map((ingredientName, index) => {
              const ingredientId = ingredientByName.get(ingredientName);

              if (!ingredientId) {
                return null;
              }

              return {
                ingredientId,
                removable: true,
                swappable: false,
                sortOrder: index * 10,
              };
            })
            .filter((ingredient) => ingredient !== null),
        },
      },
    });
  }

  return demoMenuItems.map((item) => item.id);
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
  await resetDemoOperationalData();

  await prisma.restaurantSettings.upsert({
    where: { id: 1 },
    update: {
      name: "Big Fish House",
      publicUrl: "http://localhost:8080",
      receiptFooter: "Thank you for visiting Big Fish House.",
      supportedLocales: ["en", "es"],
      ...ablazeDefaultTheme,
    },
    create: {
      id: 1,
      name: "Big Fish House",
      publicUrl: "http://localhost:8080",
      receiptFooter: "Thank you for visiting Big Fish House.",
      supportedLocales: ["en", "es"],
      ...ablazeDefaultTheme,
    },
  });

  await prisma.restaurantPaymentSettings.upsert({
    where: { restaurantSettingsId: 1 },
    update: {
      stripeConnectedAccountId: process.env.STRIPE_CONNECTED_ACCOUNT_ID || null,
      platformFeeBasisPoints: 100,
    },
    create: {
      restaurantSettingsId: 1,
      stripeConnectedAccountId: process.env.STRIPE_CONNECTED_ACCOUNT_ID || null,
      platformFeeBasisPoints: 100,
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

  const menuItemIds = await seedDemoMenuItems();
  const demoUsers = await seedDemoUsers();
  const demoTableSessions = await seedDemoTableSessions();

  console.log("Seeded demo data:", {
    menuItems: menuItemIds,
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
