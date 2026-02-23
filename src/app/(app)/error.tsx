"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[APP ERROR]", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
      <div className="text-center space-y-2">
        <h2 className="text-xl font-bold text-text-primary">
          Algo correu mal
        </h2>
        <p className="text-sm text-text-muted max-w-md">
          Ocorreu um erro inesperado. Tente atualizar a página ou voltar atrás.
        </p>
        {process.env.NODE_ENV !== "production" && (
          <pre className="mt-4 p-3 rounded-lg bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 text-xs text-left max-w-lg overflow-auto">
            {error.message}
          </pre>
        )}
        {error.digest && (
          <p className="text-xs text-text-muted mt-2">
            Código de erro: {error.digest}
          </p>
        )}
      </div>
      <div className="flex gap-3">
        <Button onClick={reset}>Tentar novamente</Button>
        <Button variant="secondary" onClick={() => window.history.back()}>
          Voltar
        </Button>
      </div>
    </div>
  );
}
