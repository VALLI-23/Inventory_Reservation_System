import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { cleanupExpiredReservations } from "@/lib/cleanupExpiredReservations";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {

  try {

    await cleanupExpiredReservations();
    const { id } = await params;

    const reservation =
      await prisma.reservation.findUnique({
        where: { id },
      });

    // Reservation not found
    if (!reservation) {

      return NextResponse.json(
        {
          error: "Reservation not found",
        },
        {
          status: 404,
        }
      );
    }

    // Already confirmed
    if (reservation.status === "CONFIRMED") {

      return NextResponse.json(
        {
          error: "Reservation already confirmed",
        },
        {
          status: 400,
        }
      );
    }

    // Already released
    if (reservation.status === "RELEASED") {

      return NextResponse.json(
        {
          error: "Reservation already released",
        },
        {
          status: 400,
        }
      );
    }

    // Reservation expired
    if (new Date() > reservation.expiresAt) {

      await prisma.$transaction(async (tx: any) => {

        // Row lock
        await tx.$queryRaw`
          SELECT * FROM "Inventory"
          WHERE "productId" = ${reservation.productId}
          AND "warehouseId" = ${reservation.warehouseId}
          FOR UPDATE
        `;

        const inventory =
          await tx.inventory.findFirst({
            where: {
              productId: reservation.productId,
              warehouseId: reservation.warehouseId,
            },
          });

        if (!inventory) {
          throw new Error("Inventory not found");
        }

        // Release reserved stock
        await tx.inventory.update({
          where: {
            id: inventory.id,
          },

          data: {
            reservedStock: {
              decrement: reservation.quantity,
            },
          },
        });

        // Mark reservation released
        await tx.reservation.update({
          where: {
            id,
          },

          data: {
            status: "RELEASED",
          },
        });
      });

      return NextResponse.json(
        {
          error: "Reservation expired",
        },
        {
          status: 410,
        }
      );
    }

    // Confirm reservation
    await prisma.$transaction(async (tx: any) => {

      // Row lock
      await tx.$queryRaw`
        SELECT * FROM "Inventory"
        WHERE "productId" = ${reservation.productId}
        AND "warehouseId" = ${reservation.warehouseId}
        FOR UPDATE
      `;

      const inventory =
        await tx.inventory.findFirst({
          where: {
            productId: reservation.productId,
            warehouseId: reservation.warehouseId,
          },
        });

      if (!inventory) {
        throw new Error("Inventory not found");
      }

      // Permanently reduce stock
      await tx.inventory.update({
        where: {
          id: inventory.id,
        },

        data: {

          totalStock: {
            decrement: reservation.quantity,
          },

          reservedStock: {
            decrement: reservation.quantity,
          },
        },
      });

      // Mark confirmed
      await tx.reservation.update({
        where: {
          id,
        },

        data: {
          status: "CONFIRMED",
        },
      });
    });

    return NextResponse.json({
      success: true,
      message: "Reservation confirmed",
    });

  } catch (error) {

    console.error(
      "Confirmation Error:",
      error
    );

    return NextResponse.json(
      {
        error: "Confirmation failed",
      },
      {
        status: 500,
      }
    );
  }
}