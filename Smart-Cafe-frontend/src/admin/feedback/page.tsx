import React, { useCallback, useEffect, useState } from "react";
import { MessageSquare, Star, Filter, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { getFeedback, type Feedback, type FeedbackStats } from "../../services/feedback.service";

const AdminFeedback: React.FC = () => {
  const [feedbackList, setFeedbackList] = useState<Feedback[]>([]);
  const [stats, setStats] = useState<FeedbackStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [sentimentFilter, setSentimentFilter] = useState("");
  const [ratingFilter, setRatingFilter] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const filters: any = {};
      if (sentimentFilter) filters.sentimentTag = sentimentFilter;
      if (ratingFilter) filters.rating = Number(ratingFilter);

      const response = await getFeedback(filters);
      if (response.success) {
        setFeedbackList(response.data);
        setStats(response.stats);
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to load feedback");
    } finally {
      setLoading(false);
    }
  }, [sentimentFilter, ratingFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <div className="space-y-6 pb-12">
      <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <MessageSquare className="text-brand" /> AI Feedback Analysis
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Monitor student feedback and AI-generated sentiment scores.
          </p>
        </div>
      </header>

      {/* Quick Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-center">
            <span className="text-gray-500 text-sm font-semibold uppercase tracking-wider mb-1">Total Reviews</span>
            <span className="text-3xl font-black text-gray-900">{stats.total}</span>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-green-100 shadow-sm flex flex-col justify-center relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-green-50 rounded-full -mr-8 -mt-8"></div>
            <span className="relative z-10 text-green-700 text-sm font-semibold uppercase tracking-wider mb-1 flex items-center gap-1.5"><span className="animate-pulse">✨</span> Positive</span>
            <span className="relative z-10 text-3xl font-black text-green-600">{stats.positiveCount}</span>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-orange-100 shadow-sm flex flex-col justify-center relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-orange-50 rounded-full -mr-8 -mt-8"></div>
            <span className="relative z-10 text-orange-700 text-sm font-semibold uppercase tracking-wider mb-1">Neutral</span>
            <span className="relative z-10 text-3xl font-black text-orange-600">{stats.neutralCount}</span>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-red-100 shadow-sm flex flex-col justify-center relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-red-50 rounded-full -mr-8 -mt-8"></div>
            <span className="relative z-10 text-red-700 text-sm font-semibold uppercase tracking-wider mb-1 flex items-center gap-1.5"><span className="animate-pulse">⚠️</span> Negative</span>
            <span className="relative z-10 text-3xl font-black text-red-600">{stats.negativeCount}</span>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-wrap gap-4 items-center">
        <div className="flex items-center gap-2">
            <Filter size={16} className="text-gray-400" />
            <select
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand outline-none"
              value={sentimentFilter}
              onChange={(e) => setSentimentFilter(e.target.value)}
            >
              <option value="">All Sentiments</option>
              <option value="Positive">Positive</option>
              <option value="Neutral">Neutral</option>
              <option value="Negative">Negative</option>
            </select>
        </div>
        <div className="flex items-center gap-2">
            <Star size={16} className="text-gray-400" />
            <select
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand outline-none"
              value={ratingFilter}
              onChange={(e) => setRatingFilter(e.target.value)}
            >
              <option value="">All Ratings</option>
              <option value="5">5 Stars</option>
              <option value="4">4 Stars</option>
              <option value="3">3 Stars</option>
              <option value="2">2 Stars</option>
              <option value="1">1 Star</option>
            </select>
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-12 text-brand">
          <Loader2 className="animate-spin" size={32} />
        </div>
      ) : feedbackList.length === 0 ? (
        <div className="bg-white p-10 rounded-2xl border border-gray-100 shadow-sm text-center">
          <MessageSquare size={48} className="mx-auto text-gray-200 mb-4" />
          <h3 className="text-lg font-bold text-gray-900">No Feedback Yet</h3>
          <p className="text-gray-500 mt-2">Looks like it's quiet. Check back later after students review their meals.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {feedbackList.map(item => (
            <div key={item.id} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-3">
                 <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-brand/10 text-brand flex items-center justify-center font-bold text-sm">
                      {item.user?.name?.charAt(0).toUpperCase() || "A"}
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900">{item.user?.name || "Anonymous"}</h4>
                      <p className="text-xs text-gray-500">{new Date(item.createdAt).toLocaleString()}</p>
                    </div>
                 </div>
                 <div className="flex items-center gap-1 bg-amber-50 px-2 py-1 rounded-lg">
                    <span className="font-bold text-amber-600">{item.rating}</span>
                    <Star size={14} className="text-amber-500 fill-amber-500" />
                 </div>
              </div>

              <p className="text-gray-700 mb-4">{item.comment}</p>

              <div className="flex flex-wrap items-center justify-between border-t border-gray-100 pt-3 mt-2 gap-4">
                  <div className="flex items-center gap-2">
                    <span className={`text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md ${
                        item.aiSentimentTag === 'Positive' ? 'bg-green-100 text-green-700' :
                        item.aiSentimentTag === 'Negative' ? 'bg-red-100 text-red-700' :
                        'bg-orange-100 text-orange-700'
                    }`}>
                      {item.aiSentimentTag === 'Positive' && '✨ '}
                      {item.aiSentimentTag === 'Negative' && '⚠️ '}
                      {item.aiSentimentTag}
                    </span>
                    {item.aiTopics && item.aiTopics.map((topic, i) => (
                      <span key={i} className="bg-gray-100 text-gray-600 text-[11px] font-semibold px-2 py-1 rounded-md">
                        {topic}
                      </span>
                    ))}
                  </div>
                  {item.booking && (
                    <span className="text-xs font-semibold text-gray-400">
                      Token: <span className="text-gray-600 uppercase">#{item.booking.tokenNumber}</span>
                    </span>
                  )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminFeedback;
