import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Scan, UserPlus, Loader2, AlertTriangle, CheckCircle } from 'lucide-react';

export default function AdminSetup() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Sign up the admin user
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (signUpError) {
        setError(signUpError.message);
        setLoading(false);
        return;
      }

      if (!data.user) {
        setError('Failed to create user');
        setLoading(false);
        return;
      }

      // Assign admin role
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({ user_id: data.user.id, role: 'admin' });

      if (roleError) {
        setError('User created but failed to assign admin role: ' + roleError.message);
        setLoading(false);
        return;
      }

      setSuccess(true);
      setTimeout(() => navigate('/login'), 2000);
    } catch {
      setError('Setup failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-full max-w-sm space-y-6 p-6">
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-primary/30 bg-primary/10 glow-primary">
            <Scan className="h-7 w-7 text-primary" />
          </div>
          <div className="text-center">
            <h1 className="font-heading text-xl font-bold tracking-wider text-foreground">
              FACE<span className="text-primary text-glow">CHECK</span>
            </h1>
            <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              First-Time Admin Setup
            </p>
          </div>
        </div>

        {success ? (
          <div className="rounded-lg border border-success/30 bg-success/5 p-5 text-center space-y-2">
            <CheckCircle className="mx-auto h-8 w-8 text-success" />
            <p className="font-mono text-sm text-success">Admin account created!</p>
            <p className="font-mono text-[10px] text-muted-foreground">Redirecting to login...</p>
          </div>
        ) : (
          <form onSubmit={handleSetup} className="space-y-4">
            <div className="rounded-lg border border-border bg-card p-5 space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <UserPlus className="h-4 w-4 text-primary" />
                <h2 className="font-heading text-sm uppercase tracking-wider text-primary text-glow">
                  Create Admin Account
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
                  placeholder="Password (min 6 chars)"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="bg-secondary font-mono text-sm"
                  minLength={6}
                  required
                />
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating Admin...
                  </>
                ) : (
                  'Create Admin Account'
                )}
              </Button>
            </div>
          </form>
        )}

        <p className="text-center font-mono text-[10px] text-muted-foreground">
          This page is for initial setup only. After creating the admin account, use the login page.
        </p>
      </div>
    </div>
  );
}
