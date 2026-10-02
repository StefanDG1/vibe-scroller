import Markdown, { defaultUrlTransform } from "react-markdown";
import remarkGfm from "remark-gfm";
import Link from "next/link";
import { publicPolicyHref } from "../../../packages/policy/public-documents";

/* eslint-disable jsx-a11y/no-noninteractive-tabindex -- The horizontal table region needs keyboard focus so readers can scroll its columns. */

export function PolicyDocument({ text }: { text: string }) {
  return (
    <article className="policy-document">
      <Markdown
        skipHtml
        remarkPlugins={[remarkGfm]}
        urlTransform={(url) => defaultUrlTransform(publicPolicyHref(url) ?? "")}
        components={{
          a: ({ href, children }) =>
            href ? (
              <Link href={href}>{children}</Link>
            ) : (
              <span>{children}</span>
            ),
          img: () => null,
          table: ({ children }) => (
            <section
              className="policy-table"
              aria-label="Policy details"
              tabIndex={0}
            >
              <table>{children}</table>
            </section>
          ),
        }}
      >
        {text}
      </Markdown>
    </article>
  );
}
