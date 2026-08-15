import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { ToastProvider } from "@/components/ui/ToastProvider";
import { FirebaseStatusDot } from "@/components/ui/FirebaseStatusDot";

export const metadata: Metadata = {
  title: {
    default: "MentorMesh",
    template: "%s | MentorMesh",
  },
  description:
    "One Mentor. One Community. Every Team. Every Journey. — A centralized platform for mentor-student collaboration.",
  manifest: "/manifest.json",
  icons: {
    icon: "/favicon.ico",
    apple: "/icons/apple-touch-icon.png",
  },
  keywords: ["mentor", "students", "teams", "hackathon", "community", "education"],
};

export const viewport: Viewport = {
  themeColor: "#2563EB",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>
        <AuthProvider>
          <ToastProvider>
            {children}
            <FirebaseStatusDot />
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}

