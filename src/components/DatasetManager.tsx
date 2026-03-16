import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getStudents, saveStudent, removeStudent, extractDescriptorsFromImage, loadModels, type Student } from '@/lib/faceRecognition';
import { Upload, Trash2, UserPlus, Loader2, ImagePlus, Users } from 'lucide-react';
import { toast } from 'sonner';

interface DatasetManagerProps {
  onUpdate: () => void;
}

export default function DatasetManager({ onUpdate }: DatasetManagerProps) {
  const [name, setName] = useState('');
  const [rollNumber, setRollNumber] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const students = getStudents();

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !name.trim() || !rollNumber.trim()) return;

    setIsProcessing(true);
    setProcessingStatus('Loading AI models...');

    try {
      await loadModels();
      const allDescriptors: number[][] = [];
      let photoUrl = '';

      for (let i = 0; i < files.length; i++) {
        setProcessingStatus(`Processing image ${i + 1}/${files.length}...`);
        const file = files[i];
        const url = URL.createObjectURL(file);

        if (i === 0) {
          // Store first image as thumbnail
          photoUrl = await fileToBase64(file);
        }

        const descriptors = await extractDescriptorsFromImage(url);
        URL.revokeObjectURL(url);

        if (descriptors.length > 0) {
          allDescriptors.push(...descriptors.map(d => Array.from(d)));
        }
      }

      if (allDescriptors.length === 0) {
        toast.error('No faces detected in the uploaded images. Try clearer photos.');
        return;
      }

      saveStudent({
        name: name.trim(),
        rollNumber: rollNumber.trim(),
        descriptors: allDescriptors,
        photoUrl,
      });

      toast.success(`Registered ${name} with ${allDescriptors.length} face samples from ${files.length} images`);
      setName('');
      setRollNumber('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      onUpdate();
    } catch (err) {
      console.error(err);
      toast.error('Failed to process images');
    } finally {
      setIsProcessing(false);
      setProcessingStatus('');
    }
  };

  const handleRemove = (roll: string, studentName: string) => {
    removeStudent(roll);
    toast.success(`Removed ${studentName}`);
    onUpdate();
  };

  return (
    <div className="space-y-5">
      {/* Add Student */}
      <div className="rounded-lg border border-border bg-card p-4">
        <h3 className="mb-4 flex items-center gap-2 font-heading text-sm uppercase tracking-wider text-primary text-glow">
          <UserPlus className="h-4 w-4" />
          Add Student to Dataset
        </h3>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <Input
              placeholder="Student name"
              value={name}
              onChange={e => setName(e.target.value)}
              className="bg-secondary font-mono text-sm"
              disabled={isProcessing}
            />
            <Input
              placeholder="Roll number"
              value={rollNumber}
              onChange={e => setRollNumber(e.target.value)}
              className="bg-secondary font-mono text-sm"
              disabled={isProcessing}
            />
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleImageUpload}
            className="hidden"
            disabled={isProcessing}
          />

          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={!name.trim() || !rollNumber.trim() || isProcessing}
            className="w-full"
            size="sm"
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                {processingStatus}
              </>
            ) : (
              <>
                <ImagePlus className="mr-1 h-3 w-3" />
                Upload Face Images (Multiple)
              </>
            )}
          </Button>

          <p className="font-mono text-[10px] text-muted-foreground">
            Upload multiple clear face photos for better recognition accuracy. At least 3 images recommended.
          </p>
        </div>
      </div>

      {/* Student List */}
      <div className="rounded-lg border border-border bg-card p-4">
        <h3 className="mb-3 flex items-center gap-2 font-heading text-sm uppercase tracking-wider text-primary text-glow">
          <Users className="h-4 w-4" />
          Registered Students ({students.length})
        </h3>
        {students.length === 0 ? (
          <p className="font-mono text-xs text-muted-foreground">No students registered. Upload face images above.</p>
        ) : (
          <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
            {students.map(s => (
              <div key={s.rollNumber} className="flex items-center gap-3 rounded border border-border bg-secondary px-3 py-2">
                {s.photoUrl ? (
                  <img src={s.photoUrl} alt={s.name} className="h-9 w-9 rounded-full object-cover border border-primary/30" />
                ) : (
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-xs font-bold text-primary">
                    {s.name.charAt(0)}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-mono text-sm text-foreground truncate">{s.name}</p>
                  <p className="font-mono text-[10px] text-muted-foreground">Roll: {s.rollNumber} · {s.descriptors.length} samples</p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => handleRemove(s.rollNumber, s.name)} className="h-7 w-7 shrink-0 text-destructive hover:text-destructive">
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

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
