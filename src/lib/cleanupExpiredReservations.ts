import { prisma } from "@/lib/prisma";

export async function cleanupExpiredReservations() {

  const expiredReservations =
    await prisma.reservation.findMany({
      where: {
        status: "PENDING",
        expiresAt: {
          lt: new Date(),
        },
      },
    });

  for (const reservation of expiredReservations) {

    await prisma.$transaction(
      async (tx: any) => {

        const inventory =
          await tx.inventory.findFirst({
            where: {
              productId: reservation.productId,
              warehouseId: reservation.warehouseId,
            },
          });

        if (!inventory) return;

        // Restore reserved stock
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
            id: reservation.id,
          },

          data: {
            status: "RELEASED",
          },
        });
      }
    );
  }
}