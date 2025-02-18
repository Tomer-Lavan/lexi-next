import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { OpenAI } from 'openai';
import { IAgent, Message, UserAnnotation } from 'src/types';
import { ConversationsModel } from '../models/ConversationsModel';
import { MetadataConversationsModel } from '../models/MetadataConversationsModel';
import { experimentsService } from './experiments.service';
import { usersService } from './users.service';

dotenv.config();

const { OPENAI_API_KEY } = process.env;
if (!OPENAI_API_KEY) throw new Error('Server is not configured with OpenAI API key');
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

class ConversationsService {
    message = async (message, conversationId: string, streamResponse?) => {
        const [conversation, metadataConversation] = await Promise.all([
            this.getConversation(conversationId, true),
            this.getConversationMetadata(conversationId),
        ]);

        if (
            metadataConversation.maxMessages &&
            metadataConversation.messagesNumber + 1 > metadataConversation.maxMessages
        ) {
            const error = new Error('Message limit exceeded');
            error['code'] = 403;
            throw error;
        }

<<<<<<< HEAD
        const messages: any[] = this.getConversationMessages(metadataConversation.agent, conversation, message);
        const chatRequest = this.getChatRequest(metadataConversation.agent, messages);
        await this.createMessageDoc(message, conversationId, conversation.length + 1);

        let assistantMessage = '';

=======
        const agent = JSON.parse(JSON.stringify(metadataConversation.agent));
        //const { cameraCaptureRate, ...agentWithoutCameraCaptureRate } = agent;
        //console.log(agent)
        const ccr = agent.cameraCaptureRate
        const vai = agent.vaIntegration
        const timeDelay = agent.inverseTimeDelay
        
        //console.log("vai", vai)
        //console.log("ccr", ccr)
        delete agent.cameraCaptureRate;
        delete agent.vaIntegration;
        //let tempt = await CurrentStateModels.find({ }).exec();
        //console.log(tempt)
        let val = 0;
        let ar = 0
        
        if ( ccr != null && vai != null ) {
            const current_state = await this.getCurrentState(conversationId)
            val = current_state[0]["valence"] / current_state[0]["count"]
            ar = current_state[0]["arousal"] / current_state[0]["count"]
        }
        //console.log(current_state[0]["valence"])
        //console.log(current_state[0]["arousal"])
        
        const og_text = { ...message };
        //console.log(og_text)
        const messages: any[] = this.getConversationMessages(agent, conversation, message, val, ar, ccr, vai);
        const chatRequest = this.getChatRequest(agent, messages);
        await this.createMessageDoc(message, conversationId, conversation.length + 1, val, ar);

        let assistantMessage = '';
        let streamExplainable = streamResponse;
>>>>>>> f08c762 (some updates with delay function)
        if (!streamResponse) {
            const response = await openai.chat.completions.create(chatRequest);
            assistantMessage = response.choices[0].message.content?.trim();
            //const num_word = assistantMessage.trim().split(/\s+/).length;
            //console.log(num_word)
            //await new Promise(resolve => setTimeout(resolve, (num_word) * 1000));
        } else {
            const responseStream = await openai.chat.completions.create({ ...chatRequest, stream: true });
            for await (const partialResponse of responseStream) {
                const assistantMessagePart = partialResponse.choices[0]?.delta?.content || '';
                await streamResponse(assistantMessagePart);
                assistantMessage += assistantMessagePart;
            }
            //const num_word = assistantMessage.trim().split(/\s+/).length;
            //console.log(num_word)
            //await new Promise(resolve => setTimeout(resolve, (num_word) * 1000));
        }
        //console.log("before create message", timeDelay)
        const savedMessage = await this.createMessageDoc(
            {
                content: assistantMessage,
                role: 'assistant',
                timeDelay: timeDelay
            },
            conversationId,
            conversation.length + 2,
        );

        this.updateConversationMetadata(conversationId, {
            $inc: { messagesNumber: 1 },
            $set: { lastMessageDate: new Date(), lastMessageTimestamp: Date.now() },
        });

<<<<<<< HEAD
=======
        if ( ccr != null && vai != null ) {
            const Exmessages: any[] = this.getExplainableText(agent, conversation, message, val, ar);
            const ExchatRequest = this.getChatRequest(agent, Exmessages);

            let ExassistantMessage = '';        

            if (true) {
                const response = await openai.chat.completions.create(ExchatRequest);
                ExassistantMessage = response.choices[0].message.content?.trim();
            } 
            /*else {
                const responseStream = await openai.chat.completions.create({ ...ExchatRequest, stream: true });
                for await (const partialResponse of responseStream) {
                    const assistantMessagePart = partialResponse.choices[0]?.delta?.content || '';
                    await streamResponse(assistantMessagePart);
                    ExassistantMessage += assistantMessagePart;
                }
            }*/
            console.log("idk why", og_text)
            await this.createExplainableDoc(
                og_text,
                message,
                {
                    content: ExassistantMessage,
                    role: 'assistant',
                    timeDelay: timeDelay
                },
                conversationId,
                conversation.length + 2,
                val,
                ar,
            );
        }
        //console.log(savedMessage)
>>>>>>> f08c762 (some updates with delay function)
        return savedMessage;
    };

