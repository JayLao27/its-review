"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Download,
  Menu,
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
import {
  normalizeQuestions,
  type NormalizedQuestionItem,
  type QuestionItem,
} from "../lib/questions";
import { TestMode } from "./test-mode";
import { topicHierarchy } from "../lib/topics-hierarchy";

type QuestionAppProps = { questions: QuestionItem[] };

const QUESTION_APP_STORAGE_KEY = "question-app-session";

interface QuestionAppStoredSession {
  selectedAnswers: Record<string, number | number[]>;
  revealedIds: string[];
  dragMappingsByQuestion: Record<string, Record<string, string>>;
  currentIndex: number;
  query: string;
  isShuffled: boolean;
  reviewMode: boolean;
  timestamp: number;
}

function saveQuestionAppSession(
  selectedAnswers: Record<string, number | number[]>,
  revealedIds: Set<string>,
  dragMappingsByQuestion: Record<string, Record<string, string>>,
  currentIndex: number,
  query: string,
  isShuffled: boolean,
  reviewMode: boolean
) {
  const session: QuestionAppStoredSession = {
    selectedAnswers,
    revealedIds: Array.from(revealedIds),
    dragMappingsByQuestion,
    currentIndex,
    query,
    isShuffled,
    reviewMode,
    timestamp: Date.now(),
  };
  localStorage.setItem(QUESTION_APP_STORAGE_KEY, JSON.stringify(session));
}

function loadQuestionAppSession(): QuestionAppStoredSession | null {
  const stored = localStorage.getItem(QUESTION_APP_STORAGE_KEY);
  if (!stored) return null;
  try {
    return JSON.parse(stored);
  } catch {
    return null;
  }
}

function clearQuestionAppSession() {
  localStorage.removeItem(QUESTION_APP_STORAGE_KEY);
}

function optionLabel(index: number) {
  return String.fromCharCode(65 + index);
}

