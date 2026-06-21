import axios from 'axios';
const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
export const iplApi = {
  getAll: () => axios.get(BASE_URL + '/ipl'),
  getOne: (id) => axios.get(BASE_URL + '/ipl/' + id),
  create: (data) => axios.post(BASE_URL + '/ipl', data),
  update: (id, data) => axios.put(BASE_URL + '/ipl/' + id, data),
  remove: (id) => axios.delete(BASE_URL + '/ipl/' + id),
};
