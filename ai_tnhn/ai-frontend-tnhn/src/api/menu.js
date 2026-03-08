import useSWR, { mutate } from 'swr';

const initialState = {
    isDashboardDrawerOpened: false
};

const URL = 'api/menu/master';

export function useGetMenuMaster() {
    const { data, isLoading } = useSWR(URL, () => initialState, {
        revalidateIfStale: false,
        revalidateOnFocus: false,
        revalidateOnReconnect: false
    });

    return {
        menuMaster: data || initialState,
        menuMasterLoading: isLoading
    };
}

export function handlerDrawerOpen(isDashboardDrawerOpened) {
    mutate(
        URL,
        (current) => {
            return { ...current, isDashboardDrawerOpened };
        },
        false
    );
}
