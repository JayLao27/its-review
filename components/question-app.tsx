"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  Moon,
  Search,
  Shuffle,
  Sun,
  XCircle,
} from "lucide-react";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { Input } from "./ui/input";
import { Progress } from "./ui/progress";
import { cn } from "../lib/utils";
import { TestMode } from "./test-mode";
import {
  normalizeQuestions,
  type NormalizedQuestionItem,
  type QuestionItem,
} from "../lib/questions";

type QuestionAppProps = { questions: QuestionItem[] };

function optionLabel(index: number) {
  return String.fromCharCode(65 + index);
}

function stringifyValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean")
    return String(value);
  if (Array.isArray(value))
    return value.map((v) => stringifyValue(v)).join(" ");
  if (typeof value === "object")
    return Object.entries(value as Record<string, unknown>)
      .map(([k, v]) => `${k} ${stringifyValue(v)}`)
      .join(" ");
  return String(value);
}

function renderAnswer(answer: unknown) {
  if (Array.isArray(answer)) {
    return (
      <div className="flex flex-wrap gap-2">
        {answer.map((a, i) => (
          <Badge
            key={`${String(a)}-${i}`}
            variant="secondary"
            className="rounded-none border border-border bg-muted/60 px-3 py-1.5 text-foreground dark:border-cyan-400/30 dark:bg-cyan-500/10 dark:text-cyan-100"
          >
            {String(a)}
          </Badge>
        ))}
      </div>
    );
  }

  if (answer && typeof answer === "object") {
    return (
      <div className="grid gap-2">
        {Object.entries(answer as Record<string, unknown>).map(([k, v]) => (
          <div
            key={k}
            className="rounded-none border border-border bg-card/60 p-3"
          >
            <div className="text-[10px] uppercase tracking-[0.22em] text-primary">
              {k}
            </div>
            <div className="mt-1 text-sm leading-6 text-foreground">
              {stringifyValue(v)}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return <p className="text-sm leading-6 text-foreground">{String(answer)}</p>;
}

export function QuestionApp({ questions }: QuestionAppProps) {
  const normalizedQuestions = useMemo(
    () => normalizeQuestions(questions),
    [questions],
  );
  const [query, setQuery] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<
    Record<string, number | number[]>
  >({});
  const [revealedIds, setRevealedIds] = useState<Set<string>>(new Set());
  const [dragMappingsByQuestion, setDragMappingsByQuestion] = useState<
    Record<string, Record<string, string>>
  >({});
  const [dropTargetsByQuestion, setDropTargetsByQuestion] = useState<
    Record<string, string[]>
  >({});
  const [reviewMode, setReviewMode] = useState(false);
  const [activeDragItem, setActiveDragItem] = useState<string | null>(null);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [isShuffled, setIsShuffled] = useState(false);
  const [shuffleSeed, setShuffleSeed] = useState(0);
  const [isDark, setIsDark] = useState(true);
  const [showNewTest, setShowNewTest] = useState(false);
  const [newTestQuestions, setNewTestQuestions] = useState<QuestionItem[]>([]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
    document.documentElement.style.colorScheme = isDark ? "dark" : "light";
  }, [isDark]);

  const processedQuestions = useMemo(() => {
    if (!isShuffled) return normalizedQuestions;
    // Fisher-Yates shuffle would be better, but Math.random sort is okay for this
    return [...normalizedQuestions].sort((a, b) => {
      // Use a stable sort key if possible, but random is what they want
      return Math.random() - 0.5;
    });
  }, [normalizedQuestions, isShuffled, shuffleSeed]);

  const filteredQuestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    return processedQuestions.filter((item) => {
      const hay = [
        item.question,
        stringifyValue(item.answer),
        item.category,
        ...(item.tags ?? []),
        item.explanation ?? "",
      ]
        .join(" ")
        .toLowerCase();
      return q.length === 0 || hay.includes(q);
    });
  }, [processedQuestions, query]);

  const currentQuestion = filteredQuestions[currentIndex] ?? null;
  const currentQuestionNumber = currentQuestion ? currentIndex + 1 : 0;
  const reviewedCount = filteredQuestions.filter((q) =>
    revealedIds.has(q.id),
  ).length;
  const progressPercent =
    filteredQuestions.length > 0
      ? Math.round((reviewedCount / filteredQuestions.length) * 100)
      : 0;

  const resetSession = () => {
    setQuery("");
    setCurrentIndex(0);
    setSelectedAnswers({});
    setRevealedIds(new Set());
    setDragMappingsByQuestion({});
    setDropTargetsByQuestion({});
    setIsShuffled(false);
  };

  const startNewQuestionsTest = async () => {
    try {
      const mod = await import("../data/newquestions.json");
      const data = (mod && (mod as any).default) || (mod as any);
      setNewTestQuestions(data as QuestionItem[]);
      setShowNewTest(true);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("Failed to start new questions test", err);
    }
  };

  const toggleShuffle = () => {
    setIsShuffled(!isShuffled);
    setShuffleSeed((s) => s + 1);
    setCurrentIndex(0);
  };

  const revealCurrent = (id: string) =>
    setRevealedIds((s) => new Set(s).add(id));

  const selectAnswer = (q: NormalizedQuestionItem, index: number) => {
    if ((q as any).type === "msq") {
      setSelectedAnswers((cur) => {
        const prev = cur[q.id];
        const selected = Array.isArray(prev) ? prev : [];
        const next = selected.includes(index)
          ? selected.filter((i) => i !== index)
          : [...selected, index];
        return { ...cur, [q.id]: next };
      });
    } else {
      setSelectedAnswers((cur) => ({ ...cur, [q.id]: index }));
      revealCurrent(q.id);
    }
  };

  const goPrev = () => setCurrentIndex((c) => Math.max(c - 1, 0));
  const currentDragMapping = currentQuestion
    ? (dragMappingsByQuestion[currentQuestion.id] ?? {})
    : {};
  const currentDropTargets = currentQuestion
    ? (dropTargetsByQuestion[currentQuestion.id] ?? [])
    : [];
  const hasAnsweredCurrentQuestion = Boolean(
    currentQuestion &&
    ((currentQuestion as any).type === "drag_and_drop"
      ? currentDropTargets.length > 0 &&
        currentDropTargets.every((target) =>
          Boolean(currentDragMapping[target]),
        )
      : (currentQuestion as any).type === "msq"
        ? Array.isArray(selectedAnswers[currentQuestion.id]) &&
          (selectedAnswers[currentQuestion.id] as number[]).length > 0
        : selectedAnswers[currentQuestion.id] !== undefined),
  );

  const goNext = () => {
    if (!hasAnsweredCurrentQuestion && !reviewMode) return;
    if (currentQuestion) revealCurrent(currentQuestion.id);
    setCurrentIndex((c) =>
      Math.min(c + 1, Math.max(filteredQuestions.length - 1, 0)),
    );
  };

  const minSwipeDistance = 50;
  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };
  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };
  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;
    if (isLeftSwipe) goNext();
    if (isRightSwipe) goPrev();
  };

  useEffect(() => {
    if (!currentQuestion) {
      return;
    }

    if ((currentQuestion as any).type === "drag_and_drop") {
      const currentQuestionId = currentQuestion.id;
      const items = (currentQuestion as any).items ?? {};
      const targets = Object.values(items) as string[];
      setDropTargetsByQuestion((current) => {
        if (current[currentQuestionId]) return current;
        const shuffled = targets
          .map((t) => ({ t, r: Math.random() }))
          .sort((a, b) => a.r - b.r)
          .map((x) => x.t);
        return { ...current, [currentQuestionId]: shuffled };
      });
    }
  }, [currentQuestion]);

  // Reset active drag item when question changes
  useEffect(() => {
    setActiveDragItem(null);
  }, [currentIndex]);

  // Auto-reveal guidance for the current question when review mode is enabled
  useEffect(() => {
    if (reviewMode && currentQuestion) {
      revealCurrent(currentQuestion.id);
    }
  }, [currentIndex, reviewMode, currentQuestion]);

  // Mark drag and drop as revealed once all items are assigned to update progress
  useEffect(() => {
    if (
      currentQuestion &&
      (currentQuestion as any).type === "drag_and_drop" &&
      hasAnsweredCurrentQuestion
    ) {
      revealCurrent(currentQuestion.id);
    }
  }, [currentQuestion, hasAnsweredCurrentQuestion]);

  function renderQuestionBody() {
    if (!currentQuestion)
      return (
        <div className="flex min-h-64 flex-col items-center justify-center gap-3 p-8 text-center">
          <Search className="h-10 w-10 text-muted-foreground" />
          <div className="space-y-1">
            <h3 className="text-xl font-semibold text-foreground">
              No findings matched
            </h3>
            <p className="max-w-md text-sm leading-6 text-muted-foreground">
              Try a different search term or reset the session.
            </p>
          </div>
        </div>
      );

    if ((currentQuestion as any).type === "drag_and_drop") {
      const items = (currentQuestion as any).items ?? {};
      const keys = Object.keys(items);
      const assigned = new Set(Object.values(currentDragMapping));
      const available = keys.filter((k) => !assigned.has(k));

      return (
        <div
          className="space-y-4 px-4 py-4 sm:px-5"
          onTouchStart={(e) => e.stopPropagation()}
          onTouchMove={(e) => e.stopPropagation()}
          onTouchEnd={(e) => e.stopPropagation()}
        >
          {currentQuestion.question ? (
            <div className="rounded-none border border-border bg-muted/40 px-4 py-3">
              <div className="text-[10px] uppercase tracking-[0.18em] text-primary">
                Question
              </div>
              <div className="mt-1 text-sm font-semibold text-foreground/90">
                {currentQuestion.question}
              </div>
            </div>
          ) : null}

          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <div className="mb-2 text-[10px] uppercase tracking-[0.2em] font-semibold text-muted-foreground">
                Items
              </div>
              <div className="flex flex-wrap gap-2 sm:grid sm:gap-2">
                {available.map((k) => (
                  <div
                    key={k}
                    draggable
                    onDragStart={(e) => e.dataTransfer.setData("text/plain", k)}
                    onClick={() =>
                      setActiveDragItem(activeDragItem === k ? null : k)
                    }
                    className={cn(
                      "cursor-pointer rounded border px-3 py-2 text-xs sm:text-sm transition-all duration-200 select-none",
                      activeDragItem === k
                        ? "border-primary bg-primary/20 text-primary shadow-[0_0_10px_rgba(var(--primary),0.2)] scale-105"
                        : "border-border bg-card/60 text-foreground hover:bg-muted/50",
                    )}
                  >
                    {k}
                  </div>
                ))}
                {available.length === 0 && (
                  <div className="text-xs text-muted-foreground italic">
                    All items assigned
                  </div>
                )}
              </div>
            </div>

            <div>
              <div className="mb-2 text-sm font-semibold text-foreground">
                Match to mitigation
              </div>
              <div className="space-y-2">
                {currentDropTargets.map((target) => {
                  const assignedKey = currentDragMapping[target];
                  const correctKey =
                    Object.entries((currentQuestion as any).answer ?? {}).find(
                      ([, v]) => v === target,
                    )?.[0] ?? null;
                  const isWrongAssignment =
                    revealedIds.has(currentQuestion.id) &&
                    assignedKey &&
                    assignedKey !== correctKey;
                  const showMismatchMessage =
                    revealedIds.has(currentQuestion.id) || reviewMode;

                  return (
                    <div key={target}>
                      <div
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => {
                          const k = e.dataTransfer.getData("text/plain");
                          if (k)
                            setDragMappingsByQuestion((cur) => ({
                              ...cur,
                              [currentQuestion.id]: {
                                ...(cur[currentQuestion.id] ?? {}),
                                [target]: k,
                              },
                            }));
                        }}
                        onClick={() => {
                          if (activeDragItem) {
                            setDragMappingsByQuestion((cur) => ({
                              ...cur,
                              [currentQuestion.id]: {
                                ...(cur[currentQuestion.id] ?? {}),
                                [target]: activeDragItem,
                              },
                            }));
                            setActiveDragItem(null);
                          }
                        }}
                        className={cn(
                          "min-h-[48px] flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded border px-3 py-3 sm:py-2 transition-all duration-200 cursor-pointer",
                          activeDragItem
                            ? "border-primary/40 bg-primary/5 hover:border-primary/60"
                            : "border-border bg-card/60",
                          revealedIds.has(currentQuestion.id) && assignedKey
                            ? assignedKey === correctKey
                              ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                              : "border-destructive/50 bg-destructive/10 text-destructive"
                            : "",
                        )}
                      >
                        <div className="text-xs sm:text-sm text-foreground">
                          {target}
                        </div>
                        <div className="w-full sm:w-auto sm:min-w-[140px]">
                          {assignedKey ? (
                            <div className="flex items-center justify-between gap-2 border-t border-border/40 pt-2 sm:border-0 sm:pt-0">
                              <div className="text-xs sm:text-sm text-foreground">
                                {assignedKey}
                              </div>
                              <button
                                className="text-[10px] text-muted-foreground underline underline-offset-2"
                                onClick={(ev) => {
                                  ev.stopPropagation();
                                  setDragMappingsByQuestion((cur) => {
                                    const next = {
                                      ...(cur[currentQuestion.id] ?? {}),
                                    };
                                    delete next[target];
                                    return {
                                      ...cur,
                                      [currentQuestion.id]: next,
                                    };
                                  });
                                }}
                              >
                                Clear
                              </button>
                            </div>
                          ) : (
                            <div className="text-xs sm:text-sm text-muted-foreground italic">
                              {activeDragItem
                                ? "Tap to drop here"
                                : "Drop item here"}
                            </div>
                          )}
                        </div>
                      </div>
                      {isWrongAssignment && showMismatchMessage ? (
                        <div className="mt-2 rounded-none border-l-4 border-rose-400/60 bg-rose-500/10 px-4 py-2 text-sm text-rose-700 dark:text-rose-100">
                          <div className="font-semibold">Incorrect match.</div>
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="mt-4 space-y-3 rounded-none border border-border bg-card/60 p-4">
            {revealedIds.has(currentQuestion.id) &&
            currentQuestion.explanation ? (
              <div className="mt-4 rounded-none border-l-4 border-primary/60 bg-primary/5 px-4 py-3 text-sm text-primary/90">
                <div className="text-[10px] uppercase tracking-[0.18em] text-primary mb-1">
                  Explanation
                </div>
                {currentQuestion.explanation}
              </div>
            ) : null}

            <div className="space-y-2 rounded-none border border-border bg-muted/50 p-3 text-sm leading-6 text-foreground">
              {revealedIds.has(currentQuestion.id)
                ? renderAnswer(currentQuestion.answer)
                : null}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                className="rounded-none border-border bg-card/80 text-[10px] sm:text-[11px] uppercase tracking-[0.18em] text-foreground"
                onClick={goPrev}
                disabled={currentIndex === 0}
              >
                <ArrowLeft className="mr-2 h-3 w-3 sm:h-4 sm:w-4" /> Prev
              </Button>
              <Button
                type="button"
                className="rounded-none border border-primary/50 bg-primary/10 text-[10px] sm:text-[11px] uppercase tracking-[0.18em] text-primary hover:bg-primary/20 hover:text-primary"
                onClick={goNext}
                disabled={
                  currentIndex >= filteredQuestions.length - 1 ||
                  (!hasAnsweredCurrentQuestion && !reviewMode)
                }
              >
                Next <ArrowRight className="ml-2 h-3 w-3 sm:h-4 sm:w-4" />
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <Button
                type="button"
                variant="outline"
                className="rounded-none border-border bg-card/80 text-[10px] sm:text-[11px] uppercase tracking-[0.18em] text-foreground"
                onClick={() => revealCurrent(currentQuestion.id)}
              >
                Check Answer
              </Button>
              <Button
                type="button"
                variant="outline"
                className="rounded-none border-border bg-card/80 text-[10px] sm:text-[11px] uppercase tracking-[0.18em] text-foreground"
                onClick={resetSession}
              >
                Reset view
              </Button>
            </div>

            <div className="flex items-center justify-between border-t border-border px-4 py-3 text-[11px] uppercase tracking-[0.18em] text-muted-foreground sm:px-5">
              <span>
                CASE {currentQuestionNumber} OF {filteredQuestions.length}
              </span>
              <span>Threat Feed</span>
            </div>
          </div>
        </div>
      );
    }

    if (currentQuestion.options?.length) {
      return (
        <div className="space-y-3 px-4 py-4 sm:px-5">
          {currentQuestion.question ? (
            <div className="mb-2 rounded-none border border-border bg-muted/40 px-4 py-3">
              <div className="text-[10px] uppercase tracking-[0.18em] text-primary">
                Question
              </div>
              <div className="mt-1 text-sm font-semibold text-foreground/90">
                {currentQuestion.question}
              </div>
            </div>
          ) : null}

          {currentQuestion.options.map((opt, idx) => {
            const selection = selectedAnswers[currentQuestion.id];
            const isSelected = Array.isArray(selection)
              ? selection.includes(idx)
              : selection === idx;
            const answers = Array.isArray(currentQuestion.answer)
              ? currentQuestion.answer
              : [currentQuestion.answer];
            const isCorrectAnswer = answers.includes(opt);

            const isCorrect =
              revealedIds.has(currentQuestion.id) && isCorrectAnswer;
            const isWrong =
              revealedIds.has(currentQuestion.id) &&
              isSelected &&
              !isCorrectAnswer;

            return (
              <React.Fragment key={`${currentQuestion.id}-${idx}`}>
                <button
                  type="button"
                  onClick={() => selectAnswer(currentQuestion, idx)}
                  className={cn(
                    "flex w-full items-center gap-4 border px-4 py-4 text-left transition",
                    isSelected
                      ? "border-primary/60 bg-primary/10 text-primary"
                      : "border-border bg-card/60 text-foreground hover:border-primary/40 hover:bg-muted",
                    isCorrect &&
                      "border-emerald-500/50 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
                    isWrong &&
                      "border-destructive/50 bg-destructive/10 text-destructive",
                  )}
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center border border-border text-xs font-semibold uppercase tracking-[0.18em] text-primary/90">
                    {optionLabel(idx)}.
                  </span>
                  <span className="text-sm font-medium leading-6">{opt}</span>
                  <span className="ml-auto">
                    {isCorrect ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />
                    ) : null}
                    {isWrong ? (
                      <XCircle className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                    ) : null}
                  </span>
                </button>
              </React.Fragment>
            );
          })}

          <div className="mt-4 space-y-3 rounded-none border border-border bg-card/60 p-4">
            {revealedIds.has(currentQuestion.id) &&
            currentQuestion.explanation ? (
              <div className="mb-4 rounded-none border-l-4 border-primary/60 bg-primary/5 px-4 py-3 text-sm text-primary/90">
                <div className="text-[10px] uppercase tracking-[0.18em] text-primary mb-1">
                  Explanation
                </div>
                {currentQuestion.explanation}
              </div>
            ) : null}

            <div className="space-y-2 rounded-none border border-border bg-muted/50 p-3 text-sm leading-6 text-foreground">
              {revealedIds.has(currentQuestion.id)
                ? renderAnswer(currentQuestion.answer)
                : null}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                className="rounded-none border-border bg-card/80 text-[10px] sm:text-[11px] uppercase tracking-[0.18em] text-foreground"
                onClick={goPrev}
                disabled={currentIndex === 0}
              >
                <ArrowLeft className="mr-2 h-3 w-3 sm:h-4 sm:w-4" /> Prev
              </Button>
              <Button
                type="button"
                className="rounded-none border border-primary/50 bg-primary/10 text-[10px] sm:text-[11px] uppercase tracking-[0.18em] text-primary hover:bg-primary/20 hover:text-primary"
                onClick={goNext}
                disabled={
                  currentIndex >= filteredQuestions.length - 1 ||
                  (!hasAnsweredCurrentQuestion && !reviewMode)
                }
              >
                Next <ArrowRight className="ml-2 h-3 w-3 sm:h-4 sm:w-4" />
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <Button
                type="button"
                variant="outline"
                className="rounded-none border-border bg-card/80 text-[10px] sm:text-[11px] uppercase tracking-[0.18em] text-foreground"
                onClick={() => revealCurrent(currentQuestion.id)}
              >
                Check Answer
              </Button>
              <Button
                type="button"
                variant="outline"
                className="rounded-none border-border bg-card/80 text-[10px] sm:text-[11px] uppercase tracking-[0.18em] text-foreground"
                onClick={resetSession}
              >
                Reset view
              </Button>
            </div>

            <div className="flex items-center justify-between border-t border-border px-4 py-3 text-[11px] uppercase tracking-[0.18em] text-muted-foreground sm:px-5">
              <span>
                CASE {currentQuestionNumber} OF {filteredQuestions.length}
              </span>
              <span>Threat Feed</span>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="rounded-none border border-dashed border-border bg-card/60 p-4 text-sm leading-6 text-muted-foreground">
        This item uses a structured answer. Use the guidance panel to inspect
        the response shape.
      </div>
    );
  }

  if (showNewTest && newTestQuestions.length) {
    return <TestMode questions={newTestQuestions} />;
  }

  return (
    <main
      className="min-h-screen bg-background text-foreground font-sans antialiased overflow-x-hidden touch-pan-y"
      style={{ touchAction: "pan-y" }}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* Shadcn-like background mesh/glow */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute inset-0 opacity-60 dark:opacity-100 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_24px]" />
        <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-[310px] w-[310px] rounded-full bg-amber-500/10 opacity-30 blur-[100px] dark:bg-cyan-500/10 dark:opacity-20" />
      </div>

      <section className="relative mx-auto flex w-full max-w-5xl flex-col gap-5 px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex items-start justify-between">
          <div>
            <Badge onClick={startNewQuestionsTest} className="mx-0 w-fit rounded-none border border-primary/20 bg-primary/10 px-4 py-1 text-[10px] sm:text-[11px] uppercase tracking-[0.35em] text-primary cursor-pointer">
              Cybersecurity Review
            </Badge>
            <h1 onClick={startNewQuestionsTest} className="mt-4 text-3xl font-semibold tracking-tight text-foreground sm:text-5xl cursor-pointer">
              Cybersecurity
            </h1>
            <p className="mt-2 text-[10px] uppercase tracking-[0.28em] text-muted-foreground">
              {normalizedQuestions.length} questions
            </p>
          </div>

          <div className="ml-4 flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              className="h-10 w-10 rounded-md border-border bg-card/40 p-0"
              onClick={() => setIsDark((d) => !d)}
              aria-label="Toggle theme"
            >
              {isDark ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </Button>
            <a
              href="/cybersecurity-reviewer.pdf"
              download="cybersecurity-reviewer.pdf"
            >
              <Button
                type="button"
                variant="outline"
                className="h-10 rounded-md border-border bg-card/40 px-3 text-sm font-medium text-foreground gap-2"
              >
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline">Download PDF</span>
              </Button>
            </a>
            <a href="/test">
              <Button type="button" className="h-10 rounded-md border border-primary/50 bg-primary/10 px-3 text-sm font-medium text-primary hover:bg-primary/20 hover:text-primary">
                <span className="hidden sm:inline">Start Test</span>
                <span className="sm:hidden">Test</span>
              </Button>
            </a>
            <Button
              type="button"
              variant="outline"
              className="h-10 rounded-md border-border bg-card/40 px-3 text-sm font-medium text-foreground"
              onClick={resetSession}
            >
              Reset Session
            </Button>
          </div>
        </div>

        <Card className="border-border bg-card/70 shadow-xl backdrop-blur-sm">
          <CardContent className="space-y-4 p-4 sm:p-5">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-md border border-border bg-muted/50 px-4 py-3">
                <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                  Reviewed
                </div>
                <div className="mt-1 text-2xl font-semibold text-primary">
                  {reviewedCount}
                </div>
              </div>
              <div className="rounded-md border border-border bg-muted/50 px-4 py-3">
                <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                  Open
                </div>
                <div className="mt-1 text-2xl font-semibold text-emerald-700 dark:text-emerald-500">
                  {Math.max(normalizedQuestions.length - reviewedCount, 0)}
                </div>
              </div>
              <div className="rounded-md border border-border bg-muted/50 px-4 py-3">
                <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                  Total
                </div>
                <div className="mt-1 text-2xl font-semibold text-foreground">
                  {filteredQuestions.length}
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex-1 min-w-[200px]">
                <div className="mb-2 flex items-center justify-between text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                  <span>Triage coverage</span>
                  <span>{progressPercent}%</span>
                </div>
                <Progress value={progressPercent} className="h-2 bg-muted" />
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={toggleShuffle}
                  className={cn(
                    "flex items-center gap-3 rounded-none border px-4 py-2 transition-all duration-300",
                    isShuffled
                      ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.15)]"
                      : "border-border bg-card/40 text-muted-foreground hover:border-muted hover:text-foreground",
                  )}
                >
                  <Shuffle
                    className={cn(
                      "h-3.5 w-3.5",
                      isShuffled ? "animate-spin-slow" : "",
                    )}
                  />
                  <span className="text-[10px] font-semibold uppercase tracking-[0.25em]">
                    Shuffle
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setReviewMode(!reviewMode)}
                  className={cn(
                    "flex items-center gap-3 rounded-none border px-4 py-2 transition-all duration-300",
                    reviewMode
                      ? "border-primary/50 bg-primary/10 text-primary shadow-[0_0_15px_rgba(var(--primary),0.1)]"
                      : "border-border bg-card/40 text-muted-foreground hover:border-muted hover:text-foreground",
                  )}
                >
                  <div
                    className={cn(
                      "h-1.5 w-1.5 rounded-full",
                      reviewMode
                        ? "animate-pulse bg-primary shadow-[0_0_8px_rgba(var(--primary),0.8)]"
                        : "bg-muted-foreground",
                    )}
                  />
                  <span className="text-[10px] font-semibold uppercase tracking-[0.25em]">
                    Review Mode: {reviewMode ? "ON" : "OFF"}
                  </span>
                </button>
              </div>
            </div>
          </CardContent>
        </Card>

        <div>
          <div className="grid gap-2 sm:grid-cols-[1fr_auto] mb-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="h-12 rounded-none border-border bg-card/80 pl-10 text-foreground placeholder:text-muted-foreground focus-visible:ring-ring"
                placeholder="Search findings, topics, or response text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <Button
              type="button"
              variant="outline"
              className="h-12 rounded-none border-border bg-card/60 text-[12px] font-semibold uppercase tracking-[0.18em] text-foreground"
              onClick={() => setQuery("")}
            >
              Clear
            </Button>
          </div>

          <Card className="border-border bg-card/70 shadow-xl backdrop-blur-sm">
            <CardContent className="p-0">{renderQuestionBody()}</CardContent>
          </Card>
        </div>
      </section>

      {/* Floating Navigation for Mobile - Edge Buttons */}
      <div className="fixed top-1/2 right-2 z-50 -translate-y-1/2 sm:hidden">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className={cn(
            "h-14 w-10 rounded-l-2xl border-y border-l border-primary/30 bg-card/60 shadow-[0_0_20px_rgba(var(--primary),0.1)] backdrop-blur-md transition-all active:scale-95",
            (!hasAnsweredCurrentQuestion && !reviewMode) ||
              currentIndex >= filteredQuestions.length - 1
              ? "opacity-20 grayscale"
              : "opacity-100",
          )}
          onClick={goNext}
          disabled={
            currentIndex >= filteredQuestions.length - 1 ||
            (!hasAnsweredCurrentQuestion && !reviewMode)
          }
        >
          <ChevronRight className="h-6 w-6 text-primary" />
        </Button>
      </div>

      <div className="fixed top-1/2 left-2 z-50 -translate-y-1/2 sm:hidden">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className={cn(
            "h-14 w-10 rounded-r-2xl border-y border-r border-border/30 bg-card/60 shadow-xl backdrop-blur-md transition-all active:scale-95",
            currentIndex === 0 ? "opacity-20 grayscale" : "opacity-100",
          )}
          onClick={goPrev}
          disabled={currentIndex === 0}
        >
          <ChevronLeft className="h-6 w-6 text-foreground" />
        </Button>
      </div>
    </main>
  );
}
