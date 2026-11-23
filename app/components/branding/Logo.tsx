import Image from "next/image";
import Link from "next/link";

type LogoProps = { compact?: boolean; className?: string; href?: string };

export function Logo({ compact = false, className = "", href = "/" }: LogoProps) {
  return <Link href={href} aria-label="Sistema Acadêmico - página inicial" className={`inline-flex items-center gap-3 ${className}`}>
    <Image src="/logo.svg" alt="" width={compact ? 150 : 230} height={compact ? 44 : 67} priority className="h-auto w-auto max-w-full" />
  </Link>;
}
