"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

type GalleryImage = { id?: string; url: string; altText?: string | null };

export function ListingGallery({ images, title }: { images: GalleryImage[]; title: string }) {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const count = images.length;

  // Auto-advance with a crossfade; pause on hover/focus or when there's one image.
  useEffect(() => {
    if (count <= 1 || paused) return;
    timer.current = setInterval(() => {
      setActive((i) => (i + 1) % count);
    }, 3500);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [count, paused]);

  if (count === 0) return null;

  return (
    <div>
      <div
        className="group relative aspect-square overflow-hidden rounded-3xl bg-white ring-1 ring-zinc-200"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onFocus={() => setPaused(true)}
        onBlur={() => setPaused(false)}
        tabIndex={0}
        role="region"
        aria-label={`${title} image gallery`}
      >
        {images.map((img, i) => (
          <Image
            key={img.id ?? img.url}
            src={img.url}
            alt={img.altText ?? title}
            fill
            sizes="(max-width: 1024px) 100vw, 60vw"
            priority={i === 0}
            className={`object-cover transition-opacity duration-700 ease-in-out ${i === active ? "opacity-100" : "opacity-0"}`}
          />
        ))}

        {count > 1 && (
          <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
            {images.map((img, i) => (
              <button
                key={img.id ?? img.url}
                onClick={() => setActive(i)}
                aria-label={`Show image ${i + 1}`}
                className={`h-1.5 rounded-full transition-all ${i === active ? "w-6 bg-white" : "w-1.5 bg-white/60 hover:bg-white"}`}
              />
            ))}
          </div>
        )}
      </div>

      {count > 1 && (
        <div className="mt-4 grid grid-cols-5 gap-3">
          {images.map((img, i) => (
            <button
              key={img.id ?? img.url}
              onClick={() => setActive(i)}
              onMouseEnter={() => setActive(i)}
              className={`relative aspect-square overflow-hidden rounded-xl ring-2 transition ${i === active ? "ring-brand" : "ring-transparent hover:ring-zinc-300"}`}
              aria-label={`Image ${i + 1}`}
            >
              <Image src={img.url} alt={img.altText ?? title} fill sizes="20vw" className="object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
