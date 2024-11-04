import express from 'express';
import db from '../db/conn.js';
import { ObjectId } from 'mongodb';

const router = express.Router();
// base path: /grades

// Helper function to validate ObjectId format
function isValidObjectId(id) {
    return /^[0-9a-f]{24}$/.test(id);
}

// Get a single grade entry
router.get('/:id', async (req, res, next) => {
    try {
        const id = req.params.id;
        console.log("ID from request:", id);

        if (!isValidObjectId(id)) {
            return res.status(400).send("Invalid ID format");
        }

        let collection = db.collection("grades");
        const query = { _id: new ObjectId(id) };
        let result = await collection.findOne(query);

        if (!result) {
            return res.status(404).send("Not Found");
        }
        res.send(result).status(200);
    } catch (err) {
        console.error(err);
        next(err); // the next function directs the error to the global error handling middleware
    }
});

// Backwards compatibility for students/learners
router.get("/student/:id", (req, res) => {
    res.redirect(`../learner/${req.params.id}`);
});

// Get a student's grade data
router.get('/learner/:id', async (req, res, next) => {
    try {
        const learnerId = Number(req.params.id);
        let collection = db.collection("grades");
        let query = { learner_id: learnerId };

        if (req.query.class) {
            query.class_id = Number(req.query.class);
        }

        let result = await collection.find(query).toArray();

        if (!result) {
            return res.status(404).send("Not Found");
        }
        res.send(result).status(200);
    } catch (err) {
        console.error(err);
        next(err);
    }
});

// Get a class's grade data
router.get('/class/:id', async (req, res, next) => {
    try {
        const classId = Number(req.params.id);
        let collection = db.collection("grades");
        let query = { class_id: classId };

        if (req.query.learner) {
            query.learner_id = Number(req.query.learner);
        }

        let result = await collection.find(query).toArray();

        if (!result) {
            return res.status(404).send("Not Found");
        }
        res.send(result).status(200);
    } catch (err) {
        console.error(err);
        next(err);
    }
});

// Get learner average for each class
router.get("/learner/:id/class/average", async (req, res, next) => {
    try {
        const learnerId = Number(req.params.id);
        let collection = db.collection("grades");
        let query = { learner_id: learnerId };
        let learnerGrades = await collection.find(query).toArray();

        const averages = learnerGrades.reduce((acc, grade) => {
            let sum = 0;
            const validScores = grade.scores.filter(score => typeof score.score === 'number');
            if (validScores.length > 0) {
                sum = validScores.reduce((total, score) => total + score.score, 0);
                acc[grade.class_id] = sum / validScores.length;
            }
            return acc;
        }, {});

        res.send(averages).status(200);
    } catch (err) {
        console.error(err);
        next(err);
    }
});

// Get overall average of a learner
router.get("/learner/:id/average", async (req, res, next) => {
    try {
        const learnerId = Number(req.params.id);
        let collection = db.collection("grades");
        let query = { learner_id: learnerId };
        let learnerGrades = await collection.find(query).toArray();

        let sum = 0;
        let scoreCount = 0;

        learnerGrades.forEach(grade => {
            grade.scores.forEach(score => {
                if (typeof score.score === 'number') {
                    sum += score.score;
                    scoreCount++;
                }
            });
        });

        const overallScore = scoreCount > 0 ? sum / scoreCount : 0;

        res.send(`Overall average: ${overallScore}`).status(200);
    } catch (err) {
        console.error(err);
        next(err);
    }
});

// Create a single grade entry
router.post('/', async (req, res, next) => {
    try {
        let collection = db.collection("grades");
        let newDocument = req.body;

        if (newDocument.student_id) {
            newDocument.learner_id = newDocument.student_id;
            delete newDocument.student_id;
        }

        let result = await collection.insertOne(newDocument);
        res.send(result).status(201);
    } catch (err) {
        console.error(err);
        next(err);
    }
});

// Add a score to a grade entry
router.patch('/:id/add', async (req, res, next) => {
    try {
        const id = req.params.id;

        if (!isValidObjectId(id)) {
            return res.status(400).send("Invalid ID format");
        }

        let collection = db.collection("grades");
        let query = { _id: new ObjectId(id) };

        let result = await collection.updateOne(query, {
            $push: { scores: req.body }
        });

        if (result.modifiedCount === 0) {
            return res.status(404).send("Not Found");
        }
        res.send(result).status(200);
    } catch (err) {
        console.error(err);
        next(err);
    }
});

// Remove a score from a grade entry
router.patch('/:id/remove', async (req, res, next) => {
    try {
        const id = req.params.id;

        if (!isValidObjectId(id)) {
            return res.status(400).send("Invalid ID format");
        }

        let collection = db.collection("grades");
        let query = { _id: new ObjectId(id) };

        let result = await collection.updateOne(query, {
            $pull: { scores: req.body }
        });

        if (result.modifiedCount === 0) {
            return res.status(404).send("Not Found");
        }
        res.send(result).status(200);
    } catch (err) {
        console.error(err);
        next(err);
    }
});

// Update class_id for multiple grade entries
router.patch("/class/:id", async (req, res, next) => {
    try {
        const classId = Number(req.params.id);
        let collection = db.collection("grades");

        let result = await collection.updateMany({ class_id: classId }, {
            $set: { class_id: req.body.class_id }
        });

        if (result.modifiedCount === 0) {
            return res.status(404).send("Not Found");
        }
        res.send(result).status(200);
    } catch (err) {
        console.error(err);
        next(err);
    }
});

// Delete a single grade entry
router.delete("/:id", async (req, res, next) => {
    try {
        const id = req.params.id;

        if (!isValidObjectId(id)) {
            return res.status(400).send("Invalid ID format");
        }

        let collection = db.collection("grades");
        let query = { _id: new ObjectId(id) };
        let result = await collection.deleteOne(query);

        if (result.deletedCount === 0) {
            return res.status(404).send("Not Found");
        }
        res.send(result).status(200);
    } catch (err) {
        console.error(err);
        next(err);
    }
});

// Delete a learner's grade entries
router.delete("/learner/:id", async (req, res, next) => {
    try {
        const learnerId = Number(req.params.id);
        let collection = db.collection("grades");
        let query = { learner_id: learnerId };

        let result = await collection.deleteMany(query);

        if (result.deletedCount === 0) {
            return res.status(404).send("Not Found");
        }
        res.send(result).status(200);
    } catch (err) {
        console.error(err);
        next(err);
    }
});

// Delete a class's grade entries
router.delete("/class/:id", async (req, res, next) => {
    try {
        const classId = Number(req.params.id);
        let collection = db.collection("grades");
        let query = { class_id: classId };

        let result = await collection.deleteMany(query);

        if (result.deletedCount === 0) {
            return res.status(404).send("Not Found");
        }
        res.send(result).status(200);
    } catch (err) {
        console.error(err);
        next(err);
    }
});

export default router;
