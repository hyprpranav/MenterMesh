"use client";

// ============================================================
// MentorMesh — Student Directory & Search
// ============================================================
import React, { useEffect, useState, useMemo, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { Search, X, Users, Copy, Check } from "lucide-react";
import { getActiveStudents } from "@/lib/firebase/firestore";
import type { User } from "@/types";
import { Avatar } from "@/components/ui/Avatar";
import { CopyButton } from "@/components/ui/CopyButton";
import { EmptyState, LoadingState } from "@/components/ui/States";
import { Modal } from "@/components/ui/Modal";
import { normalizeForSearch } from "@/lib/utils";

const DEPARTMENTS = ["All", "ECE", "CSE", "EEE", "MECH", "CIVIL", "IT"];
const YEARS = ["All", "I", "II", "III", "IV"];
const SECTIONS = ["All", "A", "B", "C", "D", "E"];

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
  const initialQuery = searchParams.get("q") || "";

  const [students, setStudents] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState<User | null>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [selectedDept, setSelectedDept] = useState("All");
  const [selectedYear, setSelectedYear] = useState("All");
  const [selectedSec, setSelectedSec] = useState("All");

  useEffect(() => {
    async function load() {
      try {
        const list = await getActiveStudents();
        setStudents(list);
      } catch (err) {
        console.error("Failed to load students:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // Filtered Students
  const filteredStudents = useMemo(() => {
    const q = normalizeForSearch(searchQuery);
    return students.filter((s) => {
      // Dept filter
      if (selectedDept !== "All" && s.department !== selectedDept) return false;
      // Year filter
      if (selectedYear !== "All" && s.year !== selectedYear) return false;
      // Section filter
      if (selectedSec !== "All" && s.section !== selectedSec) return false;

      if (!q) return true;

      // Text search: name, registerNumber, rollNumber, email, personalEmail, phone, skills, dept, year, section
      const nameMatch = normalizeForSearch(s.name || "").includes(q);
      const regMatch = s.registerNumber ? normalizeForSearch(s.registerNumber).includes(q) : false;
      const rollMatch = s.rollNumber ? normalizeForSearch(s.rollNumber).includes(q) : false;
      const emailMatch = s.email ? normalizeForSearch(s.email).includes(q) : false;
      const pEmailMatch = s.personalEmail ? normalizeForSearch(s.personalEmail).includes(q) : false;
      const phoneMatch = s.phone ? normalizeForSearch(s.phone).includes(q) : false;
      const skillMatch = s.skills ? s.skills.some((sk) => normalizeForSearch(sk).includes(q)) : false;

      return nameMatch || regMatch || rollMatch || emailMatch || pEmailMatch || phoneMatch || skillMatch;
    });
  }, [students, searchQuery, selectedDept, selectedYear, selectedSec]);

  const hasActiveFilters = selectedDept !== "All" || selectedYear !== "All" || selectedSec !== "All" || searchQuery.trim().length > 0;

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedDept("All");
    setSelectedYear("All");
    setSelectedSec("All");
  };

  const openStudent = (s: User) => setSelectedStudent(s);
  const closeStudent = () => setSelectedStudent(null);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="mm-page-title">Student Directory</h1>
        <p className="mm-page-subtitle">Search and discover students by name, register number, department, year, or skills.</p>
      </div>

      {/* Prominent Search Bar */}
      <div className="mm-search">
        <Search className="mm-search-icon" size={20} />
        <input
          type="text"
          className="mm-search-input py-3 text-base shadow-sm"
          placeholder="🔍 Search by name, register no (e.g. 23EC104), email, skill..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex flex-wrap items-center gap-3">
          {/* Department Select */}
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 min-w-[92px]">
            <span>Dept:</span>
            <select
              className="mm-input py-1 px-2 text-xs w-auto bg-slate-50"
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
            >
              {DEPARTMENTS.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          {/* Year Select */}
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 min-w-[72px]">
            <span>Year:</span>
            <select
              className="mm-input py-1 px-2 text-xs w-auto bg-slate-50"
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
            >
              {YEARS.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          {/* Section Select */}
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 min-w-[84px]">
            <span>Section:</span>
            <select
              className="mm-input py-1 px-2 text-xs w-auto bg-slate-50"
              value={selectedSec}
              onChange={(e) => setSelectedSec(e.target.value)}
            >
              {SECTIONS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Clear Filters Button */}
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="text-xs text-red-600 hover:underline font-semibold flex items-center gap-1"
          >
            <X size={14} /> Clear all filters
          </button>
        )}
      </div>

      {/* Filter Chips Display */}
      {hasActiveFilters && (
        <div className="flex items-center gap-2 flex-wrap text-xs">
          <span className="text-slate-400 font-medium">Active filters:</span>
          {selectedDept !== "All" && (
            <span className="mm-chip">
              Dept: {selectedDept}
              <button onClick={() => setSelectedDept("All")}><X size={12} /></button>
            </span>
          )}
          {selectedYear !== "All" && (
            <span className="mm-chip">
              Year: {selectedYear}
              <button onClick={() => setSelectedYear("All")}><X size={12} /></button>
            </span>
          )}
          {selectedSec !== "All" && (
            <span className="mm-chip">
              Sec: {selectedSec}
              <button onClick={() => setSelectedSec("All")}><X size={12} /></button>
            </span>
          )}
          {searchQuery && (
            <span className="mm-chip">
              Query: &quot;{searchQuery}&quot;
              <button onClick={() => setSearchQuery("")}><X size={12} /></button>
            </span>
          )}
        </div>
      )}

      {/* Results Count Header */}
      <div className="flex items-center justify-between text-xs text-slate-500 font-medium px-1">
        <span>Showing {filteredStudents.length} of {students.length} students</span>
      </div>

      {/* Results Grid */}
          {loading ? (
        <LoadingState message="Searching student directory..." />
      ) : filteredStudents.length === 0 ? (
        <EmptyState
          icon={<Users size={40} />}
          title="No students found"
          description={
            hasActiveFilters
              ? "No students match your search criteria. Try adjusting your search query or clear filters."
              : "No active students in the directory."
          }
          action={
            hasActiveFilters
              ? { label: "Clear Filters", onClick: clearFilters }
              : undefined
          }
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredStudents.map((s) => (
            <StudentCard key={s.uid} student={s} onOpen={() => openStudent(s)} />
          ))}
        </div>
      )}

      {/* Student Detail Modal */}
      <Modal open={!!selectedStudent} onClose={closeStudent} size="lg" title={selectedStudent?.name || "Student Details"}>
        {selectedStudent ? (
          <div className="space-y-4">
            <div className="flex items-start gap-4">
              <Avatar name={selectedStudent.name} photoUrl={selectedStudent.profilePhoto} size="2xl" />
              <div className="flex-1">
                <h2 className="text-lg font-bold">{selectedStudent.name}</h2>
                <p className="text-xs text-slate-500 mt-1">{[selectedStudent.department, selectedStudent.year && `${selectedStudent.year} Year`, selectedStudent.section && `Section ${selectedStudent.section}`].filter(Boolean).join(" · ")}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Register No:</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono">{selectedStudent.registerNumber || "N/A"}</span>
                    {selectedStudent.registerNumber && <CopyButton text={selectedStudent.registerNumber} label="Register number" />}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-400">College Email:</span>
                  <div className="flex items-center gap-2">
                    <span>{selectedStudent.email || "N/A"}</span>
                    {selectedStudent.email && <CopyButton text={selectedStudent.email} label="College email" />}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Personal Email:</span>
                  <div className="flex items-center gap-2">
                    <span>{selectedStudent.personalEmail || "N/A"}</span>
                    {selectedStudent.personalEmail && <CopyButton text={selectedStudent.personalEmail} label="Personal email" />}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Alternate Email:</span>
                  <div className="flex items-center gap-2">
                    <span>{selectedStudent.alternateEmail || "N/A"}</span>
                    {selectedStudent.alternateEmail && <CopyButton text={selectedStudent.alternateEmail} label="Alternate email" />}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Phone:</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono">{selectedStudent.phone || "N/A"}</span>
                    {selectedStudent.phone && <CopyButton text={selectedStudent.phone} label="Phone number" />}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Date of Birth:</span>
                  <span>{selectedStudent.dateOfBirth || "N/A"}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Blood Group:</span>
                  <span>{selectedStudent.bloodGroup || "N/A"}</span>
                </div>

                <div className="flex items-start justify-between">
                  <span className="text-slate-400">Address:</span>
                  <div className="text-right max-w-[60%]">
                    <span className="block leading-relaxed">{selectedStudent.address || "N/A"}</span>
                    {selectedStudent.address && <CopyButton text={selectedStudent.address} label="Address" />}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {selectedStudent.github && (
                <a href={selectedStudent.github} target="_blank" rel="noreferrer" className="text-slate-700 text-xs hover:underline">GitHub</a>
              )}
              {selectedStudent.linkedIn && (
                <a href={selectedStudent.linkedIn} target="_blank" rel="noreferrer" className="text-blue-600 text-xs hover:underline">LinkedIn</a>
              )}
              {selectedStudent.portfolio && (
                <a href={selectedStudent.portfolio} target="_blank" rel="noreferrer" className="text-emerald-600 text-xs hover:underline">Portfolio</a>
              )}
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// STUDENT RESULT CARD
// ────────────────────────────────────────────────────────────
function StudentCard({ student, onOpen }: { student: User; onOpen?: () => void }) {
  const handleOpen = () => onOpen && onOpen();
  
  return (
    <div className="mm-card hover:border-blue-300 transition-all flex flex-col justify-between space-y-4">
      <div className="space-y-3">
        {/* Top Profile Summary */}
        <div className="flex items-start gap-3">
          <button onClick={handleOpen} className="p-0 border-0 bg-transparent rounded-md hover:opacity-90">
            <Avatar name={student.name} photoUrl={student.profilePhoto} size="lg" />
          </button>
          <div className="flex-1 min-w-0">
            <button onClick={handleOpen} className="font-bold text-slate-900 text-base hover:text-blue-600 truncate block text-left">
              {student.name}
            </button>
            <p className="text-xs text-slate-500 font-medium">
              {student.department} • {student.year} Year • Sec {student.section}
            </p>
          </div>
        </div>

        {/* Copyable Academic Details */}
        <div className="bg-slate-50 rounded-lg p-2.5 border border-slate-100 text-xs space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Reg No:</span>
            <div className="flex items-center gap-1 font-mono font-semibold text-slate-800">
              <span>{student.registerNumber || "N/A"}</span>
              {student.registerNumber && <CopyButton text={student.registerNumber} label="Register number" />}
            </div>
          </div>
          {student.rollNumber && (
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Roll No:</span>
              <span className="font-mono font-semibold text-slate-800">{student.rollNumber}</span>
            </div>
          )}
        </div>

        {/* Skills Chips Preview */}
        {student.skills && student.skills.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {student.skills.slice(0, 3).map((sk) => (
              <span key={sk} className="text-[11px] bg-blue-50 text-blue-700 font-medium px-2 py-0.5 rounded-full">
                {sk}
              </span>
            ))}
            {student.skills.length > 3 && (
              <span className="text-[10px] text-slate-400 font-medium py-0.5">
                +{student.skills.length - 3} more
              </span>
            )}
          </div>
        )}
      </div>

      {/* Footer Link */}
      <div className="pt-2 border-t border-slate-100 flex justify-end">
        <Link
          href={`/students/${student.uid}`}
          className="text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline"
        >
          View Full Profile →
        </Link>
      </div>
    </div>
  );
}
