import { useEffect, useRef, useState } from 'react';
import { SnackbarStatus, useSnackbar } from '@contexts/SnackbarProvider';
import { MessageType } from '@models/AppModels';
import SendIcon from '@mui/icons-material/Send';
import MicIcon from '@mui/icons-material/Mic';
import MicOffIcon from '@mui/icons-material/MicOff';
import { Box, Button, IconButton, Typography } from '@mui/material';
import { sendMessage, sendStreamMessage } from '../../../../DAL/server-requests/conversations';
import { StyledInputBase, StyledInputBox } from './InputBox.s';

interface InputBoxProps {
    isMobile: boolean;
    messages: MessageType[];
    setMessages: (messages: MessageType[] | ((prevMessages: MessageType[]) => MessageType[])) => void;
    conversationId: string;
    setIsMessageLoading: (isLoading: boolean) => void;
    fontSize: string;
    isStreamMessage: boolean;
}

const InputBox_mic: React.FC<InputBoxProps> = ({
    isMobile,
    messages,
    fontSize,
    conversationId,
    setMessages,
    setIsMessageLoading,
    isStreamMessage,
}) => {
    const { openSnackbar } = useSnackbar();
    const [message, setMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState(null);
    const [isRecording, setIsRecording] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
    const audioChunks = useRef<Blob[]>([]);
    const timerRef = useRef<number | null>(null);

    // Audio visualizer setup
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
    const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
    const [animationId, setAnimationId] = useState<number | null>(null);

    useEffect(() => {
        if (isRecording) {
            timerRef.current = window.setInterval(() => {
                setRecordingTime((prev) => prev + 1);
            }, 1000);
        } else if (timerRef.current) {
            clearInterval(timerRef.current);
        }

        if (isRecording && audioContext) {
            visualizeAudio(analyser);
        }

        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [isRecording]);

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const recorder = new MediaRecorder(stream);
            recorder.ondataavailable = (event) => {
                if (event.data.size > 0) audioChunks.current.push(event.data);
            };
            recorder.onstop = () => {
                const audioBlob = new Blob(audioChunks.current, { type: 'audio/wav' });
                const audioUrl = URL.createObjectURL(audioBlob);
                console.log('Audio recorded:', audioUrl);
                audioChunks.current = [];
            };
            recorder.start();
            setMediaRecorder(recorder);
            setIsRecording(true);
            setRecordingTime(0);

            // Setup AudioContext for visualizer
            const audioCtx = new AudioContext();
            const analyserNode = audioCtx.createAnalyser();
            analyserNode.fftSize = 256;
            const source = audioCtx.createMediaStreamSource(stream);
            source.connect(analyserNode);
            setAudioContext(audioCtx);
            setAnalyser(analyserNode);

            // Start animation
            visualizeAudio(analyserNode);
        } catch (error) {
            console.error('Error accessing microphone:', error);
            openSnackbar('Microphone access denied', SnackbarStatus.ERROR);
        }
    };

    const stopRecording = () => {
        if (mediaRecorder) {
            mediaRecorder.stop();
            setIsRecording(false);
        }
        if (audioContext) {
            audioContext.close();
            setAudioContext(null);
        }
        if (animationId) {
            cancelAnimationFrame(animationId);
            setAnimationId(null);
        }
    };

    const visualizeAudio = (analyser: AnalyserNode) => {
        const canvas = canvasRef.current;
        if (!canvasRef.current) {
            console.error("Canvas not found - Retrying in 500ms...");
            setTimeout(() => visualizeAudio(analyser), 500); // Retry after 500ms
            return;
        }
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            console.error("Canvas context is null");
            return;
        }

        console.log("Canvas successfully found, starting visualization...");
    
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        console.log("Buffer Length in visual aud:", bufferLength);
    
        const draw = () => {
            analyser.getByteTimeDomainData(dataArray);
    
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.beginPath();
            ctx.strokeStyle = 'blue';
            ctx.lineWidth = 2;
    
            const sliceWidth = canvas.width / bufferLength;
            let x = 0;
    
            for (let i = 0; i < bufferLength; i++) {
                const v = dataArray[i] / 128.0;
                const y = (v * canvas.height) / 2;
    
                if (i === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }
                x += sliceWidth;
            }
    
            ctx.stroke();
            requestAnimationFrame(draw);
        };
    
        draw();
    };    

    const handleSendMessage = async () => {
        if (!message && !errorMessage && !message.trim().length) {
            openSnackbar('Message cannot be empty', SnackbarStatus.WARNING);
            return;
        }
        const messageContent: string = message || errorMessage;
        const conversation: MessageType[] = [...messages, { content: messageContent, role: 'user' }];
        setMessages(conversation);
        setMessage('');
        setIsMessageLoading(true);
        try {
            if (isStreamMessage && false) {
                sendStreamMessage(
                    { content: messageContent, role: 'user' },
                    conversationId,
                    onStreamMessage,
                    onCloseStream,
                    (error) => onMessageError(conversation, messageContent, error),
                );
            } else {
                const response = await sendMessage({ content: messageContent, role: 'user' }, conversationId);
                setMessages((prevMessages) => [...prevMessages, response]);
                setIsMessageLoading(false);
                setErrorMessage(null);
            }
        } catch (err) {
            onMessageError(conversation, messageContent, err);
        }
    };

    const onMessageError = (conversation, messageContent, error) => {
        setIsMessageLoading(false);
        setMessages([
            ...conversation,
            {
                content:
                    error.response && error.response.status && error.response.status === 403
                        ? 'Messeges Limit Exceeded'
                        : error?.response?.status === 400
                          ? 'Message Is Too Long'
                          : 'Network Error',
                role: 'assistant',
            },
        ]);
        openSnackbar('Failed to send message', SnackbarStatus.ERROR);
        setErrorMessage(messageContent);
    };

    const onCloseStream = (message: MessageType) => {
        setMessages((prevMessages) => [
            ...prevMessages.slice(0, -1),
            { ...prevMessages[prevMessages.length - 1], _id: message._id, userAnnotation: message.userAnnotation },
        ]);
    };

    const onStreamMessage = (assistantMessagePart: string) => {
        setIsMessageLoading(false);
        setMessages((prevMessages) => {
            const lastMessage = prevMessages[prevMessages.length - 1];
            if (lastMessage && lastMessage.role === 'assistant') {
                return [
                    ...prevMessages.slice(0, -1),
                    { ...lastMessage, content: lastMessage.content + assistantMessagePart },
                ];
            }

            return [...prevMessages, { content: assistantMessagePart, role: 'assistant' }];
        });
        setErrorMessage(null);
    };

    const handleKeyDown = (event) => {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            handleSendMessage();
        }
    };

    return (
        <Box
            style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                width: isMobile ? '95%' : '85%',
                alignItems: 'center',
            }}
        >
            {errorMessage ? (
                <Button
                    variant="contained"
                    onClick={() => {
                        setMessage(errorMessage);
                        handleSendMessage();
                    }}
                    style={{ width: 'fit-content', marginBottom: '24px' }}
                >
                    Resend Message
                </Button>
            ) : (
                <StyledInputBox>
                    <StyledInputBase
                        fullWidth
                        placeholder={isRecording ? "Recording in progress..." : "Type a message…"}
                        multiline
                        maxRows={5}
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        onKeyDown={handleKeyDown}
                        fontSize={fontSize === 'sm' ? '1rem' : '1.25rem'}
                        disabled={isRecording}
                    />
                    <IconButton color="primary" onClick={isRecording ? stopRecording : startRecording}>
                        {isRecording ? <MicOffIcon /> : <MicIcon />}
                    </IconButton>
                    <IconButton color="primary" onClick={handleSendMessage}>
                        <SendIcon />
                    </IconButton>
                </StyledInputBox>

            )};

            {isRecording && (
                <Box style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: 10 }}>
                    <Typography variant="body1" color="secondary">
                        Recording: {recordingTime}s
                    </Typography>
                    <canvas
                        ref={canvasRef}
                        width={300}
                        height={50}
                        style={{ backgroundColor: '#f5f5f5', borderRadius: '5px', marginTop: '10px' }}
                    />
                    <Button variant="contained" color="error" onClick={stopRecording} style={{ marginTop: 10 }}>
                        Stop
                    </Button>
                </Box>
            )}
        </Box>
    );
};

export default InputBox_mic;
