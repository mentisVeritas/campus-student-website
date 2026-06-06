export type StudentProfile = {
  id: string;
  fullName: string;
  email: string;
  group: string;
  specialty: string;
  faculty: string;
  year: number;
};

export type ScheduleItem = {
  id: string;
  day: string;
  time: string;
  subject: string;
  room: string;
};

export type GradeItem = {
  id: string;
  subject: string;
  score: number;
  credits: number;
  semester: string;
};

export type NewsItem = {
  id: string;
  title: string;
  date: string;
  category: string;
};

export type DocumentRequest = {
  id: string;
  type: string;
  status: "new" | "in_progress" | "ready";
  submittedAt: string;
};

export type Teacher = {
  id: string;
  name: string;
  email: string;
  department: string;
};

export type EventItem = {
  id: string;
  title: string;
  date: string;
  location: string;
};

export type SportsItem = {
  id: string;
  name: string;
  coach: string;
  schedule: string;
};

export const mockStudent: StudentProfile = {
  id: "s-1",
  fullName: "Ali Valiyev",
  email: "ali.valiyev@university.edu",
  group: "CS-101",
  specialty: "Computer Science",
  faculty: "Engineering",
  year: 2,
};

export const mockSchedule: ScheduleItem[] = [
  {
    id: "sc-1",
    day: "Mon",
    time: "09:00",
    subject: "Discrete Mathematics",
    room: "A-201",
  },
  {
    id: "sc-2",
    day: "Tue",
    time: "11:00",
    subject: "Web Development",
    room: "B-104",
  },
  {
    id: "sc-3",
    day: "Thu",
    time: "14:00",
    subject: "Database Systems",
    room: "C-310",
  },
];

export const mockGrades: GradeItem[] = [
  {
    id: "g-1",
    subject: "Discrete Mathematics",
    score: 91,
    credits: 5,
    semester: "Spring 2026",
  },
  {
    id: "g-2",
    subject: "Web Development",
    score: 95,
    credits: 4,
    semester: "Spring 2026",
  },
  {
    id: "g-3",
    subject: "Database Systems",
    score: 89,
    credits: 4,
    semester: "Spring 2026",
  },
];

export const mockNews: NewsItem[] = [
  {
    id: "n-1",
    title: "Open Day Schedule Published",
    date: "2026-04-25",
    category: "Announcements",
  },
  {
    id: "n-2",
    title: "Scholarship Applications Open",
    date: "2026-04-24",
    category: "Academic",
  },
];

export const mockDocuments: DocumentRequest[] = [
  {
    id: "d-1",
    type: "Study Certificate",
    status: "in_progress",
    submittedAt: "2026-04-23",
  },
  {
    id: "d-2",
    type: "Dormitory Confirmation",
    status: "ready",
    submittedAt: "2026-04-20",
  },
];

export const mockTeachers: Teacher[] = [
  {
    id: "t-1",
    name: "Dr. Karimov",
    email: "karimov@university.edu",
    department: "Computer Science",
  },
  {
    id: "t-2",
    name: "Prof. Usmanova",
    email: "usmanova@university.edu",
    department: "Information Systems",
  },
];

export const mockEvents: EventItem[] = [
  {
    id: "e-1",
    title: "Open Day",
    date: "2026-05-01",
    location: "Main Hall",
  },
  {
    id: "e-2",
    title: "IT Club Meetup",
    date: "2026-05-03",
    location: "Lab B-104",
  },
];

export const mockSports: SportsItem[] = [
  {
    id: "sp-1",
    name: "Football",
    coach: "Coach Akbarov",
    schedule: "Mon/Wed 18:00",
  },
  {
    id: "sp-2",
    name: "Basketball",
    coach: "Coach Rakhimov",
    schedule: "Tue/Thu 17:00",
  },
];
