import { useEffect } from "react";

import { useChallengeDeckStore } from "@/shared/stores/challenge-deck-store";

import { starterQuestions, type ChallengeQuestion } from "../data/questions";

export interface ChallengeDeck {
  questions: readonly ChallengeQuestion[];
  /** True while the library is still being read; the deck below is not final yet. */
  building: boolean;
  /** True when the questions are the shipped samples rather than the user's own articles. */
  starter: boolean;
  writtenBy: "library" | "model";
  articles: number;
}

/** The deck as it stands, without asking for one to be built. */
export function useDeckQuestions(): ChallengeDeck {
  const questions = useChallengeDeckStore((state) => state.questions);
  const status = useChallengeDeckStore((state) => state.status);
  const writtenBy = useChallengeDeckStore((state) => state.writtenBy);
  const articles = useChallengeDeckStore((state) => state.articles);
  const ready = status === "ready" && questions.length > 0;
  return {
    questions: ready ? questions : starterQuestions,
    building: status === "building" || status === "idle",
    starter: !ready,
    writtenBy,
    articles,
  };
}

/**
 * The deck to play, built from the library on first use. Building also promotes a finished
 * model rewrite, so it is only called where no run is in progress.
 */
export function useChallengeDeck(): ChallengeDeck {
  const deck = useDeckQuestions();
  const build = useChallengeDeckStore((state) => state.build);

  useEffect(() => {
    void build();
  }, [build]);

  return deck;
}