function pickRandomQuestions(source: QuestionItem[], count: number) {
  return [...source]
    .map((q) => ({ q, r: Math.random() }))
    .sort((a, b) => a.r - b.r)
    .map((x) => x.q)
    .slice(0, count);
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
  const [externalQuestions, setExternalQuestions] = useState<
    QuestionItem[] | null
  >(null);

  const normalizedQuestions = useMemo(() => {
    const source = externalQuestions && externalQuestions.length ? externalQuestions : questions;
    return normalizeQuestions(source);
  }, [questions, externalQuestions]);
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
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [expandedTopics, setExpandedTopics] = useState<Record<string, boolean>>({ "ITS Cybersecurity Review": true });
  const [topicsVisible, setTopicsVisible] = useState(false);
  const [showUnanswered, setShowUnanswered] = useState(false);
  const [selectedTopics, setSelectedTopics] = useState<Set<string>>(new Set());
  const topicsList = useMemo(() => {
    const s = new Set<string>();
    normalizedQuestions.forEach((it) => {
      if (it.category) s.add(it.category);
      (it.tags ?? []).forEach((tg) => s.add(tg));
    });
    return Array.from(s).sort();
  }, [normalizedQuestions]);

  // Load saved session on mount
  useEffect(() => {
    const saved = loadQuestionAppSession();
    if (saved) {
      setSelectedAnswers(saved.selectedAnswers);
      setRevealedIds(new Set(saved.revealedIds));
      setDragMappingsByQuestion(saved.dragMappingsByQuestion);
      setCurrentIndex(saved.currentIndex);
      setQuery(saved.query);
      setIsShuffled(saved.isShuffled);
      setReviewMode(saved.reviewMode);
    }
  }, []);

  // Save session whenever relevant state changes
  useEffect(() => {
    saveQuestionAppSession(
      selectedAnswers,
      revealedIds,
      dragMappingsByQuestion,
      currentIndex,
      query,
      isShuffled,
      reviewMode
    );
  }, [selectedAnswers, revealedIds, dragMappingsByQuestion, currentIndex, query, isShuffled, reviewMode]);

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

  const isQuestionAnswered = (item: any) => {
    if (revealedIds.has(item.id)) return true;
    if (item.type === "drag_and_drop") {
      const targets = dropTargetsByQuestion[item.id] ?? [];
      const mappings = dragMappingsByQuestion[item.id] ?? {};
      return targets.length > 0 && targets.every((t: string) => Boolean(mappings[t]));
    }
    if (item.type === "msq") {
      return Array.isArray(selectedAnswers[item.id]) && (selectedAnswers[item.id] as number[]).length > 0;
    }
    return selectedAnswers[item.id] !== undefined;
  };

  const filteredQuestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    return processedQuestions.filter((item) => {
      if (showUnanswered && isQuestionAnswered(item)) return false;
      const hay = [
        item.id,
        ...(item.options ?? []),
        item.question,
        stringifyValue(item.answer),
        item.category,
        ...(item.tags ?? []),
        item.explanation ?? "",
      ]
        .join(" ")
        .toLowerCase();
      const matchesQuery = q.length === 0 || hay.includes(q);
      if (!matchesQuery) return false;
      if (!selectedTopics || selectedTopics.size === 0) return true;
      const inCategory = item.category && selectedTopics.has(item.category);
      const inTags = (item.tags ?? []).some((t) => selectedTopics.has(t));
      return Boolean(inCategory || inTags);
    }); 
  }, [processedQuestions, query, selectedTopics]);

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
    setExternalQuestions(null);
    clearQuestionAppSession();
  };

  const startNewQuestionsTest = async () => {
    try {
      const mod = await import("../data/newquestions.json");
      const data = (mod && (mod as any).default) || (mod as any);
      setExternalQuestions(data as QuestionItem[]);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("Failed to start new questions test", err);
    }
  };

  const [inTestMode, setInTestMode] = useState(false);
  const [testModeItems, setTestModeItems] = useState<QuestionItem[] | null>(null);

  const start50Test = () => {
    clearQuestionAppSession();
    const source = externalQuestions && externalQuestions.length ? externalQuestions : questions;
    setTestModeItems(pickRandomQuestions(source, 50));
    setInTestMode(true);
    setCurrentIndex(0);
    setIsShuffled(false);
  };

  const startFullTest = () => {
    clearQuestionAppSession();
    const source = externalQuestions && externalQuestions.length ? externalQuestions : questions;
    setTestModeItems(pickRandomQuestions(source, Math.min(600, source.length)));
    setInTestMode(true);
    setCurrentIndex(0);
    setIsShuffled(false);
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
    if (currentQuestion && hasAnsweredCurrentQuestion) revealCurrent(currentQuestion.id);
    setCurrentIndex((c) =>
      Math.min(c + 1, Math.max(filteredQuestions.length - 1, 0)),
    );
  };

  const scrollToQuestion = (index: number) => {
    const element = document.getElementById(`question-${index}`);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
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
    if (isLeftSwipe && !showMobileMenu) {
      goNext();
    }
    if (isRightSwipe && !showMobileMenu) {
      goPrev();
    }
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
                  false
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
                className={cn(
                  "rounded-none text-[10px] sm:text-[11px] uppercase tracking-[0.18em]",
                  showUnanswered 
                    ? "border-primary/50 bg-primary/10 text-primary hover:bg-primary/20 hover:text-primary"
                    : "border-border bg-card/80 text-foreground"
                )}
                onClick={() => {
                  setShowUnanswered(!showUnanswered);
                  setCurrentIndex(0);
                }}
              >
                {showUnanswered ? "Show All" : "Unanswered"}
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
                  false
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
                className={cn(
                  "rounded-none text-[10px] sm:text-[11px] uppercase tracking-[0.18em]",
                  showUnanswered 
                    ? "border-primary/50 bg-primary/10 text-primary hover:bg-primary/20 hover:text-primary"
                    : "border-border bg-card/80 text-foreground"
                )}
                onClick={() => {
                  setShowUnanswered(!showUnanswered);
                  setCurrentIndex(0);
                }}
              >
                {showUnanswered ? "Show All" : "Unanswered"}
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
      <div className="space-y-3 rounded-none border border-dashed border-border bg-card/60 p-4">
        <div className="p-3 text-sm leading-6 text-muted-foreground">
          This item uses a structured answer. Use the guidance panel to inspect
          the response shape.
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
            className="rounded-none border border-primary/  50 bg-primary/10 text-[10px] sm:text-[11px] uppercase tracking-[0.18em] text-primary hover:bg-primary/20 hover:text-primary"
            onClick={goNext}
            disabled={
              currentIndex >= filteredQuestions.length - 1 ||
              false
            }
          >
            Next <ArrowRight className="ml-2 h-3 w-3 sm:h-4 sm:w-4" />
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
          <Button
            type="button"
            variant="outline"
            className="rounded-none border-border bg-card/80 text-[10px] sm:text-[11px] uppercase tracking-[0.18em] text-foreground"
            onClick={() => currentQuestion && revealCurrent(currentQuestion.id)}
          >
            Check Answer
          </Button>
          <Button
            type="button"
            variant="outline"
            className={cn(
              "rounded-none text-[10px] sm:text-[11px] uppercase tracking-[0.18em]",
              showUnanswered 
                ? "border-primary/50 bg-primary/10 text-primary hover:bg-primary/20 hover:text-primary"
                : "border-border bg-card/80 text-foreground"
            )}
            onClick={() => {
              setShowUnanswered(!showUnanswered);
              setCurrentIndex(0);
            }}
          >
            {showUnanswered ? "Show All" : "Unanswered"}
          </Button>
        </div>

        <div className="flex items-center justify-between border-t border-border px-4 py-3 text-[11px] uppercase tracking-[0.18em] text-muted-foreground sm:px-5">
          <span>
            CASE {currentQuestionNumber} OF {filteredQuestions.length}
          </span>
          <span>Threat Feed</span>
        </div>
      </div>
    );
  }

  // When `externalQuestions` is set we continue rendering the main UI
  // which will use the external questions as the data source.

  // Function to render a single question card
  const renderQuestionCard = (question: NormalizedQuestionItem, index: number) => {
    const qtype = (question as any).type;
    const isRevealed = reviewMode || revealedIds.has(question.id);
    
    if (qtype === "drag_and_drop") {
      const items = (question as any).items ?? {};
      const keys = Object.keys(items);
      const currentMapping = dragMappingsByQuestion[question.id] ?? {};
      const assigned = new Set(Object.values(currentMapping));
      const available = keys.filter((k) => !assigned.has(k));

      return (
        <div
          id={`question-${index}`}
          key={question.id}
          className="min-h-screen w-full snap-start scroll-mt-20 flex flex-col"
        >
          <div className="flex-1 space-y-4 px-4 py-4 sm:px-5">
            {question.question ? (
              <div className="rounded-none border border-border bg-muted/40 px-4 py-3">
                <div className="text-[10px] uppercase tracking-[0.18em] text-primary">
                  Question
                </div>
                <div className="mt-1 text-sm font-semibold text-foreground/90">
                  {question.question}
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
                  {(dropTargetsByQuestion[question.id] ?? []).map((target) => {
                    const assignedKey = currentMapping[target];
                    const correctKey =
                      Object.entries((question as any).answer ?? {}).find(
                        ([, v]) => v === target,
                      )?.[0] ?? null;
                    const isWrongAssignment =
                      isRevealed &&
                      assignedKey &&
                      assignedKey !== correctKey;
                    const showMismatchMessage =
                      isRevealed || reviewMode;

                    return (
                      <div key={target}>
                        <div
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={(e) => {
                            const k = e.dataTransfer.getData("text/plain");
                            if (k)
                              setDragMappingsByQuestion((cur) => ({
                                ...cur,
                                [question.id]: {
                                  ...(cur[question.id] ?? {}),
                                  [target]: k,
                                },
                              }));
                          }}
                          onClick={() => {
                            if (activeDragItem) {
                              setDragMappingsByQuestion((cur) => ({
                                ...cur,
                                [question.id]: {
                                  ...(cur[question.id] ?? {}),
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
                            isRevealed && assignedKey
                              ? assignedKey === correctKey
                                ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                                : "border-destructive/50 bg-destructive/10 text-destructive"
                              : isRevealed && correctKey && !assignedKey
                                ? "border-emerald-500/30 bg-emerald-500/5"
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
                                        ...(cur[question.id] ?? {}),
                                      };
                                      delete next[target];
                                      return {
                                        ...cur,
                                        [question.id]: next,
                                      };
                                    });
                                  }}
                                >
                                  Clear
                                </button>
                              </div>
                            ) : isRevealed && correctKey ? (
                              <div className="flex items-center gap-2 border-t border-border/40 pt-2 sm:border-0 sm:pt-0">
                                <div className="text-xs sm:text-sm text-emerald-700 dark:text-emerald-400 font-semibold">
                                  {correctKey}
                                </div>
                                <div className="text-[10px] text-emerald-600 dark:text-emerald-300 italic">
                                  (correct)
                                </div>
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
          </div>

          <div className="space-y-3 rounded-none border-t border-border bg-card/60 p-4">
            {isRevealed && question.explanation ? (
              <div className="rounded-none border-l-4 border-primary/60 bg-primary/5 px-4 py-3 text-sm text-primary/90">
                <div className="text-[10px] uppercase tracking-[0.18em] text-primary mb-1">
                  Explanation
                </div>
                {question.explanation}
              </div>
            ) : null}

            <div className="space-y-2 rounded-none border border-border bg-muted/50 p-3 text-sm leading-6 text-foreground">
              {isRevealed ? renderAnswer(question.answer) : null}
            </div>

            <div className="flex items-center justify-between border-t border-border px-4 py-3 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              <span>CASE {index + 1} OF {filteredQuestions.length}</span>
              <button
                className="text-primary hover:underline"
                onClick={() => revealCurrent(question.id)}
              >
                {isRevealed ? "Revealed" : "Check Answer"}
              </button>
            </div>
          </div>
        </div>
      );
    }

    if (question.options?.length) {
      return (
        <div
          id={`question-${index}`}
          key={question.id}
          className="min-h-screen w-full snap-start scroll-mt-20 flex flex-col"
        >
          <div className="flex-1 space-y-3 px-4 py-4 sm:px-5">
            {question.question ? (
              <div className="mb-2 rounded-none border border-border bg-muted/40 px-4 py-3">
                <div className="text-[10px] uppercase tracking-[0.18em] text-primary">
                  Question
                </div>
                <div className="mt-1 text-sm font-semibold text-foreground/90">
                  {question.question}
                </div>
              </div>
            ) : null}

            {question.options.map((opt, idx) => {
              const selection = selectedAnswers[question.id];
              const isSelected = Array.isArray(selection)
                ? selection.includes(idx)
                : selection === idx;
              const answers = Array.isArray(question.answer)
                ? question.answer
                : [question.answer];
              const isCorrectAnswer = answers.includes(opt);

              const isCorrect = isRevealed && isCorrectAnswer;
              const isWrong =
                isRevealed && isSelected && !isCorrectAnswer;

              return (
                <button
                  key={`${question.id}-${idx}`}
                  type="button"
                  onClick={() => selectAnswer(question, idx)}
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
              );
            })}
          </div>

          <div className="space-y-3 rounded-none border-t border-border bg-card/60 p-4">
            {isRevealed && question.explanation ? (
              <div className="mb-4 rounded-none border-l-4 border-primary/60 bg-primary/5 px-4 py-3 text-sm text-primary/90">
                <div className="text-[10px] uppercase tracking-[0.18em] text-primary mb-1">
                  Explanation
                </div>
                {question.explanation}
              </div>
            ) : null}

            <div className="space-y-2 rounded-none border border-border bg-muted/50 p-3 text-sm leading-6 text-foreground">
              {isRevealed ? renderAnswer(question.answer) : null}
            </div>

            <div className="flex items-center justify-between border-t border-border px-4 py-3 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              <span>CASE {index + 1} OF {filteredQuestions.length}</span>
              <button
                className="text-primary hover:underline"
                onClick={() => revealCurrent(question.id)}
              >
                {isRevealed ? "Revealed" : "Check Answer"}
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div
        id={`question-${index}`}
        key={question.id}
        className="min-h-screen w-full snap-start scroll-mt-20 flex flex-col items-center justify-center p-4"
      >
        <div className="max-w-md w-full space-y-3">
          <div className="rounded-none border border-dashed border-border bg-card/60 p-4 text-sm leading-6 text-muted-foreground">
            This item uses a structured answer. Use the guidance panel to inspect
            the response shape.
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <Button
              type="button"
              variant="outline"
              className="rounded-none border-border bg-card/80 text-[10px] sm:text-[11px] uppercase tracking-[0.18em] text-foreground"
              onClick={goPrev}
              disabled={index === 0}
            >
              <ChevronLeft className="mr-2 h-3 w-3 sm:h-4 sm:w-4" /> Prev
            </Button>
            <Button
              type="button"
              className="rounded-none border border-primary/50 bg-primary/10 text-[10px] sm:text-[11px] uppercase tracking-[0.18em] text-primary hover:bg-primary/20 hover:text-primary"
              onClick={goNext}
              disabled={
                index >= filteredQuestions.length - 1 ||
                false
              }
            >
              Next <ChevronRight className="ml-2 h-3 w-3 sm:h-4 sm:w-4" />
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <Button
              type="button"
              variant="outline"
              className="rounded-none border-border bg-card/80 text-[10px] sm:text-[11px] uppercase tracking-[0.18em] text-foreground"
              onClick={() => revealCurrent(question.id)}
            >
              Check Answer
            </Button>
            <Button
              type="button"
              variant="outline"
              className={cn(
                "rounded-none text-[10px] sm:text-[11px] uppercase tracking-[0.18em]",
                showUnanswered 
                  ? "border-primary/50 bg-primary/10 text-primary hover:bg-primary/20 hover:text-primary"
                  : "border-border bg-card/80 text-foreground"
              )}
              onClick={() => {
                setShowUnanswered(!showUnanswered);
                setCurrentIndex(0);
              }}
            >
              {showUnanswered ? "Show All" : "Unanswered"}
            </Button>
          </div>

          <div className="mt-4 flex items-center justify-between w-full border-t border-border px-4 py-3 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            <span>CASE {index + 1} OF {filteredQuestions.length}</span>
          </div>
        </div>
      </div>
    );
  };

  if (inTestMode && testModeItems && testModeItems.length > 0) {
    return <TestMode questions={testModeItems} onExit={() => setInTestMode(false)} />;
  }

  const toggleExpanded = (key: string) => {
    setExpandedTopics((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleTopicSelect = (topic: string) => {
    setSelectedTopics(new Set([topic]));
    setQuery("");
    setCurrentIndex(0);
    setReviewMode(true);
    setShowMobileMenu(false);
  };

  const renderTopicsLayer = (node: any, path: string = "", level: number = 0) => {
    if (Array.isArray(node)) {
      return (
        <div className="pl-4 space-y-1 mt-1 border-l border-border/50 ml-2">
          {node.map((item) => {
            const isSelected = selectedTopics.has(item);
            return (
              <button
                key={item}
                onClick={() => handleTopicSelect(item)}
                className={cn(
                  "w-full text-left px-3 py-2 text-sm rounded-md transition-colors",
                  isSelected
                    ? "bg-primary/10 text-primary font-medium border border-primary/20"
                    : "text-muted-foreground hover:bg-card/50 hover:text-foreground"
                )}
              >
                {item}
              </button>
            );
          })}
        </div>
      );
    } else if (typeof node === "object" && node !== null) {
      return (
        <div className={cn("space-y-1", level > 0 && "pl-4 mt-1 border-l border-border/50 ml-2")}>
          {Object.entries(node).map(([key, value]) => {
            const fullPath = path ? `${path}/${key}` : key;
            const isExpanded = expandedTopics[fullPath];
            const isLeaf = Array.isArray(value) && value.length === 0;
            return (
              <div key={fullPath}>
                <button
                  onClick={() => {
                    if (isLeaf) handleTopicSelect(key);
                    else toggleExpanded(fullPath);
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 text-sm rounded-md hover:bg-card/50 transition-colors text-foreground font-medium"
                >
                  <span className="truncate">{key}</span>
                  {!isLeaf && (
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 text-muted-foreground transition-transform",
                        !isExpanded && "-rotate-90"
                      )}
                    />
                  )}
                </button>
                {isExpanded && renderTopicsLayer(value, fullPath, level + 1)}
              </div>
            );
          })}
        </div>
      );
    }
    return null;
  };

  return (
    <main
      className="bg-background text-foreground font-sans antialiased overflow-x-hidden"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* Shadcn-like background mesh/glow */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute inset-0 opacity-60 dark:opacity-100 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_24px]" />
        <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-[310px] w-[310px] rounded-full bg-amber-500/10 opacity-30 blur-[100px] dark:bg-cyan-500/10 dark:opacity-20" />
      </div>

      {/* Topics Sidebar Overlay */}
      <div
        className={cn(
          "fixed inset-0 z-40 transition-opacity duration-300",
          showMobileMenu ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={() => setShowMobileMenu(false)}
      >
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" />
      </div>

      {/* Topics Sidebar Panel */}
      <div
        className={cn(
          "fixed right-0 top-0 h-screen w-80 bg-card border-l border-border z-50 transform transition-transform duration-300 flex flex-col shadow-2xl",
          showMobileMenu ? "translate-x-0" : "translate-x-full"
        )}
      >
        <div className="flex items-center justify-between p-4 border-b border-border/50 bg-card/50 backdrop-blur-md">
          <span className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">Topics</span>
          <button
            onClick={() => setShowMobileMenu(false)}
            className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-md hover:bg-muted"
          >
            <XCircle className="h-5 w-5" />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {renderTopicsLayer(topicHierarchy)}
        </div>

        <div className="p-4 border-t border-border/50 bg-card/50 backdrop-blur-md">
          <Button
            type="button"
            className="w-full border border-primary/50 bg-primary/10 text-primary hover:bg-primary/20 hover:text-primary text-sm transition-all shadow-[0_0_15px_rgba(var(--primary),0.1)]"
            onClick={() => {
              resetSession();
              setShowMobileMenu(false);
            }}
          >
            Reset Session
          </Button>
        </div>
      </div>

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
              className="hidden sm:block"
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
            <Button type="button" onClick={start50Test} className="h-10 rounded-md border border-primary/50 bg-primary/10 px-3 text-sm font-medium text-primary hover:bg-primary/20 hover:text-primary">
              <span className="hidden sm:inline">50 Test</span>
              <span className="sm:hidden">50</span>
            </Button>
            <Button type="button" onClick={startFullTest} className="h-10 rounded-md border border-primary/50 bg-primary/10 px-3 text-sm font-medium text-primary hover:bg-primary/20 hover:text-primary">
              <span className="hidden sm:inline">Full Test</span>
              <span className="sm:hidden">Full</span>
            </Button>
            
            <Button
              type="button"
              variant="outline"
              className="h-10 rounded-md border-border bg-card/40 px-3 text-sm font-medium text-foreground hidden sm:flex"
              onClick={resetSession}
            >
              Reset Session
            </Button>

            {/* Menu Button */}
            <Button
              type="button"
              variant="outline"
              className="h-10 w-10 rounded-md border-border bg-card/40 p-0 flex"
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              aria-label="Toggle menu"
            >
              <Menu className="h-4 w-4" />
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

        {!reviewMode ? (
          <>
            <div>
              <div className="flex flex-col gap-2 mb-2">
                <div className="relative w-full">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    className="h-12 w-full rounded-none border-border bg-card/80 pl-10 pr-10 text-foreground placeholder:text-muted-foreground focus-visible:ring-ring"
                    placeholder="Search findings, topics, or response text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                  {query && (
                    <button
                      onClick={() => setQuery("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1 rounded-sm"
                    >
                      <XCircle className="h-5 w-5" />
                    </button>
                  )}
                </div>

                {selectedTopics.size > 0 && (
                  <div className="flex flex-wrap gap-2 items-center px-1 mb-2">
                    <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">Filters:</span>
                    {Array.from(selectedTopics).map((t) => (
                      <Badge 
                        key={t}
                        variant="secondary"
                        className="flex items-center gap-1 cursor-pointer hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 transition-colors bg-primary/10 text-primary border-primary/20"
                        onClick={() => {
                          setSelectedTopics((cur) => {
                            const next = new Set(cur);
                            next.delete(t);
                            return next;
                          });
                          setCurrentIndex(0);
                        }}
                      >
                        {t}
                        <XCircle className="h-3 w-3" />
                      </Badge>
                    ))}
                    <button
                      className="text-[10px] text-muted-foreground hover:text-foreground underline ml-1 uppercase tracking-wider"
                      onClick={() => { setSelectedTopics(new Set()); setCurrentIndex(0); }}
                    >
                      Clear all
                    </button>
                  </div>
                )}
              </div>

              <Card className="border-border bg-card/70 shadow-xl backdrop-blur-sm">
                <CardContent className="p-0">{renderQuestionBody()}</CardContent>
              </Card>
            </div>

            {/* Floating Navigation for Mobile - Edge Buttons */}
            <div className="fixed top-1/2 right-2 z-50 -translate-y-1/2 sm:hidden">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className={cn(
                  "h-14 w-10 rounded-l-2xl border-y border-l border-primary/30 bg-card/60 shadow-[0_0_20px_rgba(var(--primary),0.1)] backdrop-blur-md transition-all active:scale-95",
                  false ||
                    currentIndex >= filteredQuestions.length - 1
                    ? "opacity-20 grayscale"
                    : "opacity-100",
                )}
                onClick={goNext}
                disabled={
                  currentIndex >= filteredQuestions.length - 1 ||
                  false
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
          </>
        ) : (
          // Scrollable Review Mode
          <div
            className="fixed inset-0 overflow-y-scroll bg-background"
            style={{ scrollBehavior: "smooth" }}
          >
            {/* Search bar — pinned at the very top of the scroll container */}
            <div className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur-sm shadow-sm">
              <div className="mx-auto w-full max-w-5xl px-4 py-3">
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      className="h-10 w-full rounded-none border-border bg-card/80 pl-10 pr-10 text-foreground placeholder:text-muted-foreground focus-visible:ring-ring"
                      placeholder="Search findings, topics, or response text"
                      value={query}
                      onChange={(e) => {
                        setQuery(e.target.value);
                        setCurrentIndex(0);
                      }}
                      autoFocus={false}
                    />
                    {query && (
                      <button
                        onClick={() => { setQuery(""); setCurrentIndex(0); }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1"
                      >
                        <XCircle className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  <Button
                    type="button"
                    className={cn(
                      "h-10 rounded-none border px-3 text-sm font-medium",
                      topicsVisible
                        ? "border-primary/50 bg-primary/10 text-primary"
                        : "border-border bg-card/40 text-muted-foreground hover:border-muted hover:text-foreground",
                    )}
                    onClick={() => setTopicsVisible((v) => !v)}
                  >
                    <Menu className="h-4 w-4" />
                  </Button>

                  <Button
                    type="button"
                    className="h-10 rounded-md border border-primary/50 bg-primary/10 px-3 text-sm font-medium text-primary"
                    onClick={() => setReviewMode(false)}
                  >
                    Review Off
                  </Button>
                </div>

                <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                  <div>
                    {query ? (
                      <span>
                        <span className="text-primary font-semibold">{filteredQuestions.length}</span> results for &ldquo;<span className="text-foreground">{query}</span>&rdquo;
                      </span>
                    ) : (
                      <span>{filteredQuestions.length} questions</span>
                    )}
                  </div>
                  <div>{reviewedCount} reviewed</div>
                </div>

                {selectedTopics.size > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2 items-center">
                    <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">Filters:</span>
                    {Array.from(selectedTopics).map((t) => (
                      <Badge 
                        key={t}
                        variant="secondary"
                        className="flex items-center gap-1 cursor-pointer hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 transition-colors bg-primary/10 text-primary border-primary/20"
                        onClick={() => {
                          setSelectedTopics((cur) => {
                            const next = new Set(cur);
                            next.delete(t);
                            return next;
                          });
                          setCurrentIndex(0);
                        }}
                      >
                        {t}
                        <XCircle className="h-3 w-3" />
                      </Badge>
                    ))}
                    <button
                      className="text-[10px] text-muted-foreground hover:text-foreground underline ml-1 uppercase tracking-wider"
                      onClick={() => { setSelectedTopics(new Set()); setCurrentIndex(0); }}
                    >
                      Clear all
                    </button>
                  </div>
                )}

                {topicsVisible ? (
                  <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {topicsList.map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => {
                          setSelectedTopics((cur) => {
                            const next = new Set(cur);
                            if (next.has(t)) next.delete(t);
                            else next.add(t);
                            return next;
                          });
                          setCurrentIndex(0);
                        }}
                        className={cn(
                          "px-2 py-1 text-sm rounded border text-left truncate",
                          selectedTopics.has(t)
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border bg-card/30 text-foreground",
                        )}
                      >
                        {t}
                      </button>
                    ))}

                    <button
                      type="button"
                      onClick={() => { setSelectedTopics(new Set()); setCurrentIndex(0); }}
                      className="px-2 py-1 rounded border border-border bg-card/30 text-sm"
                    >
                      Clear topics
                    </button>
                  </div>
                ) : null}
              </div>
            </div>

            {/* Question cards */}
            <div className="mx-auto w-full max-w-5xl pb-20">
              {filteredQuestions.length === 0 ? (
                <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 p-8 text-center">
                  <Search className="h-10 w-10 text-muted-foreground" />
                  <div className="space-y-1">
                    <h3 className="text-xl font-semibold text-foreground">No results found</h3>
                    <p className="max-w-md text-sm leading-6 text-muted-foreground">
                      Try a different search term or clear your filters.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    className="mt-2 rounded-none border-border"
                    onClick={() => { setQuery(""); setSelectedTopics(new Set()); }}
                  >
                    Clear all filters
                  </Button>
                </div>
              ) : (
                filteredQuestions.map((question, index) =>
                  renderQuestionCard(question, index)
                )
              )}
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
