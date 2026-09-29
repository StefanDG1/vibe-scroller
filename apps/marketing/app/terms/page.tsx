import Link from "next/link";
import { notFound } from "next/navigation";
import { company } from "@companynerve/company-config";
import { LegalPage, LegalContact } from "@/components/legal-page";

export const metadata = {
  title: "Terms of use",
  description:
    "Terms for the CompanyNerve website, free template, and hosted example application.",
  alternates: { canonical: "/terms" },
};

export default function Page() {
  if (company.website.kind !== "template") notFound();
  return (
    <LegalPage title="Terms of use">
      <p>
        These terms cover the CompanyNerve website and hosted example
        application, operated by {company.website.operator?.name}. Our
        registration and contact details are in the{" "}
        <Link href="/legal">legal notice</Link>. The source-code licenses
        described below govern your use of the template.
      </p>
      <h2>The free template and hosted application</h2>
      <p>
        CompanyNerve provides a SaaS starter with accounts, team workspaces,
        sample projects, design recipes, and operating documentation. It is an
        alpha release. Features may change, and uninterrupted availability is
        not guaranteed. Keep a copy of information you need.
      </p>
      <p>
        There is no live paid subscription offering at this release. Stripe
        integration code and sandbox examples are included for developers; they
        do not create a subscription or payment obligation. Any future paid
        service will state its price and terms before purchase.
      </p>
      <h2>Accounts and team workspaces</h2>
      <p>
        Use an email address or Google account that you control. Keep access to
        that account secure and do not share authentication codes or sessions.
        If you use CompanyNerve for an organization, you must have permission to
        act for it and to add the information you submit.
      </p>
      <p>
        Workspace owners and administrators manage access according to their
        roles. Only submit content you are entitled to share with the workspace.
        You retain your rights in that content; we process it to operate the
        features you use, as described in the{" "}
        <Link href="/privacy">privacy policy</Link>.
      </p>
      <h2>Acceptable use</h2>
      <p>
        Do not use the hosted service unlawfully, impersonate others, upload
        malicious content, interfere with availability, or access another
        workspace without permission. Do not bypass access controls or usage
        limits. Report suspected vulnerabilities through the repository's
        security reporting process instead of disclosing private data publicly.
      </p>
      <h2>Open-source license and your own deployment</h2>
      <p>
        CompanyNerve-authored source is licensed under the{" "}
        <a href="https://github.com/StefanDG1/companynerve/blob/main/LICENSE">
          MIT license
        </a>
        , including its permission to use, modify, distribute, and use the code
        commercially, subject to its notice requirements. Third-party material
        retains its own terms. These website terms do not reduce the rights
        granted by the applicable source-code licenses.
      </p>
      <p>
        You are responsible for your own deployed product, provider accounts,
        credentials, data, and customer terms. An exported app is not a managed
        service from CompanyNerve. Template tests and example configurations do
        not certify your deployment's security or legal compliance.
      </p>
      <h2>Ending access</h2>
      <p>
        You can stop using the service and request account deletion from Account
        settings. Transfer ownership or delete workspaces where you are the last
        owner first. Shared workspace content is managed separately from your
        personal account. We may restrict access to address unlawful use, abuse,
        or a security threat.
      </p>
      <h2>Availability and responsibility</h2>
      <p>
        The template's warranty and liability provisions are in its license. The
        hosted alpha is provided without a service-level commitment. Nothing in
        these terms excludes liability or consumer rights that applicable law
        does not allow us to exclude.
      </p>
      <h2>Questions, disputes, and updates</h2>
      <p>
        Contact <LegalContact /> with questions or complaints. Romanian law
        applies, without removing mandatory protections available to consumers
        under applicable law. Disputes remain subject to the courts with
        jurisdiction under that law.
      </p>
      <p>
        We may update these terms as the service changes. The date above
        identifies this version. The privacy policy separately explains how
        personal information is used.
      </p>
    </LegalPage>
  );
}
