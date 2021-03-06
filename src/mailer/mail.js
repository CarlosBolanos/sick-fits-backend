const nodemailer = require("nodemailer");

const transport = nodemailer.createTransport({
  host: process.env.MAIL_HOST,
  port: process.env.MAIL_PORT,
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASSWORD,
  },
});

const makeEmail = (text) => `
  <div className="email" style="border: 1px solid black; padding: 2-px; font-family="sans-serif" line-height="2" font-size: 20px;>
    <h2>Hello There</h2>
    <p>${text}</p>
  </div>
`;

exports.makeEmail = makeEmail;
exports.transport = transport;
