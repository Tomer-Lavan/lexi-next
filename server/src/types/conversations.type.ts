import mongoose from 'mongoose';
import { IAgent } from '../types/agents.type';

export type UserAnnotation = 1 | 0 | -1;
export interface IConversation {
    conversationId: string;
    content: string;
    role: 'system' | 'user' | 'assistant';
    createdAt: Date;
    timestamp: number;
    messageNumber: number;
    userAnnotation: UserAnnotation;
    //valence: number;
    //arousal: number;
    timeDelay: number;
    pit: number;
    loud: number;
    snr: number;
}

export interface IExplainable {
    conversationId: string;
    prompt_input: string;
    user_input: string,
    response: string;
    role: string;
    createdAt: Date;
    timestamp: number;
    messageNumber: number;
    valence: number;
    arousal: number;
    //userAnnotation: UserAnnotation;
}

export interface Message {
    _id?: mongoose.Types.ObjectId;
    role: 'system' | 'user' | 'assistant';
    content: string;
    timeDelay: number;
    userAnnotation?: UserAnnotation;
}

export interface Audio {
    _id?: mongoose.Types.ObjectId;
    role: 'system' | 'user' | 'assistant';
    content: Blob | Buffer | string;
    timeDelay: number;
    userAnnotation?: UserAnnotation;
}

export interface IMetadataConversation {
    _id: mongoose.Types.ObjectId;
    experimentId: string;
    messagesNumber: number;
    createdAt: Date;
    timestamp: number;
    lastMessageDate: Date;
    lastMessageTimestamp: number;
    conversationNumber: number;
    agent: IAgent;
    userId: string;
    preConversation?: object;
    postConversation?: object;
    maxMessages: number;
    isFinished: boolean;
}
