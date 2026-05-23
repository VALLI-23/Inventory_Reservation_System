import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {

  // Warehouse 1
  const chennaiWarehouse =
    await prisma.warehouse.create({
      data: {
        name: "Chennai Warehouse",
        location: "Chennai",
      },
    });

  // Warehouse 2
  const bangaloreWarehouse =
    await prisma.warehouse.create({
      data: {
        name: "Bangalore Warehouse",
        location: "Bangalore",
      },
    });

  // Product 1
  const iphone =
    await prisma.product.create({
      data: {
        name: "iPhone 15",
        sku: "IPHONE15",
        price: 80000,
      },
    });

  // Product 2
  const samsung =
    await prisma.product.create({
      data: {
        name: "Samsung S24",
        sku: "SAMSUNGS24",
        price: 70000,
      },
    });

  // Inventory
  await prisma.inventory.createMany({
    data: [
      {
        productId: iphone.id,
        warehouseId: chennaiWarehouse.id,
        totalStock: 10,
        reservedStock: 0,
      },

      {
        productId: samsung.id,
        warehouseId: bangaloreWarehouse.id,
        totalStock: 5,
        reservedStock: 0,
      },
    ],
  });

  console.log("Database seeded");
}

main()
  .catch((e) => {
    console.error(e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });