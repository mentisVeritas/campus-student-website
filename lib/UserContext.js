"use client";
import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth, db } from './firebase'; // Firebase konfiguratsiya faylingiz manzili
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';

const UserContext = createContext();

export const UserProvider = ({ children }) => {
    // Endi "role" ni alohida state qilish shart emas, u "user" obyektining ichida keladi
    const [user, setUser] = useState(null);
    const [isDarkMode, setIsDarkMode] = useState(false);
    const [loading, setLoading] = useState(true);

    // 1. FIREBASE AUTH LISTENER (Foydalanuvchini jonli kuzatish)
    useEffect(() => {
        let unsubscribeDoc = null;

        const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                // Real-time Firestore listener
                unsubscribeDoc = onSnapshot(doc(db, 'users', firebaseUser.uid), (snapshot) => {
                    if (snapshot.exists()) {
                        const userData = snapshot.data();
                        setUser({
                            uid: firebaseUser.uid,
                            email: firebaseUser.email,
                            ...userData
                        });
                    } else {
                        setUser({
                            uid: firebaseUser.uid,
                            email: firebaseUser.email,
                            role: 'student'
                        });
                    }
                    setLoading(false);
                }, (error) => {
                    console.error("Firestore Listener Error:", error);
                    setLoading(false);
                });
            } else {
                setUser(null);
                setLoading(false);
                if (unsubscribeDoc) unsubscribeDoc();
            }
        });

        return () => {
            unsubscribeAuth();
            if (unsubscribeDoc) unsubscribeDoc();
        };
    }, []);

    // 2. DARK MODE (Tungi rejim) NI KUZATISH
    useEffect(() => {
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme === 'dark') {
            setIsDarkMode(true);
            document.documentElement.classList.add('dark');
        } else {
            setIsDarkMode(false);
            document.documentElement.classList.remove('dark');
        }
    }, []);

    // Tungi/Yorug' rejimni o'zgartirish funksiyasi
    const toggleDarkMode = () => {
        const nextMode = !isDarkMode;
        setIsDarkMode(nextMode);
        if (nextMode) {
            document.documentElement.classList.add('dark');
            localStorage.setItem('theme', 'dark');
        } else {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('theme', 'light');
        }
    };

    // Logout holatini tozalash
    const logout = () => {
        setUser(null);
    };

    // E'tibor bering: "login" funksiyasi olib tashlandi, chunki endi login jarayonini 
    // LoginPage'ning o'zida signInWithEmailAndPassword orqali qilyapmiz. 
    // Context esa uni avtomat eshitib oladi!
    return (
        <UserContext.Provider value={{ user, logout, loading, isDarkMode, toggleDarkMode }}>
            {children}
        </UserContext.Provider>
    );
};

export const useUser = () => {
    const context = useContext(UserContext);
    if (!context) {
        throw new Error('useUser must be used within a UserProvider');
    }
    return context;
};