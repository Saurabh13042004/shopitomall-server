// Import required modules
const express = require('express');
const bodyParser = require('body-parser');
const { Pool } = require('pg');

// Initialize Express app
const app = express();
const port = 3000;

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

// API endpoint to add a user
app.post('/add-user', async (req, res) => {
    const { 
        "contact-name": name, 
        "contact-email": email, 
        "contact-tel": phone, 
        "contact-country": country, 
        "submitted_from": submittedFrom,
        "User_IP": userIp 
    } = req.body;

    const submitTime = req.body["submit_time"] || new Date().toISOString();

    if (!name || !email || !phone || !country ) {
        return res.status(400).json({ error: 'All fields are required.' });
    }

    try {
        const query = `
            INSERT INTO users (name, email, phone, country, submitted_from, submit_time, user_ip) 
            VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *;
        `;
        const values = [name, email, phone, country, submittedFrom, submitTime, userIp];
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
