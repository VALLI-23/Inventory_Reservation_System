import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { cleanupExpiredReservations } from "@/lib/cleanupExpiredReservations";

export async function POST(req: NextRequest) {

  try {
    
    await cleanupExpiredReservations();
    const body = await req.json();

    const {
      productId,
      warehouseId,
      quantity,
    } = body;

    // Validation
    if (
      !productId ||
      !warehouseId ||
      !quantity ||
      quantity <= 0
    ) {
      return NextResponse.json(
        {
          error: "Invalid request data",
        },
        {
          status: 400,
        }
      );
    }

    const result = await prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {

        // Row lock
        await tx.$queryRaw`
          SELECT * FROM "Inventory"
          WHERE "productId" = ${productId}
          AND "warehouseId" = ${warehouseId}
          FOR UPDATE
        `;

        // Fetch inventory
        const inventory =
          await tx.inventory.findFirst({
            where: {
              productId,
              warehouseId,
            },
          });

        if (!inventory) {

          return {
            error: "Inventory not found",
            status: 404,
          };
        }

        // Calculate available stock
        const availableStock =
          inventory.totalStock -
          inventory.reservedStock;

        // Prevent overselling
        if (availableStock < quantity) {

          return {
            error: "Not enough stock available",
            status: 409,
          };
        }

        // Increase reserved stock
        await tx.inventory.update({
          where: {
            id: inventory.id,
          },

          data: {
            reservedStock: {
              increment: quantity,
            },
          },
        });

        // Create reservation
        const reservation =
          await tx.reservation.create({
            data: {
              productId,
              warehouseId,
              quantity,

              status: "PENDING",

              expiresAt: new Date(
                Date.now() + 10 * 60 * 1000
              ),
            },
          });

        return {
          reservation,
          status: 201,
        };
      }
    );

    // Error response
    if ("error" in result) {

      return NextResponse.json(
        {
          error: result.error,
        },
        {
          status: result.status,
        }
      );
    }

    return NextResponse.json(
      {
        success: true,
        reservation: result.reservation,
      },
      {
        status: 201,
      }
    );

  } catch (error) {

    console.error(
      "Reservation Error:",
      error
    );

    return NextResponse.json(
      {
        error: "Reservation failed",
      },
      {
        status: 500,
      }
    );
  }
}