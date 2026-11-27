"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/Button";
import { Icon } from "@/components/Icon";
import { Logo } from "@/components/Logo";
import styles from "./styles.module.scss";

export interface HeaderProps {
  userName: string;
  roleLabel: string;
  menuOpen: boolean;
  onMenu: () => void;
}

export function Header({ userName, roleLabel, menuOpen, onMenu }: HeaderProps) {
  const router = useRouter();
  const [profileOpen, setProfileOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!profileOpen) return;
    function closeOnOutsideClick(event: PointerEvent) {
      if (!profileRef.current?.contains(event.target as Node)) setProfileOpen(false);
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setProfileOpen(false);
    }
    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [profileOpen]);

  async function handleLogout() {
    setLoggingOut(true);
    setError(null);
    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      if (!response.ok) throw new Error("Falha ao encerrar a sessão.");
      router.replace("/login");
      router.refresh();
    } catch {
      setError("Não foi possível encerrar a sessão. Tente novamente.");
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <header className={styles.header}>
      <div className={styles.brand}>
        <Logo compact />
      </div>
      <div className={styles.right}>
        <button
          className={styles.menu}
          onClick={onMenu}
          aria-label={menuOpen ? "Fechar menu" : "Abrir menu"}
          aria-expanded={menuOpen}
          type="button"
        >
          <Icon name={menuOpen ? "close" : "menu"} />
        </button>
        <div className={styles.profileWrap} ref={profileRef}>
          <button
            className={styles.profile}
            onClick={() => setProfileOpen((open) => !open)}
            aria-label={`Perfil de ${userName}`}
            aria-expanded={profileOpen}
            type="button"
          >
            <span className={styles.avatar}>{userName.slice(0, 1).toUpperCase()}</span>
            <span className={styles.profileText}>
              <strong>{userName}</strong>
              <small>{roleLabel}</small>
            </span>
            <Icon name="chevron" size="sm" />
          </button>
          {profileOpen ? (
            <div className={styles.dropdown}>
              <Button
                variant="tertiary"
                type="button"
                iconName="logout"
                onClick={handleLogout}
                disabled={loggingOut}
              >
                {loggingOut ? "Saindo…" : "Sair da conta"}
              </Button>
              {error ? (
                <p className={styles.error} role="alert">
                  {error}
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
