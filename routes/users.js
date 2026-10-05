const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const User = require("../models/User");
const { protect, authorize } = require("../middleware/auth");

// Apply authentication and admin-only authorization to all routes in this file
router.use(protect);
router.use(authorize("admin"));

// 1. GET /api/users - Get all users
router.get("/", async (req, res) => {
    try {
        const users = await User.find({})
            .select("-password") // Never return passwords
            .sort({ createdAt: -1 }); // Newest first
            
        res.status(200).json(users);
    } catch (error) {
        res.status(500).json({ error: "Internal server error", message: error.message });
    }
});

// 2. GET /api/users/:id - Get a single user
router.get("/:id", async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ error: "Invalid User ID format" });
        }

        const user = await User.findById(req.params.id).select("-password");
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        res.status(200).json(user);
    } catch (error) {
        res.status(500).json({ error: "Internal server error", message: error.message });
    }
});

// 3. POST /api/users - Create a new user (Student or Admin)
router.post("/", async (req, res) => {
    try {
        const { name, studentId, className, department, division, email, phone, password, role, bio, designation, accountStatus } = req.body;

        // Validate that role is explicitly either "student" or "admin"
        if (role !== "student" && role !== "admin") {
            return res.status(400).json({ error: "Invalid role specified. Must be 'student' or 'admin'." });
        }

        // Verify email uniqueness
        if (email) {
            const existingEmail = await User.findOne({ email: email.toLowerCase() });
            if (existingEmail) {
                return res.status(400).json({ error: "Email address is already registered" });
            }
        }

        // Verify studentId uniqueness (only applies to students)
        if (role === "student" && studentId) {
            const existingStudentId = await User.findOne({ studentId });
            if (existingStudentId) {
                return res.status(400).json({ error: "Student ID is already registered" });
            }
        }

        // Construct base user object
        const newUserObj = {
            name,
            email,
            password,
            role
        };

        if (role === "student") {
            newUserObj.studentId = studentId;
            newUserObj.className = className;
            newUserObj.division = division;
        }
        
        if (phone !== undefined) newUserObj.phone = phone;
        if (department !== undefined) newUserObj.department = department;
        if (bio !== undefined) newUserObj.bio = bio;
        if (accountStatus !== undefined) newUserObj.accountStatus = accountStatus;
        if (role === "admin" && designation !== undefined) newUserObj.designation = designation;

        const newUser = new User(newUserObj);

        // The pre-save hook in User.js will automatically hash the password
        const savedUser = await newUser.save();

        // Prepare response without the password
        const userResponse = savedUser.toObject();
        delete userResponse.password;

        res.status(201).json(userResponse);
    } catch (error) {
        if (error.name === "ValidationError") {
            return res.status(400).json({ error: "Validation error", message: error.message });
        }
        res.status(500).json({ error: "Internal server error", message: error.message });
    }
});

// 4. PUT /api/users/:id - Edit an existing user
router.put("/:id", async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ error: "Invalid User ID format" });
        }

        const { name, studentId, className, department, division, email, phone, bio, designation, accountStatus } = req.body;
        
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        // Verify email uniqueness against OTHER users
        if (email && email.toLowerCase() !== user.email.toLowerCase()) {
            const existingEmail = await User.findOne({ email: email.toLowerCase() });
            if (existingEmail) {
                return res.status(400).json({ error: "Email address is already in use by another account" });
            }
        }

        // Apply explicitly allowed updates for both roles
        if (name !== undefined) user.name = name;
        if (email !== undefined) user.email = email;

        // Apply student-specific updates
        if (user.role === "student") {
            if (studentId && studentId !== user.studentId) {
                const existingStudentId = await User.findOne({ studentId });
                if (existingStudentId) {
                    return res.status(400).json({ error: "Student ID is already in use by another account" });
                }
            }
            if (studentId !== undefined) user.studentId = studentId;
            if (className !== undefined) user.className = className;
            if (division !== undefined) user.division = division;
        }

        if (department !== undefined) user.department = department;
        if (phone !== undefined) user.phone = phone;
        if (bio !== undefined) user.bio = bio;
        if (accountStatus !== undefined) user.accountStatus = accountStatus;
        if (user.role === "admin" && designation !== undefined) user.designation = designation;

        const updatedUser = await user.save();

        // Prepare response without the password
        const userResponse = updatedUser.toObject();
        delete userResponse.password;

        res.status(200).json(userResponse);
    } catch (error) {
        if (error.name === "ValidationError") {
            return res.status(400).json({ error: "Validation error", message: error.message });
        }
        res.status(500).json({ error: "Internal server error", message: error.message });
    }
});

// 5. DELETE /api/users/:id - Delete a user account
router.delete("/:id", async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ error: "Invalid User ID format" });
        }

        // Prevent the admin from accidentally deleting themselves
        if (req.params.id === req.user.id) {
            return res.status(400).json({ error: "You cannot delete your own admin account." });
        }

        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        // Prevent deleting admin accounts
        if (user.role === "admin") {
            return res.status(403).json({ error: "Admin accounts cannot be deleted through this endpoint." });
        }

        // Delete the user from MongoDB (Registrations will deliberately be left intact)
        await User.findByIdAndDelete(req.params.id);
        
        res.status(200).json({ message: "Student account deleted successfully" });
    } catch (error) {
        res.status(500).json({ error: "Internal server error", message: error.message });
    }
});

module.exports = router;