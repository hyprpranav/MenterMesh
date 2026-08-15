"use client";

// ============================================================
// MentorMesh — 7-Step Smart Database Import Wizard (TSV/CSV)
// ============================================================
import React, { useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/Button";
import { Upload, FileSpreadsheet, CheckCircle2, AlertTriangle, ArrowRight, RefreshCw, UserCheck } from "lucide-react";
import { useToast } from "@/components/ui/ToastProvider";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { getStudentByRegisterNumber, enrichStudentProfile } from "@/lib/firebase/firestore";

interface ParsedRow {
  [key: string]: string;
}

export default function ImportWizardPage() {
  return (
    <AppShell>
      <ImportWizardContent />
    </AppShell>
  );
}

function normalizeYear(rawYear?: string): string {
  if (!rawYear) return "III";
  const str = rawYear.toLowerCase().trim();
  if (str.includes("1") || str.includes("i") && !str.includes("v")) return "I";
  if (str.includes("2") || str.includes("ii")) return "II";
  if (str.includes("3") || str.includes("iii")) return "III";
  if (str.includes("4") || str.includes("iv")) return "IV";
  return "III";
}

function ImportWizardContent() {
  const { success, error } = useToast();
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5 | 6 | 7>(1);

  // Raw file & parse state
  const [fileName, setFileName] = useState("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);

  // Field Mappings
  const [mapping, setMapping] = useState<{
    name: string;
    registerNumber: string;
    rollNumber: string;
    collegeEmail: string;
    personalEmail: string;
    alternateEmail: string;
    phone: string;
    dateOfBirth: string;
    aadhaarNumber: string;
    address: string;
    bloodGroup: string;
    department: string;
    year: string;
    section: string;
    linkedIn: string;
    github: string;
    portfolio: string;
  }>({
    name: "",
    registerNumber: "",
    rollNumber: "",
    collegeEmail: "",
    personalEmail: "",
    alternateEmail: "",
    phone: "",
    dateOfBirth: "",
    aadhaarNumber: "",
    address: "",
    bloodGroup: "",
    department: "",
    year: "",
    section: "",
    linkedIn: "",
    github: "",
    portfolio: "",
  });

  // Validation Results
  const [validRecords, setValidRecords] = useState<Record<string, string>[]>([]);
  const [invalidRecords, setInvalidRecords] = useState<{ row: number; reason: string }[]>([]);

  // Execution state
  const [importing, setImporting] = useState(false);
  const [importedCount, setImportedCount] = useState(0);
  const [mergedCount, setMergedCount] = useState(0);

  // Step 1: Smart File Upload Handler (Auto-detect Delimiter: Tab / Comma)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();

    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      const lines = text.split(/\r\n|\n/).filter((l) => l.trim().length > 0);
      if (lines.length < 2) {
        error("File is empty or missing data rows.");
        return;
      }

      // Auto-detect delimiter (tab vs comma vs semicolon)
      const firstLine = lines[0];
      let delimiter = ",";
      if (firstLine.includes("\t")) delimiter = "\t";
      else if (firstLine.includes(";")) delimiter = ";";

      // Parse headers
      const rawHeaders = firstLine.split(delimiter).map((h) => h.trim().replace(/^"|"$/g, ""));
      setHeaders(rawHeaders);

      // Auto-guess mappings
      const autoMap = { ...mapping };
      rawHeaders.forEach((h) => {
        const lower = h.toLowerCase();
        if (lower.includes("name") && !lower.includes("father") && !lower.includes("mother")) autoMap.name = h;
        if (lower.includes("reg") || lower.includes("register")) autoMap.registerNumber = h;
        if (lower.includes("roll")) autoMap.rollNumber = h;
        if (lower.includes("college email") || (lower.includes("email") && !lower.includes("personal"))) autoMap.collegeEmail = h;
        if (lower.includes("personal email")) autoMap.personalEmail = h;
        if (lower.includes("alt") && lower.includes("email")) autoMap.alternateEmail = h;
        if (lower.includes("phone") || lower.includes("mobile") || lower.includes("contact")) autoMap.phone = h;
        if (lower.includes("dob") || lower.includes("birth")) autoMap.dateOfBirth = h;
        if (lower.includes("aadhaar") || lower.includes("aadhar")) autoMap.aadhaarNumber = h;
        if (lower.includes("address")) autoMap.address = h;
        if (lower.includes("blood")) autoMap.bloodGroup = h;
        if (lower.includes("dept") || lower.includes("department")) autoMap.department = h;
        if (lower.includes("year")) autoMap.year = h;
        if (lower.includes("sec") || lower.includes("section")) autoMap.section = h;
        if (lower.includes("linkedin")) autoMap.linkedIn = h;
        if (lower.includes("github")) autoMap.github = h;
        if (lower.includes("portfolio")) autoMap.portfolio = h;
      });
      setMapping(autoMap);

      // Parse data rows
      const rows: ParsedRow[] = [];
      for (let i = 1; i < lines.length; i++) {
        const cells = lines[i].split(delimiter).map((c) => c.trim().replace(/^"|"$/g, ""));
        const rowObj: ParsedRow = {};
        rawHeaders.forEach((h, index) => {
          rowObj[h] = cells[index] || "";
        });
        rows.push(rowObj);
      }

      setParsedRows(rows);
      setStep(2); // Go to Preview
    };

    reader.readAsText(file);
  };

  // Step 4: Validate Data
  const runValidation = () => {
    const valid: Record<string, string>[] = [];
    const invalid: { row: number; reason: string }[] = [];

    parsedRows.forEach((r, idx) => {
      const name = r[mapping.name]?.trim();
      const reg = r[mapping.registerNumber]?.trim()?.toUpperCase();

      // Skip non-student rows (e.g. faculty without reg no)
      if (!reg && (name?.startsWith("Dr.") || name?.startsWith("Prof.") || name?.includes("Faculty"))) {
        invalid.push({ row: idx + 2, reason: `Skipped faculty/staff member: ${name}` });
        return;
      }

      if (!name) {
        invalid.push({ row: idx + 2, reason: "Missing student name" });
        return;
      }

      const collegeEmail = r[mapping.collegeEmail]?.trim() || (reg ? `${reg.toLowerCase()}@mentormesh.edu` : `user_${idx}@mentormesh.edu`);

      valid.push({
        name,
        registerNumber: reg || "",
        rollNumber: r[mapping.rollNumber]?.trim() || "",
        email: collegeEmail,
        collegeEmail,
        personalEmail: r[mapping.personalEmail]?.trim() || "",
        alternateEmail: r[mapping.alternateEmail]?.trim() || "",
        phone: r[mapping.phone]?.trim() || "",
        dateOfBirth: r[mapping.dateOfBirth]?.trim() || "",
        aadhaarNumber: r[mapping.aadhaarNumber]?.trim() || "",
        address: r[mapping.address]?.trim() || "",
        bloodGroup: r[mapping.bloodGroup]?.trim() || "",
        department: r[mapping.department]?.trim() || "ECE",
        year: normalizeYear(r[mapping.year]?.trim()),
        section: r[mapping.section]?.trim() || "A",
        linkedIn: r[mapping.linkedIn]?.trim() || "",
        github: r[mapping.github]?.trim() || "",
        portfolio: r[mapping.portfolio]?.trim() || "",
      });
    });

    setValidRecords(valid);
    setInvalidRecords(invalid);
    setStep(5); // Show report
  };

  // Step 7: Execute Bulk Import & Merge
  const handleExecuteImport = async () => {
    setImporting(true);
    let created = 0;
    let merged = 0;

    try {
      for (const rec of validRecords) {
        // Check if student already exists by register number
        let existingStudent = null;
        if (rec.registerNumber) {
          existingStudent = await getStudentByRegisterNumber(rec.registerNumber);
        }

        if (existingStudent) {
          // Merge / enrich existing profile without overwriting non-empty values
          await enrichStudentProfile(existingStudent.uid, {
            name: rec.name || existingStudent.name,
            rollNumber: rec.rollNumber || existingStudent.rollNumber,
            personalEmail: rec.personalEmail || existingStudent.personalEmail,
            alternateEmail: rec.alternateEmail || existingStudent.alternateEmail,
            phone: rec.phone || existingStudent.phone,
            dateOfBirth: rec.dateOfBirth || existingStudent.dateOfBirth,
            aadhaarNumber: rec.aadhaarNumber || existingStudent.aadhaarNumber,
            address: rec.address || existingStudent.address,
            bloodGroup: rec.bloodGroup || existingStudent.bloodGroup,
            department: rec.department || existingStudent.department,
            year: rec.year || existingStudent.year,
            section: rec.section || existingStudent.section,
            linkedIn: rec.linkedIn || existingStudent.linkedIn,
            github: rec.github || existingStudent.github,
            portfolio: rec.portfolio || existingStudent.portfolio,
          });
          merged++;
        } else {
          // Create new imported student record
          const uid = `imported_${rec.registerNumber || Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
          await setDoc(doc(db, "users", uid), {
            uid,
            name: rec.name,
            email: rec.collegeEmail,
            collegeEmail: rec.collegeEmail,
            personalEmail: rec.personalEmail,
            alternateEmail: rec.alternateEmail,
            registerNumber: rec.registerNumber,
            rollNumber: rec.rollNumber,
            department: rec.department,
            year: rec.year,
            section: rec.section,
            phone: rec.phone,
            dateOfBirth: rec.dateOfBirth,
            aadhaarNumber: rec.aadhaarNumber,
            address: rec.address,
            bloodGroup: rec.bloodGroup,
            linkedIn: rec.linkedIn,
            github: rec.github,
            portfolio: rec.portfolio,
            role: "student",
            status: "imported",
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
          created++;
        }
      }

      setImportedCount(created);
      setMergedCount(merged);
      setStep(7);
      success(`Import finished! Created ${created} new, merged ${merged} existing records.`);
    } catch (err) {
      console.error("Import error:", err);
      error("Error occurred during import.");
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Step Indicator */}
      <div className="mm-step-indicator">
        {[
          "1. Upload", "2. Preview", "3. Map Columns", "4. Validate", "5. Report", "6. Confirm", "7. Done"
        ].map((lbl, idx) => (
          <span
            key={lbl}
            className={`font-bold ${
              step === idx + 1 ? "text-blue-600 underline" : step > idx + 1 ? "text-emerald-600" : "text-slate-400"
            }`}
          >
            {lbl}
          </span>
        ))}
      </div>

      {/* Step 1: Upload File */}
      {step === 1 && (
        <div className="mm-card text-center py-12 space-y-4">
          <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mx-auto">
            <Upload size={32} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">Upload Student Database File</h2>
            <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
              Supports CSV, TSV (tab-separated), or text files exported from Excel/ERP systems.
            </p>
          </div>

          <div className="pt-4">
            <label className="inline-flex items-center gap-2 cursor-pointer bg-blue-600 text-white font-semibold text-sm px-6 py-2.5 rounded-lg shadow-sm hover:bg-blue-700 transition-colors">
              <FileSpreadsheet size={18} /> Choose File (.csv, .tsv, .txt)
              <input type="file" accept=".csv,.tsv,.txt" className="hidden" onChange={handleFileUpload} />
            </label>
          </div>
        </div>
      )}

      {/* Step 2: Preview Content */}
      {step === 2 && (
        <div className="mm-card space-y-4">
          <h2 className="font-bold text-slate-900 text-lg">Step 2: Preview File ({fileName})</h2>
          <p className="text-xs text-slate-500">Detected {parsedRows.length} rows and {headers.length} columns.</p>

          <div className="mm-table-wrap max-h-60 overflow-y-auto">
            <table className="mm-table">
              <thead>
                <tr>{headers.map((h) => <th key={h}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {parsedRows.slice(0, 5).map((r, i) => (
                  <tr key={i}>{headers.map((h) => <td key={h}>{r[h]}</td>)}</tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setStep(1)}>Back</Button>
            <Button variant="primary" icon={<ArrowRight size={16} />} onClick={() => setStep(3)}>Continue to Mapping</Button>
          </div>
        </div>
      )}

      {/* Step 3: Map Columns */}
      {step === 3 && (
        <div className="mm-card space-y-4">
          <h2 className="font-bold text-slate-900 text-lg">Step 3: Map Columns to Database Fields</h2>
          <p className="text-xs text-slate-500">Match the columns from your file to the corresponding MentorMesh student fields.</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
            {[
              { field: "name", label: "Student Name", req: true },
              { field: "registerNumber", label: "Register Number", req: true },
              { field: "rollNumber", label: "Roll Number", req: false },
              { field: "collegeEmail", label: "College Email", req: false },
              { field: "personalEmail", label: "Personal Email", req: false },
              { field: "phone", label: "Phone Number", req: false },
              { field: "department", label: "Department", req: false },
              { field: "year", label: "Year", req: false },
              { field: "section", label: "Section", req: false },
              { field: "dateOfBirth", label: "Date of Birth", req: false },
              { field: "aadhaarNumber", label: "Aadhaar Number", req: false },
              { field: "bloodGroup", label: "Blood Group", req: false },
              { field: "address", label: "Address", req: false },
              { field: "linkedIn", label: "LinkedIn URL", req: false },
              { field: "github", label: "GitHub URL", req: false },
            ].map(({ field, label, req }) => (
              <div key={field} className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                <label className="mm-label text-xs mb-1">{label} {req && <span className="required">*</span>}</label>
                <select
                  className="mm-input mm-select text-xs py-1 px-2"
                  value={mapping[field as keyof typeof mapping]}
                  onChange={(e) => setMapping({ ...mapping, [field]: e.target.value })}
                >
                  <option value="">-- Ignore --</option>
                  {headers.map((h) => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="secondary" onClick={() => setStep(2)}>Back</Button>
            <Button variant="primary" onClick={runValidation}>Validate Records →</Button>
          </div>
        </div>
      )}

      {/* Step 5: Validation Report */}
      {step === 5 && (
        <div className="mm-card space-y-4">
          <h2 className="font-bold text-slate-900 text-lg">Step 5: Validation & Merge Report</h2>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-center">
              <CheckCircle2 size={28} className="text-emerald-600 mx-auto mb-1" />
              <p className="font-bold text-emerald-900 text-lg">{validRecords.length}</p>
              <p className="text-xs text-emerald-700 font-medium">Valid Student Records</p>
            </div>
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-center">
              <AlertTriangle size={28} className="text-amber-600 mx-auto mb-1" />
              <p className="font-bold text-amber-900 text-lg">{invalidRecords.length}</p>
              <p className="text-xs text-amber-700 font-medium">Skipped Rows (Faculty/Empty)</p>
            </div>
          </div>

          {invalidRecords.length > 0 && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 max-h-40 overflow-y-auto text-xs space-y-1">
              <p className="font-bold text-slate-700 mb-1">Skipped / Flagged Rows:</p>
              {invalidRecords.map((inv, i) => (
                <p key={i} className="text-slate-500">Row {inv.row}: {inv.reason}</p>
              ))}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setStep(3)}>Back to Mapping</Button>
            <Button variant="primary" onClick={() => setStep(6)}>Confirm Import →</Button>
          </div>
        </div>
      )}

      {/* Step 6: Confirmation */}
      {step === 6 && (
        <div className="mm-card space-y-4 text-center py-6">
          <h2 className="text-xl font-bold text-slate-900">Step 6: Confirm Import</h2>
          <p className="text-sm text-slate-600 max-w-md mx-auto">
            Ready to import <strong className="text-slate-900">{validRecords.length} student records</strong>.
            Existing students with matching register numbers will be automatically merged.
          </p>

          <div className="flex justify-center gap-3 pt-4">
            <Button variant="secondary" onClick={() => setStep(5)}>Cancel</Button>
            <Button variant="primary" loading={importing} onClick={handleExecuteImport}>
              Execute Import Now
            </Button>
          </div>
        </div>
      )}

      {/* Step 7: Done */}
      {step === 7 && (
        <div className="mm-card space-y-4 text-center py-8">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 size={36} />
          </div>
          <h2 className="text-2xl font-bold text-slate-900">Import Finished! 🎉</h2>
          <p className="text-slate-600 text-sm">
            Created <strong className="text-slate-900">{importedCount} new students</strong> and merged <strong className="text-slate-900">{mergedCount} existing profiles</strong>.
          </p>

          <div className="pt-4">
            <Button variant="primary" onClick={() => setStep(1)}>Import Another File</Button>
          </div>
        </div>
      )}
    </div>
  );
}
