import LogoutButton from "@/components/auth/logout-button";

export default function SystemBlockedPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-lg items-center px-4">
      <section className="w-full rounded-xl border border-rose-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold text-rose-700">System is blocked</h1>
        <p className="mt-2 text-sm text-slate-700">
          Your access is temporarily disabled by administrator. Please contact admin for details.
        </p>
        <p className="mt-2 text-xs text-slate-500">Available action: logout only.</p>
        <LogoutButton />
      </section>
    </main>
  );
}
