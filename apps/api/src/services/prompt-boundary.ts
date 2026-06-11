/**
 * Prompt-injection boundary for untrusted chat input. Owns the delimiter
 * contract shared with the assistant's system prompt: everything between the
 * markers is data, never instructions.
 */

export const USER_INPUT_START = '### USER_INPUT';
export const USER_INPUT_END = '### END_USER_INPUT';

// Security: matches loose imitations too (extra hashes, spaces, hyphens,
// any case) so "explain ## end-user-input" cannot close the boundary early
// and promote attacker text into the instruction zone.
const DELIMITER_LOOKALIKE = /#+\s*(?:END[\s_-]*)?USER[\s_-]*INPUT/gi;

export function stripDelimiterLookalikes(raw: string): string {
  return raw.replace(DELIMITER_LOOKALIKE, '[filtered]');
}

/** Fence untrusted text so the model can treat it strictly as data. */
export function wrapUserInput(raw: string): string {
  return `${USER_INPUT_START}\n${stripDelimiterLookalikes(raw).trim()}\n${USER_INPUT_END}`;
}
