import { describe, expect, test } from "bun:test";

import {
  readingLead,
  readingSentences,
  splitSentences,
  toMaterial,
  usableSentence,
} from "../src/shared/services/challenge/collect-material";
import {
  buildQuestionPrompt,
  groundedInPassage,
  parseQuestion,
} from "../src/shared/services/challenge/model-questions";
import { isWrittenQuestion } from "../src/shared/services/challenge/question";
import {
  DECK_SIZE,
  figureDistractors,
  findFigure,
  maskTitle,
  seededRandom,
  writeQuestions,
} from "../src/shared/services/challenge/write-questions";

function article(title: string, body: string[], summary?: string) {
  return {
    id: `wikipedia-en-${title.length}${body.length}`,
    title,
    summary: summary ?? body[0] ?? "",
    sections: [{ title: "", level: 1, paragraphs: body }],
  };
}

/** Four articles with enough plain prose to write a full deck from. */
function library() {
  return [
    article("Photosynthesis", [
      "Photosynthesis is the process plants use to turn light into chemical energy stored as sugar.",
      "Photosynthesis takes place inside chloroplasts, where pigments absorb light across the visible spectrum.",
      "Around 70 percent of the oxygen in the atmosphere is produced by photosynthesis in the ocean.",
    ]),
    article("Water cycle", [
      "The water cycle describes how water moves between the ocean, the atmosphere and the land.",
      "The water cycle drives weather by moving heat from warm regions toward cooler ones.",
      "Roughly 500 thousand cubic kilometres of water evaporate from the surface each year.",
    ]),
    article("Plate tectonics", [
      "Plate tectonics explains how the rigid outer shell of the planet is broken into moving plates.",
      "Plate tectonics was accepted widely by scientists in 1967 after decades of mounting evidence.",
      "Plate tectonics builds mountain ranges where two continental plates collide over long periods.",
    ]),
    article("Antarctica", [
      "Antarctica is the southernmost continent and holds most of the fresh water on the planet.",
      "Antarctica has no permanent residents, though research stations host scientists through the year.",
      "Antarctica covers about 14 million square kilometres, making it the fifth largest continent.",
    ]),
  ];
}

const material = () => library().map((item) => toMaterial(item, "science"));

describe("sentence extraction", () => {
  test("splits on sentence ends and keeps the text intact", () => {
    const parts = splitSentences("Rain falls. Rivers carry it to the sea! Does it return?");
    expect(parts).toEqual(["Rain falls.", "Rivers carry it to the sea!", "Does it return?"]);
  });

  test("rejects sentences that cannot stand alone", () => {
    expect(usableSentence("It is the largest of them all and covers a wide area.")).toBe(false);
    expect(usableSentence("Mercury may refer to a planet, a metal, or a Roman god.")).toBe(false);
    expect(usableSentence("Short one.")).toBe(false);
    expect(usableSentence("Rain shapes the land over time by moving sediment downhill[1].")).toBe(false);
    expect(usableSentence("Rain shapes the land over time by moving sediment downhill.")).toBe(true);
  });

  test("rejects sentences that only point at something else on the page", () => {
    expect(usableSentence("The relationships between the branches are summarized by the table.")).toBe(
      false,
    );
    expect(usableSentence("The main types of sedimentary rock are listed below in order.")).toBe(false);
    expect(
      usableSentence("Femtochemistry – area of chemistry that studies reactions on short timescales."),
    ).toBe(false);
  });

  test("takes the opening sentence as the lead", () => {
    const item = library()[0];
    expect(readingLead(item)).toBe(
      "Photosynthesis is the process plants use to turn light into chemical energy stored as sugar.",
    );
    expect(readingSentences(item).length).toBe(3);
  });
});

describe("masking and figures", () => {
  test("hides the article's own name so the excerpt does not answer itself", () => {
    const masked = maskTitle("Photosynthesis takes place inside chloroplasts of green plants.", "Photosynthesis");
    expect(masked).toBe("_____ takes place inside chloroplasts of green plants.");
  });

  test("leaves a sentence alone when the subject is never named", () => {
    expect(maskTitle("Light is absorbed by pigments in the leaf.", "Photosynthesis")).toBeNull();
  });

  test("finds a figure and offers alternatives of the same shape", () => {
    const figure = findFigure("Around 70 percent of the oxygen comes from the ocean.");
    expect(figure?.text).toBe("70 percent");
    const options = figureDistractors(figure!);
    expect(options).toHaveLength(3);
    expect(options).not.toContain("70 percent");
    expect(options.every((option) => option.endsWith(" percent"))).toBe(true);
  });

  test("offers nearby years rather than halves and doubles", () => {
    const figure = findFigure("Plate tectonics was accepted widely by scientists in 1967.");
    expect(figure?.text).toBe("1967");
    expect(figureDistractors(figure!)).toEqual(["1955", "1976", "1936"]);
  });

  test("keeps a share of a whole under one hundred percent", () => {
    const figure = findFigure("Nitrous oxide is 63.3% nitrogen by mass.");
    expect(figure?.text).toBe("63.3%");
    for (const option of figureDistractors(figure!)) {
      expect(Number.parseFloat(option) <= 100).toBe(true);
    }
    expect(figureDistractors(figure!).length).toBe(3);
  });

  test("skips a number that is only part of a power", () => {
    expect(findFigure("Reactions are studied on timescales of about 10−15 seconds.")).toBe(null);
  });

  test("skips a sentence that states the same figure twice", () => {
    const repeats = [{
      readingId: "oxygen",
      title: "Oxygen",
      topic: "science" as const,
      lead: "",
      sentences: ["Oxygen has an atomic number of 8: each oxygen atom holds 8 protons in its nucleus."],
    }];
    const asked = writeQuestions([...material(), ...repeats], "seed");
    expect(asked.some((q) => q.readingId === "oxygen" && q.promptKey === "challenge.askFigure")).toBe(
      false,
    );
  });
});

