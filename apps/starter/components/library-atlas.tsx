"use client";
import { useEffect, useRef, useState } from "react";
import {
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
import { motion } from "motion/react";
import { TopicDiagram } from "./topic-diagram";
import { linkedInsightProjects } from "@/lib/insight-project-links";
import { topicPath } from "@/lib/topic-tree";
import { useInterfaceMotion } from "./motion-preference";
const insightIcons = [Compass, ListChecks, Lightbulb, PanelsTopLeft];
function compactExcerpt(claim: string) {
  const phrase = claim
    .split(
      /[.;!?]|\b(?:before|after|until|because|while|rather than|so that|when)\b/i,
    )[0]
    .trim();
  let excerpt = "";
  for (const word of phrase.split(/\s+/)) {
    if (
      excerpt &&
      (excerpt.length + word.length + 1 > 40 || excerpt.split(" ").length >= 7)
    )
      break;
    excerpt += (excerpt ? " " : "") + word;
  }
  return excerpt === claim.trim() ? excerpt : `${excerpt}...`;
}
function EvidenceList({
  detail,
  organizationId,
  demo,
  readJourney,
  onMoreEvidence,
  corrections,
}: {
  detail: any;
  organizationId: string;
  demo: boolean;
  readJourney: () => Promise<any>;
  onMoreEvidence: () => void;
  corrections: React.ReactNode;
}) {
  const [visible, setVisible] = useState(6),
    [insightId, setInsightId] = useState<string | null>(null),
    [links, setLinks] = useState<any>(null),
    [linkError, setLinkError] = useState("");
  const request = useRef(0),
    [pointer, setPointer] = useState(false),
    animate = useInterfaceMotion();
  useEffect(
    () => () => {
      request.current++;
    },
    [],
  );
  const members = detail?.members ?? [];
  async function inspect(member: any) {
    const ticket = ++request.current;
    if (insightId === member._id) {
      setInsightId(null);
      setLinks(null);
      setLinkError("");
      return;
    }
    setInsightId(member._id);
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
          "Project connections unavailable. Close and reopen this insight to retry.",
        );
    }
  }
  const steps =
    links?.items.flatMap((evaluation: any) =>
      evaluation.steps.map((step: any) => ({
        ...step,
        repository: evaluation.repository,
      })),
    ) ?? [];
  return (
    <div className="hybrid-evidence">
      {!detail ? (
        <output>Opening source-backed insights...</output>
      ) : (
        <div className="hybrid-insight-tray">
          <ul>
            {members.slice(0, visible).map((member: any, index: number) => {
              const Icon = insightIcons[index % insightIcons.length],
                expanded = member._id === insightId;
              return (
                <li key={member._id} data-selected={expanded}>
                  <button
                    className="hybrid-insight-select"
                    aria-label={`Inspect ${member.evidence.insight.claim}`}
                    aria-expanded={expanded}
                    onPointerDown={() => {
                      setPointer(true);
                    }}
                    onKeyDown={() => {
                      setPointer(false);
                    }}
                    onClick={(event) => {
                      setPointer(event.detail > 0);
                      void inspect(member);
                    }}
                  >
                    <span className="hybrid-insight-icon" data-tone={index % 4}>
                      <Icon aria-hidden="true" />
                    </span>
                    <span className="hybrid-insight-copy">
                      <strong>
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
                    </span>
                    {expanded ? (
                      <ChevronDown size={18} aria-hidden="true" />
                    ) : (
                      <ChevronRight size={18} aria-hidden="true" />
                    )}
                  </button>
                  <motion.div
                    className="hybrid-insight-details"
                    initial={false}
                    animate={{
                      height: expanded ? "auto" : 0,
                      opacity: expanded ? 1 : 0,
                    }}
                    transition={{
                      duration: animate && pointer ? 0.2 : 0,
                      ease: [0.22, 1, 0.36, 1],
                    }}
                    inert={!expanded}
                    aria-hidden={!expanded || undefined}
                  >
                    {
                      <div>
                        <h3>{member.evidence.title}</h3>
                        <p>{member.evidence.insight.claim}</p>
                        <a
                          href={
                            demo
                              ? "/demo"
                              : `/app/${organizationId}/library?source=${encodeURIComponent(member.evidence.reference.sourceId)}`
                          }
                        >
                          View source evidence
                        </a>
                        {expanded && !links && !linkError && (
                          <output>
                            Checking recorded project connections...
                          </output>
                        )}
                        {expanded && linkError && (
                          <p role="alert">{linkError}</p>
                        )}
                        {expanded && steps.length > 0 && (
                          <div className="hybrid-proposals">
                            <span>Used in proposal</span>
                            {steps.map((step: any) => (
                              <article key={step.id}>
                                <FileText size={18} aria-hidden="true" />
                                <div>
                                  <strong>{step.title}</strong>
                                  <small>
                                    {step.repository} /{" "}
                                    {step.state.replaceAll("_", " ")}
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
                            {demo && (
                              <small>Illustrative demo connection</small>
                            )}
                          </div>
                        )}
                        {expanded && links?.next && (
                          <p>More evaluations are available in Projects.</p>
                        )}
                      </div>
                    }
                  </motion.div>
                </li>
              );
            })}
          </ul>
          {members.length > visible ? (
            <button
              className="hybrid-more"
              onClick={() => setVisible((n) => n + 6)}
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
      {detail && corrections}
    </div>
  );
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
  const items = topics?.items ?? [];
  const startingRoot = items.find(
    (topic: any) => topic.id === topicPath(items, selected?.id ?? "")[0]?.id,
  )?.name;
  const [filing, setFiling] = useState<"Personal" | "Business">(
    startingRoot === "Personal" ? "Personal" : "Business",
  );
  const evidenceKey = `${selected?.id}:${detail?.members.map((member: any) => [member._id, member.evidence.reference.generation, member.evidence.reference.revision].join(":")).join("|")}`;
  function chooseFiling(value: "Personal" | "Business") {
    setFiling(value);
    const root = items.find(
      (topic: any) =>
        !topic.parentId && topic.autoCategory && topic.name === value,
    );
    if (root) onOpen(root);
  }
  return (
    <section
      className={`hybrid-library ${folders ? "hybrid-folders" : "hybrid-tree"}`}
      aria-label="Library atlas"
    >
      <div className="hybrid-heading-row">
        <h2>Library</h2>
        <label className="hybrid-search">
          <Search size={18} aria-hidden="true" />
          <span className="sr-only">Search library</span>
          <input
            value={search}
            placeholder="Search library..."
            maxLength={120}
            onChange={(e) => onSearch(e.target.value)}
          />
        </label>
      </div>
      <div className="hybrid-toolbar">
        <div className="hybrid-switch" aria-label="Library representation">
          <button aria-pressed={!folders} onClick={() => onFolders(false)}>
            <Network size={17} />
            Tree
          </button>
          <button aria-pressed={folders} onClick={() => onFolders(true)}>
            <Folder size={17} />
            Folders
          </button>
        </div>
        <div className="hybrid-switch" aria-label="Personal or business filing">
          <button
            aria-pressed={filing === "Personal"}
            onClick={() => chooseFiling("Personal")}
          >
            Personal
          </button>
          <button
            aria-pressed={filing === "Business"}
            onClick={() => chooseFiling("Business")}
          >
            Business
          </button>
        </div>
      </div>
      {loading && <output aria-live="polite">Loading library...</output>}
      {message && <p role="alert">{message}</p>}
      {!loading && !message && !items.length && (
        <p>No current insights here. Try another topic or library view.</p>
      )}
      <TopicDiagram
        topics={items}
        onOpen={onOpen}
        selectedId={selected?.id}
        representation={folders ? "folders" : "tree"}
        filing={filing}
      >
        {selected && !selected.autoCategory && (
          <EvidenceList
            key={evidenceKey}
            detail={detail}
            organizationId={organizationId}
            demo={demo}
            readJourney={readJourney}
            onMoreEvidence={onMoreEvidence}
            corrections={corrections}
          />
        )}
      </TopicDiagram>
      {topics?.next && (
        <button
          className="hybrid-more"
          disabled={loading}
          onClick={onMoreTopics}
        >
          Next categories page <ChevronDown size={18} />
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
