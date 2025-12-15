"use client";

import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import type { TestAttempt } from "@/types/TestAttempt";
import {
    formatPerformanceLevel,
    formatDomain,
    getScoreColor,
    formatConfidence,
} from "@/src/utils/testAttemptFormatters";

interface TestAttemptCardProps {
    attempt: TestAttempt;
    onClick?: () => void;
}

export function TestAttemptCard({ attempt, onClick }: TestAttemptCardProps) {
    const globalScore =
        attempt.scores?.globalScore ?? attempt.scores?.rawScore ?? 0;
    const interpretation = attempt.scores?.interpretation;
    const mlConfidence =
        attempt.scores?.mlConfidence ??
        (attempt.scores?.detailedScores as any)?.mlConfidence;
    const validity = attempt.validity;

    const scoreStyle = getScoreColor(globalScore);
    const perfStyle = formatPerformanceLevel(interpretation?.performanceLevel);
    const domainInfo = formatDomain(
        interpretation?.domain ?? attempt.domain ?? undefined
    );
    const confidenceInfo = formatConfidence(mlConfidence);

    const isComplete = attempt.status === "COMPLETED";
    const hasValidityFlags = validity?.flags && validity.flags.length > 0;

    return (
        <motion.div
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            transition={{ duration: 0.2 }}
        >
            <Card
                className={`cursor-pointer border-2 transition-all hover:shadow-lg ${onClick ? "hover:border-blue-300" : ""
                    } ${!isComplete ? "opacity-60" : ""}`}
                onClick={onClick}
            >
                <CardContent className="p-4 space-y-3">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-base truncate">
                                {attempt.testName}
                            </h3>
                            <p className="text-xs text-muted-foreground truncate">
                                {attempt.testCode}
                            </p>
                        </div>
                        <div
                            className={`flex flex-col items-end justify-center px-3 py-1.5 rounded-lg border ${scoreStyle.borderColor} ${scoreStyle.bgColor}`}
                        >
                            <span className={`text-2xl font-bold ${scoreStyle.textColor}`}>
                                {Math.round(globalScore)}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                                / 100
                            </span>
                        </div>
                    </div>

                    {/* Performance Level */}
                    {interpretation?.performanceLevel && (
                        <Badge
                            className={`${perfStyle.bgColor} ${perfStyle.color} border flex items-center gap-1.5 w-fit`}
                        >
                            <span>{perfStyle.icon}</span>
                            <span className="text-xs">{perfStyle.label}</span>
                        </Badge>
                    )}

                    {/* Domain & Secondary Domains */}
                    <div className="flex flex-wrap gap-1.5">
                        {domainInfo && (
                            <div className="flex items-center gap-1 text-xs">
                                <span>{domainInfo.icon}</span>
                                <span className={domainInfo.color}>{domainInfo.label}</span>
                            </div>
                        )}
                        {interpretation?.secondaryDomains &&
                            interpretation.secondaryDomains.slice(0, 2).map((domain) => {
                                const secDomainInfo = formatDomain(domain);
                                return (
                                    <div
                                        key={domain}
                                        className="flex items-center gap-1 text-xs opacity-70"
                                    >
                                        <span>{secDomainInfo.icon}</span>
                                        <span className={secDomainInfo.color}>
                                            {secDomainInfo.label}
                                        </span>
                                    </div>
                                );
                            })}
                    </div>

                    {/* ML Confidence Indicator */}
                    {mlConfidence != null && (
                        <div className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                                <span className="text-muted-foreground">ML Confidence</span>
                                <span className={`font-medium ${confidenceInfo.color}`}>
                                    {confidenceInfo.percentage}
                                </span>
                            </div>
                            <Progress value={mlConfidence * 100} className="h-1.5" />
                        </div>
                    )}

                    {/* Validity Flags */}
                    {hasValidityFlags && (
                        <div className="flex items-center gap-1.5 text-xs">
                            <Badge variant="outline" className="text-amber-700 bg-amber-50">
                                {validity.flags!.length} flag{validity.flags!.length > 1 ? "s" : ""}
                            </Badge>
                        </div>
                    )}

                    {/* Summary */}
                    {interpretation?.summary && (
                        <p className="text-xs text-muted-foreground line-clamp-2">
                            {interpretation.summary}
                        </p>
                    )}
                </CardContent>
            </Card>
        </motion.div>
    );
}
