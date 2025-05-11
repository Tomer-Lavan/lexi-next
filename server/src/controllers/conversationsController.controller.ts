import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { conversationsService } from '../services/conversations.service';
import { requestHandler } from '../utils/requestHandler';
//import * as fs from 'fs/promises';
import * as path from 'path';
const fs = require('fs');
import { format } from 'date-fns';
//import { TimeSeriesAggregationType } from 'redis';
import multer, { Multer } from "multer";
import FormData from "form-data";

const upload = multer({ storage: multer.memoryStorage() });

// Extend Request type to include `file`
interface MulterRequest extends Request {
    file?: Multer.File;
}

async function checkFolderExists(folderPath: string): Promise<boolean> {
    try {
      await fs.access(folderPath);
      return true;
    } catch (error) {
      return false;
    }
}

class ConvesationsController {
    message = requestHandler(
        async (req: Request, res: Response) => {
            const { message, conversationId }: { message: any; conversationId: string } = req.body;
            this.validateMessage(message.content);

            const savedResponse = await conversationsService.message(message, conversationId);
            //console.log(savedResponse);
            res.status(200).send(savedResponse);
        },
        (req, res, error) => {
            if (error.code === 403) {
                res.status(403).json({ message: 'Messages Limit Exceeded' });
                return;
            }
            if (error.code === 'context_length_exceeded') {
                res.status(400).json({ message: 'Message Is Too Long' });
                return;
            }
            res.status(500).json({ message: 'Internal Server Error' });
        },
    );

    audio = [
        upload.single("audio"),
        requestHandler(
            async (req: MulterRequest, res: Response) => {
                const { role, conversationId } = req.body;
                const audioBlob = req.file?.buffer;
    
                if (!audioBlob) {
                    return res.status(400).json({ message: "Audio file is missing" });
                }
    
                const savedResponse = await conversationsService.audio(
                    { content: audioBlob, role },
                    conversationId
                );
    
                console.log(savedResponse);
    
                // Create FormData response
                const formData = new FormData();
                formData.append("metadata", JSON.stringify({
                    _id: savedResponse._id,
                    role: savedResponse.role,
                    userAnnotation: savedResponse.userAnnotation,
                    timeDelay: savedResponse.timeDelay,
                    contentType: "audio/mpeg",
                }));
    
                formData.append("audio", savedResponse.content, {
                    filename: "response_audio.mp3",
                    contentType: "audio/mpeg",
                });
    
                // Set headers manually
                res.setHeader("Content-Type", `multipart/form-data; boundary=${formData.getBoundary()}`);
    
                // Pipe FormData response to the client
                formData.pipe(res);
            },
            (req, res, error) => {
                res.status(500).json({ message: "Internal Server Error" });
            }
        ),
    ];
    


    sendSnap = requestHandler(async (req: Request, res: Response) => {
        //console.log("I am in function");
        try{
            //console.log("Hello world");
            const { image, conversationId, experimentId }: { image, conversationId: string , experimentId: string} = req.body;
            const temp = `${conversationId}_${experimentId}`;
            const folderPath = path.join("webcamBase/", temp);
            const now = new Date();
            const formattedDateTime = format(now, 'yyyyMMddHHmmss');
            //console.log('Image data:', image);
            const parts = image.split(',');
            if (parts.length < 2) {
                console.error('Invalid base64 image data');
                process.exit(1);
            }
            const base64Data = parts[1];
            // Debug: Check base64 string
            //console.log(base64Data.length); // Should be a large number
            //console.log(base64Data.substring(0, 30)); // Check first few characters

            // Convert to buffer
            const buffer = Buffer.from(base64Data, 'base64');

            checkFolderExists(folderPath).then((exists) => {
                if (exists) {
                    console.log('Folder exists');
                    //const buffer = Buffer.from(image.split(',')[1], 'base64');
                    fs.writeFileSync(`${folderPath}/${formattedDateTime}.png`, buffer);
                    res.sendStatus(200);
                } else {
                    try{
                        console.log('Folder does not exist');
                        fs.mkdirSync(folderPath);
                        console.log('Folder created successfully');
                    } catch(err) {
                        console.log(err)
                    }
                    //const buffer = Buffer.from(image.split(',')[1], 'base64');
                    fs.writeFileSync(`${folderPath}/${formattedDateTime}.png`, buffer);
                    res.sendStatus(200);
                }})
        }
        catch (err) {
            console.log(err);
        }
    });

