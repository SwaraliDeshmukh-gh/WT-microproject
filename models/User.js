const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Full name is required'],
        trim: true
    },
    studentId: {
        type: String,
        trim: true,
        // Student ID is required for student accounts, optional for admin accounts
        required: function() {
            return this.role === 'student';
        }
    },
    department: {
        type: String,
        trim: true,
        required: function() { return this.role === 'student'; }
    },
    className: {
        type: String,
        trim: true,
        required: function() {
            return this.role === 'student';
        }
    },
    division: {
        type: String,
        trim: true,
        required: function() {
            return this.role === 'student';
        }
    },
    email: {
        type: String,
        required: [true, 'Email address is required'],
        unique: true,
        lowercase: true,
        trim: true,
        match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please enter a valid email address']
    },
    phone: {
        type: String,
        trim: true,
        required: function() {
            return this.role === 'student';
        }
    },
    password: {
        type: String,
        required: [true, 'Password is required'],
        minlength: [6, 'Password must be at least 6 characters long']
    },
    role: {
        type: String,
        enum: {
            values: ['student', 'admin'],
            message: '{VALUE} is not a valid user role'
        },
        default: 'student'
    }
}, {
    timestamps: true
});

// Middleware: Automatically hash the password before saving to MongoDB
userSchema.pre('save', async function() {
    if (!this.isModified('password')) return;

    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

// Helper method to compare login password with the hashed password in the database
userSchema.methods.comparePassword = async function(candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);