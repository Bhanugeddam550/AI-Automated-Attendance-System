import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { saveRegisteredFace, getRegisteredFaces, removeRegisteredFace } from '@/lib/faceRecognition';
import WebcamFeed from '@/components/WebcamFeed';
import { UserPlus, Trash2, Camera, X } from 'lucide-react';

interface RegisterFaceProps {
  onComplete: () => void;
}

export default function RegisterFace({ onComplete }: RegisterFaceProps) {
  const [name, setName] = useState('');
  const [captured, setCaptured] = useState(0);
  const [descriptors, setDescriptors] = useState<Float32Array[]>([]);
  const [isCapturing, setIsCapturing] = useState(false);
  const faces = getRegisteredFaces();
  const uniqueNames = [...new Set(faces.map(f => f.name))];

  const handleCapture = (descriptor: Float32Array) => {
    if (!isCapturing || !name.trim()) return;
    setDescriptors(prev => {
      const next = [...prev, descriptor];
      setCaptured(next.length);
      if (next.length >= 5) {
        // Save all descriptors
        for (const d of next) {
          saveRegisteredFace({ name: name.trim(), descriptor: Array.from(d) });
        }
        setIsCapturing(false);
        setName('');
        setCaptured(0);
        setDescriptors([]);
      }
      return next;
    });
  };

  const handleRemove = (personName: string) => {
    removeRegisteredFace(personName);
    onComplete(); // trigger refresh
  };

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-border bg-card p-4">
        <h3 className="mb-4 font-heading text-sm uppercase tracking-wider text-primary text-glow">
          <UserPlus className="mr-2 inline h-4 w-4" />
          Register New Face
        </h3>

        {isCapturing ? (
          <div className="space-y-3">
            <p className="font-mono text-xs text-muted-foreground">
              Capturing face data for <span className="text-primary">{name}</span>... Look at the camera.
            </p>
            <div className="h-2 overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${(captured / 5) * 100}%` }}
              />
            </div>
            <p className="font-mono text-xs text-muted-foreground">{captured}/5 samples captured</p>
            <WebcamFeed isRegistering onFaceCapture={handleCapture} />
            <Button variant="outline" size="sm" onClick={() => { setIsCapturing(false); setCaptured(0); setDescriptors([]); }}>
              <X className="mr-1 h-3 w-3" /> Cancel
            </Button>
          </div>
        ) : (
          <div className="flex gap-2">
            <Input
              placeholder="Enter person's name"
              value={name}
              onChange={e => setName(e.target.value)}
              className="bg-secondary font-mono text-sm"
            />
            <Button
              onClick={() => { if (name.trim()) setIsCapturing(true); }}
              disabled={!name.trim()}
              size="sm"
            >
              <Camera className="mr-1 h-3 w-3" /> Capture
            </Button>
          </div>
        )}
      </div>

      <div className="rounded-lg border border-border bg-card p-4">
        <h3 className="mb-3 font-heading text-sm uppercase tracking-wider text-primary text-glow">
          Registered People ({uniqueNames.length})
        </h3>
        {uniqueNames.length === 0 ? (
          <p className="font-mono text-xs text-muted-foreground">No faces registered yet.</p>
        ) : (
          <div className="space-y-2">
            {uniqueNames.map(n => (
              <div key={n} className="flex items-center justify-between rounded border border-border bg-secondary px-3 py-2">
                <span className="font-mono text-sm text-foreground">{n}</span>
                <Button variant="ghost" size="icon" onClick={() => handleRemove(n)} className="h-7 w-7 text-destructive hover:text-destructive">
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
