import { prisma } from "./prisma";

export class ForbiddenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ForbiddenError";
  }
}

export async function assertTeacherClassAccess(teacherId: string, classId: string) {
  const [classTeacherLink, scheduledLesson] = await Promise.all([
    prisma.classTeacher.findUnique({
      where: { classId_teacherId: { classId, teacherId } },
    }),
    prisma.scheduleItem.findFirst({
      where: { classId, teacherId },
      select: { id: true },
    }),
  ]);
  if (!classTeacherLink && !scheduledLesson) throw new ForbiddenError("No access to this class");
}

export async function assertTeacherSubjectAccess(teacherId: string, subjectId: string) {
  const [teacherSubjectLink, scheduledLesson] = await Promise.all([
    prisma.teacherSubject.findUnique({
      where: { teacherId_subjectId: { teacherId, subjectId } },
    }),
    prisma.scheduleItem.findFirst({
      where: { subjectId, teacherId },
      select: { id: true },
    }),
  ]);
  if (!teacherSubjectLink && !scheduledLesson) throw new ForbiddenError("No access to this subject");
}

export async function getTeacherClasses(teacherId: string) {
  return prisma.class.findMany({
    where: { teachers: { some: { teacherId } } },
    include: {
      students: { include: { user: true } },
      subjects: { include: { subject: true } },
    },
  });
}

export async function getTeacherSubjects(teacherId: string) {
  return prisma.subject.findMany({
    where: { teachers: { some: { teacherId } } },
  });
}

export async function getTeacherClassIds(teacherId: string): Promise<string[]> {
  const [classTeacherRows, scheduleRows] = await Promise.all([
    prisma.classTeacher.findMany({
      where: { teacherId },
      select: { classId: true },
    }),
    prisma.scheduleItem.findMany({
      where: { teacherId },
      distinct: ["classId"],
      select: { classId: true },
    }),
  ]);
  return [...new Set([...classTeacherRows, ...scheduleRows].map((row) => row.classId))];
}

export async function getTeacherSubjectIds(teacherId: string): Promise<string[]> {
  const [teacherSubjectRows, scheduleRows] = await Promise.all([
    prisma.teacherSubject.findMany({
      where: { teacherId },
      select: { subjectId: true },
    }),
    prisma.scheduleItem.findMany({
      where: { teacherId },
      distinct: ["subjectId"],
      select: { subjectId: true },
    }),
  ]);
  return [...new Set([...teacherSubjectRows, ...scheduleRows].map((row) => row.subjectId))];
}
