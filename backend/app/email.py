import os
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Optional

# ---------------------------------------------------------------------------
# Configuration (read from backend/.env, loaded by database.py at startup)
# ---------------------------------------------------------------------------
EMAIL_HOST = os.getenv("EMAIL_HOST", "smtp.gmail.com")
EMAIL_PORT = int(os.getenv("EMAIL_PORT", "587"))
EMAIL_USER = os.getenv("EMAIL_USER", "edunexus.infodesk@gmail.com")
# App passwords are stored without spaces; strip any accidental whitespace.
EMAIL_PASSWORD = (os.getenv("EMAIL_PASSWORD") or "").replace(" ", "")
EMAIL_FROM = os.getenv("EMAIL_FROM", "Edu Nexus <edunexus.infodesk@gmail.com>")
FRONTEND_BASE = os.getenv("FRONTEND_BASE", "http://localhost:5173")

PRIMARY = "#22e079"
PRIMARY_DARK = "#0b7a43"


def _html_shell(title: str, body_html: str) -> str:
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>{title}</title>
</head>
<body style="margin:0;padding:0;background:#0b0f0c;font-family:Inter,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0b0f0c;padding:32px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;width:100%;background:#0d1511;border:1px solid #1d2a23;border-radius:18px;overflow:hidden;">
          <tr>
            <td style="padding:28px 32px 8px;">
              <span style="display:inline-block;font-weight:900;letter-spacing:.12em;color:{PRIMARY};font-size:18px;">EDU NEXUS</span>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 32px 0;">
              <h1 style="margin:0;color:#f8fafc;font-size:22px;line-height:1.3;font-weight:800;">{title}</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:18px 32px 28px;color:#aeb8b2;font-size:15px;line-height:1.65;">
              {body_html}
            </td>
          </tr>
          <tr>
            <td style="padding:0 32px 28px;">
              <p style="margin:0;color:#68716c;font-size:12px;">&copy; {os.getenv('CURRENT_YEAR', '2026')} Edu Nexus. All rights reserved.<br/>This is an automated message, please do not reply.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""


def send_email(to: str, subject: str, html: str) -> bool:
    """Send an HTML email. Falls back to console logging if SMTP is not configured."""
    if not EMAIL_PASSWORD:
        print("\n=========================================")
        print("MOCK EMAIL DISPATCH")
        print(f"From: {EMAIL_FROM}")
        print(f"To: {to}")
        print(f"Subject: {subject}")
        print("--- HTML ---")
        print(html)
        print("=========================================\n")
        return False

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = EMAIL_FROM
        msg["To"] = to
        msg.attach(MIMEText(html, "html"))

        with smtplib.SMTP(EMAIL_HOST, EMAIL_PORT) as server:
            server.starttls()
            server.login(EMAIL_USER, EMAIL_PASSWORD)
            server.sendmail(EMAIL_FROM, to, msg.as_string())
        return True
    except Exception as e:
        print(f"[Email] Failed to send email to {to}: {e}")
        return False


def send_verification_email(to: str, code: str) -> bool:
    body = f"""
      <p>Welcome to Edu Nexus — we're glad to have you.</p>
      <p>To activate your account, please verify your email address using the 6-digit code below. Enter it in the app to continue.</p>
      <p style="text-align:center;margin:24px 0;">
        <span style="display:inline-block;font-size:32px;font-weight:900;letter-spacing:.3em;color:{PRIMARY};background:#0b1a12;border:1px solid #1d2a23;border-radius:12px;padding:14px 22px;">{code}</span>
      </p>
      <p>This code expires in 10 minutes. If you didn't create an Edu Nexus account, you can safely ignore this email.</p>
    """
    return send_email(to, "Verify your Edu Nexus email", _html_shell("Confirm your email", body))


def send_password_reset_email(to: str, token: str) -> bool:
    link = f"{FRONTEND_BASE}/forgot-password?token={token}"
    body = f"""
      <p>We received a request to reset your Edu Nexus password.</p>
      <p style="text-align:center;margin:24px 0;">
        <a href="{link}" style="display:inline-block;background:{PRIMARY};color:#04140b;font-weight:800;text-decoration:none;padding:14px 28px;border-radius:12px;">Reset my password</a>
      </p>
      <p>Or use this reset token in the app:</p>
      <p style="text-align:center;margin:16px 0;">
        <span style="display:inline-block;font-size:18px;font-weight:800;letter-spacing:.12em;color:{PRIMARY};background:#0b1a12;border:1px solid #1d2a23;border-radius:12px;padding:10px 16px;">{token}</span>
      </p>
      <p>This link and token expire in 1 hour. If you didn't request a password reset, you can safely ignore this email.</p>
    """
    return send_email(to, "Reset your Edu Nexus password", _html_shell("Password reset", body))


def send_notification_email(to: str, title: str, message: str, link: Optional[str] = None) -> bool:
    cta = ""
    if link:
        cta = f'<p style="text-align:center;margin:24px 0;"><a href="{link}" style="display:inline-block;background:{PRIMARY};color:#04140b;font-weight:800;text-decoration:none;padding:12px 24px;border-radius:12px;">View in Edu Nexus</a></p>'
    body = f"<p>{message}</p>{cta}"
    return send_email(to, title, _html_shell(title, body))


def send_account_setup_email(to: str, name: str, school_name: str, token: str) -> bool:
    """Welcome email for a newly created school-admin account. Sends a
    'set your password' link instead of a plaintext password."""
    link = f"{FRONTEND_BASE}/set-password?token={token}"
    reject_link = f"{FRONTEND_BASE}/reject-invitation?token={token}"
    body = f"""
      <p>Hi {name},</p><p>You’re invited to manage the <strong>{school_name}</strong> community on EduNexus.</p>
      <p>Accept by setting your password. This secure invitation expires in 7 days.</p>
      <p style="text-align:center;margin:24px 0;">
        <a href="{link}" style="display:inline-block;background:{PRIMARY};color:#04140b;font-weight:800;text-decoration:none;padding:14px 28px;border-radius:12px;">Accept invitation</a>
      </p>
      <p style="text-align:center"><a href="{reject_link}" style="color:#68716c">Decline invitation</a></p>
      <p>If the button doesn't work, copy and open this link:</p>
      <p style="word-break:break-all;color:{PRIMARY};">{link}</p>
      <p>Once activated, you can manage members, announcements, events, clubs, roles, and school moderation.</p>
    """
    return send_email(to, f"Your Edu Nexus admin account for {school_name}", _html_shell("Welcome, School Admin", body))


def notify(
    db,
    recipient: "object",
    type: str,
    title: str,
    body: str,
    link: Optional[str] = None,
    send_email_copy: bool = True,
) -> None:
    """Create an in-app notification and (optionally) email a copy to the recipient."""
    from backend.app.models import Notification

    notif = Notification(
        recipient_id=recipient.id,
        sender_id=None,
        type=type,
        title=title,
        body=body,
        link=link,
    )
    db.add(notif)
    db.commit()

    if send_email_copy and getattr(recipient, "is_email_verified", False):
        send_notification_email(recipient.email, title, body, link)
