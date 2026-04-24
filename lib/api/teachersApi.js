import {
    collection, query, where, getDocs,
    addDoc, deleteDoc, doc, updateDoc,
    serverTimestamp, orderBy, getDoc
} from 'firebase/firestore';
import { db, auth } from '../firebase';

/**
 * Helper to ensure user is authenticated before API calls
 */
const requireAuth = () => {
    return new Promise((resolve) => {
        const unsubscribe = auth.onAuthStateChanged(user => {
            unsubscribe();
            resolve(user);
        });
    });
};

export const teachersApi = {

    // --- TEACHER PROFILE & ADMMIN ---

    /**
     * Fetch teachers based on role and group
     */
    async getTeachers(userRole, userGroupId) {
        try {
            await requireAuth();
            const teachersRef = collection(db, 'teachers');
            let q;

            if (userRole === 'admin') {
                q = query(teachersRef);
            } else {
                q = query(
                    teachersRef,
                    where('assignedGroups', 'array-contains-any', ['all', userGroupId || 'general'])
                );
            }

            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (error) {
            console.error("Teachers fetch error:", error);
            return [];
        }
    },

    /**
     * Add a new teacher (Admin only)
     */
    async addTeacher(teacherData) {
        try {
            const user = await requireAuth();
            if (!user) throw new Error("Unauthorized");

            const docRef = await addDoc(collection(db, 'teachers'), {
                ...teacherData,
                createdAt: serverTimestamp(),
                createdBy: user.uid
            });
            return { id: docRef.id, ...teacherData };
        } catch (error) {
            console.error("Add teacher error:", error);
            throw error;
        }
    },

    // --- APPOINTMENTS (UCHRASHUVLAR) ---

    /**
     * Student books an appointment
     */
    async bookAppointment(teacherId, teacherName, date, time, reason) {
        try {
            const user = await requireAuth();
            await addDoc(collection(db, 'appointments'), {
                studentId: user.uid,
                studentName: user.displayName || user.email?.split('@')[0],
                teacherId,
                teacherName,
                date,
                time,
                reason,
                status: 'Pending',
                createdAt: serverTimestamp()
            });
            return true;
        } catch (error) {
            console.error("Booking error:", error);
            throw error;
        }
    },

    /**
     * Fetch appointments for the current teacher
     */
    async getTeacherAppointments() {
        try {
            const user = await requireAuth();
            if (!user) return [];
            const q = query(
                collection(db, 'appointments'),
                where('teacherId', '==', user.uid),
                orderBy('createdAt', 'desc')
            );
            const snap = await getDocs(q);
            return snap.docs.map(d => ({ id: d.id, ...d.data() }));
        } catch (error) {
            console.error("Fetch appointments error:", error);
            return [];
        }
    },

    /**
     * Update appointment status (Approve/Reject)
     */
    async updateAppointmentStatus(id, status) {
        try {
            const user = await requireAuth();
            const docRef = doc(db, 'appointments', id);
            await updateDoc(docRef, { status, updatedAt: serverTimestamp() });
            return true;
        } catch (error) {
            console.error("Update appointment status error:", error);
            throw error;
        }
    },

    // --- CLASSES & STUDENTS ---

    /**
     * Fetch classes assigned to the current teacher
     */
    async getTeacherClasses() {
        try {
            const user = await requireAuth();
            if (!user) return [];
            const q = query(collection(db, "classes"), where("teacherId", "==", user.uid));
            const snap = await getDocs(q);
            return snap.docs.map(d => ({ id: d.id, ...d.data() }));
        } catch (error) {
            console.error("Get teacher classes error:", error);
            return [];
        }
    },

    /**
     * Fetch students in a specific class
     */
    async getStudentsInClass(classId) {
        try {
            const q = query(
                collection(db, "users"),
                where("classId", "==", classId),
                where("role", "==", "student")
            );
            const snap = await getDocs(q);
            return snap.docs.map(d => ({ id: d.id, ...d.data() }));
        } catch (error) {
            console.error("Get students in class error:", error);
            return [];
        }
    },

    // --- ATTENDANCE (DAVOMAT) ---

    async markAttendance(classId, lessonDate, studentsList) {
        try {
            const user = await requireAuth();
            const docRef = await addDoc(collection(db, 'attendance'), {
                teacherId: user.uid,
                classId,
                date: lessonDate,
                students: studentsList,
                recordedAt: serverTimestamp()
            });
            return { id: docRef.id, status: 'success' };
        } catch (error) {
            console.error("Mark attendance error:", error);
            throw error;
        }
    },

    async getAttendanceByDate(classId, date) {
        try {
            const q = query(
                collection(db, 'attendance'),
                where('classId', '==', classId),
                where('date', '==', date)
            );
            const snap = await getDocs(q);
            return snap.empty ? null : { id: snap.docs[0].id, ...snap.docs[0].data() };
        } catch (error) {
            console.error("Get attendance error:", error);
            return null;
        }
    },

    // --- TASKS & GRADING ---

    /**
     * Create a new task (Assignment/Exam)
     */
    async createTeacherTask(taskData) {
        try {
            const user = await requireAuth();
            const docRef = await addDoc(collection(db, 'tasks'), {
                ...taskData,
                teacherId: user.uid,
                createdAt: serverTimestamp(),
                status: 'active'
            });
            return { id: docRef.id, ...taskData };
        } catch (error) {
            console.error("Create task error:", error);
            throw error;
        }
    },

    /**
     * Get tasks for the current teacher
     */
    async getTeacherTasks(type = 'assignment') {
        try {
            const user = await requireAuth();
            const q = query(
                collection(db, 'tasks'),
                where('teacherId', '==', user?.uid),
                where('type', '==', type),
                orderBy('createdAt', 'desc')
            );
            const snap = await getDocs(q);
            return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (error) {
            console.error("Get tasks error:", error);
            return [];
        }
    },

    async deleteTask(id) {
        try {
            await deleteDoc(doc(db, 'tasks', id));
            return true;
        } catch (error) {
            console.error("Delete task error:", error);
            throw error;
        }
    },

    async getSubmissions(taskId) {
        try {
            const q = query(collection(db, "submissions"), where("taskId", "==", taskId));
            const snap = await getDocs(q);
            return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (error) {
            console.error("Get submissions error:", error);
            return [];
        }
    },

    async submitGrade(submissionId, grade, feedback) {
        try {
            const docRef = doc(db, 'submissions', submissionId);
            await updateDoc(docRef, {
                grade: Number(grade),
                feedback,
                status: 'graded',
                gradedAt: serverTimestamp()
            });
            return true;
        } catch (error) {
            console.error("Submit grade error:", error);
            throw error;
        }
    },

    // --- SCHEDULE & STATS ---

    async getTeacherSchedule() {
        try {
            const user = await requireAuth();
            const q = query(collection(db, 'schedules'), where('teacherId', '==', user.uid));
            const snap = await getDocs(q);
            return snap.docs.map(d => ({ id: d.id, ...d.data() }));
        } catch (error) {
            console.error("Get schedule error:", error);
            return [];
        }
    },

    async getTeacherStats() {
        try {
            const user = await requireAuth();
            // This would normally be a complex query or a separate stats collection
            return {
                totalStudents: 124,
                activeClasses: 5,
                pendingTasks: 12
            };
        } catch (error) {
            return { totalStudents: 0, activeClasses: 0, pendingTasks: 0 };
        }
    }
};