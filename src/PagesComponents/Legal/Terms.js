import React from "react";
import LegalDoc from "./LegalDoc";

const SECTIONS = [
  { id: "intro", label: "Introduction" },
  { id: "conduct", label: "Prohibited conduct" },
  { id: "content", label: "User content & IP" },
  { id: "subscriptions", label: "Subscriptions" },
  { id: "payment-methods", label: "Payment methods" },
  { id: "cancellation", label: "Cancellation" },
  { id: "yaki-points", label: "Yaki Points" },
  { id: "law", label: "Governing law" },
  { id: "warranty", label: "Warranty disclaimer" },
  { id: "contact", label: "Contact" },
];

export default function Terms() {
  return (
    <LegalDoc
      eyebrow="Legal"
      title="Terms and Conditions"
      updated="July 16, 2026"
      current="/terms"
      sections={SECTIONS}
    >
      <h2 id="intro" data-legal-heading>Introduction</h2>
      <p>
        These Terms and Conditions ("Terms") govern Your use of YakiPro (the "App"),
        operated by <strong>Yakihonne LLC</strong>, a Wyoming limited liability company with
        its principal address at 140 East Broadway, Jackson Hole, Wyoming, USA ("Company",
        "We", "Us"). By using the App, You agree to be bound by these Terms.
      </p>

      <h2 id="conduct" data-legal-heading>Prohibited conduct</h2>
      <ul>
        <li><strong>Prohibited content:</strong> uploading, sharing, or promoting content that is illegal, offensive, discriminatory, or violates the rights of others, including intellectual property rights.</li>
        <li><strong>Security compromise:</strong> engaging in activities that compromise the security of the App, its users, or any associated networks.</li>
        <li><strong>Spamming:</strong> unsolicited messages, advertisements, or any form of intrusive communication.</li>
        <li><strong>Misrepresentation:</strong> impersonation or fraudulent activity within the App.</li>
        <li><strong>Illegal activities:</strong> the App must not be used for any illegal purpose, and users are responsible for complying with applicable laws.</li>
      </ul>

      <h2 id="content" data-legal-heading>User content &amp; intellectual property</h2>
      <p>
        Users are solely responsible for the content they upload, share, or publish
        through the App. The Company disclaims any liability for user-generated content and
        reserves the right to moderate, remove, or disable content that violates these Terms.
      </p>
      <p>
        The Company retains all rights, title, and interest in and to the App, including its
        intellectual property. These Terms do not grant users any rights to use YakiPro's
        trade names, trademarks, service marks, logos, or other distinctive brand features.
      </p>

      <h2 id="subscriptions" data-legal-heading>Subscriptions</h2>
      <p>
        YakiPro offers subscription plans (currently: Free, Basic, Premium) that unlock
        additional publishing, analytics, and AI writing tools.
      </p>
      <ul>
        <li><strong>Free trial:</strong> new users receive a 7-day free trial of the Basic plan. The Company may, at its sole discretion, grant, extend, withhold, or decline to grant a trial to any user.</li>
        <li><strong>Price changes:</strong> the Company may change subscription prices at any time. If a price changes, any active subscription under the old price is cancelled at the end of its current billing period; continued access requires the user to resubscribe under the new pricing.</li>
        <li><strong>Renewal notices:</strong> for all payment methods, the Company will show in-app messages on three consecutive days before a subscription renews or is cancelled/expires, so users have advance notice.</li>
      </ul>

      <h2 id="payment-methods" data-legal-heading>Payment methods</h2>
      <table className="legal-doc-table">
        <thead>
          <tr><th>Method</th><th>How it works</th></tr>
        </thead>
        <tbody>
          <tr>
            <td>Stripe Checkout (web)</td>
            <td>Card payment completed entirely on Stripe's hosted checkout page; card cancellation and resumption are supported in-app.</td>
          </tr>
          <tr>
            <td>Lightning invoice (QR code)</td>
            <td>Payment is made outside the App using the user's own Lightning wallet and verified by the Company's server once settled. No in-app cancel button; the subscription is simply not renewed and access ends at period end.</td>
          </tr>
        </tbody>
      </table>

      <h2 id="cancellation" data-legal-heading>Cancellation</h2>
      <p>
        Subscriptions paid by card support explicit in-app cancellation and resumption at any
        time before the period ends. Subscriptions paid via Lightning do not have an explicit
        cancellation control, since there is no stored payment method to charge again; they
        simply expire automatically at the end of the paid period unless a new invoice is
        paid.
      </p>

      <h2 id="yaki-points" data-legal-heading>Yaki Points</h2>
      <p>
        Yaki Points are awarded for engaging with the platform (publishing, reactions, zaps,
        and other qualifying actions) and reflect a user's level and standing. They have no
        cash value, cannot be purchased, transferred, or exchanged for cash, and are not a
        means of payment for subscriptions or any other feature of the App.
      </p>

      <h2 id="law" data-legal-heading>Governing law</h2>
      <p>
        These Terms are governed by and construed in accordance with the laws of the United
        States, without regard to conflict of law principles.
      </p>

      <h2 id="warranty" data-legal-heading>Disclaimer of warranty</h2>
      <p>
        The App is provided "as is" without any warranty, express or implied, including but
        not limited to the implied warranties of fitness for a particular purpose or
        non-infringement. The Company does not warrant that the App will be error-free or
        uninterrupted, and makes no warranty regarding the quality, accuracy, reliability, or
        suitability of the App for any particular purpose.
      </p>

      <h2 id="contact" data-legal-heading>Contact</h2>
      <p>
        Questions about these Terms can be sent to{" "}
        <span className="legal-doc-code">info@yakihonne.com</span>
      </p>
    </LegalDoc>
  );
}
