import mongoose from 'mongoose';

const docSchema = new mongoose.Schema(
    {
        title: { type: String, default: 'Untitled', trim: true },
        owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        collaborators: [
            {
                user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
                role: { type: String, enum: ['editor', 'viewer'], default: 'editor' },
            },
        ],
        language: { type: String, default: 'javascript' },
        state: { type: Buffer, default: null },
    },
    { timestamps: true }
);

docSchema.methods.getRole = function (userId) {
    const id = String(userId);
    if (String(this.owner) === id) return 'owner';
    const match = this.collaborators.find((c) => String(c.user) === id);
    return match ? match.role : null;
};

export default mongoose.model('Doc', docSchema);