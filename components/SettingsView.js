"use client";
import React, { useState, useEffect, useRef } from "react";
import {
    User, Moon, Sun, Globe, Bell, Shield,
    Palette, Save, ChevronRight, Laptop,
    MessageSquare, LogOut, CheckCircle2, Loader2, Camera, Clock
} from "lucide-react";
import { useUser } from "../lib/UserContext";
import { useLanguage } from "../lib/LanguageContext";
import { profileApi } from "../lib/api/profileApi";

const SettingCard = ({ icon: Icon, title, description, children }) => (
    <div className="bg-white dark:bg-slate-900/40 backdrop-blur-3xl rounded-[32px] p-6 border border-slate-100 dark:border-white/5 shadow-xl shadow-slate-200/20 dark:shadow-none transition-all hover:border-indigo-500/20 group">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-start gap-5">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0 group-hover:scale-110 transition-transform">
                    <Icon size={24} />
                </div>
                <div>
                    <h3 className="text-sm md:text-base font-black text-slate-900 dark:text-white uppercase tracking-tight italic">
                        {title}
                    </h3>
                    <p className="text-[11px] font-medium text-slate-400 dark:text-slate-500 mt-1 uppercase tracking-wider">
                        {description}
                    </p>
                </div>
            </div>
            <div className="flex items-center">
                {children}
            </div>
        </div>
    </div>
);

