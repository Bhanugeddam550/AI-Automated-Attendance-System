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

export type AttendanceStatus = 'Present' | 'Late' | 'Absent';

export interface AttendanceRecord {
  name: string;
  rollNumber: string;
  time: string;
  date: string;
  status: AttendanceStatus;
}

export interface DetectedStudent {
  name: string;
  rollNumber: string;
  confidence: number;
  box: { x: number; y: number; width: number; height: number };
}

// --- Time Window Config ---
const PRESENT_START_HOUR = 9;
const PRESENT_START_MIN = 30;
const PRESENT_END_HOUR = 9;
const PRESENT_END_MIN = 45;

const LATE_START_HOUR = 9;
const LATE_START_MIN = 46;
const LATE_END_HOUR = 10;
const LATE_END_MIN = 15;

export function getTimeWindowStatus(): 'before' | 'present' | 'late' | 'closed' {
  const now = new Date();
  const mins = now.getHours() * 60 + now.getMinutes();
  const presentStart = PRESENT_START_HOUR * 60 + PRESENT_START_MIN;
  const presentEnd = PRESENT_END_HOUR * 60 + PRESENT_END_MIN;
  const lateEnd = LATE_END_HOUR * 60 + LATE_END_MIN;

  if (mins < presentStart) return 'before';
  if (mins <= presentEnd) return 'present';
  if (mins <= lateEnd) return 'late';
  return 'closed';
}

export function isAttendanceOpen(): boolean {
  const status = getTimeWindowStatus();
  return status === 'present' || status === 'late';
}

export function isAfterAttendanceWindow(): boolean {
  return getTimeWindowStatus() === 'closed';
}

export function getAttendanceWindowText(): string {
  return `${String(PRESENT_START_HOUR).padStart(2, '0')}:${String(PRESENT_START_MIN).padStart(2, '0')} – ${String(LATE_END_HOUR).padStart(2, '0')}:${String(LATE_END_MIN).padStart(2, '0')}`;
}

export function getPresenceWindowText(): string {
  return `${String(PRESENT_START_HOUR).padStart(2, '0')}:${String(PRESENT_START_MIN).padStart(2, '0')} – ${String(PRESENT_END_HOUR).padStart(2, '0')}:${String(PRESENT_END_MIN).padStart(2, '0')}`;
}

export function getLateWindowText(): string {
  return `${String(LATE_START_HOUR).padStart(2, '0')}:${String(LATE_START_MIN).padStart(2, '0')} – ${String(LATE_END_HOUR).padStart(2, '0')}:${String(LATE_END_MIN).padStart(2, '0')}`;
}

// --- Predefined Master List ---
export function getMasterStudentList(): MasterStudent[] {
  const list: MasterStudent[] = [];
  for (let i = 1; i <= 59; i++) {
    const roll = `233B1A42${String(i).padStart(2, '0')}`;
    list.push({ rollNumber: roll, name: `Student_${i}`, category: 'Regular' });
  }
  for (let i = 1; i <= 6; i++) {
    const roll = `243B1A42${String(i).padStart(2, '0')}`;
    list.push({ rollNumber: roll, name: `LE_Student_${i}`, category: 'Lateral Entry' });
  }
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
  if (!isAttendanceOpen()) return false;

  const log = getAttendanceLog();
  const today = new Date().toLocaleDateString();
  const alreadyMarked = log.some(r => r.rollNumber === rollNumber && r.date === today);
  if (alreadyMarked) return false;

  const windowStatus = getTimeWindowStatus();
  const status: AttendanceStatus = windowStatus === 'late' ? 'Late' : 'Present';

  log.push({
    name,
    rollNumber,
    time: new Date().toLocaleTimeString(),
    date: today,
    status,
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
