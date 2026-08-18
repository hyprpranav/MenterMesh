"use client";

// ============================================================
// MentorMesh — Student Directory v2 (Copy-First, Mobile-First)
// ============================================================
import React, { useEffect, useState, useMemo, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { Search, X, Users, SlidersHorizontal, ChevronDown } from "lucide-react";
import { getActiveStudents } from "@/lib/firebase/firestore";
import type { User } from "@/types";
import { Avatar } from "@/components/ui/Avatar";
import { CopyButton } from "@/components/ui/CopyButton";
import { CopyField } from "@/components/ui/CopyField";
import { EmptyState, LoadingState } from "@/components/ui/States";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { normalizeForSearch } from "@/lib/utils";

const DEPARTMENTS = [
  "All",
  "ECE",
  "CSE",
  "EEE",
  "MECH",
  "CIVIL",
  "IT",
  "VLSI / Microelectronics",
  "AI & DS",
  "Other",
];

const YEARS = [
  "All",
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
];

const SECTIONS = [
  "All",
  "A",
  "B",
  "C",
  "D",
  "E",
  "F",
  "VLSI-1",
  "VLSI-2",
  "Other",
];

export default function StudentDirectoryPage() {
  return (
    <AppShell>
      <Suspense fallback={<LoadingState message="Loading directory..." />}>
        <DirectoryContent />
      </Suspense>
    </AppShell>
  );
}

function DirectoryContent() {
  const searchParams = useSearchParams();
  const [students, setStudents] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState<User | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") || "");
  const [selectedDept, setSelectedDept] = useState("All");
  const [selectedYear, setSelectedYear] = useState("All");
  const [selectedSec,  setSelectedSec]  = useState("All");

  useEffect(() => {
    getActiveStudents()
      .then(setStudents)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filteredStudents = useMemo(() => {
    const q = normalizeForSearch(searchQuery);
    return students.filter((s) => {
      if (selectedDept !== "All" && s.department !== selectedDept) return false;

      if (selectedYear !== "All") {
        const y = (s.year || "").trim();
        const sel = selectedYear;
        const matches =
          y === sel ||
          (sel.startsWith("I (") && (y === "I" || y.startsWith("I (") || y.toLowerCase() === "1st year" || y.toLowerCase() === "1st")) ||
          (sel.startsWith("II (") && (y === "II" || y.startsWith("II (") || y.toLowerCase() === "2nd year" || y.toLowerCase() === "2nd")) ||
          (sel.startsWith("III (") && (y === "III" || y.startsWith("III (") || y.toLowerCase() === "3rd year" || y.toLowerCase() === "3rd")) ||
          (sel.startsWith("IV (") && (y === "IV" || y.startsWith("IV (") || y.toLowerCase().includes("final") || y.toLowerCase() === "4th year" || y.toLowerCase() === "4th")) ||
          (sel.includes("2020-21") && (y.includes("2020") || y.includes("20-21"))) ||
          (sel.includes("2021-22") && (y.includes("2021") || y.includes("21-22"))) ||
          (sel.includes("2022-23") && (y.includes("2022") || y.includes("22-23"))) ||
          (sel.includes("2023-24") && (y.includes("2023") || y.includes("23-24"))) ||
          (sel.includes("2024-25") && (y.includes("2024") || y.includes("24-25"))) ||
          (sel.includes("Alumni") && (y.toLowerCase().includes("passed") || y.toLowerCase().includes("alumni")));
        if (!matches) return false;
      }

      if (selectedSec !== "All") {
        const sSec = (s.section || "").trim().toUpperCase();
        const selSec = selectedSec.trim().toUpperCase();
        if (sSec !== selSec) return false;
      }

      if (!q) return true;
      return [
        s.name, s.registerNumber, s.rollNumber, s.email,
        s.personalEmail, s.phone, s.department, s.year, s.section, ...(s.skills ?? []),
      ].some((v) => v && normalizeForSearch(v).includes(q));
    });
  }, [students, searchQuery, selectedDept, selectedYear, selectedSec]);

  const hasActiveFilters = selectedDept !== "All" || selectedYear !== "All" || selectedSec !== "All" || searchQuery.trim().length > 0;

  const clearFilters = () => {
    setSearchQuery(""); setSelectedDept("All"); setSelectedYear("All"); setSelectedSec("All");
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "0.75rem", flexWrap: "wrap" }}>
        <div>
          <h1 className="mm-page-title">Student Directory</h1>
          <p className="mm-page-subtitle">Search by name, register number, department, year, or skills</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.8125rem", fontWeight: 500, color: "var(--color-muted)" }}>
          <Users size={14} />
          {students.length} students
        </div>
      </div>

      {/* Search Bar */}
      <div className="mm-search">
        <Search className="mm-search-icon" size={18} />
        <input
          type="search"
          className="mm-search-input"
          placeholder="Search by name, reg no (e.g. 23EC104), skill…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          autoComplete="off"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            style={{
              position: "absolute", right: "0.875rem", top: "50%",
              transform: "translateY(-50%)",
              background: "none", border: "none",
              color: "var(--color-placeholder)", cursor: "pointer",
              display: "flex", alignItems: "center",
            }}
            aria-label="Clear search"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Filters Row */}
      <div style={{
        background: "var(--color-surface)",
        border: "1px solid var(--color-border)",
        borderRadius: "var(--radius-lg)",
        padding: "0.875rem 1rem",
        display: "flex", flexWrap: "wrap", alignItems: "center",
        gap: "0.75rem",
        boxShadow: "var(--shadow-xs)",
      }}>
        {/* Filter label */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.375rem", color: "var(--color-muted)", fontSize: "0.8125rem", fontWeight: 600, flexShrink: 0 }}>
          <SlidersHorizontal size={14} />
          Filter:
        </div>

        {/* Selects */}
        {[
          { label: "Dept",    value: selectedDept, onChange: setSelectedDept, options: DEPARTMENTS },
          { label: "Year",    value: selectedYear, onChange: setSelectedYear, options: YEARS },
          { label: "Section", value: selectedSec,  onChange: setSelectedSec,  options: SECTIONS },
        ].map(({ label, value, onChange, options }) => (
          <div key={label} style={{ display: "flex", alignItems: "center", gap: "0.375rem" }}>
            <span style={{ fontSize: "0.8125rem", fontWeight: 600, color: "var(--color-muted)", flexShrink: 0 }}>{label}:</span>
            <select
              value={value}
              onChange={(e) => onChange(e.target.value)}
              style={{
                padding: "0.25rem 1.75rem 0.25rem 0.625rem",
                fontSize: "0.8125rem", fontFamily: "var(--font-sans)",
                color: value !== "All" ? "var(--color-primary)" : "var(--color-text)",
                fontWeight: value !== "All" ? 700 : 500,
                background: "var(--color-bg) url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%2364748B' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E\") no-repeat right 0.5rem center",
                border: "1.5px solid var(--color-border)",
                borderRadius: "6px",
                outline: "none",
                cursor: "pointer",
                WebkitAppearance: "none",
                appearance: "none",
                minHeight: "32px",
              }}
            >
              {options.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
        ))}

        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            style={{
              display: "flex", alignItems: "center", gap: "4px",
              fontSize: "0.8125rem", fontWeight: 600,
              color: "var(--color-danger)", background: "none",
              border: "none", cursor: "pointer",
              marginLeft: "auto",
            }}
          >
            <X size={13} /> Clear all
          </button>
        )}
      </div>

      {/* Active Filter Chips */}
      {hasActiveFilters && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.375rem", alignItems: "center" }}>
          <span style={{ fontSize: "0.75rem", color: "var(--color-muted)", fontWeight: 500 }}>Active:</span>
          {selectedDept !== "All" && (
            <span className="mm-chip">Dept: {selectedDept}<button onClick={() => setSelectedDept("All")}><X size={11} /></button></span>
          )}
          {selectedYear !== "All" && (
            <span className="mm-chip">Year: {selectedYear}<button onClick={() => setSelectedYear("All")}><X size={11} /></button></span>
          )}
          {selectedSec !== "All" && (
            <span className="mm-chip">Sec: {selectedSec}<button onClick={() => setSelectedSec("All")}><X size={11} /></button></span>
          )}
          {searchQuery && (
            <span className="mm-chip">&ldquo;{searchQuery}&rdquo;<button onClick={() => setSearchQuery("")}><X size={11} /></button></span>
          )}
        </div>
      )}

      {/* Results count */}
      <div style={{ fontSize: "0.8125rem", color: "var(--color-muted)", fontWeight: 500, paddingLeft: "0.25rem" }}>
        Showing {filteredStudents.length} of {students.length} students
      </div>

      {/* Results Grid */}
      {loading ? (
        <LoadingState message="Searching student directory..." />
      ) : filteredStudents.length === 0 ? (
        <EmptyState
          icon={<Users size={28} color="var(--color-muted)" />}
          title="No students found"
          description={
            hasActiveFilters
              ? "No students match your search. Try adjusting your query or clearing filters."
              : "No active students in the directory."
          }
          action={hasActiveFilters ? { label: "Clear Filters", onClick: clearFilters } : undefined}
        />
      ) : (
        <div className="mm-grid-3">
          {filteredStudents.map((s) => (
            <StudentCard key={s.uid} student={s} onOpen={() => setSelectedStudent(s)} />
          ))}
        </div>
      )}

      {/* Student Detail Modal */}
      <StudentModal student={selectedStudent} onClose={() => setSelectedStudent(null)} />
    </div>
  );
}

