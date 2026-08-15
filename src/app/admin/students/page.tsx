"use client";

// ============================================================
// MentorMesh — Admin Student Management Table
// ============================================================
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { useAuth } from "@/contexts/AuthContext";
import { getAllUsers, updateUser } from "@/lib/firebase/firestore";
import type { User } from "@/types";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Search, Download, Edit2, Users } from "lucide-react";
import { LoadingState, EmptyState } from "@/components/ui/States";
import { useToast } from "@/components/ui/ToastProvider";
import { CopyButton } from "@/components/ui/CopyButton";
import { Avatar } from "@/components/ui/Avatar";

export default function AdminStudentsPage() {
  return (
    <AppShell>
      <AdminStudentsContent />
    </AppShell>
  );
}

function AdminStudentsContent() {
  const { user: currentUser } = useAuth();
  const { success, error } = useToast();

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Edit Modal State
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editRole, setEditRole] = useState<"student" | "staff">("student");
  const [editStatus, setEditStatus] = useState<import("@/types").UserStatus>("active");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const list = await getAllUsers();
        setUsers(list);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const isMaster = currentUser?.role === "master";

  const filteredUsers = users.filter((u) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      u.name.toLowerCase().includes(q) ||
      (u.registerNumber && u.registerNumber.toLowerCase().includes(q)) ||
      u.email.toLowerCase().includes(q) ||
      (u.department && u.department.toLowerCase().includes(q))
    );
  });

  const handleOpenEdit = (u: User) => {
    setEditingUser(u);
    setEditRole(u.role === "master" ? "staff" : (u.role as "student" | "staff"));
    setEditStatus(u.status);
  };

  const handleSaveEdit = async () => {
    if (!editingUser) return;
    setSaving(true);
    try {
      await updateUser(editingUser.uid, {
        role: editRole,
        status: editStatus,
      });
      setUsers((prev) =>
        prev.map((u) =>
          u.uid === editingUser.uid ? { ...u, role: editRole, status: editStatus } : u
        )
      );
      success(`Updated ${editingUser.name}'s account settings.`);
      setEditingUser(null);
    } catch {
      error("Failed to update user.");
    } finally {
      setSaving(false);
    }
  };

  const statusVariant = (s: string) => {
    if (s === "active") return "active";
    if (s === "pending") return "pending";
    if (s === "rejected") return "rejected";
    return "draft";
  };

  return (
    <div className="space-y-6 mm-page-animate">
      <PageHeader
        icon={<Users size={20} />}
        iconClass="bg-teal-100 text-teal-600"
        title="Student Management"
        subtitle={`${users.length} total users. Inspect, edit status, manage roles, and review student records.`}
        actions={
          <Link href="/admin/export">
            <Button variant="outline" size="sm" icon={<Download size={14} />}>
              Export Data
            </Button>
          </Link>
        }
      />

      {/* Search */}
      <div className="mm-search">
        <Search className="mm-search-icon" size={18} />
        <input
          className="mm-search-input"
          placeholder="Search by name, register number, email, or department..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Table */}
      {loading ? (
        <LoadingState message="Loading student records..." />
      ) : filteredUsers.length === 0 ? (
        <EmptyState icon={<Search size={40} />} title="No matching records" />
      ) : (
        <div className="mm-table-wrap">
          <table className="mm-table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Register No</th>
                <th>Dept / Yr / Sec</th>
                <th>Role</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((u) => (
                <tr key={u.uid}>
                  <td>
                    <div className="flex items-center gap-2.5">
                      <Avatar name={u.name} photoUrl={u.profilePhoto} size="sm" />
                      <div>
                        <Link
                          href={`/students/${u.uid}`}
                          className="font-bold text-slate-900 text-sm hover:text-blue-600"
                        >
                          {u.name}
                        </Link>
                        <p className="text-xs text-slate-400">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="font-mono text-xs">
                    <div className="flex items-center gap-1.5">
                      <span>{u.registerNumber || "—"}</span>
                      {u.registerNumber && (
                        <CopyButton text={u.registerNumber} label="Reg No" />
                      )}
                    </div>
                  </td>
                  <td className="text-xs">
                    {u.department
                      ? `${u.department} — ${u.year} Yr (${u.section})`
                      : "—"}
                  </td>
                  <td>
                    <span className="text-xs font-bold capitalize text-slate-700">
                      {u.role}
                    </span>
                  </td>
                  <td>
                    <Badge variant={statusVariant(u.status) as "active" | "pending" | "rejected" | "draft"}>
                      {u.status.toUpperCase()}
                    </Badge>
                  </td>
                  <td>
                    <Button
                      size="sm"
                      variant="ghost"
                      icon={<Edit2 size={14} />}
                      onClick={() => handleOpenEdit(u)}
                    >
                      Edit
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Edit User Modal */}
      <Modal
        open={!!editingUser}
        onClose={() => setEditingUser(null)}
        title={editingUser ? `Manage Account: ${editingUser.name}` : "Manage Account"}
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditingUser(null)}>
              Cancel
            </Button>
            <Button variant="primary" loading={saving} onClick={handleSaveEdit}>
              Save Changes
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="mm-label">Account Role</label>
            <select
              className="mm-input mm-select"
              value={editRole}
              onChange={(e) => setEditRole(e.target.value as "student" | "staff")}
              disabled={!isMaster}
            >
              <option value="student">Student</option>
              <option value="staff">Staff / Mentor</option>
            </select>
            {!isMaster && (
              <p className="text-[11px] text-slate-400 mt-1">
                Only Master account can modify roles.
              </p>
            )}
          </div>

          <div>
            <label className="mm-label">Account Status</label>
            <select
              className="mm-input mm-select"
              value={editStatus}
              onChange={(e) =>
                setEditStatus(
                  e.target.value as "active" | "inactive" | "pending" | "rejected"
                )
              }
            >
              <option value="active">Active</option>
              <option value="pending">Pending Approval</option>
              <option value="inactive">Inactive / Deactivated</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>
      </Modal>
    </div>
  );
}
