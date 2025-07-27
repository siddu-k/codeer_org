"use client";

import { useEffect, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CheckCircle2Icon, AlertCircleIcon, InfoIcon, Loader2Icon } from "lucide-react";

interface ToastProps {
    message: string;
    type: "success" | "error" | "info" | "loading";
    duration?: number;
    onClose: () => void;
}

export function Toast({ message, type, duration = 4000, onClose }: ToastProps) {
    const [isVisible, setIsVisible] = useState(false);
    const [isLeaving, setIsLeaving] = useState(false);

    useEffect(() => {
        // Slide in animation
        const showTimer = setTimeout(() => setIsVisible(true), 100);

        if (type !== "loading") {
            const hideTimer = setTimeout(() => {
                setIsLeaving(true);
                setTimeout(() => {
                    setIsVisible(false);
                    setTimeout(onClose, 300);
                }, 300);
            }, duration);

            return () => {
                clearTimeout(showTimer);
                clearTimeout(hideTimer);
            };
        }

        return () => clearTimeout(showTimer);
    }, [duration, onClose, type]);

    const getAlertVariant = () => {
        switch (type) {
            case "error":
                return "destructive";
            default:
                return "default";
        }
    };

    const getIcon = () => {
        switch (type) {
            case "success":
                return <CheckCircle2Icon className="h-4 w-4" />;
            case "error":
                return <AlertCircleIcon className="h-4 w-4" />;
            case "info":
                return <InfoIcon className="h-4 w-4" />;
            case "loading":
                return <Loader2Icon className="h-4 w-4 animate-spin" />;
            default:
                return null;
        }
    };

    const getAlertTitle = () => {
        switch (type) {
            case "success":
                return "Success!";
            case "error":
                return "Error";
            case "info":
                return "Info";
            case "loading":
                return "Loading...";
            default:
                return "";
        }
    };

    const getBackgroundColor = () => {
        switch (type) {
            case "success":
                return "bg-[#262626] border-[#404040] text-white";
            case "error":
                return "bg-[#262626] border-[#404040] text-white";
            case "info":
                return "bg-[#262626] border-[#404040] text-white";
            case "loading":
                return "bg-[#262626] border-[#404040] text-white";
            default:
                return "bg-[#262626] border-[#404040] text-white";
        }
    };

    const slideClasses = isLeaving
        ? "translate-x-full opacity-0"
        : isVisible
            ? "translate-x-0 opacity-100"
            : "translate-x-full opacity-0";

    return (
        <div
            className={`max-w-md min-w-[320px] transition-all duration-300 ease-in-out transform ${slideClasses}`}
        >
            <Alert
                variant={getAlertVariant()}
                className={`shadow-xl border-2 px-4 py-4 rounded-lg ${getBackgroundColor()}`}
            >
                {getIcon()}
                <AlertTitle className="text-sm font-medium">
                    {getAlertTitle()}
                </AlertTitle>
                <AlertDescription className="text-sm leading-relaxed">
                    {message}
                </AlertDescription>
            </Alert>
        </div>
    );
}