"use client";

// ============================================================
// MentorMesh — Staff & Master Role Management (Master Only)
// ============================================================
import React, { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { useAuth } from "@/contexts/AuthContext";
import { getAllUsers, updateUser } from "@/lib/firebase/firestore";
import type { User } from "@/types";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { ShieldCheck, UserPlus } from "lucide-react";
import { LoadingState, EmptyState } from "@/components/ui/States";
import { useToast } from "@/components/ui/ToastProvider";
import { Avatar } from "@/components/ui/Avatar";

export default function StaffManagementPage() {
  return (
    <AppShell>
      <StaffManagementContent />
    </AppShell>
  );
}

function StaffManagementContent() {
  const { user: currentUser } = useAuth();
  const { success, error } = useToast();

  const [staffUsers, setStaffUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [promoteOpen, setPromoteOpen] = useState(false);
  const [selectedUid, setSelectedUid] = useState("");
  const [promoting, setPromoting] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const users = await getAllUsers();
        setAllUsers(users);
        setStaffUsers(users.filter((u) => u.role === "staff" || u.role === "master"));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const isMaster = currentUser?.role === "master";

  const handlePromoteStaff = async () => {
    if (!selectedUid) return;
    setPromoting(true);
    try {
      await updateUser(selectedUid, { role: "staff" });
      const updatedUsers = await getAllUsers();
      setAllUsers(updatedUsers);
      setStaffUsers(updatedUsers.filter((u) => u.role === "staff" || u.role === "master"));
      setPromoteOpen(false);
      setSelectedUid("");
      success("Promoted student to Staff / Mentor role!");
    } catch {
      error("Failed to promote user.");
    } finally {
      setPromoting(false);
    }
  };

  const handleDemoteStaff = async (u: User) => {
    if (u.role === "master") {
      error("Master role cannot be demoted directly.");
      return;
    }
    try {
      await updateUser(u.uid, { role: "student" });
      setStaffUsers((prev) => prev.filter((user) => user.uid !== u.uid));
      success(`Demoted ${u.name} back to Student role.`);
    } catch {
      error("Failed to demote user.");
    }
  };

  if (!isMaster) {
    return (
      <div className="mm-danger-box flex items-center gap-2 text-sm font-semibold">
        Access Denied: Master privileges required.
      </div>
    );
  }

  const statusBadgeVariant = (s: string) =>
    s === "active" ? "active" : s === "pending" ? "pending" : "draft";

  return (
    <div className="space-y-6 w-full max-w-6xl mx-auto mm-page-animate">
      <PageHeader
        icon={<ShieldCheck size={20} />}
        iconClass="bg-purple-100 text-purple-600"
        title="Staff Management"
        subtitle="Authorize faculty mentors and staff members with administrative rights."
        actions={
          <Button
            variant="primary"
            size="sm"
            icon={<UserPlus size={14} />}
            onClick={() => setPromoteOpen(true)}
          >
            Add Staff Member
          </Button>
        }
      />

      {loading ? (
        <LoadingState message="Loading staff records..." />
      ) : staffUsers.length === 0 ? (
        <EmptyState icon={<ShieldCheck size={40} />} title="No staff members" />
      ) : (
        <div className="mm-table-wrap">
          <table className="mm-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {staffUsers.map((u) => (
                <tr key={u.uid}>
                  <td>
                    <div className="flex items-center gap-2.5">
                      <Avatar name={u.name} photoUrl={u.profilePhoto} size="sm" />
                      <span className="font-bold text-slate-900 text-sm">{u.name}</span>
                    </div>
                  </td>
                  <td className="text-xs text-slate-500">{u.email}</td>
                  <td>
                    <span className="text-xs font-bold uppercase text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-100">
                      {u.role}
                    </span>
                  </td>
                  <td>
                    <Badge variant={statusBadgeVariant(u.status) as "active" | "pending" | "draft"}>
                      {u.status.toUpperCase()}
                    </Badge>
                  </td>
                  <td>
                    {u.role !== "master" && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-600 hover:bg-red-50"
                        onClick={() => handleDemoteStaff(u)}
                      >
                        Demote
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Promote to Staff Modal */}
      <Modal
        open={promoteOpen}
        onClose={() => { setPromoteOpen(false); setSelectedUid(""); }}
        title="Add Staff Member / Mentor"
        description="Select a student to promote to Staff / Mentor role."
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => { setPromoteOpen(false); setSelectedUid(""); }}>
              Cancel
            </Button>
            <Button
              variant="primary"
              loading={promoting}
              onClick={handlePromoteStaff}
              disabled={!selectedUid}
            >
              Promote to Staff
            </Button>
          </>
        }
      >
        <div>
          <label className="mm-label">Select Student to Promote</label>
          <select
            className="mm-input mm-select"
            value={selectedUid}
            onChange={(e) => setSelectedUid(e.target.value)}
          >
            <option value="">Select student...</option>
            {allUsers
              .filter((u) => u.role === "student")
              .map((u) => (
                <option key={u.uid} value={u.uid}>
                  {u.name} ({u.email} — {u.department})
                </option>
              ))}
          </select>
        </div>
      </Modal>
    </div>
  );
}
