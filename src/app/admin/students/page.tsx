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
import { deleteDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase/config";

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
  const [editDept, setEditDept] = useState("");
  const [editYear, setEditYear] = useState("");
  const [editSection, setEditSection] = useState("");
  const [saving, setSaving] = useState(false);

  // Delete User State
  const [deletingUser, setDeletingUser] = useState<User | null>(null);
  const [deleteSecurityCode, setDeleteSecurityCode] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);

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
    setEditDept(u.department || "");
    setEditYear(u.year || "");
    setEditSection(u.section || "");
  };

  const handleSaveEdit = async () => {
    if (!editingUser) return;
    setSaving(true);
    try {
      await updateUser(editingUser.uid, {
        role: editRole,
        status: editStatus,
        department: editDept || undefined,
        year: editYear || undefined,
        section: editSection || undefined,
      });
      setUsers((prev) =>
        prev.map((u) =>
          u.uid === editingUser.uid
            ? {
              ...u,
              role: editRole,
              status: editStatus,
              department: editDept || u.department,
              year: editYear || u.year,
              section: editSection || u.section,
            }
            : u
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

  const handleDeleteUser = async () => {
    if (!deletingUser || deleteSecurityCode !== "927624") {
      error("Invalid security code.");
      return;
    }
    setDeleteLoading(true);
    try {
      await deleteDoc(doc(db, "users", deletingUser.uid));
      setUsers((prev) => prev.filter((u) => u.uid !== deletingUser.uid));
      success(`User account "${deletingUser.name}" completely deleted.`);
      setDeletingUser(null);
      setDeleteSecurityCode("");
    } catch {
      error("Failed to delete user account.");
    } finally {
      setDeleteLoading(false);
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
                    {u.role !== "master" || isMaster ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        icon={<Edit2 size={14} />}
                        onClick={() => handleOpenEdit(u)}
                      >
                        Edit
                      </Button>
                    ) : (
                      <span className="text-xs text-slate-400 italic">Protected</span>
                    )}
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
          <div style={{ display: "flex", justifyContent: "space-between", width: "100%" }}>
            <div>
              <Button
                variant="destructive"
                onClick={() => { setEditingUser(null); setDeletingUser(editingUser); setDeleteSecurityCode(""); }}
              >
                Delete Account
              </Button>
            </div>
            <div style={{ display: "flex", gap: "0.75rem" }}>
              <Button variant="secondary" onClick={() => setEditingUser(null)}>
                Cancel
              </Button>
              <Button variant="primary" loading={saving} onClick={handleSaveEdit}>
                Save Changes
              </Button>
            </div>
          </div>
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

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="mm-label">Department</label>
              <select
                className="mm-input mm-select"
                value={editDept}
                onChange={(e) => setEditDept(e.target.value)}
              >
                <option value="">None</option>
                {["ECE", "CSE", "EEE", "MECH", "CIVIL", "IT", "VLSI / Microelectronics", "AI & DS", "Other"].map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="mm-label">Year / Batch</label>
              <select
                className="mm-input mm-select"
                value={editYear}
                onChange={(e) => setEditYear(e.target.value)}
              >
                <option value="">None</option>
                {[
                  "I (1st Year)",
                  "II (2nd Year)",
                  "III (3rd Year)",
                  "IV (4th Year / Final Year)",
                  "Passed Out (2020-21)",
                  "Passed Out (2021-22)",
                  "Passed Out (2022-23)",
                  "Passed Out (2023-24)",
                  "Passed Out (2024-25)",
                  "Passed Out (Alumni)",
                ].map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="mm-label">Section</label>
              <select
                className="mm-input mm-select"
                value={editSection}
                onChange={(e) => setEditSection(e.target.value)}
              >
                <option value="">None</option>
                {["A", "B", "C", "D", "E", "F", "VLSI-1", "VLSI-2", "Other"].map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </Modal>

      {/* Delete User Security Modal */}
      <Modal
        open={!!deletingUser}
        onClose={() => { setDeletingUser(null); setDeleteSecurityCode(""); }}
        title={deletingUser ? `Delete User: ${deletingUser.name}` : "Delete User"}
        description="This action is permanent and cannot be undone. Enter the 6-digit security code to confirm deletion."
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => { setDeletingUser(null); setDeleteSecurityCode(""); }}>Cancel</Button>
            <Button variant="destructive" loading={deleteLoading} onClick={handleDeleteUser} disabled={deleteSecurityCode.length !== 6}>
              Permanently Delete
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <div style={{ padding: "0.75rem", background: "var(--red-50)", border: "1px solid var(--red-100)", borderRadius: "10px" }}>
            <p style={{ fontSize: "0.8125rem", color: "var(--red-700)", fontWeight: 600 }}>
              ⚠️ This will completely delete the user's account from the database. This action cannot be reversed.
            </p>
          </div>
          <label className="mm-label">Security Code <span style={{ color: "var(--color-danger)" }}>*</span></label>
          <input
            className="mm-input"
            type="password"
            placeholder="Enter 6-digit security code"
            value={deleteSecurityCode}
            onChange={(e) => setDeleteSecurityCode(e.target.value)}
            maxLength={6}
            style={{ fontFamily: "monospace", letterSpacing: "0.2em", textAlign: "center", fontSize: "1.25rem" }}
          />
        </div>
      </Modal>
    </div>
  );
}
