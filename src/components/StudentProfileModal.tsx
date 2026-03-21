import { useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { getStudents, getAttendanceLog, type MasterStudent, type AttendanceRecord } from '@/lib/faceRecognition';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { User, Calendar, CheckCircle, XCircle, Clock, TrendingUp } from 'lucide-react';

interface StudentProfileModalProps {
  student: MasterStudent | null;
  open: boolean;
  onClose: () => void;
}

export default function StudentProfileModal({ student, open, onClose }: StudentProfileModalProps) {
  const [viewMode, setViewMode] = useState<'daily' | 'weekly' | 'monthly'>('daily');

  if (!student) return null;

  const registered = getStudents().find(s => s.rollNumber === student.rollNumber);
  const allLogs = getAttendanceLog().filter(r => r.rollNumber === student.rollNumber);

  const totalDays = Math.max(allLogs.length, 1);
  const presentDays = allLogs.filter(r => r.status === 'Present').length;
  const lateDays = allLogs.filter(r => r.status === 'Late').length;
  const absentDays = totalDays - presentDays - lateDays;
  const percentage = totalDays > 0 ? Math.round(((presentDays + lateDays) / totalDays) * 100) : 0;

  // Group logs by period
  const groupedLogs = groupByPeriod(allLogs, viewMode);

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg bg-card border-border">
        <DialogHeader>
          <DialogTitle className="font-heading text-primary">Student Profile</DialogTitle>
        </DialogHeader>

        {/* Profile Header */}
        <div className="flex items-center gap-4 rounded-lg border border-border bg-secondary/50 p-4">
          <Avatar className="h-16 w-16 border-2 border-primary/30">
            {registered?.photoUrl ? (
              <AvatarImage src={registered.photoUrl} alt={student.name} />
            ) : null}
            <AvatarFallback className="bg-primary/10 text-primary">
              <User className="h-8 w-8" />
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-heading text-lg font-bold text-foreground">{student.name}</p>
            <p className="font-mono text-xs text-muted-foreground">{student.rollNumber}</p>
            <span className={`mt-1 inline-block rounded-full px-2 py-0.5 font-mono text-[10px] font-bold ${
              student.category === 'Regular' ? 'bg-primary/10 text-primary' : 'bg-accent/20 text-accent-foreground'
            }`}>
              {student.category}
            </span>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: 'Present', value: presentDays, icon: CheckCircle, color: 'text-success' },
            { label: 'Late', value: lateDays, icon: Clock, color: 'text-amber-600' },
            { label: 'Absent', value: absentDays, icon: XCircle, color: 'text-destructive' },
            { label: 'Rate', value: `${percentage}%`, icon: TrendingUp, color: 'text-primary' },
          ].map(s => (
            <div key={s.label} className="rounded-lg border border-border bg-card p-2 text-center">
              <s.icon className={`mx-auto h-4 w-4 ${s.color}`} />
              <p className={`font-heading text-lg font-bold ${s.color}`}>{s.value}</p>
              <p className="font-mono text-[9px] text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Period Toggle */}
        <div className="flex gap-1">
          {(['daily', 'weekly', 'monthly'] as const).map(m => (
            <button
              key={m}
              onClick={() => setViewMode(m)}
              className={`rounded-md px-3 py-1.5 font-mono text-[10px] font-bold transition-colors ${
                viewMode === m ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:text-foreground'
              }`}
            >
              {m.charAt(0).toUpperCase() + m.slice(1)}
            </button>
          ))}
        </div>

        {/* History */}
        <div className="max-h-[200px] overflow-y-auto rounded-lg border border-border">
          <table className="w-full">
            <thead className="sticky top-0 bg-secondary">
              <tr className="border-b border-border">
                <th className="px-3 py-1.5 text-left font-mono text-[10px] uppercase text-muted-foreground">
                  {viewMode === 'daily' ? 'Date' : 'Period'}
                </th>
                <th className="px-3 py-1.5 text-left font-mono text-[10px] uppercase text-muted-foreground">Status</th>
                <th className="px-3 py-1.5 text-left font-mono text-[10px] uppercase text-muted-foreground">Time</th>
              </tr>
            </thead>
            <tbody>
              {groupedLogs.length === 0 ? (
                <tr><td colSpan={3} className="px-3 py-4 text-center font-mono text-xs text-muted-foreground">No attendance records</td></tr>
              ) : (
                groupedLogs.map((entry, i) => (
                  <tr key={i} className="border-b border-border last:border-0">
                    <td className="px-3 py-1.5 font-mono text-xs text-foreground">{entry.period}</td>
                    <td className="px-3 py-1.5">
                      <StatusBadge status={entry.status} />
                    </td>
                    <td className="px-3 py-1.5 font-mono text-xs text-primary">{entry.time}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    Present: 'bg-success/10 text-success',
    Late: 'bg-amber-100 text-amber-700',
    Absent: 'bg-destructive/10 text-destructive',
  };
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-mono text-[10px] font-bold ${styles[status] || ''}`}>
      {status}
    </span>
  );
}

interface GroupedEntry { period: string; status: string; time: string }

function groupByPeriod(logs: AttendanceRecord[], mode: 'daily' | 'weekly' | 'monthly'): GroupedEntry[] {
  if (mode === 'daily') {
    return logs.map(l => ({ period: l.date, status: l.status, time: l.time }));
  }

  const grouped = new Map<string, AttendanceRecord[]>();
  for (const l of logs) {
    const d = new Date(l.date);
    let key: string;
    if (mode === 'weekly') {
      const weekStart = new Date(d);
      weekStart.setDate(d.getDate() - d.getDay());
      key = `Week of ${weekStart.toISOString().split('T')[0]}`;
    } else {
      key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    }
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(l);
  }

  return Array.from(grouped.entries()).map(([period, entries]) => {
    const present = entries.filter(e => e.status === 'Present' || e.status === 'Late').length;
    const total = entries.length;
    return {
      period,
      status: `${present}/${total} Present`,
      time: `${Math.round((present / total) * 100)}%`,
    };
  });
}
