"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, } from "@/components/ui/card";

type WarehouseStock = {
  warehouseId?: string;

  warehouse: string;

  totalStock: number;

  reservedStock: number;

  available: number;
};

type Product = {
  id: string;

  name: string;

  sku: string;

  warehouses: WarehouseStock[];
};

type InventoryItem = {
  id: string;

  productId: string;

  warehouseId: string;

  productName: string;

  warehouseName: string;

  totalStock: number;

  reservedStock: number;

  availableStock: number;
};

export default function ProductsPage() {

  const router = useRouter();

  const [products, setProducts] =
    useState<Product[]>([]);

  const [inventoryMap, setInventoryMap] =
    useState<InventoryItem[]>([]);

  const [loadingId, setLoadingId] =
    useState<string | null>(null);

  const [error, setError] =
    useState("");

  // Fetch products
  useEffect(() => {
    

    async function fetchProducts() {

      try {

        const [
          productsResponse,
          inventoryResponse,
        ] = await Promise.all([
          fetch("/api/products"),
          fetch("/api/inventory"),
        ]);

        if (
          !productsResponse.ok ||
          !inventoryResponse.ok
        ) {
          throw new Error(
            "Failed to fetch data"
          );
        }

        const productsData =
          await productsResponse.json();

        const inventoryData =
          await inventoryResponse.json();

        setProducts(
          Array.isArray(productsData)
            ? productsData
            : []
        );

        setInventoryMap(
          Array.isArray(inventoryData)
            ? inventoryData
            : []
        );

      } catch (error) {

        console.error(error);

        setError(
          "Failed to load products"
        );
      }
    }

    fetchProducts();

    const interval = setInterval(
      fetchProducts,
      5000
    );
    
    return () => {
    clearInterval(interval);
    };
  }, []);

  // Reserve stock
  async function handleReserve(
    productId: string,
    warehouseName: string
  ) {

    try {

      setLoadingId(
        `${productId}-${warehouseName}`
      );

      setError("");

      const inventoryItem =
        inventoryMap.find(
          (item) =>
            item.productId === productId &&
            item.warehouseName === warehouseName
        );

      if (!inventoryItem) {

        setError("Inventory not found");

        return;
      }

      const response =
        await fetch(
          "/api/reservations",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              productId,
              warehouseId:
                inventoryItem.warehouseId,
              quantity: 1,
            }),
          }
        );

      const data =
        await response.json();

      // Stock conflict
      if (response.status === 409) {

        setError(
          "Not enough stock available"
        );

        return;
      }

      // Other API errors
      if (!response.ok) {

        setError(
          data.error ||
          "Reservation failed"
        );

        return;
      }
      setProducts((prev) =>
        prev.map((product) => {
          if (product.id !== productId)
            return product;

          return {
            ...product,
            warehouses:
              product.warehouses.map((w) => {
                if (
                  w.warehouse !== warehouseName
                )
                  return w;

                return {
                  ...w,
                  reservedStock:
                    w.reservedStock + 1,
                  available:
                    Math.max(0, w.available - 1),
                };
              }),
         };
       })
      );

      
      // Success
      router.push(
        `/reservations/${data.reservation.id}`
      );

      router.refresh();

    } catch (error) {

      console.error(error);

      setError(
        "Reservation failed"
      );

    } finally {

      setLoadingId(null);
    }
  }

  return (
    <main className="page-container">

      <h1 className="page-title">
        Inventory Reservation System
      </h1>

      {error && (
        <div className="error-box">
          {error}
        </div>
      )}

      <div className="products-grid">

        {products.flatMap((product) =>

          (product.warehouses || []).map(
            (warehouse) => (

              <Card
                key={`${product.id}-${warehouse.warehouse}`}
                className="product-card"
              >

                <h2 className="product-title">
                  {product.name}
                </h2>

                <p className="product-subtext">
                  SKU: {product.sku}
                </p>

                <span
                  className={`stock-badge ${
                    warehouse.available <= 0
                      ? "stock-badge-out"
                      : warehouse.available <= 5
                      ? "stock-badge-low"
                      : "stock-badge-in"
                  }`}
                >
                  {warehouse.available <= 0
                    ? "Out of Stock"
                    : warehouse.available <= 5
                    ? "Low Stock"
                    : "In Stock"}
                </span>

                <p className="text-gray-600 mt-1">
                  Warehouse:
                  {" "}
                  {warehouse.warehouse}
                </p>

                <CardContent className="mt-3 space-y-1">

                  <p>
                    Total Stock:
                    {" "}
                    {warehouse.totalStock}
                  </p>

                  <p>
                    Reserved:
                    {" "}
                    {warehouse.reservedStock}
                  </p>

                  <p
                    className={`stock-value ${
                    warehouse.available <= 0
                    ? "stock-out"
                    : warehouse.available <= 5
                    ? "stock-low"
                    : "stock-in" 
                    }`} 
                    >

                    Available:
                    {" "}
                    {warehouse.available}
                  </p>

                </CardContent>

                <Button
                  onClick={() =>
                    handleReserve(
                      product.id,
                      warehouse.warehouse
                    )
                  }

                  disabled={
                    loadingId ===
                    `${product.id}-${warehouse.warehouse}` ||
                    warehouse.available <= 0
                  }

                  className="reserve-button"
                >

                  {warehouse.available <= 0
                    ? "Out of Stock"
                    : loadingId ===
                    `${product.id}-${warehouse.warehouse}`
                    ? "Reserving..."
                    : "Reserve"}

                </Button>

              </Card>
            )
          )
        )}

      </div>
    </main>
  );
}