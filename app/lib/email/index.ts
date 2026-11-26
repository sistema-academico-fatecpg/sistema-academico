export {
  accountActivationEmail,
  emailConfirmationCodeEmail,
  emailTemplates,
  passwordResetEmail,
  securityAlertEmail,
  testAccountsSummaryEmail,
} from "./templates";
export {
  ConsoleEmailTransport,
  createEmailTransport,
  type EmailMessage,
  type EmailSendResult,
  type EmailTransport,
  maskEmail,
  ResendEmailTransport,
  sendEmail,
  setEmailTransportForTests,
} from "./transport";
