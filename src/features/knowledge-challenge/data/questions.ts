import type { WrittenQuestion } from "@/shared/services/challenge/question";

export type ChallengeQuestion = WrittenQuestion;

/**
 * Played only until the library can write its own deck. Every other deck comes from the articles
 * saved on the device, so these stay clearly marked as samples in the challenge.
 */
export const starterQuestions: readonly ChallengeQuestion[] = [
  {
    id: "starter-renewable-source",
    prompt:
      "What is the primary source of energy for most renewable energy on Earth?",
    options: ["Natural gas", "The sun", "Coal", "Nuclear energy"],
    answer: 1,
    source: "Renewable Energy",
    readingId: "starter",
    icon: { ios: "wind", android: "wind_power", web: "wind_power" },
    writtenBy: "library",
  },
  {
    id: "starter-photosynthesis-gas",
    prompt: "Which gas do plants take in from the air during photosynthesis?",
    options: ["Oxygen", "Nitrogen", "Carbon dioxide", "Hydrogen"],
    answer: 2,
    source: "Plant Life",
    readingId: "starter",
    icon: { ios: "leaf.fill", android: "eco", web: "eco" },
    writtenBy: "library",
  },
  {
    id: "starter-water-uptake",
    prompt: "Which part of a plant draws water and minerals from the soil?",
    options: ["Roots", "Stem", "Leaves", "Flowers"],
    answer: 0,
    source: "Plant Life",
    readingId: "starter",
    icon: { ios: "leaf", android: "grass", web: "grass" },
    writtenBy: "library",
  },
  {
    id: "starter-ozone-layer",
    prompt: "Which layer of the atmosphere holds most of Earth's ozone?",
    options: ["Troposphere", "Mesosphere", "Thermosphere", "Stratosphere"],
    answer: 3,
    source: "Atmosphere",
    readingId: "starter",
    icon: { ios: "cloud.fill", android: "cloud", web: "cloud" },
    writtenBy: "library",
  },
  {
    id: "starter-water-cycle",
    prompt: "Which process turns water vapour back into liquid inside a cloud?",
    options: ["Evaporation", "Condensation", "Transpiration", "Infiltration"],
    answer: 1,
    source: "Water Cycle",
    readingId: "starter",
    icon: { ios: "drop.fill", android: "water_drop", web: "water_drop" },
    writtenBy: "library",
  },
  {
    id: "starter-ocean-share",
    prompt: "About how much of Earth's surface is covered by ocean?",
    options: ["51 percent", "61 percent", "71 percent", "81 percent"],
    answer: 2,
    source: "Oceans",
    readingId: "starter",
    icon: { ios: "water.waves", android: "waves", web: "waves" },
    writtenBy: "library",
  },
  {
    id: "starter-geothermal",
    prompt: "Which renewable source draws heat from inside the Earth?",
    options: ["Geothermal", "Solar", "Hydro", "Biomass"],
    answer: 0,
    source: "Renewable Energy",
    readingId: "starter",
    icon: { ios: "flame.fill", android: "volcano", web: "volcano" },
    writtenBy: "library",
  },
  {
    id: "starter-plant-eater",
    prompt: "What do we call an animal that eats only plants?",
    options: ["Carnivore", "Omnivore", "Detritivore", "Herbivore"],
    answer: 3,
    source: "Ecosystems",
    readingId: "starter",
    icon: { ios: "hare.fill", android: "pets", web: "pets" },
    writtenBy: "library",
  },
  {
    id: "starter-fossil-fuel-gas",
    prompt: "Which greenhouse gas is released most when fossil fuels burn?",
    options: ["Argon", "Carbon dioxide", "Ozone", "Helium"],
    answer: 1,
    source: "Climate Basics",
    readingId: "starter",
    icon: { ios: "smoke.fill", android: "factory", web: "factory" },
    writtenBy: "library",
  },
  {
    id: "starter-nitrogen-fixers",
    prompt:
      "Which organisms turn nitrogen from the air into a form plants can absorb?",
    options: ["Fungi", "Algae", "Bacteria", "Insects"],
    answer: 2,
    source: "Ecosystems",
    readingId: "starter",
    icon: { ios: "atom", android: "biotech", web: "biotech" },
    writtenBy: "library",
  },
];

export const OPTION_LETTERS = ["A", "B", "C", "D"] as const;
