const calendarService = require('../services/calendar.service');

const createEvent = async (req, res, next) => {
  try {
    const event = await calendarService.createEvent(req.body, req.user._id);
    res.status(201).json({ success: true, data: event });
  } catch (error) {
    next(error);
  }
};

const getAllEvents = async (req, res, next) => {
  try {
    const events = await calendarService.getAllEvents(req.query);
    res.json({ success: true, data: events });
  } catch (error) {
    next(error);
  }
};

const getActiveEvents = async (req, res, next) => {
  try {
    const events = await calendarService.getActiveEvents(req.query.date);
    res.json({ success: true, data: events });
  } catch (error) {
    next(error);
  }
};

const getDemandAdjustment = async (req, res, next) => {
  try {
    const adjustment = await calendarService.getEventDemandAdjustment(
      req.query.date || new Date()
    );
    res.json({ success: true, data: adjustment });
  } catch (error) {
    next(error);
  }
};

const updateEvent = async (req, res, next) => {
  try {
    const event = await calendarService.updateEvent(req.params.id, req.body);
    res.json({ success: true, data: event });
  } catch (error) {
    next(error);
  }
};

const deleteEvent = async (req, res, next) => {
  try {
    await calendarService.deleteEvent(req.params.id);
    res.json({ success: true, message: 'Event deleted' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createEvent,
  getAllEvents,
  getActiveEvents,
  getDemandAdjustment,
  updateEvent,
  deleteEvent,
};
