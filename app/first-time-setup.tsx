import { useEffect, useRef } from "react";
import { router } from "expo-router";
import { useAuth } from "@/contexts/AuthContext";

export default function FirstTimeSetup() {
  const { user, userProfile, loading } = useAuth();
  const didRoute = useRef(false);

  useEffect(() => {
    if (loading || didRoute.current) return;
    if (!user) {
      router.replace("/login");
      didRoute.current = true;
      return;
    }
    const isFirst = userProfile?.first_login !== false; // true أو null = أول مرة
    router.replace(isFirst ? "/interests" : "/(tabs)");
    didRoute.current = true;
  }, [loading, user, userProfile]);

  return null;
}
