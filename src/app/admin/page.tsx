import type { Metadata } from "next";
import { AdminDashboard } from "./AdminDashboard";

export const metadata: Metadata = { title: "Panel general" };

export default function AdminPage() {
  return <AdminDashboard />;
}
