import { describe, test, expect } from "vitest";
import { extractLinkedInAndName } from "./linkedin-extractor";

describe("extractLinkedInAndName", () => {
  test.each([
    {
      label: "name with LinkedIn URL at the end",
      input: "Ellen Ripley https://www.linkedin.com/in/ellen-ripley/",
      expected: {
        name: "Ellen Ripley",
        linkedinUrl: "https://www.linkedin.com/in/ellen-ripley/",
      },
    },
    {
      label: "name with LinkedIn URL at the beginning",
      input: "https://www.linkedin.com/in/dallas/ Dallas",
      expected: {
        name: "Dallas",
        linkedinUrl: "https://www.linkedin.com/in/dallas/",
      },
    },
    {
      label: "URLs with hyphens in username",
      input: "Ash https://www.linkedin.com/in/ash-synthetic/",
      expected: {
        name: "Ash",
        linkedinUrl: "https://www.linkedin.com/in/ash-synthetic/",
      },
    },
    {
      label: "strings without LinkedIn URLs",
      input: " Kane ",
      expected: {
        name: "Kane",
        linkedinUrl: null,
      },
    },
    {
      label: "empty strings",
      input: "",
      expected: {
        name: "",
        linkedinUrl: null,
      },
    },
    {
      label: "strings with only LinkedIn URLs",
      input: "https://www.linkedin.com/in/lambert/",
      expected: {
        name: "",
        linkedinUrl: "https://www.linkedin.com/in/lambert/",
      },
    },
    {
      label: "non-string inputs",
      input: null as unknown as string,
      expected: {
        name: "",
        linkedinUrl: null,
      },
    },
    {
      label: "URLs without www",
      input: "Parker https://linkedin.com/in/parker/",
      expected: {
        name: "Parker https://linkedin.com/in/parker/",
        linkedinUrl: null,
      },
    },
    {
      label: "URLs without trailing slash",
      input: "Brett https://www.linkedin.com/in/brett",
      expected: {
        name: "Brett https://www.linkedin.com/in/brett",
        linkedinUrl: null,
      },
    },
  ])("should handle $label", ({ input, expected }) => {
    expect(extractLinkedInAndName(input)).toStrictEqual(expected);
  });
});
