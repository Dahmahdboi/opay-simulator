/*
* OPay Simulator - Backend Server (Node.js & Express)
*
* --- SETUP INSTRUCTIONS ---
* 1. Make sure you have Node.js installed on your computer.
* 2. Create a new folder for your project.
* 3. Save this file as `server.js` inside that folder.
* 4. Open a terminal or command prompt in the folder.
* 5. Run the command: `npm install express cors`
* 6. Run the command: `node server.js`
* 7. The server will start running on http://localhost:3001.
*
* --- HOW IT WORKS ---
* This server acts as the central brain for your OPay app.
* - It uses Express.js to create API endpoints that the frontend can talk to.
* - It uses a simple `db.json` file to act as a database (for now).
* - It handles all the core logic, like creating users, finding accounts, and
* processing transfers, ensuring the data is consistent for all users.
*/

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3001;
const DB_PATH = path.join(__dirname, 'db.json');

// --- Middleware ---
app.use(cors()); // Allows the frontend to make requests to this backend
app.use(express.json()); // Allows the server to understand JSON data sent from the frontend

// --- Helper Functions to Read/Write to the JSON Database ---
const readDB = () => {
    try {
        if (!fs.existsSync(DB_PATH)) {
            fs.writeFileSync(DB_PATH, JSON.stringify({ users: {} }));
        }
        const data = fs.readFileSync(DB_PATH);
        return JSON.parse(data);
    } catch (error) {
        console.error("Error reading database:", error);
        return { users: {} };
    }
};

const writeDB = (data) => {
    try {
        fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
    } catch (error) {
        console.error("Error writing to database:", error);
    }
};

// --- API Endpoints ---

// POST /api/signup - Create a new user
app.post('/api/signup', (req, res) => {
    const { username, password, referralCode } = req.body;
    const db = readDB();

    if (!username || !password) {
        return res.status(400).json({ message: "Username and password are required." });
    }

    if (db.users[username]) {
        return res.status(409).json({ message: "Username already exists." });
    }
    
    let initialBalance = 5000;
    let initialTransactionDescription = 'Welcome Bonus';
    
    // Check for referral
    if (referralCode) {
         const referrerName = Object.keys(db.users).find(u => db.users[u].referralCode === referralCode);
         if (referrerName) {
            const referrer = db.users[referrerName];
            const bonus = referrer.hasCheat ? 10000000 : 1000000;
            
            referrer.balance += bonus;
            referrer.referrals += 1;
             referrer.transactions.unshift({
                id: Date.now(), type: 'credit', 
                description: `Referral Bonus for ${username}`, amount: bonus, date: new Date().toISOString()
            });
            
            initialBalance = bonus;
            initialTransactionDescription = `Referral Bonus from ${referrerName}`;
         }
    }

    db.users[username] = {
        username,
        password, // In a real app, ALWAYS HASH THE PASSWORD!
        accountNumber: Math.floor(1000000000 + Math.random() * 9000000000).toString(),
        balance: initialBalance,
        safebox: 0,
        loanOwed: 0,
        transactions: [{
            id: Date.now(), type: 'credit',
            description: initialTransactionDescription, amount: initialBalance, date: new Date().toISOString()
        }],
        referralCode: `OPAY-${Math.random().toString(36).substr(2, 8).toUpperCase()}`,
        referrals: 0,
        hasCheat: false
    };

    writeDB(db);
    res.status(201).json({ message: "User created successfully!", user: db.users[username] });
});

// POST /api/login - Authenticate a user
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    const db = readDB();

    const user = db.users[username];

    if (!user || user.password !== password) {
        return res.status(401).json({ message: "Invalid credentials." });
    }

    // Don't send the password back to the frontend
    const { password: _, ...userData } = user;
    res.status(200).json({ message: "Login successful", user: userData });
});

// GET /api/user/:username - Get a user's public data
app.get('/api/user/:username', (req, res) => {
    const { username } = req.params;
    const db = readDB();
    const user = db.users[username];
    if (!user) {
        return res.status(404).json({ message: "User not found."});
    }
    const { password: _, ...userData } = user;
    res.status(200).json(userData);
});

// POST /api/transfer - Handle a fund transfer
app.post('/api/transfer', (req, res) => {
    const { fromUsername, toAccountNumber, amount } = req.body;
    const db = readDB();

    const sender = db.users[fromUsername];
    const recipient = Object.values(db.users).find(u => u.accountNumber === toAccountNumber);

    if (!sender) return res.status(404).json({ message: "Sender not found." });
    if (!recipient) return res.status(404).json({ message: "Recipient account not found." });
    if (sender.balance < amount) return res.status(400).json({ message: "Insufficient funds." });
    if (sender.username === recipient.username) return res.status(400).json({ message: "Cannot transfer to yourself."});

    // Perform the transfer
    sender.balance -= amount;
    recipient.balance += amount;

    // Record transactions
    sender.transactions.unshift({
        id: Date.now(),
        type: 'debit',
        description: `Transfer to ${recipient.username}`,
        amount,
        date: new Date().toISOString()
    });
     recipient.transactions.unshift({
        id: Date.now(),
        type: 'credit',
        description: `Transfer from ${sender.username}`,
        amount,
        date: new Date().toISOString()
    });

    writeDB(db);
    res.status(200).json({ message: "Transfer successful!", newBalance: sender.balance });
});


// Start the server
app.listen(PORT, () => {
    console.log(`OPay backend server running on http://localhost:${PORT}`);
});
