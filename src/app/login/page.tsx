'use client';

import { login, signup, loginAsGuest } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { Separator } from "@/components/ui/separator";
import * as React from 'react';

function LoginClient() {
  const searchParams = useSearchParams();
  const message = searchParams.get("message");

  return (
    <Card className="w-full max-w-sm mx-auto">
        <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
                <Image src="/logo.png" alt="Cenit Logo" width={64} height={64} />
            </div>
            <CardTitle className="text-2xl font-headline">Cenit</CardTitle>
            <CardDescription>
                Inicia sesión o regístrate para empezar a construir tu ecosistema.
            </CardDescription>
        </CardHeader>
        <CardContent>
            <Tabs defaultValue="login" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="login">Iniciar Sesión</TabsTrigger>
                    <TabsTrigger value="signup">Registrarse</TabsTrigger>
                </TabsList>
                <TabsContent value="login">
                    <form className="space-y-4 pt-4">
                        <div className="grid gap-2">
                            <Label htmlFor="email">Correo Electrónico</Label>
                            <Input id="email" name="email" type="email" placeholder="tu@email.com" required />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="password">Contraseña</Label>
                            <Input id="password" name="password" type="password" required />
                        </div>
                        <Button formAction={login} className="w-full">Iniciar Sesión</Button>
                    </form>
                </TabsContent>
                <TabsContent value="signup">
                    <form className="space-y-4 pt-4">
                        <div className="grid gap-2">
                            <Label htmlFor="email-signup">Correo Electrónico</Label>
                            <Input id="email-signup" name="email" type="email" placeholder="tu@email.com" required />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="password-signup">Contraseña</Label>
                            <Input id="password-signup" name="password" type="password" required />
                        </div>
                         <Button formAction={signup} className="w-full">Registrarse</Button>
                    </form>
                </TabsContent>
            </Tabs>
            
            <Separator className="my-6" />

            <form>
              <Button formAction={loginAsGuest} variant="outline" className="w-full">Ingresar como Invitado</Button>
            </form>

            {message && (
                <p className="mt-4 p-4 bg-foreground/10 text-foreground text-center rounded">
                    {message}
                </p>
            )}
        </CardContent>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <main className="flex-grow flex items-center justify-center p-4">
        <React.Suspense fallback={<div>Loading...</div>}>
          <LoginClient />
        </React.Suspense>
      </main>
    </div>
  );
}
