import { getAttendanceLog, clearAttendanceLog, exportAttendanceCSV, type AttendanceRecord } from '@/lib/faceRecognition';
import { Button } from '@/components/ui/button';
import { Download, Trash2 } from 'lucide-react';

interface AttendanceTableProps {
  refreshKey: number;
}

export default function AttendanceTable({ refreshKey }: AttendanceTableProps) {
  const log: AttendanceRecord[] = getAttendanceLog();
  const today = new Date().toLocaleDateString();
  const todayLog = log.filter(r => r.date === today);

  // Force re-render via key
  void refreshKey;

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-heading text-sm uppercase tracking-wider text-primary text-glow">
          Today's Attendance ({todayLog.length})
        </h3>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportAttendanceCSV} disabled={log.length === 0}>
            <Download className="mr-1 h-3 w-3" /> CSV
          </Button>
          <Button variant="outline" size="sm" onClick={() => { clearAttendanceLog(); window.location.reload(); }} disabled={log.length === 0} className="text-destructive hover:text-destructive">
            <Trash2 className="mr-1 h-3 w-3" /> Clear
          </Button>
        </div>
      </div>

      {todayLog.length === 0 ? (
        <p className="font-mono text-xs text-muted-foreground">No attendance recorded today.</p>
      ) : (
        <div className="overflow-hidden rounded border border-border">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-secondary">
                <th className="px-3 py-2 text-left font-mono text-xs uppercase text-muted-foreground">#</th>
                <th className="px-3 py-2 text-left font-mono text-xs uppercase text-muted-foreground">Name</th>
                <th className="px-3 py-2 text-left font-mono text-xs uppercase text-muted-foreground">Time</th>
              </tr>
            </thead>
            <tbody>
              {todayLog.map((record, i) => (
                <tr key={`${record.name}-${record.time}`} className="border-b border-border last:border-0">
                  <td className="px-3 py-2 font-mono text-xs text-muted-foreground">{i + 1}</td>
                  <td className="px-3 py-2 font-mono text-sm text-foreground">{record.name}</td>
                  <td className="px-3 py-2 font-mono text-xs text-primary">{record.time}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
