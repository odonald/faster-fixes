import { APP_URL } from "@/app/_constants/app";
import { SITE_META_DESCRIPTION, SITE_NAME } from "@/app/_constants/seo";
import { TRPCProviderWrapper as TRPCProvider } from "@/lib/trpc/trpc-provider";
import { FeedbackProvider } from "@fasterfixes/react";
import { isCloud } from "@/utils/environment/env";
import { Analytics } from "@vercel/analytics/next";
import "@workspace/ui/globals.css";
import { RootProvider } from "fumadocs-ui/provider/next";
import type { Metadata } from "next";
import { ThemeProvider } from "next-themes";
import { JetBrains_Mono, Space_Grotesk } from "next/font/google";
import Script from "next/script";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { Toaster } from "sonner";
import { StopImpersonateButton } from "./_features/auth/stop-impersonate-button/stop-impersonate-button.client";
import { ConsentProvider } from "./_features/c15t/consent-provider";

const fontSans = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-sans",
});

const fontMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

const umamiScriptUrl = process.env.NEXT_PUBLIC_UMAMI_SCRIPT_URL;
const umamiWebsiteId = process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID;

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: SITE_NAME,
    template: `%s - ${SITE_NAME}`,
  },
  description: SITE_META_DESCRIPTION,
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
  },
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className="scroll-smooth"
      data-scroll-behavior="smooth"
    >
      <body
        className={`${fontSans.variable} ${fontMono.variable} flex min-h-screen flex-col font-sans antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
          enableColorScheme
        >
          <ConsentProvider>
            <TRPCProvider>
              <NuqsAdapter>
                <StopImpersonateButton />

                <FeedbackProvider
                  projectId={process.env.NEXT_PUBLIC_FF_API_KEY ?? ""}
                  apiOrigin={process.env.NEXT_PUBLIC_FF_API_ORIGIN}
                  classNames={{
                    button:
                      "bg-primary text-primary-foreground hover:bg-primary/90",
                  }}
                  position="bottom-right"
                  captureDiagnostics={true}
                >
                  <RootProvider>{children}</RootProvider>
                </FeedbackProvider>

                <Toaster />
              </NuqsAdapter>
            </TRPCProvider>
          </ConsentProvider>
        </ThemeProvider>

        {/* Vercel Analytics is only meaningful on the hosted cloud deployment. */}
        {isCloud() && <Analytics />}
        {/* Optional Umami – point it at your own instance. Nothing is loaded when unset. */}
        {umamiScriptUrl && umamiWebsiteId && (
          <Script
            defer
            src={umamiScriptUrl}
            data-website-id={umamiWebsiteId}
            strategy="afterInteractive"
          />
        )}
      </body>
    </html>
  );
}
