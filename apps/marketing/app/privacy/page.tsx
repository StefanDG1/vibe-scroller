import Link from "next/link";
import { company } from "@companynerve/company-config";
import { LegalPage, LegalContact } from "@/components/legal-page";

export const metadata = {
  title: "Privacy policy",
  description:
    "How account, workspace, and website information is used, and how to exercise your privacy rights.",
  alternates: { canonical: "/privacy" },
};

export default function Page() {
  return (
    <LegalPage title="Privacy policy">
      <h2>Who is responsible</h2>
      <p>
        {company.website.operator
          ? `${company.website.operator.name} is the controller of personal data used to operate ${company.product.name}.`
          : `The operator of ${company.product.name} is responsible for personal data used to run this service.`}
        {company.website.operator && (
          <>
            {" "}
            Our registered office is {company.website.operator.address}. See the{" "}
            <Link href="/legal">legal notice</Link> for company details.
          </>
        )}{" "}
        Contact <LegalContact /> for privacy questions or requests.
      </p>
      <p>
        This policy covers our website and hosted application. Products built
        from the template operate under their own owners, environments, and
        privacy policies.
      </p>
      <h2>Information we use</h2>
      <ul>
        <li>
          <strong>Website requests:</strong> our hosting provider processes
          technical request information, such as IP addresses, requested URLs,
          and browser information, to deliver the site and investigate errors or
          abuse. The public website has no advertising trackers or client
          analytics SDK.
        </li>
        <li>
          <strong>Account access:</strong> WorkOS processes your email address
          and authentication information for email-code or Google sign-in. The
          application stores your name, email address, and provider user ID. If
          you choose Google, basic identity information supports sign-in; the
          application does not read your Gmail or Drive content.
        </li>
        <li>
          <strong>Workspace activity:</strong> Convex stores memberships, roles,
          projects, invitations, and audit records. Inviting someone adds the
          email address supplied by the inviter. Members can access workspace
          content according to their roles; owners and administrators manage
          membership.
        </li>
        <li>
          <strong>Support:</strong> if you email us, we receive your email
          address, message, and any information you include. Send only what is
          needed to address your request.
        </li>
      </ul>
      <h2>Why we use it</h2>
      <p>
        We use account and workspace information to provide the service you
        request, on the basis of performing our agreement with you. We use
        technical records and support correspondence for our legitimate
        interests in operating and protecting the service and responding to
        inquiries. Where a law requires records or a response to an authority,
        processing is based on that legal obligation.
      </p>
      <p>
        Account information is needed to sign in and use workspaces. You can
        browse the public website without an account. We do not use workspace
        data for advertising profiles or make solely automated decisions that
        produce legal or similarly significant effects on you.
      </p>
      <h2>Cookies and preferences</h2>
      <p>
        The application uses authentication cookies to maintain your session and
        protect the sign-in process. Choosing a design recipe stores a
        preference cookie. Blocking these cookies can prevent sign-in or stop
        your design preference from being remembered.
      </p>
      <h2>Service providers and payments</h2>
      <p>
        We use Vercel for hosting, Convex for application data, and WorkOS for
        authentication and email codes. Google participates when you choose
        Google sign-in. These services receive information needed for their
        respective functions. Access to GitHub or other external links is
        governed by those services' own privacy notices.
      </p>
      <p>
        {company.website.kind === "template"
          ? "CompanyNerve has no live paid subscription offering at this release. Its template includes an optional Stripe billing integration."
          : "If this product offers subscriptions, Stripe processes payments on its hosted pages."}{" "}
        When that integration is used, the application stores customer and
        subscription references and billing status, not full card details.
        Stripe maintains its own transaction records.
      </p>
      <p>
        Providers may process information outside the European Economic Area.
        Applicable data protection law requires a valid transfer mechanism, such
        as an adequacy decision or appropriate contractual safeguards. Contact{" "}
        <LegalContact /> for information about the arrangements relevant to your
        data. We do not claim that all processing stays in Romania or the
        European Union.
      </p>
      <h2>Retention, export, and deletion</h2>
      <p>
        Account and workspace records remain available while needed to provide
        the service. You can export account data and request deletion from
        Account settings. Workspace owners can export or delete their workspace.
        If you are its last owner, transfer ownership or delete the workspace
        before deleting your account.
      </p>
      <p>
        Account deletion blocks application access while a background job
        removes the identity and profile. It does not erase content or audit
        records belonging to a shared workspace. Contact us if deletion does not
        complete or if a record requires review.
      </p>
      <p>
        Technical logs, backups, and support correspondence have separate
        retention periods based on operational needs, security investigations,
        and any applicable recordkeeping obligations. Deleting an account does
        not promise immediate removal from every provider backup. Contact us for
        the retention information applicable to a particular record.
      </p>
      <h2>Your rights</h2>
      <p>
        Subject to the conditions in data protection law, you can request
        access, correction, deletion, restriction, or portability of your
        personal data. You can object to processing based on legitimate
        interests. Where processing relies on consent, you can withdraw it
        without affecting earlier lawful processing.
      </p>
      <p>
        Send requests to <LegalContact />. We may need information to verify
        your identity. We respond within the periods required by applicable law,
        normally one month; if an extension is permitted and needed, we will
        explain it. You can also complain to{" "}
        <a href="https://www.dataprotection.ro/?page=Plangeri_pagina_principala">
          Romania's data protection authority, ANSPDCP
        </a>
        , or to the competent supervisory authority where you live or work.
      </p>
      <h2>Changes to this policy</h2>
      <p>
        We update this page when the service or its data practices change. The
        date above identifies the current version. For questions, contact us by
        email rather than posting personal information in a public issue.
      </p>
    </LegalPage>
  );
}
