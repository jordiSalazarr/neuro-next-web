/**
 * Test Attempt Formatters
 *
 * Utility functions for formatting test attempt data for display.
 */

import type { PerformanceLevel, CognitiveDomain } from "@/types/TestAttempt";

// =============================================================================
// Confidence Formatting
// =============================================================================

export function formatConfidence(value?: number | null): {
    percentage: string;
    color: string;
    label: string;
} {
    if (value == null) {
        return { percentage: "—", color: "text-gray-400", label: "Unknown" };
    }

    const pct = Math.round(value * 100);

    if (pct >= 90) {
        return {
            percentage: `${pct}%`,
            color: "text-emerald-600",
            label: "Very High",
        };
    } else if (pct >= 75) {
        return {
            percentage: `${pct}%`,
            color: "text-green-600",
            label: "High",
        };
    } else if (pct >= 60) {
        return {
            percentage: `${pct}%`,
            color: "text-amber-600",
            label: "Moderate",
        };
    } else {
        return {
            percentage: `${pct}%`,
            color: "text-red-600",
            label: "Low",
        };
    }
}

// =============================================================================
// Performance Level Formatting
// =============================================================================

export function formatPerformanceLevel(level?: PerformanceLevel | string): {
    label: string;
    color: string;
    bgColor: string;
    icon: string;
} {
    if (!level) {
        return {
            label: "Unknown",
            color: "text-gray-700",
            bgColor: "bg-gray-100",
            icon: "❓",
        };
    }

    const normalized = level.toLowerCase().replace(/[_\s]/g, "");

    if (normalized.includes("severe")) {
        return {
            label: "Severely Impaired",
            color: "text-red-800",
            bgColor: "bg-red-50 border-red-200",
            icon: "⚠️",
        };
    } else if (normalized.includes("moderate")) {
        return {
            label: "Moderately Impaired",
            color: "text-orange-800",
            bgColor: "bg-orange-50 border-orange-200",
            icon: "⚡",
        };
    } else if (normalized.includes("mild")) {
        return {
            label: "Mildly Impaired",
            color: "text-amber-800",
            bgColor: "bg-amber-50 border-amber-200",
            icon: "⚡",
        };
    } else if (normalized.includes("borderline")) {
        return {
            label: "Borderline",
            color: "text-yellow-800",
            bgColor: "bg-yellow-50 border-yellow-200",
            icon: "⚠",
        };
    } else if (normalized.includes("preserved")) {
        return {
            label: "Preserved",
            color: "text-emerald-800",
            bgColor: "bg-emerald-50 border-emerald-200",
            icon: "✓",
        };
    } else if (normalized.includes("above")) {
        return {
            label: "Above Average",
            color: "text-blue-800",
            bgColor: "bg-blue-50 border-blue-200",
            icon: "⭐",
        };
    } else if (normalized.includes("superior")) {
        return {
            label: "Superior",
            color: "text-purple-800",
            bgColor: "bg-purple-50 border-purple-200",
            icon: "🌟",
        };
    } else {
        return {
            label: level,
            color: "text-gray-700",
            bgColor: "bg-gray-100",
            icon: "—",
        };
    }
}

// =============================================================================
// Domain Formatting
// =============================================================================

export function formatDomain(domain?: CognitiveDomain | string): {
    label: string;
    color: string;
    icon: string;
} {
    if (!domain) {
        return { label: "General", color: "text-gray-600", icon: "🧠" };
    }

    switch (domain.toLowerCase()) {
        case "memory":
            return { label: "Memory", color: "text-purple-600", icon: "🧠" };
        case "attention":
            return { label: "Attention", color: "text-blue-600", icon: "👁️" };
        case "language":
            return { label: "Language", color: "text-green-600", icon: "💬" };
        case "visuospatial":
            return { label: "Visuospatial", color: "text-orange-600", icon: "👁️" };
        case "executive":
            return { label: "Executive", color: "text-red-600", icon: "🎯" };
        case "processing_speed":
        case "processingspeed":
            return { label: "Processing Speed", color: "text-cyan-600", icon: "⚡" };
        default:
            return { label: domain, color: "text-gray-600", icon: "🔍" };
    }
}

// =============================================================================
// Score Color
// =============================================================================

export function getScoreColor(score?: number | null): {
    textColor: string;
    bgColor: string;
    borderColor: string;
} {
    if (score == null) {
        return {
            textColor: "text-gray-700",
            bgColor: "bg-gray-100",
            borderColor: "border-gray-200",
        };
    }

    if (score >= 75) {
        return {
            textColor: "text-emerald-700",
            bgColor: "bg-emerald-50",
            borderColor: "border-emerald-200",
        };
    } else if (score >= 50) {
        return {
            textColor: "text-amber-700",
            bgColor: "bg-amber-50",
            borderColor: "border-amber-200",
        };
    } else if (score >= 25) {
        return {
            textColor: "text-orange-700",
            bgColor: "bg-orange-50",
            borderColor: "border-orange-200",
        };
    } else {
        return {
            textColor: "text-red-700",
            bgColor: "bg-red-50",
            borderColor: "border-red-200",
        };
    }
}

// =============================================================================
// Helper Functions
// =============================================================================

export function formatPercentage(value?: number | null): string {
    if (value == null) return "—";
    return `${Math.round(value * 100)}%`;
}

export function formatDuration(seconds?: number | null): string {
    if (seconds == null) return "—";

    if (seconds < 60) {
        return `${seconds}s`;
    }

    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;

    if (secs === 0) {
        return `${mins}m`;
    }

    return `${mins}m ${secs}s`;
}

export function formatDate(isoString?: string | null): string {
    if (!isoString) return "—";

    try {
        const date = new Date(isoString);
        return new Intl.DateTimeFormat("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        }).format(date);
    } catch {
        return isoString;
    }
}
