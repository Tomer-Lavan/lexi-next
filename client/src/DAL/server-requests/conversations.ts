import { MessageType, AudioType } from '@root/models/AppModels';
import { ApiPaths } from '../constants';
import axiosInstance from './AxiosInstance';

const serialize = (obj) =>
    Object.keys(obj)
        .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(obj[key])}`)
        .join('&');

export const sendMessage = async (message: MessageType, conversationId: string): Promise<MessageType> => {
    try {
        const response = await axiosInstance.post(`/${ApiPaths.CONVERSATIONS_PATH}/message`, {
            message,
            conversationId,
        });
        //console.log(response)
        if(response.data.content && response.data.timeDelay != null) {
            const num_word = response.data.content.trim().split(/\s+/).length;
            console.log(num_word)
            await new Promise(resolve => setTimeout(resolve, (num_word / response.data.timeDelay) * 1000));
        }
        return response.data;
    } catch (error) {
        throw error;
    }
};

export const sendAudio = async (message: AudioType, conversationId: string): Promise<AudioType> => {
    console.log(message);

    const formData = new FormData();
    formData.append("audio", message.content); // Attach the Blob
    formData.append("role", message.role); // Attach other data
    formData.append("conversationId", conversationId); // Include conversation ID

    try {
        const response = await axiosInstance.post(
            `/${ApiPaths.CONVERSATIONS_PATH}/audio`,
            formData,
            { responseType: "blob" } // Ensures we receive binary audio data
        );

        // Convert response Blob into FormData
        const receivedFormData = new FormData();
        receivedFormData.append("audioBlob", response.data);

        // Extract metadata from headers if available
        const metadata = {
            contentType: response.headers["content-type"] || "audio/mpeg",
        };
        
        

        return {
            ...message, // Keep original message fields
            content: response.data, // Store the received audio as a Blob
            role: "assistant",
            //metadata, // Include metadata (optional)
        };
    } catch (error) {
        console.error("Error sending/receiving audio:", error);
        throw error;
    }
};



export const sendStreamMessage = (
    message: MessageType,
    conversationId: string,
    onMessageReceived: (message: string) => void,
    onCloseStream: (message: MessageType) => void,
    onError: (error?: Event | { code: number; message: string }) => void,
) => {
    const eventSource = new EventSource(
        `${process.env.REACT_APP_API_URL}/${ApiPaths.CONVERSATIONS_PATH}/message/stream?${serialize(
            message,
        )}&conversationId=${conversationId}`,
    );

    eventSource.addEventListener('close', (event) => {
        console.log('Server is closing the connection.');
        const message = JSON.parse(event.data);
        onCloseStream(message);
        eventSource.close();
    });

    eventSource.onmessage = (event) => {
        if (!event.data.trim()) {
            return;
        }

        const data = JSON.parse(event.data);

        if (data.error) {
            if (onError) {
                onError(data.error);
            }
            eventSource.close();
            return;
        }

        onMessageReceived(data.message);
    };

    eventSource.onerror = (error) => {
        if (eventSource.readyState === EventSource.CLOSED) {
            console.log('Connection was closed normally.');
        } else if (onError) {
            onError(error);
        }
        eventSource.close();
    };
};

export const createConversation = async (
    userId: string,
    numberOfConversations: number,
    experimentId: string,
): Promise<string> => {
    try {
        const response = await axiosInstance.post(`/${ApiPaths.CONVERSATIONS_PATH}/create`, {
            userId,
            numberOfConversations,
            experimentId,
        });
        return response.data;
    } catch (error) {
        throw error;
    }
};

export const getConversation = async (conversationId: string): Promise<MessageType[]> => {
    try {
        const response = await axiosInstance.get(
            `/${ApiPaths.CONVERSATIONS_PATH}/conversation?conversationId=${conversationId}`,
        );
<<<<<<< HEAD
=======
        //console.log(response["conversationMetaData"])
        
>>>>>>> f08c762 (some updates with delay function)
        return response.data;
    } catch (error) {
        throw error;
    }
};

export const updateConversationMetadata = async (
    conversationId: string,
    data: object,
    isPreConversation: boolean,
): Promise<void> => {
    try {
        await axiosInstance.put(`/${ApiPaths.CONVERSATIONS_PATH}/metadata`, {
            conversationId,
            data,
            isPreConversation,
        });
        return;
    } catch (error) {
        throw error;
    }
};

export const finishConversation = async (
    conversationId: string,
    experimentId: string,
    isAdmin: boolean,
): Promise<void> => {
    try {
        await axiosInstance.post(`/${ApiPaths.CONVERSATIONS_PATH}/finish`, {
            conversationId,
            experimentId,
            isAdmin,
        });
        return;
    } catch (error) {
        throw error;
    }
};

export const updateUserAnnotation = async (messageId: string, userAnnotation: number): Promise<void> => {
    try {
        await axiosInstance.put(`/${ApiPaths.CONVERSATIONS_PATH}/annotation`, {
            messageId,
            userAnnotation,
        });
        return;
    } catch (error) {
        throw error;
    }
};
