// ============================================================
// MentorMesh — Reusable Cloudinary Image Upload Component
// ============================================================
import React, { useState } from "react";
import { uploadToCloudinary } from "@/lib/cloudinary";
import { CopyButton } from "@/components/ui/CopyButton";
import { UploadCloud, CheckCircle2, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/ToastProvider";

interface CloudinaryImageUploadProps {
    onUploadSuccess: (url: string) => void;
    label?: string;
    buttonText?: string;
    maxFiles?: number;
    existingUrl?: string | null;
}

export function CloudinaryImageUpload({
    onUploadSuccess,
    label = "Upload Image",
    buttonText = "Select File",
    existingUrl
}: CloudinaryImageUploadProps) {
    const [uploading, setUploading] = useState(false);
    const { success, error } = useToast();

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        try {
            const url = await uploadToCloudinary(file);
            onUploadSuccess(url);
            success("Image uploaded successfully!");
        } catch (err: any) {
            error(err.message || "Failed to upload image");
        } finally {
            setUploading(false);
            // Reset input
            e.target.value = '';
        }
    };

    return (
        <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-slate-700">{label}</label>
            <div className="flex items-center gap-3">
                <label className={`
          flex items-center justify-center gap-2 px-4 py-2 border rounded-lg cursor-pointer
          text-sm font-medium transition-all
          ${uploading ? "bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed" : "bg-white border-blue-200 text-blue-700 hover:bg-blue-50 hover:border-blue-300"}
        `}>
                    {uploading ? <Loader2 size={16} className="animate-spin" /> : <UploadCloud size={16} />}
                    {uploading ? "Uploading..." : buttonText}
                    <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleFileChange}
                        disabled={uploading}
                    />
                </label>

                {existingUrl && !uploading && (
                    <div className="flex items-center gap-2 text-green-600 text-sm font-medium">
                        <CheckCircle2 size={16} /> Attached
                    </div>
                )}
            </div>
            {existingUrl && (
                <div className="mt-2 w-24 h-24 rounded-lg overflow-hidden border border-slate-200 relative group">
                    <img src={existingUrl} alt="Uploaded" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <CopyButton value={existingUrl} label="Copy Link" className="text-white border-white hover:bg-white/20" />
                    </div>
                </div>
            )}
        </div>
    );
}
