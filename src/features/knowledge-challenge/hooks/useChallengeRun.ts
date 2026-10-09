import { useEffect, useRef, useState } from "react";

import type { RailSegment } from "../components";
import type { ChallengeQuestion } from "../data/questions";

export type ChallengePhase = "answering" | "revealed";

/**
 * Drives one pass through the question set. `reviewAnswers` replays a finished
 * run with every answer already revealed and the options locked.
 */
export function useChallengeRun(
  questions: readonly ChallengeQuestion[],
  reviewAnswers: number[] | null,
) {
  const reviewing = reviewAnswers !== null;
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [answers, setAnswers] = useState<number[]>([]);
  const [phase, setPhase] = useState<ChallengePhase>("answering");
  const startedAt = useRef(0);

  useEffect(() => {
    startedAt.current = Date.now();
  }, []);

  const total = questions.length;
  const position = Math.min(index, Math.max(total - 1, 0));
  const question = questions[position];
  const isLast = position === total - 1;
  const given = reviewing ? (reviewAnswers[position] ?? -1) : picked;
  const revealed = reviewing || phase === "revealed";

  const segments: RailSegment[] = questions.map((item, slot) => {
    const answer = reviewing ? reviewAnswers[slot] : answers[slot];
    if (answer !== undefined) {
      return answer === item.answer ? "correct" : "wrong";
    }
    return slot === position && !revealed ? "current" : "upcoming";
  });

  function select(option: number) {
    if (revealed) return;
    setPicked(option);
  }

  function reveal() {
    if (picked === null) return;
    setAnswers((current) => [...current, picked]);
    setPhase("revealed");
  }

  function advance() {
    setIndex((current) => Math.min(current + 1, total - 1));
    setPicked(null);
    setPhase("answering");
  }

  function elapsedSeconds() {
    if (!startedAt.current) return 0;
    return Math.max(1, Math.round((Date.now() - startedAt.current) / 1000));
  }

  return {
    reviewing,
    index: position,
    total,
    isLast,
    question,
    given,
    revealed,
    answers,
    segments,
    select,
    reveal,
    advance,
    elapsedSeconds,
  };
}
