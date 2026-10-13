#!/usr/bin/env python3
"""
SolWork Protocol — Cold Outreach Email Dispatcher
Author: Erioluwa Ayodeji
Official Sender: xxii.services@gmail.com
"""

import os
import sys
import time
import argparse
import getpass
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.utils import formataddr

# ---------------------------------------------------------
# CAMPAIGN RECIPIENTS & TAILORED EMAIL COPY
# ---------------------------------------------------------
LEADS = [
    {
        "id": "sahara",
        "name": "Sahara AI",
        "to": ["partnerships@saharaa.info", "bd@saharalabs.ai"],
        "subject": "Solana USDC Microtasking Pipeline for Sahara AI",
        "body": """Hi Sean & Sahara AI Team,

I built SolWork (built on Solana Anchor) — a non-custodial microtasking protocol that connects AI labs directly to thousands of English-fluent, STEM-educated contributors and developers in Nigeria.

Our PDA escrow vaults release task rewards in 400ms via SPL USDC upon milestone validation, completely bypassing the 15-25% remittance fees and account freezes of legacy platforms (Scale AI, Remotasks).

We want to run a 50-task pilot evaluation or code RLHF batch for Sahara to prove output speed and label accuracy.

Can we jump on a brief 5-minute call or can I send you a 30-second demo video this week?

Best regards,
Erioluwa Ayodeji
Founder, SolWork Protocol
Email: xxii.services@gmail.com
Demo: https://solwork.vercel.app"""
    },
    {
        "id": "allora",
        "name": "Allora Network",
        "to": ["contact@allora.network", "bd@upshot.xyz"],
        "subject": "Ground-Truth Human Feedback & Evaluation Feeds for Allora",
        "body": """Hi Nick & Allora Team,

We built SolWork on Solana: an on-chain, non-custodial microtasking engine that mobilizes human evaluators for model benchmarking, edge-case labeling, and LLM response ranking.

Tasks are escrowed in Anchor PDAs and settle in sub-second SPL USDC directly into worker wallets, connecting you with pre-qualified African engineering and data talent at zero platform friction.

We want to run a small test batch evaluating Allora inference topic outputs or ground-truth feeds.

Are you open to a 5-minute sync or a 30-second screen demo later this week?

Best,
Erioluwa Ayodeji
Lead Architect, SolWork Protocol
Email: xxii.services@gmail.com
Demo: https://solwork.vercel.app"""
    },
    {
        "id": "bagel",
        "name": "Bagel Network",
        "to": ["hello@bagel.net"],
        "subject": "Human Data Crowdsourcing via Solana Escrows for Bagel",
        "body": """Hi Bidhan,

We developed SolWork: a high-throughput microtasking protocol on Solana connecting dataset creators with vetted human annotators in Nigeria for computer vision, code audits, and RLHF.

Milestone payouts are locked in Anchor smart contracts and release in 400ms in SPL USDC upon honeypot validation, eliminating the banking delays of traditional crowdsourcing.

We’d like to host an experimental Bagel data collection or model validation task on the protocol.

Do you have 5 minutes this week to check out a quick 30-second demo?

Best,
Erioluwa Ayodeji
Founder, SolWork Protocol
Email: xxii.services@gmail.com
Demo: https://solwork.vercel.app"""
    },
    {
        "id": "masa",
        "name": "Masa Network",
        "to": ["partnerships@masa.ai"],
        "subject": "Human RLHF & Annotation Layer for Masa AI / Subnets",
        "body": """Hi Brendan & Calanthia,

We built SolWork on Solana: a decentralized human workforce layer for AI protocols and Bittensor subnets needing fast RLHF, sentiment calibration, and prompt filtering.

Campaigns are funded via PDA vaults in SPL USDC, paying pre-vetted Nigerian software engineers and annotators in under 1 second per approved task.

We can spin up a pilot task pool for Masa in under 24 hours to benchmark speed and data quality.

Would you be open to a 5-minute call or reviewing a short demo clip?

Warm regards,
Erioluwa Ayodeji
Lead Architect, SolWork Protocol
Email: xxii.services@gmail.com
Demo: https://solwork.vercel.app"""
    },
    {
        "id": "invisible",
        "name": "Invisible Technologies",
        "to": ["procurement@invisible.co", "info@invisible.co"],
        "subject": "Instant Micro-Payout & Workforce Rails for Invisible in Africa",
        "body": """Hi Francis & Invisible Ops,

We built SolWork: a decentralized microtasking and payout protocol on Solana that replaces slow international bank wires with sub-second SPL USDC settlements for distributed contractors.

It connects you directly to vetted Nigerian software engineers and STEM annotators for code synthesis, multimodal labeling, and red-teaming with zero remittance overhead.

We’d like to show you how SolWork can cut your international worker payout friction and administrative overhead.

Are you open to a brief 5-minute intro call this week?

Best regards,
Erioluwa Ayodeji
Founder, SolWork Protocol
Email: xxii.services@gmail.com
Demo: https://solwork.vercel.app"""
    },
    {
        "id": "alignerr",
        "name": "Alignerr (Labelbox)",
        "to": ["enterprise@labelbox.com", "support@alignerr.com"],
        "subject": "Compensating Elite African Technical Annotators via SolWork",
        "body": """Hello Alignerr Team,

We built SolWork on Solana: an on-chain milestone escrow protocol that connects AI alignment platforms with vetted Nigerian engineers and STEM graduates for code evaluation and technical RLHF.

Experts receive non-custodial SPL USDC in under 1 second upon passing benchmark honeypots, removing the international payout blocks common with traditional platforms.

We’d love to explore how SolWork can act as an instant onboarding and compensation pipeline for Alignerr’s technical talent in Africa.

Can we arrange a quick 5-minute demonstration?

Warm regards,
Erioluwa Ayodeji
Lead Architect, SolWork Protocol
Email: xxii.services@gmail.com
Demo: https://solwork.vercel.app"""
    },
    {
        "id": "lelapa",
        "name": "Lelapa AI & Masakhane",
        "to": ["hello@lelapa.ai", "info@masakhane.io"],
        "subject": "Zero-Fee Contributor Payout Rails for African Language Datasets",
        "body": """Dear Pelonomi & Masakhane Team,

We created SolWork on Solana: a mobile-friendly microtasking protocol that pays African language contributors in sub-second SPL USDC directly to their wallets.

It completely eliminates the 20%+ remittance fees and banking blocks of platforms like PayPal and Wise, allowing contributors to record audio, review translations, and get paid instantly.

We would be honored to host a free data collection pilot for your upcoming African language benchmarks on the platform.

Could we schedule a quick 5-minute call to show you the workflow?

Respectfully,
Erioluwa Ayodeji
Founder, SolWork Protocol
Email: xxii.services@gmail.com
Demo: https://solwork.vercel.app"""
    }
]