export default function SettingsView() {
    const { user, logout, isDarkMode, toggleDarkMode } = useUser();
    const { language, changeLanguage, t } = useLanguage();

    const isInitialized = useRef(false);

    // States for functional settings
    const [loading, setLoading] = useState(false);
    const [saved, setSaved] = useState(false);
    const [bio, setBio] = useState(user?.bio || "");
    const [name, setName] = useState(user?.name || "");
    const [uploading, setUploading] = useState(false);

    // Password Modal States
    const [isPassModalOpen, setIsPassModalOpen] = useState(false);
    const [oldPass, setOldPass] = useState("");
    const [newPass, setNewPass] = useState("");
    const [passError, setPassError] = useState("");

    // Sync state when user context updates (e.g. after save or fetch)
    useEffect(() => {
        if (user && !isInitialized.current) {
            setName(user.name || "");
            setBio(user.bio || "");
            isInitialized.current = true;
        }
    }, [user]);

    const handleSave = async () => {
        setLoading(true);
        try {
            await profileApi.updateProfileData({
                name: name,
                bio: bio
            });
            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
        } catch (error) {
            console.error("Saqlashda xato:", error);
            alert("Xatolik yuz berdi: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleAvatarChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setUploading(true);
        try {
            const downloadURL = await profileApi.uploadAvatar(file);
            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
            // Profil rasmi avtomat yangilanadi chunki AuthState o'zgaradi
        } catch (error) {
            console.error("Rasm yuklashda xato:", error);
            alert("Rasm yuklashda xato!");
        } finally {
            setUploading(false);
        }
    };

    const handlePasswordUpdate = async (e) => {
        if (e) e.preventDefault();
        setLoading(true);
        setPassError("");

        try {
            // Admin bo'lmaganlar uchun eski parolni tekshirish
            if (user?.role !== 'admin') {
                if (!oldPass) {
                    setPassError("Eski parolni kiriting");
                    setLoading(false);
                    return;
                }
                await profileApi.reauthenticate(oldPass);
            }

            if (!newPass || newPass.length < 6) {
                setPassError("Yangi parol kamida 6 ta belgi bo'lishi kerak");
                setLoading(false);
                return;
            }

            await profileApi.updateSecurePassword(newPass);
            setSaved(true);
            setIsPassModalOpen(false);
            setOldPass("");
            setNewPass("");
            setTimeout(() => setSaved(false), 2000);
        } catch (error) {
            console.error("Parol yangilashda xato:", error);
            setPassError(error.message.includes('auth/wrong-password') ? "Eski parol noto'g'ri" : "Xatolik: " + error.message);
        } finally {
            setLoading(false);
        }
    };


    return (
        <div className="p-4 md:p-10 max-w-5xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white tracking-tighter uppercase leading-none border-l-8 border-orange-600 pl-6 italic">
                        {t('settings', "Sozlamalar")}
                    </h1>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] mt-3 ml-8">
                        Campus System Preferences
                    </p>
                </div>

                <button
                    onClick={handleSave}
                    disabled={loading}
                    className={`flex items-center gap-3 px-8 py-3.5 rounded-[20px] text-xs font-black uppercase tracking-widest transition-all shadow-lg active:scale-95 ${saved
                        ? "bg-emerald-500 text-white shadow-emerald-500/20"
                        : "bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-orange-600 dark:hover:bg-orange-400 disabled:opacity-50"
                        }`}
                >
                    {loading ? <Loader2 className="animate-spin" size={18} /> : (saved ? <CheckCircle2 size={18} /> : <Save size={18} />)}
                    {loading ? "Saqlanmoqda..." : (saved ? "Saqlandi" : "O'zgarishlarni Saqlash")}
                </button>
            </div>

            {/* Profile Glance */}
            <div className="bg-gradient-to-br from-indigo-600 to-violet-700 rounded-[40px] p-10 text-white relative overflow-hidden shadow-2xl shadow-indigo-500/20">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-12 translate-x-12 blur-3xl"></div>
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-orange-500/20 rounded-full translate-y-12 -translate-x-12 blur-3xl"></div>

                <div className="relative flex flex-col md:flex-row items-center gap-8">
                    <div className="relative group">
                        <div className="relative">
                            <img
                                src={user?.avatar || "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=200&q=80&auto=format&fit=crop"}
                                className="w-24 h-24 md:w-32 md:h-32 rounded-[32px] object-cover border-4 border-white/20 shadow-2xl transition-transform group-hover:scale-105"
                                alt="Profile"
                            />
                            {uploading && (
                                <div className="absolute inset-0 bg-black/40 rounded-[32px] flex items-center justify-center backdrop-blur-sm animate-pulse">
                                    <Loader2 className="text-white animate-spin" size={32} />
                                </div>
                            )}
                        </div>
                        <label className="absolute -bottom-2 -right-2 bg-white text-indigo-600 p-2.5 rounded-2xl shadow-xl hover:bg-orange-500 hover:text-white transition-colors cursor-pointer">
                            <Camera size={18} />
                            <input type="file" className="hidden" accept="image/*" onChange={handleAvatarChange} disabled={uploading} />
                        </label>
                    </div>

                    <div className="flex-1 text-center md:text-left">
                        <h2 className="text-2xl md:text-3xl font-black tracking-tight mb-1">{user?.name}</h2>
                        <p className="opacity-70 text-[11px] md:text-xs font-bold uppercase tracking-widest mb-6">{user?.role} • Campus {user?.role.charAt(0).toUpperCase() + user?.role.slice(1)}</p>

                        <div className="flex flex-wrap justify-center md:justify-start gap-3">
                            <div className="px-5 py-2 bg-white/10 backdrop-blur-md border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest">
                                {user?.email}
                            </div>
                            <div className="px-5 py-2 bg-white/10 backdrop-blur-md border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest">
                                ID: {user?.uid?.slice(0, 8).toUpperCase()}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Settings Sections */}
            <div className="grid grid-cols-1 gap-6">

                <SettingCard
                    icon={User}
                    title="Profil sozlamalari"
                    description={user?.role === 'teacher' ? "Ism, rasm va biografiyani tahrirlash" : "Shaxsiy ma'lumotlarni boshqarish"}
                >
                    <div className="flex flex-col gap-2 w-full md:w-64">
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-white/5 rounded-xl px-4 py-2 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500/20"
                            placeholder="To'liq ism"
                        />
                    </div>
                </SettingCard>

                {user?.role === 'teacher' && (
                    <div className="bg-white dark:bg-slate-900/40 backdrop-blur-3xl rounded-[32px] p-6 border border-slate-100 dark:border-white/5 shadow-sm">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-4">Biografiya (Bio)</label>
                        <textarea
                            className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-white/5 rounded-2xl p-4 text-sm outline-none focus:ring-2 focus:ring-orange-500/20"
                            placeholder="O'zingiz haqingizda ma'lumot qoldiring..."
                            rows={3}
                            value={bio}
                            onChange={(e) => setBio(e.target.value)}
                        />
                    </div>
                )}

                <SettingCard
                    icon={Moon}
                    title="Mavzu (Theme)"
                    description="Tizimning tashqi ko'rinishini o'zgartiring"
                >
                    <div className="flex p-1.5 bg-slate-100 dark:bg-slate-800 rounded-2xl gap-2 shadow-inner">
                        <button
                            onClick={() => isDarkMode && toggleDarkMode()}
                            className={`flex items-center gap-2 px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${!isDarkMode
                                ? "bg-white dark:bg-slate-700 text-indigo-600 shadow-sm"
                                : "text-slate-500 dark:text-slate-400 hover:bg-white/50 dark:hover:bg-slate-800"
                                }`}
                        >
                            <Sun size={14} /> Kun
                        </button>
                        <button
                            onClick={() => !isDarkMode && toggleDarkMode()}
                            className={`flex items-center gap-2 px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${isDarkMode
                                ? "bg-white dark:bg-slate-700 text-indigo-600 shadow-sm"
                                : "text-slate-500 dark:text-slate-400 hover:bg-white/50 dark:hover:bg-slate-800"
                                }`}
                        >
                            <Moon size={14} /> Tun
                        </button>
                    </div>
                </SettingCard>

                {user?.role === 'student' && (
                    <>
                        <SettingCard
                            icon={Bell}
                            title="Xabarnoma sozlamalari"
                            description="Tizim bildirishnomalarini boshqarish"
                        >
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" className="sr-only peer" defaultChecked />
                                <div className="w-14 h-7 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all dark:border-gray-600 peer-checked:bg-orange-500"></div>
                            </label>
                        </SettingCard>

                        <SettingCard
                            icon={Clock}
                            title="Deadline eslatmalari"
                            description="Topshiriqlar muddati haqida ogohlantirishlar"
                        >
                            <div className="flex gap-2">
                                {['1s', '3s', '1v'].map(t => (
                                    <button key={t} className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg text-[9px] font-black uppercase">{t}</button>
                                ))}
                            </div>
                        </SettingCard>

                        <SettingCard
                            icon={Shield}
                            title="Maxfiylik (Privacy)"
                            description="Shaxsiy ma'lumotlar ko'rinishi"
                        >
                            <button className="text-[10px] font-black uppercase text-indigo-600">Boshqarish</button>
                        </SettingCard>

                        <SettingCard
                            icon={Laptop}
                            title="Dashboard ko‘rinishi"
                            description="Asosiy panelni shaxsiylashtirish"
                        >
                            <button className="text-[10px] font-black uppercase text-indigo-600">Moslash</button>
                        </SettingCard>

                        <SettingCard
                            icon={Laptop}
                            title="Download / offline sozlamalar"
                            description="Oflayn rejim va yuklamalar"
                        >
                            <button className="text-[10px] font-black uppercase text-indigo-600">Ochish</button>
                        </SettingCard>
                    </>
                )}

                <SettingCard
                    icon={Shield}
                    title="Parolni o‘zgartirish"
                    description="Xavfsizlik uchun parolni yangilang"
                >
                    <button
                        onClick={() => setIsPassModalOpen(true)}
                        disabled={loading}
                        className="flex items-center gap-2 px-6 py-3 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-300 transition-all disabled:opacity-50"
                    >
                        Yangilash <ChevronRight size={14} />
                    </button>
                </SettingCard>

                {user?.role !== 'admin' && (
                    <div className="mt-8">
                        <div className="bg-gradient-to-r from-orange-500/10 to-transparent p-6 rounded-[32px] border border-orange-500/20 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-orange-500 text-white flex items-center justify-center">
                                    <MessageSquare size={18} />
                                </div>
                                <div>
                                    <h4 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-tight">Help & Support</h4>
                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5 text-balance">Yordam kerakmi? Biz bilan bog'laning</p>
                                </div>
                            </div>
                            <button className="px-6 py-2.5 bg-orange-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-orange-500/20 hover:scale-105 transition-all">
                                Bog'lanish
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Logout Section */}
            <div className="pt-10 border-t border-slate-100 dark:border-white/5 flex justify-center">
                <button
                    onClick={logout}
                    className="flex items-center gap-3 px-10 py-4 bg-rose-50 dark:bg-rose-500/10 text-rose-500 hover:bg-rose-100 dark:hover:bg-rose-500/20 rounded-[28px] text-[11px] font-black uppercase tracking-[0.2em] transition-all group"
                >
                    <LogOut size={20} className="group-hover:-translate-x-1 transition-transform" />
                    Tizimdan Chiqish
                </button>
            </div>

            {/* Password Modal */}
            {isPassModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-md" onClick={() => setIsPassModalOpen(false)}></div>
                    <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-[40px] shadow-2xl border border-white/20 dark:border-white/5 overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="p-8">
                            <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight mb-2 italic border-l-4 border-orange-500 pl-4">Parolni yangilash</h3>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-8">Havfsizlik darajasini oshiring</p>

                            <form onSubmit={handlePasswordUpdate} className="space-y-6">
                                {user?.role !== 'admin' && (
                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 ml-2">Eski Parol</label>
                                        <input
                                            type="password"
                                            value={oldPass}
                                            onChange={(e) => setOldPass(e.target.value)}
                                            className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-white/5 rounded-2xl px-6 py-4 text-sm font-bold outline-none focus:ring-2 focus:ring-orange-500/20"
                                            placeholder="••••••••"
                                        />
                                    </div>
                                )}

                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 ml-2">Yangi Parol</label>
                                    <input
                                        type="password"
                                        value={newPass}
                                        onChange={(e) => setNewPass(e.target.value)}
                                        className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-white/5 rounded-2xl px-6 py-4 text-sm font-bold outline-none focus:ring-2 focus:ring-orange-500/20"
                                        placeholder="••••••••"
                                    />
                                </div>

                                {passError && (
                                    <p className="text-[10px] font-black uppercase text-rose-500 ml-2 animate-pulse">{passError}</p>
                                )}

                                <div className="flex gap-4 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => setIsPassModalOpen(false)}
                                        className="flex-1 px-6 py-4 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-2xl text-[10px] font-black uppercase tracking-widest"
                                    >
                                        Bekor qilish
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="flex-1 px-6 py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                        {loading && <Loader2 className="animate-spin" size={14} />}
                                        Yangilash
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
