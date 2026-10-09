"use client";
import { useEffect, useEffectEvent, useState } from "react";
import {
  Search,
  Network,
  Folder,
  ChevronDown,
  ChevronRight,
  Compass,
  ListChecks,
  Lightbulb,
  Code,
  ChartNoAxesCombined,
  Megaphone,
  UsersRound,
  Palette,
  Shield,
  Workflow,
  BookOpen,
  Heart,
  Wrench,
  FileText,
  SlidersHorizontal,
  CircleHelp,
} from "lucide-react";
import { motion } from "motion/react";
import { TopicDiagram } from "./topic-diagram";
import { linkedInsightProposals } from "@/lib/insight-project-links";
import { topicPath } from "@/lib/topic-tree";
import { insightPresentation } from "../../../packages/insights/presentation";
import type { LibraryPlace } from "@/lib/library-place";
import { useInterfaceMotion } from "./motion-preference";
const insightIcons = {
  compass: Compass,
  checklist: ListChecks,
  lightbulb: Lightbulb,
  code: Code,
  chart: ChartNoAxesCombined,
  megaphone: Megaphone,
  users: UsersRound,
  palette: Palette,
  shield: Shield,
  workflow: Workflow,
  book: BookOpen,
  heart: Heart,
  wrench: Wrench,
};
function HelpNote({ children }: { children: React.ReactNode }) {
  return (
    <details className="hybrid-help">
      <summary aria-label="About these connections">
        <CircleHelp size={16} />
        <span className="sr-only">About these connections</span>
      </summary>
      <div>{children}</div>
    </details>
  );
}
function EvidenceList({
  detail,
  organizationId,
  demo,
  readJourney,
  onMoreEvidence,
  corrections,
  place,
  onRemember,
}: {
  detail: any;
  organizationId: string;
  demo: boolean;
  readJourney: () => Promise<any>;
  onMoreEvidence: () => void;
  corrections: React.ReactNode;
  place?: LibraryPlace | null;
  onRemember: (patch: Partial<LibraryPlace>) => void;
}) {
  const members = detail?.members ?? [];
  const [visible, setVisible] = useState(() =>
      Math.max(
        6,
        members.findIndex((m: any) => m._id === place?.insightId) + 1,
      ),
    ),
    [insightId, setInsightId] = useState<string | null>(() =>
      members.some((m: any) => m._id === place?.insightId)
        ? place!.insightId!
        : null,
    ),
    [links, setLinks] = useState<any>(null),
    [linkError, setLinkError] = useState("");
  const [pointer, setPointer] = useState(false),
    animate = useInterfaceMotion();
  const loadLinks = useEffectEvent(async () =>
    demo
      ? {
          items: members.length
            ? [
                {
                  id: "demo-link",
                  current: true,
                  sources: [
                    {
                      id: members[0].evidence.reference.sourceId,
                      insights: [members[0].evidence.reference.insightId],
                    },
                  ],
                  repository: "Demo shop",
                  steps: [
                    {
                      id: "demo-proposal",
                      title: "Simplify onboarding",
                      description:
                        "Show a useful example before asking for optional setup.",
                      state: "ready",
                      references: [members[0].evidence.reference],
                    },
                  ],
                },
              ]
            : [],
          next: null,
        }
      : readJourney(),
  );
  const hasMembers = members.length > 0;
  useEffect(() => {
    if (!hasMembers) return;
    let active = true;
    void loadLinks()
      .then((result) => {
        if (active) setLinks(result);
      })
      .catch(() => {
        if (active)
          setLinkError(
            "Proposal connections unavailable. Reopen this topic to retry.",
          );
      });
    return () => {
      active = false;
    };
  }, [hasMembers]);
  return (
    <div className="hybrid-evidence" data-evidence-topic={detail?.topic?.name}>
      {!detail ? (
        <output>Opening source-backed insights...</output>
      ) : (
        <div className="hybrid-insight-tray">
          <div className="hybrid-evidence-heading">
            <span>{detail.topic?.name ?? "Insights"}</span>
            <small>Insights</small>
          </div>
          <ul>
            {members.slice(0, visible).map((member: any) => {
              const presentation = insightPresentation(member.evidence.insight),
                Icon = insightIcons[presentation.icon],
                expanded = member._id === insightId,
                steps = linkedInsightProposals(
                  member.evidence.reference,
                  links?.items ?? [],
                );
              return (
                <li key={member._id} data-selected={expanded}>
                  <button
                    className="hybrid-insight-select"
                    aria-label={`Inspect ${member.evidence.insight.claim}`}
                    aria-expanded={expanded}
                    onPointerDown={() => setPointer(true)}
                    onKeyDown={() => setPointer(false)}
                    onClick={(event) => {
                      setPointer(event.detail > 0);
                      const next = expanded ? null : member._id;
                      setInsightId(next);
                      onRemember({ insightId: next ?? undefined });
                    }}
                  >
                    <span
                      className="hybrid-insight-icon"
                      data-icon={presentation.icon}
                      data-tone={
                        Object.keys(insightIcons).indexOf(presentation.icon) % 4
                      }
                    >
                      <Icon aria-hidden="true" />
                    </span>
                    <span className="hybrid-insight-copy">
                      <strong title={presentation.title}>
                        {presentation.title}
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
                      {steps.length > 0 && (
                        <span className="hybrid-proposal-count">
                          {steps.length}
                          {links?.next ? "+" : ""}{" "}
                          {steps.length === 1 && !links?.next
                            ? "proposal"
                            : "proposals"}
                        </span>
                      )}
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
                        <output>Checking proposals...</output>
                      )}
                      {expanded && linkError && <p role="alert">{linkError}</p>}
                      {expanded && steps.length > 0 && (
                        <div className="hybrid-proposals">
                          <span>Related proposals</span>
                          {steps.map((step: any) => (
                            <a
                              className="hybrid-proposal-link"
                              key={step.id}
                              href={
                                demo
                                  ? "/demo?view=projects"
                                  : `/app/${organizationId}/projects?proposal=${encodeURIComponent(step.id)}`
                              }
                            >
                              <FileText size={18} aria-hidden="true" />
                              <div>
                                <strong>{step.title}</strong>
                                <small>
                                  {step.repository} ·{" "}
                                  {step.state.replaceAll("_", " ")}
                                </small>
                                {step.description && (
                                  <p>
                                    {step.description
                                      .replace(/^[#>*\s]+/gm, "")
                                      .replace(/\s+/g, " ")}
                                  </p>
                                )}
                              </div>
                              <ChevronRight size={17} aria-hidden="true" />
                            </a>
                          ))}
                          {demo && <small>Illustrative demo connection</small>}
                        </div>
                      )}
                      {expanded && links?.next && (
                        <HelpNote>
                          Counts cover the loaded current evaluations. More may
                          be available in Projects.
                        </HelpNote>
                      )}
                    </div>
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
  place,
  onRemember,
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
  place?: LibraryPlace | null;
  onRemember: (patch: Partial<LibraryPlace>) => void;
  animateEntry?: boolean;
}) {
  const items = topics?.items ?? [];
  const defaultFiling = items.some(
    (t: any) => !t.parentId && t.autoCategory && t.name === "Business",
  )
    ? "Business"
    : items.some(
          (t: any) => !t.parentId && t.autoCategory && t.name === "Personal",
        )
      ? "Personal"
      : "Business";
  const startingRoot = items.find(
    (topic: any) => topic.id === topicPath(items, selected?.id ?? "")[0]?.id,
  )?.name;
  const [filing, setFiling] = useState<"Personal" | "Business">(
    place?.filing ?? (startingRoot === "Personal" ? "Personal" : defaultFiling),
  );
  useEffect(() => {
    const next =
      place?.filing ??
      (startingRoot === "Personal" || startingRoot === "Business"
        ? startingRoot
        : undefined);
    // oxlint-disable-next-line react/set-state-in-effect -- Restore the authorized branch's filing when external navigation loads.
    if (next) setFiling(next);
  }, [startingRoot, place?.filing, defaultFiling]);
  const evidenceKey = `${selected?.id}:${detail?.members.map((member: any) => [member._id, member.evidence.reference.generation, member.evidence.reference.revision].join(":")).join("|")}`;
  function chooseFiling(value: "Personal" | "Business") {
    setFiling(value);
    const root = items.find(
      (topic: any) =>
        !topic.parentId && topic.autoCategory && topic.name === value,
    );
    onRemember({
      filing: value,
      closedTopicId: undefined,
      insightId: undefined,
    });
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
        closedTopicId={place?.closedTopicId}
        onCollapse={(topicId) =>
          onRemember({
            closedTopicId: topicId,
            ...(topicId ? { topicId } : {}),
            insightId: undefined,
          })
        }
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
            place={place}
            onRemember={onRemember}
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
