// Import required modules
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { Pool } = require('pg');
const nodemailer = require('nodemailer');

// Initialize Express app
const app = express();
const port = 3000;
app.use(cors());

// Middleware
app.use(bodyParser.json());

// Configure PostgreSQL connection
const pool = new Pool({
    user: 'postgres',          // PostgreSQL master username
    host: 'shopitomalldb.cnmqyakkw34h.eu-north-1.rds.amazonaws.com', // Host URL
    database: 'postgres', // Database name
    password: 'shopitomallpassword',  // PostgreSQL password
    port: 5432,  
    ssl: { rejectUnauthorized: false },               // Default PostgreSQL port
});

// Configure nodemailer
const transporter = nodemailer.createTransport({
    host: 'mail.shopitomall.com',
    port: 465,
    secure: true,
    auth: {
        user: 'otp@shopitomall.com',
        pass: 'k?252Ae{!5~z', // Replace with your SMTP password
    },
});

// OTP storage
const otpStore = new Map(); // To store email and corresponding OTP

// Create table if not exists
(async () => {
    const createTableQuery = `
        CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            name VARCHAR(100),
            email VARCHAR(100) UNIQUE,
            phone VARCHAR(15),
            country VARCHAR(50),
            submitted_from VARCHAR(50),
            submit_time TIMESTAMP,
            user_ip VARCHAR(50)
        );
    `;
    await pool.query(createTableQuery);
    console.log('Table created or already exists.');
})();

// API endpoint to send OTP
app.post('/send-otp', async (req, res) => {
    const { 
        "contact-email": email
    } = req.body;

    if (!email) {
        return res.status(400).json({ error: 'Email is required.' });
    }

    // Generate a 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000);

    // Store the OTP with a timestamp
    otpStore.set(email, { otp, expiresAt: Date.now() + 5 * 60 * 1000 }); // Expires in 5 minutes

    // Send email with the OTP
    const mailOptions = {
        from: 'otp@shopitomall.com',
        to: email,
        subject: 'Your OTP Code',
        text: `Your OTP code is ${otp}. It is valid for 5 minutes.`,
    };

    try {
        await transporter.sendMail(mailOptions);
        res.status(200).json({ message: 'OTP sent successfully.' });
    } catch (err) {
        console.error('Error sending OTP:', err);
        res.status(500).json({ error: 'Failed to send OTP.' });
    }
});

// API endpoint to validate OTP
app.post('/validate-otp', (req, res) => {
    const { 
        "contact-email": email,
        "contact-otp": otp
    } = req.body;

    if (!email || !otp) {
        return res.status(400).json({ error: 'Email and OTP are required.' });
    }

    const storedOtp = otpStore.get(email);

    if (!storedOtp) {
        return res.status(400).json({ error: 'No OTP found for this email.' });
    }

    if (storedOtp.expiresAt < Date.now()) {
        otpStore.delete(email);
        return res.status(400).json({ error: 'OTP has expired.' });
    }

    if (parseInt(otp, 10) !== storedOtp.otp) {
        return res.status(400).json({ error: 'Invalid OTP.' });
    }

    // OTP is valid, remove it from the store
    otpStore.delete(email);
    res.status(200).json({ message: 'OTP validated successfully.' });
});

// API endpoint to add a user
app.post('/add-user', async (req, res) => {
    const { 
        "contact-name": name, 
        "contact-email": email, 
        "contact-tel": phone, 
        "submitted_from": submittedFrom,
        "User_IP": userIp 
    } = req.body;

    const submitTime = req.body["submit_time"] || new Date().toISOString();

    // Validate required fields
    if (!name || !email || !phone) {
        return res.status(400).json({ error: 'All fields are required.' });
    }

    try {
        const query = `
            INSERT INTO users (name, email, phone, submitted_from, submit_time, user_ip) 
            VALUES ($1, $2, $3, $4, $5, $6) RETURNING *;
        `;
        const values = [name, email, phone, submittedFrom, submitTime, userIp];
        const result = await pool.query(query, values);
        res.status(201).json({ user: result.rows[0] });
    } catch (err) {
        console.error('Error inserting user:', err);
        res.status(500).json({ error: 'Internal server error.' });
    }
});

// API endpoint to get all users
app.get('/users', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM users');
        res.status(200).json({ users: result.rows });
    } catch (err) {
        console.error('Error fetching users:', err);
        res.status(500).json({ error: 'Internal server error.' });
    }
});

// Start the server
app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});
