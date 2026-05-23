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

    const formattedProducts = products.map((product: any) => ({
      id: product.id,

      name: product.name,

      sku: product.sku,

      warehouses: product.inventories.map(
        (inventory: any) => ({
          warehouse: inventory.warehouse.name,

          totalStock: inventory.totalStock,

          reservedStock: inventory.reservedStock,

          available:
            inventory.totalStock -
            inventory.reservedStock,
        })
      ),
    }));

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