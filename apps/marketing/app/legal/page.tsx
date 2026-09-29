import { notFound } from "next/navigation";
import { company } from "@companynerve/company-config";
import { LegalPage, LegalContact } from "@/components/legal-page";

export const metadata = {
  title: "Legal notice",
  description: `Company registration and contact details for the operator of ${company.product.name}.`,
  alternates: { canonical: "/legal" },
};

export default function Page() {
  const operator = company.website.operator;
  if (!operator) notFound();
  return (
    <LegalPage title="Legal notice">
      <h2>Website operator</h2>
      <p>
        {company.product.name} is operated by {operator.name}.
      </p>
      <dl className="operator-details">
        <dt>Registered company</dt>
        <dd>{operator.name}</dd>
        <dt>Registered office</dt>
        <dd>
          <address style={{ fontStyle: "normal" }}>{operator.address}</address>
        </dd>
        <dt>Tax identification number (CUI)</dt>
        <dd>{operator.taxId}</dd>
        <dt>Trade Register number</dt>
        <dd>{operator.tradeRegister}</dd>
        <dt>European Unique Identifier (EUID)</dt>
        <dd>{operator.euid}</dd>
        <dt>Contact</dt>
        <dd>
          <LegalContact />
        </dd>
      </dl>
      <h2>Contact and complaints</h2>
      <p>
        For support, privacy requests, or complaints about{" "}
        {company.product.name}, email <LegalContact />. Describe the issue and
        include an account email if relevant. Do not send passwords, one-time
        codes, or provider secrets.
      </p>
      {company.website.kind === "template" && (
        <>
          <h2>About CompanyNerve</h2>
          <p>
            CompanyNerve provides an open-source SaaS template, documentation,
            and a hosted example application. The template is free. There is no
            live paid subscription offering at this release.
          </p>
          <p>
            CompanyNerve-authored source is available under the MIT license.
            Third-party components retain their own licenses. Independently
            deployed products have their own operators and legal notices.
          </p>
        </>
      )}
    </LegalPage>
  );
}
