/**
 * Pythagorean numerology, expressed as pure functions.
 *
 * This is a symbolic system, not a scientific one: the numbers are a lens for
 * reflection, not a prediction. Everything here is deterministic and testable —
 * given the same name and date you always get the same reading — so the
 * "meaning" layer stays cleanly separated from the arithmetic.
 */

/** The three "master numbers" that are conventionally left un-reduced. */
const MASTER_NUMBERS = new Set([11, 22, 33]);

/**
 * Repeatedly sum a number's digits until it collapses to a single digit,
 * stopping early on a master number (11, 22, 33) unless `keepMasters` is off.
 * Negative inputs are treated by magnitude.
 */
export function reduceNumber(n: number, keepMasters = true): number {
  let value = Math.abs(Math.trunc(n));

  while (value > 9 && !(keepMasters && MASTER_NUMBERS.has(value))) {
    let sum = 0;
    for (let v = value; v > 0; v = Math.floor(v / 10)) {
      sum += v % 10;
    }
    value = sum;
  }

  return value;
}

/** A calendar date, kept as plain fields to avoid timezone surprises. */
export interface BirthDate {
  day: number;
  month: number;
  year: number;
}

/**
 * Parses "DD.MM.YYYY" (the format Ivan wrote his date in) into a BirthDate.
 * Throws on anything that isn't a real calendar date so bad input fails loudly
 * instead of silently producing a nonsense reading.
 */
export function parseBirthDate(input: string): BirthDate {
  const match = /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/.exec(input.trim());
  if (!match) {
    throw new Error(`Expected date as DD.MM.YYYY, got: ${input}`);
  }

  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);

  const asDate = new Date(year, month - 1, day);
  const isReal =
    asDate.getFullYear() === year &&
    asDate.getMonth() === month - 1 &&
    asDate.getDate() === day;
  if (!isReal) {
    throw new Error(`Not a real calendar date: ${input}`);
  }

  return { day, month, year };
}

/**
 * Life Path: reduce month, day and year *separately* and then reduce their
 * sum. Reducing the components first (rather than adding every raw digit) is
 * the method that correctly preserves master numbers, and is the one most
 * numerologists use.
 */
export function lifePathNumber(date: BirthDate): number {
  const parts =
    reduceNumber(date.month) + reduceNumber(date.day) + reduceNumber(date.year);
  return reduceNumber(parts);
}

/** Birthday number: the day of the month, reduced. */
export function birthdayNumber(date: BirthDate): number {
  return reduceNumber(date.day);
}

/**
 * Personal Year for a given calendar year: birth month + birth day + that
 * year, each reduced then summed and reduced again. A running "chapter number"
 * for the year you're living in.
 */
export function personalYearNumber(date: BirthDate, year: number): number {
  const parts =
    reduceNumber(date.month) + reduceNumber(date.day) + reduceNumber(year);
  return reduceNumber(parts);
}

/** Pythagorean letter values: A–I = 1–9, J–R = 1–9, S–Z = 1–8. */
const LETTER_VALUES: Record<string, number> = {
  a: 1, b: 2, c: 3, d: 4, e: 5, f: 6, g: 7, h: 8, i: 9,
  j: 1, k: 2, l: 3, m: 4, n: 5, o: 6, p: 7, q: 8, r: 9,
  s: 1, t: 2, u: 3, v: 4, w: 5, x: 6, y: 7, z: 8,
};

const VOWELS = new Set(["a", "e", "i", "o", "u"]);

/**
 * Numeric value of a single character, or 0 if it isn't an A–Z letter.
 * Non-Latin letters (e.g. Cyrillic) return 0 — transliterate the name first.
 */
export function letterValue(ch: string): number {
  return LETTER_VALUES[ch.toLowerCase()] ?? 0;
}

type LetterFilter = "all" | "vowels" | "consonants";

function sumName(name: string, filter: LetterFilter): number {
  let sum = 0;
  for (const ch of name) {
    const lower = ch.toLowerCase();
    const value = LETTER_VALUES[lower];
    if (value === undefined) continue;
    const isVowel = VOWELS.has(lower);
    if (filter === "vowels" && !isVowel) continue;
    if (filter === "consonants" && isVowel) continue;
    sum += value;
  }
  return reduceNumber(sum);
}

/** Expression / Destiny number: every letter of the full name. */
export function expressionNumber(name: string): number {
  return sumName(name, "all");
}

/** Soul Urge / Heart's Desire: the vowels of the full name. */
export function soulUrgeNumber(name: string): number {
  return sumName(name, "vowels");
}

