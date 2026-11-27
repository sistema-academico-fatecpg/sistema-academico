import Image from "next/image";
import Link from "next/link";
import { cn } from "@/web/lib/utils";
import styles from "./styles.module.scss";

type LogoProps = { compact?: boolean; className?: string; href?: string };

export function Logo({ compact = false, className = "", href = "/" }: LogoProps) {
  return (
    <Link
      href={href}
      aria-label="Sistema Acadêmico - página inicial"
      className={cn(styles.link, className)}
    >
      <Image
        src="/logo.svg"
        alt=""
        width={compact ? 150 : 230}
        height={compact ? 44 : 67}
        priority
        className={styles.image}
      />
    </Link>
  );
}
