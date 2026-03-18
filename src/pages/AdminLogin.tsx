import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Scan, Lock, Loader2, AlertTriangle } from 'lucide-react';

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const { error } = await signIn(email, password);
    if (error) {
      setError(error);
      setLoading(false);
      return;
    }
    // Auth context will update isAdmin, then ProtectedRoute redirects
    navigate('/');
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-full max-w-sm space-y-6 p-6">
        {/* Logo */}
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-primary/30 bg-primary/10 glow-primary">
            <Scan className="h-7 w-7 text-primary" />
          </div>
          <div className="text-center">
            <h1 className="font-heading text-xl font-bold tracking-wider text-foreground">
              FACE<span className="text-primary text-glow">CHECK</span>
            </h1>
            <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              Admin Access Only
            </p>
          </div>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="rounded-lg border border-border bg-card p-5 space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <Lock className="h-4 w-4 text-primary" />
              <h2 className="font-heading text-sm uppercase tracking-wider text-primary text-glow">
                Admin Login
              </h2>
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded border border-destructive/30 bg-destructive/5 px-3 py-2">
                <AlertTriangle className="h-3.5 w-3.5 text-destructive shrink-0" />
                <p className="font-mono text-xs text-destructive">{error}</p>
              </div>
            )}

            <div className="space-y-3">
              <Input
                type="email"
                placeholder="Admin email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="bg-secondary font-mono text-sm"
                required
              />
              <Input
                type="password"
                placeholder="Password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="bg-secondary font-mono text-sm"
                required
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Authenticating...
                </>
              ) : (
                'Sign In'
              )}
            </Button>
          </div>
        </form>

        <p className="text-center font-mono text-[10px] text-muted-foreground">
          Unauthorized access is prohibited. Contact system administrator for access.
        </p>
      </div>
    </div>
  );
}
