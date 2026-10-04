const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    category: {
        type: String,
        required: true,
        trim: true
    },
    categoryLabel: {
        type: String,
        required: true,
        trim: true
    },
    date: {
        type: Date,
        required: true
    },
    time: {
        type: String,
        required: true,
        trim: true
    },
    venue: {
        type: String,
        required: true,
        trim: true
    },
    organizer: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        required: true,
        trim: true
    },
    fullDescription: {
        type: String,
        required: true,
        trim: true
    },
    eligibility: {
        type: String,
        required: true,
        trim: true
    },
    deadline: {
        type: Date,
        required: true
    },
    image: {
        type: String,
        required: true,
        trim: true
    },
    totalSeats: {
        type: Number,
        required: true,
        min: [1, "Total seats must be at least 1"],
        validate: {
            validator: Number.isInteger,
            message: "Total seats must be a whole number"
        }
    },
    status: {
        type: String,
        required: true,
        trim: true
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Event', eventSchema);