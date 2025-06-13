require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const connectDB = require("./db");

const app = express();
const PORT = process.env.PORT || 8080;
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_key_for_local_dev';

// Logging Middleware
const loggingMiddleware = (req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
};

// Middleware
app.use(cors());
app.use(express.json());
app.use(loggingMiddleware);
app.use(express.static(path.join(__dirname, "public")));

// Database Connection
connectDB();

// JWT Authentication Middleware
const authMiddleware = (req, res, next) => {
    try {
        const authHeader = req.header("Authorization");
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({ 
                message: "Authentication required",
                error: "No token provided" 
            });
        }

        const token = authHeader.split(" ")[1];
        if (!token) {
            return res.status(401).json({ 
                message: "Authentication required",
                error: "Invalid token format" 
            });
        }

        try {
            const decoded = jwt.verify(token, JWT_SECRET);
            req.userId = decoded.userId;
            next();
        } catch (error) {
            if (error.name === 'TokenExpiredError') {
                return res.status(401).json({ 
                    message: "Session expired",
                    error: "Token expired" 
                });
            }
            return res.status(401).json({ 
                message: "Authentication failed",
                error: "Invalid token" 
            });
        }
    } catch (error) {
        console.error("[AUTH MIDDLEWARE ERROR]", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

// Health Check
app.get("/health", (req, res) => {
    res.status(200).json({ 
        status: "ok", 
        timestamp: new Date().toISOString() 
    });
});

// User Schema
const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true, trim: true, minlength: 3, maxlength: 20 },
    password: { type: String, required: true, minlength: 6 },
    email: { 
        type: String, required: true, unique: true, trim: true, lowercase: true,
        match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, "Please fill a valid email address"]
    }
});
const User = mongoose.model("User", userSchema);

