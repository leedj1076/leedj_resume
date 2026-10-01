"use client";

import { useCallback, useEffect, useState } from "react";
import ProfilePanel from "./ProfilePanel";
import ChatPanel from "./ChatPanel";
import TracePanel from "./TracePanel";
import V14WelcomeModal from "./V14WelcomeModal";
import ProfileNavigation from "./profile/ProfileNavigation";
import { STARTER_QUESTIONS, PERSONA_STARTER_QUESTIONS } from "@/lib/profile-data";
import { PERSONA_OPTIONS, resolvePersonaOptions, type Persona } from "@/lib/domain/personas";
import type { Language } from "@/lib/domain/language";
import { useProfileConversation, type ProfileAppProps } from "@/hooks/useProfileConversation";
import { useTheme } from "@/hooks/useTheme";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export type { ProfileAppProps } from "@/hooks/useProfileConversation";

function shuffleIndices(length: number, pick: number): number[] {
  const indices = Array.from({ length }, (_, i) => i);
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  return indices.slice(0, pick);
}

export default function ProfileApp(props: ProfileAppProps = {}) {
  const { internal, visiblePersonas, personaLabels, defaultPersona } = props;
  const [lang, setLang] = useState<Language>("en");
  const personaOptions = resolvePersonaOptions(internal ? undefined : visiblePersonas, personaLabels);
  const [persona, setPersona] = useState<Persona>(() => {
    if (defaultPersona && personaOptions.some((option) => option.value === defaultPersona)) return defaultPersona as Persona;
    return personaOptions.find((option) => option.value === "vc")?.value ?? personaOptions[0]?.value ?? PERSONA_OPTIONS[0].value;
  });
  const [mobileTab, setMobileTab] = useState<"profile" | "chat">("profile");
  const [showWelcome, setShowWelcome] = useState(() => {
    try { return !sessionStorage.getItem("v14-welcomed"); }
    catch { return true; }
  });
  const [profileVisible, setProfileVisible] = useState(true);
  const [visitorEmail, setVisitorEmail] = useState<string | undefined>();
  const { darkMode, toggleDarkMode } = useTheme();
  const conversation = useProfileConversation({ ...props, lang, persona, visitorEmail });

  useEffect(() => {
    document.documentElement.lang = lang === "kr" ? "ko" : "en";
  }, [lang]);
  const [starterIndices, setStarterIndices] = useState<number[]>([0, 1, 2]);
  const changePersona = useCallback((next: Persona) => {
    setPersona(next);
    const questions = PERSONA_STARTER_QUESTIONS[next]?.en ?? STARTER_QUESTIONS.en;
    setStarterIndices(shuffleIndices(questions.length, 3));
  }, []);

  const handleWelcomeStart = useCallback((selectedLang: Language, selectedPersona: string, email?: string) => {
    setLang(selectedLang);
    if (personaOptions.some((option) => option.value === selectedPersona)) changePersona(selectedPersona as Persona);
    setVisitorEmail(email);
    setShowWelcome(false);
    try { sessionStorage.setItem("v14-welcomed", "1"); } catch { /* Storage may be blocked. */ }
  }, [personaOptions, changePersona]);

  const askChat = useCallback((question: string) => {
    conversation.send(question);
    setMobileTab("chat");
  }, [conversation]);

  const en = lang === "en";
  return (
    <div className="h-screen flex flex-col bg-[var(--color-page-bg)] text-[var(--color-text-primary)] font-[family-name:var(--font-geist-sans)] selection:bg-[var(--color-selection)]">
      <ProfileNavigation lang={lang} setLang={setLang} persona={persona} setPersona={changePersona}
        personaOptions={personaOptions} profileVisible={profileVisible} setProfileVisible={setProfileVisible}
        darkMode={darkMode} toggleDarkMode={toggleDarkMode} />
      {/* Mobile tab bar */}
      <Tabs
        value={mobileTab}
        onValueChange={(v) => setMobileTab(v as "profile" | "chat")}
        className="lg:hidden shrink-0 gap-0"
      >
        <TabsList
          variant="line"
          className="w-full rounded-none border-b border-[var(--color-border-primary)] bg-transparent p-0 h-auto"
        >
          <TabsTrigger
            value="profile"
            className="flex-1 py-2.5 text-[12px] font-medium rounded-none border-none data-[state=active]:text-[var(--color-text-primary)] data-[state=active]:shadow-none data-[state=active]:after:bg-[var(--color-text-primary)] text-[var(--color-text-tertiary)]"
          >
            {en ? "Profile" : "프로필"}
          </TabsTrigger>
          <TabsTrigger
            value="chat"
            className="flex-1 py-2.5 text-[12px] font-medium rounded-none border-none data-[state=active]:text-[var(--color-text-primary)] data-[state=active]:shadow-none data-[state=active]:after:bg-[var(--color-text-primary)] text-[var(--color-text-tertiary)]"
          >
            {en ? "Chat" : "채팅"}
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Two-column layout */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Left: Profile */}
        <div
          className={`${
            mobileTab === "profile" ? "flex" : "hidden"
          } ${
            profileVisible ? "lg:flex" : "lg:hidden"
          } h-full lg:h-auto lg:w-[46%] lg:min-w-[390px] lg:max-w-[520px] lg:border-r border-[var(--color-border-primary)] shrink-0 flex-col bg-[var(--color-profile-bg)]`}
        >
          <ProfilePanel lang={lang} onAskChat={askChat} />
        </div>

        {/* Right: Chat */}
        <div
          className={`${
            mobileTab === "chat" ? "flex" : "hidden"
          } lg:flex flex-1 min-w-0 min-h-0 flex-col`}
        >
          <ChatPanel
            lang={lang}
            persona={persona}
            messages={conversation.messages}
            status={conversation.status}
            error={conversation.error}
            onSend={askChat}
            onStop={conversation.stop}
            onReset={conversation.reset}
            onFeedback={conversation.submitFeedback}
            starterIndices={starterIndices}
            internal={internal}
            selectedTraceMessageId={conversation.activeTraceMessageId}
            onSelectTrace={internal ? conversation.selectTrace : undefined}
          />
        </div>

        {/* Right: Trace panel (internal only) */}
        {internal && (
          <TracePanel trace={conversation.selectedTrace} messageId={conversation.activeTraceMessageId ?? undefined} />
        )}
      </div>

      {/* Welcome modal */}
      {showWelcome && (
        <V14WelcomeModal
          onStart={handleWelcomeStart}
          options={personaOptions}
          defaultPersona={defaultPersona}
        />
      )}
    </div>
  );
}