SENDER_NAME = "Erioluwa Ayodeji | SolWork Protocol"
SENDER_EMAIL = "xxii.services@gmail.com"
SMTP_HOST = "smtp.gmail.com"
SMTP_PORT = 465  # SSL


def load_env_password():
    """Attempt to load password from environment or .env file."""
    if os.environ.get("GMAIL_APP_PASSWORD"):
        return os.environ.get("GMAIL_APP_PASSWORD").strip().replace(" ", "")
    
    # Check .env in same directory
    env_file = os.path.join(os.path.dirname(__file__), ".env")
    if os.path.exists(env_file):
        with open(env_file, "r") as f:
            for line in f:
                if line.startswith("GMAIL_APP_PASSWORD="):
                    val = line.strip().split("=", 1)[1].strip("'\"")
                    return val.replace(" ", "")
    return None


def get_credentials():
    pwd = load_env_password()
    if not pwd:
        print("\n🔑 No GMAIL_APP_PASSWORD detected in environment or .env file.")
        print("Please enter your 16-character Google App Password (spaces will be stripped automatically):")
        pwd = getpass.getpass("App Password: ").strip().replace(" ", "")
    if not pwd:
        print("❌ Error: Password cannot be empty.")
        sys.exit(1)
    return pwd


def build_message(to_emails, subject, body_text):
    msg = MIMEMultipart("alternative")
    msg["From"] = formataddr((SENDER_NAME, SENDER_EMAIL))
    msg["To"] = ", ".join(to_emails)
    msg["Subject"] = subject
    msg["Reply-To"] = SENDER_EMAIL
    
    # Plain text version
    part = MIMEText(body_text, "plain", "utf-8")
    msg.attach(part)
    return msg


def send_single_mail(server, to_emails, subject, body_text):
    msg = build_message(to_emails, subject, body_text)
    server.sendmail(SENDER_EMAIL, to_emails, msg.as_string())


