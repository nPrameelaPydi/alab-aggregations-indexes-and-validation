import express from "express";
import "dotenv/config";
import grades from './routes/grades.js';
import grades_agg from "./routes/grades_agg.js";

const PORT = process.env.PORT || 3000;
const app = express();

// Body parser middleware
app.use(express.json());

// Test db connection
// import "./db/conn.js";

app.get("/", (req, res) => {
    res.send("Welcome to the API");
});

app.use("/grades", grades_agg);
app.use("/grades", grades);

// Global error handling middleware
app.use((err, req, res, next) => {
    console.error("Error stack:", err.stack);
    res.status(500).send("Something broke!");
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on port: ${PORT}`);
});
