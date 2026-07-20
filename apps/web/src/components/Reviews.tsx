"use client";

import type { Review } from "@/lib/types";
import { SectionHeading } from "./SectionHeading";
import { Stagger } from "./Stagger";

interface ReviewsProps {
  reviews: Review[];
}

export function Reviews({ reviews }: ReviewsProps) {
  if (!reviews.length) return null;

  return (
    <section className="py-20 lg:py-28 bg-paper-deep metal-grid">
      <div className="max-w-7xl mx-auto px-4 lg:px-8">
        <SectionHeading eyebrow="Отзывы" title="Клиенты о нас" align="center" />
        <Stagger className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {reviews.map((review) => (
            <article
              key={review.id}
              data-stagger-item
              className="opacity-0 surface-card p-6 lg:p-7 relative"
            >
              <span className="font-display text-5xl text-accent/20 absolute top-4 right-5 leading-none">
                “
              </span>
              <div className="flex gap-1 mb-4">
                {Array.from({ length: Math.min(review.rating, 5) }).map((_, i) => (
                  <span key={i} className="text-accent text-sm">
                    ★
                  </span>
                ))}
              </div>
              <p className="text-ink/80 mb-6 leading-relaxed relative z-[1]">
                {review.text}
              </p>
              <p className="font-display text-sm font-medium text-ink">{review.authorName}</p>
            </article>
          ))}
        </Stagger>
      </div>
    </section>
  );
}
