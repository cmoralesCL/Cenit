'use client';

import { useEffect } from 'react';
import { Button } from "@/components/ui/button";

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error('Page-level Error caught:', error);
    }, [error]);

    return (
        <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4 p-6">
            <h2 className="text-xl font-semibold">Algo no funcionó correctamente</h2>
            <p className="text-muted-foreground text-sm max-w-sm text-center">
                Ocurrió un error inesperado al cargar esta sección.
            </p>
            <div className="flex gap-4">
                <Button onClick={() => reset()} variant="default">
                    Intentar de nuevo
                </Button>
                <Button onClick={() => window.location.href = '/day'} variant="outline">
                    Volver a Hoy
                </Button>
            </div>
        </div>
    );
}