// Notes Schema
const noteSchema = new mongoose.Schema({
    title: { type: String, required: true, trim: true, maxlength: 100 },
    content: { type: String, required: true, trim: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    createdAt: { type: Date, default: Date.now }
});
const Note = mongoose.model("Note", noteSchema);

// Signup Route
app.post("/signup", async (req, res) => {
    try {
        const { username, password, email } = req.body;
        if (!username || !password || !email) {
            return res.status(400).json({ message: "All fields are required" });
        }
        
        // Check for existing user with better error messages
        const existingUser = await User.findOne({ $or: [{ username }, { email }] });
        if (existingUser) {
            if (existingUser.username === username) {
                return res.status(409).json({ message: "Username already taken" });
            }
            if (existingUser.email === email) {
                return res.status(409).json({ message: "Email already registered" });
            }
        }

        const hashedPassword = await bcrypt.hash(password, 12);
        const user = new User({ username, password: hashedPassword, email });
        await user.save();
        
        // Generate token immediately after signup
        const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: "1h" });
        res.status(201).json({ 
            message: "User registered successfully", 
            userId: user._id,
            token,
            username: user.username 
        });
    } catch (error) {
        console.error("[SIGNUP ERROR]", error);
        if (error.code === 11000) {
            return res.status(409).json({ 
                message: "Username or email already exists",
                error: "Duplicate entry" 
            });
        }
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// Login Route
app.post("/login", async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.status(400).json({ message: "Username and password are required" });
        }
        
        const user = await User.findOne({ username });
        if (!user) {
            return res.status(401).json({ message: "Invalid username or password" });
        }
        
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: "Invalid username or password" });
        }
        
        const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: "1h" });
        res.json({ 
            token, 
            userId: user._id, 
            username: user.username, 
            message: "Login successful" 
        });
    } catch (error) {
        console.error("[LOGIN ERROR]", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// Create Note
app.post("/notes", authMiddleware, async (req, res) => {
    try {
        const { title, content } = req.body;
        const userId = req.userId;
        if (!title || !content) {
            return res.status(400).json({ message: "Title and content are required" });
        }
        const newNote = new Note({ title, content, userId });
        await newNote.save();
        res.status(201).json({ message: "Note added successfully", note: newNote });
    } catch (error) {
        res.status(500).json({ error: "Internal Server Error", details: error.message });
    }
});

// Get All Notes
app.get("/notes", authMiddleware, async (req, res) => {
    try {
        const userId = req.userId;
        const notes = await Note.find({ userId }).sort({ createdAt: -1 });
        res.json({ notes, count: notes.length, message: notes.length > 0 ? "Notes retrieved successfully" : "No notes found" });
    } catch (error) {
        res.status(500).json({ error: "Internal Server Error", details: error.message });
    }
});

// Get Single Note by ID
app.get("/notes/:id", authMiddleware, async (req, res) => {
    try {
        const noteId = req.params.id;
        const userId = req.userId;
        const note = await Note.findOne({ _id: noteId, userId });
        if (!note) {
            return res.status(404).json({ message: "Note not found or unauthorized" });
        }
        res.json({ note });
    } catch (error) {
        res.status(500).json({ error: "Internal Server Error", details: error.message });
    }
});

// Update Note
app.put("/notes/:id", authMiddleware, async (req, res) => {
    try {
        const { title, content } = req.body;
        const noteId = req.params.id;
        const userId = req.userId;
        if (!title || !content) {
            return res.status(400).json({ message: "Title and content are required" });
        }
        const updatedNote = await Note.findOneAndUpdate(
            { _id: noteId, userId },
            { title, content },
            { new: true, runValidators: true }
        );
        if (!updatedNote) {
            return res.status(404).json({ message: "Note not found or unauthorized" });
        }
        res.json({ message: "Note updated successfully", note: updatedNote });
    } catch (error) {
        res.status(500).json({ error: "Internal Server Error", details: error.message });
    }
});

// Delete Note
app.delete("/notes/:id", authMiddleware, async (req, res) => {
    try {
        const noteId = req.params.id;
        const userId = req.userId;
        const deletedNote = await Note.findOneAndDelete({ _id: noteId, userId });
        if (!deletedNote) {
            return res.status(404).json({ message: "Note not found or unauthorized" });
        }
        res.json({ message: "Note deleted successfully", deletedNote });
    } catch (error) {
        res.status(500).json({ error: "Internal Server Error", details: error.message });
    }
});

// Get User Profile
app.get("/profile/:id", authMiddleware, async (req, res) => {
    try {
        const userId = req.params.id;
        const user = await User.findById(userId).select('-password');
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        res.json({ user });
    } catch (error) {
        console.error("[GET PROFILE ERROR]", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// Update User Profile
app.put("/profile/:id", authMiddleware, async (req, res) => {
    try {
        const userId = req.params.id;
        const { username, email } = req.body;

        // Verify user is updating their own profile
        if (userId !== req.userId) {
            return res.status(403).json({ message: "Not authorized to update this profile" });
        }

        // Check if username or email is already taken
        const existingUser = await User.findOne({
            $or: [
                { username, _id: { $ne: userId } },
                { email, _id: { $ne: userId } }
            ]
        });

        if (existingUser) {
            if (existingUser.username === username) {
                return res.status(409).json({ message: "Username already taken" });
            }
            if (existingUser.email === email) {
                return res.status(409).json({ message: "Email already registered" });
            }
        }

        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { username, email },
            { new: true, runValidators: true }
        ).select('-password');

        if (!updatedUser) {
            return res.status(404).json({ message: "User not found" });
        }

        res.json({ 
            message: "Profile updated successfully",
            user: updatedUser
        });
    } catch (error) {
        console.error("[UPDATE PROFILE ERROR]", error);
        if (error.name === 'ValidationError') {
            return res.status(400).json({ 
                message: "Validation error",
                error: Object.values(error.errors).map(err => err.message)
            });
        }
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// Serve index.html for client-side routes
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Graceful Shutdown
const gracefulShutdown = async (signal) => {
    console.log(`\n🛑 Received ${signal}. Closing MongoDB connection...`);
    try {
        await mongoose.connection.close();
        console.log("✅ MongoDB connection closed.");
        process.exit(0);
    } catch (error) {
        console.error("Error during shutdown:", error);
        process.exit(1);
    }
};
process.on("SIGINT", () => gracefulShutdown("SIGINT"));
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));

// Start the server
app.listen(PORT, "0.0.0.0", () => {
    console.log(`✅ Server is running on port ${PORT}`);
    console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;