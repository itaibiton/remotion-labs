import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "RemotionLabs - AI-Powered Motion Graphics from Text",
  description: "Create stunning animated videos from text prompts. No coding or motion design skills required. Built on Remotion + Claude AI.",
  openGraph: {
    title: "RemotionLabs - AI-Powered Motion Graphics",
    description: "From prompt to professional motion graphics in seconds.",
    type: "website",
  },
};

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
