import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  googleId:    { type: String, required: true, unique: true },
  email:       { type: String, required: true },
  name:        { type: String },
  avatar:      { type: String },
  // track usage for rate limiting per user
  lastJobAt:   { type: Date, default: null },
  totalJobs:   { type: Number, default: 0 },
  createdAt:   { type: Date, default: Date.now },
});

export default mongoose.model('User', userSchema);
