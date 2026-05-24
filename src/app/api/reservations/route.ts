import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { cleanupExpiredReservations } from "@/lib/cleanupExpiredReservations";
import { z } from "zod";

const reservationSchema = z.object({
  productId: z.string(),
  warehouseId: z.string(),
  quantity: z.number().positive(),
});
export async function POST(req: NextRequest) {

  try {
    
    await cleanupExpiredReservations();
    const body = await req.json();

    const parsed =
      reservationSchema.safeParse(body);

    if (!parsed.success) {

      return NextResponse.json(
        {
          error: "Invalid request data",
          details:
            parsed.error.flatten(),
        },
        {
          status: 400,
        }
      );
    }

    const {
      productId,
      warehouseId,
      quantity,
    } = parsed.data;


    const result = await prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        // Lock inventory row to prevent
        // concurrent reservation race conditions
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

        if (
          inventory.reservedStock + quantity >
          inventory.totalStock
        ) {
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
      },
      {
        isolationLevel:
          Prisma.TransactionIsolationLevel.Serializable,
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
        error: "Failed to create reservation",
      },
      {
        status: 500,
      }
    );
  }
}