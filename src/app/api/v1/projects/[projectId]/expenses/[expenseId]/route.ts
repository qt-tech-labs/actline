import { route, uuid } from "@/server/api";
import { removeExpense } from "@/server/services/mutations";

/** Removes an entry from the money log. */
export const DELETE = route<{ projectId: string; expenseId: string }>(async ({ user, params }) =>
  removeExpense(user.id, uuid.parse(params.expenseId)),
);
