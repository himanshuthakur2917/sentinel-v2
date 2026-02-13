"use client";

import { useAuthStore } from "@/store/auth.store";
import { useEffect } from "react";

export function AuthInitializer() {
  const { refreshUser } = useAuthStore();

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  return null;
}
