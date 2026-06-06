"use client";

import PageContainer from "@/components/common/page-container";
import EmptyState from "@/components/common/empty-state";
import { Moon } from "lucide-react";
import { useEffect, useState } from "react";

export default function DarkModePage() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
  }, [isDark]);

  return (
    <PageContainer
      title="Dark Mode"
      description="Theme controls for low-light study sessions."
      breadcrumbs={[
        { label: "Campus LMS", href: "/dashboard" },
        { label: "Dark Mode" },
      ]}
    >
      <EmptyState
        icon={Moon}
        title={isDark ? "Dark mode is enabled" : "Dark mode is disabled"}
        description="Use dark theme for night sessions and prolonged reading. Your preference applies instantly."
        actionLabel={isDark ? "Switch to Light Mode" : "Enable Dark Mode"}
        actionHref="/dashboard/dark-mode"
      />
      <div className="mt-4 flex justify-center">
        <button
          type="button"
          onClick={() => setIsDark((prev) => !prev)}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
        >
          {isDark ? "Disable dark mode" : "Enable dark mode"}
        </button>
      </div>
    </PageContainer>
  );
}
