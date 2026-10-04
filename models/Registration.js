const mongoose = require('mongoose');

const registrationSchema = new mongoose.Schema({
    event: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Event',
        required: [true, 'Event reference is required']
    },
    studentName: {
        type: String,
        required: [true, 'Student name is required'],
        trim: true,
        minlength: [3, 'Student name must be at least 3 characters long']
    },
    studentId: {
        type: String,
        required: [true, 'Student ID / PRN is required'],
        trim: true
    },
    email: {
        type: String,
        required: [true, 'Email address is required'],
        trim: true,
        lowercase: true,
        match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please enter a valid email address']
    },
    className: {
        type: String,
        required: [true, 'Class/Year is required'],
        trim: true
    },
    division: {
        type: String,
        required: [true, 'Division is required'],
        trim: true
    },
    phone: {
        type: String,
        required: [true, 'Phone number is required'],
        trim: true
    },
    registrationDate: {
        type: Date,
        default: Date.now
    },
    status: {
        type: String,
        enum: {
            values: ['Confirmed', 'Cancelled'],
            message: '{VALUE} is not a valid registration status'
        },
        default: 'Confirmed'
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Registration', registrationSchema);