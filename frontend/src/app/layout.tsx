import type { Metadata } from "next";
import { Be_Vietnam_Pro, Fraunces } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale } from "next-intl/server";
import { DialogProvider } from "@/components/DialogProvider";
import { Header } from "@/components/Header";
import { LessonNotifications } from "@/components/LessonNotifications";
import { StorageNotice } from "@/components/StorageNotice";
import { themeInitScript } from "@/lib/theme";
import "./globals.css";

// Be Vietnam Pro: thân chữ thân thiện, đủ dấu tiếng Việt. Fraunces: tiêu đề có nét mềm, ấm.
const body = Be_Vietnam_Pro({
  variable: "--font-body",
  subsets: ["latin", "latin-ext", "vietnamese"],
  weight: ["400", "500", "600"],
});

const heading = Fraunces({
  variable: "--font-heading",
  subsets: ["latin", "latin-ext", "vietnamese"],
});

export const metadata: Metadata = {
  title: "Fluentia",
  description: "Luyện tiếng Anh: Dictation và Shadowing",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const locale = await getLocale();
  return (
    <html lang={locale} suppressHydrationWarning className={`${body.variable} ${heading.variable} h-full antialiased`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-full flex flex-col">
        <NextIntlClientProvider>
          <DialogProvider>
            <Header />
            <StorageNotice />
            <LessonNotifications />
            {children}
          </DialogProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
