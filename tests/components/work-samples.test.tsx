import { expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import AppleImmersiveVideoPage from "@/app/dj/apple-immersive-video/page";
import B2BSaaSKMAnalysisPage from "@/app/dj/b2b-saas-km-analysis/page";
import BreakoutGameAnalysisPage from "@/app/dj/breakout-game-analysis/page";
import FlintAnalysisPage from "@/app/dj/flint-analysis/page";
import ArticleShell from "@/components/work-samples/ArticleShell";

it("frames an article with profile navigation, supplied title, and body", () => {
  const html = renderToStaticMarkup(<ArticleShell title={<h1>Sample title</h1>}><p>Unique prose</p></ArticleShell>);
  expect(html).toContain('href="/dj"');
  expect(html).toContain("Work Samples");
  expect(html).toContain("<h1>Sample title</h1>");
  expect(html).toContain("<p>Unique prose</p>");
});

it.each([
  [AppleImmersiveVideoPage, "An Analysis of Apple Immersive Video", "Introduction: A New Medium, A New Authorship"],
  [B2BSaaSKMAnalysisPage, "B2B SaaS and the Knowledge Management Problem", "Introduction: The Uncomfortable Question"],
  [BreakoutGameAnalysisPage, "The First Breakout Game", "Introduction: Every Platform Gets Its Snake"],
  [FlintAnalysisPage, "Flint: An Analysis of the Knowledge Management Crisis and a Path Forward", "Introduction: The Information Debt Problem"],
])("preserves article title, navigation, and authored prose", (Page, title, introduction) => {
  const html = renderToStaticMarkup(<Page />);
  expect(html).toContain(`<h1`);
  expect(html).toContain(title);
  expect(html).toContain(introduction);
  expect(html).toContain('href="/dj"');
  expect(html).toContain("Work Samples");
  expect(html).toContain("Back to profile");
});
