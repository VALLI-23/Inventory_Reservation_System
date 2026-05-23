import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const products = await prisma.product.findMany({
      include: {
        inventories: {
          include: {
            warehouse: true,
          },
        },
      },
    });

    const formattedProducts = products.map((product) => {
      const totalAvailableStock = product.inventories.reduce(
        (sum, inventory) =>
          sum + (inventory.totalStock - inventory.reservedStock),
        0
      );

      return {
        id: product.id,

        name: product.name,

        sku: product.sku,

        totalAvailableStock,

        warehouses: product.inventories.map((inventory) => ({
          warehouseId: inventory.warehouse.id,

          warehouseName: inventory.warehouse.name,

          totalStock: inventory.totalStock,

          reservedStock: inventory.reservedStock,

          availableStock:
            inventory.totalStock - inventory.reservedStock,
        })),
      };
    });

    return NextResponse.json(formattedProducts);

  } catch (error) {

    console.log("PRODUCT API ERROR:", error);

    return NextResponse.json(
      {
        error: "Failed to fetch products",
        details: String(error),
      },
      { status: 500 }
    );
  }
}