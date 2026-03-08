const Feedback = require("../models/Feedback");
const aiSentimentService = require("../services/aiSentiment.service");

// @desc    Submit feedback with AI analysis
// @route   POST /api/feedback
// @access  Private (User/Student)
exports.submitFeedback = async (req, res) => {
  try {
    const { bookingId, rating, comment } = req.body;

    if (!rating || !comment) {
      return res.status(400).json({
        success: false,
        message: "Rating and comment are required",
      });
    }

    // Call Gemini for Sentiment Analysis
    const aiAnalysis = await aiSentimentService.analyzeSentiment(comment, rating);

    const feedback = await Feedback.create({
      user: req.user.id,
      booking: bookingId || null,
      rating,
      comment,
      aiSentimentScore: aiAnalysis.sentimentScore,
      aiSentimentTag: aiAnalysis.sentimentTag,
      aiTopics: aiAnalysis.topics,
    });

    res.status(201).json({
      success: true,
      data: feedback,
    });
  } catch (error) {
    console.error("Submit Feedback Error:", error);
    res.status(500).json({
      success: false,
      message: "Server Error processing feedback",
    });
  }
};

// @desc    Get all feedback with filtering
// @route   GET /api/feedback
// @access  Private/Admin/Manager
exports.getFeedback = async (req, res) => {
  try {
    const { sentimentTag, rating, limit = 50 } = req.query;
    
    let query = {};
    if (sentimentTag) query.aiSentimentTag = sentimentTag;
    if (rating) query.rating = Number(rating);

    const feedbackList = await Feedback.find(query)
      .populate("user", "name email")
      .populate("booking", "tokenNumber items")
      .sort({ createdAt: -1 })
      .limit(Number(limit));

    // Calculate quick stats
    const total = await Feedback.countDocuments(query);
    const positiveCount = await Feedback.countDocuments({ ...query, aiSentimentTag: "Positive" });
    const negativeCount = await Feedback.countDocuments({ ...query, aiSentimentTag: "Negative" });
    const neutralCount = await Feedback.countDocuments({ ...query, aiSentimentTag: "Neutral" });

    res.status(200).json({
      success: true,
      stats: {
        total,
        positiveCount,
        negativeCount,
        neutralCount
      },
      data: feedbackList,
    });
  } catch (error) {
    console.error("Get Feedback Error:", error);
    res.status(500).json({
      success: false,
      message: "Server Error fetching feedback",
    });
  }
};
