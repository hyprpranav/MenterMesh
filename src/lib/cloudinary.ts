// ============================================================
// MentorMesh — Cloudinary API Integration
// ============================================================

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

/**
 * Uploads a given File object to Cloudinary using unsigned upload.
 * Returns the secure URL of the uploaded image.
 */
export async function uploadToCloudinary(file: File): Promise<string> {
    if (!CLOUD_NAME || !UPLOAD_PRESET) {
        throw new Error("Cloudinary environment variables are missing.");
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", UPLOAD_PRESET);

    try {
        const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
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
