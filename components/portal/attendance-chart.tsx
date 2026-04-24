import { formatPercent } from "@/lib/utils";

interface AttendanceChartProps {
  data: Array<{ rol: string; ratio: number }>;
}

export function AttendanceChart({ data }: AttendanceChartProps) {
  if (data.length === 0) {
    return (
      <div className="rounded-[24px] border border-dashed border-slate-200 bg-slate-50/80 px-5 py-8 text-sm text-slate-500">
        Aún no hay asistencia consolidada para mostrar en este establecimiento.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {data.map((item) => (
        <div key={item.rol} className="rounded-[20px] border border-slate-100 bg-slate-50/55 px-4 py-3">
          <div className="flex items-center justify-between text-sm text-slate-600">
            <span>{item.rol}</span>
            <span className="font-semibold text-ink">{formatPercent(item.ratio)}</span>
          </div>
          <div className="mt-3 h-3 rounded-full bg-slate-100">
            <div
              className="h-3 rounded-full bg-gradient-to-r from-ocean to-ember transition-[width] duration-700"
              style={{ width: `${Math.max(item.ratio * 100, 8)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}