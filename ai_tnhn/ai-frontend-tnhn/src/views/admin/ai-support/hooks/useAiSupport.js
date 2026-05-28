import useChatCore from './useChatCore';
import useChatIntegrations from './useChatIntegrations';
import useAuthStore from 'store/useAuthStore';
import { useMediaQuery } from '@mui/material';
import { useTheme } from '@mui/material/styles';

const useAiSupport = () => {
    const { user: userInfo, hasPermission } = useAuthStore();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));

    const core = useChatCore();
    const integrations = useChatIntegrations({
        setMessages: core.setMessages,
        setLoading: core.setLoading,
        shouldScrollToBottom: core.shouldScrollToBottom
    });

    return {
        userInfo,
        hasPermission,
        theme,
        isMobile,
        ...core,
        ...integrations
    };
};

export default useAiSupport;
