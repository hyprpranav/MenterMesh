"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { useAuth } from "@/contexts/AuthContext";
import { createFileShare, getActiveStudents, getFileSharesForViewer } from "@/lib/firebase/firestore";
import { db, storage } from "@/lib/firebase/config";
import type { FileShare, User } from "@/types";
import { collection, doc } from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { LoadingState, EmptyState } from "@/components/ui/States";
import { useToast } from "@/components/ui/ToastProvider";
import { Download, FileText, Search, Send, UploadCloud, Users } from "lucide-react";
import { formatDateTime } from "@/lib/utils";
import { validateUploadFile } from "@/lib/cloudinary";

export default function FileSharePage() {
  return <AppShell><FileShareContent /></AppShell>;
}

function FileShareContent() {
  const { user } = useAuth();
  const { success, error } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [students, setStudents] = useState<User[]>([]);
  const [history, setHistory] = useState<FileShare[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const isStaff = user?.role === "staff" || user?.role === "master";

  useEffect(() => {
    if (!user) return;
    const viewer = user;
    async function load() {
      try {
        const [studentList, shares] = await Promise.all([viewer.role === "staff" || viewer.role === "master" ? getActiveStudents() : Promise.resolve([]), getFileSharesForViewer(viewer)]);
        setStudents(studentList);
        setHistory(shares);
      } catch (loadError) {
        console.error(loadError);
        error("Unable to load file sharing data.");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [user, error]);

  const visibleStudents = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return students;
    return students.filter((student) => [student.name, student.registerNumber, student.department, student.year, student.section]
      .filter(Boolean).some((value) => value!.toLowerCase().includes(query)));
  }, [search, students]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;
    try {
      validateUploadFile(selectedFile, "document");
      setFile(selectedFile);
    } catch (fileError) {
      error(fileError instanceof Error ? fileError.message : "Invalid file.");
      event.target.value = "";
    }
  };

  const toggleStudent = (uid: string) => {
    setSelectedIds((current) => current.includes(uid) ? current.filter((id) => id !== uid) : [...current, uid]);
  };

  const sendFile = async () => {
    if (!user || !isStaff || !file || selectedIds.length === 0) return;
    setSending(true);
    const fileId = doc(collection(db, "fileShares")).id;
    try {
      const storageRef = ref(storage, `sharedFiles/${user.uid}/${fileId}/${file.name}`);
      const uploaded = await uploadBytes(storageRef, file, { contentType: file.type });
      const url = await getDownloadURL(uploaded.ref);
      const recipients = students.filter((student) => selectedIds.includes(student.uid));
      await createFileShare({
        name: file.name,
        url,
        type: file.type,
        size: file.size,
        senderId: user.uid,
        senderName: user.name,
        recipientIds: recipients.map((student) => student.uid),
        recipientNames: recipients.map((student) => student.name),
        status: "sent",
      }, fileId);
      setHistory((current) => [{
        id: fileId,
        name: file.name,
        url,
        type: file.type,
        size: file.size,
        senderId: user.uid,
        senderName: user.name,
        recipientIds: recipients.map((student) => student.uid),
        recipientNames: recipients.map((student) => student.name),
        status: "sent",
        createdAt: new Date().toISOString(),
      }, ...current]);
      setFile(null);
      setSelectedIds([]);
      if (fileInputRef.current) fileInputRef.current.value = "";
      success("File sent successfully.");
    } catch (sendError) {
      console.error(sendError);
      error("File could not be sent. No success was recorded.");
    } finally {
      setSending(false);
    }
  };

  if (!user) return null;

  return (
    <div className="space-y-6 max-w-5xl mx-auto mm-page-animate">
      <PageHeader icon={<Send size={20} />} iconClass="bg-sky-100 text-sky-600" title="File Share" subtitle={isStaff ? "Send documents directly to selected students." : "Files shared directly with you."} actions={isStaff ? <Button size="sm" icon={<UploadCloud size={15} />} onClick={() => fileInputRef.current?.click()}>Upload File</Button> : undefined} />
      {isStaff && <input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv" hidden onChange={handleFileChange} />}

      {file && (
        <section className="mm-card space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div className="flex min-w-0 items-center gap-3"><FileText className="shrink-0 text-blue-600" size={24} /><div className="min-w-0"><p className="truncate font-bold text-slate-900">{file.name}</p><p className="text-xs text-slate-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p></div></div>
            <Button size="sm" variant="secondary" onClick={() => { setFile(null); setSelectedIds([]); }}>Remove</Button>
          </div>
          <div className="flex items-center justify-between gap-3"><div><h2 className="font-bold text-slate-900">Select recipients</h2><p className="text-xs text-slate-500">Choose one or more students.</p></div><Button size="sm" variant="outline" onClick={() => setSelectedIds(visibleStudents.map((student) => student.uid))}>Select visible</Button></div>
          <div className="mm-search"><Search className="mm-search-icon" size={18} /><input className="mm-search-input" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search students..." /></div>
          <div className="max-h-72 space-y-1 overflow-y-auto">
            {visibleStudents.map((student) => <label key={student.uid} className="flex cursor-pointer items-center gap-3 rounded-lg border border-transparent p-2 hover:border-blue-100 hover:bg-blue-50"><input type="checkbox" checked={selectedIds.includes(student.uid)} onChange={() => toggleStudent(student.uid)} /><Users size={18} className="shrink-0 text-slate-400" /><span className="min-w-0 text-sm"><strong className="block truncate text-slate-900">{student.name}</strong><span className="block truncate text-xs text-slate-500">{student.registerNumber || "No register number"} · {student.department || "—"} · {student.year || "—"} / {student.section || "—"}</span></span></label>)}
          </div>
          <div className="flex justify-end border-t border-slate-100 pt-3"><Button onClick={() => void sendFile()} loading={sending} disabled={selectedIds.length === 0}>Send File ({selectedIds.length})</Button></div>
        </section>
      )}

      <section className="mm-card space-y-4"><div><h2 className="font-bold text-slate-900">{isStaff ? "File Share History" : "Files Shared With Me"}</h2><p className="text-xs text-slate-500">{isStaff ? "Files sent to students remain listed here." : "Only files sent to your account appear here."}</p></div>{loading ? <LoadingState message="Loading file history..." /> : history.length === 0 ? <EmptyState icon={<FileText size={32} />} title="No files shared yet" /> : <div className="space-y-2">{history.map((item) => <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 p-3"><div className="flex min-w-0 items-center gap-3"><FileText className="shrink-0 text-blue-600" size={22} /><div className="min-w-0"><p className="truncate font-semibold text-slate-900">{item.name}</p><p className="text-xs text-slate-500">{isStaff ? `Sent to: ${item.recipientNames.join(", ")}` : `From: ${item.senderName}`}</p><p className="text-[11px] text-slate-400">{formatDateTime(item.createdAt)}</p></div></div><a href={item.url} target="_blank" rel="noreferrer" className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-blue-600"><Download size={15} /> Open</a></div>)}</div>}</section>
    </div>
  );
}
