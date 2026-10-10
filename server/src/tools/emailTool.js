import nodemailer from "nodemailer";
import { GoogleCalendarTool } from "./googleCalendarTool.js";
import { formatDateDMY } from "../utils/dateTimeUtils.js";

/**
 * Creates nodemailer transporter based on environment or creates a test account on the fly
 */
async function getTransporter() {
  const host = process.env.EMAIL_HOST || process.env.SMTP_HOST;
  const user = process.env.EMAIL_USER || process.env.SMTP_USER;
  const rawPass = process.env.EMAIL_PASS || process.env.SMTP_PASS;
  const port = Number(process.env.EMAIL_PORT || process.env.SMTP_PORT) || 465;

  if (host && user && rawPass) {
    const pass = rawPass.trim().replace(/\s+/g, "");
    const isSecure = port === 465 || process.env.EMAIL_SECURE === "true" || process.env.SMTP_SECURE === "true";

    console.log(`📡 [Email Tool] Connecting to SMTP server ${host}:${port} as ${user}...`);

    return {
      transporter: nodemailer.createTransport({
        host,
        port,
        secure: isSecure,
        auth: {
          user,
          pass
        }
      }),
      fromEmail: user
    };
  }

  // Fallback to real Ethereal SMTP test account for instant preview without requiring email credentials
  console.log("ℹ️ [Email Tool] No SMTP credentials configured. Generating Ethereal test inbox...");
  const testAccount = await nodemailer.createTestAccount();
  return {
    transporter: nodemailer.createTransport({
      host: "smtp.ethereal.email",
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass
      }
    }),
    fromEmail: testAccount.user
  };
}

export const EmailTool = {
  /**
   * Dispatches meeting invitation email to all confirmed attendees with Google Meet and .ics attachment
   */
  async sendMeetingInvite({ title, date, startTime, endTime, attendees = [], agenda = [], meetingLink = "" }) {
    try {
      console.log(`\n📧 [Email Tool] Preparing meeting invites for: ${attendees.join(", ")}...`);

      // Generate Google Calendar Link and .ics attachment with Google Meet
      const googleCalendarUrl = GoogleCalendarTool.generateGoogleCalendarUrl({
        title,
        date,
        startTime,
        endTime,
        attendees,
        agenda,
        meetingLink
      });

      // Development Safety Check: if EMAIL_ENABLED=false, simulate dispatch without emailing real accounts
      const isEmailEnabled = process.env.EMAIL_ENABLED === "true";
      if (!isEmailEnabled) {
        console.log(`ℹ️ [Email Tool - DEV MODE] Email dispatch is paused (EMAIL_ENABLED=false in .env).`);
        console.log(`✅ [Email Tool] Simulated successful delivery to: ${attendees.join(", ")}`);
        return {
          success: true,
          messageId: `<simulated-${Date.now()}@dev.local>`,
          previewUrl: null,
          googleCalendarUrl,
          recipients: attendees,
          isSimulated: true
        };
      }

      const { transporter, fromEmail } = await getTransporter();

      const icsContent = GoogleCalendarTool.generateIcsContent({
        title,
        date,
        startTime,
        endTime,
        attendees,
        agenda,
        meetingLink
      });

      const formattedDate = formatDateDMY(date);

      const htmlBody = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff; color: #1e293b;">
        <div style="background: linear-gradient(135deg, #1a73e8 0%, #4285f4 50%, #34a853 100%); padding: 22px; border-radius: 8px 8px 0 0; text-align: center; color: #ffffff;">
          <h1 style="margin: 0; font-size: 22px; font-weight: 700;">🎥 Google Meet Invitation Confirmed</h1>
          <p style="margin: 6px 0 0; opacity: 0.95; font-size: 14px;">Scheduled by AI Multi-Agent Meeting Scheduler</p>
        </div>

        <div style="padding: 24px;">
          <h2 style="font-size: 20px; color: #0f172a; margin-top: 0; font-weight: 700;">${title}</h2>
          
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <tr>
              <td style="padding: 8px 0; color: #64748b; font-size: 14px; width: 140px;">🗓️ Date:</td>
              <td style="padding: 8px 0; font-weight: bold; font-size: 14px; color: #0f172a;">${formattedDate}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b; font-size: 14px;">⏰ Time:</td>
              <td style="padding: 8px 0; font-weight: bold; font-size: 14px; color: #0f172a;">${startTime} - ${endTime}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b; font-size: 14px;">📹 Video Call:</td>
              <td style="padding: 8px 0; font-weight: bold; font-size: 14px;">
                <a href="${meetingLink}" target="_blank" style="color: #1a73e8; text-decoration: underline;">
                  ${meetingLink}
                </a>
              </td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b; font-size: 14px;">👥 Attendees:</td>
              <td style="padding: 8px 0; font-size: 14px; color: #334155;">${attendees.join(", ")}</td>
            </tr>
          </table>

          <div style="background-color: #f8fafc; border-left: 4px solid #1a73e8; padding: 12px 16px; margin-bottom: 24px; border-radius: 0 8px 8px 0;">
            <strong style="font-size: 14px; color: #334155;">Meeting Agenda:</strong>
            <ul style="margin: 8px 0 0; padding-left: 20px; font-size: 13px; color: #475569;">
              ${agenda.map(item => `<li>${item}</li>`).join("")}
            </ul>
          </div>

          <div style="text-align: center; margin: 30px 0; display: flex; justify-content: center; gap: 10px; flex-wrap: wrap;">
            <a href="${googleCalendarUrl}" target="_blank" style="background-color: #059669; color: #ffffff; text-decoration: none; padding: 12px 22px; border-radius: 8px; font-weight: bold; font-size: 14px; display: inline-block;">
              ➕ Add to Google Calendar
            </a>
            <a href="${meetingLink}" target="_blank" style="background-color: #1a73e8; color: #ffffff; text-decoration: none; padding: 12px 22px; border-radius: 8px; font-weight: bold; font-size: 14px; display: inline-block;">
              🎥 Join Google Meet
            </a>
          </div>

          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
          <p style="font-size: 12px; color: #94a3b8; text-align: center; margin: 0;">
            An interactive .ics calendar attachment configured with Google Meet has been attached to this email.
          </p>
        </div>
      </div>
      `;

      const mailOptions = {
        from: `"AI Meeting Scheduler" <${fromEmail}>`,
        to: attendees.join(", "),
        subject: `🎥 Google Meet Invitation: ${title} on ${formattedDate} at ${startTime}`,
        text: `Meeting: ${title}\nDate: ${formattedDate}\nTime: ${startTime} - ${endTime}\nGoogle Meet Link: ${meetingLink}\nAdd to Google Calendar: ${googleCalendarUrl}`,
        html: htmlBody,
        icalEvent: {
          filename: "invite.ics",
          method: "REQUEST",
          content: icsContent
        }
      };

      const info = await transporter.sendMail(mailOptions);
      const previewUrl = nodemailer.getTestMessageUrl(info);

      console.log(`✅ [Email Tool] Email successfully sent! Message ID: ${info.messageId}`);
      if (previewUrl) {
        console.log(`🔗 [Email Tool] Live Email Web Preview: ${previewUrl}`);
      }

      return {
        success: true,
        messageId: info.messageId,
        previewUrl: previewUrl || null,
        googleCalendarUrl,
        recipients: attendees
      };
    } catch (error) {
      console.error("❌ [Email Tool] Failed to send email:", error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }
};
