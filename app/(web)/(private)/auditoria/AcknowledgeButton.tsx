"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components";

export function AcknowledgeButton({ id }: { id: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  async function acknowledge() {
    setLoading(true);
    await fetch(`/api/audit/alerts/${id}/acknowledge`, { method: "POST" });
    setLoading(false);
    router.refresh();
  }
  return (
    <Button
      disabled={loading}
      iconName="check"
      onClick={acknowledge}
      size="sm"
      type="button"
      variant="secondary"
    >
      {loading ? "..." : "Reconhecer"}
    </Button>
  );
}
