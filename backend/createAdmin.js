require("dotenv").config({ path: "../.env" });
const mongoose = require("mongoose");
const User = require("../models/User");

// Check if all required environment variables for the admin are provided
if (!process.env.ADMIN_NAME || !process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD) {
    console.error("Error: Missing required environment variables (ADMIN_NAME, ADMIN_EMAIL, ADMIN_PASSWORD).");
    console.error("Please add them to your .env file before running this script.");
    process.exit(1);
}

const ADMIN_DETAILS = {
    name: process.env.ADMIN_NAME,
    email: process.env.ADMIN_EMAIL,
    password: process.env.ADMIN_PASSWORD,
    role: "admin" // Role is fixed securely inside the script
};

const createAdminAccount = async () => {
    try {
        // Connect to MongoDB using the project connection string
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("Connected to MongoDB...");

        // Check if an admin or user with this email already exists
        const existingUser = await User.findOne({ email: ADMIN_DETAILS.email.toLowerCase().trim() });
        if (existingUser) {
            console.log(`An account with the email '${ADMIN_DETAILS.email}' already exists. Admin creation skipped.`);
            await mongoose.connection.close();
            process.exit(0);
        }

        // Create new admin instance (passing through User model so bcrypt hashes the password)
        const adminUser = new User({
            name: ADMIN_DETAILS.name,
            email: ADMIN_DETAILS.email,
            password: ADMIN_DETAILS.password,
            role: "admin"
        });

        await adminUser.save();
        console.log("Admin account created successfully!");

        // Close MongoDB connection
        await mongoose.connection.close();
        process.exit(0);
    } catch (error) {
        console.error("Failed to create admin account:", error.message);
        try {
            await mongoose.connection.close();
        } catch (closeError) {
            // Ignore if connection wasn't fully established
        }
        process.exit(1);
    }
};

createAdminAccount();