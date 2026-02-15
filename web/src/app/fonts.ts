import { Bruno_Ace_SC, Inter, Poppins } from "next/font/google";

// Body font - clean, readable, perfect for UI
export const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

// Heading font - modern, friendly personality
export const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-poppins",
  display: "swap",
});

export const brunoAce = Bruno_Ace_SC({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-bruno-ace",
  display: "swap",
});
