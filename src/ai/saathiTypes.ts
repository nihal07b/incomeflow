
export type SaathiActionType =
    | "add_income"
    | "add_expense"
    | "create_udhaar"
    | "record_repayment"
    | "create_bill"
    | "create_savings_goal"
    | "add_savings"
    | "ask_analytics";

export interface SaathiAction {
    id: string;
    type: SaathiActionType;
    payload: Record<string, unknown>;
}

export interface SaathiResponse {
    originalText: string;
    actions: SaathiAction[];
    requiresConfirmation: boolean;
}
