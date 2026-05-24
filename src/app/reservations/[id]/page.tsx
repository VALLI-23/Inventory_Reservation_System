"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, } from "@/components/ui/card";

export default function ReservationPage() {

  const params = useParams();

  const router = useRouter();

  const id = params.id;

  const [reservation, setReservation] =
    useState<any>(null);

  const [timeLeft, setTimeLeft] =
    useState("");

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  const [loadingAction, setLoadingAction] =
      useState<
      "confirm" | "cancel" | null
    >(null);

  const [isExpired, setIsExpired] =
    useState(false);
  // Fetch reservation
  useEffect(() => {

    async function fetchReservation() {

      try {

        const response =
          await fetch(
            `/api/reservations/${id}`
          );

        const data =
          await response.json();

        setReservation(data);

        if (
          data.status === "RELEASED" ||
          data.status === "CONFIRMED"
        ) {
          setIsExpired(false);
        }

      } catch (error) {

        setError(
          "Failed to load reservation"
        );
      }
    }

    fetchReservation();

    const interval =
      setInterval(
        fetchReservation,
        5000
      );

    return () =>
      clearInterval(interval);

  }, [id]);

  // Countdown timer
  useEffect(() => {

    if (!reservation) return;

    const interval = setInterval(() => {

      const expiry =
        new Date(
          reservation.expiresAt
        ).getTime();

      const now = Date.now();

      const difference =
        expiry - now;

      // Expired
      if (difference <= 0) {

        setTimeLeft(
          "Reservation expired"
        );
        setIsExpired(true);

        router.refresh();
        fetch(`/api/reservations/${id}`)
          .then((res) => res.json())
          .then((data) => setReservation(data));

        clearInterval(interval);

        return;
      }

      const minutes =
        Math.floor(
          difference / 1000 / 60
        );

      const seconds =
        Math.floor(
          (difference / 1000) % 60
        );

      setTimeLeft(
        `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
      );

    }, 1000);

    return () =>
      clearInterval(interval);

  }, [reservation?.expiresAt, id]);

  // Confirm purchase
  async function handleConfirm() {

    try {

      setLoadingAction("confirm");

      setError("");

      setSuccess("");

      const response =
        await fetch(
          `/api/reservations/${id}/confirm`,
          {
            method: "POST",
          }
        );

      const data =
        await response.json();

      // 410 error
      if (response.status === 410) {

        setError(
          "Reservation expired"
        );

        setTimeLeft(
          "Reservation expired"
        );

        return;
      }

      // Other errors
      if (!response.ok) {

        setError(
          data.error ||
          "Confirmation failed"
        );

        return;
      }

      setSuccess(
        "Purchase confirmed successfully"
      );
      
      router.refresh();

      // Refresh reservation state
      const updated =
        await fetch(
          `/api/reservations/${id}`
        );

      const updatedData =
        await updated.json();

      setReservation(updatedData);
      setTimeout(() => {
        router.push("/products");
      }, 2000);

    } catch (error) {

      setError(
        "Confirmation failed"
      );

    } finally {

      setLoadingAction(null);
    }
  }

  // Cancel reservation
  async function handleCancel() {

    try {

      setLoadingAction("cancel");

      setError("");

      setSuccess("");

      const response =
        await fetch(
          `/api/reservations/${id}/release`,
          {
            method: "POST",
          }
        );

      const data =
        await response.json();

      if (!response.ok) {

        setError(
          data.error ||
          "Cancellation failed"
        );

        return;
      }

      setSuccess(
        "Reservation cancelled successfully"
      );
      
      router.refresh();
      // Refresh state
      const updated =
        await fetch(
          `/api/reservations/${id}`
        );

      const updatedData =
        await updated.json();

      setReservation(updatedData);

      setTimeout(() => {
        router.push("/products");
      }, 2000);

    } catch (error) {

      setError(
        "Cancellation failed"
      );

    } finally {

      setLoadingAction(null);
    }
  }

  // Loading UI
  if (!reservation) {

    return (
      <div className="min-h-screen flex items-center justify-center text-xl">
        Loading reservation...
      </div>
    );
  }

  return (
    <main className="reservation-page">

      <Card className="reservation-card">

        <h1 className="reservation-title">
          Reservation Checkout
        </h1>

        {/* Error Message */}
        {error && (

          <div className="alert-error">

            {error}

          </div>
        )}

        {/* Success Message */}
        {success && (

          <div className="alert-success">

            {success}

          </div>
        )}

        {/* Reservation Details */}

        <div className="reservation-details">

          <div>

            <p className="detail-label">
              Reservation ID
            </p>

            <p className="detail-value">
              {reservation.id}
            </p>

          </div>

          <div>

            <p className="detail-label">
              Product ID
            </p>

            <p className="detail-value">
              {reservation.productId}
            </p>

          </div>

          <div>

            <p className="detail-label">
              Warehouse ID
            </p>

            <p className="detail-value">
              {reservation.warehouseId}
            </p>

          </div>

          <div>

            <p className="detail-label">
              Quantity
            </p>

            <p className="detail-value">
              {reservation.quantity}
            </p>

          </div>

          <div>

            <p className="detail-label">
              Status
            </p>

            <span
              className={`status-badge ${
                reservation.status === "CONFIRMED"
                  ? "status-confirmed"
                  : reservation.status === "RELEASED"
                  ? "status-released"
                  : isExpired
                  ? "status-expired"
                  : "status-pending"
              }`}
            >
              {isExpired &&
              reservation.status === "PENDING"
                ? "EXPIRED"
                : reservation.status}
          </span>

          </div>

        </div>

        {/* Countdown */}

        <div className="countdown-box">

          <p className="countdown-title">

            Time Remaining

          </p>

          <p className="countdown-time">

            {timeLeft}

          </p>
          <p className="countdown-note">
            Reservations expire automatically
            if not confirmed before the timer ends.
          </p>

        </div>

        {/* Buttons */}

        <div className="action-buttons">

          <Button
            onClick={handleConfirm}

            disabled={
              loadingAction !== null ||
              isExpired ||
              reservation.status !==
                "PENDING"
            }

            className="confirm-button"
          >
            {loadingAction === "confirm"
              ? "Processing..."
              : "Confirm Purchase"}
          </Button>

          <Button
            onClick={handleCancel}

            disabled={
              loadingAction !== null ||
              isExpired ||
              reservation.status !==
                "PENDING"
            }

            className="cancel-button"
          >
            {loadingAction === "cancel"
              ? "Cancelling..."
              : "Cancel Reservation"}
          </Button>

        </div>

        {/* Back Button */}

        <Button
          onClick={() =>
            router.push("/products")
          }

          className="back-button"
        >
          Back to Products
        </Button>

      </Card>
    </main>
  );
}