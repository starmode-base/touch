/**
 * Mutation error reporting
 *
 * TanStack DB rolls back optimistic state when a mutation handler fails, but
 * the transaction's `isPersisted.promise` rejects and must be handled to
 * avoid unhandled promise rejections.
 */

/**
 * Build a rejection handler that logs the error and notifies the user
 */
export function reportMutationError(message: string) {
  return (error: unknown) => {
    console.error(message, error);
    alert(message);
  };
}
