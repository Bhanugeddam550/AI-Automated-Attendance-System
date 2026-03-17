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

export interface Student {
  name: string;
  rollNumber: string;
  descriptors: number[][]; // multiple descriptors per student
  photoUrl?: string; // thumbnail for display
}

export interface AttendanceRecord {
  name: string;
  rollNumber: string;
  time: string;
  date: string;
  status: 'Present' | 'Absent';
}

export interface DetectedStudent {
  name: string;
  rollNumber: string;
  confidence: number;
  box: { x: number; y: number; width: number; height: number };
}

const STUDENTS_KEY = 'face-attendance-students';
const ATTENDANCE_KEY = 'face-attendance-log';

export function getStudents(): Student[] {
  const data = localStorage.getItem(STUDENTS_KEY);
  return data ? JSON.parse(data) : [];
}

export function saveStudent(student: Student): void {
  const students = getStudents();
  const existing = students.findIndex(s => s.rollNumber === student.rollNumber);
  if (existing >= 0) {
    // Merge descriptors
    students[existing].descriptors.push(...student.descriptors);
    if (student.photoUrl) students[existing].photoUrl = student.photoUrl;
  } else {
    students.push(student);
  }
  localStorage.setItem(STUDENTS_KEY, JSON.stringify(students));
}

export function removeStudent(rollNumber: string): void {
  const students = getStudents().filter(s => s.rollNumber !== rollNumber);
  localStorage.setItem(STUDENTS_KEY, JSON.stringify(students));
}

export function getAttendanceLog(): AttendanceRecord[] {
  const data = localStorage.getItem(ATTENDANCE_KEY);
  return data ? JSON.parse(data) : [];
}

export function markAttendance(name: string, rollNumber: string): boolean {
  const log = getAttendanceLog();
  const today = new Date().toLocaleDateString();
  const alreadyMarked = log.some(r => r.rollNumber === rollNumber && r.date === today);
  if (alreadyMarked) return false;

  log.push({
    name,
    rollNumber,
    time: new Date().toLocaleTimeString(),
    date: today,
    status: 'Present',
  });
  localStorage.setItem(ATTENDANCE_KEY, JSON.stringify(log));
  return true;
}

export function clearAttendanceLog(): void {
  localStorage.removeItem(ATTENDANCE_KEY);
}

export function createFaceMatcher(students: Student[]): faceapi.FaceMatcher | null {
  if (students.length === 0) return null;

  const labeled = students
    .filter(s => s.descriptors.length > 0)
    .map(s => new faceapi.LabeledFaceDescriptors(
      `${s.name}|${s.rollNumber}`,
      s.descriptors.map(d => new Float32Array(d))
    ));

  if (labeled.length === 0) return null;
  return new faceapi.FaceMatcher(labeled, 0.5); // stricter threshold
}

export function generateFullAttendance(): AttendanceRecord[] {
  const students = getStudents();
  const log = getAttendanceLog();
  const today = new Date().toLocaleDateString();
  const todayISO = new Date().toISOString().split('T')[0];

  // Sort students by roll number
  const sorted = [...students].sort((a, b) => a.rollNumber.localeCompare(b.rollNumber, undefined, { numeric: true }));

  return sorted.map(s => {
    const present = log.find(r => r.rollNumber === s.rollNumber && r.date === today);
    if (present) {
      return { ...present, date: todayISO };
    }
    return {
      name: s.name,
      rollNumber: s.rollNumber,
      time: '-',
      date: todayISO,
      status: 'Absent' as const,
    };
  });
}

export function exportAttendanceCSV(): void {
  const records = generateFullAttendance();
  if (records.length === 0) {
    const log = getAttendanceLog();
    if (log.length === 0) return;
    const csv = 'Roll Number,Name,Status,Time,Date\n' + log.map(r => `${r.rollNumber},${r.name},${r.status},${r.time},${r.date}`).join('\n');
    downloadCSV(csv);
    return;
  }
  const csv = 'Roll Number,Name,Status,Time,Date\n' + records.map(r => `${r.rollNumber},${r.name},${r.status},${r.time},${r.date}`).join('\n');
  downloadCSV(csv);
}

function downloadCSV(csv: string): void {
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `attendance_${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function extractDescriptorsFromImage(imageUrl: string): Promise<Float32Array[]> {
  await loadModels();
  const img = await faceapi.fetchImage(imageUrl);
  const detections = await faceapi.detectAllFaces(img).withFaceLandmarks().withFaceDescriptors();
  return detections.map(d => d.descriptor);
}

export { faceapi };
