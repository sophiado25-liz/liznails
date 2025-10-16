import { google } from "googleapis";
import nodemailer from "nodemailer";

// Load environment variables
const SHEET_ID = process.env.SHEET_ID;
const SERVICE_ACCOUNT = JSON.parse(process.env.GOOGLE_CREDENTIALS);

// Auth Google Sheets
const auth = new google.auth.GoogleAuth({
  credentials: SERVICE_ACCOUNT,
  scopes: ["https://www.googleapis.com/auth/spreadsheets", "https://www.googleapis.com/auth/gmail.send"],
});

export const bookAppointment = async (req, res) => {
  try {
    const { name, phone, email, services, people, date, time, notes } = req.body;

    // Validate input
    if (!name || !email || !date || !time || !services.length)
      return res.status(400).json({ success: false, message: "Missing required fields" });

    const sheets = google.sheets({ version: "v4", auth });
    const sheetName = "LizNails_Bookings";

    // Fetch existing bookings
    const readRes = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: `${sheetName}!A2:H`,
    });

    const existing = readRes.data.values || [];
    const isConflict = existing.some(row => row[6] === date && row[7] === time);

    if (isConflict)
      return res.status(409).json({ success: false, message: "This time slot is already booked." });

    // Write new row
    await sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID,
      range: sheetName,
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [[
          new Date().toISOString(),
          name,
          phone,
          email,
          services.join(", "),
          people,
          date,
          time,
          notes || ""
        ]],
      },
    });

    // Send confirmation email
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailBody = `
Hi ${name},

Your appointment has been booked successfully!

🕓 Date: ${date}
🕒 Time: ${time}
💅 Services: ${services.join(", ")}
👥 People: ${people}
💬 Notes: ${notes || "—"}

Thank you for choosing Liz Nails 💖
`;

    await transporter.sendMail({
      from: `"Liz Nails" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Liz Nails Appointment Confirmation",
      text: mailBody,
    });

    await transporter.sendMail({
      from: `"Liz Nails" <${process.env.EMAIL_USER}>`,
      to: "liznails.ca@gmail.com",
      subject: "New Booking Received",
      text: mailBody,
    });

    return res.json({ success: true, message: "Appointment booked successfully!" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};
