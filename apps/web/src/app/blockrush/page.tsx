import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "BlockRush — скачать игру для Android",
  description:
    "Установите BlockRush — тактильную головоломку с блоками для Android.",
};

const APK_URL = "/downloads/blockrush.apk";

function BlockMark({ className = "" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      viewBox="0 0 96 96"
      fill="none"
    >
      <rect width="96" height="96" rx="27" fill="#C96B4B" />
      <g fill="#FFF8F0">
        <rect x="22" y="22" width="15" height="15" rx="4" />
        <rect x="41" y="22" width="15" height="15" rx="4" />
        <rect x="60" y="22" width="15" height="15" rx="4" opacity=".45" />
        <rect x="22" y="41" width="15" height="15" rx="4" opacity=".45" />
        <rect x="41" y="41" width="15" height="15" rx="4" />
        <rect x="60" y="41" width="15" height="15" rx="4" />
        <rect x="22" y="60" width="15" height="15" rx="4" />
        <rect x="41" y="60" width="15" height="15" rx="4" />
        <rect x="60" y="60" width="15" height="15" rx="4" />
      </g>
    </svg>
  );
}

function MiniBoard() {
  const colors = [
    "#E8E0D4",
    "#C96B4B",
    "#719379",
    "#D5A33E",
    "#6F8FA8",
    "#B96862",
  ];
  const filled = new Map([
    [7, 1],
    [8, 1],
    [9, 1],
    [13, 2],
    [14, 2],
    [19, 1],
    [23, 2],
    [27, 4],
    [28, 4],
    [29, 4],
    [33, 3],
    [34, 3],
    [37, 4],
    [43, 3],
    [44, 3],
    [48, 5],
    [49, 5],
    [54, 3],
    [58, 5],
  ]);

  return (
    <div className="grid aspect-square w-full grid-cols-6 gap-1.5 rounded-[26px] border border-[#cbbdad] bg-[#d9cebf] p-3 shadow-[inset_0_2px_5px_rgba(64,48,37,.12),0_28px_60px_rgba(73,50,37,.18)]">
      {Array.from({ length: 36 }, (_, index) => (
        <span
          key={index}
          className="rounded-[6px] shadow-[inset_0_1px_0_rgba(255,255,255,.38)]"
          style={{ backgroundColor: colors[filled.get(index) ?? 0] }}
        />
      ))}
    </div>
  );
}

export default function BlockRushDownloadPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#f6f1ea] text-[#241f1a]">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[.055]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 180 180' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.88' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}
      />

      <div className="relative mx-auto flex min-h-screen max-w-6xl flex-col px-5 pb-8 pt-5 sm:px-8 lg:px-12">
        <header className="flex items-center justify-between">
          <a
            href="/blockrush"
            className="flex items-center gap-3"
            aria-label="BlockRush"
          >
            <BlockMark className="h-11 w-11 drop-shadow-[0_8px_12px_rgba(129,61,37,.22)]" />
            <span className="font-display text-sm font-bold tracking-[.18em] sm:text-base">
              BLOCKRUSH
            </span>
          </a>
          <span className="rounded-full border border-[#cfc2b3] bg-white/50 px-4 py-2 text-[10px] font-extrabold tracking-[.16em] text-[#6d645c]">
            ANDROID · v1.0
          </span>
        </header>

        <section className="grid flex-1 items-center gap-12 py-12 lg:grid-cols-[1.04fr_.96fr] lg:py-8">
          <div className="max-w-2xl">
            <p className="mb-5 flex items-center gap-3 text-xs font-extrabold uppercase tracking-[.22em] text-[#a75337]">
              <span className="h-px w-9 bg-[#c96b4b]" />
              Нативная игра для Android
            </p>
            <h1 className="font-display text-[clamp(2.75rem,8vw,6.7rem)] font-bold leading-[.9] tracking-[-.055em]">
              Собирай.
              <br />
              Очищай.
              <br />
              <span className="text-[#c96b4b]">Ускоряйся.</span>
            </h1>
            <p className="mt-7 max-w-xl text-base leading-7 text-[#665e56] sm:text-lg">
              Спокойная головоломка с физически приятными блоками, сериями
              комбо и без рекламы. Работает офлайн.
            </p>

            <div className="mt-9 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
              <a
                href={APK_URL}
                download="BlockRush-1.0.apk"
                className="group inline-flex min-h-14 items-center justify-center gap-3 rounded-2xl bg-[#24201c] px-7 py-4 text-sm font-extrabold text-[#fffaf4] shadow-[0_16px_35px_rgba(36,32,28,.24)] transition hover:-translate-y-0.5 hover:bg-[#c96b4b]"
              >
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M12 3v12m0 0 5-5m-5 5-5-5M5 21h14" />
                </svg>
                Скачать APK · 47 МБ
              </a>
              <span className="text-center text-xs leading-5 text-[#81776e] sm:text-left">
                Android 7.0+
                <br />
                Установка напрямую
              </span>
            </div>

            <div className="mt-10 grid max-w-lg grid-cols-3 border-y border-[#d8ccbd] py-5">
              {[
                ["10 × 10", "поле"],
                ["14", "фигур"],
                ["OFFLINE", "без сети"],
              ].map(([value, label]) => (
                <div key={value} className="border-r border-[#d8ccbd] px-3 first:pl-0 last:border-0">
                  <p className="font-display text-lg font-bold">{value}</p>
                  <p className="mt-1 text-[10px] font-bold uppercase tracking-[.16em] text-[#8a7f75]">
                    {label}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-[430px]">
            <div className="absolute -left-8 top-16 h-28 w-28 rounded-full bg-[#d5a33e]/20 blur-3xl" />
            <div className="absolute -right-8 bottom-16 h-36 w-36 rounded-full bg-[#719379]/20 blur-3xl" />
            <div className="relative rotate-[1.5deg] rounded-[42px] border border-[#cfc1b1] bg-[#fffaf4] p-5 shadow-[0_35px_90px_rgba(64,45,33,.18)]">
              <div className="mb-5 flex items-center justify-between px-1">
                <div>
                  <p className="text-[9px] font-extrabold tracking-[.18em] text-[#90857b]">
                    SCORE
                  </p>
                  <p className="font-display text-3xl font-bold">2 480</p>
                </div>
                <div className="rounded-full bg-[#d5a33e]/15 px-4 py-2 text-xs font-extrabold text-[#a66d00]">
                  COMBO ×4
                </div>
              </div>
              <MiniBoard />
              <div className="mt-5 flex items-end justify-around rounded-3xl bg-[#f1e8dc] px-4 py-5">
                {[
                  [3, "#C96B4B"],
                  [4, "#719379"],
                  [5, "#6F8FA8"],
                ].map(([count, color], group) => (
                  <div key={group} className="grid grid-cols-3 gap-1">
                    {Array.from({ length: Number(count) }, (_, index) => (
                      <span
                        key={index}
                        className="h-4 w-4 rounded-[4px]"
                        style={{ backgroundColor: String(color) }}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <footer className="flex flex-col gap-2 border-t border-[#d8ccbd] pt-5 text-xs text-[#81776e] sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 BlockRush. Собрано для коротких умных пауз.</p>
          <p>APK устанавливается только на Android.</p>
        </footer>
      </div>
    </main>
  );
}
