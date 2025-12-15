"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, FileText } from "lucide-react";
import { TestAttemptCard } from "@/components/TestAttemptCard";
import { TestAttemptDetailDialog } from "@/components/TestAttemptDetailDialog";
import type { TestAttempt, ListAttemptsResponse } from "@/types/TestAttempt";

interface IndividualTestResultsSectionProps {
    evaluationId: string;
}

export function IndividualTestResultsSection({
    evaluationId,
}: IndividualTestResultsSectionProps) {
    const [attempts, setAttempts] = useState<TestAttempt[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedAttempt, setSelectedAttempt] = useState<TestAttempt | null>(
        null
    );
    const [dialogOpen, setDialogOpen] = useState(false);

    const base =
        process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8401";

    useEffect(() => {
        if (!evaluationId) return;

        const fetchAttempts = async () => {
            setLoading(true);
            setError(null);

            try {
                const response = await fetch(
                    `${base}/v1/evaluations/${evaluationId}/attempts`
                );

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                }

                const data: ListAttemptsResponse = await response.json();
                setAttempts(data.attempts || []);
            } catch (err: any) {
                console.error("Error fetching attempts:", err);
                setError(err.message || "Failed to load test attempts");
            } finally {
                setLoading(false);
            }
        };

        fetchAttempts();
    }, [evaluationId, base]);

    const handleCardClick = (attempt: TestAttempt) => {
        setSelectedAttempt(attempt);
        setDialogOpen(true);
    };

    if (loading) {
        return (
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        Individual Test Results
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {[1, 2, 3].map((i) => (
                            <Skeleton key={i} className="h-48 w-full rounded-xl" />
                        ))}
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (error) {
        return (
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        Individual Test Results
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                </CardContent>
            </Card>
        );
    }

    if (attempts.length === 0) {
        return (
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        Individual Test Results
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground text-center py-8">
                        No test attempts found for this evaluation.
                    </p>
                </CardContent>
            </Card>
        );
    }

    return (
        <>
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        Individual Test Results
                        <span className="text-sm font-normal text-muted-foreground ml-2">
                            ({attempts.length} test{attempts.length !== 1 ? "s" : ""})
                        </span>
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {attempts.map((attempt) => (
                            <TestAttemptCard
                                key={attempt.id}
                                attempt={attempt}
                                onClick={() => handleCardClick(attempt)}
                            />
                        ))}
                    </div>
                </CardContent>
            </Card>

            <TestAttemptDetailDialog
                attempt={selectedAttempt}
                open={dialogOpen}
                onOpenChange={setDialogOpen}
            />
        </>
    );
}
