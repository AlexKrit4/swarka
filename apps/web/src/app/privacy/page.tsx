import type { Metadata } from "next";
import Link from "next/link";
import { getSiteData } from "@/lib/api";
import { getPrivacyContent } from "@/lib/content";

export const metadata: Metadata = {
  title: "Политика конфиденциальности",
  robots: { index: false },
};

function renderPrivacyContent(text: string) {
  return text.split("\n\n").map((block, index) => {
    const trimmed = block.trim();
    if (!trimmed) return null;

    if (trimmed.startsWith("## ")) {
      return (
        <h2 key={index} className="text-xl font-semibold mt-6">
          {trimmed.slice(3)}
        </h2>
      );
    }

    if (trimmed.includes("\n- ")) {
      const [title, ...items] = trimmed.split("\n");
      return (
        <div key={index}>
          {title && <p className="mb-2">{title}</p>}
          <ul className="list-disc pl-6 space-y-1">
            {items
              .filter((line) => line.startsWith("- "))
              .map((line, itemIndex) => (
                <li key={itemIndex}>{line.slice(2)}</li>
              ))}
          </ul>
        </div>
      );
    }

    return (
      <p key={index} className="text-gray-700 leading-relaxed">
        {trimmed}
      </p>
    );
  });
}

export default async function PrivacyPage() {
  let content = "";
  try {
    const siteData = await getSiteData();
    content = getPrivacyContent(siteData.settings);
  } catch {
    const { DEFAULT_PRIVACY_CONTENT } = await import("@swarka/shared");
    content = DEFAULT_PRIVACY_CONTENT;
  }

  return (
    <main className="max-w-3xl mx-auto px-4 py-16 prose prose-gray">
      <h1 className="text-3xl font-bold mb-6">Политика конфиденциальности</h1>
      <p className="text-gray-600 mb-4">
        Дата публикации: {new Date().toLocaleDateString("ru-RU")}
      </p>
      <section className="space-y-4">{renderPrivacyContent(content)}</section>
      <Link href="/" className="inline-block mt-8 text-sm font-semibold underline">
        ← На главную
      </Link>
    </main>
  );
}
