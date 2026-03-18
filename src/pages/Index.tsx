import { useState, useCallback } from 'react';
import WebcamFeed from '@/components/WebcamFeed';
import DatasetManager from '@/components/DatasetManager';
import AttendanceDashboard from '@/components/AttendanceDashboard';
import StudentDetailsPanel from '@/components/StudentDetailsPanel';
import { Scan, Database, LayoutDashboard, LogOut } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import type { DetectedStudent } from '@/lib/faceRecognition';

type Tab = 'detect' | 'dataset' | 'dashboard';

const Index = () => {
  const { user, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('detect');
  const [refreshKey, setRefreshKey] = useState(0);
  const [detectedFaces, setDetectedFaces] = useState<DetectedStudent[]>([]);

  const handleAttendanceMarked = useCallback((name: string) => {
    toast.success(`Attendance marked for ${name}`);
    setRefreshKey(k => k + 1);
  }, []);

  const handleFacesDetected = useCallback((faces: DetectedStudent[]) => {
    setDetectedFaces(faces);
  }, []);

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'detect', label: 'LIVE DETECT', icon: <Scan className="h-4 w-4" /> },
    { id: 'dataset', label: 'DATASET', icon: <Database className="h-4 w-4" /> },
    { id: 'dashboard', label: 'DASHBOARD', icon: <LayoutDashboard className="h-4 w-4" /> },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur sticky top-0 z-20">
        <div className="container flex items-center justify-between py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-primary/30 bg-primary/10">
              <Scan className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="font-heading text-lg font-bold tracking-wider text-foreground">
                FACE<span className="text-primary text-glow">CHECK</span>
              </h1>
              <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                Smart AI Attendance System
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
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
            <div className="flex items-center gap-2 border-l border-border pl-3">
              <span className="hidden md:inline font-mono text-[10px] text-muted-foreground truncate max-w-[120px]">{user?.email}</span>
              <Button variant="ghost" size="icon" onClick={signOut} className="h-8 w-8 text-muted-foreground hover:text-destructive">
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="container py-5">
        {activeTab === 'detect' && (
          <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 animate-pulse rounded-full bg-success" />
                <span className="font-mono text-xs uppercase text-muted-foreground">Live Feed — Real-time Face Recognition</span>
              </div>
              <WebcamFeed onAttendanceMarked={handleAttendanceMarked} onFacesDetected={handleFacesDetected} />
            </div>
            <div className="space-y-4">
              <StudentDetailsPanel detectedFaces={detectedFaces} />
              <AttendanceDashboard refreshKey={refreshKey} />
            </div>
          </div>
        )}

        {activeTab === 'dataset' && (
          <div className="mx-auto max-w-2xl">
            <DatasetManager onUpdate={() => setRefreshKey(k => k + 1)} />
          </div>
        )}

        {activeTab === 'dashboard' && (
          <AttendanceDashboard refreshKey={refreshKey} />
        )}
      </main>
    </div>
  );
};

export default Index;
