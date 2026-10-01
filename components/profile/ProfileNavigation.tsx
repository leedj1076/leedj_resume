"use client";

import { Button } from "@/components/ui/button";
import PersonaSelector from "./PersonaSelector";
import type { Language } from "@/lib/domain/language";
import type { Persona, PersonaOption } from "@/lib/domain/personas";

interface ProfileNavigationProps {
  lang: Language;
  setLang: (lang: Language) => void;
  persona: Persona;
  setPersona: (persona: Persona) => void;
  personaOptions: readonly PersonaOption[];
  profileVisible: boolean;
  setProfileVisible: (updater: (visible: boolean) => boolean) => void;
  darkMode: boolean;
  toggleDarkMode: () => void;
}

export default function ProfileNavigation({ lang, setLang, persona, setPersona, personaOptions, profileVisible, setProfileVisible, darkMode, toggleDarkMode }: ProfileNavigationProps) {
  const en = lang === "en";
  return <>
      {/* Nav */}
      <nav className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-[var(--color-border-primary)] shrink-0 gap-2">
        <div className="flex items-center gap-2.5 shrink-0">
          <span className="text-[13px] font-semibold text-[var(--color-text-primary)] tracking-tight">
            DJ Lee
          </span>
          <span className="text-[11px] text-[var(--color-separator)] hidden sm:inline">|</span>
          <span className="text-[11px] text-[var(--color-text-tertiary)] hidden sm:inline">
            {en ? "Interactive Profile" : "인터랙티브 프로필"}
          </span>
        </div>

        <PersonaSelector options={personaOptions} value={persona} onChange={setPersona} lang={lang} variant="desktop" />

        <div className="flex items-center gap-2 shrink-0">
          {/* Profile panel toggle — desktop only */}
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={() => setProfileVisible((v) => !v)}
            aria-label={profileVisible ? "Hide profile panel" : "Show profile panel"}
            className="hidden lg:inline-flex text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)]"
          >
            {profileVisible ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <line x1="9" y1="3" x2="9" y2="21" />
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <line x1="9" y1="3" x2="9" y2="21" />
                <polyline points="14 9 17 12 14 15" />
              </svg>
            )}
          </Button>
          {/* Dark mode toggle */}
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={toggleDarkMode}
            aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
            className="text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)]"
          >
            {darkMode ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="5" />
                <line x1="12" y1="1" x2="12" y2="3" />
                <line x1="12" y1="21" x2="12" y2="23" />
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                <line x1="1" y1="12" x2="3" y2="12" />
                <line x1="21" y1="12" x2="23" y2="12" />
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
              </svg>
            )}
          </Button>
          {/* Lang toggle */}
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={() => setLang(lang === "en" ? "kr" : "en")}
            aria-label={lang === "en" ? "Switch to Korean" : "Switch to English"}
            className="text-[11px] font-medium text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)]"
          >
            {lang === "en" ? "EN" : "KO"}
          </Button>
        </div>
      </nav>

      <PersonaSelector options={personaOptions} value={persona} onChange={setPersona} lang={lang} variant="mobile" />

  </>;
}
