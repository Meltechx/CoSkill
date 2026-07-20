export type Hackathon = {
  id: string;
  name: string;
  platform: string;
  prize: string;
  themes: string[];
  link: string;
  format: "Online" | "Hybrid";
  location?: string;
  description: string;
  registration: string;
  start: string;
  end: string;
};

export const hackathons: Hackathon[] = [
  {
    id: "openai-build-week",
    name: "OpenAI Build Week",
    platform: "Devpost",
    prize: "$15,000",
    themes: ["AI", "Productivity", "Education"],
    link: "https://openai.devpost.com",
    format: "Online",
    description: "Build with GPT-5.6 and Codex to compete for prizes across apps for life, work and productivity, developer tools, and education.",
    registration: "July 9, 2026",
    start: "July 13, 2026",
    end: "July 21, 2026 · 5:00 PM PDT",
  },
  {
    id: "bolt-worlds-largest-hackathon",
    name: "Bolt.new World's Largest Hackathon",
    platform: "Devpost",
    prize: "$1,000,000",
    themes: ["Web Development", "AI"],
    link: "https://boltnewhackathon.devpost.com",
    format: "Online",
    description: "Build and ship ambitious web products with Bolt.new in a global online hackathon with a million-dollar prize pool.",
    registration: "See event page",
    start: "See event page",
    end: "See event page",
  },
  {
    id: "google-ai-hackathon",
    name: "Google AI Hackathon",
    platform: "Devpost",
    prize: "Prizes announced on event page",
    themes: ["AI", "Machine Learning"],
    link: "https://devpost.com/hackathons",
    format: "Online",
    description: "An online AI and machine-learning building challenge for developers creating practical, production-minded experiences.",
    registration: "See event page",
    start: "See event page",
    end: "See event page",
  },
  {
    id: "ethglobal-brussels",
    name: "ETHGlobal Brussels",
    platform: "ETHGlobal",
    prize: "Prizes announced on event page",
    themes: ["Web3", "Blockchain"],
    link: "https://ethglobal.com/events/brussels",
    format: "Hybrid",
    location: "Brussels, Belgium",
    description: "Collaborate with builders from the Ethereum ecosystem on open-source infrastructure, protocols, and decentralized applications.",
    registration: "See event page",
    start: "See event page",
    end: "See event page",
  },
  {
    id: "prometheus-july-ai-challenge",
    name: "Prometheus July AI Challenge",
    platform: "Devpost",
    prize: "$1,500+",
    themes: ["Machine Learning", "AI", "Education"],
    link: "https://prometheus-july-ai-challenge.devpost.com",
    format: "Online",
    description: "Create an educational tool that applies AI or machine learning to make learning more accessible, engaging, or personalized.",
    registration: "Open now",
    start: "July 1, 2026",
    end: "July 30, 2026 · 11:45 PM EDT",
  },
  {
    id: "blueprint-hackathon",
    name: "The Blueprint Hackathon",
    platform: "Devpost",
    prize: "$8,176",
    themes: ["Education", "Open Ended", "Web"],
    link: "https://the-blueprint-hackathon.devpost.com",
    format: "Online",
    description: "A two-week open build event for projects that solve real-world problems, with an emphasis on useful and demonstrable software.",
    registration: "Open now",
    start: "July 17, 2026",
    end: "July 31, 2026 · 5:00 PM EDT",
  },
  {
    id: "hack-the-limit",
    name: "Hack The Limit",
    platform: "Devpost",
    prize: "$350",
    themes: ["Productivity", "Social Good", "Open Ended"],
    link: "https://devpost.com/submit-to/30472-hack-the-limit/manage/submissions",
    format: "Online",
    description: "A public online event for teams pushing useful productivity and social-impact ideas from concept to working prototype.",
    registration: "Open now",
    start: "Open now",
    end: "July 29, 2026 · 11:45 PM PDT",
  },
  {
    id: "revenuecat-shipaton",
    name: "RevenueCat Shipaton 2026",
    platform: "Devpost",
    prize: "$490,000",
    themes: ["Mobile", "Design", "Gaming"],
    link: "https://devpost.com/submit-to/29969-revenuecat-shipaton-2026/manage/submissions",
    format: "Online",
    description: "Ship a polished mobile experience and compete for a major prize pool in RevenueCat's extended online build event.",
    registration: "Open now",
    start: "July 31, 2026",
    end: "September 30, 2026",
  },
];

export const getHackathon = (id: string) => hackathons.find((hackathon) => hackathon.id === id);
