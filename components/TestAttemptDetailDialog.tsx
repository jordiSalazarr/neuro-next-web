"use client";

import { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    AlertCircle,
    CheckCircle2,
    Info,
    TrendingUp,
    Brain,
    Clock,
} from "lucide-react";

import type {
    TestAttempt,
    BVMTDetailedScores,
    ClockDrawingDetailedScores,
    VerbalMemoryDetailedScores,
    VerbalFluencyDetailedScores,
    LetterCancellationDetailedScores,
} from "@/types/TestAttempt";
import {
    formatPerformanceLevel,
    formatDomain,
    getScoreColor,
    formatConfidence,
    formatPercentage,
    formatDuration,
    formatDate,
} from "@/src/utils/testAttemptFormatters";

interface TestAttemptDetailDialogProps {
    attempt: TestAttempt | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function TestAttemptDetailDialog({
    attempt,
    open,
    onOpenChange,
}: TestAttemptDetailDialogProps) {
    if (!attempt) return null;

    const globalScore =
        attempt.scores?.globalScore ?? attempt.scores?.rawScore ?? 0;
    const interpretation = attempt.scores?.interpretation;
    const detailedScores = attempt.scores?.detailedScores;
    const mlConfidence =
        attempt.scores?.mlConfidence ?? (detailedScores as any)?.mlConfidence;
    const mlReasoning =
        attempt.scores?.mlReasoning ?? (detailedScores as any)?.mlReasoning;
    const validity = attempt.validity;

    const scoreStyle = getScoreColor(globalScore);
    const perfStyle = formatPerformanceLevel(interpretation?.performanceLevel);
    const domainInfo = formatDomain(
        interpretation?.domain ?? attempt.domain ?? undefined
    );
    const confidenceInfo = formatConfidence(mlConfidence);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl max-h-[90vh]">
                <DialogHeader>
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                            <DialogTitle className="text-2xl">{attempt.testName}</DialogTitle>
                            <DialogDescription className="mt-1">
                                {attempt.testCode} • {formatDate(attempt.completedAt)}
                            </DialogDescription>
                        </div>
                        <div
                            className={`flex flex-col items-center justify-center px-4 py-2 rounded-lg border-2 ${scoreStyle.borderColor} ${scoreStyle.bgColor}`}
                        >
                            <span className={`text-3xl font-bold ${scoreStyle.textColor}`}>
                                {Math.round(globalScore)}
                            </span>
                            <span className="text-xs text-muted-foreground mt-0.5">
                                Global Score
                            </span>
                        </div>
                    </div>
                </DialogHeader>

                <ScrollArea className="max-h-[calc(90vh-120px)] pr-4">
                    <Tabs defaultValue="overview" className="w-full">
                        <TabsList className="grid w-full grid-cols-4">
                            <TabsTrigger value="overview">Overview</TabsTrigger>
                            <TabsTrigger value="details">Detailed Metrics</TabsTrigger>
                            <TabsTrigger value="ml">ML Analysis</TabsTrigger>
                            <TabsTrigger value="validity">Validity & Quality</TabsTrigger>
                        </TabsList>

                        {/* OVERVIEW TAB */}
                        <TabsContent value="overview" className="space-y-4 mt-4">
                            {/* Performance Summary */}
                            <Card>
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-base flex items-center gap-2">
                                        <TrendingUp className="h-4 w-4" />
                                        Performance Summary
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    {interpretation?.performanceLevel && (
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm text-muted-foreground">
                                                Performance Level
                                            </span>
                                            <Badge
                                                className={`${perfStyle.bgColor} ${perfStyle.color} border`}
                                            >
                                                {perfStyle.icon} {perfStyle.label}
                                            </Badge>
                                        </div>
                                    )}
                                    {domainInfo && (
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm text-muted-foreground">
                                                Primary Domain
                                            </span>
                                            <Badge variant="outline" className={domainInfo.color}>
                                                {domainInfo.icon} {domainInfo.label}
                                            </Badge>
                                        </div>
                                    )}
                                    {interpretation?.summary && (
                                        <>
                                            <Separator />
                                            <div className="text-sm bg-muted/30 p-3 rounded-lg">
                                                {interpretation.summary}
                                            </div>
                                        </>
                                    )}
                                </CardContent>
                            </Card>

                            {/* Clinical Notes */}
                            {interpretation?.clinicalNotes &&
                                interpretation.clinicalNotes.length > 0 && (
                                    <Card>
                                        <CardHeader className="pb-3">
                                            <CardTitle className="text-base flex items-center gap-2">
                                                <Info className="h-4 w-4" />
                                                Clinical Notes
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <ul className="space-y-2">
                                                {interpretation.clinicalNotes.map((note, idx) => (
                                                    <li key={idx} className="flex items-start gap-2 text-sm">
                                                        <span className="text-blue-500 mt-0.5">•</span>
                                                        <span>{note}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </CardContent>
                                    </Card>
                                )}

                            {/* Recommendations */}
                            {interpretation?.recommendations &&
                                interpretation.recommendations.length > 0 && (
                                    <Card>
                                        <CardHeader className="pb-3">
                                            <CardTitle className="text-base flex items-center gap-2">
                                                <CheckCircle2 className="h-4 w-4 text-green-600" />
                                                Recommendations
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <ul className="space-y-2">
                                                {interpretation.recommendations.map((rec, idx) => (
                                                    <li key={idx} className="flex items-start gap-2 text-sm">
                                                        <span className="text-green-500 mt-0.5">✓</span>
                                                        <span>{rec}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </CardContent>
                                    </Card>
                                )}
                        </TabsContent>

                        {/* DETAILED METRICS TAB */}
                        <TabsContent value="details" className="space-y-4 mt-4">
                            <Card>
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-base flex items-center gap-2">
                                        <Brain className="h-4 w-4" />
                                        Test-Specific Metrics
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {renderDetailedMetrics(attempt.testCode, detailedScores)}
                                </CardContent>
                            </Card>

                            {/* Duration */}
                            {attempt.durationSeconds != null && (
                                <Card>
                                    <CardHeader className="pb-3">
                                        <CardTitle className="text-base flex items-center gap-2">
                                            <Clock className="h-4 w-4" />
                                            Timing Information
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="grid grid-cols-2 gap-3">
                                        <MetricRow
                                            label="Duration"
                                            value={formatDuration(attempt.durationSeconds)}
                                        />
                                        <MetricRow
                                            label="Started"
                                            value={formatDate(attempt.startedAt)}
                                        />
                                        <MetricRow
                                            label="Completed"
                                            value={formatDate(attempt.completedAt)}
                                        />
                                    </CardContent>
                                </Card>
                            )}
                        </TabsContent>

                        {/* ML ANALYSIS TAB */}
                        <TabsContent value="ml" className="space-y-4 mt-4">
                            {/* ML Confidence */}
                            {mlConfidence != null && (
                                <Card>
                                    <CardHeader className="pb-3">
                                        <CardTitle className="text-base">
                                            ML Analysis Confidence
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm text-muted-foreground">
                                                Confidence Level
                                            </span>
                                            <Badge
                                                variant="outline"
                                                className={`${confidenceInfo.color} font-semibold`}
                                            >
                                                {confidenceInfo.percentage} - {confidenceInfo.label}
                                            </Badge>
                                        </div>
                                        <Progress value={mlConfidence * 100} className="h-2" />
                                    </CardContent>
                                </Card>
                            )}

                            {/* ML Reasoning */}
                            {mlReasoning && (
                                <Card>
                                    <CardHeader className="pb-3">
                                        <CardTitle className="text-base">ML Reasoning</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-sm bg-muted/30 p-4 rounded-lg">
                                            {mlReasoning}
                                        </div>
                                    </CardContent>
                                </Card>
                            )}

                            {/* Transcribed/Processed Data */}
                            {renderMLData(attempt.testCode, detailedScores)}
                        </TabsContent>

                        {/* VALIDITY TAB */}
                        <TabsContent value="validity" className="space-y-4 mt-4">
                            <Card>
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-base flex items-center gap-2">
                                        {validity?.isValid ? (
                                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                                        ) : (
                                            <AlertCircle className="h-4 w-4 text-amber-600" />
                                        )}
                                        Validity Assessment
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-muted-foreground">
                                            Is Valid
                                        </span>
                                        <Badge
                                            variant={validity?.isValid ? "default" : "outline"}
                                            className={
                                                validity?.isValid
                                                    ? "bg-green-100 text-green-800"
                                                    : "bg-amber-100 text-amber-800"
                                            }
                                        >
                                            {validity?.isValid ? "Valid" : "Has Flags"}
                                        </Badge>
                                    </div>

                                    {validity?.flags && validity.flags.length > 0 && (
                                        <>
                                            <Separator />
                                            <div>
                                                <h4 className="text-sm font-medium mb-2">
                                                    Validity Flags
                                                </h4>
                                                <div className="space-y-1">
                                                    {validity.flags.map((flag, idx) => (
                                                        <Badge
                                                            key={idx}
                                                            variant="outline"
                                                            className="mr-2 mb-2"
                                                        >
                                                            {flag}
                                                        </Badge>
                                                    ))}
                                                </div>
                                            </div>
                                        </>
                                    )}

                                    {validity?.notes && (
                                        <>
                                            <Separator />
                                            <div>
                                                <h4 className="text-sm font-medium mb-2">Notes</h4>
                                                <div className="text-sm bg-muted/30 p-3 rounded-lg">
                                                    {validity.notes}
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </CardContent>
                            </Card>
                        </TabsContent>
                    </Tabs>
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
}

// =============================================================================
// Helper Components
// =============================================================================

function MetricRow({ label, value }: { label: string; value: React.ReactNode }) {
    return (
        <div className="flex flex-col">
            <span className="text-xs text-muted-foreground">{label}</span>
            <span className="text-sm font-medium mt-0.5">{value}</span>
        </div>
    );
}

function MetricGrid({ children }: { children: React.ReactNode }) {
    return <div className="grid grid-cols-2 md:grid-cols-3 gap-3">{children}</div>;
}

// =============================================================================
// Test-Specific Renderers
// =============================================================================

function renderDetailedMetrics(testCode: string, detailedScores: any) {
    if (!detailedScores) {
        return <p className="text-sm text-muted-foreground">No detailed metrics available.</p>;
    }

    const code = testCode.toUpperCase();

    if (code === "BVMT" || code.includes("VISUAL_MEMORY")) {
        return renderBVMTMetrics(detailedScores as BVMTDetailedScores);
    } else if (code === "CLOCK_DRAWING" || code.includes("CLOCK")) {
        return renderClockMetrics(detailedScores as ClockDrawingDetailedScores);
    } else if (code.includes("VERBAL_MEMORY")) {
        return renderVerbalMemoryMetrics(detailedScores as VerbalMemoryDetailedScores);
    } else if (code.includes("VERBAL_FLUENCY") || code.includes("FLUENCY")) {
        return renderVerbalFluencyMetrics(detailedScores as VerbalFluencyDetailedScores);
    } else if (code.includes("LETTER") || code.includes("CANCELLATION")) {
        return renderLetterCancellationMetrics(
            detailedScores as LetterCancellationDetailedScores
        );
    }

    // Generic fallback
    return (
        <div className="space-y-2">
            {Object.entries(detailedScores).map(([key, value]) => {
                if (typeof value === "object") return null;
                return (
                    <div key={key} className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground capitalize">
                            {key.replace(/([A-Z])/g, " $1").trim()}
                        </span>
                        <span className="font-medium">{String(value)}</span>
                    </div>
                );
            })}
        </div>
    );
}

function renderBVMTMetrics(scores: BVMTDetailedScores) {
    return (
        <div className="space-y-4">
            <MetricGrid>
                <MetricRow label="Total Score" value={`${scores.totalScore} / ${scores.totalPossibleScore}`} />
                <MetricRow label="VM Norm" value={scores.vmNorm} />
                <MetricRow label="Figure Count" value={scores.figureCount} />
                <MetricRow label="Position Errors" value={scores.positionErrorCount} />
                <MetricRow label="Rotation Errors" value={scores.rotationErrorCount} />
                <MetricRow label="Total Errors" value={scores.totalErrorCount} />
            </MetricGrid>

            {scores.figureScores && scores.figureScores.length > 0 && (
                <>
                    <Separator />
                    <div>
                        <h4 className="text-sm font-medium mb-3">Figure Breakdown</h4>
                        <div className="space-y-2">
                            {scores.figureScores.map((fig) => (
                                <div
                                    key={fig.figureId}
                                    className="flex items-center justify-between text-sm bg-muted/30 p-2 rounded"
                                >
                                    <span className="font-medium">Figure {fig.figureId}</span>
                                    <div className="flex items-center gap-3">
                                        <span>Score: {fig.score}</span>
                                        <span>Accuracy: {formatPercentage(fig.accuracy)}</span>
                                        {fig.positionError && (
                                            <Badge variant="outline" className="text-xs">
                                                Pos Error
                                            </Badge>
                                        )}
                                        {fig.rotationError && (
                                            <Badge variant="outline" className="text-xs">
                                                Rot Error
                                            </Badge>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

function renderClockMetrics(scores: ClockDrawingDetailedScores) {
    return (
        <div className="space-y-4">
            <MetricGrid>
                <MetricRow label="Shulman Score" value={`${scores.shulmanScore} / 5`} />
                <MetricRow label="Normalized Score" value={scores.normalizedScore} />
                {scores.requestedTime && (
                    <MetricRow label="Requested Time" value={scores.requestedTime} />
                )}
                {scores.errorPattern && (
                    <MetricRow label="Error Pattern" value={scores.errorPattern} />
                )}
            </MetricGrid>

            {scores.errorDetails && (
                <>
                    <Separator />
                    <div>
                        <h4 className="text-sm font-medium mb-3">Error Details</h4>
                        <div className="flex flex-wrap gap-2">
                            {Object.entries(scores.errorDetails).map(([key, hasError]) => {
                                if (!hasError) return null;
                                return (
                                    <Badge key={key} variant="outline" className="text-xs">
                                        {key
                                            .replace(/([A-Z])/g, " $1")
                                            .trim()
                                            .replace(/^./, (str) => str.toUpperCase())}
                                    </Badge>
                                );
                            })}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

function renderVerbalMemoryMetrics(scores: VerbalMemoryDetailedScores) {
    return (
        <div className="space-y-4">
            <MetricGrid>
                <MetricRow label="Accuracy" value={formatPercentage(scores.accuracy)} />
                <MetricRow label="Total Hits" value={`${scores.totalHits} / ${scores.listLength}`} />
                <MetricRow label="Omissions" value={scores.totalOmissions} />
                <MetricRow label="Intrusions" value={scores.totalIntrusions} />
                <MetricRow label="Perseverations" value={scores.totalPerseverations} />
                <MetricRow label="Total Responses" value={scores.totalResponses} />
                {scores.delayMinutes != null && (
                    <MetricRow label="Delay" value={`${scores.delayMinutes} min`} />
                )}
                {scores.retentionIndex != null && (
                    <MetricRow label="Retention Index" value={formatPercentage(scores.retentionIndex)} />
                )}
            </MetricGrid>
        </div>
    );
}

function renderVerbalFluencyMetrics(scores: VerbalFluencyDetailedScores) {
    return (
        <div className="space-y-4">
            <MetricGrid>
                <MetricRow label="Valid Words" value={scores.uniqueValidCount} />
                <MetricRow label="Total Words" value={scores.totalWordsCount} />
                <MetricRow label="Words/Minute" value={scores.wordsPerMinute.toFixed(1)} />
                <MetricRow label="Category" value={scores.category} />
                <MetricRow label="Duration" value={`${scores.durationSeconds}s`} />
                <MetricRow label="Intrusions" value={scores.intrusionCount} />
                <MetricRow label="Perseverations" value={scores.perseverationCount} />
            </MetricGrid>
        </div>
    );
}

function renderLetterCancellationMetrics(scores: LetterCancellationDetailedScores) {
    return (
        <div className="space-y-4">
            <MetricGrid>
                <MetricRow label="Score" value={scores.score} />
                <MetricRow label="Accuracy" value={formatPercentage(scores.accuracy)} />
                <MetricRow label="Correct" value={`${scores.correct} / ${scores.totalTargets}`} />
                <MetricRow label="Errors" value={scores.errors} />
                <MetricRow label="Omissions" value={scores.omissions} />
                <MetricRow label="Hits/Min" value={scores.hitsPerMin.toFixed(2)} />
                <MetricRow label="Errors/Min" value={scores.errorsPerMin.toFixed(2)} />
                <MetricRow label="Time" value={`${scores.timeInSecs}s`} />
            </MetricGrid>
        </div>
    );
}

function renderMLData(testCode: string, detailedScores: any) {
    if (!detailedScores) return null;

    const transcribedWords = (detailedScores as any)?.transcribedWords;
    const wordClassifications = (detailedScores as any)?.wordClassifications;

    if (!transcribedWords && !wordClassifications) {
        return (
            <Card>
                <CardContent className="pt-6">
                    <p className="text-sm text-muted-foreground text-center">
                        No additional ML-processed data available.
                    </p>
                </CardContent>
            </Card>
        );
    }

    return (
        <>
            {transcribedWords && transcribedWords.length > 0 && (
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base">Transcribed Words</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-wrap gap-2">
                            {transcribedWords.map((word: string, idx: number) => (
                                <Badge key={idx} variant="secondary">
                                    {word}
                                </Badge>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {wordClassifications && (
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base">Word Classifications</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {wordClassifications.valid && wordClassifications.valid.length > 0 && (
                            <div>
                                <h5 className="text-xs font-medium text-green-700 mb-2">
                                    Valid ({wordClassifications.valid.length})
                                </h5>
                                <div className="flex flex-wrap gap-1.5">
                                    {wordClassifications.valid.map((item: any, idx: number) => (
                                        <Badge
                                            key={idx}
                                            className="bg-green-50 text-green-700 border-green-200"
                                        >
                                            {item.word}
                                            {item.confidence != null && (
                                                <span className="ml-1 opacity-60">
                                                    ({Math.round(item.confidence * 100)}%)
                                                </span>
                                            )}
                                        </Badge>
                                    ))}
                                </div>
                            </div>
                        )}

                        {wordClassifications.intrusions &&
                            wordClassifications.intrusions.length > 0 && (
                                <div>
                                    <h5 className="text-xs font-medium text-red-700 mb-2">
                                        Intrusions ({wordClassifications.intrusions.length})
                                    </h5>
                                    <div className="flex flex-wrap gap-1.5">
                                        {wordClassifications.intrusions.map((item: any, idx: number) => (
                                            <Badge
                                                key={idx}
                                                className="bg-red-50 text-red-700 border-red-200"
                                            >
                                                {item.word}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>
                            )}

                        {wordClassifications.perseverations &&
                            wordClassifications.perseverations.length > 0 && (
                                <div>
                                    <h5 className="text-xs font-medium text-amber-700 mb-2">
                                        Perseverations ({wordClassifications.perseverations.length})
                                    </h5>
                                    <div className="flex flex-wrap gap-1.5">
                                        {wordClassifications.perseverations.map(
                                            (item: any, idx: number) => (
                                                <Badge
                                                    key={idx}
                                                    className="bg-amber-50 text-amber-700 border-amber-200"
                                                >
                                                    {item.word}
                                                </Badge>
                                            )
                                        )}
                                    </div>
                                </div>
                            )}

                        {wordClassifications.omissions &&
                            wordClassifications.omissions.length > 0 && (
                                <div>
                                    <h5 className="text-xs font-medium text-gray-700 mb-2">
                                        Omissions ({wordClassifications.omissions.length})
                                    </h5>
                                    <div className="flex flex-wrap gap-1.5">
                                        {wordClassifications.omissions.map((word: string, idx: number) => (
                                            <Badge
                                                key={idx}
                                                variant="outline"
                                                className="text-gray-600"
                                            >
                                                {word}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>
                            )}
                    </CardContent>
                </Card>
            )}
        </>
    );
}
