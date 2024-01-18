const nodemailer = require("nodemailer");
const ejs = require("ejs");

async function send_mail(to, subject, body, attachments) {
  const transporter = nodemailer.createTransport({
    host: "cyechamp.com",
    port: 465,
    secure: true,
    auth: {
      user: 'noreply@cyechamp.com',
      pass: 'byGS74w7a,IS'
    }
  });

  async function main() {
    const info = await transporter.sendMail({
      from: 'noreply@cyechamp.com', // sender address
      to: to, // list of receivers
      subject: subject, // Subject line
      text: body, // plain text body
      attachments: attachments
    });
    console.log("Message sent: %s", info.messageId);
  }

  main().catch(console.error);

}

async function send_templates_mails(to, subject, template, message, target_id) {
  ejs.renderFile(__dirname + template, { message1: message.data1, message2: message.data2, task_id: target_id }, async function (err, htmlTemplate) {
    const transporter = nodemailer.createTransport({
      host: "cyechamp.com",
      port: 465,
      secure: true,
      auth: {
        user: 'noreply@cyechamp.com',
        pass: 'byGS74w7a,IS'
      }
    });

    async function main() {
      const info = await transporter.sendMail({
        from: 'noreply@cyechamp.com', // sender address
        to: to, // list of receivers
        subject: subject, // Subject line
        html: htmlTemplate,
        attachments: []
      });
      console.log("Message sent: %s", info.messageId);
    }

    main().catch(console.error);
  });

}
async function send_template_mail(msg) {
  try {
    const transporter = nodemailer.createTransport({
      host: "cyechamp.com",
      port: 465,
      secure: true,
      auth: {
        user: 'noreply@cyechamp.com',
        pass: 'byGS74w7a,IS'
      }
    })
    return transporter.sendMail(msg)
  } catch (error) {
    console.error(error);

    if (error.response) {
      console.error(error.response.body)
      return error.response.body
    }
  }

}

async function sendEmailVerifyLink(to, subject, template, message) {
  ejs.renderFile(__dirname + template, { link: message.link }, async function (err, htmlTemplate) {
    try {
      const transporter = nodemailer.createTransport({
        host: "cyechamp.com",
        port: 465,
        secure: true,
        auth: {
          user: 'noreply@cyechamp.com',
          pass: 'byGS74w7a,IS'
        }
      })
      const info = await transporter.sendMail({
        to: to,
        from: 'noreply@cyechamp.com',
        subject: subject,
        html: htmlTemplate,
        attachments: [],
      })

    } catch (error) {
      console.error(error);

      if (error.response) {
        console.error(error.response.body)
        return error.response.body
      }
    }
  })
}

module.exports.send_mail = send_mail;
module.exports.send_templates_mails = send_templates_mails;
module.exports.send_template_mail = send_template_mail;
module.exports.sendEmailVerifyLink = sendEmailVerifyLink;