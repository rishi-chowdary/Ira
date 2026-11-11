import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

import { createObjectCsvWriter } from 'csv-writer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const exportRoot = process.env.IRA_DATA_DIR || path.join(__dirname, '../../database/reference_data');

async function writeCsv(filePath, headers, records) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  const writer = createObjectCsvWriter({
    path: filePath,
    header: headers.map((header) => ({ id: header.id, title: header.title })),
  });
  await writer.writeRecords(records);
}

export async function exportHierarchySnapshot(store) {
  await fs.mkdir(exportRoot, { recursive: true });

  await writeCsv(
    path.join(exportRoot, 'states.csv'),
    [
      { id: 'code', title: 'code' },
      { id: 'name', title: 'name' },
    ],
    store.states,
  );

  for (const state of store.states) {
    const stateDir = path.join(exportRoot, 'states', state.code);
    const districts = store.districts.filter((district) => district.stateCode === state.code);
    await writeCsv(
      path.join(stateDir, 'districts.csv'),
      [
        { id: 'code', title: 'code' },
        { id: 'name', title: 'name' },
      ],
      districts,
    );

    for (const district of districts) {
      const districtDir = path.join(stateDir, 'districts', district.code);
      const universities = store.universities.filter(
        (university) => university.stateCode === state.code && university.districtCode === district.code,
      );
      const colleges = store.colleges.filter(
        (college) => college.stateCode === state.code && college.districtCode === district.code,
      );
      const programs = store.collegePrograms.filter((program) =>
        colleges.some((college) => college.id === program.collegeId),
      );
      const students = store.users.filter((user) =>
        colleges.some((college) => college.id === user.collegeId),
      );

      await writeCsv(
        path.join(districtDir, 'universities.csv'),
        [
          { id: 'code', title: 'code' },
          { id: 'name', title: 'name' },
          { id: 'shortName', title: 'short_name' },
        ],
        universities,
      );

      await writeCsv(
        path.join(districtDir, 'colleges.csv'),
        [
          { id: 'collegeCode', title: 'college_code' },
          { id: 'collegeName', title: 'college_name' },
          { id: 'universityName', title: 'university_name' },
          { id: 'loginCode', title: 'program_id' },
        ],
        colleges,
      );

      await writeCsv(
        path.join(districtDir, 'degrees.csv'),
        [
          { id: 'courseCode', title: 'course_code' },
          { id: 'courseName', title: 'course_name' },
          { id: 'programId', title: 'program_id' },
        ],
        programs,
      );

      await writeCsv(
        path.join(districtDir, 'branches.csv'),
        [
          { id: 'courseName', title: 'course_name' },
          { id: 'branch', title: 'branch' },
        ],
        programs.flatMap((program) =>
          (program.branches || []).map((branch) => ({
            courseName: program.courseName,
            branch,
          })),
        ),
      );

      await writeCsv(
        path.join(districtDir, 'students.csv'),
        [
          { id: 'enrollment_number', title: 'enrollment_no' },
          { id: 'full_name', title: 'name' },
          { id: 'college_email', title: 'college_email' },
          { id: 'course_name', title: 'course' },
          { id: 'year', title: 'year' },
          { id: 'student_status', title: 'status' },
        ],
        students,
      );
    }
  }
}

export function queueHierarchyExport(snapshot) {
  setImmediate(() => {
    exportHierarchySnapshot(snapshot).catch((error) => {
      console.error('CSV export failed:', error);
    });
  });
}
