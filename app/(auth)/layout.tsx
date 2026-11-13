export const instant = false;

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-100 px-4 py-12 text-zinc-900">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-sm">{children}</div>
    </main>
  );
}
