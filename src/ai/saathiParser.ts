
import type {
    SaathiAction,
    SaathiResponse,
} from "./saathiTypes";

const incomeWords = [
    "kamaye", "kamai", "earned", "income",
    "earning", "कमाए", "कमाई", "कमाया",
];

const expenseWords = [
    "kharch", "spent", "expense", "petrol",
    "fuel", "खर्च", "पेट्रोल",
];

function containsAny(text: string, words: string[]): boolean {
    return words.some((word) => text.includes(word));
}

function extractAmount(text: string): number | null {
    const match = text.match(
        /(?:₹|rs\.?|inr)?\s*(\d+(?:,\d{3})*(?:\.\d{1,2})?)\s*(?:rupaye|rupees|रुपये|रुपए)?/i
    );

    if (!match) return null;

    const amount = Number(match[1].replace(/,/g, ""));

    return Number.isFinite(amount) && amount > 0
        ? amount
        : null;
}

function splitCommands(text: string): string[] {
    return text
        .split(/\s+(?:aur|and|और)\s+|[,;]/i)
        .map((part) => part.trim())
        .filter(Boolean);
}

export function parseFinancialCommand(
    originalText: string
): SaathiResponse {
    const parts = splitCommands(originalText);
    const actions: SaathiAction[] = [];

    for (const part of parts) {
        const text = part.toLowerCase();
        const amount = extractAmount(text);

        if (amount === null) continue;

        const isIncome = containsAny(text, incomeWords);
        const isExpense = containsAny(text, expenseWords);

        // Reject ambiguous clauses instead of guessing.
        if (isIncome === isExpense) continue;

        actions.push({
            id: crypto.randomUUID(),
            type: isIncome ? "add_income" : "add_expense",
            payload: {
                amount,
                description: part,
            },
        });
    }

    return {
        originalText,
        actions,
        requiresConfirmation: actions.length > 0,
    };
}
