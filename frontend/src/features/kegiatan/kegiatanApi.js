import axios from 'axios';
const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
export const kegiatanApi = {
  getAll: () => axios.get(BASE_URL + '/kegiatan'),
  getOne: (id) => axios.get(BASE_URL + '/kegiatan/' + id),
  create: (data) => axios.post(BASE_URL + '/kegiatan', data),
  remove: (id) => axios.delete(BASE_URL + '/kegiatan/' + id),
};
