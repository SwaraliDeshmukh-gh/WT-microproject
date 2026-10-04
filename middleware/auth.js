const jwt = require('jsonwebtoken');

// Middleware to verify JWT token from Authorization header
const protect = (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            // Extract token from 'Bearer <token>'
            token = req.headers.authorization.split(' ')[1];

            // Verify token using the JWT secret from environment variables
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            // Attach decoded user info (id, role, etc.) to req.user
            req.user = decoded;

            return next();
        } catch (error) {
            return res.status(401).json({ error: 'Not authorized, token failed or expired' });
        }
    }

    if (!token) {
        return res.status(401).json({ error: 'Not authorized, no token provided' });
    }
};

// Middleware to authorize specific roles (e.g., 'admin', 'student')
const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(403).json({ error: 'Access denied: You do not have permission to perform this action' });
        }
        next();
    };
};

module.exports = { protect, authorize };