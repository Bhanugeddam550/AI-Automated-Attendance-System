import { getAttendanceLog, getStudents, clearAttendanceLog, exportAttendanceCSV, type AttendanceRecord } from '@/lib/faceRecognition';
import { Button } from '@/components/ui/button';
import { Download, Trash2, Users, UserCheck, Percent, Clock } from 'lucide-react';

interface AttendanceDashboardProps {
  refreshKey: number;
}

export default function AttendanceDashboard({ refreshKey }: AttendanceDashboardProps) {
  void refreshKey;
  const log: AttendanceRecord[] = getAttendanceLog();
  const students = getStudents();
  const today = new Date().toLocaleDateString();
  const todayLog = log.filter(r => r.date === today);
  const attendancePercent = students.length > 0 ? Math.round((todayLog.length / students.length) * 100) : 0;

  const stats = [
    { label: 'Total Students', value: students.length, icon: Users, color: 'text-primary' },
    { label: 'Present Today', value: todayLog.length, icon: UserCheck, color: 'text-success' },
    { label: 'Attendance %', value: `${attendancePercent}%`, icon: Percent, color: 'text-accent' },
    { label: 'Last Detected', value: todayLog.length > 0 ? todayLog[todayLog.length - 1].time : '—', icon: Clock, color: 'text-muted-foreground' },
  ];

  return (
    <div className="space-y-4">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map(stat => (
          <div key={stat.label} className="rounded-lg border border-border bg-card p-3">
            <div className="flex items-center gap-2">
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
              <span className="font-mono text-[10px] uppercase text-muted-foreground">{stat.label}</span>
            </div>
            <p className={`mt-1 font-heading text-xl font-bold ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Attendance Progress Bar */}
      {students.length > 0 && (
        <div className="rounded-lg border border-border bg-card p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="font-mono text-[10px] uppercase text-muted-foreground">Attendance Progress</span>
            <span className="font-mono text-xs text-primary">{todayLog.length}/{students.length}</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full rounded-full bg-gradient-to-r from-primary to-success transition-all duration-500"
              style={{ width: `${attendancePercent}%` }}
            />
          </div>
        </div>
      )}

      {/* Table */}
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
                  <th className="px-3 py-2 text-left font-mono text-[10px] uppercase text-muted-foreground">#</th>
                  <th className="px-3 py-2 text-left font-mono text-[10px] uppercase text-muted-foreground">Name</th>
                  <th className="px-3 py-2 text-left font-mono text-[10px] uppercase text-muted-foreground">Roll No.</th>
                  <th className="px-3 py-2 text-left font-mono text-[10px] uppercase text-muted-foreground">Time</th>
                  <th className="px-3 py-2 text-left font-mono text-[10px] uppercase text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody>
                {todayLog.map((record, i) => (
                  <tr key={`${record.rollNumber}-${record.time}`} className="border-b border-border last:border-0">
                    <td className="px-3 py-2 font-mono text-xs text-muted-foreground">{i + 1}</td>
                    <td className="px-3 py-2 font-mono text-sm text-foreground">{record.name}</td>
                    <td className="px-3 py-2 font-mono text-xs text-muted-foreground">{record.rollNumber}</td>
                    <td className="px-3 py-2 font-mono text-xs text-primary">{record.time}</td>
                    <td className="px-3 py-2">
                      <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 font-mono text-[10px] font-bold text-success">
                        <span className="h-1.5 w-1.5 rounded-full bg-success" />
                        {record.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
