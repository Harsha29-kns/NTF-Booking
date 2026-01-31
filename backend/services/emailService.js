const nodemailer = require('nodemailer');

const sendOtpEmail = async (toEmail, otpCode) => {
    try {
        // Create Transporter
        // Uses environment variables for configuration
        // STARTTLS is standard for secure email
        const transporter = nodemailer.createTransport({
            service: process.env.EMAIL_SERVICE, // e.g. 'gmail'
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });

        // Email Content
        const mailOptions = {
            from: `"Ticket Gatekeeper" <${process.env.EMAIL_USER}>`,
            to: toEmail,
            subject: '🔐 Your Ticket Access Code',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                    <h2 style="color: #4F46E5; text-align: center;">Ticket Access Request</h2>
                    <p style="color: #666; font-size: 16px;">Hello,</p>
                    <p style="color: #666; font-size: 16px;">You requested to reveal your NFT Ticket QR code. Please use the following One-Time Password (OTP) to verify your identity:</p>
                    
                    <div style="background-color: #F3F4F6; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;">
                        <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #1F2937;">${otpCode}</span>
                    </div>

                    <p style="color: #666; font-size: 14px; text-align: center;">This code is valid for <strong>5 minutes</strong>.</p>
                    <p style="color: #999; font-size: 12px; text-align: center; margin-top: 30px;">If you did not request this code, please ignore this email.</p>
                </div>
            `
        };

        // Send Email
        const info = await transporter.sendMail(mailOptions);
        console.log(`[EmailService] OTP sent to ${toEmail}. MsgID: ${info.messageId}`);
        return true;

    } catch (error) {
        console.error('[EmailService] Failed to send email:', error);
        return false;
    }
};

module.exports = { sendOtpEmail };
