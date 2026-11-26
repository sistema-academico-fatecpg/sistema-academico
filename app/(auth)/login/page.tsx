import { LoginForm } from "./LoginForm";

export default function LoginPage() {
  const dpoEmail = process.env.DPO_EMAIL?.trim() || "dpo@academico.com";
  return <LoginForm dpoEmail={dpoEmail} />;
}
