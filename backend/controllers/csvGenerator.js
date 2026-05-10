/**
 * CSV Generation Utility
 * Automatically creates and maintains the hierarchical folder structure
 * of CSV files that mirror the database structure
 */

const fs = require('fs').promises;
const path = require('path');
const { createWriteStream } = require('fs');
const csv = require('csv-stringify/sync');

// Configuration
const BASE_PATH = path.join(process.cwd(), 'ira_data');

/**
 * Ensure directory exists (creates all needed parent directories)
 */
async function ensureDir(dirPath) {
  try {
    await fs.mkdir(dirPath, { recursive: true });
  } catch (error) {
    console.error(`Error creating directory ${dirPath}:`, error);
    throw error;
  }
}

/**
 * Read existing CSV file and return rows (excluding header)
 */
async function readCSVFile(filePath) {
  try {
    if (!(await fileExists(filePath))) {
      return [];
    }
    const content = await fs.readFile(filePath, 'utf-8');
    const lines = content.trim().split('\n');
    return lines.length > 1 ? lines.slice(1).map(line => line.split(',')) : [];
  } catch (error) {
    console.error(`Error reading CSV file ${filePath}:`, error);
    return [];
  }
}

/**
 * Check if file exists
 */
async function fileExists(filePath) {
  try {
    await fs.stat(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Write CSV file with headers and rows
 */
async function writeCSVFile(filePath, headers, rows = []) {
  try {
    await ensureDir(path.dirname(filePath));
    const output = csv([headers, ...rows]);
    await fs.writeFile(filePath, output);
  } catch (error) {
    console.error(`Error writing CSV file ${filePath}:`, error);
    throw error;
  }
}

/**
 * Append row to CSV file (with duplicate check)
 */
async function appendToCSVFile(filePath, headers, rowData) {
  try {
    await ensureDir(path.dirname(filePath));
    
    let rows = [];
    const fileAlreadyExists = await fileExists(filePath);
    
    if (fileAlreadyExists) {
      rows = await readCSVFile(filePath);
      
      // Check for duplicate
      const isDuplicate = rows.some(row => 
        row.join(',') === rowData.join(',')
      );
      
      if (isDuplicate) {
        console.log(`Duplicate entry, skipping: ${filePath}`);
        return;
      }
    }
    
    // Append row
    rows.push(rowData);
    await writeCSVFile(filePath, headers, rows);
  } catch (error) {
    console.error(`Error appending to CSV file ${filePath}:`, error);
    throw error;
  }
}

/**
 * Generate root states.csv
 */
async function generateStatesCSV(states) {
  const headers = ['code', 'name'];
  const rows = states.map(state => [state.code, state.name]);
  const filePath = path.join(BASE_PATH, 'states.csv');
  await writeCSVFile(filePath, headers, rows);
}

/**
 * Generate districts.csv for a state
 */
async function generateDistrictsCSV(stateName, districts) {
  const headers = ['code', 'name'];
  const rows = districts.map(district => [district.code, district.name]);
  const filePath = path.join(BASE_PATH, 'states', stateName, 'districts.csv');
  await writeCSVFile(filePath, headers, rows);
}

/**
 * Generate universities.csv for a district
 */
async function generateUniversitiesCSV(stateName, districtName, universities) {
  const headers = ['code', 'name', 'short_name'];
  const rows = universities.map(univ => [univ.code, univ.name, univ.short_name]);
  const filePath = path.join(BASE_PATH, 'states', stateName, 'districts', districtName, 'universities.csv');
  await writeCSVFile(filePath, headers, rows);
}

/**
 * Generate colleges.csv for a university
 */
async function generateCollegesCSV(stateName, districtName, universityName, colleges) {
  const headers = ['code', 'name', 'short_name', 'program_id'];
  const rows = colleges.map(college => [college.code, college.name, college.short_name, college.program_id || '']);
  const filePath = path.join(BASE_PATH, 'states', stateName, 'districts', districtName, 'universities', universityName, 'colleges.csv');
  await writeCSVFile(filePath, headers, rows);
}

/**
 * Generate degrees.csv for a college
 */
async function generateDegreesCSV(stateName, districtName, universityName, collegeName, degrees) {
  const headers = ['code', 'name', 'duration_years'];
  const rows = degrees.map(degree => [degree.code, degree.name, degree.duration_years]);
  const filePath = path.join(BASE_PATH, 'states', stateName, 'districts', districtName, 'universities', universityName, 'colleges', collegeName, 'degrees.csv');
  await writeCSVFile(filePath, headers, rows);
}

/**
 * Generate branches.csv for a degree
 */
async function generateBranchesCSV(stateName, districtName, universityName, collegeName, degreeName, branches) {
  const headers = ['name'];
  const rows = branches.map(branch => [branch]);
  const filePath = path.join(BASE_PATH, 'states', stateName, 'districts', districtName, 'universities', universityName, 'colleges', collegeName, 'degrees', degreeName, 'branches.csv');
  await writeCSVFile(filePath, headers, rows);
}

/**
 * Generate students.csv for a branch
 */
async function generateStudentsCSV(stateName, districtName, universityName, collegeName, degreeName, branchName, students) {
  const headers = ['student_unique_code', 'name', 'email', 'registration_timestamp'];
  const rows = students.map(student => [student.code, student.name, student.email, student.timestamp]);
  const filePath = path.join(BASE_PATH, 'states', stateName, 'districts', districtName, 'universities', universityName, 'colleges', collegeName, 'degrees', degreeName, 'branches', branchName, 'students.csv');
  await appendToCSVFile(filePath, headers, rows[0]); // Append one by one
}

/**
 * Main function to generate all CSVs after approval
 * Called during admin approval process
 */
async function generateAllCSVs(approvalData) {
  try {
    const {
      state,
      stateCode,
      district,
      districtCode,
      sector,
      university,
      universityCode,
      college,
      collegeCode,
      courses,
      programId
    } = approvalData;

    // 1. Generate/Update states.csv (only include relevant state)
    await appendToCSVFile(
      path.join(BASE_PATH, 'states.csv'),
      ['code', 'name'],
      [stateCode, state]
    );

    // 2. Generate/Update districts.csv
    await appendToCSVFile(
      path.join(BASE_PATH, 'states', state, 'districts.csv'),
      ['code', 'name'],
      [districtCode, district]
    );

    // 3. Generate/Update universities.csv
    await appendToCSVFile(
      path.join(BASE_PATH, 'states', state, 'districts', district, 'universities.csv'),
      ['code', 'name', 'short_name'],
      [universityCode, university.name, university.shortName]
    );

    // 4. Generate/Update colleges.csv (if college exists)
    if (college && college.name) {
      await appendToCSVFile(
        path.join(BASE_PATH, 'states', state, 'districts', district, 'universities', university.shortName, 'colleges.csv'),
        ['code', 'name', 'short_name', 'program_id'],
        [collegeCode, college.name, college.shortName, programId]
      );

      // 5. Generate degrees.csv for each course
      for (const course of courses) {
        await appendToCSVFile(
          path.join(BASE_PATH, 'states', state, 'districts', district, 'universities', university.shortName, 'colleges', college.name, 'degrees.csv'),
          ['code', 'name', 'duration_years'],
          [course.code, course.name, course.duration_years]
        );

        // 6. Generate branches.csv for each branch
        for (const branch of course.branches) {
          await appendToCSVFile(
            path.join(BASE_PATH, 'states', state, 'districts', district, 'universities', university.shortName, 'colleges', college.name, 'degrees', course.name, 'branches.csv'),
            ['name'],
            [branch]
          );

          // 7. Create empty students.csv (will be populated when students register)
          const studentsPath = path.join(BASE_PATH, 'states', state, 'districts', district, 'universities', university.shortName, 'colleges', college.name, 'degrees', course.name, 'branches', branch, 'students.csv');
          if (!(await fileExists(studentsPath))) {
            await writeCSVFile(studentsPath, ['student_unique_code', 'name', 'email', 'registration_timestamp'], []);
          }
        }
      }
    }

    console.log('CSV files generated successfully');
  } catch (error) {
    console.error('Error generating CSV files:', error);
    throw error;
  }
}

/**
 * Add a student record to the appropriate students.csv
 */
async function addStudent(stateName, districtName, universityName, collegeName, degreeName, branchName, studentData) {
  try {
    const filePath = path.join(BASE_PATH, 'states', stateName, 'districts', districtName, 'universities', universityName, 'colleges', collegeName, 'degrees', degreeName, 'branches', branchName, 'students.csv');
    
    await appendToCSVFile(
      filePath,
      ['student_unique_code', 'name', 'email', 'registration_timestamp'],
      [studentData.code, studentData.name, studentData.email, new Date().toISOString()]
    );
  } catch (error) {
    console.error('Error adding student to CSV:', error);
    throw error;
  }
}

/**
 * Clean all CSV files (for testing/reset)
 */
async function cleanAllCSVs() {
  try {
    const fs_sync = require('fs');
    if (fs_sync.existsSync(BASE_PATH)) {
      fs_sync.rmSync(BASE_PATH, { recursive: true, force: true });
      console.log('All CSV files cleaned');
    }
  } catch (error) {
    console.error('Error cleaning CSV files:', error);
    throw error;
  }
}

module.exports = {
  BASE_PATH,
  ensureDir,
  readCSVFile,
  writeCSVFile,
  appendToCSVFile,
  generateStatesCSV,
  generateDistrictsCSV,
  generateUniversitiesCSV,
  generateCollegesCSV,
  generateDegreesCSV,
  generateBranchesCSV,
  generateStudentsCSV,
  generateAllCSVs,
  addStudent,
  cleanAllCSVs
};
