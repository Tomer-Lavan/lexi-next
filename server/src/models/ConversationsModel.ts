import { Schema } from 'mongoose';
import { mongoDbProvider } from '../mongoDBProvider';
import { IConversation } from '../types';

export const conversationSchema = new Schema<IConversation>(
    {
        conversationId: { type: String, required: true },
        content: { type: String, required: true },
        role: { type: String, required: true },
        timeDelay: {type: Number, default: null},
        createdAt: { type: Date, default: Date.now },
        timestamp: { type: Number, default: () => Date.now() },
        messageNumber: { type: Number, required: true },
        userAnnotation: { type: Number, default: () => 0 },
        pit: {type: Number, default: 0}, 
        loud: {type: Number, default: 0},
        snr: {type: Number, default: 0},
    },
    { versionKey: false },
);

export const ConversationsModel = mongoDbProvider.getModel('conversations', conversationSchema);
