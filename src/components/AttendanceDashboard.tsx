import { useState, useEffect } from 'react';
import {
  getAttendanceLog,
  clearAttendanceLog,
  exportAttendanceCSV,
  generateFullAttendance,
  getMasterStudentList,
  getTimeWindowStatus,
  getAttendanceWindowText,
  getPresenceWindowText,
  getLateWindowText,
  type AttendanceStatus,
} from '@/lib/faceRecognition';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Download, Trash2, Users, UserCheck, UserX, Percent, Clock, Timer,
  Lock, Unlock, Search, Filter, AlertTriangle,
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';

interface AttendanceDashboardProps {
  refreshKey: number;
}

const STATUS_COLORS: Record<AttendanceStatus, string> = {
  Present: 'hsl(142 71% 45%)',
  Late: 'hsl(38 92% 50%)',
  Absent: 'hsl(0 72% 51%)',
};

export default function AttendanceDashboard({ refreshKey }: AttendanceDashboardProps) {
  void refreshKey;
  const [now, setNow] = useState(new Date());
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<AttendanceStatus | 'All'>('All');

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
  const lateCount = fullAttendance.filter(r => r.status === 'Late').length;
  const absentCount = fullAttendance.filter(r => r.status === 'Absent').length;
  const attendancePercent = totalStrength > 0 ? Math.round(((presentCount + lateCount) / totalStrength) * 100) : 0;

  const windowStatus = getTimeWindowStatus();
  const windowText = getAttendanceWindowText();

  const windowLabel = {
    before: 'WAITING FOR WINDOW',
    present: 'ON TIME WINDOW OPEN',
    late: 'LATE WINDOW ACTIVE',
    closed: 'ATTENDANCE WINDOW CLOSED',
  }[windowStatus];

  const windowStyle = {
    before: 'border-border bg-card',
    present: 'border-success/30 bg-success/5',
    late: 'border-warning/30 bg-amber-50',
    closed: 'border-destructive/30 bg-destructive/5',
  }[windowStatus];

  const windowTextColor = {
    before: 'text-muted-foreground',
    present: 'text-success',
    late: 'text-amber-600',
    closed: 'text-destructive',
  }[windowStatus];

  // Filtered attendance
  const filtered = fullAttendance.filter(r => {
    const matchesSearch = searchQuery === '' ||
      r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.rollNumber.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'All' || r.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Chart data
  const pieData = [
    { name: 'Present', value: presentCount, color: STATUS_COLORS.Present },
    { name: 'Late', value: lateCount, color: STATUS_COLORS.Late },
    { name: 'Absent', value: absentCount, color: STATUS_COLORS.Absent },
  ].filter(d => d.value > 0);

  const stats = [
    { label: `Strength (${regularCount}R + ${leCount}LE)`, value: totalStrength, icon: Users, color: 'text-primary' },
    { label: 'Present', value: presentCount, icon: UserCheck, color: 'text-success' },
    { label: 'Late', value: lateCount, icon: AlertTriangle, color: 'text-amber-600' },
    { label: 'Absent', value: absentCount, icon: UserX, color: 'text-destructive' },
    { label: 'Attendance %', value: `${attendancePercent}%`, icon: Percent, color: 'text-primary' },
  ];

  const statusBadge = (status: AttendanceStatus) => {
    const styles: Record<AttendanceStatus, string> = {
      Present: 'bg-success/10 text-success',
      Late: 'bg-amber-100 text-amber-700',
      Absent: 'bg-destructive/10 text-destructive',
    };
    const dotStyles: Record<AttendanceStatus, string> = {
      Present: 'bg-success',
      Late: 'bg-amber-500',
      Absent: 'bg-destructive',
    };
    return (
      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-mono text-[10px] font-bold ${styles[status]}`}>
        <span className={`h-1.5 w-1.5 rounded-full ${dotStyles[status]}`} />
        {status}
      </span>
    );
  };

  return (
    <div className="space-y-4">
      {/* Time Window Status */}
      <div className={`flex items-center justify-between rounded-lg border p-3 ${windowStyle}`}>
        <div className="flex items-center gap-2">
          {windowStatus === 'present' || windowStatus === 'late' ? (
            <Unlock className={`h-4 w-4 ${windowTextColor}`} />
          ) : (
            <Lock className={`h-4 w-4 ${windowTextColor}`} />
          )}
          <div>
            <p className={`font-mono text-xs font-bold ${windowTextColor}`}>{windowLabel}</p>
            <p className="font-mono text-[10px] text-muted-foreground">
              <Timer className="mr-1 inline h-3 w-3" />
              Present: {getPresenceWindowText()} · Late: {getLateWindowText()}
            </p>
          </div>
        </div>
        <div className={`h-2.5 w-2.5 rounded-full ${windowStatus === 'present' ? 'bg-success animate-pulse' : windowStatus === 'late' ? 'bg-amber-500 animate-pulse' : 'bg-destructive'}`} />
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
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
            <span className="font-mono text-xs text-primary">{presentCount + lateCount}/{totalStrength}</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-secondary">
            <div className="flex h-full">
              <div className="h-full bg-success transition-all duration-500" style={{ width: `${(presentCount / totalStrength) * 100}%` }} />
              <div className="h-full bg-amber-400 transition-all duration-500" style={{ width: `${(lateCount / totalStrength) * 100}%` }} />
            </div>
          </div>
          <div className="mt-1 flex gap-4">
            <span className="flex items-center gap-1 font-mono text-[9px] text-muted-foreground"><span className="h-2 w-2 rounded-full bg-success" />Present</span>
            <span className="flex items-center gap-1 font-mono text-[9px] text-muted-foreground"><span className="h-2 w-2 rounded-full bg-amber-400" />Late</span>
            <span className="flex items-center gap-1 font-mono text-[9px] text-muted-foreground"><span className="h-2 w-2 rounded-full bg-secondary" />Absent</span>
          </div>
        </div>
      )}

      {/* Charts */}
      {totalStrength > 0 && (
        <div className="grid gap-4 md:grid-cols-2">
          {/* Pie Chart */}
          <div className="rounded-lg border border-border bg-card p-4">
            <h3 className="mb-2 font-heading text-sm uppercase tracking-wider text-primary">Attendance Distribution</h3>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                  {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          {/* Bar Chart */}
          <div className="rounded-lg border border-border bg-card p-4">
            <h3 className="mb-2 font-heading text-sm uppercase tracking-wider text-primary">Status Breakdown</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={[{ name: 'Today', Present: presentCount, Late: lateCount, Absent: absentCount }]}>
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="Present" fill={STATUS_COLORS.Present} radius={[4, 4, 0, 0]} />
                <Bar dataKey="Late" fill={STATUS_COLORS.Late} radius={[4, 4, 0, 0]} />
                <Bar dataKey="Absent" fill={STATUS_COLORS.Absent} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Search & Filter */}
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name or roll number..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-9 font-mono text-xs"
          />
        </div>
        <div className="flex gap-1">
          {(['All', 'Present', 'Late', 'Absent'] as const).map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`rounded-md px-3 py-2 font-mono text-[10px] font-bold transition-colors ${
                statusFilter === s
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-muted-foreground hover:text-foreground'
              }`}
            >
              {s === 'All' ? <Filter className="inline h-3 w-3 mr-1" /> : null}
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Full Attendance Table */}
      <div className="rounded-lg border border-border bg-card p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-heading text-sm uppercase tracking-wider text-primary">
            Attendance Report — {new Date().toISOString().split('T')[0]}
            <span className="ml-2 font-mono text-[10px] text-muted-foreground">({filtered.length} records)</span>
          </h3>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={exportAttendanceCSV}>
              <Download className="mr-1 h-3 w-3" /> CSV
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
              {filtered.map((record, idx) => (
                <tr key={record.rollNumber} className="border-b border-border last:border-0">
                  <td className="px-3 py-1.5 font-mono text-[10px] text-muted-foreground">{idx + 1}</td>
                  <td className="px-3 py-1.5 font-mono text-xs text-muted-foreground">{record.rollNumber}</td>
                  <td className="px-3 py-1.5 font-mono text-xs text-foreground">{record.name}</td>
                  <td className="px-3 py-1.5">{statusBadge(record.status)}</td>
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
                <div className="flex items-center gap-2">
                  {statusBadge(r.status)}
                  <span className="font-mono text-[10px] text-primary">{r.time}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
