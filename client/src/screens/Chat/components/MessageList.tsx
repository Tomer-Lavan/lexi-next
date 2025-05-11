import LoadingDots from '@components/loadig-dots/LoadingDots';
import { Box } from '@mui/material';
import { MessageType } from '@root/models/AppModels';
import Message from './Message';
<<<<<<< HEAD
=======
import { useEffect, useState } from 'react';
>>>>>>> 17c7125 (audio feature extraction)

interface MessageListProps {
    isMobile: boolean;
    messages: MessageType[];
    isMessageLoading: boolean;
    size: 'sm' | 'lg';
    handleUpdateUserAnnotation: (messageId, userAnnotation) => void;
    experimentHasUserAnnotation: boolean;
}

const MessageList: React.FC<MessageListProps> = ({
    isMobile,
    messages,
    isMessageLoading,
    size,
    experimentHasUserAnnotation,
    handleUpdateUserAnnotation,
<<<<<<< HEAD
}) => (
=======
}) => {

    const [showLoadingDots, setShowLoadingDots] = useState(false);

    useEffect(() => {


        let timer;
        if (isMessageLoading) {
            timer = setTimeout(() => {
                setShowLoadingDots(true);
            }, 500);
        } else {
            setShowLoadingDots(false)
        }
        console.log('MessageList props:', {
            isMobile,
            messages,
            isMessageLoading,
            size,
            experimentHasUserAnnotation,
            handleUpdateUserAnnotation,
        });

        return () => clearTimeout(timer);
    }, [isMobile, messages, isMessageLoading, size, experimentHasUserAnnotation, handleUpdateUserAnnotation]);

    return (
>>>>>>> 17c7125 (audio feature extraction)
    <Box height="100%" width={isMobile ? '100%' : '85%'} padding={2}>
        {messages.map((message, index) => (
            <Message
                key={index}
                message={message}
                role={message.role}
                size={size}
                handleUpdateUserAnnotation={handleUpdateUserAnnotation}
                experimentHasUserAnnotation={experimentHasUserAnnotation}
            />
        ))}
        {showLoadingDots && <LoadingDots />}
    </Box>
);

export default MessageList;