describe("writing a deck", () => {
  test("writes well-formed questions from the articles it has", () => {
    const deck = writeQuestions(material(), "seed");
    // Four articles, asked about twice each.
    expect(deck).toHaveLength(8);
    expect(deck.every(isWrittenQuestion)).toBe(true);
    for (const question of deck) {
      expect(question.options[question.answer]).toBeTruthy();
      expect(question.writtenBy).toBe("library");
      expect(question.excerpt).toBeTruthy();
    }
  });

  test("never names the answer inside the excerpt", () => {
    for (const question of writeQuestions(material(), "seed")) {
      const answer = question.options[question.answer].toLowerCase();
      expect(question.excerpt?.toLowerCase().includes(answer)).toBe(false);
    }
  });

  test("stops at ten questions once the library is large enough", () => {
    const wide = [...material(), ...material().map((item, index) => ({
      ...item,
      readingId: `${item.readingId}-copy`,
      title: `${item.title} ${index + 1}`,
    }))];
    const deck = writeQuestions(wide, "seed");
    expect(deck).toHaveLength(DECK_SIZE);
  });

  test("spreads the deck across articles and asks about none more than twice", () => {
    const deck = writeQuestions(material(), "seed");
    const perArticle = new Map<string, number>();
    for (const question of deck) {
      perArticle.set(question.readingId, (perArticle.get(question.readingId) ?? 0) + 1);
    }
    expect(Math.max(...perArticle.values()) <= 2).toBe(true);
    expect(perArticle.size).toBe(4);
  });

  test("asks no question twice", () => {
    const deck = writeQuestions(material(), "seed");
    expect(new Set(deck.map((question) => question.excerpt)).size).toBe(deck.length);
    expect(new Set(deck.map((question) => question.id)).size).toBe(deck.length);
  });

  test("gives the same deck for the same library and a different one otherwise", () => {
    expect(writeQuestions(material(), "seed")).toEqual(writeQuestions(material(), "seed"));
    expect(writeQuestions(material(), "other")).not.toEqual(writeQuestions(material(), "seed"));
  });

  test("does not put the answer in the same slot every time", () => {
    const slots = new Set(writeQuestions(material(), "seed").map((question) => question.answer));
    expect(slots.size).toBeGreaterThan(1);
  });

  test("writes nothing when there are too few articles to choose between", () => {
    expect(writeQuestions(material().slice(0, 3), "seed")).toEqual([]);
  });

  test("the seeded generator is stable", () => {
    const first = [seededRandom("a")(), seededRandom("a")()];
    expect(first[0]).toBe(first[1]);
    expect(seededRandom("a")()).not.toBe(seededRandom("b")());
  });
});

describe("reading the model's output", () => {
  const good = [
    "Q: Which gas does photosynthesis release?",
    "A) Nitrogen",
    "B) Oxygen",
    "C) Argon",
    "D) Helium",
    "Correct: B",
  ].join("\n");

  test("reads back a well-formed question", () => {
    expect(parseQuestion(good)).toEqual({
      prompt: "Which gas does photosynthesis release?",
      options: ["Nitrogen", "Oxygen", "Argon", "Helium"],
      answer: 1,
    });
  });

  test("tolerates stray commentary around the format", () => {
    expect(parseQuestion(`Here you go:\n\n${good}\n\nHope that helps.`)?.answer).toBe(1);
  });

  test("refuses output that cannot be trusted", () => {
    expect(parseQuestion("")).toBeNull();
    expect(parseQuestion(good.replace("Correct: B", ""))).toBeNull();
    expect(parseQuestion(good.replace("Correct: B", "Correct: F"))).toBeNull();
    expect(parseQuestion(good.replace("D) Helium", ""))).toBeNull();
    expect(parseQuestion(good.replace("C) Argon", "C) Oxygen"))).toBeNull();
    expect(parseQuestion(good.replace("Which gas does photosynthesis release?", "Name a gas."))).toBeNull();
    expect(parseQuestion(good.replace("B) Oxygen", `B) ${"long ".repeat(30)}`))).toBeNull();
  });

  test("keeps only answers the passage actually states", () => {
    const passage = "Photosynthesis releases oxygen as plants convert light into sugar.";
    expect(groundedInPassage("Oxygen", passage)).toBe(true);
    expect(groundedInPassage("Helium", passage)).toBe(false);
  });

  test("the prompt carries the passage and stays inside the engine limit", () => {
    const prompt = buildQuestionPrompt("Photosynthesis", "Plants convert light into sugar. ".repeat(200));
    expect(prompt).toContain('Passage from "Photosynthesis"');
    expect(prompt).toContain("Correct: <A, B, C or D>");
    expect(prompt.length < 4000).toBe(true);
  });
});