def main():
    parser = argparse.ArgumentParser(description="SolWork Protocol Email Dispatcher")
    parser.add_argument("--dry-run", action="store_true", help="Preview all queued emails without sending")
    parser.add_argument("--test", metavar="RECIPIENT", const=SENDER_EMAIL, nargs="?",
                        help=f"Send one test email to yourself (default: {SENDER_EMAIL}) to verify deliverability")
    parser.add_argument("--send", action="store_true", help="Send to all active leads in the queue")
    parser.add_argument("--lead", choices=[l["id"] for l in LEADS], help="Send only to a specific lead ID")

    args = parser.parse_args()

    print("=" * 68)
    print("🚀 SOLWORK PROTOCOL COLD OUTREACH DISPATCHER")
    print(f"   Official Sender: {SENDER_NAME} <{SENDER_EMAIL}>")
    print(f"   Total Leads Configured: {len(LEADS)}")
    print("=" * 68)

    # 1. DRY RUN PREVIEW
    if args.dry_run or (not args.test and not args.send):
        print("\n📋 PREVIEWING OUTREACH QUEUE (DRY RUN):\n")
        for idx, lead in enumerate(LEADS, 1):
            print(f"[{idx}/{len(LEADS)}] Target: {lead['name']} ({lead['id']})")
            print(f"    To: {', '.join(lead['to'])}")
            print(f"    Subject: {lead['subject']}")
            print("    --- Body Preview ---")
            for line in lead["body"].splitlines()[:5]:
                print(f"    {line}")
            print("    [...]")
            print("-" * 68)
        print("\n💡 Run with --test to send a test email to yourself first.")
        print("💡 Run with --send to send the live batch.")
        return

    # 2. TEST EMAIL TO SELF
    if args.test:
        test_recipient = args.test
        print(f"\n🧪 Sending test email to: {test_recipient}")
        password = get_credentials()

        sample_lead = LEADS[0]
        test_subject = f"[TEST VERIFICATION] {sample_lead['subject']}"
        test_body = f"--- THIS IS A LIVE TEST DISPATCH ---\nTarget Prototype: {sample_lead['name']}\n\n{sample_lead['body']}"

        try:
            print(f"Connecting securely to {SMTP_HOST}:{SMTP_PORT} via SSL...")
            with smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT) as server:
                server.login(SENDER_EMAIL, password)
                print("✅ Authentication successful!")
                send_single_mail(server, [test_recipient], test_subject, test_body)
                print(f"🎉 Test email sent successfully to {test_recipient}!")
                print("Check your inbox to verify appearance and links before sending to leads.")
        except Exception as e:
            print(f"\n❌ Error during test dispatch: {e}")
            sys.exit(1)
        return

    # 3. LIVE SEND
    if args.send:
        targets = [l for l in LEADS if l["id"] == args.lead] if args.lead else LEADS

        print(f"\n⚠️  READY TO DISPATCH TO {len(targets)} RECIPIENT(S):")
        for t in targets:
            print(f"  • {t['name']}: {', '.join(t['to'])}")
        
        confirm = input("\nType 'SEND' to confirm live dispatch: ").strip()
        if confirm != "SEND":
            print("❌ Dispatch aborted.")
            return

        password = get_credentials()

        try:
            print(f"\nConnecting securely to {SMTP_HOST}:{SMTP_PORT}...")
            with smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT) as server:
                server.login(SENDER_EMAIL, password)
                print("✅ Authenticated as", SENDER_EMAIL)
                print("Starting dispatch with 4-second polite delivery pacing...\n")

                for idx, lead in enumerate(targets, 1):
                    print(f"[{idx}/{len(targets)}] Sending to {lead['name']} ({', '.join(lead['to'])})...", end="", flush=True)
                    send_single_mail(server, lead["to"], lead["subject"], lead["body"])
                    print(" ✅ SENT")
                    if idx < len(targets):
                        time.sleep(4)  # Anti-spam delay

            print("\n🎉 ALL OUTREACH EMAILS DISPATCHED SUCCESSFULLY!")
            print(f"Sent {len(targets)} emails from {SENDER_EMAIL}.")
        except Exception as e:
            print(f"\n❌ Dispatch interrupted: {e}")
            sys.exit(1)


if __name__ == "__main__":
    main()
