import sgMail from '@sendgrid/mail';

interface IMail {
  to: string;
  subject: string;
  message: string;
}

interface IEmailService {
  sendMail(mail: IMail): Promise<void>;
}

class SendGridEmailService implements IEmailService {
  constructor() {
    sgMail.setApiKey(process.env.SENDGRID_API_KEY!);
  }

  async sendMail(mail: IMail): Promise<void> {
    await sgMail.send({
      to: mail.to,
      from: 'supper',
      subject: mail.subject,
      text: mail.message,
    });
  }
}

const sendEmail = new SendGridEmailService();

sendEmail.sendMail({
  to: 'jeffreyigiemeh16@gmail.com',
  subject: '',
  message: '',
});

class EmailNotificationService {
  constructor(private emailService: IEmailService) {}

  async sendWelcomeEmail(userEmail: string) {
    await this.emailService.sendMail({
      to: userEmail,
      subject: 'Welcome to our App!',
      message: "You'r in, my dude",
    });
  }
}
