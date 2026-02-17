import nodemailer from 'nodemailer';
import { sql, getPool } from '../config/db.js';

export const sendDailyReport = async () => {
    try {
        const pool = getPool();
        const result = await pool.request().query("SELECT ProductID, ProductName, CurrentStock, MinStock FROM dbo.Stock_Products WHERE CurrentStock <= MinStock AND IsActive = 1");

        if (result.recordset.length === 0) {
            console.log('No low stock items to report.');
            return { success: true, message: 'No low stock items' };
        }

        const items = result.recordset.map(item =>
            `<tr><td>${item.ProductName}</td><td>${item.CurrentStock}</td><td>${item.MinStock}</td></tr>`
        ).join('');

        const transporter = nodemailer.createTransport({
            host: '192.168.226.24',
            port: 25,
            secure: false,
            tls: { rejectUnauthorized: false }
        });

        const mailOptions = {
            from: '"IT Stock System" <noreply@dci.daikin.co.jp>',
            to: 'harit.j@dci.daikin.co.jp',
            subject: 'Daily Low Stock Report',
            html: `
                <h2>Low Stock Alert</h2>
                <table border="1" cellpadding="5" cellspacing="0">
                    <tr><th>Product</th><th>Current</th><th>Min</th></tr>
                    ${items}
                </table>
            `
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('Email sent:', info.messageId);
        return { success: true, messageId: info.messageId };

    } catch (error) {
        console.error('Email Error:', error);
        return { success: false, error: error.message };
    }
};