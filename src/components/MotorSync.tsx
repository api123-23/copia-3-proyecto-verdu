"use client";

import { useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { intentarSync } from "@/lib/sync";

export function MotorSync() {
  useEffect(() => {
    const onOnline = () => intentarSync();
    const onVisible = () => {
      if (document.visibilityState === "visible") intentarSync();
    };
    window.addEventListener("online", onOnline);
    document.addEventListener("visibilitychange", onVisible);
    const { data: sub } = supabase().auth.onAuthStateChange((evento) => {
      if (evento === "SIGNED_IN") intentarSync();
    });
    intentarSync();
    return () => {
      window.removeEventListener("online", onOnline);
      document.removeEventListener("visibilitychange", onVisible);
      sub.subscription.unsubscribe();
    };
  }, []);

  return null;
}
