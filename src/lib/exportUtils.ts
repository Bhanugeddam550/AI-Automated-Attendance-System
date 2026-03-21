import { generateFullAttendance, type AttendanceRecord } from './faceRecognition';

export function exportAttendanceExcel(): void {
  import('xlsx').then(XLSX => {
    const records = generateFullAttendance();
    if (records.length === 0) return;

    const data = records.map(r => ({
      'Roll Number': r.rollNumber,
      'Name': r.name,
      'Status': r.status,
      'Time': r.time,
      'Date': r.date,
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Attendance');

    // Column widths
    ws['!cols'] = [{ wch: 15 }, { wch: 20 }, { wch: 10 }, { wch: 12 }, { wch: 12 }];

    XLSX.writeFile(wb, `attendance_${new Date().toISOString().split('T')[0]}.xlsx`);
  });
}

export function exportAttendancePDF(): void {
  import('jspdf').then(({ default: jsPDF }) => {
    import('jspdf-autotable').then(() => {
      const records = generateFullAttendance();
      if (records.length === 0) return;

      const doc = new jsPDF();
      const date = new Date().toISOString().split('T')[0];

      // Title
      doc.setFontSize(16);
      doc.text('FaceCheck - Attendance Report', 14, 20);
      doc.setFontSize(10);
      doc.text(`Date: ${date}`, 14, 28);

      const present = records.filter(r => r.status === 'Present').length;
      const late = records.filter(r => r.status === 'Late').length;
      const absent = records.filter(r => r.status === 'Absent').length;
      doc.text(`Total: ${records.length} | Present: ${present} | Late: ${late} | Absent: ${absent}`, 14, 34);

      // Table
      (doc as any).autoTable({
        startY: 40,
        head: [['#', 'Roll Number', 'Name', 'Status', 'Time', 'Date']],
        body: records.map((r, i) => [i + 1, r.rollNumber, r.name, r.status, r.time, r.date]),
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [255, 206, 153], textColor: [60, 40, 10], fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [255, 253, 241] },
      });

      doc.save(`attendance_${date}.pdf`);
    });
  });
}

export function manuallyUpdateAttendance(rollNumber: string, newStatus: 'Present' | 'Late' | 'Absent'): void {
  const ATTENDANCE_KEY = 'face-attendance-log';
  const raw = localStorage.getItem(ATTENDANCE_KEY);
  const log: AttendanceRecord[] = raw ? JSON.parse(raw) : [];
  const today = new Date().toLocaleDateString();

  const existingIdx = log.findIndex(r => r.rollNumber === rollNumber && r.date === today);

  if (newStatus === 'Absent') {
    // Remove from log so generateFullAttendance marks absent
    if (existingIdx >= 0) {
      log.splice(existingIdx, 1);
    }
  } else {
    const record: AttendanceRecord = {
      name: '',
      rollNumber,
      time: new Date().toLocaleTimeString(),
      date: today,
      status: newStatus,
    };
    if (existingIdx >= 0) {
      record.name = log[existingIdx].name;
      log[existingIdx] = record;
    } else {
      // Need to find name from master list
      record.name = rollNumber; // Will be resolved by generateFullAttendance
      log.push(record);
    }
  }

  localStorage.setItem(ATTENDANCE_KEY, JSON.stringify(log));
}
