const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const Event = require("../models/event");
const Registration = require("../models/Registration");
const { protect, authorize } = require("../middleware/auth");

// 1. GET /api/events - Return all events with availableSeats, sorted by date in ascending order (Public)
router.get("/", async (req, res) => {
    try {
        const events = await Event.find({}).sort({ date: 1 }).lean();

        const eventsWithSeats = await Promise.all(events.map(async (event) => {
            const confirmedCount = await Registration.countDocuments({
                event: event._id,
                status: "Confirmed"
            });
            const availableSeats = Math.max(0, event.totalSeats - confirmedCount);
            
            let dynamicStatus = "Registration Open";
            const now = new Date();
            if (new Date(event.deadline) < now) {
                dynamicStatus = "Registration Closed";
            } else if (availableSeats === 0) {
                dynamicStatus = "Full";
            } else if (availableSeats <= Math.ceil(event.totalSeats * 0.2)) {
                dynamicStatus = "Almost Full";
            }

            return {
                ...event,
                status: dynamicStatus,
                availableSeats
            };
        }));

        res.status(200).json(eventsWithSeats);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch events", message: error.message });
    }
});

// 2. GET /api/events/:id - Return one event by its MongoDB ID with availableSeats (Public)
router.get("/:id", async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ error: "Invalid Event ID format" });
        }

        const event = await Event.findById(req.params.id).lean();
        if (!event) {
            return res.status(404).json({ error: "Event not found" });
        }

        const confirmedCount = await Registration.countDocuments({
            event: event._id,
            status: "Confirmed"
        });
        const availableSeats = Math.max(0, event.totalSeats - confirmedCount);

        let dynamicStatus = "Registration Open";
        const now = new Date();
        if (new Date(event.deadline) < now) {
            dynamicStatus = "Registration Closed";
        } else if (availableSeats === 0) {
            dynamicStatus = "Full";
        } else if (availableSeats <= Math.ceil(event.totalSeats * 0.2)) {
            dynamicStatus = "Almost Full";
        }

        res.status(200).json({
            ...event,
            status: dynamicStatus,
            availableSeats
        });
    } catch (error) {
        if (error.name === "CastError") {
            return res.status(400).json({ error: "Invalid Event ID format", message: error.message });
        }
        res.status(500).json({ error: "Internal server error", message: error.message });
    }
});

// 3. POST /api/events - Create a new event (Admin Only)
router.post("/", protect, authorize("admin"), async (req, res) => {
    try {
        const {
            title,
            category,
            categoryLabel,
            date,
            time,
            venue,
            organizer,
            description,
            fullDescription,
            eligibility,
            deadline,
            image,
            totalSeats
        } = req.body;

        const newEvent = new Event({
            title,
            category,
            categoryLabel,
            date,
            time,
            venue,
            organizer,
            description,
            fullDescription,
            eligibility,
            deadline,
            image,
            totalSeats
        });

        const savedEvent = await newEvent.save();
        res.status(201).json(savedEvent);
    } catch (error) {
        if (error.name === "ValidationError" || error.name === "CastError") {
            return res.status(400).json({ error: "Validation error", message: error.message });
        }
        res.status(500).json({ error: "Internal server error", message: error.message });
    }
});

// 4. PUT /api/events/:id - Update an existing event (Admin Only)
router.put("/:id", protect, authorize("admin"), async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ error: "Invalid Event ID format" });
        }

        const existingEvent = await Event.findById(req.params.id);
        if (!existingEvent) {
            return res.status(404).json({ error: "Event not found" });
        }

        const {
            title,
            category,
            categoryLabel,
            date,
            time,
            venue,
            organizer,
            description,
            fullDescription,
            eligibility,
            deadline,
            image,
            totalSeats
        } = req.body;

        if (totalSeats !== undefined && totalSeats !== existingEvent.totalSeats) {
            const confirmedCount = await Registration.countDocuments({
                event: req.params.id,
                status: "Confirmed"
            });
            if (totalSeats < confirmedCount) {
                return res.status(400).json({
                    error: "Cannot reduce total seats below the number of existing confirmed registrations",
                    confirmedRegistrations: confirmedCount
                });
            }
        }

        const updates = {};
        if (title !== undefined) updates.title = title;
        if (category !== undefined) updates.category = category;
        if (categoryLabel !== undefined) updates.categoryLabel = categoryLabel;
        if (date !== undefined) updates.date = date;
        if (time !== undefined) updates.time = time;
        if (venue !== undefined) updates.venue = venue;
        if (organizer !== undefined) updates.organizer = organizer;
        if (description !== undefined) updates.description = description;
        if (fullDescription !== undefined) updates.fullDescription = fullDescription;
        if (eligibility !== undefined) updates.eligibility = eligibility;
        if (deadline !== undefined) updates.deadline = deadline;
        if (image !== undefined) updates.image = image;
        if (totalSeats !== undefined) updates.totalSeats = totalSeats;

        const updatedEvent = await Event.findByIdAndUpdate(
            req.params.id,
            updates,
            { new: true, runValidators: true }
        );

        res.status(200).json(updatedEvent);
    } catch (error) {
        if (error.name === "ValidationError" || error.name === "CastError") {
            return res.status(400).json({ error: "Validation error", message: error.message });
        }
        res.status(500).json({ error: "Internal server error", message: error.message });
    }
});

// 5. DELETE /api/events/:id - Delete an event by ID (Admin Only)
router.delete("/:id", protect, authorize("admin"), async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ error: "Invalid Event ID format" });
        }

        const event = await Event.findById(req.params.id);
        if (!event) {
            return res.status(404).json({ error: "Event not found" });
        }

        const registrationCount = await Registration.countDocuments({ event: req.params.id });
        if (registrationCount > 0) {
            return res.status(400).json({
                error: "Event cannot be deleted because registrations already exist for this event"
            });
        }

        const deletedEvent = await Event.findByIdAndDelete(req.params.id);
        res.status(200).json({ message: "Event deleted successfully", id: deletedEvent._id });
    } catch (error) {
        if (error.name === "CastError") {
            return res.status(400).json({ error: "Invalid Event ID format", message: error.message });
        }
        res.status(500).json({ error: "Internal server error", message: error.message });
    }
});

module.exports = router;