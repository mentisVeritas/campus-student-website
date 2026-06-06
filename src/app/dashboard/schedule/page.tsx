import PageContainer from "@/components/common/page-container";
import { mockSchedule } from "@/lib/mock-data";

export default function SchedulePage() {
  return (
    <PageContainer
      title="Class Schedule"
      description="Weekly class timetable with latest updates."
    >
      <div className="overflow-hidden rounded-lg border border-slate-200">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-100 text-left text-slate-600">
            <tr>
              <th className="px-3 py-2">Day</th>
              <th className="px-3 py-2">Time</th>
              <th className="px-3 py-2">Subject</th>
              <th className="px-3 py-2">Room</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white text-slate-800">
            {mockSchedule.map((item) => (
              <tr key={item.id}>
                <td className="px-3 py-2">{item.day}</td>
                <td className="px-3 py-2">{item.time}</td>
                <td className="px-3 py-2">{item.subject}</td>
                <td className="px-3 py-2">{item.room}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
        In-app notice: one lecture room changed for this week.
      </div>
    </PageContainer>
  );
}
