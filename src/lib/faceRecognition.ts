import * as faceapi from 'face-api.js';

const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.12/model/';

let modelsLoaded = false;

export async function loadModels(): Promise<void> {
  if (modelsLoaded) return;
  await Promise.all([
    faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
    faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
    faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
  ]);
  modelsLoaded = true;
}

export interface RegisteredFace {
  name: string;
  descriptor: number[];
}

const STORAGE_KEY = 'face-attendance-faces';
const ATTENDANCE_KEY = 'face-attendance-log';

export interface AttendanceRecord {
  name: string;
  time: string;
  date: string;
}

export function getRegisteredFaces(): RegisteredFace[] {
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : [];
}

export function saveRegisteredFace(face: RegisteredFace): void {
  const faces = getRegisteredFaces();
  faces.push(face);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(faces));
}

export function removeRegisteredFace(name: string): void {
  const faces = getRegisteredFaces().filter(f => f.name !== name);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(faces));
}

export function getAttendanceLog(): AttendanceRecord[] {
  const data = localStorage.getItem(ATTENDANCE_KEY);
  return data ? JSON.parse(data) : [];
}

export function markAttendance(name: string): boolean {
  const log = getAttendanceLog();
  const today = new Date().toLocaleDateString();
  const alreadyMarked = log.some(r => r.name === name && r.date === today);
  if (alreadyMarked) return false;

  log.push({
    name,
    time: new Date().toLocaleTimeString(),
    date: today,
  });
  localStorage.setItem(ATTENDANCE_KEY, JSON.stringify(log));
  return true;
}

export function clearAttendanceLog(): void {
  localStorage.removeItem(ATTENDANCE_KEY);
}

export function createFaceMatcher(faces: RegisteredFace[]): faceapi.FaceMatcher | null {
  if (faces.length === 0) return null;

  const labeledDescriptors = new Map<string, Float32Array[]>();
  
  for (const face of faces) {
    const arr = labeledDescriptors.get(face.name) || [];
    arr.push(new Float32Array(face.descriptor));
    labeledDescriptors.set(face.name, arr);
  }

  const labeled = Array.from(labeledDescriptors.entries()).map(
    ([name, descriptors]) => new faceapi.LabeledFaceDescriptors(name, descriptors)
  );

  return new faceapi.FaceMatcher(labeled, 0.55);
}

export function exportAttendanceCSV(): void {
  const log = getAttendanceLog();
  const csv = 'Name,Time,Date\n' + log.map(r => `${r.name},${r.time},${r.date}`).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'attendance.csv';
  a.click();
  URL.revokeObjectURL(url);
}

export { faceapi };
