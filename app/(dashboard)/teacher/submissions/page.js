"use client";
import React, { useState, useEffect } from "react";
import {
    Users, Loader2, CheckCircle2,
    Search, FileText, MessageSquare, Save, AlertCircle, ExternalLink, Eye
} from "lucide-react";
import { db, auth } from "../../../../lib/firebase";
import {
    collection, query, where, getDocs,
    addDoc, serverTimestamp, doc, updateDoc, orderBy
} from "firebase/firestore";

const GRADE_TYPES = [
    { label: "Distinction", value: 5, color: "bg-emerald-500", text: "text-emerald-500" },
    { label: "Merit", value: 4, color: "bg-blue-500", text: "text-blue-500" },
    { label: "Pass", value: 3, color: "bg-amber-500", text: "text-amber-500" },
    { label: "Fail", value: 2, color: "bg-rose-500", text: "text-rose-500" }
];

export default function TeacherGradingPage() {
    const [classes, setClasses] = useState([]);
    const [students, setStudents] = useState([]);
    const [selectedClass, setSelectedClass] = useState("");
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");

    const [gradingStates, setGradingStates] = useState({});
    const [submittingId, setSubmittingId] = useState(null);

    // 1. Guruhlarni yuklash
    useEffect(() => {
        const fetchClasses = async () => {
            try {
                const user = auth.currentUser;
                if (!user) return;
                const q = query(collection(db, "classes"), where("teacherId", "==", user.uid));
                const snap = await getDocs(q);
                const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
                setClasses(data);
                if (data.length > 0) setSelectedClass(data[0].id);
            } finally {
                setLoading(false);
            }
        };
        fetchClasses();
    }, []);

    // 2. Talabalar va ularning topshiriqlarini yuklash
    useEffect(() => {
        if (!selectedClass) return;
        const fetchData = async () => {
            setLoading(true);
            try {
                // Talabalarni olish
                const qStudents = query(collection(db, "users"), where("role", "==", "student"), where("classId", "==", selectedClass));
                const snapStudents = await getDocs(qStudents);
                const studentList = snapStudents.docs.map(d => ({ id: d.id, ...d.data() }));

                // Topshiriqlarni olish (oxirgi yuborilganlari)
                const qSubmissions = query(collection(db, "submissions"), where("classId", "==", selectedClass), orderBy("submittedAt", "desc"));
                const snapSubmissions = await getDocs(qSubmissions);
                const submissionData = snapSubmissions.docs.map(d => d.data());

                // Talabalarga topshiriqlarni biriktirish
                const mergedData = studentList.map(student => {
                    const lastSub = submissionData.find(sub => sub.studentId === student.id);
                    return { ...student, submission: lastSub || null };
                });

                setStudents(mergedData);

                // Initial states
                const initialStates = {};
                mergedData.forEach(s => {
                    initialStates[s.id] = {
                        grade: s.lastGradeValue || null,
                        comment: s.lastComment || ""
                    };
                });
                setGradingStates(initialStates);
            } catch (err) {
                console.error("Xatolik:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [selectedClass]);

    const updateLocalState = (studentId, field, value) => {
        setGradingStates(prev => ({
            ...prev,
            [studentId]: { ...prev[studentId], [field]: value }
        }));
    };

    const saveGrade = async (student) => {
        const state = gradingStates[student.id];
        if (!state.grade) return alert("Iltimos, baho tanlang!");

        setSubmittingId(student.id);
        const selectedType = GRADE_TYPES.find(t => t.value === state.grade);

        try {
            await addDoc(collection(db, "grades"), {
                studentId: student.id,
                studentName: student.fullName,
                teacherId: auth.currentUser.uid,
                classId: selectedClass,
                grade: state.grade,
                gradeLabel: selectedType.label,
                comment: state.comment,
                submissionId: student.submission?.id || null,
                createdAt: serverTimestamp(),
            });

            await updateDoc(doc(db, "users", student.id), {
                lastGrade: selectedType.label,
                lastGradeValue: state.grade,
                lastComment: state.comment
            });

            alert(`${student.fullName} baholandi!`);
        } catch (err) {
            alert("Xatolik: " + err.message);
        } finally {
            setSubmittingId(null);
        }
    };

    const filteredStudents = students.filter(s => s.fullName?.toLowerCase().includes(searchTerm.toLowerCase()));

    return (
        <div className="p-4 md:p-8 max-w-[1600px] mx-auto space-y-6 animate-in fade-in duration-500">
            {/* Header qismi o'zgarmadi */}
            <header className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white dark:bg-slate-900 p-6 rounded-[24px] border border-slate-100 dark:border-white/5 shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-indigo-600 rounded-2xl text-white shadow-lg"><Users size={24} /></div>
                    <div>
                        <h1 className="text-xl font-black text-slate-900 dark:text-white uppercase italic">Baholash Matritsasi</h1>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center md:text-left">Laboratoriya va topshiriqlar nazorati</p>
                    </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                    <input
                        type="text" placeholder="Talaba ismi..."
                        className="pl-4 pr-4 py-2.5 bg-slate-50 dark:bg-white/5 rounded-xl text-xs font-bold outline-none border-none focus:ring-2 ring-indigo-500/20"
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <select
                        value={selectedClass}
                        onChange={(e) => setSelectedClass(e.target.value)}
                        className="px-6 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl text-xs font-black uppercase outline-none"
                    >
                        {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                </div>
            </header>

            {/* Jadval */}
            <div className="bg-white dark:bg-slate-900 rounded-[32px] border border-slate-100 dark:border-white/5 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50 dark:bg-white/5 border-b border-slate-100 dark:border-white/5">
                                <th className="px-6 py-5 text-left text-[11px] font-black text-slate-400 uppercase tracking-widest">Talaba</th>
                                <th className="px-6 py-5 text-center text-[11px] font-black text-slate-400 uppercase tracking-widest">Topshiriq</th>
                                <th className="px-6 py-5 text-center text-[11px] font-black text-slate-400 uppercase tracking-widest">Baholash</th>
                                <th className="px-6 py-5 text-left text-[11px] font-black text-slate-400 uppercase tracking-widest">Izoh (Comment)</th>
                                <th className="px-6 py-5 text-center text-[11px] font-black text-slate-400 uppercase tracking-widest">Amal</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 dark:divide-white/5">
                            {loading ? (
                                <tr><td colSpan="5" className="py-20 text-center"><Loader2 className="animate-spin mx-auto text-indigo-500" /></td></tr>
                            ) : filteredStudents.map((student) => (
                                <tr key={student.id} className="hover:bg-slate-50/30 dark:hover:bg-white/[0.02] transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center font-black text-indigo-600 text-xs">{student.fullName?.[0]}</div>
                                            <div>
                                                <p className="text-[12px] font-black text-slate-700 dark:text-slate-200 uppercase truncate max-w-[150px]">{student.fullName}</p>
                                                <p className="text-[9px] font-bold text-slate-400 uppercase">{student.lastGrade || "Baholanmagan"}</p>
                                            </div>
                                        </div>
                                    </td>

                                    {/* YANGI: Ishni ko'rish (Preview) */}
                                    <td className="px-6 py-4 text-center">
                                        {student.submission ? (
                                            <a
                                                href={student.submission.fileUrl}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-xl text-[10px] font-black uppercase hover:bg-indigo-600 hover:text-white transition-all shadow-sm"
                                            >
                                                <Eye size={14} /> Ko'rish
                                            </a>
                                        ) : (
                                            <span className="text-[9px] font-bold text-slate-300 uppercase italic">Yuborilmagan</span>
                                        )}
                                    </td>

                                    <td className="px-6 py-4">
                                        <div className="flex items-center justify-center gap-1.5">
                                            {GRADE_TYPES.map((type) => (
                                                <button
                                                    key={type.value}
                                                    onClick={() => updateLocalState(student.id, 'grade', type.value)}
                                                    className={`px-3 py-2 rounded-xl text-[9px] font-black uppercase border-2 transition-all 
                                                        ${gradingStates[student.id]?.grade === type.value
                                                            ? `${type.color} text-white border-transparent scale-105 shadow-md`
                                                            : `bg-white dark:bg-slate-800 text-slate-400 border-slate-100 dark:border-white/5 hover:border-indigo-500/20`
                                                        }`}
                                                >
                                                    {type.label[0]}
                                                </button>
                                            ))}
                                        </div>
                                    </td>

                                    <td className="px-6 py-4">
                                        <input
                                            type="text"
                                            value={gradingStates[student.id]?.comment || ""}
                                            onChange={(e) => updateLocalState(student.id, 'comment', e.target.value)}
                                            placeholder="Izoh..."
                                            className="w-full px-4 py-2 bg-slate-50 dark:bg-white/5 border border-transparent focus:border-indigo-500/30 rounded-xl text-[11px] font-medium outline-none transition-all"
                                        />
                                    </td>

                                    <td className="px-6 py-4 text-center">
                                        <button
                                            onClick={() => saveGrade(student)}
                                            disabled={submittingId === student.id}
                                            className={`p-2.5 rounded-xl transition-all ${submittingId === student.id ? 'bg-slate-100' : 'bg-indigo-600 text-white shadow-indigo-500/20 shadow-lg hover:scale-110'}`}
                                        >
                                            {submittingId === student.id ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}