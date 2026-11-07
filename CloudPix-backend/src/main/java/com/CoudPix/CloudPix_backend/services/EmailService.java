package com.CoudPix.CloudPix_backend.services;

import com.CoudPix.CloudPix_backend.config.MailProperties;
import com.CoudPix.CloudPix_backend.domain.User;
import jakarta.mail.internet.MimeMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

@Service
public class EmailService {

    private static final Logger log = LoggerFactory.getLogger(EmailService.class);

    private final MailProperties mailProperties;
    private final ObjectProvider<JavaMailSender> mailSenderProvider;

    public EmailService(
            MailProperties mailProperties,
            ObjectProvider<JavaMailSender> mailSenderProvider
    ) {
        this.mailProperties = mailProperties;
        this.mailSenderProvider = mailSenderProvider;
    }

    public void sendVerificationEmail(User user, String token, String code) {
        String verificationUrl = mailProperties.frontendUrl().replaceAll("/+$", "") + "/verify-email?token=" + token;

        log.info("Preparing verification email for user: {} (email: {}). OTP Code: {}, Verification Link: {}",
                user.getId(), user.getEmail(), code, verificationUrl);

        JavaMailSender mailSender = mailSenderProvider.getIfAvailable();
        if (mailSender == null || !mailProperties.enabled()) {
            log.info("[SIMULATED EMAIL] To: {} | Subject: Verify your CloudPix Email | Code: {} | Link: {}",
                    user.getEmail(), code, verificationUrl);
            return;
        }

        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom(mailProperties.from());
            helper.setTo(user.getEmail());
            helper.setSubject("Verify your CloudPix email address");
            helper.setText(buildHtmlEmail(user.getDisplayName(), verificationUrl, code), true);

            mailSender.send(message);
            log.info("Verification email sent successfully to {}", user.getEmail());
        } catch (Exception e) {
            log.warn("Failed to deliver verification email via SMTP to {}. Reason: {}. Code remains valid: {}",
                    user.getEmail(), e.getMessage(), code);
        }
    }

    private String buildHtmlEmail(String displayName, String verificationUrl, String code) {
        return """
                <!DOCTYPE html>
                <html>
                <head>
                  <meta charset="utf-8">
                  <meta name="viewport" content="width=device-width, initial-scale=1.0">
                  <style>
                    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f7f6f9; margin: 0; padding: 24px; color: #222; }
                    .card { max-width: 540px; margin: 0 auto; background: #ffffff; border-radius: 20px; padding: 40px; box-shadow: 0 10px 30px rgba(0,0,0,0.06); }
                    .logo { font-size: 24px; font-weight: 700; color: #6d28d9; letter-spacing: -0.5px; }
                    h2 { font-size: 22px; margin-top: 24px; color: #1e1b2e; }
                    p { font-size: 15px; line-height: 1.6; color: #555; }
                    .btn { display: inline-block; background-color: #7c3aed; color: #ffffff !important; padding: 14px 28px; border-radius: 12px; font-weight: 600; text-decoration: none; margin: 24px 0; }
                    .otp-box { background: #f3f0fa; border-radius: 12px; padding: 16px; text-align: center; margin: 20px 0; font-size: 26px; font-weight: 800; letter-spacing: 6px; color: #5b21b6; }
                    .footer { font-size: 12px; color: #888; margin-top: 32px; text-align: center; line-height: 1.5; }
                  </style>
                </head>
                <body>
                  <div class="card">
                    <div class="logo">CloudPix</div>
                    <h2>Welcome to CloudPix, %s!</h2>
                    <p>Thank you for signing up. Please verify your email address to secure your account and start organizing and preserving your memories.</p>
                    <div style="text-align: center;">
                      <a href="%s" class="btn">Verify My Email</a>
                    </div>
                    <p style="text-align: center; font-size: 13px; color: #777;">Or enter this 6-digit verification code in the app:</p>
                    <div class="otp-box">%s</div>
                    <p class="footer">This verification link and code will expire in 24 hours.<br>If you did not create an account with CloudPix, you can safely ignore this email.</p>
                  </div>
                </body>
                </html>
                """.formatted(displayName, verificationUrl, code);
    }
}

