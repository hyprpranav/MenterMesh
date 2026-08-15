"use client";

// ============================================================
// MentorMesh — Account Rejected / Inactive Pages
// ============================================================
import React from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/Button";
import { XCircle, LogOut } from "lucide-react";

export default function RejectedPage() {
  const { user, logOut } = useAuth();
  const router = useRouter();

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 p-8 shadow-sm text-center">
        <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <XCircle size={32} />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Access Request Not Approved</h1>
        <p className="text-slate-600 text-sm mb-6">
          Unfortunately, your access request for MentorMesh could not be approved by the staff at this time.
        </p>

        {user?.bio && (
          <div className="bg-red-50 text-red-700 p-3 rounded-lg text-xs text-left mb-6 border border-red-100">
            <strong>Reason:</strong> {user.bio}
          </div>
        )}

        <Button variant="primary" icon={<LogOut size={16} />} onClick={() => logOut().then(() => router.push("/login"))}>
          Return to Sign In
        </Button>
      </div>
    </div>
  );
}
