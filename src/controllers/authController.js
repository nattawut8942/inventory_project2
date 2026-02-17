import axios from 'axios';
import jwt from 'jsonwebtoken';
import { sql, getPool } from '../config/db.js';

const SECRET_KEY = process.env.JWT_SECRET || 'your-secret-key-change-this-in-env';

export const login = async (req, res) => {
    // Handle both body and query parameters (for URL login support)
    const body = req.body || {};
    const query = req.query || {};

    // Case-insensitive check
    const username = body.username || body.Username || query.username || query.Username;
    const password = body.password || body.Password || query.password || query.Password;

    if (!username || !password) {
        return res.status(401).json({ success: false, message: 'Invalid username or password' });
    }

    try {
        const apiUrl = 'http://websrv01.dci.daikin.co.jp/BudgetCharts/BudgetRestService/api/authen';
        const response = await axios.get(apiUrl, {
            params: { username, password },
            timeout: 10000
        });

        if (response.data && response.status === 200) {
            // API returns array, get first element
            const apiData = Array.isArray(response.data) ? response.data[0] : response.data;

            // Debug: Log what Daikin API returns
            console.log('=== Daikin API Response ===');
            console.log(JSON.stringify(apiData, null, 2));
            console.log('===========================');

            // Check if we got valid data
            if (!apiData) {
                return res.status(401).json({ success: false, message: 'Invalid username or password' });
            }

            // Get user data - check multiple field name variations
            const empCode = apiData.EmpCode || apiData.empcode || apiData.Empcode || '';
            const shortName = apiData.ShortName || apiData.Shortname || apiData.shortname || apiData.empname || '';
            const empPic = apiData.EmpPic || apiData.Emppic || apiData.emppic || '';

            // Validate that API returned actual user data
            if (!empCode && !shortName) {
                return res.status(401).json({ success: false, message: 'Invalid username or password' });
            }

            // Check if user is admin from database
            const pool = getPool();
            const adminCheck = await pool.request()
                .input('username', sql.NVarChar, username.toLowerCase())
                .query('SELECT 1 FROM dbo.Stock_UserRole WHERE LOWER(Username) = @username');

            const isAdmin = adminCheck.recordset.length > 0;
            const role = isAdmin ? 'Staff' : 'User';

            // Generate JWT
            const token = jwt.sign(
                {
                    username: username,
                    role: role,
                    name: shortName || username,
                    empcode: empCode
                },
                SECRET_KEY,
                { expiresIn: '8h' }
            );

            res.json({
                success: true,
                token, // Send token for future use
                user: {
                    username,
                    role,
                    name: shortName || username,
                    empcode: empCode,
                    empPic: empPic
                }
            });
        } else {
            res.status(401).json({ success: false, message: 'Invalid username or password' });
        }
    } catch (error) {
        console.error('AD Auth Error:', error.message);
        if (error.response) {
            return res.status(401).json({ success: false, message: 'Invalid username or password' });
        }
        res.status(500).json({ success: false, message: 'Authentication service unavailable' });
    }
};
