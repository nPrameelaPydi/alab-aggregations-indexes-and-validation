import express from "express";
import db from "../db/conn.js";

const router = express.Router();

/**
 * It is not best practice to seperate these routes
 * like we have done here. This file was created
 * specifically for educational purposes, to contain
 * all aggregation routes in one place.
 */

/**
 * Grading Weights by Score Type:
 * - Exams: 50%
 * - Quizes: 30%
 * - Homework: 20%
 */

// Get the weighted average of a specified learner's grades, per class
//router.get("/learner/:id/avg-class", async (req, res) => {
//    let collection = await db.collection("grades");

//    let result = await collection
//        .aggregate([
//            {
//                $match: { learner_id: Number(req.params.id) },
//            },
//            {
//                $unwind: { path: "$scores" },
//            },
//            {
//                $group: {
//                    _id: "$class_id",
//                    quiz: {
//                        $push: {
//                            $cond: {
//                                if: { $eq: ["$scores.type", "quiz"] },
//                                then: "$scores.score",
//                                else: "$$REMOVE",
//                            },
//                        },
//                    },
//                    exam: {
//                        $push: {
//                            $cond: {
//                                if: { $eq: ["$scores.type", "exam"] },
//                                then: "$scores.score",
//                                else: "$$REMOVE",
//                            },
//                        },
//                    },
//                    homework: {
//                        $push: {
//                            $cond: {
//                                if: { $eq: ["$scores.type", "homework"] },
//                                then: "$scores.score",
//                                else: "$$REMOVE",
//                            },
//                        },
//                    },
//                },
//            },
//            {
//                $project: {
//                    _id: 0,
//                    class_id: "$_id",
//                    avg: {
//                        $sum: [
//                            { $multiply: [{ $avg: "$exam" }, 0.5] },
//                            { $multiply: [{ $avg: "$quiz" }, 0.3] },
//                            { $multiply: [{ $avg: "$homework" }, 0.2] },
//                        ],
//                    },
//                },
//            },
//        ])
//        .toArray();

//    if (!result) res.send("Not found").status(404);
//    else res.send(result).status(200);
//});


// Get statistics about learner grades
router.get("/stats", async (req, res) => {
    try {
        const collection = await db.collection("grades");

        const result = await collection.aggregate([
            {
                $unwind: "$scores"
            },
            {
                $group: {
                    _id: "$learner_id",  // Use learner_id directly, as it’s an Int32
                    quiz: {
                        $push: {
                            $cond: {
                                if: { $eq: ["$scores.type", "quiz"] },
                                then: "$scores.score",
                                else: "$$REMOVE",
                            },
                        },
                    },
                    exam: {
                        $push: {
                            $cond: {
                                if: { $eq: ["$scores.type", "exam"] },
                                then: "$scores.score",
                                else: "$$REMOVE",
                            },
                        },
                    },
                    homework: {
                        $push: {
                            $cond: {
                                if: { $eq: ["$scores.type", "homework"] },
                                then: "$scores.score",
                                else: "$$REMOVE",
                            },
                        },
                    },
                },
            },
            {
                $project: {
                    _id: 1,
                    weightedAvg: {
                        $sum: [
                            { $multiply: [{ $avg: "$exam" }, 0.5] },
                            { $multiply: [{ $avg: "$quiz" }, 0.3] },
                            { $multiply: [{ $avg: "$homework" }, 0.2] },
                        ],
                    },
                },
            },
            {
                $group: {
                    _id: null,
                    totalLearners: { $sum: 1 },
                    learnersAbove50: {
                        $sum: {
                            $cond: [{ $gt: ["$weightedAvg", 50] }, 1, 0],
                        },
                    },
                },
            },
            {
                $project: {
                    _id: 0,
                    totalLearners: 1,
                    learnersAbove50: 1,
                    percentageAbove50: {
                        $multiply: [
                            { $divide: ["$learnersAbove50", "$totalLearners"] },
                            100,
                        ],
                    },
                },
            },
        ]).toArray();

        if (result.length === 0) {
            res.status(404).send("No data found");
        } else {
            res.status(200).send(result[0]);
        }
    } catch (error) {
        console.error(error);
        res.status(500).send("Error fetching statistics");
    }
});





export default router;