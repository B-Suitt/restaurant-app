"use client";

import { useState } from "react";
import { errorMessage } from "@/lib/rpc-errors";

type RpcError = { message?: string };

/** Acción de una tarjeta o fila: marca "ocupado", guarda el error y recarga la vista al terminar. */
export function useRowAction(onDone: () => void, toMessage: (error: RpcError) => string = errorMessage) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(rpc: () => PromiseLike<{ error: RpcError | null }>) {
    setBusy(true);
    const { error: rpcError } = await rpc();
    setBusy(false);
    setError(rpcError ? toMessage(rpcError) : null);
    onDone();
  }

  return { busy, error, run };
}
