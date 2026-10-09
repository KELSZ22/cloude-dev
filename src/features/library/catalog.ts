import type { ImageSource } from "expo-image";

export type PackCategory = "science" | "history" | "technology" | "culture";

export type KnowledgePackCard = {
  id: string;
  title: string;
  category: PackCategory;
  articles: number;
  sizeMb: number;
  description: string;
  highlights: readonly string[];
  image: ImageSource;
};

export const knowledgePacks: readonly KnowledgePackCard[] = [
  {
    id: "general",
    title: "General Knowledge",
    category: "culture",
    articles: 1850,
    sizeMb: 450,
    description: "A comprehensive collection covering multiple topics.",
    highlights: ["World facts", "People and places", "Everyday science"],
    image: require("@/assets/catalog/castle.jpg"),
  },
  {
    id: "science-nature",
    title: "Science & Nature",
    category: "science",
    articles: 2430,
    sizeMb: 620,
    description:
      "Discover the wonders of our natural world, from ecosystems to space exploration.",
    highlights: ["Ecosystems", "Weather and climate", "Space exploration"],
    image: require("@/assets/catalog/earth.jpg"),
  },
  {
    id: "world-history",
    title: "World History",
    category: "history",
    articles: 1240,
    sizeMb: 320,
    description: "Explore important events that shaped our world.",
    highlights: [
      "Ancient civilizations",
      "Empires and trade",
      "Modern history",
    ],
    image: require("@/assets/catalog/colosseum.jpg"),
  },
  {
    id: "technology",
    title: "Technology",
    category: "technology",
    articles: 960,
    sizeMb: 280,
    description: "From innovations to digital life.",
    highlights: ["Inventions", "Computing", "How the internet works"],
    image: require("@/assets/catalog/city.jpg"),
  },
];

export function formatCount(value: number) {
  return value.toLocaleString("en-US");
}
