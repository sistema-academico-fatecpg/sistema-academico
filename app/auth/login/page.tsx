"use client";

import { LoginForm } from "@/components/auth/LoginForm";

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50">
      <div className="w-full max-w-md">
        <div className="mx-auto mt-10">
          <h1 className="text-2xl font-bold text-center mb-8">Sistema Acadêmico</h1>
          <p className="text-center text-muted-foreground mb-8">
            Faça login para acessar o sistema
          </p>
        </div>

        <div className="bg-background p-6 rounded-lg shadow-sm border">
          <LoginForm />
        </div>

        <div className="mx-auto mt-8 text-center">
          <p className="text-sm text-muted-foreground">
            Não tem uma conta?{" "}
            <a href="/auth/register" className="font-medium">
              Cadastre-se
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
