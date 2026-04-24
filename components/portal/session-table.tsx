import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import type { Programacion } from "@/types/domain";

interface SessionTableProps {
  rows: Programacion[];
}

export function SessionTable({ rows }: SessionTableProps) {
  return (
    <div className="overflow-hidden rounded-[24px] border border-slate-200/80 bg-white shadow-sm">
      <table className="min-w-full divide-y divide-slate-200 text-left">
        <thead className="bg-slate-50/95 text-xs uppercase tracking-[0.18em] text-slate-500">
          <tr>
            <th className="sticky top-0 px-4 py-4 font-semibold backdrop-blur">RBD</th>
            <th className="sticky top-0 px-4 py-4 font-semibold backdrop-blur">Sesión</th>
            <th className="sticky top-0 px-4 py-4 font-semibold backdrop-blur">Fecha</th>
            <th className="sticky top-0 px-4 py-4 font-semibold backdrop-blur">Formato</th>
            <th className="sticky top-0 px-4 py-4 font-semibold backdrop-blur">Estado</th>
            <th className="sticky top-0 px-4 py-4 font-semibold backdrop-blur">Temáticas</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 bg-white text-sm text-slate-700">
          {rows.map((row, index) => (
            <tr key={row.id} className={index % 2 === 0 ? "bg-white" : "bg-slate-50/45"}>
              <td className="px-4 py-4 font-medium text-ink">{row.rbd}</td>
              <td className="px-4 py-4">{row.tipo_sesion} #{String(row.numero_sesion).padStart(2, "0")}</td>
              <td className="px-4 py-4">{formatDate(row.fecha_programada)} · {row.hora_programada}</td>
              <td className="px-4 py-4">{row.formato_planeado}</td>
              <td className="px-4 py-4">
                <Badge tone={row.estado === "PROGRAMADA" ? "success" : "neutral"}>{row.estado}</Badge>
              </td>
              <td className="px-4 py-4">{row.tematicas}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}