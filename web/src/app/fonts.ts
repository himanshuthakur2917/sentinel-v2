import localFont from "next/font/local";
import { Inter, Poppins } from "next/font/google";

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

export const grift = localFont({
  src: [
    {
      path: "../../public/fonts/grift-font-converted/grift-thin.woff2",
      weight: "100",
      style: "normal",
    },
    {
      path: "../../public/fonts/grift-font-converted/grift-thinitalic.woff2",
      weight: "100",
      style: "italic",
    },
    {
      path: "../../public/fonts/grift-font-converted/grift-extralight.woff2",
      weight: "200",
      style: "normal",
    },
    {
      path: "../../public/fonts/grift-font-converted/grift-extralightitalic.woff2",
      weight: "200",
      style: "italic",
    },
    {
      path: "../../public/fonts/grift-font-converted/grift-light.woff2",
      weight: "300",
      style: "normal",
    },
    {
      path: "../../public/fonts/grift-font-converted/grift-lightitalic.woff2",
      weight: "300",
      style: "italic",
    },
    {
      path: "../../public/fonts/grift-font-converted/grift-regular.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../../public/fonts/grift-font-converted/grift-italic.woff2",
      weight: "400",
      style: "italic",
    },
    {
      path: "../../public/fonts/grift-font-converted/grift-medium.woff2",
      weight: "500",
      style: "normal",
    },
    {
      path: "../../public/fonts/grift-font-converted/grift-mediumitalic.woff2",
      weight: "500",
      style: "italic",
    },
    {
      path: "../../public/fonts/grift-font-converted/grift-semibold.woff2",
      weight: "600",
      style: "normal",
    },
    {
      path: "../../public/fonts/grift-font-converted/grift-semibolditalic.woff2",
      weight: "600",
      style: "italic",
    },
    {
      path: "../../public/fonts/grift-font-converted/grift-bold.woff2",
      weight: "700",
      style: "normal",
    },
    {
      path: "../../public/fonts/grift-font-converted/grift-bolditalic.woff2",
      weight: "700",
      style: "italic",
    },
    {
      path: "../../public/fonts/grift-font-converted/grift-extrabold.woff2",
      weight: "800",
      style: "normal",
    },
    {
      path: "../../public/fonts/grift-font-converted/grift-extrabolditalic.woff2",
      weight: "800",
      style: "italic",
    },
    {
      path: "../../public/fonts/grift-font-converted/grift-black.woff2",
      weight: "900",
      style: "normal",
    },
    {
      path: "../../public/fonts/grift-font-converted/grift-blackitalic.woff2",
      weight: "900",
      style: "italic",
    },
  ],
  variable: "--font-grift",
  display: "swap",
});
