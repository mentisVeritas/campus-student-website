import PageContainer from "@/components/common/page-container";

export default function ClubsRegistrationPage() {
  return (
    <PageContainer
      title="Club Registration"
      description="Submit a request to join a university club section."
    >
      <form className="grid gap-3 rounded-lg border border-slate-200 p-4 md:grid-cols-2">
        <label className="text-sm text-slate-700">
          Club
          <select className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5">
            <option>Football</option>
            <option>Basketball</option>
            <option>Volleyball</option>
          </select>
        </label>
        <label className="text-sm text-slate-700">
          Preferred schedule
          <input
            className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5"
            placeholder="e.g., Tue/Thu 17:00"
          />
        </label>
        <label className="text-sm text-slate-700 md:col-span-2">
          Motivation
          <textarea
            className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5"
            rows={3}
            placeholder="Why do you want to join?"
          />
        </label>
        <button
          type="button"
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 md:col-span-2"
        >
          Submit registration
        </button>
      </form>
    </PageContainer>
  );
}
