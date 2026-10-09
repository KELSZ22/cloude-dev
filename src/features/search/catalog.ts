import type { ImageSource } from "expo-image";

export type SearchKind = "article" | "document" | "pack";

export type CatalogArticle = {
  id: string;
  title: string;
  pack: string;
  kind: SearchKind;
  readMinutes: number;
  summary: string;
  overview: string;
  highlight: string;
  sectionTitle: string;
  subsectionTitle?: string;
  sectionBody: string;
  tags: string;
  image: ImageSource;
};

const wind = require("@/assets/catalog/wind.jpg");
const solar = require("@/assets/catalog/solar.jpg");
const hydro = require("@/assets/catalog/hydro.jpg");
const earth = require("@/assets/catalog/earth.jpg");

export const articles: readonly CatalogArticle[] = [
  {
    id: "renewable-intro",
    title: "Renewable Energy: An Introduction",
    pack: "Environmental Science Pack",
    kind: "article",
    readMinutes: 12,
    summary: "An overview of renewable energy types, benefits, and real-world applications.",
    overview:
      "Renewable energy comes from natural sources that are constantly replenished, such as sunlight, wind, water, and geothermal heat. Unlike fossil fuels, renewable energy produces little to no greenhouse gas emissions, making it essential for a sustainable future.",
    highlight:
      "Renewable energy helps reduce greenhouse gas emissions and builds a cleaner, healthier planet.",
    sectionTitle: "Types of Renewable Energy",
    subsectionTitle: "Solar Energy",
    sectionBody:
      "Solar energy harnesses sunlight through photovoltaic (PV) panels or solar thermal systems. It can power homes, schools, and entire communities without burning fuel.",
    tags: "renewable energy wind introduction",
    image: wind,
  },
  {
    id: "solar-systems",
    title: "Solar Energy Systems",
    pack: "Technology Pack",
    kind: "article",
    readMinutes: 9,
    summary: "Learn how solar energy works, its components, and common uses in homes and industries.",
    overview:
      "Solar systems convert sunlight into electricity or heat. Panels, inverters, and batteries work together so power is available even after sunset.",
    highlight: "A rooftop array can cover a large share of a home’s daily electricity use.",
    sectionTitle: "How a solar system works",
    sectionBody:
      "Photovoltaic cells absorb photons and release electrons. An inverter turns that direct current into the alternating current used by household appliances.",
    tags: "renewable energy solar",
    image: solar,
  },
  {
    id: "wind-energy",
    title: "Wind Energy",
    pack: "Environmental Science Pack",
    kind: "article",
    readMinutes: 8,
    summary: "How wind turbines generate electricity and contribute to a cleaner future.",
    overview:
      "Wind turbines capture kinetic energy from moving air and turn it into electricity. Groups of turbines, called wind farms, can supply power to towns and cities.",
    highlight: "Wind is one of the fastest-growing sources of new electricity worldwide.",
    sectionTitle: "Inside a turbine",
    sectionBody:
      "Blades spin a rotor connected to a generator. Taller towers reach stronger, steadier winds and produce more energy from the same site.",
    tags: "renewable energy wind",
    image: wind,
  },
  {
    id: "hydro-power",
    title: "Hydroelectric Power",
    pack: "Environmental Science Pack",
    kind: "article",
    readMinutes: 10,
    summary: "How flowing water turns turbines and supplies steady electricity.",
    overview:
      "Hydroelectric plants use the movement of water to spin turbines. Dams store water so electricity can be generated when demand is high.",
    highlight: "Hydropower can provide steady electricity alongside sun and wind.",
    sectionTitle: "From river to grid",
    sectionBody:
      "Water released from a reservoir flows through a penstock, spins the turbine, and returns to the river downstream.",
    tags: "renewable energy hydro water",
    image: hydro,
  },
  {
    id: "field-notes",
    title: "Field Notes: Local Energy Use",
    pack: "Personal documents",
    kind: "document",
    readMinutes: 6,
    summary: "Imported notes on household energy use and simple ways to cut waste.",
    overview:
      "These notes collect everyday observations about lighting, cooking, and device charging, with ideas that do not depend on a constant connection.",
    highlight: "Small changes in daily use add up when they are tracked over a month.",
    sectionTitle: "What to record",
    sectionBody:
      "Note which devices stay on, when power is used most, and which tasks can shift to daylight hours.",
    tags: "notes document energy",
    image: earth,
  },
  {
    id: "science-pack",
    title: "Science & Nature",
    pack: "Knowledge Pack",
    kind: "pack",
    readMinutes: 0,
    summary: "Discover the wonders of our natural world, from ecosystems to space exploration.",
    overview:
      "This pack gathers articles on ecosystems, Earth systems, and space for offline reading.",
    highlight: "Download once, then read every article without a connection.",
    sectionTitle: "What is inside",
    sectionBody: "2,430 articles covering living systems, weather, energy, and the night sky.",
    tags: "science nature pack",
    image: earth,
  },
];

export function articleById(id: string) {
  return articles.find((article) => article.id === id);
}

export function kindLabel(kind: SearchKind) {
  if (kind === "article") return "Article";
  if (kind === "document") return "Document";
  return "Pack";
}
