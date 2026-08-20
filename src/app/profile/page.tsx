"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { useAuth } from "@/contexts/AuthContext";
import { updateUser } from "@/lib/firebase/firestore";
import type { User } from "@/types";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/ui/States";
import { useToast } from "@/components/ui/ToastProvider";
import { ArrowLeft, Check, Pencil, Save, X } from "lucide-react";
import { CloudinaryImageUpload } from "@/components/ui/CloudinaryImageUpload";

const initialProfileForm = (user: User | null) => ({
  uid: user?.uid ?? "",
  name: user?.name ?? "",
  email: user?.email ?? "",
  role: user?.role ?? "student",
  department: user?.department ?? "",
  year: user?.year ?? "",
  section: user?.section ?? "",
  registerNumber: user?.registerNumber ?? "",
  rollNumber: user?.rollNumber ?? "",
  phone: user?.phone ?? "",
  personalEmail: user?.personalEmail ?? "",
  alternateEmail: user?.alternateEmail ?? "",
  dateOfBirth: user?.dateOfBirth ?? "",
  aadhaarNumber: user?.aadhaarNumber ?? "",
  parentPhoneNumber: user?.parentPhoneNumber ?? "",
  bloodGroup: user?.bloodGroup ?? "",
  address: user?.address ?? "",
  github: user?.github ?? "",
  linkedIn: user?.linkedIn ?? "",
  portfolio: user?.portfolio ?? "",
  bio: user?.bio ?? "",
  skills: (user?.skills ?? []).join(", "),
  profilePhoto: user?.profilePhoto ?? "",
  professionalPhoto: user?.professionalPhoto ?? "",
});

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const { success, error: toastError } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<ReturnType<typeof initialProfileForm>>({
    uid: "",
    name: "",
    email: "",
    role: "student",
    department: "",
    year: "",
    section: "",
    registerNumber: "",
    rollNumber: "",
    phone: "",
    personalEmail: "",
    alternateEmail: "",
    dateOfBirth: "",
    aadhaarNumber: "",
    parentPhoneNumber: "",
    bloodGroup: "",
    address: "",
    github: "",
    linkedIn: "",
    portfolio: "",
    bio: "",
    skills: "",
    profilePhoto: "",
    professionalPhoto: "",
  });

  useEffect(() => {
    if (user) {
      setForm(initialProfileForm(user));
    }
  }, [user]);

  const profileMeta = useMemo(() => {
    return [user?.department, user?.year && `${user?.year} Year`, user?.section && `Sec ${user.section}`].filter(Boolean).join(" · ");
  }, [user]);

  if (!user) {
    return (
      <AppShell>
        <LoadingState message="Loading profile..." />
      </AppShell>
    );
  }

  const handleChange = (key: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload: Partial<User> = {
        name: form.name.trim(),
        email: form.email.trim(),
        department: form.department.trim() || undefined,
        year: form.year.trim() || undefined,
        section: form.section.trim() || undefined,
        registerNumber: form.registerNumber.trim() || undefined,
        rollNumber: form.rollNumber.trim() || undefined,
        phone: form.phone.trim() || undefined,
        parentPhoneNumber: form.parentPhoneNumber.trim() || undefined,
        personalEmail: form.personalEmail.trim() || undefined,
        alternateEmail: form.alternateEmail.trim() || undefined,
        dateOfBirth: form.dateOfBirth.trim() || undefined,
        aadhaarNumber: form.aadhaarNumber.trim() || undefined,
        bloodGroup: form.bloodGroup.trim() || undefined,
        address: form.address.trim() || undefined,
        github: form.github.trim() || undefined,
        linkedIn: form.linkedIn.trim() || undefined,
        portfolio: form.portfolio.trim() || undefined,
        profilePhoto: form.profilePhoto.trim() || undefined,
        professionalPhoto: form.professionalPhoto.trim() || undefined,
        bio: form.bio.trim() || undefined,
        skills: form.skills
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
      };

      await updateUser(user.uid, payload);
      await refreshUser();
      setIsEditing(false);
      success("Profile updated successfully.");
    } catch {
      toastError("Unable to save profile changes.");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setForm(initialProfileForm(user));
    setIsEditing(false);
  };

  return (
    <AppShell>
      <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", maxWidth: "860px", margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.75rem", flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <Link href={user.role === "student" ? "/dashboard" : "/dashboard"} style={{ textDecoration: "none" }}>
              <Button variant="ghost" size="sm" icon={<ArrowLeft size={15} />}>
                Back
              </Button>
            </Link>
            <div>
              <h1 className="mm-page-title">My Profile</h1>
              <p className="mm-page-subtitle">Update your details and keep your information current.</p>
            </div>
          </div>

          {!isEditing ? (
            <Button variant="primary" size="sm" icon={<Pencil size={14} />} onClick={() => setIsEditing(true)}>
              Edit Profile
            </Button>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Button variant="secondary" size="sm" icon={<X size={14} />} onClick={handleCancel}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" loading={saving} icon={<Save size={14} />} onClick={handleSave}>
                Save
              </Button>
            </div>
          )}
        </div>

        <div className="mm-card" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ height: "6px", background: "linear-gradient(90deg, #10B981, #0EA5E9)" }} />
          <div style={{ padding: "1.5rem", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: "0.875rem" }}>
            <Avatar name={form.name || user.name} photoUrl={user.profilePhoto} size="xl" />
            <div>
              <h2 style={{ fontSize: "1.5rem", fontWeight: 700, letterSpacing: "-0.03em", margin: 0 }}>
                {form.name || user.name}
              </h2>
              <p style={{ marginTop: "0.25rem", color: "var(--color-muted)", fontWeight: 500 }}>
                {profileMeta || "Profile details"}
              </p>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", justifyContent: "center" }}>
              {user.role === "staff" || user.role === "master" ? (
                <span style={{ padding: "0.35rem 0.75rem", borderRadius: "999px", background: "rgba(148,163,184,0.15)", border: "1px solid rgba(148,163,184,0.28)", color: "#E2E8F0", fontSize: "0.75rem", fontWeight: 700 }}>
                  {user.role === "master" ? "Master" : "Staff / Faculty"}
                </span>
              ) : (
                <span style={{ padding: "0.35rem 0.75rem", borderRadius: "999px", background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.18)", color: "#047857", fontSize: "0.75rem", fontWeight: 700 }}>
                  Student
                </span>
              )}
            </div>
            <Link href={user.role === "student" ? `/students/${user.uid}` : `/students/${user.uid}`}>
              <Button variant="outline" size="sm">
                View Public Profile
              </Button>
            </Link>
          </div>
        </div>

        {!isEditing ? (
          <div style={{ display: "grid", gap: "1.25rem" }}>
            <div className="mm-card">
              <p className="mm-profile-section-title">Basic Information</p>
              <div className="mm-profile-fields">
                <div className="mm-field"><label>Name</label><p>{user.name}</p></div>
                <div className="mm-field"><label>Official Email</label><p>{user.email}</p></div>
                <div className="mm-field"><label>Department</label><p>{user.department || "—"}</p></div>
                <div className="mm-field"><label>Year</label><p>{user.year || "—"}</p></div>
                <div className="mm-field"><label>Section</label><p>{user.section || "—"}</p></div>
                <div className="mm-field"><label>Register Number</label><p>{user.registerNumber || "—"}</p></div>
                <div className="mm-field"><label>Roll Number</label><p>{user.rollNumber || "—"}</p></div>
              </div>
            </div>

            <div className="mm-card">
              <p className="mm-profile-section-title">Contact Details</p>
              <div className="mm-profile-fields">
                <div className="mm-field"><label>Phone Number</label><p>{user.phone || "—"}</p></div>
                <div className="mm-field"><label>Parent/Guardian Phone</label><p>{user.parentPhoneNumber || "—"}</p></div>
                <div className="mm-field"><label>Personal Email</label><p>{user.personalEmail || "—"}</p></div>
                <div className="mm-field"><label>Alternate Email</label><p>{user.alternateEmail || "—"}</p></div>
                <div className="mm-field"><label>Date of Birth</label><p>{user.dateOfBirth || "—"}</p></div>
                <div className="mm-field"><label>Aadhaar Number</label><p>{user.aadhaarNumber || "—"}</p></div>
                <div className="mm-field"><label>Blood Group</label><p>{user.bloodGroup || "—"}</p></div>
                <div className="mm-field"><label>Address</label><p>{user.address || "—"}</p></div>
              </div>
            </div>

            <div className="mm-card">
              <p className="mm-profile-section-title">Links & Skills</p>
              <div className="mm-profile-fields">
                <div className="mm-field"><label>GitHub</label><p>{user.github || "—"}</p></div>
                <div className="mm-field"><label>LinkedIn</label><p>{user.linkedIn || "—"}</p></div>
                <div className="mm-field"><label>Portfolio</label><p>{user.portfolio || "—"}</p></div>
                <div className="mm-field"><label>Skills</label><p>{user.skills?.join(", ") || "—"}</p></div>
                <div className="mm-field"><label>Bio</label><p>{user.bio || "—"}</p></div>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ display: "grid", gap: "1.25rem" }}>
            <div className="mm-card">
              <p className="mm-profile-section-title">Edit Profile</p>

              <div className="mb-6 pt-2 pb-4 border-b border-slate-100 flex flex-wrap gap-8">
                <CloudinaryImageUpload
                  label="Profile Photo"
                  buttonText="Upload Profile Photo"
                  existingUrl={form.profilePhoto}
                  onUploadSuccess={(url) => handleChange("profilePhoto", url)}
                />
                <CloudinaryImageUpload
                  label="Professional Photo"
                  buttonText="Upload Professional Photo"
                  existingUrl={form.professionalPhoto}
                  onUploadSuccess={(url) => handleChange("professionalPhoto", url)}
                />
              </div>

              <div className="mm-profile-fields" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
                <label className="mm-field">
                  <span>Name</span>
                  <input className="mm-input" value={form.name} onChange={(e) => handleChange("name", e.target.value)} />
                </label>
                <label className="mm-field">
                  <span>Official Email</span>
                  <input className="mm-input" value={form.email} onChange={(e) => handleChange("email", e.target.value)} />
                </label>
                <label className="mm-field">
                  <span>Department</span>
                  <input className="mm-input" value={form.department} onChange={(e) => handleChange("department", e.target.value)} />
                </label>
                <label className="mm-field">
                  <span>Year</span>
                  <input className="mm-input" value={form.year} onChange={(e) => handleChange("year", e.target.value)} />
                </label>
                <label className="mm-field">
                  <span>Section</span>
                  <input className="mm-input" value={form.section} onChange={(e) => handleChange("section", e.target.value)} />
                </label>
                <label className="mm-field">
                  <span>Register Number</span>
                  <input className="mm-input" value={form.registerNumber} onChange={(e) => handleChange("registerNumber", e.target.value)} />
                </label>
                <label className="mm-field">
                  <span>Roll Number</span>
                  <input className="mm-input" value={form.rollNumber} onChange={(e) => handleChange("rollNumber", e.target.value)} />
                </label>
                <label className="mm-field">
                  <span>Phone Number</span>
                  <input className="mm-input" value={form.phone} onChange={(e) => handleChange("phone", e.target.value)} />
                </label>
                <label className="mm-field">
                  <span>Parent/Guardian Phone</span>
                  <input className="mm-input" value={form.parentPhoneNumber} onChange={(e) => handleChange("parentPhoneNumber", e.target.value)} />
                </label>
                <label className="mm-field">
                  <span>Personal Email</span>
                  <input className="mm-input" value={form.personalEmail} onChange={(e) => handleChange("personalEmail", e.target.value)} />
                </label>
                <label className="mm-field">
                  <span>Alternate Email</span>
                  <input className="mm-input" value={form.alternateEmail} onChange={(e) => handleChange("alternateEmail", e.target.value)} />
                </label>
                <label className="mm-field">
                  <span>Date of Birth</span>
                  <input className="mm-input" value={form.dateOfBirth} onChange={(e) => handleChange("dateOfBirth", e.target.value)} />
                </label>
                <label className="mm-field">
                  <span>Aadhaar Number</span>
                  <input className="mm-input" value={form.aadhaarNumber} onChange={(e) => handleChange("aadhaarNumber", e.target.value)} />
                </label>
                <label className="mm-field">
                  <span>Blood Group</span>
                  <input className="mm-input" value={form.bloodGroup} onChange={(e) => handleChange("bloodGroup", e.target.value)} />
                </label>
                <label className="mm-field" style={{ gridColumn: "1 / -1" }}>
                  <span>Address</span>
                  <textarea className="mm-input" rows={3} value={form.address} onChange={(e) => handleChange("address", e.target.value)} />
                </label>
                <label className="mm-field">
                  <span>GitHub</span>
                  <input className="mm-input" value={form.github} onChange={(e) => handleChange("github", e.target.value)} />
                </label>
                <label className="mm-field">
                  <span>LinkedIn</span>
                  <input className="mm-input" value={form.linkedIn} onChange={(e) => handleChange("linkedIn", e.target.value)} />
                </label>
                <label className="mm-field">
                  <span>Portfolio</span>
                  <input className="mm-input" value={form.portfolio} onChange={(e) => handleChange("portfolio", e.target.value)} />
                </label>
                <label className="mm-field">
                  <span>Skills</span>
                  <input className="mm-input" value={form.skills} onChange={(e) => handleChange("skills", e.target.value)} />
                </label>
                <label className="mm-field" style={{ gridColumn: "1 / -1" }}>
                  <span>Bio</span>
                  <textarea className="mm-input" rows={3} value={form.bio} onChange={(e) => handleChange("bio", e.target.value)} />
                </label>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