/** Personality number: the consonants of the full name. */
export function personalityNumber(name: string): number {
  return sumName(name, "consonants");
}

export interface Reading {
  name: string;
  date: BirthDate;
  year: number;
  lifePath: number;
  birthday: number;
  expression: number;
  soulUrge: number;
  personality: number;
  personalYear: number;
}

/** Computes every core number for one person in one call. */
export function fullReading(name: string, date: BirthDate, year: number): Reading {
  return {
    name,
    date,
    year,
    lifePath: lifePathNumber(date),
    birthday: birthdayNumber(date),
    expression: expressionNumber(name),
    soulUrge: soulUrgeNumber(name),
    personality: personalityNumber(name),
    personalYear: personalYearNumber(date, year),
  };
}

export interface NumberMeaning {
  title: string;
  keywords: string[];
  description: string;
}

/**
 * Symbolic meanings for each reduced number, including the three master
 * numbers. Deliberately data, not logic: swap the copy without touching the
 * math. Written in Ukrainian because this reading is for Ivan.
 */
export const NUMBER_MEANINGS: Record<number, NumberMeaning> = {
  1: {
    title: "Піонер",
    keywords: ["ініціатива", "незалежність", "лідерство", "початок"],
    description:
      "Той, хто починає з нуля і йде першим. Сила волі та самостійність — ваш капітал; ризик — упертість і небажання просити про допомогу.",
  },
  2: {
    title: "Дипломат",
    keywords: ["партнерство", "чутливість", "баланс", "терпіння"],
    description:
      "Сила у співпраці, інтуїції та вмінні з'єднувати людей. Ростете не наодинці, а поруч із кимось.",
  },
  3: {
    title: "Творець",
    keywords: ["вираження", "творчість", "комунікація", "радість"],
    description:
      "Ідеї, слова, образи — ваша природна мова. Небезпека — розпорошеність; сила — коли доводите творче до кінця.",
  },
  4: {
    title: "Будівничий",
    keywords: ["структура", "праця", "надійність", "система"],
    description:
      "Ви будуєте фундаменти, які тримають. Дисципліна і порядок перетворюють хаос на систему.",
  },
  5: {
    title: "Дослідник",
    keywords: ["свобода", "зміни", "адаптивність", "підприємництво"],
    description:
      "Рух, різноманіття, нові землі та нові справи. Ви процвітаєте у змінах і задихаєтесь у рутині — реінвенція для вас природна.",
  },
  6: {
    title: "Опікун",
    keywords: ["відповідальність", "дім", "служіння", "гармонія"],
    description:
      "Рік і роль відбудови: сім'я, спільнота, зцілення того, що надламалось. Ви даєте опору іншим — навчіться приймати її й для себе.",
  },
  7: {
    title: "Мислитель",
    keywords: ["аналіз", "глибина", "духовність", "самотність"],
    description:
      "Пошук істини під поверхнею. Час усамітнення, навчання й внутрішньої роботи, а не гучних результатів.",
  },
  8: {
    title: "Керманич",
    keywords: ["влада", "бізнес", "матеріальне", "масштаб"],
    description:
      "Гроші, авторитет, керування ресурсами. Обличчя власника й управлінця — сила, коли служить меті, а не лише собі.",
  },
  9: {
    title: "Гуманіст",
    keywords: ["завершення", "співчуття", "мудрість", "віддача"],
    description:
      "Закриття циклів і служіння більшому за себе. Відпускаєте старе, щоб звільнити місце новому.",
  },
  11: {
    title: "Провидець (майстер-число)",
    keywords: ["інтуїція", "натхнення", "видіння", "чутливість"],
    description:
      "Підвищена інтуїція та здатність надихати. Живете між ідеалом і реальністю — місія в тому, щоб приземляти видіння.",
  },
  22: {
    title: "Майстер-будівничий (майстер-число)",
    keywords: ["велика ціль", "втілення", "масштаб", "спадок"],
    description:
      "Поєднання мрії візіонера з руками будівничого: перетворювати великі задуми на реальні структури.",
  },
  33: {
    title: "Майстер-учитель (майстер-число)",
    keywords: ["служіння", "зцілення", "любов", "наставництво"],
    description:
      "Найвища нота служіння: піднімати інших власним прикладом і турботою.",
  },
};

/** Convenience: the meaning for a number, or a safe fallback. */
export function meaningOf(n: number): NumberMeaning {
  return (
    NUMBER_MEANINGS[n] ?? {
      title: `Число ${n}`,
      keywords: [],
      description: "",
    }
  );
}
