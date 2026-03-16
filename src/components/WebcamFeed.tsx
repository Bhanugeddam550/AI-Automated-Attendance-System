import { useRef, useEffect, useState, useCallback } from 'react';
import {
  loadModels,
  faceapi,
  getRegisteredFaces,
  createFaceMatcher,
  markAttendance,
} from '@/lib/faceRecognition';

interface DetectedFace {
  name: string;
  confidence: number;
  box: { x: number; y: number; width: number; height: number };
}

interface WebcamFeedProps {
  onAttendanceMarked?: (name: string) => void;
  isRegistering?: boolean;
  onFaceCapture?: (descriptor: Float32Array) => void;
}

export default function WebcamFeed({ onAttendanceMarked, isRegistering, onFaceCapture }: WebcamFeedProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [detectedFaces, setDetectedFaces] = useState<DetectedFace[]>([]);
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

    if (isRegistering && detections.length > 0 && onFaceCapture) {
      onFaceCapture(detections[0].descriptor);
    }

    const faces = getRegisteredFaces();
    const matcher = createFaceMatcher(faces);

    const detected: DetectedFace[] = [];

    for (const det of resized) {
      const box = det.detection.box;
      let name = 'Unknown';
      let confidence = 0;

      if (matcher) {
        const match = matcher.findBestMatch(det.descriptor);
        if (match.label !== 'unknown') {
          name = match.label;
          confidence = Math.round((1 - match.distance) * 100);
          markAttendance(name) && onAttendanceMarked?.(name);
        }
      }

      detected.push({ name, confidence, box: { x: box.x, y: box.y, width: box.width, height: box.height } });

      if (ctx) {
        const isKnown = name !== 'Unknown';
        ctx.strokeStyle = isKnown ? 'hsl(175, 80%, 50%)' : 'hsl(0, 72%, 55%)';
        ctx.lineWidth = 2;
        ctx.strokeRect(box.x, box.y, box.width, box.height);

        // Draw corners
        const cornerLen = 12;
        ctx.lineWidth = 3;
        // Top-left
        ctx.beginPath(); ctx.moveTo(box.x, box.y + cornerLen); ctx.lineTo(box.x, box.y); ctx.lineTo(box.x + cornerLen, box.y); ctx.stroke();
        // Top-right
        ctx.beginPath(); ctx.moveTo(box.x + box.width - cornerLen, box.y); ctx.lineTo(box.x + box.width, box.y); ctx.lineTo(box.x + box.width, box.y + cornerLen); ctx.stroke();
        // Bottom-left
        ctx.beginPath(); ctx.moveTo(box.x, box.y + box.height - cornerLen); ctx.lineTo(box.x, box.y + box.height); ctx.lineTo(box.x + cornerLen, box.y + box.height); ctx.stroke();
        // Bottom-right
        ctx.beginPath(); ctx.moveTo(box.x + box.width - cornerLen, box.y + box.height); ctx.lineTo(box.x + box.width, box.y + box.height); ctx.lineTo(box.x + box.width, box.y + box.height - cornerLen); ctx.stroke();

        // Label
        ctx.fillStyle = isKnown ? 'hsl(175, 80%, 50%)' : 'hsl(0, 72%, 55%)';
        ctx.font = '14px JetBrains Mono';
        const label = isKnown ? `${name} (${confidence}%)` : 'Unknown';
        ctx.fillText(label, box.x, box.y - 8);
      }
    }
    setDetectedFaces(detected);
  }, [isRegistering, onFaceCapture, onAttendanceMarked]);

  useEffect(() => {
    if (status !== 'ready') return;
    intervalRef.current = window.setInterval(detect, 500);
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
          <div className="flex h-[480px] items-center justify-center bg-card">
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
        {/* HUD overlay */}
        <div className="pointer-events-none absolute left-3 top-3 font-mono text-xs text-primary/70">
          <p>SYS: FACE_DETECT v1.0</p>
          <p>FACES: {detectedFaces.length}</p>
          <p>{isRegistering ? 'MODE: REGISTER' : 'MODE: ATTENDANCE'}</p>
        </div>
        <div className="pointer-events-none absolute bottom-3 right-3 font-mono text-xs text-primary/70">
          <p>{new Date().toLocaleDateString()}</p>
        </div>
      </div>
    </div>
  );
}
