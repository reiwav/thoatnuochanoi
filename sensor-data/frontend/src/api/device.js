import axiosClient from './axiosClient';

const deviceApi = {
  getAll: () => axiosClient.get('/devices'),
  updateConfig: (id, config) => axiosClient.patch(`/devices/${id}/config`, config),
};

export default deviceApi;
