"use client";

import { createContext, useContext, useState, ReactNode } from "react";
import { Toast } from "./toast";

interface ToastData {
    id: string;
    message: string;
    type: "success" | "error" | "info" | "loading";
    duration?: number;
}

interface ToastContextType {
    showToast: (message: string, type: ToastData["type"], duration?: number) => string;
    removeToast: (id: string) => void;
    updateToast: (id: string, message: string, type: ToastData["type"]) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
    const [toasts, setToasts] = useState<ToastData[]>([]);

    const showToast = (message: string, type: ToastData["type"], duration?: number): string => {
        const id = Math.random().toString(36).substr(2, 9);
        const newToast: ToastData = { id, message, type, duration };

        setToasts(prev => [...prev, newToast]);
        return id;
    };

    const removeToast = (id: string) => {
        setToasts(prev => prev.filter(toast => toast.id !== id));
    };

    const updateToast = (id: string, message: string, type: ToastData["type"]) => {
        setToasts(prev =>
            prev.map(toast =>
                toast.id === id ? { ...toast, message, type } : toast
            )
        );
    };

    return (
        <ToastContext.Provider value={{ showToast, removeToast, updateToast }}>
            {children}
            {toasts.map((toast, index) => (
                <div
                    key={toast.id}
                    style={{
                        top: `${1 + (index * 5)}rem`, // Stack toasts vertically with more space
                        right: '1rem'
                    }}
                    className="fixed z-50"
                >
                    <Toast
                        message={toast.message}
                        type={toast.type}
                        duration={toast.duration}
                        onClose={() => removeToast(toast.id)}
                    />
                </div>
            ))}
        </ToastContext.Provider>
    );
}

export function useToast() {
    const context = useContext(ToastContext);
    if (context === undefined) {
        throw new Error("useToast must be used within a ToastProvider");
    }
    return context;
}
