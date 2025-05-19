import { Box, Typography } from "@mui/material";
import theme from "@root/Theme";
import { MessageType } from "@root/models/AppModels";
import UserAnnotation from "./UserAnnotation";
import { useEffect, useRef, useState } from "react";
import WaveSurfer from "wavesurfer.js";

interface MessageProps {
    message: MessageType;
    role: string;
    size?: 'sm' | 'lg';
    experimentHasUserAnnotation: boolean;
    handleUpdateUserAnnotation: (messageId, userAnnotation) => void;
}

const Message: React.FC<MessageProps> = ({
    experimentHasUserAnnotation,
    size = 'lg',
    message,
    role,
    handleUpdateUserAnnotation,
}) => {
    const isUser = role === "user";
    const waveformRef = useRef(null);
    const wavesurferRef = useRef<WaveSurfer | null>(null);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);

    useEffect(() => {
        if (message.content instanceof Blob) {
            const url = URL.createObjectURL(message.content);
            setAudioUrl(url);
        } else {
            setAudioUrl(null);
        }

        return () => {
            if (audioUrl) {
                URL.revokeObjectURL(audioUrl);
            }
        };
    }, [message.content]);

    // Initialize WaveSurfer for audio messages
    useEffect(() => {
        if (audioUrl && waveformRef.current) {
            wavesurferRef.current = WaveSurfer.create({
                container: waveformRef.current,
                waveColor: "#ddd",
                progressColor: isUser ? theme.palette.primary.main : "#4caf50",
                cursorColor: "transparent",
                barWidth: 3,
                autoCenter: true,
                height: 50,
            });

            wavesurferRef.current.load(audioUrl);
        }

        return () => {
            if (wavesurferRef.current) {
                wavesurferRef.current.destroy();
            }
        };
    }, [audioUrl]);

    const getFormattedMessage = (content) => {
        if (typeof content === "string") {
        
        const parts = content
            .split(/(\*\*.*?\*\*)/g)
            .map((part) =>
                part.startsWith('**') && part.endsWith('**') ? <b key={part}>{part.slice(2, -2)}</b> : part,
            );
            return parts;
        }
        else {
            // do something
        }
        
    };

    const togglePlay = () => {
        if (wavesurferRef.current) {
            wavesurferRef.current.playPause();
            setIsPlaying(!isPlaying);
        }
    };

    return (
        <Box
            sx={{
                marginBottom: 1.5,
                maxWidth: '80%',
                display: 'inline-block',
                float: isUser ? 'right' : 'left',
                clear: 'both',
            }}
        >
            <Box display={'flex'} flexDirection={'column'}>
                <Box
                    sx={{
                        marginBottom: 1,
                        padding: '16px 16px 24px 16px',
                        borderRadius: isUser ? '26px 26px 0 26px' : '26px 26px 26px 0',
                        background: isUser ? theme.palette.userMessage.main : theme.palette.assistantMessage.main,
                        display: 'inline-block',
                        clear: 'both',
                        float: isUser ? 'right' : 'left',
                        fontFamily: 'Lato',
                    }}
                >
                {audioUrl ? (
                        <Box sx={{ display: "flex", alignItems: "center" }}>
                            <button onClick={togglePlay} style={{ marginRight: 10 }}>
                                {isPlaying ? "⏸️" : "▶️"}
                            </button>
                            <div ref={waveformRef} style={{ width: "150px" }} />
                        </Box>
                    ) : (
                        <Typography
                            variant="body2"
                            sx={{
                                whiteSpace: "pre-line",
                                fontSize: size === "sm" ? "1rem" : "1.25rem",
                                fontWeight: 500,
                            }}
                        >
                            {getFormattedMessage(message.content)}
                        </Typography>
                    )}
                </Box>
                {!isUser && experimentHasUserAnnotation && message._id && (
                    <UserAnnotation
                        key={message._id}
                        message={message}
                        handleUpdateUserAnnotation={handleUpdateUserAnnotation}
                    />
                )}
            </Box>
        </Box>
    );
};

export default Message;
