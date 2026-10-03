import { describe, expect, it } from "vitest";
import {
  parseTranscript,
  serializeTranscript,
  toInterviewExchanges,
  type Transcript,
} from "@/lib/chat/transcript";

const source: Transcript = {
  version: 1,
  turns: [
    { speaker: "interviewer", text: "What did you build?" },
    { speaker: "subject", text: "I built the retrieval system." },
  ],
};

describe("transcript attribution", () => {
  it.each(["json", "text"] as const)(
    "round trips capture %s with the interviewer as questioner",
    (format) => {
      expect(
        toInterviewExchanges(
          parseTranscript(serializeTranscript(source, format), "auto"),
        ),
      ).toEqual([
        {
          question: "What did you build?",
          answer: "I built the retrieval system.",
        },
      ]);
    },
  );

  it("preserves multiline Korean answers and joins consecutive subject turns", () => {
    const transcript: Transcript = {
      version: 1,
      turns: [
        { speaker: "interviewer", text: "어떤 일을 했나요?" },
        {
          speaker: "subject",
          text: "검색 시스템을 만들었습니다.\n정확도를 높였습니다.",
        },
        { speaker: "subject", text: "팀과 함께 출시했습니다." },
        { speaker: "interviewer", text: "다음 질문은?" },
      ],
    };
    expect(
      toInterviewExchanges(
        parseTranscript(serializeTranscript(transcript, "text"), "auto"),
      ),
    ).toEqual([
      {
        question: "어떤 일을 했나요?",
        answer:
          "검색 시스템을 만들었습니다.\n정확도를 높였습니다.\n\n팀과 함께 출시했습니다.",
      },
    ]);
  });

  it("round trips indentation and trailing blank lines in versioned text", () => {
    const exact: Transcript = {
      version: 1,
      turns: [
        { speaker: "interviewer", text: "  Indented question?\n" },
        { speaker: "subject", text: "  answer\n\n\\Subject: literal\n\n" },
      ],
    };
    expect(parseTranscript(serializeTranscript(exact, "text"))).toEqual(exact);
  });

  it("maps capture JSON arrays and legacy text to the capture roles", () => {
    const legacy = JSON.stringify([
      { role: "assistant", content: "What changed?" },
      { role: "user", content: "I changed the design." },
    ]);
    expect(toInterviewExchanges(parseTranscript(legacy, "auto"))).toEqual([
      { question: "What changed?", answer: "I changed the design." },
    ]);
    expect(
      toInterviewExchanges(
        parseTranscript(
          "Assistant: What changed?\n\nHuman: I changed the design.",
          "capture-legacy",
        ),
      ),
    ).toEqual([{ question: "What changed?", answer: "I changed the design." }]);
  });

  it("parses Q/A blocks with multiline answers", () => {
    expect(
      toInterviewExchanges(
        parseTranscript(
          "Q: 무엇을 했나요?\nA: 검색을 만들었습니다.\n성능을 높였습니다.",
          "qa",
        ),
      ),
    ).toEqual([
      {
        question: "무엇을 했나요?",
        answer: "검색을 만들었습니다.\n성능을 높였습니다.",
      },
    ]);
  });

  it("requires an explicit mode for ambiguous Human/Assistant text", () => {
    expect(() =>
      parseTranscript(
        "Human: What did you build?\nAssistant: I built a search system.",
        "auto",
      ),
    ).toThrow(/--format capture-legacy/);
  });

  it("rejects unknown prose and malformed versions before generation", () => {
    expect(() =>
      parseTranscript("This is an unlabelled interview.", "auto"),
    ).toThrow(/format/i);
    expect(() => parseTranscript('{"version":2,"turns":[]}', "auto")).toThrow(
      /version/i,
    );
  });
});

it.each([
  "interviewer",
  "INTERVIEWER",
  "iNtErViEwEr",
  "subject",
  "SUBJECT",
  "sUbJeCt",
])("round trips literal %s labels and backslashes", (label) => {
  const exact: Transcript = {
    version: 1,
    turns: [
      source.turns[0],
      {
        speaker: "subject",
        text: `Template:
${label}: literal
\\${label}: escaped
\\\\${label}: twice
End
`,
      },
    ],
  };
  expect(parseTranscript(serializeTranscript(exact, "text"))).toEqual(exact);
});
