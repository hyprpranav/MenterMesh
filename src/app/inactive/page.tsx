"use client";

// ============================================================
// MentorMesh — Account Inactive Page
// ============================================================
import React from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/Button";
import { AlertCircle, LogOut } from "lucide-react";

export default function InactivePage() {
  const { logOut } = useAuth();
  const router = useRouter();

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 p-8 shadow-sm text-center">
        <div className="w-16 h-16 bg-slate-100 text-slate-500 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertCircle size={32} />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Account Deactivated</h1>
        <p className="text-slate-600 text-sm mb-6">
          Your account has been deactivated by the system administrator. Please contact your mentor if you believe this is an error.
        </p>

        <Button variant="primary" icon={<LogOut size={16} />} onClick={() => logOut().then(() => router.push("/login"))}>
          Return to Sign In
        </Button>
      </div>
    </div>
  );
}
