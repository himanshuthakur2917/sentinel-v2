"use client";

import { useEffect, useState } from "react";
import { Clock } from "lucide-react";

interface OtpTimerProps {
  expiresAt: string; // ISO timestamp
  onExpiry: () => void;
}

export function OtpTimer({ expiresAt, onExpiry }: OtpTimerProps) {
  const [timeLeft, setTimeLeft] = useState<number>(0);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = Date.now();
      const expiry = new Date(expiresAt).getTime();
      const diff = Math.max(0, Math.floor((expiry - now) / 1000));
      return diff;
    };

    // Initial calculation
    const initial = calculateTimeLeft();
    setTimeLeft(initial);
    if (initial === 0) {
      onExpiry();
    }

    // Update every second
    const interval = setInterval(() => {
      const remaining = calculateTimeLeft();
      setTimeLeft(remaining);

      if (remaining === 0) {
        onExpiry();
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [expiresAt, onExpiry]);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  const isExpired = timeLeft === 0;
  const isLowTime = timeLeft <= 30;

  return (
    <div
      className={`flex items-center gap-2 text-sm font-medium ${
        isExpired
          ? "text-destructive"
          : isLowTime
            ? "text-orange-500"
            : "text-muted-foreground"
      }`}
    >
      <Clock className="h-4 w-4" />
      <span>
        {isExpired
          ? "OTP Expired"
          : `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`}
      </span>
    </div>
  );
}
