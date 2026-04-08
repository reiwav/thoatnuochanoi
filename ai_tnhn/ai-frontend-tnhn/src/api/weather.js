import axiosClient from './axiosClient';

const weatherApi = {
    getForecast: () => {
        return axiosClient.get('/admin/google/weather/forecast');
    }
};

export default weatherApi;
