import { useState, useCallback } from 'react';
import WebcamFeed from '@/components/WebcamFeed';
import RegisterFace from '@/components/RegisterFace';
import AttendanceTable from '@/components/AttendanceTable';
import { Scan, UserPlus, ClipboardList } from 'lucide-react';
import { toast } from 'sonner';

type Tab = 'detect' | 'register' | 'log';

const Index = () => {
  const [activeTab, setActiveTab] = useState<Tab>('detect');
  const [refreshKey, setRefreshKey] = useState(0);

  const handleAttendanceMarked = useCallback((name: string) => {
    toast.success(`Attendance marked for ${name}`);
    setRefreshKey(k => k + 1);
  }, []);

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'detect', label: 'DETECT', icon: <Scan className="h-4 w-4" /> },
    { id: 'register', label: 'REGISTER', icon: <UserPlus className="h-4 w-4" /> },
    { id: 'log', label: 'LOG', icon: <ClipboardList className="h-4 w-4" /> },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur">
        <div className="container flex items-center justify-between py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-primary/30 bg-primary/10">
              <Scan className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="font-heading text-lg font-bold tracking-wider text-foreground">
                FACE<span className="text-primary text-glow">ID</span>
              </h1>
              <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                AI Attendance System
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 rounded-lg border border-border bg-secondary p-1">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 rounded-md px-3 py-1.5 font-mono text-xs transition-all ${
                  activeTab === tab.id
                    ? 'bg-primary text-primary-foreground glow-primary'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {tab.icon}
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="container py-6">
        <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
          <div>
            {activeTab === 'detect' && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 animate-pulse rounded-full bg-success" />
                  <span className="font-mono text-xs uppercase text-muted-foreground">Live Feed — Face Detection Active</span>
                </div>
                <WebcamFeed onAttendanceMarked={handleAttendanceMarked} />
              </div>
            )}
            {activeTab === 'register' && (
              <RegisterFace onComplete={() => setRefreshKey(k => k + 1)} />
            )}
            {activeTab === 'log' && (
              <AttendanceTable refreshKey={refreshKey} />
            )}
          </div>

          {/* Sidebar - always show attendance on desktop */}
          <div className="hidden lg:block">
            <AttendanceTable refreshKey={refreshKey} />
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;
