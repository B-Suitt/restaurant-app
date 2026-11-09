"use client";

import QRCode from "qrcode";
import { useEffect, useState } from "react";
import { Download, Printer, RefreshCw } from "lucide-react";
import { AdminPageTitle, AdminTopBar } from "@/components/layout/AdminTopBar";
import { BrandMark } from "@/components/layout/BrandMark";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { LinkNotice } from "@/components/ui/LinkNotice";
import { Field, Input, Select } from "@/components/ui/Field";
import { InfoNote } from "@/components/ui/InfoNote";
import { tableLabel } from "@/lib/order-format";
import { RESTAURANT_NAME } from "@/lib/restaurant";
import { createClient } from "@/lib/supabase/client";
import { FormSkeleton } from "@/components/ui/Skeleton";
import { Modal } from "@/components/ui/Modal";
import { dbErrorMessage } from "@/lib/rpc-errors";

type Table = { number: number; zone: string; qr_token: string; active: boolean };
type Format = "png" | "svg";

/** Dirección que abre el QR: la carta de la mesa en este mismo sitio. `scan` distingue un escaneo de una recarga. */
const qrUrl = (token: string) => `${window.location.origin}/m/${encodeURIComponent(token)}?scan=1`;

// Frame "Administrador · Código QR de la mesa"
export function TableQr({ tableId }: { tableId: string }) {
  const [table, setTable] = useState<Table | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [format, setFormat] = useState<Format>("png");
  const [confirmRegenerate, setConfirmRegenerate] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [regenerateError, setRegenerateError] = useState<string | null>(null);

  /** Cambia el token: el QR impreso deja de abrir la carta y hay que imprimir el nuevo. */
  async function regenerate() {
    setRegenerating(true);
    setRegenerateError(null);
    const token = crypto.randomUUID().replaceAll("-", "");
    const { data, error } = await createClient()
      .from("tables")
      .update({ qr_token: token })
      .eq("id", tableId)
      .select("number, zone, qr_token, active")
      .single();
    setRegenerating(false);
    if (error) return setRegenerateError(dbErrorMessage(error));
    setTable(data);
    setPreview(await QRCode.toDataURL(qrUrl(data.qr_token), { width: 480, margin: 0, errorCorrectionLevel: "M" }));
    setConfirmRegenerate(false);
  }

  useEffect(() => {
    createClient()
      .from("tables")
      .select("number, zone, qr_token, active")
      .eq("id", tableId)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) return setNotFound(true);
        setTable(data);
        QRCode.toDataURL(qrUrl(data.qr_token), { width: 480, margin: 0, errorCorrectionLevel: "M" }).then(setPreview);
      });
  }, [tableId]);

  async function download() {
    if (!table) return;
    const url = qrUrl(table.qr_token);
    const name = `qr-${tableLabel(table.number).toLowerCase().replace(" ", "-")}`;
    const href =
      format === "png"
        ? await QRCode.toDataURL(url, { width: 2048, margin: 2, errorCorrectionLevel: "M" })
        : URL.createObjectURL(
            new Blob([await QRCode.toString(url, { type: "svg", margin: 2, errorCorrectionLevel: "M" })], {
              type: "image/svg+xml",
            }),
          );
    const a = document.createElement("a");
    a.href = href;
    a.download = `${name}.${format}`;
    a.click();
    if (format === "svg") URL.revokeObjectURL(href);
  }

  const label = table ? tableLabel(table.number) : "Mesa";

  return (
    <>
      <AdminTopBar
        crumbs={[
          { label: "Mesas y QR", href: "/admin/mesas" },
          { label, href: `/admin/mesas/${tableId}` },
          { label: "Código QR" },
        ]}
      />
      <main className="flex flex-col gap-6 px-9 py-10 print:p-0">
        <div className="print:hidden">
          <AdminPageTitle title={`Código QR · ${label}`} subtitle={`Mesas y QR / ${label} / Código QR`} />
        </div>

        {notFound ? (
          <LinkNotice text="No encontramos esa mesa." href="/admin/mesas" linkLabel="Volver a las mesas" />
        ) : !table ? (
          <FormSkeleton label="Cargando código…" />
        ) : (
          <div className="grid grid-cols-[1fr_488px] items-start gap-8 print:block">
            {/* Lo único que se imprime. */}
            <Card className="flex flex-col items-center gap-6 px-10 py-10 text-center print:border-0">
              <BrandMark />
              <p className="text-[36px] leading-[1.2]">Tu mesa. Tu menú.</p>
              <p className="text-lg text-muted">Escanea, elige y disfruta.</p>
              <div className="rounded-lg border border-border p-5">
                {preview ? (
                  // eslint-disable-next-line @next/next/no-img-element -- imagen generada en el navegador
                  <img src={preview} alt={`Código QR de la ${label.toLowerCase()}`} className="size-60" />
                ) : (
                  <div className="size-60 animate-pulse rounded-sm bg-surface-muted" />
                )}
              </div>
              <p className="text-[30px] leading-[1.2]">{label}</p>
              <p className="text-base text-muted">
                {table.zone} · {RESTAURANT_NAME}
              </p>
              {!table.active && (
                <p className="text-sm text-primary print:hidden">Mesa inactiva: el QR muestra una pantalla de error.</p>
              )}
            </Card>

            <div className="flex flex-col gap-6 print:hidden">
              <Card className="flex flex-col gap-4 p-6">
                <div className="flex flex-col gap-2">
                  <h2 className="text-xl font-bold">Listo para tu mesa</h2>
                  <p className="text-base text-muted">
                    Coloca este código donde tus clientes puedan verlo y escanearlo fácilmente.
                  </p>
                </div>
                <Field label="Mesa vinculada">
                  <Input value={`${label} · ${table.zone}`} readOnly />
                </Field>
                <Field label="Formato de descarga">
                  <Select value={format} onChange={(e) => setFormat(e.target.value as Format)}>
                    <option value="png">PNG · Alta resolución</option>
                    <option value="svg">SVG · Vectorial</option>
                  </Select>
                </Field>
                <Button onClick={download}>
                  <Download className="size-5" aria-hidden /> Descargar QR
                </Button>
                <Button variant="secondary" onClick={() => window.print()}>
                  <Printer className="size-5" aria-hidden /> Imprimir QR
                </Button>
              </Card>
              <InfoNote plain title="Recomendación de impresión">
                Usa un tamaño mínimo de 6 × 6 cm, papel mate y buen contraste. Evita dobleces o reflejos sobre el código.
              </InfoNote>
              <button
                type="button"
                onClick={() => setConfirmRegenerate(true)}
                className="flex w-fit cursor-pointer items-center gap-1.5 px-4 text-sm text-primary hover:underline"
              >
                <RefreshCw className="size-4" aria-hidden /> Generar un QR nuevo
              </button>
            </div>
          </div>
        )}

        {/* Por si el QR impreso se dañó, se copió o se usa desde fuera del local. */}
        <Modal
          open={confirmRegenerate}
          onClose={() => setConfirmRegenerate(false)}
          icon={<RefreshCw aria-hidden />}
          title="¿Generar un QR nuevo?"
          description="El código impreso actual dejará de abrir la carta. Tendrás que imprimir y reemplazar el de la mesa. Quienes ya están sentados siguen en su estadía."
        >
          {regenerateError && <p className="text-sm text-primary">{regenerateError}</p>}
          <Button onClick={regenerate} loading={regenerating}>
            Generar QR nuevo
          </Button>
          <Button variant="secondary" onClick={() => setConfirmRegenerate(false)}>
            Cancelar
          </Button>
        </Modal>
      </main>
    </>
  );
}
