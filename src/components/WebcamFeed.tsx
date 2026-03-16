import { useRef, useEffect, useState, useCallback } from 'react';
import {
  loadModels,
  faceapi,
  getStudents,
  createFaceMatcher,
  markAttendance,
  type DetectedStudent,
} from '@/lib/faceRecognition';

interface WebcamFeedProps {
  onAttendanceMarked?: (name: string, rollNumber: string) => void;
  onFacesDetected?: (faces: DetectedStudent[]) => void;
}

export default function WebcamFeed({ onAttendanceMarked, onFacesDetected }: WebcamFeedProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    let stream: MediaStream | null = null;

    async function init() {
      try {
        setStatus('loading');
        await loadModels();
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480, facingMode: 'user' },
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setStatus('ready');
      } catch {
        setStatus('error');
      }
    }

    init();

    return () => {
      if (stream) stream.getTracks().forEach(t => t.stop());
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const detect = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    if (video.readyState < 2) return;

    const detections = await faceapi
      .detectAllFaces(video)
      .withFaceLandmarks()
      .withFaceDescriptors();

    const canvas = canvasRef.current;
    const displaySize = { width: video.videoWidth, height: video.videoHeight };
    faceapi.matchDimensions(canvas, displaySize);
    const resized = faceapi.resizeResults(detections, displaySize);

    const ctx = canvas.getContext('2d');
    if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);

    const students = getStudents();
    const matcher = createFaceMatcher(students);

    const detected: DetectedStudent[] = [];

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
        ctx.strokeStyle = isKnown ? 'hsl(175, 80%, 50%)' : 'hsl(0, 72%, 55%)';
        ctx.lineWidth = 2;
        ctx.strokeRect(box.x, box.y, box.width, box.height);

        const cornerLen = 12;
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(box.x, box.y + cornerLen); ctx.lineTo(box.x, box.y); ctx.lineTo(box.x + cornerLen, box.y); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(box.x + box.width - cornerLen, box.y); ctx.lineTo(box.x + box.width, box.y); ctx.lineTo(box.x + box.width, box.y + cornerLen); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(box.x, box.y + box.height - cornerLen); ctx.lineTo(box.x, box.y + box.height); ctx.lineTo(box.x + cornerLen, box.y + box.height); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(box.x + box.width - cornerLen, box.y + box.height); ctx.lineTo(box.x + box.width, box.y + box.height); ctx.lineTo(box.x + box.width, box.y + box.height - cornerLen); ctx.stroke();

        // Label background
        ctx.fillStyle = isKnown ? 'hsl(175, 80%, 50%)' : 'hsl(0, 72%, 55%)';
        ctx.font = 'bold 13px JetBrains Mono';
        const label = isKnown ? `${name} (${confidence}%)` : 'Unknown Person';
        const labelWidth = ctx.measureText(label).width + 12;
        ctx.globalAlpha = 0.85;
        ctx.fillRect(box.x, box.y - 24, labelWidth, 22);
        ctx.globalAlpha = 1;
        ctx.fillStyle = isKnown ? 'hsl(220, 20%, 7%)' : 'hsl(0, 0%, 100%)';
        ctx.fillText(label, box.x + 6, box.y - 8);

        if (isKnown && rollNumber) {
          ctx.fillStyle = 'hsl(175, 80%, 50%)';
          ctx.globalAlpha = 0.7;
          ctx.font = '11px JetBrains Mono';
          ctx.fillText(`Roll: ${rollNumber}`, box.x + 6, box.y + box.height + 16);
          ctx.globalAlpha = 1;
        }
      }
    }

    onFacesDetected?.(detected);
  }, [onAttendanceMarked, onFacesDetected]);

  useEffect(() => {
    if (status !== 'ready') return;
    intervalRef.current = window.setInterval(detect, 400);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [status, detect]);

  return (
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
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className="block w-full"
          style={{ transform: 'scaleX(-1)' }}
        />
        <canvas
          ref={canvasRef}
          className="pointer-events-none absolute left-0 top-0 h-full w-full"
          style={{ transform: 'scaleX(-1)' }}
        />
        <div className="scanline pointer-events-none absolute inset-0" />
        <div className="pointer-events-none absolute left-3 top-3 font-mono text-xs text-primary/70">
          <p>SYS: FACE_DETECT v2.0</p>
          <p>MODE: RECOGNITION</p>
        </div>
        <div className="pointer-events-none absolute bottom-3 right-3 font-mono text-xs text-primary/70">
          <p>{new Date().toLocaleDateString()}</p>
        </div>
      </div>
    </div>
  );
}
