"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, ArrowLeft, ArrowRight, CheckCircle2, ChevronLeft, XCircle } from "lucide-react";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { Progress } from "./ui/progress";
import { cn } from "../lib/utils";
import { normalizeQuestions, type NormalizedQuestionItem, type QuestionItem } from "../lib/questions";

type TestModeProps = { questions: QuestionItem[] };

type UserAnswer =
  | { type: "mcq" | "msq"; selected: number[] }
  | { type: "drag_and_drop"; mapping: Record<string, string> };

type Phase = "intro" | "test" | "results";

function optionLabel(i: number) {
  return String.fromCharCode(65 + i);
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function isCorrect(q: NormalizedQuestionItem, answer: UserAnswer | undefined): boolean {
  if (!answer) return false;
  const qtype = (q as any).type;

  if (qtype === "drag_and_drop") {
    if (answer.type !== "drag_and_drop") return false;
    const correctAnswer = (q as any).answer as Record<string, string>;
    return Object.entries(correctAnswer).every(([k, v]) => answer.mapping[v] === k);
  }

  if (qtype === "msq") {
    if (answer.type !== "mcq" && answer.type !== "msq") return false;
    const correctOpts = Array.isArray(q.answer) ? q.answer : [q.answer];
    const selectedOpts = answer.selected.map((i) => q.options?.[i]).filter(Boolean);
    return (
      correctOpts.length === selectedOpts.length &&
      correctOpts.every((c) => selectedOpts.includes(c as string))
    );
  }

  // mcq
  if (answer.type !== "mcq" && answer.type !== "msq") return false;
  if (answer.selected.length === 0) return false;
  const selected = q.options?.[answer.selected[0]];
  return selected === q.answer;
}

export function TestMode({ questions }: TestModeProps) {
  const all = useMemo(() => normalizeQuestions(questions), [questions]);
  const [phase, setPhase] = useState<Phase>("intro");
  const [testQuestions, setTestQuestions] = useState<NormalizedQuestionItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, UserAnswer>>({});
  const [activeDragItem, setActiveDragItem] = useState<string | null>(null);
  const [dropTargets, setDropTargets] = useState<Record<string, string[]>>({});
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const [showTabWarning, setShowTabWarning] = useState(false);
  const [isDark, setIsDark] = useState(true);
  const warningDismissed = useRef(false);

  // Sync dark mode with document
  useEffect(() => {
    const htmlEl = document.documentElement;
    const wasDark = htmlEl.classList.contains("dark");
    setIsDark(wasDark);
  }, []);

  // Tab-switch detection
  useEffect(() => {
    if (phase !== "test") return;
    const handler = () => {
      if (document.hidden) {
        setTabSwitchCount((c) => c + 1);
        warningDismissed.current = false;
      } else {
        setShowTabWarning(true);
      }
    };
    document.addEventListener("visibilitychange", handler);
    return () => document.removeEventListener("visibilitychange", handler);
  }, [phase]);

  // Initialize drop targets when question changes (drag_and_drop)
  useEffect(() => {
    const q = testQuestions[currentIndex];
    if (!q || (q as any).type !== "drag_and_drop") return;
    const qid = q.id;
    setDropTargets((prev) => {
      if (prev[qid]) return prev;
      const items = (q as any).items ?? {};
      const targets = shuffle(Object.values(items) as string[]);
      return { ...prev, [qid]: targets };
    });
  }, [currentIndex, testQuestions]);

  const startTest = useCallback(() => {
    const picked = shuffle(all).slice(0, 50);
    setTestQuestions(picked);
    setCurrentIndex(0);
    setAnswers({});
    setDropTargets({});
    setTabSwitchCount(0);
    setPhase("test");
  }, [all]);

  const currentQ = testQuestions[currentIndex] ?? null;
  const currentAnswer = currentQ ? answers[currentQ.id] : undefined;
  const qtype = currentQ ? (currentQ as any).type : null;
  const currentDropTargets = currentQ ? (dropTargets[currentQ.id] ?? []) : [];
  const currentMapping =
    currentAnswer?.type === "drag_and_drop" ? currentAnswer.mapping : {};

  const hasAnswered = (() => {
    if (!currentQ) return false;
    if (!currentAnswer) return false;
    if (qtype === "drag_and_drop") {
      return (
        currentDropTargets.length > 0 &&
        currentDropTargets.every((t) => Boolean(currentMapping[t]))
      );
    }
    if (currentAnswer.type === "mcq" || currentAnswer.type === "msq") {
      return currentAnswer.selected.length > 0;
    }
    return false;
  })();

  const selectOption = (idx: number) => {
    if (!currentQ) return;
    const id = currentQ.id;
    if (qtype === "msq") {
      setAnswers((prev) => {
        const cur = prev[id];
        const selected = cur?.type === "msq" || cur?.type === "mcq" ? (cur as any).selected as number[] : [];
        const next = selected.includes(idx) ? selected.filter((i) => i !== idx) : [...selected, idx];
        return { ...prev, [id]: { type: "msq", selected: next } };
      });
    } else {
      setAnswers((prev) => ({ ...prev, [id]: { type: "mcq", selected: [idx] } }));
    }
  };

  const assignDrop = (target: string, key: string) => {
    if (!currentQ) return;
    const id = currentQ.id;
    setAnswers((prev) => {
      const cur = prev[id];
      const mapping = cur?.type === "drag_and_drop" ? { ...cur.mapping } : {};
      mapping[target] = key;
      return { ...prev, [id]: { type: "drag_and_drop", mapping } };
    });
    setActiveDragItem(null);
  };

  const clearDrop = (target: string) => {
    if (!currentQ) return;
    const id = currentQ.id;
    setAnswers((prev) => {
      const cur = prev[id];
      if (cur?.type !== "drag_and_drop") return prev;
      const mapping = { ...cur.mapping };
      delete mapping[target];
      return { ...prev, [id]: { type: "drag_and_drop", mapping } };
    });
  };

  const goNext = () => {
    if (currentIndex < testQuestions.length - 1) {
      setCurrentIndex((c) => c + 1);
      setActiveDragItem(null);
    } else {
      setPhase("results");
    }
  };

  const goPrev = () => {
    setCurrentIndex((c) => Math.max(c - 1, 0));
    setActiveDragItem(null);
  };

  // ── RESULTS ──────────────────────────────────────────────────────────────
  if (phase === "results") {
    const score = testQuestions.filter((q) => isCorrect(q, answers[q.id])).length;
    const pct = Math.round((score / testQuestions.length) * 100);
    const passed = pct >= 75;

    return (
      <main className="min-h-screen bg-background text-foreground antialiased">
        <div className="mx-auto max-w-3xl px-4 py-10">
          {/* Score card */}
          <Card className="mb-8 border-border bg-card/80 shadow-xl">
            <CardContent className="p-6 text-center">
              <div className={cn("text-6xl font-bold mb-2", passed ? "text-emerald-700 dark:text-emerald-400" : "text-destructive")}>{pct}%</div>
              <div className="text-lg font-semibold text-foreground mb-1">{passed ? "Passed" : "Needs Improvement"}</div>
              <div className="text-sm text-muted-foreground mb-4">{score} / {testQuestions.length} correct</div>
              {tabSwitchCount > 0 && (
                <div className="inline-flex items-center gap-2 rounded border border-amber-400/40 bg-amber-500/10 px-3 py-1.5 text-xs text-amber-700 dark:text-amber-300 mb-4">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Tab switched {tabSwitchCount} time{tabSwitchCount > 1 ? "s" : ""} during test
                </div>
              )}
              <Progress value={pct} className="h-3 bg-muted" />
              <div className="mt-6 flex justify-center gap-3">
                <Button variant="outline" className="border-border text-foreground" onClick={() => setPhase("intro")}>Back to Home</Button>
                <Button className="border border-primary/50 bg-primary/10 text-primary hover:bg-primary/20 hover:text-primary" onClick={startTest}>Retake Test</Button>
              </div>
            </CardContent>
          </Card>

          {/* Question review */}
          <div className="space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">Question Review</h2>
            {testQuestions.map((q, i) => {
              const correct = isCorrect(q, answers[q.id]);
              const qt = (q as any).type;
              const userAnswer = answers[q.id];

              return (
                <Card key={q.id} className={cn("border bg-card/70", correct ? "border-emerald-500/30" : "border-destructive/30")}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 shrink-0">
                        {correct
                          ? <CheckCircle2 className="h-5 w-5 text-emerald-700 dark:text-emerald-400" />
                          : <XCircle className="h-5 w-5 text-destructive" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-1">Q{i + 1} · {q.category}</div>
                        <div className="text-sm font-semibold text-foreground mb-3">{q.question}</div>

                        {qt === "drag_and_drop" ? (
                          <div className="space-y-1">
                            {Object.entries((q as any).answer ?? {}).map(([k, v]) => (
                              <div key={k} className="text-xs text-foreground">
                                <span className="font-medium">{String(v)}</span>
                                <span className="text-muted-foreground"> → </span>
                                <span className={cn("font-medium",
                                  userAnswer?.type === "drag_and_drop" && userAnswer.mapping[String(v)] === k
                                    ? "text-emerald-700 dark:text-emerald-400"
                                    : "text-destructive"
                                )}>{userAnswer?.type === "drag_and_drop" ? (userAnswer.mapping[String(v)] ?? "—") : "—"}</span>
                                {userAnswer?.type === "drag_and_drop" && userAnswer.mapping[String(v)] !== k && (
                                  <span className="text-emerald-700 dark:text-emerald-400"> (correct: {k})</span>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="space-y-1">
                            {q.options?.map((opt, idx) => {
                              const correctOpts = Array.isArray(q.answer) ? q.answer : [q.answer];
                              const isCorrectOpt = correctOpts.includes(opt);
                              const isSelected = userAnswer?.type === "mcq" || userAnswer?.type === "msq"
                                ? (userAnswer as any).selected.includes(idx)
                                : false;
                              if (!isCorrectOpt && !isSelected) return null;
                              return (
                                <div key={idx} className={cn(
                                  "flex items-center gap-2 text-xs px-2 py-1 rounded",
                                  isCorrectOpt ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" : "bg-destructive/10 text-destructive"
                                )}>
                                  <span className="font-bold">{optionLabel(idx)}.</span>
                                  <span>{opt}</span>
                                  {isCorrectOpt && <span className="ml-auto text-[10px]">✓ correct</span>}
                                  {!isCorrectOpt && isSelected && <span className="ml-auto text-[10px]">✗ your answer</span>}
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {q.explanation && (
                          <div className="mt-3 border-l-4 border-primary/40 bg-primary/5 px-3 py-2 text-xs text-primary/80 leading-5">
                            {q.explanation}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </main>
    );
  }

  // ── INTRO ─────────────────────────────────────────────────────────────────
  if (phase === "intro") {
    return (
      <main className="min-h-screen bg-background text-foreground antialiased flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <div className="mb-2">
            <a href="/" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
              <ChevronLeft className="h-3.5 w-3.5" /> Back to Reviewer
            </a>
          </div>
          <Card className="border-border bg-card/80 shadow-xl">
            <CardContent className="p-8 text-center space-y-5">
              <Badge className="rounded-none border border-primary/20 bg-primary/10 px-4 py-1 text-[10px] uppercase tracking-[0.35em] text-primary">Test Mode</Badge>
              <div>
                <h1 className="text-2xl font-bold text-foreground">Cybersecurity Test</h1>
                <p className="mt-1 text-sm text-muted-foreground">50 randomized questions from the full question pool</p>
              </div>
              <div className="grid grid-cols-3 gap-3 text-center">
                {[["50", "Questions"], ["No limit", "Time"], ["75%", "Pass mark"]].map(([val, label]) => (
                  <div key={label} className="rounded border border-border bg-muted/50 px-2 py-3">
                    <div className="text-lg font-bold text-primary">{val}</div>
                    <div className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground">{label}</div>
                  </div>
                ))}
              </div>
              <div className="rounded border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-left text-xs text-amber-700 dark:text-amber-300 space-y-1">
                <div className="font-semibold flex items-center gap-1.5"><AlertTriangle className="h-3.5 w-3.5" /> Rules</div>
                <ul className="space-y-0.5 list-disc list-inside">
                  <li>Answers are hidden until the end</li>
                  <li>Tab switches will be flagged on results</li>
                  <li>You can go back and change answers</li>
                  <li>Submit when you've answered all questions</li>
                </ul>
              </div>
              <Button className="w-full border border-primary/50 bg-primary/10 text-primary hover:bg-primary/20 hover:text-primary" onClick={startTest}>
                Start Test
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    );
  }

  // ── TEST ──────────────────────────────────────────────────────────────────
  const assigned = new Set(Object.values(currentMapping));
  const availableItems = currentQ
    ? Object.keys((currentQ as any).items ?? {}).filter((k) => !assigned.has(k))
    : [];
  const answeredCount = testQuestions.filter((q) => answers[q.id] !== undefined).length;

  return (
    <main className="min-h-screen bg-background text-foreground antialiased flex flex-col"
      onTouchStart={(e) => { if (qtype !== "drag_and_drop") { const t = e.targetTouches[0].clientX; (e.currentTarget as any)._ts = t; } }}
      onTouchEnd={(e) => {
        if (qtype === "drag_and_drop") return;
        const ts = (e.currentTarget as any)._ts;
        if (!ts) return;
        const dist = ts - e.changedTouches[0].clientX;
        if (dist > 50) goNext();
        if (dist < -50) goPrev();
      }}
    >
      {/* Tab switch warning overlay */}
      {showTabWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <Card className="border-amber-400/50 bg-card shadow-2xl max-w-sm mx-4">
            <CardContent className="p-6 text-center space-y-4">
              <AlertTriangle className="h-10 w-10 text-amber-500 mx-auto" />
              <div>
                <div className="font-bold text-foreground">Tab Switch Detected</div>
                <div className="text-sm text-muted-foreground mt-1">
                  You've left this tab {tabSwitchCount} time{tabSwitchCount > 1 ? "s" : ""}. This will be shown on your results.
                </div>
              </div>
              <Button className="w-full border border-primary/50 bg-primary/10 text-primary hover:bg-primary/20 hover:text-primary"
                onClick={() => setShowTabWarning(false)}>
                Continue Test
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Header */}
      <div className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Badge className="rounded-none border border-primary/20 bg-primary/10 px-3 py-1 text-[10px] uppercase tracking-[0.25em] text-primary">Test Mode</Badge>
            <span className="text-sm text-muted-foreground">{currentIndex + 1} / {testQuestions.length}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground">{answeredCount} answered</span>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 border-border text-muted-foreground hover:text-foreground"
              onClick={() => setPhase("intro")}
              aria-label="Exit test"
            >
              <XCircle className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <Progress value={((currentIndex + 1) / testQuestions.length) * 100} className="h-1 rounded-none bg-muted" />
      </div>

      {/* Question */}
      <div className="flex-1 mx-auto w-full max-w-3xl px-4 py-6">
        {currentQ && (
          <div className="space-y-4">
            <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{(currentQ as any).category}</div>

            <div className="rounded border border-border bg-muted/40 px-4 py-3">
              <div className="text-[10px] uppercase tracking-[0.18em] text-primary mb-1">
                {qtype === "msq" ? "Multi-select" : qtype === "drag_and_drop" ? "Matching" : "Question"}
              </div>
              <div className="text-sm font-semibold text-foreground leading-6">{currentQ.question}</div>
            </div>

            {qtype === "drag_and_drop" ? (
              <div
                className="grid gap-6 md:grid-cols-2"
                onTouchStart={(e) => e.stopPropagation()}
                onTouchMove={(e) => e.stopPropagation()}
                onTouchEnd={(e) => e.stopPropagation()}
              >
                <div>
                  <div className="mb-2 text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-semibold">Items</div>
                  <div className="flex flex-wrap gap-2">
                    {availableItems.map((k) => (
                      <div
                        key={k}
                        draggable
                        onDragStart={(e) => e.dataTransfer.setData("text/plain", k)}
                        onClick={() => setActiveDragItem(activeDragItem === k ? null : k)}
                        className={cn(
                          "cursor-pointer rounded border px-3 py-2 text-xs sm:text-sm transition-all select-none",
                          activeDragItem === k
                            ? "border-primary bg-primary/20 text-primary scale-105"
                            : "border-border bg-card/60 text-foreground hover:bg-muted/50"
                        )}
                      >{k}</div>
                    ))}
                    {availableItems.length === 0 && <div className="text-xs text-muted-foreground italic">All items assigned</div>}
                  </div>
                </div>
                <div>
                  <div className="mb-2 text-sm font-semibold text-foreground">Match to</div>
                  <div className="space-y-2">
                    {currentDropTargets.map((target) => {
                      const assignedKey = currentMapping[target];
                      return (
                        <div
                          key={target}
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={(e) => { const k = e.dataTransfer.getData("text/plain"); if (k) assignDrop(target, k); }}
                          onClick={() => { if (activeDragItem) assignDrop(target, activeDragItem); }}
                          className={cn(
                            "min-h-[48px] flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded border px-3 py-3 sm:py-2 transition-all cursor-pointer",
                            activeDragItem ? "border-primary/40 bg-primary/5" : "border-border bg-card/60"
                          )}
                        >
                          <div className="text-xs sm:text-sm text-foreground">{target}</div>
                          <div className="w-full sm:w-auto sm:min-w-[140px]">
                            {assignedKey ? (
                              <div className="flex items-center justify-between gap-2 border-t border-border/40 pt-2 sm:border-0 sm:pt-0">
                                <div className="text-xs sm:text-sm text-foreground">{assignedKey}</div>
                                <button className="text-[10px] text-muted-foreground underline underline-offset-2"
                                  onClick={(ev) => { ev.stopPropagation(); clearDrop(target); }}>Clear</button>
                              </div>
                            ) : (
                              <div className="text-xs sm:text-sm text-muted-foreground italic">
                                {activeDragItem ? "Tap to drop here" : "Drop item here"}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {currentQ.options?.map((opt, idx) => {
                  const sel = currentAnswer?.type === "mcq" || currentAnswer?.type === "msq"
                    ? (currentAnswer as any).selected as number[]
                    : [];
                  const isSelected = sel.includes(idx);
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => selectOption(idx)}
                      className={cn(
                        "flex w-full items-center gap-4 border px-4 py-4 text-left transition rounded",
                        isSelected
                          ? "border-primary/60 bg-primary/10 text-primary"
                          : "border-border bg-card/60 text-foreground hover:border-primary/40 hover:bg-muted"
                      )}
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center border border-border text-xs font-semibold uppercase tracking-[0.18em] text-primary/90">
                        {optionLabel(idx)}.
                      </span>
                      <span className="text-sm font-medium leading-6">{opt}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer nav */}
      <div className="sticky bottom-0 border-t border-border bg-background/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3">
          <Button variant="outline" className="rounded-none border-border bg-card/80 text-[11px] uppercase tracking-[0.18em] text-foreground"
            onClick={goPrev} disabled={currentIndex === 0}>
            <ArrowLeft className="mr-2 h-3 w-3" /> Prev
          </Button>

          {currentIndex < testQuestions.length - 1 ? (
            <Button
              className="rounded-none border border-primary/50 bg-primary/10 text-[11px] uppercase tracking-[0.18em] text-primary hover:bg-primary/20 hover:text-primary"
              onClick={goNext}
            >
              {hasAnswered ? "Next" : "Skip"} <ArrowRight className="ml-2 h-3 w-3" />
            </Button>
          ) : (
            <Button
              className="rounded-none border border-emerald-500/50 bg-emerald-500/10 text-[11px] uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/20"
              onClick={() => setPhase("results")}
            >
              Submit Test <CheckCircle2 className="ml-2 h-3 w-3" />
            </Button>
          )}
        </div>

        {/* Answer dot strip */}
        <div className="flex gap-0.5 px-4 pb-2 flex-wrap">
          {testQuestions.map((q, i) => (
            <button
              key={q.id}
              onClick={() => setCurrentIndex(i)}
              className={cn(
                "h-2 w-2 rounded-full transition-all",
                i === currentIndex ? "bg-primary scale-125" :
                answers[q.id] ? "bg-primary/40" : "bg-muted-foreground/20"
              )}
              aria-label={`Go to question ${i + 1}`}
            />
          ))}
        </div>
      </div>
    </main>
  );
}
