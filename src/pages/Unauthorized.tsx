import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ShieldAlert } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export default function Unauthorized() {
  const navigate = useNavigate();
  const { signOut } = useAuth();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="max-w-sm space-y-4 text-center p-6">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
          <ShieldAlert className="h-8 w-8 text-destructive" />
        </div>
        <h1 className="font-heading text-xl font-bold text-destructive">Unauthorized Access</h1>
        <p className="font-mono text-sm text-muted-foreground">
          You do not have admin privileges to access this system. Contact the system administrator.
        </p>
        <div className="flex gap-2 justify-center">
          <Button variant="outline" onClick={() => { signOut(); navigate('/login'); }}>
            Sign Out
          </Button>
        </div>
      </div>
    </div>
  );
}
