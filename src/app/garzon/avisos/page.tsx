import type { Metadata } from "next";
import { AlertsInbox } from "./AlertsInbox";

export const metadata: Metadata = { title: "Bandeja de avisos" };

export default function AlertsPage() {
  return <AlertsInbox />;
}
