import { useState, useEffect } from 'react';
import {
  getAttendanceLog,
  clearAttendanceLog,
  exportAttendanceCSV,
  generateFullAttendance,
  getMasterStudentList,
  isAttendanceOpen,
  isAfterAttendanceWindow,
  getAttendanceWindowText,
} from '@/lib/faceRecognition';
import { Button } from '@/components/ui/button';
import { Download, Trash2, Users, UserCheck, UserX, Percent, Clock, Timer, Lock, Unlock } from 'lucide-react';

interface AttendanceDashboardProps {
  refreshKey: number;
}

export default function AttendanceDashboard({ refreshKey }: AttendanceDashboardProps) {
  void refreshKey;
  const [now, setNow] = useState(new Date());

  // Auto-refresh every 5s for live updates
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 5000);
    return () => clearInterval(timer);
  }, []);
  void now;

  const masterList = getMasterStudentList();
  const log = getAttendanceLog();
  const today = new Date().toLocaleDateString();
  const todayLog = log.filter(r => r.date === today);
  const fullAttendance = generateFullAttendance();

  const regularCount = masterList.filter(s => s.category === 'Regular').length;
  const leCount = masterList.filter(s => s.category === 'Lateral Entry').length;
  const totalStrength = masterList.length;
  const presentCount = fullAttendance.filter(r => r.status === 'Present').length;
  const absentCount = fullAttendance.filter(r => r.status === 'Absent').length;
  const attendancePercent = totalStrength > 0 ? Math.round((presentCount / totalStrength) * 100) : 0;

  const windowOpen = isAttendanceOpen();
  const windowClosed = isAfterAttendanceWindow();
  const windowText = getAttendanceWindowText();

  const stats = [
    { label: `Strength (${regularCount}R + ${leCount}LE)`, value: totalStrength, icon: Users, color: 'text-primary' },
    { label: 'Present', value: presentCount, icon: UserCheck, color: 'text-success' },
    { label: 'Absent', value: absentCount, icon: UserX, color: 'text-destructive' },
    { label: 'Attendance %', value: `${attendancePercent}%`, icon: Percent, color: 'text-accent' },
  ];

  return (
    <div className="space-y-4">
      {/* Time Window Status */}
      <div className={`flex items-center justify-between rounded-lg border p-3 ${
        windowOpen
          ? 'border-success/30 bg-success/5'
          : windowClosed
          ? 'border-destructive/30 bg-destructive/5'
          : 'border-border bg-card'
      }`}>
        <div className="flex items-center gap-2">
          {windowOpen ? (
            <Unlock className="h-4 w-4 text-success" />
          ) : (
            <Lock className="h-4 w-4 text-destructive" />
          )}
          <div>
            <p className={`font-mono text-xs font-bold ${windowOpen ? 'text-success' : windowClosed ? 'text-destructive' : 'text-muted-foreground'}`}>
              {windowOpen ? 'ATTENDANCE WINDOW OPEN' : windowClosed ? 'ATTENDANCE WINDOW CLOSED' : 'WAITING FOR WINDOW'}
            </p>
            <p className="font-mono text-[10px] text-muted-foreground">
              <Timer className="mr-1 inline h-3 w-3" />
              Window: {windowText}
            </p>
          </div>
        </div>
        <div className={`h-2.5 w-2.5 rounded-full ${windowOpen ? 'bg-success animate-pulse' : 'bg-destructive'}`} />
      </div>

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
      {totalStrength > 0 && (
        <div className="rounded-lg border border-border bg-card p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="font-mono text-[10px] uppercase text-muted-foreground">Attendance Progress</span>
            <span className="font-mono text-xs text-primary">{presentCount}/{totalStrength}</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full rounded-full bg-gradient-to-r from-primary to-success transition-all duration-500"
              style={{ width: `${attendancePercent}%` }}
            />
          </div>
        </div>
      )}

      {/* Full Attendance Table */}
      <div className="rounded-lg border border-border bg-card p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-heading text-sm uppercase tracking-wider text-primary text-glow">
            Attendance Report — {new Date().toISOString().split('T')[0]}
          </h3>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={exportAttendanceCSV}>
              <Download className="mr-1 h-3 w-3" /> Download CSV
            </Button>
            <Button variant="outline" size="sm" onClick={() => { clearAttendanceLog(); window.location.reload(); }} disabled={log.length === 0} className="text-destructive hover:text-destructive">
              <Trash2 className="mr-1 h-3 w-3" /> Clear
            </Button>
          </div>
        </div>

        <div className="overflow-hidden rounded border border-border max-h-[500px] overflow-y-auto">
          <table className="w-full">
            <thead className="sticky top-0 z-10">
              <tr className="border-b border-border bg-secondary">
                <th className="px-3 py-2 text-left font-mono text-[10px] uppercase text-muted-foreground">#</th>
                <th className="px-3 py-2 text-left font-mono text-[10px] uppercase text-muted-foreground">Roll No</th>
                <th className="px-3 py-2 text-left font-mono text-[10px] uppercase text-muted-foreground">Name</th>
                <th className="px-3 py-2 text-left font-mono text-[10px] uppercase text-muted-foreground">Status</th>
                <th className="px-3 py-2 text-left font-mono text-[10px] uppercase text-muted-foreground">Time</th>
                <th className="px-3 py-2 text-left font-mono text-[10px] uppercase text-muted-foreground">Date</th>
              </tr>
            </thead>
            <tbody>
              {fullAttendance.map((record, idx) => (
                <tr key={record.rollNumber} className="border-b border-border last:border-0">
                  <td className="px-3 py-1.5 font-mono text-[10px] text-muted-foreground">{idx + 1}</td>
                  <td className="px-3 py-1.5 font-mono text-xs text-muted-foreground">{record.rollNumber}</td>
                  <td className="px-3 py-1.5 font-mono text-xs text-foreground">{record.name}</td>
                  <td className="px-3 py-1.5">
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
                  <td className="px-3 py-1.5 font-mono text-xs text-primary">{record.time}</td>
                  <td className="px-3 py-1.5 font-mono text-[10px] text-muted-foreground">{record.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
