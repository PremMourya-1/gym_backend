const { Resend } = require("resend");

const resend = new Resend(process.env.RESEND_API_KEY);

const sendEmail = async ({ to, subject, html }) => {
  try {
    if (!to || !subject || !html) {
      throw new Error("Missing email parameters");
    }

    const data = await resend.emails.send({
      from: "Softwayx <otp@softwayx.in>",
      to,
      subject,
      html,
    });

    return data;
  } catch (error) {
    console.log("sendEmail error:", error);
    throw error;
  }
};

module.exports = sendEmail;
