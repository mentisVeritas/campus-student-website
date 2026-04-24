"use client";
import React, { useState } from "react";
import {
    Calendar, Clock, MapPin,
    Trophy, ChevronRight, Filter,
    Dribbble, Activity, Hash
} from "lucide-react";
import Card from "../../../../components/Card";

const SCHEDULE_DATA = [
    {
        id: 1,
        sport: "Futbol",
        coach: "Ali Valiyev",
        days: ["Dush", "Chor", "Jum"],
        time: "16:00 - 18:00",
        location: "Asosiy stadion",
        color: "bg-emerald-500",
        lightColor: "bg-emerald-500/10",
        textColor: "text-emerald-600"
    },
    {
        id: 2,
        sport: "Basketbol",
        coach: "Murod Toshov",
        days: ["Sesh", "Pay", "Shan"],
        time: "17:00 - 19:00",
        location: "Yopiq sport zal",
        color: "bg-orange-500",
        lightColor: "bg-orange-500/10",
        textColor: "text-orange-600"
    },
    {
        id: 3,
        sport: "Suzish",
        coach: "Elena Petrovna",
        days: ["Har kuni"],
        time: "09:00 - 11:00",
        location: "Suv sporti majmuasi",
        color: "bg-sky-500",
        lightColor: "bg-sky-500/10",
        textColor: "text-sky-600"
    },
    {
        id: 4,
        sport: "Shaxmat",
        coach: "Akrom Zokirov",
        days: ["Dush", "Chor", "Jum"],
        time: "15:00 - 16:30",
        location: "204-xona",
        color: "bg-indigo-500",
        lightColor: "bg-indigo-500/10",
        textColor: "text-indigo-600"
    }
];

const DAYS = ["Dush", "Sesh", "Chor", "Pay", "Jum", "Shan", "Yak"];

export default function SportsSchedulePage() {
    const [selectedSport, setSelectedSport] = useState("All");

    const filteredData = selectedSport === "All"
        ? SCHEDULE_DATA
        : SCHEDULE_DATA.filter(item => item.sport === selectedSport);

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-700">
            {/* Header Section */}
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight italic uppercase flex items-center gap-3">
                        <Trophy className="text-amber-500" /> Sport Seksiyalari
                    </h1>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-1">
                        Mashg'ulotlar va murabbiylar jadvali
                    </p>
                </div>

                <div className="flex gap-2 overflow-x-auto pb-2 w-full md:w-auto">
                    {["All", ...SCHEDULE_DATA.map(s => s.sport)].map((sport) => (
                        <button
                            key={sport}
                            onClick={() => setSelectedSport(sport)}
                            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all whitespace-nowrap ${selectedSport === sport
                                    ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-lg"
                                    : "bg-white dark:bg-slate-900 text-slate-400 border border-slate-100 dark:border-white/5 hover:border-slate-300"
                                }`}
                        >
                            {sport === "All" ? "Barchasi" : sport}
                        </button>
                    ))}
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Main Schedule List */}
                <div className="lg:col-span-8 space-y-4">
                    {filteredData.map((item) => (
                        <Card key={item.id} className="p-0 overflow-hidden border-none shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex flex-col md:flex-row">
                                <div className={`md:w-2 ${item.color}`}></div>
                                <div className="p-6 flex-1 flex flex-col md:flex-row md:items-center justify-between gap-6">
                                    <div className="flex items-center gap-4">
                                        <div className={`w-12 h-12 rounded-2xl ${item.lightColor} flex items-center justify-center`}>
                                            <Activity className={item.textColor} size={24} />
                                        </div>
                                        <div>
                                            <h3 className="font-black text-slate-900 dark:text-white uppercase text-sm tracking-tight">
                                                {item.sport}
                                            </h3>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase">{item.coach}</p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 md:flex md:items-center gap-6">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2 text-slate-400">
                                                <Calendar size={14} />
                                                <span className="text-[10px] font-black uppercase">Kunlar</span>
                                            </div>
                                            <p className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                                                {item.days.join(", ")}
                                            </p>
                                        </div>
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2 text-slate-400">
                                                <Clock size={14} />
                                                <span className="text-[10px] font-black uppercase">Vaqt</span>
                                            </div>
                                            <p className="text-[11px] font-bold text-slate-700 dark:text-slate-300">{item.time}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between md:justify-end gap-4 border-t md:border-t-0 pt-4 md:pt-0">
                                        <div className="flex items-center gap-2">
                                            <MapPin size={14} className="text-slate-300" />
                                            <span className="text-[10px] font-bold text-slate-400 uppercase">{item.location}</span>
                                        </div>
                                        <button className={`p-2 rounded-lg ${item.lightColor} ${item.textColor} hover:scale-110 transition-transform`}>
                                            <ChevronRight size={18} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>

                {/* Sidebar: Weekly Snapshot */}
                <div className="lg:col-span-4 space-y-6">
                    <Card className="p-6 bg-slate-900 text-white border-none relative overflow-hidden">
                        <Dribbble className="absolute -right-4 -bottom-4 w-32 h-32 text-white/5 rotate-12" />
                        <h2 className="text-lg font-black uppercase italic mb-4 relative z-10">Bugungi darslar</h2>
                        <div className="space-y-4 relative z-10">
                            {/* Namuna sifatida bugungi darslar */}
                            <div className="flex items-start gap-3 p-3 bg-white/5 rounded-xl border border-white/10">
                                <div className="w-1.5 h-8 bg-amber-500 rounded-full mt-1"></div>
                                <div>
                                    <p className="text-[10px] font-black uppercase text-amber-500">16:00 - 18:00</p>
                                    <h4 className="text-sm font-bold">Futbol mashg'uloti</h4>
                                    <p className="text-[9px] text-white/40 uppercase">A. Valiyev • Stadion</p>
                                </div>
                            </div>
                        </div>
                    </Card>

                    {/* Quick Stats */}
                    <div className="grid grid-cols-2 gap-4">
                        <Card className="p-4 border-slate-100 dark:border-white/5 text-center">
                            <h5 className="text-2xl font-black text-slate-900 dark:text-white">12</h5>
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Seksiyalar</p>
                        </Card>
                        <Card className="p-4 border-slate-100 dark:border-white/5 text-center">
                            <h5 className="text-2xl font-black text-indigo-500">450+</h5>
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">A'zolar</p>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
}