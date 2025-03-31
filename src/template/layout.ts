export const baseEmailLayout = (
  header: string,
  content: string,
  primaryColor = "#079eff",
): string => `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
      body {
        font-family: Arial, sans-serif;
        background-color: #f9f9f9;
        margin: 0;
        padding: 0;
      }
      .email-container {
        max-width: 600px;
        margin: 20px auto;
        background: #fff;
        border: 1px solid #eaeaea;
        border-radius: 8px;
        overflow: hidden;
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
      }
      .header {
        background-color: ${primaryColor};
        color: white;
        padding: 20px;
        text-align: center;
      }
      .content {
        padding: 20px;
        text-align: left;
      }
      .footer {
        text-align: center;
        padding: 20px;
        font-size: 12px;
        color: #666;
        background: #f2f2f2;
      }
      a {
        color: ${primaryColor};
        text-decoration: none;
      }
    </style>
  </head>
  <body>
    <div class="email-container">
      ${header}
      <div class="content">
        ${content}
      </div>
      <div class="footer">
        <p>© ${new Date().getFullYear()} PayStell. All rights reserved.</p>
        <p>Need help? <a href="mailto:support@paystell.com">Contact Support</a></p>
      </div>
    </div>
  </body>
  </html>
`;
