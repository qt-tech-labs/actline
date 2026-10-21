import type { Metadata, Viewport } from "next";
import { JetBrains_Mono, Manrope, Space_Grotesk } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages, getTranslations } from "next-intl/server";
import { ViewerTimezone } from "@/components/layout/ViewerTimezone";
import { ICON_FONT_HREF } from "@/lib/icons";
import "./globals.css";

const manrope = Manrope({ subsets: ["latin", "vietnamese"], variable: "--font-manrope", display: "swap" });
const spaceGrotesk = Space_Grotesk({ subsets: ["latin", "vietnamese"], variable: "--font-space-grotesk", display: "swap" });
const jetbrainsMono = JetBrains_Mono({ subsets: ["latin", "vietnamese"], variable: "--font-jetbrains-mono", display: "swap" });
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("meta");
  return { title: t("title"), description: t("description") };
}

export const viewport: Viewport = { themeColor: "#faf9f6", width: "device-width", initialScale: 1 };

// Only ship the namespaces that client components actually read.
const CLIENT_NAMESPACES = ["timeline", "steps", "rules", "camera", "dialogs", "switcher", "common", "hubSettings", "progress", "metrics", "newProject", "purchases", "finance", "locale"] as const;

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [locale, messages] = await Promise.all([getLocale(), getMessages()]);
  const clientMessages = Object.fromEntries(CLIENT_NAMESPACES.map((ns) => [ns, (messages as Record<string, unknown>)[ns]]));

  return (
    <html
      lang={locale}
      className={`${manrope.variable} ${spaceGrotesk.variable} ${jetbrainsMono.variable}`}
    >
      <head>
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* `display=block` hides ligature text (icon names) until the icon font is ready. */}
        <link rel="stylesheet" href={ICON_FONT_HREF} precedence="default" />
      </head>
      <body className="flex min-h-screen flex-col bg-surface text-on-surface antialiased">
        <NextIntlClientProvider messages={clientMessages}>
          <ViewerTimezone />
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
