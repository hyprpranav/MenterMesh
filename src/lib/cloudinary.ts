// ============================================================
// MentorMesh — Cloudinary API Integration
// ============================================================

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

/**
 * Uploads a given File object to Cloudinary using unsigned upload.
 * Returns the secure URL of the uploaded image.
 */
export function validateUploadFile(
    file: File,
    kind: "image" | "document",
): void {
    const maxSize = kind === "image" ? 5 * 1024 * 1024 : 10 * 1024 * 1024;
    const allowedExtensions = kind === "image"
        ? ["jpg", "jpeg", "png", "webp", "gif"]
        : ["pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "txt", "csv"];
    const extension = file.name.split(".").pop()?.toLowerCase() || "";
    const validMime = kind === "image" ? file.type.startsWith("image/") : (
        file.type === "application/pdf" ||
        file.type.startsWith("text/") ||
        file.type.includes("document") ||
        file.type.includes("spreadsheet") ||
        file.type.includes("presentation")
    );

    if (file.size > maxSize) {
        throw new Error(kind === "image" ? "Image size must be 5 MB or less." : "Document size must be 10 MB or less.");
    }
    if (!validMime || !allowedExtensions.includes(extension)) {
        throw new Error(kind === "image" ? "Please select a valid image file." : "Please select a valid document file.");
    }
}

export async function uploadToCloudinary(file: File, resourceType: "image" | "raw" = "image"): Promise<string> {
    if (!CLOUD_NAME || !UPLOAD_PRESET) {
        throw new Error("Cloudinary environment variables are missing.");
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", UPLOAD_PRESET);

    try {
        const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/${resourceType}/upload`, {
            method: "POST",
            body: formData,
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || "Failed to upload to Cloudinary");
        }

        const data = await response.json();
        return data.secure_url;
    } catch (err: any) {
        console.error("Cloudinary Upload Error:", err);
        throw new Error(err.message || "Failed to upload image. Please check your connection.");
    }
}
