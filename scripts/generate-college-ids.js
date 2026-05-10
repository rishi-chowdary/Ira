#!/usr/bin/env node

/**
 * College & Program ID Generator CLI
 * Generates IRA account IDs for colleges, programs, and students
 */

// ID generation functions (from src/lib/idGenerator.ts)
function generateLendingAccountId(state, district, sector, sequence) {
  return `IN/${state.toUpperCase()}/${district.substring(0, 3).toUpperCase()}/S${sector}/${String(sequence).padStart(5, '0')}`;
}

function generateBorrowingAccountId(state, district, university, college, course, sequence) {
  return `IN/${state.toUpperCase()}/${district.substring(0, 3).toUpperCase()}/${university.substring(0, 4).toUpperCase()}/${college.substring(0, 3).toUpperCase()}/${course.substring(0, 3).toUpperCase()}/${String(sequence).padStart(5, '0')}`;
}

function generateCollegeProgramId(state, district, sector, course, startYear, endYear) {
  return `IN/${state.toUpperCase()}/${district.substring(0, 3).toUpperCase()}/S${sector}/${course.substring(0, 4).toUpperCase()}/${startYear}/${endYear}`;
}

// Command-line argument parsing
const [, , command, ...args] = process.argv;

if (!command || command === '--help' || command === '-h') {
  console.log(`
╎ IRA College & Program ID Generator
╠══════════════════════════════════════════════════════════════════════════════
║
║ Usage:  node generate-college-ids.js <command> [options]
║
║ Commands:
║   college    Generate college program ID
║   borrowing  Generate borrowing (student) account ID
║   lending    Generate lending account ID
║   sample     Show sample IDs (default)
║
║ College Program ID:
║   node generate-college-ids.js college --state MH --district Pune --sector 12 --course CSE --start 2023 --end 2027
║
║ Borrowing Account ID:
║   node generate-college-ids.js borrowing --state MH --district Pune --uni SPPU --college MIT --course CSE --seq 10001
║
║ Lending Account ID:
║   node generate-college-ids.js lending --state MH --district Pune --sector 12 --seq 10001
║
║ Samples:
║   node generate-college-ids.js sample
║
  `);
  process.exit(0);
}

function parseArgs(args) {
  const obj = {};
  for (let i = 0; i < args.length; i += 2) {
    const key = args[i].replace(/^--/, '');
    obj[key] = args[i + 1];
  }
  return obj;
}

const opts = parseArgs(args);

if (command === 'sample') {
  console.log(`\n╎ Sample IRA IDs
╠════════════════════════════════════════════════════════════════════════════╗\n`);

  // Sample colleges with programs
  const sampleColleges = [
    {
      name: 'MIT Pune',
      state: 'MH',
      district: 'Pune',
      sector: '12',
      university: 'SPPU',
      code: 'MIT',
      programs: [
        { course: 'CSE', startYear: 2023, endYear: 2027 },
        { course: 'Mechanical', startYear: 2023, endYear: 2027 },
        { course: 'Electrical', startYear: 2023, endYear: 2027 },
      ],
      students: [
        { name: 'Aarav Sharma', course: 'CSE', seq: 10001 },
        { name: 'Vihaan Mehta', course: 'CSE', seq: 10002 },
        { name: 'Diya Patil', course: 'Mechanical', seq: 10003 },
      ],
    },
    {
      name: 'Symbiosis Pune',
      state: 'MH',
      district: 'Pune',
      sector: '8',
      university: 'Symbiosis',
      code: 'SYM',
      programs: [
        { course: 'BBA', startYear: 2024, endYear: 2027 },
        { course: 'Management', startYear: 2023, endYear: 2027 },
      ],
      students: [
        { name: 'Riya Menon', course: 'BBA', seq: 20001 },
      ],
    },
    {
      name: 'Rural College',
      state: 'MH',
      district: 'Rural',
      sector: '45',
      university: 'RuralUniv',
      code: 'RUR',
      programs: [
        { course: 'Arts', startYear: 2025, endYear: 2028 },
        { course: 'Science', startYear: 2024, endYear: 2028 },
      ],
      students: [
        { name: 'Karthik Iyer', course: 'Arts', seq: 30001 },
      ],
    },
  ];

  sampleColleges.forEach((college) => {
    console.log(`\n📚 ${college.name.toUpperCase()} (${college.state}/${college.district})`);
    console.log(`   Location: Sector ${college.sector}`);

    console.log(`\n   Program IDs:`);
    college.programs.forEach((prog) => {
      const progId = generateCollegeProgramId(
        college.state,
        college.district,
        college.sector,
        prog.course,
        prog.startYear,
        prog.endYear
      );
      console.log(`     • ${prog.course} (${prog.startYear}-${prog.endYear}): ${progId}`);
    });

    console.log(`\n   Student Borrowing Account IDs:`);
    college.students.forEach((student) => {
      const borrowingId = generateBorrowingAccountId(
        college.state,
        college.district,
        college.university,
        college.code,
        student.course.substring(0, 3).toUpperCase(),
        student.seq
      );
      console.log(`     • ${student.name} (${student.course}): ${borrowingId}`);
    });
    console.log();
  });

  console.log(`\n╎ Lending Account IDs (for investors by sector)
╠════════════════════════════════════════════════════════════════════════════╗\n`);

  const lendingSectors = [
    { state: 'MH', district: 'Pune', sector: '12', lenders: [1, 2, 3] },
    { state: 'MH', district: 'Pune', sector: '8', lenders: [1, 2] },
    { state: 'MH', district: 'Rural', sector: '45', lenders: [1] },
  ];

  lendingSectors.forEach((region) => {
    console.log(`${region.state}/${region.district.substring(0, 3).toUpperCase()}/Sector ${region.sector}:`);
    region.lenders.forEach((seq) => {
      const lendingId = generateLendingAccountId(region.state, region.district, region.sector, 10000 + seq);
      console.log(`  • Investor ${seq}: ${lendingId}`);
    });
    console.log();
  });

  process.exit(0);
}

if (command === 'college') {
  const { state, district, sector, course, start, end } = opts;
  if (!state || !district || !sector || !course || !start || !end) {
    console.error('❌ Missing required arguments');
    console.error('   Usage: --state MH --district Pune --sector 12 --course CSE --start 2023 --end 2027');
    process.exit(1);
  }
  const id = generateCollegeProgramId(state, district, sector, course, parseInt(start), parseInt(end));
  console.log(`\n✓ College Program ID: ${id}\n`);
  process.exit(0);
}

if (command === 'borrowing') {
  const { state, district, uni, college, course, seq } = opts;
  if (!state || !district || !uni || !college || !course || !seq) {
    console.error('❌ Missing required arguments');
    console.error('   Usage: --state MH --district Pune --uni SPPU --college MIT --course CSE --seq 10001');
    process.exit(1);
  }
  const id = generateBorrowingAccountId(state, district, uni, college, course, parseInt(seq));
  console.log(`\n✓ Borrowing Account ID: ${id}\n`);
  process.exit(0);
}

if (command === 'lending') {
  const { state, district, sector, seq } = opts;
  if (!state || !district || !sector || !seq) {
    console.error('❌ Missing required arguments');
    console.error('   Usage: --state MH --district Pune --sector 12 --seq 10001');
    process.exit(1);
  }
  const id = generateLendingAccountId(state, district, sector, parseInt(seq));
  console.log(`\n✓ Lending Account ID: ${id}\n`);
  process.exit(0);
}

console.error(`❌ Unknown command: ${command}`);
console.error('   Run: node generate-college-ids.js --help');
process.exit(1);