// ── Student Card ──────────────────────────────────────────────
function StudentCard({ student, onOpen }: { student: User; onOpen: () => void }) {
  return (
    <div
      className="mm-card mm-card-hover"
      onClick={onOpen}
      style={{ display: "flex", flexDirection: "column", gap: "0.875rem", cursor: "pointer" }}
    >
      {/* Avatar + name */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem" }}>
        <Avatar name={student.name} photoUrl={student.profilePhoto} size="lg" />
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3 style={{ fontWeight: 700, fontSize: "0.9375rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "var(--color-text)" }}>
            {student.name}
          </h3>
          <p style={{ fontSize: "0.8125rem", color: "var(--color-muted)", fontWeight: 500 }}>
            {student.department} · {student.year} Yr · Sec {student.section}
          </p>
        </div>
      </div>

      {/* Academic ID row */}
      <div style={{
        background: "var(--color-bg)", borderRadius: "8px",
        padding: "0.625rem 0.75rem", border: "1px solid var(--color-border)",
        display: "flex", flexDirection: "column", gap: "0.375rem",
      }}
        onClick={(e) => e.stopPropagation()}
      >
        {student.registerNumber && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.5rem" }}>
            <span style={{ fontSize: "0.75rem", color: "var(--color-muted)", fontWeight: 500 }}>Reg No</span>
            <div style={{ display: "flex", alignItems: "center", gap: "0.375rem" }}>
              <span style={{ fontSize: "0.8125rem", fontFamily: "monospace", fontWeight: 700, color: "var(--color-text)" }}>
                {student.registerNumber}
              </span>
              <CopyButton value={student.registerNumber} label="Register number" />
            </div>
          </div>
        )}
        {student.rollNumber && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.5rem" }}>
            <span style={{ fontSize: "0.75rem", color: "var(--color-muted)", fontWeight: 500 }}>Roll No</span>
            <span style={{ fontSize: "0.8125rem", fontFamily: "monospace", fontWeight: 700, color: "var(--color-text)" }}>
              {student.rollNumber}
            </span>
          </div>
        )}
      </div>

      {/* Skills */}
      {student.skills && student.skills.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.25rem" }}>
          {student.skills.slice(0, 4).map((sk) => (
            <span key={sk} style={{
              fontSize: "11px", fontWeight: 600,
              background: "var(--blue-50)", color: "var(--blue-700)",
              padding: "2px 8px", borderRadius: "999px",
            }}>{sk}</span>
          ))}
          {student.skills.length > 4 && (
            <span style={{ fontSize: "11px", color: "var(--color-muted)", fontWeight: 500, padding: "2px 4px" }}>
              +{student.skills.length - 4} more
            </span>
          )}
        </div>
      )}

      {/* Footer */}
      <div style={{ borderTop: "1px solid var(--color-border)", paddingTop: "0.625rem", display: "flex", justifyContent: "flex-end" }}
        onClick={(e) => e.stopPropagation()}
      >
        <Link
          href={`/students/${student.uid}`}
          style={{ fontSize: "0.8125rem", fontWeight: 600, color: "var(--color-primary)", textDecoration: "none", display: "flex", alignItems: "center", gap: "4px" }}
          onClick={(e) => e.stopPropagation()}
        >
          Full Profile →
        </Link>
      </div>
    </div>
  );
}

