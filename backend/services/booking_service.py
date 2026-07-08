import smtplib
import uuid
from datetime import datetime, timedelta, timezone
from email import encoders
from email.mime.base import MIMEBase
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from models import BookingRequest
from settings import Settings

APPOINTMENT_DURATION_MINUTES = 30


def _escape_ics_text(value: str) -> str:
    return value.replace("\\", "\\\\").replace(",", "\\,").replace(";", "\\;").replace("\n", "\\n")


def build_ics(request: BookingRequest) -> str:
    start = datetime.fromisoformat(request.appointment_datetime)
    end = start + timedelta(minutes=APPOINTMENT_DURATION_MINUTES)
    dtstamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    uid = f"{uuid.uuid4()}@smire.ai"

    description = (
        f"Reminder to confirm your appointment with {request.provider_name}. "
        f"Contact: {request.provider_contact}. This was not booked directly "
        f"with them — please call ahead to confirm."
    )
    if request.notes:
        description += f" Notes: {request.notes}"

    lines = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//SMIRE AI//Appointment Reminder//EN",
        "BEGIN:VEVENT",
        f"UID:{uid}",
        f"DTSTAMP:{dtstamp}",
        f"DTSTART:{start.strftime('%Y%m%dT%H%M%S')}",
        f"DTEND:{end.strftime('%Y%m%dT%H%M%S')}",
        f"SUMMARY:{_escape_ics_text(f'Appointment with {request.provider_name}')}",
        f"DESCRIPTION:{_escape_ics_text(description)}",
        f"LOCATION:{_escape_ics_text(request.provider_contact)}",
        "END:VEVENT",
        "END:VCALENDAR",
    ]
    return "\r\n".join(lines) + "\r\n"


def send_confirmation_email(request: BookingRequest, ics_content: str) -> None:
    msg = MIMEMultipart()
    msg["Subject"] = f"Your appointment reminder: {request.provider_name}"
    msg["From"] = Settings.SMTP_FROM
    msg["To"] = request.patient_email

    body = (
        f"Hi {request.patient_name},\n\n"
        f"This is a reminder for your requested appointment with "
        f"{request.provider_name} on {request.appointment_datetime}.\n\n"
        f"SMIRE AI found this contact info for them: {request.provider_contact}\n"
        f"Please call ahead to confirm — this reminder does not book the "
        f"appointment with them directly.\n\n"
        f"A calendar invite is attached.\n"
    )
    msg.attach(MIMEText(body, "plain"))

    attachment = MIMEBase("text", "calendar", method="PUBLISH", name="appointment.ics")
    attachment.set_payload(ics_content)
    encoders.encode_base64(attachment)
    attachment.add_header("Content-Disposition", "attachment", filename="appointment.ics")
    msg.attach(attachment)

    with smtplib.SMTP(Settings.SMTP_HOST, Settings.SMTP_PORT) as server:
        server.starttls()
        server.login(Settings.SMTP_USER, Settings.SMTP_PASSWORD)
        server.sendmail(Settings.SMTP_FROM, request.patient_email, msg.as_string())
