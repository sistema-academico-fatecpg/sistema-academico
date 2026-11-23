"use client";

import { useSearchParams } from "next/navigation";
import { RegisterForm } from "@/components/auth/RegisterForm";

export default function RegisterPage() {
  const searchParams = useSearchParams();
  const registered = searchParams.get("registered") === "true";

  if (registered) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50">
        <div className="w-full max-w-md">
          <div className="bg-background p-6 rounded-lg shadow-sm border text-center">
            <h1 className="text-2xl font-bold mb-4">Cadastro realizado!</h1>
            <p className="text-muted-foreground mb-6">
              Um email de ativação foi enviado. Verifique sua caixa de entrada e clique no link para
              definir sua senha.
            </p>
            <a href="/auth/login" className="text-primary underline-offset-4 hover:underline">
              Ir para o login
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50">
      <div className="w-full max-w-md">
        <div className="mx-auto mt-10">
          <h1 className="text-2xl font-bold text-center mb-8">Cadastro de Usuário</h1>
          <p className="text-center text-muted-foreground mb-8">
            Preencha seus dados para criar uma conta
          </p>
        </div>

        <div className="bg-background p-6 rounded-lg shadow-sm border">
          <RegisterForm />
        </div>

        <div className="mx-auto mt-8 text-center">
          <p className="text-sm text-muted-foreground">
            Já tem uma conta?{" "}
            <a href="/auth/login" className="font-medium">
              Faça login
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
