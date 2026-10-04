require("dotenv").config({ path: ".env" });

const express = require("express");
const mongoose = require("mongoose");
const eventRoutes = require("../routes/events");
const registrationRoutes = require("../routes/registrations");
const authRoutes = require("../routes/auth"); // Added auth routes import
const userRoutes = require("../routes/users");
const cors = require("cors");

const app = express();

const PORT = process.env.PORT || 8000;

// Middleware to parse incoming JSON payloads
app.use(express.json());
app.use(cors());

app.get("/", (req, res) => {
    res.send("College Events Backend is running!");
});

// Mount Event, Registration, and Auth APIs
app.use("/api/events", eventRoutes);
app.use("/api/registrations", registrationRoutes);
app.use("/api/auth", authRoutes); // Mounted auth routes at /api/auth
app.use("/api/users", userRoutes);

mongoose.connect(process.env.MONGODB_URI)
    .then(() => {
        console.log("MongoDB connected successfully!");

        app.listen(PORT, () => {
            console.log(`Server running on http://localhost:${PORT}`);
        });
    })
    .catch((error) => {
        console.error("MongoDB connection failed:");
        console.error(error.message);
    });