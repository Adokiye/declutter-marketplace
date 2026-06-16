import type { Metadata } from "next";
import type { CSSProperties, ReactNode } from "react";
import localFont from "next/font/local";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import { getActiveTheme, themeCssVars } from "@/lib/theme";

const satoshi = localFont({
  src: [
    {
      path: "./fonts/satoshi/satoshi-light.woff2",
      weight: "300",
      style: "normal"
    },
    {
      path: "./fonts/satoshi/satoshi-regular.woff2",
      weight: "400",
      style: "normal"
    },
    {
      path: "./fonts/satoshi/satoshi-medium.woff2",
      weight: "500",
      style: "normal"
    },
    {
      path: "./fonts/satoshi/satoshi-bold.woff2",
      weight: "700",
      style: "normal"
    },
    {
      path: "./fonts/satoshi/satoshi-black.woff2",
      weight: "900",
      style: "normal"
    }
  ],
  display: "swap",
  variable: "--font-satoshi"
});

export const metadata: Metadata = {
  title: "Declutter",
  description: "Peer-to-peer marketplace for used items in Lagos."
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  const theme = getActiveTheme();
  return (
    <html lang="en" data-theme={theme}>
      <body
        className={`${satoshi.variable} font-sans antialiased`}
        style={themeCssVars(theme) as CSSProperties}
      >
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
