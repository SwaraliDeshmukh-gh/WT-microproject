const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const Registration = require("../models/Registration");
const Event = require("../models/event");
const User = require("../models/User");
const { protect, authorize } = require("../middleware/auth");

// 1. POST /api/registrations - Create a new registration (Requires logged-in student)
router.post("/", protect, authorize("student"), async (req, res) => {
    try {
        const { event: eventId } = req.body;

        // Validate event ID presence
        if (!eventId) {
            return res.status(400).json({ error: "Event ID is required" });
        }

        // Validate MongoDB ObjectId format for event
        if (!mongoose.Types.ObjectId.isValid(eventId)) {
            return res.status(400).json({ error: "Invalid Event ID format" });
        }

        // Fetch the logged-in user to securely obtain their verified student details
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ error: "User account not found" });
        }

        // Find the Event
        const event = await Event.findById(eventId);
        if (!event) {
            return res.status(404).json({ error: "Event not found" });
        }

        // Check whether registration is open for that event
        if (event.status && event.status.toLowerCase().includes("closed")) {
            return res.status(400).json({ error: "Registration is closed for this event" });
        }

        // Check whether the registration deadline has passed
        if (event.deadline && new Date() > new Date(event.deadline)) {
            return res.status(400).json({ error: "Registration deadline has passed" });
        }

        // Check whether the same student already has a Confirmed registration for that event
        const existingActiveRegistration = await Registration.findOne({
            event: eventId,
            studentId: user.studentId,
            status: "Confirmed"
        });

        if (existingActiveRegistration) {
            return res.status(409).json({ error: "Active registration already exists for this event" });
        }

        // Count all Confirmed registrations for that event
        const confirmedCount = await Registration.countDocuments({
            event: eventId,
            status: "Confirmed"
        });

        // Compare count with Event.totalSeats
        if (confirmedCount >= event.totalSeats) {
            return res.status(400).json({ error: "Event is already full" });
        }

        // Create the Registration securely using the authenticated user's profile info
        const newRegistration = new Registration({
            event: eventId,
            studentName: user.name,
            studentId: user.studentId,
            email: user.email,
            className: user.className,
            division: user.division,
            department: user.department,
            phone: user.phone,
            status: "Confirmed"
        });

        const savedRegistration = await newRegistration.save();
        await savedRegistration.populate("event");

        res.status(201).json(savedRegistration);
    } catch (error) {
        if (error.name === "ValidationError" || error.name === "CastError") {
            return res.status(400).json({ error: "Validation error", message: error.message });
        }
        return res.status(500).json({ error: "Internal server error", message: error.message });
    }
});

// 2. GET /api/registrations - Get all registrations (Admin Only)
router.get("/", protect, authorize("admin"), async (req, res) => {
    try {
        const registrations = await Registration.find({})
            .populate("event")
            .sort({ createdAt: -1 });
        res.status(200).json(registrations);
    } catch (error) {
        return res.status(500).json({ error: "Failed to fetch registrations", message: error.message });
    }
});

// 3. GET /api/registrations/my - Get current logged-in student's registrations (Placed before /:id)
router.get("/my", protect, authorize("student"), async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ error: "User account not found" });
        }

        const registrations = await Registration.find({ studentId: user.studentId })
            .populate("event")
            .sort({ createdAt: -1 });

        res.status(200).json(registrations);
    } catch (error) {
        return res.status(500).json({ error: "Internal server error", message: error.message });
    }
});

// 4. GET /api/registrations/:id - Get one registration by ID (Admin or Owning Student)
router.get("/:id", protect, async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ error: "Invalid Registration ID format" });
        }

        const registration = await Registration.findById(req.params.id).populate("event");
        if (!registration) {
            return res.status(404).json({ error: "Registration not found" });
        }

        // Ownership & Role Verification: Admin can view any; students can view only their own
        if (req.user.role !== "admin") {
            const user = await User.findById(req.user.id);
            if (!user || registration.studentId !== user.studentId) {
                return res.status(403).json({ error: "Access denied: You can only view your own registrations" });
            }
        }

        res.status(200).json(registration);
    } catch (error) {
        if (error.name === "CastError") {
            return res.status(400).json({ error: "Invalid Registration ID format", message: error.message });
        }
        return res.status(500).json({ error: "Internal server error", message: error.message });
    }
});

