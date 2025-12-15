/**
 * Test Attempt Types
 *
 * Comprehensive types for test attempts and their scoring metadata.
 * Maps to backend AttemptDetailResponse and related schemas.
 */

export type AttemptStatus = "PENDING" | "IN_PROGRESS" | "COMPLETED" | "FAILED" | "PROCESSING";

export type PerformanceLevel =
    | "severely_impaired"
    | "moderate_severe_impairment"
    | "mild_moderate_impairment"
    | "borderline"
    | "preserved"
    | "above_average"
    | "superior";

export type CognitiveDomain =
    | "memory"
    | "attention"
    | "language"
    | "visuospatial"
    | "executive"
    | "processing_speed";

// =============================================================================
// Core Interpretation & Validity Types
// =============================================================================

export interface TestInterpretation {
    summary: string;
    performanceLevel: PerformanceLevel;
    domain?: CognitiveDomain;
    secondaryDomains?: string[];
    clinicalNotes?: string[];
    recommendations?: string[];
}

export interface AttemptValidity {
    isValid: boolean;
    flags?: string[];
    notes?: string | null;
}

// =============================================================================
// Test-Specific Score Types
// =============================================================================

export interface FigureScore {
    figureId: number;
    accuracy: number;
    positionError: boolean;
    rotationError: boolean;
    score: number;
}

export interface WordClassification {
    valid: Array<{ word: string; confidence: number; target?: string }>;
    intrusions: Array<{ word: string; confidence: number }>;
    perseverations: Array<{ word: string; confidence: number }>;
    omissions?: string[];
}

export interface ErrorDetails {
    contourDistortion?: boolean;
    numbersMissing?: boolean;
    numbersMisplaced?: boolean;
    handsMissing?: boolean;
    handsWrongPosition?: boolean;
    timeNotRepresented?: boolean;
    [key: string]: boolean | undefined;
}

// =============================================================================
// Test-Specific Detailed Scores
// =============================================================================

export interface BVMTDetailedScores {
    totalScore: number;
    totalPossibleScore: number;
    vmNorm: number;
    positionErrorCount: number;
    rotationErrorCount: number;
    totalErrorCount: number;
    figureCount: number;
    presentationTimeSeconds: number;
    figureScores: FigureScore[];
    mlAnalyzed?: boolean;
    mlConfidence?: number;
    mlReasoning?: string;
}

export interface ClockDrawingDetailedScores {
    shulmanScore: number;
    normalizedScore: number;
    errorPattern?: string;
    requestedTime?: string;
    errorDetails?: ErrorDetails;
    mlAnalyzed?: boolean;
    mlConfidence?: number;
    mlReasoning?: string;
}

export interface VerbalMemoryDetailedScores {
    accuracy: number;
    intrusionRate: number;
    perseverationRate: number;
    listLength: number;
    totalHits: number;
    totalOmissions: number;
    totalIntrusions: number;
    totalPerseverations: number;
    totalResponses: number;
    mlAnalyzed?: boolean;
    transcribedWords?: string[];
    wordClassifications?: WordClassification;
    mlConfidence?: number;
    retentionIndex?: number | null;
    immediateHits?: number | null;
    delayMinutes?: number;
}

export interface VerbalFluencyDetailedScores {
    uniqueValidCount: number;
    totalWordsCount: number;
    wordsPerMinute: number;
    intrusionRate: number;
    perseverationRate: number;
    category: string;
    durationSeconds: number;
    intrusionCount: number;
    perseverationCount: number;
    mlAnalyzed?: boolean;
    transcribedWords?: string[];
    wordClassifications?: WordClassification;
    mlConfidence?: number;
}

export interface LetterCancellationDetailedScores {
    score: number;
    cpPerMin: number;
    accuracy: number;
    omissions: number;
    omissionsRate: number;
    commissionRate: number;
    hitsPerMin: number;
    errorsPerMin: number;
    totalTargets?: number;
    correct?: number;
    errors?: number;
    timeInSecs?: number;
}

// Union of all possible detailed scores
export type DetailedScores =
    | BVMTDetailedScores
    | ClockDrawingDetailedScores
    | VerbalMemoryDetailedScores
    | VerbalFluencyDetailedScores
    | LetterCancellationDetailedScores
    | Record<string, any>; // fallback for unknown test types

// =============================================================================
// Main AttemptScore Type
// =============================================================================

export interface AttemptScore {
    // Basic scores (for backwards compatibility)
    rawScore: number;
    scaledScore?: number | null;
    percentile?: number | null;
    domainScores?: Record<string, number>;

    // New comprehensive fields
    globalScore?: number; // Main score (0-100)
    detailedScores: DetailedScores;
    interpretation?: TestInterpretation;

    // ML metadata
    mlConfidence?: number;
    mlReasoning?: string;
    mlAnalyzed?: boolean;
}

// =============================================================================
// Test Attempt Entity
// =============================================================================

export interface TestAttempt {
    id: string;
    evaluationId: string;
    testDefinitionId: string;
    testCode: string;
    testName: string;
    status: AttemptStatus;
    startedAt: string; // ISO datetime
    completedAt?: string | null; // ISO datetime
    durationSeconds?: number | null;
    scores?: AttemptScore | null;
    validity?: AttemptValidity | null;
    domain?: CognitiveDomain | null;
}

// =============================================================================
// API Response Types
// =============================================================================

export interface ListAttemptsResponse {
    evaluationId: string;
    attempts: TestAttempt[];
    total: number;
    completed: number;
    pending: number;
}

export interface GetAttemptResponse {
    attempt: TestAttempt;
}