    createConversation = async (userId: string, userConversationsNumber: number, experimentId: string) => {
        let agent;
        const [user, experimentBoundries] = await Promise.all([
            usersService.getUserById(userId),
            experimentsService.getExperimentBoundries(experimentId),
        ]);

        if (
            !user.isAdmin &&
            experimentBoundries.maxConversations &&
            userConversationsNumber + 1 > experimentBoundries.maxConversations
        ) {
            const error = new Error('Conversations limit exceeded');
            error['code'] = 403;
            throw error;
        }

        if (user.isAdmin) {
            agent = await experimentsService.getActiveAgent(experimentId);
        }

        const res = await MetadataConversationsModel.create({
            conversationNumber: userConversationsNumber + 1,
            experimentId,
            userId,
            agent: user.isAdmin ? agent : user.agent,
            maxMessages: user.isAdmin ? undefined : experimentBoundries.maxMessages,
        });

        const firstMessage: Message = {
            role: 'assistant',
            content: user.isAdmin ? agent.firstChatSentence : user.agent.firstChatSentence,
            timeDelay: null
        };
        await Promise.all([
            this.createMessageDoc(firstMessage, res._id.toString(), 1),
            usersService.addConversation(userId),
            !user.isAdmin && experimentsService.addSession(experimentId),
        ]);

        return res._id.toString();
    };

    getConversation = async (conversationId: string, isLean = false): Promise<Message[]> => {
        const returnValues = isLean
            ? { _id: 0, role: 1, content: 1, timeDelay: 1}
            : { _id: 1, role: 1, content: 1, timeDelay: 1, userAnnotation: 1 };

        const conversation = await ConversationsModel.find({ conversationId }, returnValues);

        return conversation;
    };

    updateConversationSurveysData = async (conversationId: string, data, isPreConversation: boolean) => {
        const saveField = isPreConversation ? { preConversation: data } : { postConversation: data };
        const res = await this.updateConversationMetadata(conversationId, saveField);

        return res;
    };

    getConversationMetadata = async (conversationId: string): Promise<any> => {
        const res = await MetadataConversationsModel.findOne({ _id: new mongoose.Types.ObjectId(conversationId) });
        return res;
    };

    getUserConversations = async (userId: string): Promise<any> => {
        const conversations = [];
        const metadataConversations = await MetadataConversationsModel.find({ userId }, { agent: 0 }).lean();

        for (const metadataConversation of metadataConversations) {
            const conversation = await ConversationsModel.find({
                conversationId: metadataConversation._id,
            }).lean();
            conversations.push({
                metadata: metadataConversation,
                conversation,
            });
        }

        return conversations;
    };

    finishConversation = async (conversationId: string, experimentId: string, isAdmin: boolean): Promise<void> => {
        const res = await MetadataConversationsModel.updateOne(
            { _id: new mongoose.Types.ObjectId(conversationId) },
            { $set: { isFinished: true } },
        );

        if (res.modifiedCount && !isAdmin) {
            await experimentsService.closeSession(experimentId);
        }
    };

    deleteExperimentConversations = async (experimentId: string): Promise<void> => {
        const conversationIds = await this.getExperimentConversationsIds(experimentId);
        await Promise.all([
            MetadataConversationsModel.deleteMany({ _id: { $in: conversationIds.ids } }),
            ConversationsModel.deleteMany({ conversationId: { $in: conversationIds.strIds } }),
        ]);
    };

