const express = require('express');
const cors = require('cors');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

const app = express();
app.use(cors());
app.use(express.json());


app.get('/', (req, res) => {
    res.json({
        success: true,
        message: 'Tummala Finance API is running 🚀',
        whatsappConnected: isClientReady
    });
});
// -----------------------------------------
// 1. WHATSAPP CONNECTION SETUP
// -----------------------------------------
let isClientReady = false;

const whatsappClient = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: true,
        handleSIGINT: false,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu'
        ],
        navigationTimeout: 60000,
    }
});

// Event: QR Code generation
whatsappClient.on('qr', (qr) => {
    isClientReady = false;
    console.log('\n📱 SCAN THIS QR CODE WITH YOUR PHONE:');
    qrcode.generate(qr, { small: true });
});

// Event: Successfully authenticated
whatsappClient.on('ready', () => {
    isClientReady = true;
    console.log('\n=============================================');
    console.log('✅ TUMMALA FINANCE BOT IS CONNECTED!');
    console.log('=============================================\n');
});

// Event: Disconnected
whatsappClient.on('disconnected', (reason) => {
    isClientReady = false;
    console.log('❌ WhatsApp was logged out:', reason);
});

whatsappClient.initialize();

// -----------------------------------------
// 2. DATABASE & CONFIG
// -----------------------------------------
let users = []; 
let applications = [];
const otps = new Map(); 

const ADMIN_NUMBERS = ['8317625357', '9398843123', '9347176849'];

const formatWA = (num) => {
    let clean = num.replace(/\D/g, '');
    return (clean.startsWith('91') ? clean : `91${clean}`) + '@c.us';
};

// -----------------------------------------
// 3. API ROUTES: AUTHENTICATION
// -----------------------------------------

app.post('/api/auth/send-otp', async (req, res) => {
    if (!isClientReady) {
        return res.status(503).json({ 
            success: false, 
            message: "WhatsApp bot is starting up. Please wait 1 minute and try again." 
        });
    }

    const { phone, context } = req.body;
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const waId = formatWA(phone);
    otps.set(waId, otp);

    const msg = context === 'SIGNUP' 
        ? `🛡️ *TUMMALA FINANCE - VERIFYING USER*\n\nHello! To confirm your new profile, your verification code is: *${otp}*` 
        : `🔑 *TUMMALA FINANCE - LOGIN*\n\nWelcome back. Your secure access code is: *${otp}*`;

    try {
        await whatsappClient.sendMessage(waId, msg);
        console.log(`--> OTP [${otp}] sent to ${phone}`);
        res.json({ success: true });
    } catch (e) { 
        console.error("Failed to send WhatsApp message:", e.message);
        res.status(500).json({ success: false, message: "WhatsApp service error." }); 
    }
});

app.post('/api/auth/verify', (req, res) => {
    const { phone, otp } = req.body;
    const waId = formatWA(phone);
    
    if (otps.get(waId) === otp) {
        otps.delete(waId); 
        const raw = phone.replace(/\D/g, '').replace(/^91/, '');
        
        const user = users.find(u => u.phone === raw);
        const isAdmin = ADMIN_NUMBERS.includes(raw);
        
        res.json({ 
            success: true, 
            sessionType: isAdmin ? 'ADMIN' : (user ? 'MEMBER' : 'NEW_USER'), 
            userData: user 
        });
    } else {
        res.status(401).json({ success: false, message: "Invalid OTP" });
    }
});

app.post('/api/auth/register', (req, res) => {
    const { name, age, phone, address, pincode } = req.body;
    const raw = phone.replace(/\D/g, '').replace(/^91/, '');
    
    const profile = { name, age, phone: raw, address, pincode };
    const existingIndex = users.findIndex(u => u.phone === raw);

    if (existingIndex >= 0) {
        users[existingIndex] = profile; 
    } else {
        users.push(profile); 
    }
    
    res.json({ success: true, user: profile });
});

// -----------------------------------------
// 4. API ROUTES: LOANS
// -----------------------------------------

app.post('/api/loans/apply', async (req, res) => {
    const { name, phone, amount, purpose } = req.body;
    const rawPhone = phone.replace(/\D/g, '').replace(/^91/, '');
    const userProfile = users.find(u => u.phone === rawPhone) || {};

    const appData = { 
        id: Date.now(), 
        name,
        phone: rawPhone,
        amount,
        purpose,
        age: userProfile.age || 'N/A',
        address: userProfile.address || 'N/A',
        pincode: userProfile.pincode || 'N/A',
        status: 'Pending Review' 
    };
    
    applications.push(appData);
    
    if (isClientReady) {
        ADMIN_NUMBERS.forEach(admin => {
            whatsappClient.sendMessage(formatWA(admin), `💎 *NEW LOAN APPLICATION*\n\n*Name:* ${name}\n*Amount:* ₹${amount}\n*Purpose:* ${purpose}`);
        });
    }
    
    res.json({ success: true });
});

app.get('/api/loans/all', (req, res) => {
    res.json(applications);
});

app.post('/api/loans/update', async (req, res) => {
    const { id, status } = req.body;
    const appRecord = applications.find(a => a.id == id);
    
    if (appRecord && isClientReady) {
        appRecord.status = status; 
        const waId = formatWA(appRecord.phone);
        const customerMsg = `🏦 *TUMMALA FINANCE*\n\nYour loan for ₹${appRecord.amount} is now: *${status}*`;
        
        try {
            await whatsappClient.sendMessage(waId, customerMsg);
            res.json({ success: true });
        } catch(e) {
            res.json({ success: true, warning: "Updated but message failed."});
        }
    } else {
        res.status(404).json({ success: false });
    }
});

// -----------------------------------------
// 5. SERVER START & MIDDLEWARE
// -----------------------------------------

// FIXED: Added braces, corrected "headers", and added basic logic
function tokenverify(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(403).json({ success: false, message: "No token provided" });
    }
    // You can add your JWT verification logic here
    next();
}

const PORT = 5000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server is running on port ${PORT}`);
});