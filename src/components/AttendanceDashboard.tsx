import { getAttendanceLog, getStudents, clearAttendanceLog, exportAttendanceCSV, generateFullAttendance, type AttendanceRecord } from '@/lib/faceRecognition';
import { Button } from '@/components/ui/button';
import { Download, Trash2, Users, UserCheck, UserX, Percent, Clock } from 'lucide-react';

interface AttendanceDashboardProps {
  refreshKey: number;
}

export default function AttendanceDashboard({ refreshKey }: AttendanceDashboardProps) {
  void refreshKey;
  const students = getStudents();
  const log = getAttendanceLog();
  const today = new Date().toLocaleDateString();
  const todayLog = log.filter(r => r.date === today);
  const fullAttendance = generateFullAttendance();
  const presentCount = fullAttendance.filter(r => r.status === 'Present').length;
  const absentCount = fullAttendance.filter(r => r.status === 'Absent').length;
  const attendancePercent = students.length > 0 ? Math.round((presentCount / students.length) * 100) : 0;

  const stats = [
    { label: 'Total Students', value: students.length, icon: Users, color: 'text-primary' },
    { label: 'Present', value: presentCount, icon: UserCheck, color: 'text-success' },
    { label: 'Absent', value: absentCount, icon: UserX, color: 'text-destructive' },
    { label: 'Attendance %', value: `${attendancePercent}%`, icon: Percent, color: 'text-accent' },
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
            <span className="font-mono text-xs text-primary">{presentCount}/{students.length}</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full rounded-full bg-gradient-to-r from-primary to-success transition-all duration-500"
              style={{ width: `${attendancePercent}%` }}
            />
          </div>
        </div>
      )}

      {/* Full Attendance Table (sorted by roll number, includes absent) */}
      <div className="rounded-lg border border-border bg-card p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-heading text-sm uppercase tracking-wider text-primary text-glow">
            Attendance Report — {new Date().toISOString().split('T')[0]}
          </h3>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={exportAttendanceCSV} disabled={students.length === 0 && log.length === 0}>
              <Download className="mr-1 h-3 w-3" /> Download CSV
            </Button>
            <Button variant="outline" size="sm" onClick={() => { clearAttendanceLog(); window.location.reload(); }} disabled={log.length === 0} className="text-destructive hover:text-destructive">
              <Trash2 className="mr-1 h-3 w-3" /> Clear
            </Button>
          </div>
        </div>

        {fullAttendance.length === 0 ? (
          <p className="font-mono text-xs text-muted-foreground">No students registered. Add students in the Dataset tab.</p>
        ) : (
          <div className="overflow-hidden rounded border border-border">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-secondary">
                  <th className="px-3 py-2 text-left font-mono text-[10px] uppercase text-muted-foreground">Roll No</th>
                  <th className="px-3 py-2 text-left font-mono text-[10px] uppercase text-muted-foreground">Name</th>
                  <th className="px-3 py-2 text-left font-mono text-[10px] uppercase text-muted-foreground">Status</th>
                  <th className="px-3 py-2 text-left font-mono text-[10px] uppercase text-muted-foreground">Time</th>
                  <th className="px-3 py-2 text-left font-mono text-[10px] uppercase text-muted-foreground">Date</th>
                </tr>
              </thead>
              <tbody>
                {fullAttendance.map((record) => (
                  <tr key={record.rollNumber} className="border-b border-border last:border-0">
                    <td className="px-3 py-2 font-mono text-xs text-muted-foreground">{record.rollNumber}</td>
                    <td className="px-3 py-2 font-mono text-sm text-foreground">{record.name}</td>
                    <td className="px-3 py-2">
                      {record.status === 'Present' ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 font-mono text-[10px] font-bold text-success">
                          <span className="h-1.5 w-1.5 rounded-full bg-success" />
                          Present
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 font-mono text-[10px] font-bold text-destructive">
                          <span className="h-1.5 w-1.5 rounded-full bg-destructive" />
                          Absent
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 font-mono text-xs text-primary">{record.time}</td>
                    <td className="px-3 py-2 font-mono text-xs text-muted-foreground">{record.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Recent Detections */}
      {todayLog.length > 0 && (
        <div className="rounded-lg border border-border bg-card p-4">
          <h3 className="mb-3 font-heading text-sm uppercase tracking-wider text-muted-foreground">
            <Clock className="mr-1 inline h-3 w-3" /> Recent Detections
          </h3>
          <div className="space-y-1">
            {[...todayLog].reverse().slice(0, 5).map((r) => (
              <div key={`${r.rollNumber}-${r.time}`} className="flex items-center justify-between rounded bg-secondary px-3 py-1.5">
                <span className="font-mono text-xs text-foreground">{r.name} <span className="text-muted-foreground">({r.rollNumber})</span></span>
                <span className="font-mono text-[10px] text-primary">{r.time}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
