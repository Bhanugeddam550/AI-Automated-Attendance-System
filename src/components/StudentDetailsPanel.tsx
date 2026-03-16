import type { DetectedStudent } from '@/lib/faceRecognition';
import { User, ShieldCheck, ShieldAlert } from 'lucide-react';
import { getStudents } from '@/lib/faceRecognition';

interface StudentDetailsPanelProps {
  detectedFaces: DetectedStudent[];
}

export default function StudentDetailsPanel({ detectedFaces }: StudentDetailsPanelProps) {
  const students = getStudents();

  if (detectedFaces.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-4">
        <h3 className="mb-3 font-heading text-sm uppercase tracking-wider text-primary text-glow">
          Detected Student
        </h3>
        <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
          <User className="mb-2 h-10 w-10 opacity-30" />
          <p className="font-mono text-xs">No face detected</p>
          <p className="font-mono text-[10px]">Stand in front of the camera</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {detectedFaces.map((face, i) => {
        const isKnown = face.name !== 'Unknown';
        const student = isKnown ? students.find(s => s.rollNumber === face.rollNumber) : null;

        return (
          <div key={i} className={`rounded-lg border p-4 ${isKnown ? 'border-primary/30 bg-card glow-primary' : 'border-destructive/30 bg-card'}`}>
            <div className="flex items-start gap-3">
              {student?.photoUrl ? (
                <img src={student.photoUrl} alt={face.name} className="h-14 w-14 rounded-lg object-cover border border-primary/30" />
              ) : (
                <div className={`flex h-14 w-14 items-center justify-center rounded-lg ${isKnown ? 'bg-primary/10 text-primary' : 'bg-destructive/10 text-destructive'}`}>
                  {isKnown ? <ShieldCheck className="h-7 w-7" /> : <ShieldAlert className="h-7 w-7" />}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className={`font-heading text-base font-bold ${isKnown ? 'text-primary text-glow' : 'text-destructive'}`}>
                  {isKnown ? face.name : 'Unknown Person'}
                </p>
                {isKnown ? (
                  <>
                    <p className="font-mono text-xs text-muted-foreground">Roll: {face.rollNumber}</p>
                    <div className="mt-2 flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 font-mono text-[10px] font-bold text-success">
                        <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
                        PRESENT
                      </span>
                      <span className="font-mono text-[10px] text-muted-foreground">
                        Confidence: {face.confidence}%
                      </span>
                    </div>
                  </>
                ) : (
                  <p className="mt-1 font-mono text-[10px] text-muted-foreground">
                    Face not in dataset. Register this person to enable recognition.
                  </p>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
