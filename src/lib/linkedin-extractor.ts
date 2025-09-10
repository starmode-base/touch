export const linkedinPattern =
  /https:\/\/www\.linkedin\.com\/in\/[a-zA-Z0-9-]+\//;

export const linkedinPatternExact = new RegExp(`^${linkedinPattern.source}$`);

/**
 * Extracts LinkedIn profile URL and contact name from a string
 * Only matches exact format: https://www.linkedin.com/in/slug/
 *
 * @param input - String containing a contact name and potentially a LinkedIn URL
 * @returns Object with extracted name and LinkedIn URL (if found)
 */
export function extractLinkedInAndName(input: string): {
  name: string;
  linkedinUrl: string | null;
} {
  if (!input || typeof input !== "string") {
    return { name: "", linkedinUrl: null };
  }

  let linkedinUrl: string | null = null;
  let name = input.trim();

  // Find and extract LinkedIn URL
  const matches = linkedinPattern.exec(name);
  if (matches && matches.length > 0 && matches[0]) {
    linkedinUrl = matches[0];
    // Remove the LinkedIn URL from the input to get the name
    name = name.replace(linkedinPattern, "").trim();
  }

  return {
    name,
    linkedinUrl,
  };
}
