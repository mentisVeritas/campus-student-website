import bcrypt from "bcryptjs";
import {
  AttendanceStatus,
  DayOfWeek,
  DocumentType,
  GradeType,
  MealCategory,
  RequestStatus,
  Role,
} from "@prisma/client";
import { prisma } from "../src/lib/prisma";

type CreatedUser = {
  id: string;
  email: string;
  role: Role;
  firstName: string;
  lastName: string;
};

const TEACHER_PASSWORD = "Teacher123!";
const STUDENT_PASSWORD = "Student123!";

async function createUser(data: {
  email: string;
  password: string;
  role: Role;
  firstName: string;
  lastName: string;
  phone?: string;
}) {
  const passwordHash = await bcrypt.hash(data.password, 12);
  return prisma.user.create({
    data: {
      email: data.email,
      passwordHash,
      role: data.role,
      firstName: data.firstName,
      lastName: data.lastName,
      phone: data.phone,
    },
  });
}

async function main() {
  await prisma.attendance.deleteMany();
  await prisma.portfolioAchievement.deleteMany();
  await prisma.portfolio.deleteMany();
  await prisma.academicRanking.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.sportsRegistration.deleteMany();
  await prisma.sportsSection.deleteMany();
  await prisma.lostFoundItem.deleteMany();
  await prisma.bulletinPost.deleteMany();
  await prisma.documentRequest.deleteMany();
  await prisma.canteenItem.deleteMany();
  await prisma.canteenMenu.deleteMany();
  await prisma.eventRegistration.deleteMany();
  await prisma.event.deleteMany();
  await prisma.announcement.deleteMany();
  await prisma.grade.deleteMany();
  await prisma.scheduleItem.deleteMany();
  await prisma.classTeacher.deleteMany();
  await prisma.classSubject.deleteMany();
  await prisma.teacherSubject.deleteMany();
  await prisma.teacher.deleteMany();
  await prisma.student.deleteMany();
  await prisma.councilNews.deleteMany();
  await prisma.subject.deleteMany();
  await prisma.class.deleteMany();
  await prisma.user.deleteMany();

  const admin = await createUser({
    email: "admin@university.edu",
    password: "Admin123!",
    role: Role.ADMIN,
    firstName: "Admin",
    lastName: "User",
    phone: "+998901112233",
  });
  await prisma.user.update({
    where: { id: admin.id },
    data: { isSuperAdmin: true },
  });

  const canteenStaffUser = await createUser({
    email: "canteen@university.edu",
    password: "Canteen123!",
    role: Role.CANTEEN_STAFF,
    firstName: "Dilshod",
    lastName: "Chef",
  });

  const teacherSeeds = [
    {
      email: "madina.karimova@university.edu",
      firstName: "Madina",
      lastName: "Karimova",
      employeeId: "TCH-1001",
      department: "Mathematics",
      subjectCodes: ["DISCRETE_MATH", "ALGORITHMS"],
    },
    {
      email: "aziz.rasulov@university.edu",
      firstName: "Aziz",
      lastName: "Rasulov",
      employeeId: "TCH-1002",
      department: "Computer Science",
      subjectCodes: ["WEB_DEVELOPMENT", "DATABASE_SYSTEMS"],
    },
    {
      email: "sardor.qodirov@university.edu",
      firstName: "Sardor",
      lastName: "Qodirov",
      employeeId: "TCH-1003",
      department: "Physics",
      subjectCodes: ["PHYSICS"],
    },
    {
      email: "nargiza.usmanova@university.edu",
      firstName: "Nargiza",
      lastName: "Usmanova",
      employeeId: "TCH-1004",
      department: "Artificial Intelligence",
      subjectCodes: ["ALGORITHMS", "MACHINE_LEARNING_BASICS"],
    },
    {
      email: "kamol.yuldashev@university.edu",
      firstName: "Kamol",
      lastName: "Yuldashev",
      employeeId: "TCH-1005",
      department: "Cybersecurity",
      subjectCodes: ["NETWORK_SECURITY", "CRYPTOGRAPHY_BASICS", "SECURE_CODING"],
    },
    {
      email: "nilufar.saidova@university.edu",
      firstName: "Nilufar",
      lastName: "Saidova",
      employeeId: "TCH-1006",
      department: "UI/UX Design",
      subjectCodes: ["UX_RESEARCH", "INTERACTION_DESIGN"],
    },
    {
      email: "bekzod.rajabov@university.edu",
      firstName: "Bekzod",
      lastName: "Rajabov",
      employeeId: "TCH-1007",
      department: "Business Analytics",
      subjectCodes: ["DATA_VISUALIZATION", "BUSINESS_ANALYTICS"],
    },
    {
      email: "dilshod.kamilov@university.edu",
      firstName: "Dilshod",
      lastName: "Kamilov",
      employeeId: "TCH-1008",
      department: "Mathematics",
      subjectCodes: ["DISCRETE_MATH", "DATABASE_SYSTEMS"],
    },
    {
      email: "rustam.rakhmonov@university.edu",
      firstName: "Rustam",
      lastName: "Rakhmonov",
      employeeId: "TCH-1009",
      department: "Software Engineering",
      subjectCodes: ["WEB_DEVELOPMENT", "DATABASE_SYSTEMS", "SECURE_CODING"],
    },
    {
      email: "eldor.karimov@university.edu",
      firstName: "Eldor",
      lastName: "Karimov",
      employeeId: "TCH-1010",
      department: "Artificial Intelligence",
      subjectCodes: ["ALGORITHMS", "MACHINE_LEARNING_BASICS", "DATA_VISUALIZATION"],
    },
    {
      email: "lola.iskandarova@university.edu",
      firstName: "Lola",
      lastName: "Iskandarova",
      employeeId: "TCH-1011",
      department: "Physics",
      subjectCodes: ["PHYSICS", "DISCRETE_MATH"],
    },
    {
      email: "diyor.hasanov@university.edu",
      firstName: "Diyor",
      lastName: "Hasanov",
      employeeId: "TCH-1012",
      department: "Cybersecurity",
      subjectCodes: ["NETWORK_SECURITY", "CRYPTOGRAPHY_BASICS"],
    },
    {
      email: "sevara.akhmedova@university.edu",
      firstName: "Sevara",
      lastName: "Akhmedova",
      employeeId: "TCH-1013",
      department: "Business Analytics",
      subjectCodes: ["DATA_VISUALIZATION", "BUSINESS_ANALYTICS"],
    },
    {
      email: "marina.sultanova@university.edu",
      firstName: "Marina",
      lastName: "Sultanova",
      employeeId: "TCH-1014",
      department: "UI/UX Design",
      subjectCodes: ["UX_RESEARCH", "INTERACTION_DESIGN"],
    },
    {
      email: "umid.tohirov@university.edu",
      firstName: "Umid",
      lastName: "Tohirov",
      employeeId: "TCH-1015",
      department: "Cybersecurity",
      subjectCodes: ["NETWORK_SECURITY", "SECURE_CODING"],
    },
  ] as const;

  const teacherUsers = await Promise.all(
    teacherSeeds.map((teacher) =>
      createUser({
        email: teacher.email,
        password: TEACHER_PASSWORD,
        role: Role.TEACHER,
        firstName: teacher.firstName,
        lastName: teacher.lastName,
      }),
    ),
  );

  const teacherProfiles = await Promise.all(
    teacherUsers.map((user, index) =>
      prisma.teacher.create({
        data: {
          userId: user.id,
          employeeId: teacherSeeds[index].employeeId,
          department: teacherSeeds[index].department,
        },
      }),
    ),
  );

  const classSeeds = [
    { name: "CS-24-01", year: 1 },
    { name: "CS-24-02", year: 1 },
    { name: "SE-24-01", year: 1 },
    { name: "DS-24-01", year: 1 },
    { name: "AI-24-01", year: 1 },
    { name: "CSec-24-01", year: 1 },
    { name: "BA-24-01", year: 1 },
    { name: "UIUX-24-01", year: 1 },
    { name: "CS-23-01", year: 2 },
    { name: "SE-23-01", year: 2 },
    { name: "DS-23-01", year: 2 },
    { name: "AI-23-01", year: 2 },
    { name: "CSec-23-01", year: 2 },
    { name: "BA-23-01", year: 2 },
    { name: "UIUX-23-01", year: 2 },
    { name: "CS-22-01", year: 3 },
    { name: "SE-22-01", year: 3 },
    { name: "DS-22-01", year: 3 },
    { name: "AI-22-01", year: 3 },
  ] as const;
  const classes = await Promise.all(classSeeds.map((item) => prisma.class.create({ data: item })));

  const subjects = await Promise.all([
    prisma.subject.create({ data: { name: "Discrete Math", code: "DISCRETE_MATH", credits: 4 } }),
    prisma.subject.create({ data: { name: "Web Development", code: "WEB_DEVELOPMENT", credits: 4 } }),
    prisma.subject.create({ data: { name: "Database Systems", code: "DATABASE_SYSTEMS", credits: 5 } }),
    prisma.subject.create({ data: { name: "Algorithms", code: "ALGORITHMS", credits: 5 } }),
    prisma.subject.create({ data: { name: "Physics", code: "PHYSICS", credits: 3 } }),
    prisma.subject.create({ data: { name: "Network Security", code: "NETWORK_SECURITY", credits: 4 } }),
    prisma.subject.create({ data: { name: "Cryptography Basics", code: "CRYPTOGRAPHY_BASICS", credits: 4 } }),
    prisma.subject.create({ data: { name: "Secure Coding", code: "SECURE_CODING", credits: 4 } }),
    prisma.subject.create({ data: { name: "UX Research", code: "UX_RESEARCH", credits: 3 } }),
    prisma.subject.create({ data: { name: "Interaction Design", code: "INTERACTION_DESIGN", credits: 4 } }),
    prisma.subject.create({ data: { name: "Machine Learning Basics", code: "MACHINE_LEARNING_BASICS", credits: 4 } }),
    prisma.subject.create({ data: { name: "Data Visualization", code: "DATA_VISUALIZATION", credits: 3 } }),
    prisma.subject.create({ data: { name: "Business Analytics", code: "BUSINESS_ANALYTICS", credits: 4 } }),
  ]);

  const teacherToSubject: Array<[number, number]> = [];
  const subjectIndexByCode = new Map(subjects.map((subject, index) => [subject.code, index]));
  teacherSeeds.forEach((teacher, teacherIndex) => {
    teacher.subjectCodes.forEach((code) => {
      const subjectIndex = subjectIndexByCode.get(code);
      if (subjectIndex !== undefined) {
        teacherToSubject.push([teacherIndex, subjectIndex]);
      }
    });
  });
  await Promise.all(
    teacherToSubject.map(([teacherIndex, subjectIndex]) =>
      prisma.teacherSubject.create({
        data: {
          teacherId: teacherProfiles[teacherIndex].id,
          subjectId: subjects[subjectIndex].id,
        },
      }),
    ),
  );
  const teacherBySubjectCode = new Map<string, (typeof teacherProfiles)[number]>();
  teacherSeeds.forEach((teacherSeed, teacherIndex) => {
    teacherSeed.subjectCodes.forEach((code) => {
      if (!teacherBySubjectCode.has(code)) {
        teacherBySubjectCode.set(code, teacherProfiles[teacherIndex]);
      }
    });
  });

  const subjectsByCode = new Map(subjects.map((subject) => [subject.code, subject]));
  const directionSubjectCodes: Record<string, string[]> = {
    CS: ["DISCRETE_MATH", "WEB_DEVELOPMENT", "DATABASE_SYSTEMS", "ALGORITHMS", "PHYSICS"],
    SE: ["WEB_DEVELOPMENT", "DATABASE_SYSTEMS", "ALGORITHMS", "SECURE_CODING", "PHYSICS"],
    DS: ["DISCRETE_MATH", "DATABASE_SYSTEMS", "MACHINE_LEARNING_BASICS", "DATA_VISUALIZATION", "BUSINESS_ANALYTICS"],
    AI: ["DISCRETE_MATH", "MACHINE_LEARNING_BASICS", "ALGORITHMS", "DATA_VISUALIZATION", "PHYSICS"],
    CSec: ["NETWORK_SECURITY", "CRYPTOGRAPHY_BASICS", "SECURE_CODING", "DISCRETE_MATH", "PHYSICS"],
    BA: ["BUSINESS_ANALYTICS", "DATA_VISUALIZATION", "DATABASE_SYSTEMS", "WEB_DEVELOPMENT"],
    UIUX: ["UX_RESEARCH", "INTERACTION_DESIGN", "WEB_DEVELOPMENT", "DISCRETE_MATH"],
  };

  const coreSubjectCodes = ["DISCRETE_MATH", "WEB_DEVELOPMENT", "DATABASE_SYSTEMS", "ALGORITHMS"];
  const classSubjectMap = new Map<string, Array<(typeof subjects)[number]>>();
  for (const campusClass of classes) {
    const direction = campusClass.name.split("-")[0];
    const subjectCodes = directionSubjectCodes[direction] ?? coreSubjectCodes;
    const classSubjects = subjectCodes
      .map((code) => subjectsByCode.get(code))
      .filter((subject): subject is (typeof subjects)[number] => Boolean(subject));
    classSubjectMap.set(campusClass.id, classSubjects);
  }

  await Promise.all(
    classes.flatMap((campusClass) =>
      (classSubjectMap.get(campusClass.id) ?? []).map((subject) =>
        prisma.classSubject.create({
          data: { classId: campusClass.id, subjectId: subject.id },
        }),
      ),
    ),
  );

  await Promise.all(
    classes.flatMap((campusClass, index) => {
      const homeroomTeacher = teacherProfiles[index % teacherProfiles.length];
      const supportingTeacher = teacherProfiles[(index + 1) % teacherProfiles.length];
      return [
        prisma.classTeacher.create({
          data: { classId: campusClass.id, teacherId: homeroomTeacher.id, isHomeroom: true },
        }),
        prisma.classTeacher.create({
          data: { classId: campusClass.id, teacherId: supportingTeacher.id },
        }),
      ];
    }),
  );

  const firstNames = [
    "Ali",
    "Nodira",
    "Bekzod",
    "Saida",
    "Javohir",
    "Shahnoza",
    "Temur",
    "Gulnoza",
    "Akmal",
    "Laylo",
    "Sherzod",
    "Mubina",
  ];
  const lastNames = [
    "Valiyev",
    "Rakhimova",
    "Yuldashev",
    "Islomova",
    "Oripov",
    "Sattorova",
    "Nasriddinov",
    "Tursunova",
    "Sobirov",
    "Abdukarimova",
    "Gafurov",
    "Nurmatova",
  ];
  const totalStudents = 180;

  const studentUsers: CreatedUser[] = [];
  for (let i = 0; i < totalStudents; i += 1) {
    const firstName = firstNames[i % firstNames.length];
    const lastName = lastNames[Math.floor(i / firstNames.length) % lastNames.length];
    const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${String(i + 1)}@university.edu`;
    const user = await createUser({
      email,
      password: STUDENT_PASSWORD,
      role: Role.STUDENT,
      firstName,
      lastName,
      phone: `+99890111${String(1000 + i)}`,
    });
    studentUsers.push(user);
  }

  const studentProfiles = await Promise.all(
    studentUsers.map((user, index) => {
      const campusClass = classes[index % classes.length];
      return prisma.student.create({
        data: {
          userId: user.id,
          studentCode: `STU-${String(index + 1).padStart(4, "0")}`,
          classId: campusClass.id,
          year: campusClass.year,
        },
      });
    }),
  );

  const slotTimes = [
    ["09:00", "10:20"],
    ["10:30", "11:50"],
    ["12:00", "13:20"],
    ["14:20", "15:40"],
  ] as const;
  const weekdays = [DayOfWeek.MON, DayOfWeek.TUE, DayOfWeek.WED, DayOfWeek.THU, DayOfWeek.FRI];

  for (const campusClass of classes) {
    const classSubjects = classSubjectMap.get(campusClass.id) ?? [];
    for (let dayIndex = 0; dayIndex < weekdays.length; dayIndex += 1) {
      for (let slotIndex = 0; slotIndex < slotTimes.length; slotIndex += 1) {
        if (!classSubjects.length) continue;
        const subject = classSubjects[(dayIndex + slotIndex) % classSubjects.length];
        const teacher = teacherBySubjectCode.get(subject.code) ?? teacherProfiles[0];
        await prisma.scheduleItem.create({
          data: {
            classId: campusClass.id,
            subjectId: subject.id,
            teacherId: teacher.id,
            dayOfWeek: weekdays[dayIndex],
            startTime: slotTimes[slotIndex][0],
            endTime: slotTimes[slotIndex][1],
            room: `B-${200 + dayIndex * 10 + slotIndex}`,
            changeNote: dayIndex === 2 && slotIndex === 1 ? "Moved from A-104 due to maintenance" : undefined,
          },
        });
      }
    }
  }

  const gradeTypes = [GradeType.QUIZ, GradeType.MIDTERM, GradeType.FINAL];
  for (const student of studentProfiles) {
    for (const subject of subjects) {
      for (let i = 0; i < gradeTypes.length; i += 1) {
        const raw = 58 + ((student.studentCode.charCodeAt(7) + i * 11 + subject.code.length * 3) % 43);
        const score = Math.min(100, raw);
        const teacher = teacherBySubjectCode.get(subject.code) ?? teacherProfiles[0];
        await prisma.grade.create({
          data: {
            studentId: student.id,
            subjectId: subject.id,
            teacherId: teacher.id,
            score,
            type: gradeTypes[i],
            comment: score < 65 ? "Needs improvement before final exam." : "Stable progress.",
          },
        });
      }
    }
  }

  await prisma.announcement.createMany({
    data: [
      {
        authorId: admin.id,
        title: "Semester Midterm Plan",
        content: "Midterms start next Monday. Check detailed schedule in your dashboard.",
        targetRole: Role.STUDENT,
        isPinned: true,
      },
      {
        authorId: teacherUsers[1].id,
        teacherId: teacherProfiles[1].id,
        classId: classes[0].id,
        title: "Web Lab Rescheduled",
        content: "Friday web lab moved to Room B-305 due to equipment updates.",
      },
      {
        authorId: teacherUsers[0].id,
        teacherId: teacherProfiles[0].id,
        classId: classes[1].id,
        title: "Discrete Math Consultation",
        content: "Optional Q&A session at 16:00 in Math Center.",
      },
    ],
  });

  const dayMs = 1000 * 60 * 60 * 24;
  const nowMs = Date.now();

  const events = await Promise.all([
    prisma.event.create({
      data: {
        title: "Welcome Coffee Hour",
        description: "Meet classmates and faculty advisors over coffee and pastries.",
        location: "Student Lounge",
        startDate: new Date(nowMs + dayMs * 0 + 1000 * 60 * 60 * 10),
        endDate: new Date(nowMs + dayMs * 0 + 1000 * 60 * 60 * 11),
        maxParticipants: 40,
      },
    }),
    prisma.event.create({
      data: {
        title: "Film Night: Campus Classics",
        description: "Screening and discussion hosted by the Film Society.",
        location: "Auditorium B",
        startDate: new Date(nowMs + dayMs * 1 + 1000 * 60 * 60 * 18),
        endDate: new Date(nowMs + dayMs * 1 + 1000 * 60 * 60 * 21),
        maxParticipants: 90,
      },
    }),
    prisma.event.create({
      data: {
        title: "Career Skills Workshop",
        description: "CV reviews and mock interviews with career center staff.",
        location: "Career Center",
        startDate: new Date(nowMs + dayMs * 3 + 1000 * 60 * 60 * 14),
        endDate: new Date(nowMs + dayMs * 3 + 1000 * 60 * 60 * 17),
        maxParticipants: 35,
      },
    }),
    prisma.event.create({
      data: {
        title: "Campus Fest",
        description: "Music, food stalls, and student clubs on the main quad.",
        location: "Main Quad",
        startDate: new Date(nowMs + dayMs * 7 + 1000 * 60 * 60 * 12),
        endDate: new Date(nowMs + dayMs * 9 + 1000 * 60 * 60 * 20),
        maxParticipants: 500,
      },
    }),
    prisma.event.create({
      data: {
        title: "Career Fair 2026",
        description: "Meet tech companies and explore internship opportunities.",
        location: "Main Hall",
        startDate: new Date(nowMs + dayMs * 5 + 1000 * 60 * 60 * 10),
        endDate: new Date(nowMs + dayMs * 5 + 1000 * 60 * 60 * 14),
        maxParticipants: 120,
      },
    }),
    prisma.event.create({
      data: {
        title: "Hackathon Weekend",
        description: "48-hour university hackathon with mentor support.",
        location: "Innovation Lab",
        startDate: new Date(nowMs + dayMs * 12 + 1000 * 60 * 60 * 9),
        endDate: new Date(nowMs + dayMs * 14 + 1000 * 60 * 60 * 18),
        maxParticipants: 80,
      },
    }),
  ]);

  await Promise.all([
    prisma.eventRegistration.create({ data: { eventId: events[0].id, studentId: studentProfiles[0].id } }),
    prisma.eventRegistration.create({ data: { eventId: events[0].id, studentId: studentProfiles[2].id } }),
    prisma.eventRegistration.create({ data: { eventId: events[1].id, studentId: studentProfiles[1].id } }),
    prisma.eventRegistration.create({ data: { eventId: events[1].id, studentId: studentProfiles[6].id } }),
  ]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const todayMenu = await prisma.canteenMenu.create({ data: { date: today } });
  const tomorrowMenu = await prisma.canteenMenu.create({ data: { date: tomorrow } });

  const menuData = [todayMenu.id, tomorrowMenu.id].flatMap((menuId, dayOffset) => [
    { menuId, name: "Oatmeal & Fruits", category: MealCategory.BREAKFAST, price: 2.8 + dayOffset * 0.2, calories: 320, available: true },
    { menuId, name: "Chicken Pilaf", category: MealCategory.LUNCH, price: 4.9 + dayOffset * 0.2, calories: 690, available: true },
    { menuId, name: "Yogurt Cup", category: MealCategory.SNACK, price: 1.6 + dayOffset * 0.1, calories: 190, available: dayOffset === 0 },
    { menuId, name: "Fresh Juice", category: MealCategory.DRINKS, price: 1.9 + dayOffset * 0.1, calories: 140, available: true },
  ]);
  await prisma.canteenItem.createMany({ data: menuData });

  await Promise.all([
    prisma.documentRequest.create({
      data: {
        requesterUserId: studentUsers[0].id,
        studentId: studentProfiles[0].id,
        type: DocumentType.TRANSCRIPT,
        status: RequestStatus.PENDING,
        description: "Needed for scholarship committee.",
      },
    }),
    prisma.documentRequest.create({
      data: {
        requesterUserId: studentUsers[4].id,
        studentId: studentProfiles[4].id,
        type: DocumentType.DORMITORY_CERT,
        status: RequestStatus.IN_PROGRESS,
        adminNote: "Will be ready tomorrow after dean approval.",
        reviewedAt: new Date(),
        reviewedByUserId: admin.id,
      },
    }),
    prisma.documentRequest.create({
      data: {
        requesterUserId: studentUsers[8].id,
        studentId: studentProfiles[8].id,
        type: DocumentType.ENROLLMENT_CERT,
        status: RequestStatus.DONE,
        adminNote: "Signed and ready for pickup at office 102.",
        reviewedAt: new Date(),
        reviewedByUserId: admin.id,
      },
    }),
    prisma.documentRequest.create({
      data: {
        requesterUserId: teacherUsers[0].id,
        studentId: null,
        type: DocumentType.TEACHER_EMPLOYMENT_CERT,
        status: RequestStatus.PENDING,
        description: "HR letter for spouse visa renewal — bilingual if possible.",
      },
    }),
    prisma.documentRequest.create({
      data: {
        requesterUserId: canteenStaffUser.id,
        studentId: null,
        type: DocumentType.CANTEEN_EMPLOYMENT_CERT,
        status: RequestStatus.REJECTED,
        description: "Salary certificate for mortgage bank.",
        adminNote:
          "We cannot issue salary details from the academic registry — please contact the university finance office (ext. 4405) with your staff ID.",
        reviewedAt: new Date(),
        reviewedByUserId: admin.id,
      },
    }),
  ]);

  await prisma.lostFoundItem.createMany({
    data: [
      { reportedBy: studentUsers[0].id, title: "Black Backpack", description: "Contains laptop charger and notebook", location: "Library 2nd floor" },
      { reportedBy: studentUsers[3].id, title: "Student ID Card", description: "Name: Bekzod Yuldashev", location: "Canteen entrance" },
      { reportedBy: studentUsers[5].id, title: "AirPods Case", description: "White case with sticker", location: "Lab B-104" },
      { reportedBy: teacherUsers[1].id, title: "Physics Textbook", description: "Fundamentals of Mechanics", location: "Room A-12" },
      { reportedBy: studentUsers[9].id, title: "Water Bottle", description: "Blue metal bottle", location: "Sports hall" },
    ],
  });

  const sportsSections = await Promise.all([
    prisma.sportsSection.create({
      data: {
        name: "Football Team",
        coach: "Coach Nuriddin",
        schedule: "Tue, Thu 18:00",
        location: "Main Stadium",
        maxMembers: 24,
      },
    }),
    prisma.sportsSection.create({
      data: {
        name: "Chess Club",
        coach: "Coach Dilafruz",
        schedule: "Mon, Wed 17:00",
        location: "Student Center 3F",
        maxMembers: 30,
      },
    }),
  ]);

  await Promise.all([
    prisma.sportsRegistration.create({ data: { sectionId: sportsSections[0].id, studentId: studentProfiles[0].id } }),
    prisma.sportsRegistration.create({ data: { sectionId: sportsSections[1].id, studentId: studentProfiles[1].id } }),
    prisma.sportsRegistration.create({ data: { sectionId: sportsSections[0].id, studentId: studentProfiles[7].id } }),
  ]);

  await prisma.councilNews.createMany({
    data: [
      { title: "Student Council Election Week", content: "Candidate presentations start this Friday.", authorName: "Student Council", category: "Campus" },
      { title: "Green Campus Initiative", content: "Volunteers needed for tree planting event.", authorName: "Student Council", category: "Community" },
      { title: "Dormitory Feedback Session", content: "Open forum at 19:00 in conference room.", authorName: "Student Council", category: "Housing" },
    ],
  });

  for (const student of studentProfiles.slice(0, 6)) {
    const portfolio = await prisma.portfolio.create({
      data: {
        studentId: student.id,
        bio: "Motivated CS student focused on practical engineering projects.",
      },
    });
    await prisma.portfolioAchievement.createMany({
      data: [
        {
          portfolioId: portfolio.id,
          title: "Hackathon Participant",
          description: "Participated in regional student hackathon.",
          date: new Date("2025-11-12"),
          category: "Competition",
        },
        {
          portfolioId: portfolio.id,
          title: "Community Tutor",
          description: "Mentored first-year students in programming basics.",
          date: new Date("2026-02-18"),
          category: "Leadership",
        },
      ],
    });
  }

  for (const student of studentProfiles) {
    const grades = await prisma.grade.findMany({
      where: { studentId: student.id },
      select: { score: true },
    });
    const gpa = grades.length ? Number((grades.reduce((acc, grade) => acc + grade.score, 0) / grades.length / 20).toFixed(2)) : 0;
    await prisma.academicRanking.create({
      data: {
        studentId: student.id,
        gpa,
        rank: 0,
        semester: "Spring 2026",
      },
    });
  }

  const rankingRows = await prisma.academicRanking.findMany({
    orderBy: { gpa: "desc" },
  });
  await Promise.all(
    rankingRows.map((row, index) =>
      prisma.academicRanking.update({
        where: { id: row.id },
        data: { rank: index + 1 },
      }),
    ),
  );

  const allUsers = await prisma.user.findMany({
    select: { id: true, role: true, firstName: true },
  });

  for (const user of allUsers) {
    await prisma.notification.createMany({
      data: [
        {
          userId: user.id,
          title: "Welcome to Campus Student Portal",
          message: `Hello ${user.firstName}, your account is active.`,
          link: "/dashboard",
        },
        {
          userId: user.id,
          title: "Weekly schedule synced",
          message: "Latest class schedule is available in your dashboard.",
          link: "/dashboard/student/schedule",
        },
        {
          userId: user.id,
          title: user.role === Role.STUDENT ? "Document services online" : "System update completed",
          message:
            user.role === Role.STUDENT
              ? "You can submit official document requests without office visit."
              : "Core modules were refreshed successfully.",
        },
      ],
    });
  }

  const scheduleItems = await prisma.scheduleItem.findMany({
    include: {
      class: {
        include: {
          students: { select: { id: true } },
        },
      },
    },
  });

  /** ~9 weeks of weekdays so monthly matrices show varied real rows after reseed */
  const recentDates: Date[] = [];
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);
  let weekdaysCollected = 0;
  while (weekdaysCollected < 45 && recentDates.length < 200) {
    const day = cursor.getDay();
    if (day >= 1 && day <= 5) {
      recentDates.push(new Date(cursor));
      weekdaysCollected += 1;
    }
    cursor.setDate(cursor.getDate() - 1);
  }

  const dateToWeekday: Record<number, DayOfWeek> = {
    1: DayOfWeek.MON,
    2: DayOfWeek.TUE,
    3: DayOfWeek.WED,
    4: DayOfWeek.THU,
    5: DayOfWeek.FRI,
  };

  const studentsByClass = new Map<string, typeof studentProfiles>();
  for (const st of studentProfiles) {
    if (!st.classId) continue;
    const list = studentsByClass.get(st.classId) ?? [];
    list.push(st);
    studentsByClass.set(st.classId, list);
  }
  for (const list of studentsByClass.values()) {
    list.sort((a, b) => a.studentCode.localeCompare(b.studentCode));
  }

  for (const date of recentDates) {
    const weekday = dateToWeekday[date.getDay()];
    for (const scheduleItem of scheduleItems.filter((row) => row.dayOfWeek === weekday)) {
      const classStudents = studentsByClass.get(scheduleItem.classId) ?? [];
      for (const student of scheduleItem.class.students) {
        const chanceSeed =
          (student.id.charCodeAt(student.id.length - 1) + date.getDate() + scheduleItem.startTime.length) % 100;
        const posInClass = classStudents.findIndex((s) => s.id === student.id);
        const idxInClass = posInClass >= 0 ? posInClass : 0;
        const archetype = idxInClass % 8;
        let status: AttendanceStatus = AttendanceStatus.PRESENT;
        if (archetype === 0) {
          status = AttendanceStatus.PRESENT;
        } else if (archetype === 1) {
          status = AttendanceStatus.ABSENT;
        } else if (archetype === 2) {
          status = chanceSeed < 70 ? AttendanceStatus.PRESENT : AttendanceStatus.ABSENT;
        } else if (archetype === 3) {
          status =
            chanceSeed < 55 ? AttendanceStatus.PRESENT : chanceSeed < 80 ? AttendanceStatus.LATE : AttendanceStatus.ABSENT;
        } else if (archetype === 4) {
          status = chanceSeed < 40 ? AttendanceStatus.LATE : AttendanceStatus.PRESENT;
        } else if (archetype === 5) {
          status = chanceSeed < 50 ? AttendanceStatus.PRESENT : AttendanceStatus.ABSENT;
        } else if (archetype === 6) {
          status =
            chanceSeed < 33 ? AttendanceStatus.PRESENT : chanceSeed < 66 ? AttendanceStatus.LATE : AttendanceStatus.ABSENT;
        } else {
          status =
            chanceSeed < 75 ? AttendanceStatus.PRESENT : chanceSeed < 90 ? AttendanceStatus.ABSENT : AttendanceStatus.LATE;
        }

        await prisma.attendance.upsert({
          where: {
            studentId_scheduleItemId_date: {
              studentId: student.id,
              scheduleItemId: scheduleItem.id,
              date,
            },
          },
          update: {
            status,
            note: status === AttendanceStatus.LATE ? "Arrived late" : status === AttendanceStatus.ABSENT ? "Absent" : null,
          },
          create: {
            studentId: student.id,
            scheduleItemId: scheduleItem.id,
            teacherId: scheduleItem.teacherId,
            classId: scheduleItem.classId,
            subjectId: scheduleItem.subjectId,
            date,
            status,
            note: status === AttendanceStatus.LATE ? "Arrived late" : status === AttendanceStatus.ABSENT ? "Absent" : null,
          },
        });
      }
    }
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
