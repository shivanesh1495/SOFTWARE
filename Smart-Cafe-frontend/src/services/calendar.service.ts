import api from './api.config';

// Types
export interface AcademicEvent {
  _id: string;
  name: string;
  eventType: 'Exam' | 'Holiday' | 'Festival' | 'Graduation' | 'Orientation' | 'Vacation' | 'Event';
  startDate: string;
  endDate: string;
  demandMultiplier: number;
  description?: string;
  isActive: boolean;
  createdAt: string;
}

export interface DemandAdjustment {
  date: string;
  multiplier: number;
  events: AcademicEvent[];
}

// ========== CALENDAR ENDPOINTS ==========

export const getActiveEvents = async (): Promise<AcademicEvent[]> => {
  const response = await api.get('/calendar/active');
  return response.data.data;
};

export const getAllEvents = async (): Promise<AcademicEvent[]> => {
  const response = await api.get('/calendar');
  return response.data.data;
};

export const createEvent = async (data: Partial<AcademicEvent>): Promise<AcademicEvent> => {
  const response = await api.post('/calendar', data);
  return response.data.data;
};

export const updateEvent = async (id: string, data: Partial<AcademicEvent>): Promise<AcademicEvent> => {
  const response = await api.put(`/calendar/${id}`, data);
  return response.data.data;
};

export const deleteEvent = async (id: string): Promise<void> => {
  await api.delete(`/calendar/${id}`);
};

export const getDemandAdjustment = async (date: string): Promise<DemandAdjustment> => {
  const response = await api.get('/calendar/demand-adjustment', { params: { date } });
  return response.data.data;
};