    streamMessage = requestHandler(
        async (req: Request, res: Response) => {
            const conversationId = req.query.conversationId as string;
            const role = req.query.role as string;
            const content = req.query.content as string;
            const message = { role, content };
            this.validateMessage(message.content);

            res.writeHead(200, {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                Connection: 'keep-alive',
            });

            const streamResponse = async (partialMessage) => {
                res.write(`data: ${JSON.stringify({ message: partialMessage })}\n\n`);
            };

            const closeStream = async (message) => {
                res.write(`event: close\ndata: ${JSON.stringify(message)}\n\n`);
                res.end();
            };

            const savedResponse = await conversationsService.message(message, conversationId, streamResponse);
            closeStream(savedResponse);
        },
        (req, res, error) => {
            if (error.code === 403) {
                res.write(
                    `data: ${JSON.stringify({
                        error: { response: { status: 403, data: 'Messages Limit Exceeded' } },
                    })}\n\n`,
                );
                res.end();
                return;
            }
            if (error.code === 'context_length_exceeded') {
                res.write(
                    `data: ${JSON.stringify({
                        error: { response: { status: 400, data: 'Message Is Too Long' } },
                    })}\n\n`,
                );
                res.end();
                return;
            }
            res.write(
                `data: ${JSON.stringify({
                    error: { response: { status: 500, data: 'Internal Server Error' } },
                })}\n\n`,
            );
            res.end();
        },
    );

    createConversation = requestHandler(
        async (req: Request, res: Response) => {
            const { userId, numberOfConversations, experimentId } = req.body;
            const conversationId = await conversationsService.createConversation(
                userId,
                numberOfConversations,
                experimentId,
            );
            res.cookie('conversationId', conversationId, {
                secure: true,
                sameSite: 'none',
            });
            res.status(200).send(conversationId);
        },
        (_, res, error) => {
            if (error.code === 403) {
                res.status(403).json({ message: 'Conversations Limit Exceeded' });
                return;
            }
            res.status(500).json({ message: 'Internal Server Error' });
        },
    );

    getConversation = requestHandler(async (req: Request, res: Response) => {
        const conversationId = req.query.conversationId as string;

        if (!conversationId || !mongoose.Types.ObjectId.isValid(conversationId)) {
            res.status(401).send('Invalid convesationId');
            console.warn(`Invalid convesationId: ${conversationId}`);
            return;
        }

        const conversation = await conversationsService.getConversation(conversationId);

        res.status(200).send(conversation);
    });

    updateConversationMetadata = requestHandler(async (req: Request, res: Response) => {
        const { conversationId, data, isPreConversation } = req.body;

        await conversationsService.updateConversationSurveysData(conversationId, data, isPreConversation);

        res.status(200).send();
    });

    finishConversation = requestHandler(async (req: Request, res: Response) => {
        const { conversationId, experimentId, isAdmin } = req.body;

        await conversationsService.finishConversation(conversationId, experimentId, isAdmin);

        res.status(200).send();
    });

    updateUserAnnotation = requestHandler(async (req: Request, res: Response) => {
        const { messageId, userAnnotation } = req.body;
        await conversationsService.updateUserAnnotation(messageId, userAnnotation);

        res.status(200).send();
    });

    private validateMessage(message: string): void {
        if (typeof message !== 'string') {
            const error = new Error('Bad Request');
            error['code'] = 400;
            throw error;
        }

        const tokenLimit = 4096;
        const estimatedTokens = this.estimateTokenCount(message);

        if (estimatedTokens > tokenLimit) {
            const error = new Error('Message Is Too Long');
            error['code'] = 'context_length_exceeded';
            throw error;
        }
    }

    private estimateTokenCount(message: string): number {
        const charsPerToken = 4;
        return Math.ceil(message.length / charsPerToken);
    }
}

export const convesationsController = new ConvesationsController();
