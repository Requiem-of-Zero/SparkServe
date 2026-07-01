import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../lib/generated/prisma/client";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is required to seed the database.");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

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
      { row: "A", col: 0, label: "Window Table", seats: 4 },
      { row: "A", col: 1, seats: 2 },
      { row: "B", col: 0, seats: 4 },
      { row: "B", col: 1, seats: 6 },
    ],
    skipDuplicates: true,
  });

  const noodleSoup = await prisma.menuItem.create({
    data: {
      priceCents: 1399,
      categoryKey: "noodles",
      sortOrder: 10,
      translations: {
        create: [
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
    },
  });

  const milkTea = await prisma.menuItem.create({
    data: {
      priceCents: 499,
      categoryKey: "drinks",
      sortOrder: 20,
      translations: {
        create: [
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
    },
  });

  console.log("Seeded restaurant settings, tables, and menu items:", {
    menuItems: [noodleSoup.id, milkTea.id],
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
