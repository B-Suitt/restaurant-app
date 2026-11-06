"use client";

import { useState } from "react";
import { BellRing } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { Modal } from "@/components/ui/Modal";

export function ModalDemo() {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <>
      <Button variant="secondary" className="self-start" onClick={() => setOpen(true)}>
        Abrir modal
      </Button>
      <Modal
        open={open}
        onClose={close}
        icon={<BellRing aria-hidden />}
        title="Tu garzón está avisado"
        description="Enviamos tu solicitud a Camila. En un momento se acercará a la mesa 08 para ayudarte."
      >
        <Chip tone="warning" className="self-start">
          Llamando
        </Chip>
        <Button onClick={close}>Entendido</Button>
        <Button variant="secondary" onClick={close}>
          Volver a mis pedidos
        </Button>
      </Modal>
    </>
  );
}
