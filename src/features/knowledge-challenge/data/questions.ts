import type { SymbolViewProps } from "expo-symbols";

export interface ChallengeQuestion {
  id: string;
  prompt: string;
  options: readonly string[];
  /** Index into `options`. */
  answer: number;
  /** Which installed pack this question was drawn from. */
  pack: string;
  /** Illustrated stand-in until packs ship their own question artwork. */
  icon: SymbolViewProps["name"];
}

export const CHALLENGE_TOPIC = "Science & Nature";

export const challengeQuestions: readonly ChallengeQuestion[] = [
  {
    id: "renewable-source",
    prompt:
      "What is the primary source of energy for most renewable energy on Earth?",
    options: ["Natural gas", "The sun", "Coal", "Nuclear energy"],
    answer: 1,
    pack: "Renewable Energy",
    icon: { ios: "wind", android: "wind_power", web: "wind_power" },
  },
  {
    id: "photosynthesis-gas",
    prompt: "Which gas do plants take in from the air during photosynthesis?",
    options: ["Oxygen", "Nitrogen", "Carbon dioxide", "Hydrogen"],
    answer: 2,
    pack: "Plant Life",
    icon: { ios: "leaf.fill", android: "eco", web: "eco" },
  },
  {
    id: "water-uptake",
    prompt: "Which part of a plant draws water and minerals from the soil?",
    options: ["Roots", "Stem", "Leaves", "Flowers"],
    answer: 0,
    pack: "Plant Life",
    icon: { ios: "leaf", android: "grass", web: "grass" },
  },
  {
    id: "ozone-layer",
    prompt: "Which layer of the atmosphere holds most of Earth's ozone?",
    options: ["Troposphere", "Mesosphere", "Thermosphere", "Stratosphere"],
    answer: 3,
    pack: "Atmosphere",
    icon: { ios: "cloud.fill", android: "cloud", web: "cloud" },
  },
  {
    id: "water-cycle",
    prompt: "Which process turns water vapour back into liquid inside a cloud?",
    options: ["Evaporation", "Condensation", "Transpiration", "Infiltration"],
    answer: 1,
    pack: "Water Cycle",
    icon: { ios: "drop.fill", android: "water_drop", web: "water_drop" },
  },
  {
    id: "ocean-share",
    prompt: "About how much of Earth's surface is covered by ocean?",
    options: ["51 percent", "61 percent", "71 percent", "81 percent"],
    answer: 2,
    pack: "Oceans",
    icon: { ios: "water.waves", android: "waves", web: "waves" },
  },
  {
    id: "geothermal",
    prompt: "Which renewable source draws heat from inside the Earth?",
    options: ["Geothermal", "Solar", "Hydro", "Biomass"],
    answer: 0,
    pack: "Renewable Energy",
    icon: { ios: "flame.fill", android: "volcano", web: "volcano" },
  },
  {
    id: "plant-eater",
    prompt: "What do we call an animal that eats only plants?",
    options: ["Carnivore", "Omnivore", "Detritivore", "Herbivore"],
    answer: 3,
    pack: "Ecosystems",
    icon: { ios: "hare.fill", android: "pets", web: "pets" },
  },
  {
    id: "fossil-fuel-gas",
    prompt: "Which greenhouse gas is released most when fossil fuels burn?",
    options: ["Argon", "Carbon dioxide", "Ozone", "Helium"],
    answer: 1,
    pack: "Climate Basics",
    icon: { ios: "smoke.fill", android: "factory", web: "factory" },
  },
  {
    id: "nitrogen-fixers",
    prompt:
      "Which organisms turn nitrogen from the air into a form plants can absorb?",
    options: ["Fungi", "Algae", "Bacteria", "Insects"],
    answer: 2,
    pack: "Ecosystems",
    icon: { ios: "atom", android: "biotech", web: "biotech" },
  },
];

export const OPTION_LETTERS = ["A", "B", "C", "D"] as const;
