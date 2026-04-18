import { formatPercent } from "@/lib/utils";

interface AttendanceChartProps {
  data: Array<{ rol: string; ratio: number }>;
}

export function AttendanceChart({ data }: AttendanceChartProps) {
  return (
    <div className="space-y-4">
      {data.map((item) => (
        <div key={item.rol} className="space-y-2">
          <div className="flex items-center justify-between text-sm text-slate-600">
            <span>{item.rol}</span>
            <span className="font-semibold text-ink">{formatPercent(item.ratio)}</span>
          </div>
          <div className="h-3 rounded-full bg-slate-100">
            <div
              className="h-3 rounded-full bg-gradient-to-r from-ocean to-ember"
              style={{ width: `${Math.max(item.ratio * 100, 8)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}