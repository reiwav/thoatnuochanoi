import axiosClient from './axiosClient';

const weatherApi = {
    getForecast: () => {
        return axiosClient.get('/admin/google/weather/forecast');
    },
    getGeminiForecast: () => {
        return axiosClient.get('/admin/google/weather/forecast/gemini');
    }
};

export default weatherApi;
