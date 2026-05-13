import express from 'express';
import Joi from 'joi';

import { assert } from '../lib/errors.js';
import { mutateStore, readStore } from '../lib/store.js';
import { authenticate, requireUser } from '../middleware/auth.js';

const router = express.Router();

const markReadSchema = Joi.object({
  notificationId: Joi.number().integer().required(),
});

router.use(authenticate, requireUser);

router.get('/', async (req, res, next) => {
  try {
    const store = await readStore();
    const notifications = store.notifications
      .filter((entry) => entry.user_id === req.auth.user.id)
      .sort((left, right) => new Date(right.created_at) - new Date(left.created_at));
    res.json(notifications);
  } catch (error) {
    next(error);
  }
});

router.post('/mark-read', async (req, res, next) => {
  try {
    const payload = await markReadSchema.validateAsync(req.body, { abortEarly: false });
    const entry = await mutateStore(async (store) => {
      const notification = store.notifications.find((item) => item.id === payload.notificationId);
      assert(notification, 404, 'Notification not found');
      assert(notification.user_id === req.auth.user.id, 403, 'Cannot modify this notification');
      notification.is_read = true;
      return notification;
    });
    res.json(entry);
  } catch (error) {
    next(error);
  }
});

export default router;
