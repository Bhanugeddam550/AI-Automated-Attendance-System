import { useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { type AttendanceStatus, type AttendanceRecord } from '@/lib/faceRecognition';
import { toast } from 'sonner';

interface ManualCorrectionDialogProps {
  record: AttendanceRecord | null;
  open: boolean;
  onClose: () => void;
  onSave: (rollNumber: string, newStatus: AttendanceStatus) => void;
}

export default function ManualCorrectionDialog({ record, open, onClose, onSave }: ManualCorrectionDialogProps) {
  const [newStatus, setNewStatus] = useState<AttendanceStatus>('Present');

  if (!record) return null;

  const handleSave = () => {
    onSave(record.rollNumber, newStatus);
    toast.success(`Updated ${record.name} to ${newStatus}`);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-sm bg-card border-border">
        <DialogHeader>
          <DialogTitle className="font-heading text-primary">Manual Correction</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="rounded-lg border border-border bg-secondary/50 p-3">
            <p className="font-heading text-sm font-bold text-foreground">{record.name}</p>
            <p className="font-mono text-xs text-muted-foreground">{record.rollNumber}</p>
            <p className="mt-1 font-mono text-[10px] text-muted-foreground">
              Current: <span className="font-bold">{record.status}</span> · {record.date}
            </p>
          </div>

          <div>
            <label className="mb-1 block font-mono text-[10px] uppercase text-muted-foreground">New Status</label>
            <Select value={newStatus} onValueChange={v => setNewStatus(v as AttendanceStatus)}>
              <SelectTrigger className="font-mono text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Present">Present</SelectItem>
                <SelectItem value="Late">Late</SelectItem>
                <SelectItem value="Absent">Absent</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={handleSave} className="bg-primary text-primary-foreground">Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
