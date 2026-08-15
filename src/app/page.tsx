"use client";

// ============================================================
// MentorMesh — Main Root Landing & Authentication Router
// ============================================================
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { PageLoading } from "@/components/ui/States";

export default function RootPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.push("/login");
    } else if (user.status === "pending") {
      router.push("/pending");
    } else if (user.status === "rejected") {
      router.push("/rejected");
    } else if (user.status === "inactive") {
      router.push("/inactive");
    } else {
      router.push("/dashboard");
    }
  }, [user, loading, router]);

  return <PageLoading />;
}
