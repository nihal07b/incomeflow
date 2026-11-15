
import { useState } from "react";
import SaathiMicrophone from "./SaathiMicrophone";
import { parseFinancialCommand } from "../ai/saathiParser";
import { useTransactions } from "../hooks/useData";
import {
    getTodayLocalDate,
    TRANSACTION_INCOME_CATEGORIES,
    TRANSACTION_EXPENSE_CATEGORIES,
    type TransactionRecord,
    type TransactionCategory,
    type PaymentMode,
} from "../services/storage";

type Draft = {
    id: string;
    type: "income" | "expense";
    amount: string;
    category: TransactionCategory;
    paymentMode: PaymentMode;
    description: string;
};

export default function SaathiAssistant() {
    const { addTransaction } = useTransactions();

    const [isOpen, setIsOpen] = useState(false);
    const [message, setMessage] = useState("");
    const [submitted, setSubmitted] = useState("");
    const [drafts, setDrafts] = useState<Draft[]>([]);
    const [warning, setWarning] = useState("");
    const [feedback, setFeedback] = useState("");
    const [saving, setSaving] = useState(false);

    function handleSend() {
        const text = message.trim();
        if (!text || saving) return;

        const parsed = parseFinancialCommand(text);

        const nextDrafts: Draft[] = parsed.actions
            .filter(
                (action) =>
                    action.type === "add_income" ||
                    action.type === "add_expense"
            )
            .map((action) => {
                const type =
                    action.type === "add_income" ? "income" : "expense";

                const description = String(
                    action.payload.description ?? text
                );

                const lower = description.toLowerCase();

                let category: TransactionCategory =
                    type === "income" ? "delivery earnings" : "other";

                if (type === "expense") {
                    if (/petrol|fuel|पेट्रोल|डीजल/.test(lower)) {
                        category = "fuel";
                    } else if (/food|chai|खाना|चाय/.test(lower)) {
                        category = "food";
                    } else if (/repair|service|मरम्मत/.test(lower)) {
                        category = "maintenance";
                    } else if (/rent|घर|किराया/.test(lower)) {
                        category = "household";
                    }
                }

                return {
                    id: action.id,
                    type,
                    amount: String(action.payload.amount ?? ""),
                    category,
                    paymentMode: "cash" as PaymentMode,
                    description,
                };
            });

        setSubmitted(text);
        setDrafts(nextDrafts);
        setMessage("");
        setFeedback("");

        const parts = text
            .split(/\s+(?:aur|and|और)\s+|[,;]/i)
            .map((part) => part.trim())
            .filter(Boolean);

        if (nextDrafts.length < parts.length) {
            setWarning(
                "Some parts could not be understood. Please review carefully. " +
                "Only the entries shown below will be saved."
            );
        } else {
            setWarning("");
        }
    }

    function updateDraft(
        id: string,
        changes: Partial<Draft>
    ) {
        setDrafts((previous) =>
            previous.map((draft) =>
                draft.id === id ? { ...draft, ...changes } : draft
            )
        );
    }

    function cancelDrafts() {
        setDrafts([]);
        setWarning("");
        setFeedback("Pending entries cancelled. Nothing was saved.");
    }

    async function confirmAndSave() {
        if (saving || drafts.length === 0) return;

        for (const draft of drafts) {
            const amount = Number(draft.amount);

            if (
                !Number.isFinite(amount) ||
                amount <= 0 ||
                !Number.isSafeInteger(Math.round(amount * 100)) ||
                !/^\d+(\.\d{1,2})?$/.test(draft.amount.trim())
            ) {
                setFeedback(
                    "Please enter a valid amount (up to 2 decimal places)."
                );
                return;
            }

            const validCategories: readonly string[] =
                draft.type === "income"
                    ? TRANSACTION_INCOME_CATEGORIES
                    : TRANSACTION_EXPENSE_CATEGORIES;

            if (!validCategories.includes(draft.category)) {
                setFeedback("Please select a valid category.");
                return;
            }
        }

        setSaving(true);
        setFeedback("");

        let savedCount = 0;

        try {
            for (const draft of drafts) {
                const record: TransactionRecord = {
                    id: crypto.randomUUID(),
                    profileId: "rider-default",
                    type: draft.type,
                    amountPaise: Math.round(Number(draft.amount) * 100),
                    date: getTodayLocalDate(),
                    category: draft.category,
                    paymentMode: draft.paymentMode,
                    description: draft.description.trim() || undefined,
                };

                await addTransaction(record);
                savedCount += 1;
            }

            setDrafts([]);
            setWarning("");
            setFeedback(
                `${savedCount} transaction(s) saved successfully! ` +
                "Check Income & Expenses."
            );
        } catch (error) {
            setDrafts((previous) => previous.slice(savedCount));
            setFeedback(
                `${savedCount} transaction(s) saved. ` +
                `Remaining entries were not saved: ${error instanceof Error ? error.message : "Unknown error"
                }`
            );
        } finally {
            setSaving(false);
        }
    }

    return (
        <>
            {!isOpen && (
                <button
                    type="button"
                    onClick={() => setIsOpen(true)}
                    aria-label="Open Saathi AI Assistant"
                    className="fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-2xl text-white shadow-xl hover:bg-blue-700"
                >
                    🤖
                </button>
            )}

            {isOpen && (
                <div className="fixed bottom-5 right-5 z-50 w-[min(420px,calc(100vw-40px))] rounded-2xl border border-gray-200 bg-white p-4 shadow-xl">
                    <div className="mb-3 flex items-center justify-between">
                        <h2 className="text-lg font-bold text-gray-900">
                            🤖 IncomeFlow Saathi AI
                        </h2>

                        <button
                            type="button"
                            onClick={() => setIsOpen(false)}
                            aria-label="Close assistant"
                            className="rounded-lg px-3 py-1 text-gray-600 hover:bg-gray-100"
                        >
                            ✕
                        </button>
                    </div>

                    <p className="mb-3 text-sm text-gray-500">
                        Aapka personal financial assistant
                    </p>

                    <div className="mb-4 max-h-80 min-h-28 space-y-3 overflow-y-auto rounded-xl bg-gray-50 p-3 text-sm text-gray-700">
                        {submitted ? (
                            <div>
                                <p className="font-semibold">You:</p>
                                <p className="mt-1 break-words">{submitted}</p>
                            </div>
                        ) : (
                            <p>
                                Namaste! Income aur expenses bolkar record karein.
                            </p>
                        )}

                        {warning && (
                            <p role="alert" className="rounded-lg bg-amber-50 p-2 text-amber-800">
                                ⚠️ {warning}
                            </p>
                        )}

                        {drafts.length > 0 && (
                            <div className="space-y-3">
                                <p className="font-semibold text-blue-700">
                                    Review before saving:
                                </p>

                                {drafts.map((draft) => {
                                    const categories =
                                        draft.type === "income"
                                            ? TRANSACTION_INCOME_CATEGORIES
                                            : TRANSACTION_EXPENSE_CATEGORIES;

                                    return (
                                        <div
                                            key={draft.id}
                                            className="space-y-2 rounded-lg border border-blue-100 bg-white p-3"
                                        >
                                            <p className="font-semibold">
                                                {draft.type === "income"
                                                    ? "💰 Income"
                                                    : "💸 Expense"}
                                            </p>

                                            <label className="block">
                                                Amount (₹)
                                                <input
                                                    type="number"
                                                    min="0.01"
                                                    step="0.01"
                                                    value={draft.amount}
                                                    onChange={(e) =>
                                                        updateDraft(draft.id, {
                                                            amount: e.target.value,
                                                        })
                                                    }
                                                    className="mt-1 w-full rounded-lg border p-2"
                                                />
                                            </label>

                                            <label className="block">
                                                Category
                                                <select
                                                    value={draft.category}
                                                    onChange={(e) =>
                                                        updateDraft(draft.id, {
                                                            category: e.target.value as TransactionCategory,
                                                        })
                                                    }
                                                    className="mt-1 w-full rounded-lg border p-2"
                                                >
                                                    {categories.map((category) => (
                                                        <option key={category} value={category}>
                                                            {category}
                                                        </option>
                                                    ))}
                                                </select>
                                            </label>

                                            <label className="block">
                                                Payment mode
                                                <select
                                                    value={draft.paymentMode}
                                                    onChange={(e) =>
                                                        updateDraft(draft.id, {
                                                            paymentMode: e.target.value as PaymentMode,
                                                        })
                                                    }
                                                    className="mt-1 w-full rounded-lg border p-2"
                                                >
                                                    <option value="cash">Cash</option>
                                                    <option value="digital">Digital / UPI</option>
                                                </select>
                                            </label>

                                            <label className="block">
                                                Description
                                                <input
                                                    type="text"
                                                    value={draft.description}
                                                    onChange={(e) =>
                                                        updateDraft(draft.id, {
                                                            description: e.target.value,
                                                        })
                                                    }
                                                    className="mt-1 w-full rounded-lg border p-2"
                                                />
                                            </label>
                                        </div>
                                    );
                                })}

                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        disabled={saving}
                                        onClick={cancelDrafts}
                                        className="flex-1 rounded-lg border px-3 py-2 disabled:opacity-50"
                                    >
                                        Cancel
                                    </button>

                                    <button
                                        type="button"
                                        disabled={saving}
                                        onClick={confirmAndSave}
                                        className="flex-1 rounded-lg bg-green-700 px-3 py-2 font-semibold text-white disabled:opacity-50"
                                    >
                                        {saving ? "Saving..." : "Confirm & Save"}
                                    </button>
                                </div>
                            </div>
                        )}

                        {feedback && (
                            <p role="status" className="rounded-lg bg-blue-50 p-2 text-blue-800">
                                {feedback}
                            </p>
                        )}
                    </div>

                    <div className="flex items-start gap-2">
                        <input
                            type="text"
                            value={message}
                            disabled={saving || drafts.length > 0}
                            onChange={(e) => setMessage(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") handleSend();
                            }}
                            placeholder="Type or speak..."
                            aria-label="Message to Saathi AI"
                            className="min-w-0 flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm"
                        />

                        <SaathiMicrophone
                            onTranscript={(text) => {
                                if (!saving && drafts.length === 0) {
                                    setMessage(text);
                                }
                            }}
                        />

                        <button
                            type="button"
                            disabled={saving || drafts.length > 0}
                            onClick={handleSend}
                            className="rounded-lg bg-blue-600 px-3 py-2 font-semibold text-white disabled:opacity-50"
                        >
                            Send
                        </button>
                    </div>

                    <p className="mt-3 text-xs text-gray-400">
                        🎤 Review recognized text and transaction details
                        before confirming.
                    </p>
                </div>
            )}
        </>
    );
}
