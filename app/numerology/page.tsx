"use client";

import Link from "next/link";
import { useMemo, useState, type CSSProperties } from "react";

import {
  fullReading,
  meaningOf,
  parseBirthDate,
  type Reading,
} from "@/lib/numerology";

/**
 * "Твій вихідний код" — a personal numerology reading, built the same way a
 * challenge run is: deterministic input in, a structured result out. The math
 * lives in @/lib/numerology; this page is only presentation.
 */

const CARD_ORDER: Array<{ key: keyof Reading; label: string; sub: string }> = [
  { key: "lifePath", label: "Життєвий шлях", sub: "хто ти по суті" },
  { key: "expression", label: "Число долі", sub: "що ти прийшов робити" },
  { key: "soulUrge", label: "Число душі", sub: "чого ти прагнеш всередині" },
  { key: "personality", label: "Персона", sub: "яким тебе бачать" },
  { key: "birthday", label: "День народження", sub: "твій вроджений дар" },
  { key: "personalYear", label: "Рік 2026", sub: "тема цього року" },
];

const cardStyle: CSSProperties = {
  border: "1px solid #2a2a3a",
  borderRadius: 12,
  padding: "1.1rem 1.25rem",
  background: "linear-gradient(160deg, #14141f, #0e0e16)",
};

const numberBadge: CSSProperties = {
  fontSize: "2.4rem",
  fontWeight: 700,
  lineHeight: 1,
  color: "#c9b3ff",
};

const keywordChip: CSSProperties = {
  display: "inline-block",
  fontSize: "0.72rem",
  padding: "0.15rem 0.5rem",
  marginRight: "0.35rem",
  marginTop: "0.35rem",
  borderRadius: 999,
  border: "1px solid #3a3a52",
  color: "#9a9ac0",
};

export default function NumerologyPage() {
  const [name, setName] = useState("Ivan Tatarchuk");
  const [dateInput, setDateInput] = useState("12.02.1994");

  const { reading, error } = useMemo(() => {
    try {
      const date = parseBirthDate(dateInput);
      return { reading: fullReading(name, date, 2026), error: null };
    } catch (e) {
      return { reading: null, error: e instanceof Error ? e.message : String(e) };
    }
  }, [name, dateInput]);

  return (
    <main
      style={{
        maxWidth: 760,
        margin: "2rem auto",
        padding: "0 1rem",
        fontFamily: "sans-serif",
        color: "#e6e6f0",
        background: "transparent",
      }}
    >
      <p style={{ fontSize: "0.85rem", color: "#8a8ab0" }}>
        <Link href="/" style={{ color: "#8a8ab0" }}>
          ← Arena
        </Link>
      </p>

      <h1 style={{ marginBottom: "0.25rem" }}>Твій вихідний код</h1>
      <p style={{ color: "#9a9ac0", marginTop: 0 }}>
        Якщо світ побудований з коду — ось твій. Ім'я + дата народження, зведені
        за піфагорійською нумерологією. Символічна мова для роздумів, не
        передбачення.
      </p>

      <div
        style={{
          display: "flex",
          gap: "0.75rem",
          flexWrap: "wrap",
          margin: "1.25rem 0",
        }}
      >
        <label style={{ flex: "1 1 260px", fontSize: "0.8rem", color: "#9a9ac0" }}>
          Ім'я (латиницею)
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={{
              display: "block",
              width: "100%",
              marginTop: 4,
              padding: "0.5rem 0.6rem",
              borderRadius: 8,
              border: "1px solid #3a3a52",
              background: "#0e0e16",
              color: "#e6e6f0",
            }}
          />
        </label>
        <label style={{ flex: "1 1 160px", fontSize: "0.8rem", color: "#9a9ac0" }}>
          Дата (ДД.ММ.РРРР)
          <input
            value={dateInput}
            onChange={(e) => setDateInput(e.target.value)}
            style={{
              display: "block",
              width: "100%",
              marginTop: 4,
              padding: "0.5rem 0.6rem",
              borderRadius: 8,
              border: "1px solid #3a3a52",
              background: "#0e0e16",
              color: "#e6e6f0",
            }}
          />
        </label>
      </div>

      {error && (
        <p style={{ color: "#ff8a8a" }}>Не вдалось прочитати дату: {error}</p>
      )}

      {reading && (
        <section
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "0.9rem",
          }}
        >
          {CARD_ORDER.map(({ key, label, sub }) => {
            const value = reading[key] as number;
            const meaning = meaningOf(value);
            return (
              <article key={key} style={cardStyle}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "baseline",
                    justifyContent: "space-between",
                  }}
                >
                  <span style={numberBadge}>{value}</span>
                  <span style={{ textAlign: "right", fontSize: "0.78rem", color: "#8a8ab0" }}>
                    {label}
                    <br />
                    <em style={{ color: "#6a6a90" }}>{sub}</em>
                  </span>
                </div>
                <h3 style={{ margin: "0.6rem 0 0.2rem", fontSize: "1rem" }}>
                  {meaning.title}
                </h3>
                <p style={{ margin: 0, fontSize: "0.85rem", color: "#b6b6d0", lineHeight: 1.5 }}>
                  {meaning.description}
                </p>
                <div>
                  {meaning.keywords.map((k) => (
                    <span key={k} style={keywordChip}>
                      {k}
                    </span>
                  ))}
                </div>
              </article>
            );
          })}
        </section>
      )}

      <p
        style={{
          marginTop: "2rem",
          fontSize: "0.8rem",
          color: "#6a6a90",
          borderTop: "1px solid #2a2a3a",
          paddingTop: "1rem",
        }}
      >
        Нумерологія — це дзеркало, а не карта. Рішення — за тобою.
      </p>
    </main>
  );
}
