import { useRef, useEffect, useState, useCallback } from 'react';
import {
  loadModels,
  faceapi,
  getStudents,
  createFaceMatcher,
  markAttendance,
  isAttendanceOpen,
  getTimeWindowStatus,
  type DetectedStudent,
} from '@/lib/faceRecognition';
import { Button } from '@/components/ui/button';
import { Play, Square, Video, VideoOff } from 'lucide-react';

interface WebcamFeedProps {
  onAttendanceMarked?: (name: string, rollNumber: string) => void;
  onFacesDetected?: (faces: DetectedStudent[]) => void;
}

export default function WebcamFeed({ onAttendanceMarked, onFacesDetected }: WebcamFeedProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [sessionActive, setSessionActive] = useState(false);
  const intervalRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    async function init() {
      try {
        setStatus('loading');
        await loadModels();
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480, facingMode: 'user' },
        });
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
        setStatus('ready');
      } catch {
        setStatus('error');
      }
    }
    init();
    return () => {
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const detect = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    if (video.readyState < 2) return;

    const detections = await faceapi.detectAllFaces(video).withFaceLandmarks().withFaceDescriptors();
    const canvas = canvasRef.current;
    const displaySize = { width: video.videoWidth, height: video.videoHeight };
    faceapi.matchDimensions(canvas, displaySize);
    const resized = faceapi.resizeResults(detections, displaySize);

    const ctx = canvas.getContext('2d');
    if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);

    const students = getStudents();
    const matcher = createFaceMatcher(students);
    const detected: DetectedStudent[] = [];
    const windowStatus = getTimeWindowStatus();

    for (const det of resized) {
      const box = det.detection.box;
      let name = 'Unknown';
      let rollNumber = '';
      let confidence = 0;

      if (matcher) {
        const match = matcher.findBestMatch(det.descriptor);
        if (match.label !== 'unknown') {
          const parts = match.label.split('|');
          name = parts[0];
          rollNumber = parts[1] || '';
          confidence = Math.round((1 - match.distance) * 100);
          if (markAttendance(name, rollNumber)) {
            onAttendanceMarked?.(name, rollNumber);
          }
        }
      }

      detected.push({ name, rollNumber, confidence, box: { x: box.x, y: box.y, width: box.width, height: box.height } });

      if (ctx) {
        const isKnown = name !== 'Unknown';
        const isLateWindow = windowStatus === 'late';
        const boxColor = !isKnown ? 'hsl(0, 72%, 55%)' : isLateWindow ? 'hsl(38, 92%, 50%)' : 'hsl(142, 71%, 45%)';
        
        ctx.strokeStyle = boxColor;
        ctx.lineWidth = 2;
        ctx.strokeRect(box.x, box.y, box.width, box.height);

        const cornerLen = 12;
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(box.x, box.y + cornerLen); ctx.lineTo(box.x, box.y); ctx.lineTo(box.x + cornerLen, box.y); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(box.x + box.width - cornerLen, box.y); ctx.lineTo(box.x + box.width, box.y); ctx.lineTo(box.x + box.width, box.y + cornerLen); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(box.x, box.y + box.height - cornerLen); ctx.lineTo(box.x, box.y + box.height); ctx.lineTo(box.x + cornerLen, box.y + box.height); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(box.x + box.width - cornerLen, box.y + box.height); ctx.lineTo(box.x + box.width, box.y + box.height); ctx.lineTo(box.x + box.width, box.y + box.height - cornerLen); ctx.stroke();

        ctx.fillStyle = boxColor;
        ctx.font = 'bold 13px JetBrains Mono';
        const statusTag = isKnown ? (isLateWindow ? ' [LATE]' : '') : '';
        const label = isKnown ? `${name} (${confidence}%)${statusTag}` : 'Unknown Person';
        const labelWidth = ctx.measureText(label).width + 12;
        ctx.globalAlpha = 0.85;
        ctx.fillRect(box.x, box.y - 24, labelWidth, 22);
        ctx.globalAlpha = 1;
        ctx.fillStyle = isKnown ? 'hsl(0, 0%, 100%)' : 'hsl(0, 0%, 100%)';
        ctx.fillText(label, box.x + 6, box.y - 8);

        if (isKnown && rollNumber) {
          ctx.fillStyle = boxColor;
          ctx.globalAlpha = 0.7;
          ctx.font = '11px JetBrains Mono';
          ctx.fillText(`Roll: ${rollNumber}`, box.x + 6, box.y + box.height + 16);
          ctx.globalAlpha = 1;
        }
      }
    }
    onFacesDetected?.(detected);
  }, [onAttendanceMarked, onFacesDetected]);

  // Session control
  const startSession = useCallback(() => {
    setSessionActive(true);
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = window.setInterval(detect, 400);
  }, [detect]);

  const stopSession = useCallback(() => {
    setSessionActive(false);
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
    onFacesDetected?.([]);
  }, [onFacesDetected]);

  const attendanceOpen = isAttendanceOpen();

  return (
    <div className="space-y-3">
      {/* Session Controls */}
      <div className="flex items-center gap-3">
        <Button
          onClick={startSession}
          disabled={status !== 'ready' || sessionActive}
          size="sm"
          className="gap-2"
        >
          <Play className="h-3.5 w-3.5" /> Start Attendance
        </Button>
        <Button
          onClick={stopSession}
          disabled={!sessionActive}
          variant="outline"
          size="sm"
          className="gap-2 text-destructive hover:text-destructive"
        >
          <Square className="h-3.5 w-3.5" /> Stop
        </Button>
        {/* Status badges */}
        <div className="flex items-center gap-2 ml-auto">
          {sessionActive ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-success/10 px-2.5 py-1 font-mono text-[10px] font-bold text-success">
              <Video className="h-3 w-3" /><span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" /> LIVE
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-2.5 py-1 font-mono text-[10px] font-bold text-muted-foreground">
              <VideoOff className="h-3 w-3" /> IDLE
            </span>
          )}
          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-mono text-[10px] font-bold ${
            attendanceOpen ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'
          }`}>
            {attendanceOpen ? 'OPEN' : 'CLOSED'}
          </span>
        </div>
      </div>

      {/* Video */}
      <div className="relative">
        <div className="relative overflow-hidden rounded-lg border border-glow">
          {status === 'loading' && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-card">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <p className="font-mono text-sm text-primary text-glow">INITIALIZING FACE DETECTION...</p>
            </div>
          )}
          {status === 'error' && (
            <div className="flex h-[360px] items-center justify-center bg-card">
              <p className="font-mono text-sm text-destructive">CAMERA ACCESS DENIED</p>
            </div>
          )}
          <video ref={videoRef} autoPlay muted playsInline className="block w-full" style={{ transform: 'scaleX(-1)' }} />
          <canvas ref={canvasRef} className="pointer-events-none absolute left-0 top-0 h-full w-full" style={{ transform: 'scaleX(-1)' }} />
          <div className="scanline pointer-events-none absolute inset-0" />
          <div className="pointer-events-none absolute left-3 top-3 font-mono text-xs text-primary/70">
            <p>SYS: FACE_DETECT v2.0</p>
            <p>MODE: {sessionActive ? 'RECOGNITION' : 'STANDBY'}</p>
          </div>
          <div className="pointer-events-none absolute bottom-3 right-3 font-mono text-xs text-primary/70">
            <p>{new Date().toLocaleDateString()}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
