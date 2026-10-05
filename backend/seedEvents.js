require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const Event = require('../models/Event');

const eventsData = [
    {
        title: "Web Development Workshop",
        category: "workshops",
        categoryLabel: "Workshop",
        date: new Date("2026-09-20"),
        time: "10:00 AM",
        venue: "Seminar Hall",
        organizer: "Computer Engineering Department",
        description: "Hands-on technical workshop covering modern web technologies, responsive layouts, and interactive UI design principles.",
        fullDescription: "Join us for an immersive Web Development Workshop tailored to give students practical knowledge in building modern web applications. You will work directly with modern HTML5, CSS3, and modern JS concepts while building a project from scratch.",
        eligibility: "Open to all college students interested in web development.",
        deadline: new Date("2026-09-18"),
        image: "https://images.unsplash.com/photo-1531403009284-440f080d1e12?auto=format&fit=crop&w=800&q=80",
        totalSeats: 60
    },
    {
        title: "Inter-College Hackathon",
        category: "technical",
        categoryLabel: "Technical",
        date: new Date("2026-09-25"),
        time: "9:00 AM",
        venue: "Innovation Lab",
        organizer: "Tech Club & Student Chapter",
        description: "A 24-hour coding marathon where top teams innovate and solve real-world problems to win cash prizes.",
        fullDescription: "Push your programming abilities to the limit! Teams will work continuously over 24 hours to solve industry-level software challenges across AI, web, and IoT tracks.",
        eligibility: "Engineering and Computer Science undergraduate students.",
        deadline: new Date("2026-09-22"),
        image: "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=800&q=80",
        totalSeats: 150
    },
    {
        title: "Cultural Fest 2026",
        category: "cultural",
        categoryLabel: "Cultural",
        date: new Date("2026-09-30"),
        time: "11:00 AM",
        venue: "College Auditorium",
        organizer: "Cultural Student Committee",
        description: "An annual extravaganza celebrating music, dance, theater, and arts across multiple collegiate stages.",
        fullDescription: "Experience campus culture at its finest! The annual fest brings together musical bands, theatrical performances, dance troupe battles, and live art installations.",
        eligibility: "Open to all enrolled students across all streams.",
        deadline: new Date("2026-09-28"),
        image: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=800&q=80",
        totalSeats: 500
    },
    {
        title: "Inter-Department Cricket Tournament",
        category: "sports",
        categoryLabel: "Sports",
        date: new Date("2026-10-03"),
        time: "8:00 AM",
        venue: "College Ground",
        organizer: "Sports Department",
        description: "Cheer for your department as teams clash in a knockout tournament for championship glory.",
        fullDescription: "The official inter-departmental cricket tournament returns! Departmental teams compete in a standard T10 knockout format over 3 action-packed days.",
        eligibility: "Department-nominated team members only.",
        deadline: new Date("2026-10-01"),
        image: "https://images.unsplash.com/photo-1531415074968-036ba1b575da?auto=format&fit=crop&w=800&q=80",
        totalSeats: 16
    },
    {
        title: "Coding Competition",
        category: "competitions",
        categoryLabel: "Competitions",
        date: new Date("2026-10-07"),
        time: "10:00 AM",
        venue: "Computer Laboratory",
        organizer: "Coding Club",
        description: "Test your logic and algorithmic problem-solving efficiency against the best programmers on campus.",
        fullDescription: "A speed-coding and algorithmic challenge designed to test your mastery over data structures, dynamic programming, and computational logic.",
        eligibility: "Individual participation for all students.",
        deadline: new Date("2026-10-05"),
        image: "https://images.unsplash.com/photo-1515879218367-8466d910aaa4?auto=format&fit=crop&w=800&q=80",
        totalSeats: 40
    },
    {
        title: "Career Guidance Seminar",
        category: "seminars",
        categoryLabel: "Seminars",
        date: new Date("2026-10-12"),
        time: "2:00 PM",
        venue: "Seminar Hall",
        organizer: "Training & Placement Cell",
        description: "Gain valuable insights from distinguished tech leaders and alumni on navigating entry-level roles.",
        fullDescription: "Prepare for upcoming placements and higher studies with direct guidance from industry executives, hiring partners, and distinguished campus alumni.",
        eligibility: "Pre-final and Final year students.",
        deadline: new Date("2026-10-10"),
        image: "https://images.unsplash.com/photo-1475721027785-f74eccf877e2?auto=format&fit=crop&w=800&q=80",
        totalSeats: 200
    }
];

async function seedDatabase() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("Connected to MongoDB");

        const deleteResult = await Event.deleteMany({});
        console.log(`Deleted existing events: ${deleteResult.deletedCount}`);

        const inserted = await Event.insertMany(eventsData);
        console.log(`Inserted events count: ${inserted.length}`);

        inserted.forEach(event => {
            console.log(`- ${event.title}`);
        });

        console.log("Seed completed successfully");
    } catch (error) {
        console.error("Error seeding database:", error);
    } finally {
        await mongoose.connection.close();
    }
}

seedDatabase();