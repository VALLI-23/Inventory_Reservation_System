import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {

  try {

    const warehouses = await prisma.warehouse.findMany({
      include: {
        inventories: {
          include: {
            product: true,
          },
        },
      },
    });

    const formattedWarehouses = warehouses.map(
      (warehouse: any) => ({
        id: warehouse.id,

        name: warehouse.name,

        location: warehouse.location,

        totalProducts:
          warehouse.inventories.length,

        products: warehouse.inventories.map(
          (inventory: any) => ({
            productId: inventory.product.id,

            productName:
              inventory.product.name,

            sku: inventory.product.sku,

            totalStock:
              inventory.totalStock,

            reservedStock:
              inventory.reservedStock,

            availableStock:
              inventory.totalStock -
              inventory.reservedStock,
          })
        ),
      })
    );

    return NextResponse.json(
      formattedWarehouses
    );

  } catch (error) {

    console.log(
      "WAREHOUSE API ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Failed to fetch warehouses",
      },
      { status: 500 }
    );
  }
}