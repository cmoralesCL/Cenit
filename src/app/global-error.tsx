'use client'; // Error boundaries must be Client Components

import { useEffect } from 'react';

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        // Log the error using a server action (invoked indirectly via console for now or specialized logger)
        console.error('Global Error caught:', error);
    }, [error]);

    return (
        <html>
            <body className="flex min-h-screen flex-col items-center justify-center p-4 bg-background text-foreground">
                <div className="max-w-md text-center space-y-4">
                    <h2 className="text-2xl font-bold text-destructive">¡Ups! Algo salió mal.</h2>
                    <p className="text-muted-foreground">
                        Hemos registrado este error. Por favor, intenta recargar la página.
                    </p>
                    {error.digest && (
                        <code className="block p-2 bg-muted rounded text-xs font-mono">
                            Digest: {error.digest}
                        </code>
                    )}
                    <button
                        onClick={() => reset()}
                        className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors"
                    >
                        Intentar de nuevo
                    </button>
                </div>
            </body>
        </html>
    );
}
