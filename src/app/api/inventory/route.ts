import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {

    const inventory = await prisma.inventory.findMany({
      include: {
        product: true,
        warehouse: true,
      },
    });

    const formattedInventory = inventory.map((item: any) => ({
      id: item.id,

      productId: item.productId,
      warehouseId: item.warehouseId,

      productName: item.product.name,
      warehouseName: item.warehouse.name,

      totalStock: item.totalStock,
      reservedStock: item.reservedStock,

      availableStock:
        item.totalStock - item.reservedStock,
    }));

    return NextResponse.json(formattedInventory);

  } catch (error) {

    console.error("Inventory Fetch Error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch inventory",
      },
      {
        status: 500,
      }
    );
  }
}