// ── Student Detail Modal ──────────────────────────────────────
function StudentModal({ student, onClose }: { student: User | null; onClose: () => void }) {
  if (!student) return null;

  const meta = [student.department, student.year && `${student.year} Year`, student.section && `Section ${student.section}`].filter(Boolean).join(" · ");

  return (
    <Modal open={!!student} onClose={onClose} size="lg" title={student.name}>
      <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>

        {/* Profile hero */}
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <Avatar name={student.name} photoUrl={student.profilePhoto} size="xl" />
          <div>
            <h2 style={{ fontWeight: 700, fontSize: "1.25rem" }}>{student.name}</h2>
            <p style={{ fontSize: "0.875rem", color: "var(--color-muted)", marginTop: "2px" }}>{meta}</p>
            {student.skills && student.skills.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.25rem", marginTop: "0.5rem" }}>
                {student.skills.slice(0, 5).map((sk) => (
                  <span key={sk} style={{ fontSize: "11px", fontWeight: 600, background: "var(--blue-50)", color: "var(--blue-700)", padding: "2px 8px", borderRadius: "999px" }}>{sk}</span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Academic IDs */}
        <div>
          <p className="mm-profile-section-title">Academic</p>
          <div className="mm-profile-fields">
            <CopyField label="Register Number" value={student.registerNumber} />
            {student.rollNumber && <CopyField label="Roll Number" value={student.rollNumber} />}
            {student.department && <CopyField label="Department" value={`${student.department} · ${student.year} Year · Sec ${student.section}`} />}
          </div>
        </div>

        {/* Contact */}
        <div>
          <p className="mm-profile-section-title">Contact</p>
          <div className="mm-profile-fields">
            <CopyField label="College Email" value={student.email} />
            {student.personalEmail && <CopyField label="Personal Email" value={student.personalEmail} />}
            {student.phone && <CopyField label="Phone" value={student.phone} />}
          </div>
        </div>

        {/* Social links */}
        {(student.github || student.linkedIn || student.portfolio) && (
          <div>
            <p className="mm-profile-section-title">Links</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
              {student.github && (
                <a href={student.github} target="_blank" rel="noreferrer" style={{ fontSize: "0.8125rem", fontWeight: 600, color: "var(--color-text)", background: "var(--color-surface-2)", padding: "5px 12px", borderRadius: "8px", textDecoration: "none", border: "1px solid var(--color-border)" }}>
                  GitHub ↗
                </a>
              )}
              {student.linkedIn && (
                <a href={student.linkedIn} target="_blank" rel="noreferrer" style={{ fontSize: "0.8125rem", fontWeight: 600, color: "#0A66C2", background: "#EFF6FF", padding: "5px 12px", borderRadius: "8px", textDecoration: "none", border: "1px solid #DBEAFE" }}>
                  LinkedIn ↗
                </a>
              )}
              {student.portfolio && (
                <a href={student.portfolio} target="_blank" rel="noreferrer" style={{ fontSize: "0.8125rem", fontWeight: 600, color: "var(--color-success)", background: "var(--color-success-bg)", padding: "5px 12px", borderRadius: "8px", textDecoration: "none", border: "1px solid var(--green-100)" }}>
                  Portfolio ↗
                </a>
              )}
            </div>
          </div>
        )}

        {/* Full profile link */}
        <Link href={`/students/${student.uid}`} onClick={onClose} style={{ display: "block", textAlign: "center", fontWeight: 600, fontSize: "0.875rem", color: "var(--color-primary)", background: "var(--blue-50)", padding: "0.75rem", borderRadius: "10px", textDecoration: "none", border: "1px solid var(--blue-100)", transition: "background 0.15s" }}>
          View Full Profile →
        </Link>
      </div>
    </Modal>
  );
}
