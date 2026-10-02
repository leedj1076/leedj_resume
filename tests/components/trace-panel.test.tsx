// @vitest-environment jsdom
import { expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import TracePanel from "@/components/TracePanel";
import type { TraceData } from "@/lib/rag/trace";

it("shows ranked chunk identities without presenting similarity as the ranking score", () => {
  const trace: TraceData = {
    totalDurationMs: 10,
    steps: [{
      type: "ranking", timestamp: 0, summary: "2 → 1 chunks",
      data: { inputCount: 2, outputCount: 1, topChunks: [
        { id: "qa-story", label: "QA story", section: "experience", pineconeScore: 0.123 },
      ] },
    }],
  };

  render(<TracePanel trace={trace} />);
  fireEvent.click(screen.getByRole("button", { name: /Re-ranking/ }));
  expect(screen.getByRole("columnheader", { name: "Chunk" })).toBeInTheDocument();
  expect(screen.getByText("QA story")).toBeInTheDocument();
  expect(screen.getByText("2 chunks")).toBeInTheDocument();
  expect(screen.queryByRole("columnheader", { name: "Score" })).not.toBeInTheDocument();
  expect(screen.queryByText("0.123")).not.toBeInTheDocument();
});
