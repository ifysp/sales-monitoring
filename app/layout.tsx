import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SWIT Monitoring — Beyond Medical",
  description: "Pencatatan customer, kontrak, dan pembayaran Tricefy & Viewpoint",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="id" className="h-full antialiased">
      <body className="min-h-full bg-slate-50 text-slate-900">{children}</body>
    </html>
  );
}
