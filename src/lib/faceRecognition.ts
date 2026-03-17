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
  descriptors: number[][];
  photoUrl?: string;
}

export interface MasterStudent {
  rollNumber: string;
  name: string;
  category: 'Regular' | 'Lateral Entry';
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

// --- Time Window Config ---
const ATTENDANCE_START_HOUR = 9;
const ATTENDANCE_START_MIN = 30;
const ATTENDANCE_END_HOUR = 9;
const ATTENDANCE_END_MIN = 50;

export function isAttendanceOpen(): boolean {
  const now = new Date();
  const h = now.getHours();
  const m = now.getMinutes();
  const currentMins = h * 60 + m;
  const startMins = ATTENDANCE_START_HOUR * 60 + ATTENDANCE_START_MIN;
  const endMins = ATTENDANCE_END_HOUR * 60 + ATTENDANCE_END_MIN;
  return currentMins >= startMins && currentMins <= endMins;
}

export function isAfterAttendanceWindow(): boolean {
  const now = new Date();
  const h = now.getHours();
  const m = now.getMinutes();
  const currentMins = h * 60 + m;
  const endMins = ATTENDANCE_END_HOUR * 60 + ATTENDANCE_END_MIN;
  return currentMins > endMins;
}

export function getAttendanceWindowText(): string {
  return `${String(ATTENDANCE_START_HOUR).padStart(2, '0')}:${String(ATTENDANCE_START_MIN).padStart(2, '0')} – ${String(ATTENDANCE_END_HOUR).padStart(2, '0')}:${String(ATTENDANCE_END_MIN).padStart(2, '0')}`;
}

// --- Predefined Master List ---
export function getMasterStudentList(): MasterStudent[] {
  const list: MasterStudent[] = [];

  // Regular students: 233B1A4201 to 233B1A4259
  for (let i = 1; i <= 59; i++) {
    const roll = `233B1A42${String(i).padStart(2, '0')}`;
    list.push({ rollNumber: roll, name: `Student_${i}`, category: 'Regular' });
  }

  // Lateral Entry: 243B1A4201 to 243B1A4206
  for (let i = 1; i <= 6; i++) {
    const roll = `243B1A42${String(i).padStart(2, '0')}`;
    list.push({ rollNumber: roll, name: `LE_Student_${i}`, category: 'Lateral Entry' });
  }

  // Override names from registered students
  const registered = getStudents();
  for (const ms of list) {
    const reg = registered.find(s => s.rollNumber === ms.rollNumber);
    if (reg) ms.name = reg.name;
  }

  return list;
}

// --- Storage ---
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
    students[existing].descriptors.push(...student.descriptors);
    if (student.photoUrl) students[existing].photoUrl = student.photoUrl;
    if (student.name) students[existing].name = student.name;
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
  // Only allow marking during the attendance window
  if (!isAttendanceOpen()) return false;

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
  return new faceapi.FaceMatcher(labeled, 0.5);
}

export function generateFullAttendance(): AttendanceRecord[] {
  const masterList = getMasterStudentList();
  const log = getAttendanceLog();
  const today = new Date().toLocaleDateString();
  const todayISO = new Date().toISOString().split('T')[0];

  return masterList.map(ms => {
    const present = log.find(r => r.rollNumber === ms.rollNumber && r.date === today);
    if (present) {
      return { ...present, date: todayISO, name: ms.name };
    }
    return {
      name: ms.name,
      rollNumber: ms.rollNumber,
      time: '-',
      date: todayISO,
      status: 'Absent' as const,
    };
  });
}

export function exportAttendanceCSV(): void {
  const records = generateFullAttendance();
  if (records.length === 0) return;
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
