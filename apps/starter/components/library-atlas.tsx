"use client";
import { useEffect, useEffectEvent, useId, useRef, useState } from "react";
import {
  ScrollText,
  Search,
  Network,
  Folder,
  ChevronDown,
  ChevronRight,
  Compass,
  ListChecks,
  Lightbulb,
  PanelsTopLeft,
  FileText,
  SlidersHorizontal,
} from "lucide-react";
import { TopicDiagram } from "./topic-diagram";
import { linkedInsightProjects } from "@/lib/insight-project-links";

const insightIcons = [Compass, ListChecks, Lightbulb, PanelsTopLeft];
// A display excerpt only: complete claims remain unchanged in evidence and aria labels.
function compactExcerpt(claim: string) {
  const phrase = claim
    .split(
      /[.;!?]|\b(?:before|after|until|because|while|rather than|so that|when)\b/i,
    )[0]
    .trim();
  const words = phrase.split(/\s+/);
  let excerpt = "";
  for (const word of words) {
    if (
      excerpt &&
      (excerpt.length + word.length + 1 > 28 || excerpt.split(" ").length >= 5)
    )
      break;
    excerpt += (excerpt ? " " : "") + word;
  }
  return excerpt === claim.trim() ? excerpt : `${excerpt}…`;
}
export function LibraryAtlas({
  topics,
  selected,
  detail,
  search,
  onSearch,
  folders,
  onFolders,
  onOpen,
  onMoreTopics,
  onMoreEvidence,
  loading,
  message,
  organizationId,
  demo,
  readJourney,
  advanced,
  corrections,
  animateEntry = false,
}: {
  topics: any;
  selected: any;
  detail: any;
  search: string;
  onSearch: (s: string) => void;
  folders: boolean;
  onFolders: (value: boolean) => void;
  onOpen: (topic: any) => void;
  onMoreTopics: () => void;
  onMoreEvidence: () => void;
  loading: boolean;
  message: string;
  organizationId: string;
  demo: boolean;
  readJourney: () => Promise<any>;
  advanced: React.ReactNode;
  corrections: React.ReactNode;
  animateEntry?: boolean;
}) {
  const initial = useRef("");
  const atlasRef = useRef<HTMLElement>(null);
  const edgeId = useId().replaceAll(":", "");
  const [evidenceEdges, setEvidenceEdges] = useState({
    width: 1,
    height: 1,
    stem: "",
    proposals: [] as string[],
  });
  const openInitial = useEffectEvent(() => {
    const leaf = topics?.items.find(
      (topic: any) =>
        !topic.autoCategory &&
        !topics.items.some((child: any) => child.parentId === topic.id),
    );
    if (leaf) onOpen(leaf);
  });
  useEffect(() => {
    if (!topics?.items.length || selected || search) return;
    const key = `${organizationId}:${topics.scope}`;
    if (initial.current === key) return;
    const timer = setTimeout(() => {
      initial.current = key;
      openInitial();
    }, 0);
    return () => clearTimeout(timer);
  }, [organizationId, topics?.scope, topics?.items.length, selected, search]);
  const [visible, setVisible] = useState(folders ? 6 : 4);
  const [insightId, setInsightId] = useState<string | null>(null);
  const [showEvidence, setShowEvidence] = useState(false);
  const [links, setLinks] = useState<any>(null);
  const [linkError, setLinkError] = useState("");
  const request = useRef(0);
  useEffect(
    () => () => {
      request.current++;
    },
    [],
  );
  async function inspect(member: any, show = true) {
    const ticket = ++request.current;
    setInsightId(member._id);
    setShowEvidence(show);
    setLinks(null);
    setLinkError("");
    try {
      const result = demo
        ? {
            items:
              member.evidence.reference.insightId === "idea-0"
                ? [
                    {
                      id: "demo-link",
                      current: true,
                      sources: [
                        {
                          id: member.evidence.reference.sourceId,
                          insights: ["idea-0"],
                        },
                      ],
                      repository: "Demo shop",
                      steps: [
                        {
                          id: "demo-proposal",
                          title: "Simplify onboarding",
                          state: "draft",
                        },
                      ],
                    },
                  ]
                : [],
            next: null,
          }
        : await readJourney();
      if (ticket === request.current)
        setLinks({
          ...result,
          items: linkedInsightProjects(member.evidence.reference, result.items),
        });
    } catch {
      if (ticket === request.current)
        setLinkError(
          "Project connections unavailable. Select the insight to retry.",
        );
    }
  }
  const members = detail?.members ?? [];
  const activeMember = members.find((m: any) => m._id === insightId);
  const inspectInitial = useEffectEvent(() => {
    if (members[0]) void inspect(members[0], false);
  });
  useEffect(() => {
    if (!members.length) return;
    const timer = setTimeout(inspectInitial, 0);
    return () => clearTimeout(timer);
  }, [members.length]);
  const steps =
    links?.items.flatMap((evaluation: any) =>
      evaluation.steps.map((step: any) => ({
        ...step,
        repository: evaluation.repository,
      })),
    ) ?? [];
  const selectedTopicId = selected?.id;
  useEffect(() => {
    const atlas = atlasRef.current;
    if (!atlas || !selectedTopicId) return;
    const observer = new ResizeObserver(() => {
      const bounds = atlas.getBoundingClientRect();
      const leaf = Array.from(
        atlas.querySelectorAll<HTMLElement>(".hybrid-node[data-topic-id]"),
      ).find((node) => node.dataset.topicId === selectedTopicId);
      const tray = atlas.querySelector<HTMLElement>(".hybrid-insight-tray");
      if (!leaf || !tray || tray.closest('[aria-hidden="true"]')) {
        setEvidenceEdges({
          width: bounds.width,
          height: bounds.height,
          stem: "",
          proposals: [],
        });
        return;
      }
      const l = leaf.getBoundingClientRect(),
        t = tray.getBoundingClientRect();
      const x = l.left + l.width / 2 - bounds.left,
        y = l.bottom - bounds.top;
      const stem = !folders ? `M ${x} ${y} V ${t.top - bounds.top}` : "";
      const proposals = Array.from(
        atlas.querySelectorAll<HTMLElement>(".hybrid-proposals article"),
      ).map((article) => {
        const p = article.getBoundingClientRect();
        const startX = l.left - bounds.left,
          startY = l.top + l.height / 2 - bounds.top;
        const endX = p.left - bounds.left,
          endY = p.top + p.height / 2 - bounds.top;
        const gutter = Math.min(startX, endX, t.left - bounds.left) - 12;
        return `M ${startX} ${startY} H ${gutter + 10} Q ${gutter} ${startY} ${gutter} ${startY + 10} V ${endY - 10} Q ${gutter} ${endY} ${gutter + 10} ${endY} H ${endX - 3}`;
      });
      setEvidenceEdges({
        width: bounds.width,
        height: bounds.height,
        stem,
        proposals,
      });
    });
    observer.observe(atlas);
    return () => observer.disconnect();
  }, [selectedTopicId, folders, members.length, steps.length, visible]);
  const evidence = selected && (
    <div className="hybrid-evidence" data-linked={steps.length > 0}>
      {!detail && <output>Opening source-backed insights…</output>}
      {detail && (
        <div className="hybrid-insight-tray">
          <ul>
            {members.slice(0, visible).map((member: any, index: number) => {
              const Icon = insightIcons[index % insightIcons.length];
              return (
                <li key={member._id} data-selected={member._id === insightId}>
                  <button
                    className="hybrid-insight-select"
                    onClick={() => void inspect(member)}
                    aria-label={`Inspect ${member.evidence.insight.claim}`}
                    aria-pressed={member._id === insightId}
                  >
                    <span className="hybrid-insight-icon" data-tone={index % 4}>
                      <Icon aria-hidden="true" />
                    </span>
                    <span>
                      <strong title={member.evidence.insight.claim}>
                        {compactExcerpt(member.evidence.insight.claim)}
                      </strong>
                      <small>
                        <FileText size={14} aria-hidden="true" />
                        <span
                          className="hybrid-source-label"
                          title={member.evidence.title}
                        >
                          {demo
                            ? member.evidence.title.replace(
                                "Synthetic example",
                                "Example",
                              )
                            : member.evidence.title}
                        </span>
                      </small>
                      {folders &&
                        member._id === insightId &&
                        steps.length > 0 && (
                          <span className="hybrid-proposal-badge">
                            {steps.length}{" "}
                            {steps.length === 1 ? "proposal" : "proposals"}
                          </span>
                        )}
                    </span>
                    <ChevronRight size={18} aria-hidden="true" />
                  </button>
                </li>
              );
            })}
          </ul>
          {members.length > visible ? (
            <button
              className="hybrid-more"
              onClick={() => setVisible((n) => n + (folders ? 6 : 4))}
            >
              More insights <ChevronDown size={18} />
            </button>
          ) : detail.next ? (
            <button className="hybrid-more" onClick={onMoreEvidence}>
              Next insights page <ChevronDown size={18} />
            </button>
          ) : null}
          {!members.length && (
            <p>No current permitted evidence in this page.</p>
          )}
        </div>
      )}
      {activeMember && (
        <div className="hybrid-selected-evidence">
          {showEvidence && (
            <details
              open={showEvidence}
              onToggle={(event) => setShowEvidence(event.currentTarget.open)}
            >
              <summary>Source evidence</summary>
              <h3>{activeMember.evidence.title}</h3>
              <p>{activeMember.evidence.insight.claim}</p>
              <a
                href={
                  demo
                    ? "/demo"
                    : `/app/${organizationId}/library?source=${encodeURIComponent(activeMember.evidence.reference.sourceId)}`
                }
              >
                View source evidence
              </a>
            </details>
          )}
          {!links && !linkError && (
            <output>Checking recorded project connections…</output>
          )}
          {linkError && <p role="alert">{linkError}</p>}
          {links && !steps.length && (
            <p>No recorded proposal for this insight in this page.</p>
          )}
        </div>
      )}
      {steps.length > 0 && (
        <div className="hybrid-proposals">
          <span className="hybrid-proposal-caption">Used in proposal</span>
          {steps.map((step: any) => (
            <article key={step.id}>
              <span className="hybrid-proposal-icon">
                <FileText aria-hidden="true" />
              </span>
              <div>
                <strong>{step.title}</strong>
                <small>
                  {step.repository} · {step.state.replaceAll("_", " ")}
                </small>
              </div>
              <a
                href={
                  demo
                    ? "/demo?view=projects"
                    : `/app/${organizationId}/projects?proposal=${encodeURIComponent(step.id)}`
                }
              >
                Review
              </a>
            </article>
          ))}
          {demo && <small>Illustrative demo connection</small>}
        </div>
      )}
      {links?.next && <p>More evaluations are available in Projects.</p>}
      {corrections}
    </div>
  );
  return (
    <section
      ref={atlasRef}
      className={`hybrid-library ${folders ? "hybrid-folders" : "hybrid-tree"}`}
      aria-label="Library atlas"
    >
      <svg
        className="hybrid-evidence-edges"
        viewBox={`0 0 ${evidenceEdges.width} ${evidenceEdges.height}`}
        aria-hidden="true"
      >
        <defs>
          <marker
            id={edgeId}
            markerWidth="6"
            markerHeight="6"
            refX="5"
            refY="3"
            orient="auto"
          >
            <path d="M 0 0 L 6 3 L 0 6 Z" />
          </marker>
        </defs>
        {evidenceEdges.stem && (
          <path className="evidence-stem" d={evidenceEdges.stem} />
        )}
        {evidenceEdges.proposals.map((path, index) => (
          <path
            key={index}
            className="proposal-edge"
            d={path}
            markerEnd={`url(#${edgeId})`}
          />
        ))}
      </svg>
      <div className="hybrid-brand-row">
        <span className="hybrid-brand">
          <ScrollText aria-hidden="true" />
          <strong>VibeScroll</strong>
        </span>
        <label className="hybrid-search">
          <Search size={19} aria-hidden="true" />
          <span className="sr-only">Search library</span>
          <input
            value={search}
            placeholder="Search library…"
            maxLength={120}
            onChange={(e) => onSearch(e.target.value)}
          />
        </label>
      </div>
      <div className="hybrid-heading-row">
        <h2>Library</h2>
        <div className="hybrid-switch" aria-label="Library representation">
          <button aria-pressed={!folders} onClick={() => onFolders(false)}>
            <Network size={19} />
            Tree
          </button>
          <button aria-pressed={folders} onClick={() => onFolders(true)}>
            <Folder size={19} />
            Folders
          </button>
        </div>
      </div>
      {loading && <output aria-live="polite">Loading library…</output>}
      {message && <p role="alert">{message}</p>}
      {!loading && !message && !topics?.items.length && (
        <p>No current insights here. Try another topic or library view.</p>
      )}
      <TopicDiagram
        animateEntry={animateEntry}
        topics={topics?.items ?? []}
        onOpen={onOpen}
        selectedId={selected?.id}
        representation={folders ? "folders" : "tree"}
      >
        {evidence}
      </TopicDiagram>
      {topics?.next && (
        <button
          className="hybrid-more"
          disabled={loading}
          onClick={onMoreTopics}
        >
          More categories <ChevronDown size={18} />
        </button>
      )}
      <details className="hybrid-settings">
        <summary>
          <SlidersHorizontal size={17} />
          Library options
        </summary>
        {advanced}
        <p>{topics?.coverage}</p>
      </details>
    </section>
  );
}
