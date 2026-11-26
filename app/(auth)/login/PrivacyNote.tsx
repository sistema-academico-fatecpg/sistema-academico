import Link from "next/link";

/** 11.1.5: aviso de privacidade e contato do DPO na tela de login. */
export function PrivacyNote({ email }: { email: string }) {
  return (
    <p className="border-t border-zinc-200 pt-4 text-xs leading-5 text-zinc-500">
      Ao entrar, você declara ciência do{" "}
      <Link className="underline" href="/privacidade">
        Aviso de Privacidade
      </Link>
      . Encarregado de Dados:{" "}
      <a className="underline" href={`mailto:${email}`}>
        {email}
      </a>
      .
    </p>
  );
}
