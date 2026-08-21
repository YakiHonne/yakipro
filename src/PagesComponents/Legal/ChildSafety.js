import React from "react";
import LegalDoc from "./LegalDoc";

// Unlisted policy served at /child-safety. Reachable by direct URL only — it is
// deliberately absent from LegalDoc's NAV_ITEMS, the landing footers, and is
// disallowed in robots.txt. Mirrors the /terms-app setup.
const SECTIONS = [
  { id: "prohibition", label: "Prohibition of CSAE" },
  { id: "csam", label: "CSAM" },
  { id: "reporting", label: "Reporting mechanism" },
  { id: "compliance", label: "Compliance with laws" },
  { id: "contact", label: "Point of contact" },
  { id: "enforcement", label: "Enforcement" },
];

export default function ChildSafety() {
  return (
    <LegalDoc
      eyebrow="Legal"
      title="Child Safety Standards"
      updated="August 20, 2026"
      current="/child-safety"
      sections={SECTIONS}
      showSwitcher={false}
    >
      <p>
        <strong>Effective Date:</strong> August 20, 2026
        <br />
        <strong>Operated by:</strong> JUSTHONNE TECHNOLOGY SDN BHD
      </p>
      <p>
        JUSTHONNE TECHNOLOGY SDN BHD is committed to protecting children and
        maintaining a safe environment on the YakiHonne and YakiPro platforms. We
        have zero tolerance for any form of child sexual abuse and exploitation
        (CSAE).
      </p>

      <h2 id="prohibition" data-legal-heading>
        1. Prohibition of Child Sexual Abuse and Exploitation (CSAE)
      </h2>
      <p>
        We strictly prohibit any content, behavior, or activity that involves,
        promotes, or facilitates:
      </p>
      <ul>
        <li>
          Child sexual abuse material (CSAM), including any visual depiction
          (photos, videos, drawings, or computer-generated imagery) of a minor
          engaged in sexually explicit conduct
        </li>
        <li>Grooming of children for sexual purposes</li>
        <li>Sexual exploitation or trafficking of children</li>
        <li>Sextortion or any form of coercion involving minors</li>
        <li>
          Any other content or conduct that sexually exploits, abuses, or
          endangers children
        </li>
      </ul>
      <p>
        Any user found creating, uploading, sharing, distributing, or soliciting
        such content will have their account permanently banned, and the content
        will be removed immediately.
      </p>

      <h2 id="csam" data-legal-heading>
        2. Child Sexual Abuse Material (CSAM)
      </h2>
      <p>
        We take appropriate action against CSAM upon obtaining actual knowledge
        of it. This includes:
      </p>
      <ul>
        <li>Immediate removal of the content</li>
        <li>Permanent suspension or termination of the responsible account(s)</li>
        <li>Preservation of relevant data as required by law</li>
        <li>
          Reporting confirmed CSAM to the appropriate authorities, including the
          National Center for Missing &amp; Exploited Children (NCMEC) or the
          relevant regional authority in the applicable jurisdiction
        </li>
      </ul>

      <h2 id="reporting" data-legal-heading>
        3. Reporting Mechanism
      </h2>
      <p>
        Users can report any suspected CSAE or CSAM content or behavior through
        the following channels:
      </p>
      <ul>
        <li>
          <strong>In-app reporting tools</strong> (available within the YakiHonne
          and YakiPro applications)
        </li>
        <li>
          Email: <span className="legal-doc-code">info@yakihonne.com</span>
        </li>
      </ul>
      <p>
        All reports are reviewed promptly. We encourage users to report any
        concerning content or behavior as soon as possible.
      </p>

      <h2 id="compliance" data-legal-heading>
        4. Compliance with Child Safety Laws
      </h2>
      <p>
        JUSTHONNE TECHNOLOGY SDN BHD complies with all applicable child safety
        laws and regulations, including but not limited to:
      </p>
      <ul>
        <li>
          Reporting confirmed CSAM to NCMEC or the relevant regional authority
        </li>
        <li>Cooperating with law enforcement investigations</li>
        <li>
          Maintaining internal processes for the detection, review, and removal
          of prohibited content
        </li>
      </ul>

      <h2 id="contact" data-legal-heading>
        5. Child Safety Point of Contact
      </h2>
      <p>
        For any inquiries related to child safety, CSAE, or CSAM on our
        platforms, please contact:
      </p>
      <p>
        <strong>JUSTHONNE TECHNOLOGY SDN BHD</strong>
        <br />
        V Office 1, Lingkaran SV, Sunway Velocity
        <br />
        55100 Kuala Lumpur, Wilayah Persekutuan Kuala Lumpur, Malaysia
      </p>
      <p>
        Email: <span className="legal-doc-code">info@yakihonne.com</span>
        <br />
        Phone: <span className="legal-doc-code">+601153919618</span>
      </p>
      <p>
        This designated contact is authorized to speak about our enforcement
        procedures and take necessary action when required.
      </p>

      <h2 id="enforcement" data-legal-heading>
        6. Enforcement
      </h2>
      <p>We reserve the right to:</p>
      <ul>
        <li>Remove any content that violates these standards</li>
        <li>
          Suspend or permanently ban accounts involved in CSAE or CSAM
        </li>
        <li>
          Report illegal activity to the relevant authorities without prior
          notice to the user
        </li>
        <li>Cooperate fully with law enforcement agencies</li>
      </ul>
      <p>
        These Child Safety Standards form part of our overall Terms of Service
        and Community Guidelines. Violation of these standards will result in the
        strongest possible enforcement actions.
      </p>

      <p>
        <strong>JUSTHONNE TECHNOLOGY SDN BHD</strong>
        <br />
        Last updated: August 20, 2026
      </p>
    </LegalDoc>
  );
}