    updateUserAnnotation = async (messageId: string, userAnnotation: UserAnnotation): Promise<Message> => {
        const message: Message = await ConversationsModel.findOneAndUpdate(
            { _id: messageId },
            { $set: { userAnnotation } },
            { new: true },
        );

        return message;
    };

    private updateConversationMetadata = async (conversationId, fields) => {
        try {
            const res = await MetadataConversationsModel.updateOne(
                { _id: new mongoose.Types.ObjectId(conversationId) },
                fields,
            );
            return res;
        } catch (error) {
            console.error(`updateConversationMetadata - ${error}`);
        }
    };

    private getConversationMessages = (agent: IAgent, conversation: Message[], message: Message) => {
        const systemPrompt = { role: 'system', content: agent.systemStarterPrompt };
        const beforeUserMessage = { role: 'system', content: agent.beforeUserSentencePrompt };
        const afterUserMessage = { role: 'system', content: agent.afterUserSentencePrompt };
<<<<<<< HEAD

=======
        const inverseTimeDelay = { role: 'system', content: agent.inverseTimeDelay };
        if ( ccr != null && vai != null ) {
            const final_message = "The valence of the user is "+ val + " and the arousal is "+ ar + "while user replies to you " + message["content"]
            message["content"] = final_message
        }
        console.log(message)
>>>>>>> f08c762 (some updates with delay function)
        const messages = [
            systemPrompt,
            ...conversation,
            beforeUserMessage,
            message,
            afterUserMessage,
            { role: 'assistant', content: '', timeDelay: inverseTimeDelay },
        ];

        return messages;
    };

<<<<<<< HEAD
=======
    private getExplainableText = (settings: any, conversation: any[], message: any, val: number, ar: number) => {
        const systemPrompt: Message = { role: 'system', content: "", timeDelay: null };
        const beforeUserMessage = { role: 'system', content: "" };
        const afterUserMessage = { role: 'system', content: "" };
        //console.log(message)
        const final_message = "The valence of the user is "+ val + " and the arousal is "+ ar + ". What do you understand from these about the emotions expressed by the user? What behavioral qualities should be displayed while responding to this user to improve their mental state?"
        message["content"] = final_message
        console.log(message)
        const messages: any = [
            systemPrompt,
            ...conversation,
            beforeUserMessage,
            message,
            afterUserMessage,
            { role: 'assistant', content: '' },
        ];

        return messages;
    };

>>>>>>> f08c762 (some updates with delay function)
    private createMessageDoc = async (
        message: Message,
        conversationId: string,
        messageNumber: number,
    ): Promise<Message> => {
        
        const res = await ConversationsModel.create({
            content: message.content,
            role: message.role,
            conversationId,
            messageNumber,
<<<<<<< HEAD
=======
            valence: val,
            arousal: ar,
            timeDelay: message.timeDelay,
>>>>>>> f08c762 (some updates with delay function)
        });
        //console.log("resTimeDelay", res.timeDelay)
        return { _id: res._id, role: res.role, content: res.content, userAnnotation: res.userAnnotation, timeDelay: res.timeDelay };
    };

    private getChatRequest = (agent: IAgent, messages: Message[]) => {
        const chatCompletionsReq = {
            messages,
            model: agent.model,
        };

        if (agent.maxTokens) chatCompletionsReq['max_tokens'] = agent.maxTokens;
        if (agent.frequencyPenalty) chatCompletionsReq['frequency_penalty'] = agent.frequencyPenalty;
        if (agent.topP) chatCompletionsReq['top_p'] = agent.topP;
        if (agent.temperature) chatCompletionsReq['temperature'] = agent.temperature;
        if (agent.presencePenalty) chatCompletionsReq['presence_penalty'] = agent.presencePenalty;
        if (agent.stopSequences) chatCompletionsReq['stop'] = agent.stopSequences;

        return chatCompletionsReq;
    };

    private getExperimentConversationsIds = async (
        experimentId: string,
    ): Promise<{ ids: mongoose.Types.ObjectId[]; strIds: string[] }> => {
        const conversationsIds = await MetadataConversationsModel.aggregate([
            { $match: { experimentId } },
            { $project: { _id: 1, id: { $toString: '$_id' } } },
            { $group: { _id: null, ids: { $push: '$_id' }, strIds: { $push: '$id' } } },
            { $project: { _id: 0, ids: 1, strIds: 1 } },
        ]);
        return conversationsIds[0];
    };
}

export const conversationsService = new ConversationsService();
