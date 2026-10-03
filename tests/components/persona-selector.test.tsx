// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import WelcomeModal from "@/components/WelcomeModal";
import { PERSONAS } from "@/lib/domain/personas";
import PersonaSelector from "@/components/profile/PersonaSelector";
import ChatComposer from "@/components/chat/ChatComposer";
import { resolvePersonaOptions } from "@/lib/domain/personas";
import ProfileApp from "@/components/ProfileApp";
import { CaptureInterview } from "@/components/admin/CaptureInterview";
import ProfilePanel from "@/components/ProfilePanel";
import { CHAT_MODEL } from "@/lib/domain/models";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

it("identifies the configured public chat model in both profile languages", () => {
  const { rerender } = render(<ProfilePanel lang="en" onAskChat={vi.fn()} />);
  expect(screen.getByText(new RegExp(CHAT_MODEL))).toBeInTheDocument();
  rerender(<ProfilePanel lang="kr" onAskChat={vi.fn()} />);
  expect(screen.getByText(new RegExp(CHAT_MODEL))).toBeInTheDocument();
});

it("labels the capture composer as an answer while public chat stays a question", () => {
  Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
    configurable: true,
    value: vi.fn(),
  });
  render(<CaptureInterview />);
  expect(
    screen.getByRole("textbox", { name: "Your answer" }),
  ).toBeInTheDocument();
  cleanup();
  render(
    <ChatComposer
      value=""
      onChange={vi.fn()}
      onSend={vi.fn()}
      onStop={vi.fn()}
      disabled={false}
      streaming={false}
      lang="en"
    />,
  );
  expect(
    screen.getByRole("textbox", { name: "Ask a question" }),
  ).toBeInTheDocument();
});

it("uses identical visible custom persona labels in desktop, mobile, and welcome selection", () => {
  const options = resolvePersonaOptions(["recruiter", "vc"], {
    recruiter: { en: "Talent", kr: "인재" },
  });
  const onChange = vi.fn();
  const { rerender } = render(
    <PersonaSelector
      options={options}
      value="vc"
      onChange={onChange}
      lang="en"
      variant="desktop"
    />,
  );
  expect(screen.getByRole("button", { name: "Talent" })).toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: /founder/i }),
  ).not.toBeInTheDocument();
  rerender(
    <PersonaSelector
      options={options}
      value="vc"
      onChange={onChange}
      lang="kr"
      variant="mobile"
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: "인재" }));
  expect(onChange).toHaveBeenCalledWith("recruiter");
  rerender(
    <PersonaSelector
      options={options}
      value="vc"
      onChange={onChange}
      lang="kr"
      variant="welcome"
    />,
  );
  expect(screen.getByRole("button", { name: "인재" })).toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: /창업자/i }),
  ).not.toBeInTheDocument();
});

it("keeps the public profile usable when session storage throws", () => {
  vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
    throw new Error("blocked");
  });
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
    throw new Error("blocked");
  });
  render(<ProfileApp visiblePersonas={["vc"]} />);
  const dialog = screen.getByRole("dialog");
  fireEvent.click(within(dialog).getByRole("button", { name: "VC" }));
  fireEvent.click(within(dialog).getByRole("button", { name: "Start" }));
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(
    screen.getByRole("textbox", { name: "Ask a question" }),
  ).toBeInTheDocument();
});

it("composer respects composition, Enter, Shift+Enter, empty input, and loading", () => {
  const onSend = vi.fn();
  const onChange = vi.fn();
  const { rerender } = render(
    <ChatComposer
      value="질문"
      onChange={onChange}
      onSend={onSend}
      onStop={vi.fn()}
      disabled={false}
      streaming={false}
      lang="kr"
    />,
  );
  const input = screen.getByRole("textbox", { name: /질문/i });
  fireEvent.compositionStart(input);
  fireEvent.keyDown(input, { key: "Enter", code: "Enter" });
  expect(onSend).not.toHaveBeenCalled();
  fireEvent.compositionEnd(input);
  fireEvent.keyDown(input, { key: "Enter", code: "Enter" });
  expect(onSend).toHaveBeenCalledTimes(1);
  fireEvent.keyDown(input, { key: "Enter", code: "Enter", shiftKey: true });
  expect(onSend).toHaveBeenCalledTimes(1);
  rerender(
    <ChatComposer
      value="  "
      onChange={onChange}
      onSend={onSend}
      onStop={vi.fn()}
      disabled={false}
      streaming={false}
      lang="kr"
    />,
  );
  fireEvent.keyDown(input, { key: "Enter", code: "Enter" });
  expect(onSend).toHaveBeenCalledTimes(1);
  rerender(
    <ChatComposer
      value="질문"
      onChange={onChange}
      onSend={onSend}
      onStop={vi.fn()}
      disabled
      streaming
      lang="kr"
    />,
  );
  fireEvent.keyDown(input, { key: "Enter", code: "Enter" });
  expect(onSend).toHaveBeenCalledTimes(1);
});

it.each(["en", "ko"] as const)(
  "legacy welcome uses all canonical personas in %s",
  (lang) => {
    const onSubmit = vi.fn();
    render(<WelcomeModal lang={lang} onSubmit={onSubmit} />);
    const groups = screen.getAllByRole("radiogroup");
    const options = within(groups[0]).getAllByRole("radio");
    expect(options).toHaveLength(PERSONAS.length);
    fireEvent.click(
      within(groups[0]).getByRole("radio", {
        name:
          lang === "en"
            ? "Recruiter (Strategic Partnerships)"
            : "채용 담당자 (전략 파트너십)",
      }),
    );
    fireEvent.click(within(groups[1]).getAllByRole("radio")[0]);
    fireEvent.click(
      screen.getByRole("button", {
        name: lang === "en" ? /Start Chat/ : /대화 시작/,
      }),
    );
    expect(onSubmit).toHaveBeenCalledWith({
      persona: "developer_partnerships",
      focus: "business_development",
    });
  },
);