// 5. PUT /api/registrations/:id - Update a registration (Admin or Owning Student)
router.put("/:id", protect, async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ error: "Invalid Registration ID format" });
        }

        const existingRegistration = await Registration.findById(req.params.id);
        if (!existingRegistration) {
            return res.status(404).json({ error: "Registration not found" });
        }

        // Ownership & Role Verification: Admin can update any; students can update only their own
        if (req.user.role !== "admin") {
            const user = await User.findById(req.user.id);
            if (!user || existingRegistration.studentId !== user.studentId) {
                return res.status(403).json({ error: "Access denied: You can only modify your own registrations" });
            }

            // Students are strictly forbidden from setting status to "Confirmed" via PUT route
            if (req.body.status === "Confirmed") {
                return res.status(403).json({
                    error: "Students cannot change a cancelled registration back to confirmed. Please use the normal event registration process."
                });
            }
        }

        const { status: newStatus, studentName, email, className, division, phone } = req.body;

        // Validate status value if provided
        if (newStatus && !['Confirmed', 'Cancelled'].includes(newStatus)) {
            return res.status(400).json({ error: "Invalid status value. Must be 'Confirmed' or 'Cancelled'" });
        }

        // Handle status transition checks (primarily for Admin changing Cancelled -> Confirmed)
        if (newStatus && newStatus !== existingRegistration.status) {
            if (newStatus === "Confirmed" && existingRegistration.status !== "Confirmed") {
                // Changing from Cancelled -> Confirmed requires capacity, event check, and deadline check
                const event = await Event.findById(existingRegistration.event);
                if (!event) {
                    return res.status(404).json({ error: "Associated event not found" });
                }

                if (event.status && event.status.toLowerCase().includes("closed")) {
                    return res.status(400).json({ error: "Registration is closed for this event" });
                }

                if (event.deadline && new Date() > new Date(event.deadline)) {
                    return res.status(400).json({ error: "Registration deadline has passed" });
                }

                const confirmedCount = await Registration.countDocuments({
                    event: existingRegistration.event,
                    status: "Confirmed"
                });

                if (confirmedCount >= event.totalSeats) {
                    return res.status(400).json({ error: "Event is already full" });
                }
            }
            // Confirmed -> Cancelled is allowed automatically and frees the seat
        }

        // Build allowed update fields depending on role
        const updates = {};
        if (newStatus !== undefined) {
            updates.status = newStatus;
        }

        // Only admins are allowed to independently modify personal details via registration update
        if (req.user.role === "admin") {
            if (studentName !== undefined) updates.studentName = studentName;
            if (email !== undefined) updates.email = email;
            if (className !== undefined) updates.className = className;
            if (division !== undefined) updates.division = division;
            if (phone !== undefined) updates.phone = phone;
        }

        const updatedRegistration = await Registration.findByIdAndUpdate(
            req.params.id,
            updates,
            { new: true, runValidators: true }
        ).populate("event");

        res.status(200).json(updatedRegistration);
    } catch (error) {
        if (error.name === "ValidationError" || error.name === "CastError") {
            return res.status(400).json({ error: "Validation error", message: error.message });
        }
        return res.status(500).json({ error: "Internal server error", message: error.message });
    }
});

// 6. DELETE /api/registrations/:id - Permanently Delete a Cancelled Registration (Admin Only)
router.delete("/:id", protect, authorize("admin"), async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ error: "Invalid Registration ID format" });
        }

        const registration = await Registration.findById(req.params.id);
        if (!registration) {
            return res.status(404).json({ error: "Registration not found" });
        }

        // Enforce deletion only for cancelled registrations
        if (registration.status !== "Cancelled") {
             return res.status(400).json({ error: "Only cancelled registrations can be permanently deleted." });
        }

        const deletedRegistration = await Registration.findByIdAndDelete(req.params.id);
        res.status(200).json({ message: "Registration deleted successfully", id: deletedRegistration._id });
    } catch (error) {
        if (error.name === "CastError") {
            return res.status(400).json({ error: "Invalid Registration ID format", message: error.message });
        }
        return res.status(500).json({ error: "Internal server error", message: error.message });
    }
});

module.exports = router;