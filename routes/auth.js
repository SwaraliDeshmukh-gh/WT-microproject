const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

// Helper function to generate a JWT token
const generateToken = (user) => {
    return jwt.sign(
        { 
            id: user._id, 
            role: user.role, 
            email: user.email 
        },
        process.env.JWT_SECRET,
        { expiresIn: '7d' } // Token valid for 7 days
    );
};

// 1. POST /api/auth/signup - Public Student Account Creation
router.post('/signup', async (req, res) => {
    try {
        const { name, studentId, className, division, department, email, phone, password } = req.body;

        // Check if email already exists
        const existingEmail = await User.findOne({ email: email ? email.toLowerCase() : '' });
        if (existingEmail) {
            return res.status(400).json({ error: 'Email address is already registered' });
        }

        // Check if studentId already exists
        if (studentId) {
            const existingStudentId = await User.findOne({ studentId });
            if (existingStudentId) {
                return res.status(400).json({ error: 'Student ID is already registered' });
            }
        }

        // Create new user, explicitly forcing role to 'student' for security
        const newUser = new User({
            name,
            studentId,
            className,
            division,
            department,
            email,
            phone,
            password,
            role: 'student' // Security requirement: Public signup can NEVER create an admin
        });

        const savedUser = await newUser.save();

        // Return user details without password
        const userResponse = {
            _id: savedUser._id,
            name: savedUser.name,
            studentId: savedUser.studentId,
            className: savedUser.className,
            division: savedUser.division,
            department: savedUser.department,
            email: savedUser.email,
            phone: savedUser.phone,
            role: savedUser.role,
            bio: savedUser.bio,
            profilePhoto: savedUser.profilePhoto,
            designation: savedUser.designation,
            accountStatus: savedUser.accountStatus,
            createdAt: savedUser.createdAt
        };

        res.status(201).json({
            message: 'Student account created successfully',
            user: userResponse
        });
    } catch (error) {
        if (error.name === 'ValidationError') {
            return res.status(400).json({ error: 'Validation error', message: error.message });
        }
        res.status(500).json({ error: 'Internal server error', message: error.message });
    }
});

// 2. POST /api/auth/login - Unified Login for Students and Admins
router.post('/login', async (req, res) => {
    try {
        const { identifier, password } = req.body; // 'identifier' can be email or studentId

        if (!identifier || !password) {
            return res.status(400).json({ error: 'Please provide identifier (email or student ID) and password' });
        }

        // Find user by email or studentId
        const user = await User.findOne({
            $or: [
                { email: identifier.toLowerCase().trim() },
                { studentId: identifier.trim() }
            ]
        });

        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials or account does not exist' });
        }

        // Verify password using User model method
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid credentials. Please check your password.' });
        }

        // Generate JWT token
        const token = generateToken(user);

        // Prepare user info response (excluding password)
        const userResponse = {
            _id: user._id,
            name: user.name,
            studentId: user.studentId,
            className: user.className,
            division: user.division,
            department: user.department,
            email: user.email,
            phone: user.phone,
            role: user.role,
            bio: user.bio,
            profilePhoto: user.profilePhoto,
            designation: user.designation,
            accountStatus: user.accountStatus,
            createdAt: user.createdAt
        };

        res.status(200).json({
            message: 'Login successful',
            token,
            user: userResponse
        });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error', message: error.message });
    }
});

// 3. GET /api/auth/me - Get currently authenticated user's information (Protected Route)
router.get('/me', protect, async (req, res) => {
    try {
        // req.user is attached by the protect middleware
        const user = await User.findById(req.user.id).select('-password');
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.status(200).json(user);
    } catch (error) {
        res.status(500).json({ error: 'Internal server error', message: error.message });
    }
});

// 4. PUT /api/auth/profile - Update currently authenticated user's profile info (Protected Route)
router.put('/profile', protect, async (req, res) => {
    try {
        const { name, className, division, department, email, phone, bio, designation, profilePhoto } = req.body;

        // Find the authenticated user
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // If email is provided and differs from the current one, verify it's unique
        if (email && email.toLowerCase() !== user.email.toLowerCase()) {
            const existingEmail = await User.findOne({ email: email.toLowerCase() });
            if (existingEmail) {
                return res.status(400).json({ error: 'Email address is already in use by another account' });
            }
            user.email = email;
        }

        // Update other allowed fields
        if (name !== undefined) user.name = name;
        if (user.role === 'student') {
            if (className !== undefined) user.className = className;
            if (division !== undefined) user.division = division;
        }
        if (department !== undefined) user.department = department;
        if (phone !== undefined) user.phone = phone;
        if (bio !== undefined) user.bio = bio;
        if (user.role === 'admin' && designation !== undefined) user.designation = designation;
        if (profilePhoto !== undefined) user.profilePhoto = profilePhoto;

        // Save the updated user
        const updatedUser = await user.save();

        // Return the updated user object directly (excluding password)
        res.status(200).json({
            _id: updatedUser._id,
            name: updatedUser.name,
            studentId: updatedUser.studentId,
            className: updatedUser.className,
            division: updatedUser.division,
            department: updatedUser.department,
            email: updatedUser.email,
            phone: updatedUser.phone,
            role: updatedUser.role,
            bio: updatedUser.bio,
            profilePhoto: updatedUser.profilePhoto,
            designation: updatedUser.designation,
            accountStatus: updatedUser.accountStatus,
            createdAt: updatedUser.createdAt
        });
    } catch (error) {
        if (error.name === 'ValidationError') {
            return res.status(400).json({ error: 'Validation error', message: error.message });
        }
        res.status(500).json({ error: 'Internal server error', message: error.message });
    }
});

// 5. PUT /api/auth/password - Update currently authenticated user's password (Protected Route)
router.put('/password', protect, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ error: 'Please provide both current and new passwords' });
        }

        // Find the authenticated user
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Verify the current password
        const isMatch = await user.comparePassword(currentPassword);
        if (!isMatch) {
            return res.status(400).json({ error: 'Incorrect current password' });
        }

        // Update to the new password
        user.password = newPassword;
        
        // Save the user (this triggers the pre-save hook in the User model to hash the new password)
        await user.save();

        // Return success response without generating a new token or returning the password
        res.status(200).json({
            message: 'Password updated successfully'
        });
    } catch (error) {
        if (error.name === 'ValidationError') {
            return res.status(400).json({ error: 'Validation error', message: error.message });
        }
        res.status(500).json({ error: 'Internal server error', message: error.message });
    }
});

module.exports = router;