import express from 'express';
import Joi from 'joi';

import { assert } from '../lib/errors.js';
import { mutateStore, readStore, nextId } from '../lib/store.js';
import { authenticate, requireUser } from '../middleware/auth.js';

const router = express.Router();

const requestSchema = Joi.object({
  borrowing_account_id: Joi.string().trim().required(),
});

function createNotification(store, userId, message) {
  const notification = {
    id: nextId(store, 'notifications'),
    user_id: userId,
    type: 'friend_request',
    message,
    is_read: false,
    created_at: new Date().toISOString(),
  };
  store.notifications.push(notification);
}

const actionSchema = Joi.object({
  requestId: Joi.number().integer().required(),
});

router.use(authenticate, requireUser);

router.get('/', async (req, res, next) => {
  try {
    const store = await readStore();
    const requests = store.friends.filter(
      (entry) =>
        entry.requester_id === req.auth.user.id || entry.target_id === req.auth.user.id,
    );
    const enriched = requests.map((entry) => {
      const isRequester = entry.requester_id === req.auth.user.id;
      const otherUserId = isRequester ? entry.target_id : entry.requester_id;
      const otherUser = store.users.find((u) => u.id === otherUserId);
      return {
        ...entry,
        isRequester,
        peer: otherUser
          ? {
              id: otherUser.id,
              full_name: otherUser.full_name,
              email: otherUser.email,
              college_email: otherUser.college_email,
              borrowing_account_id: otherUser.borrowing_account_id,
              course_name: otherUser.course_name,
              year: otherUser.year,
              shri_score: otherUser.shri_score,
            }
          : null,
      };
    });
    res.json(enriched);
  } catch (error) {
    next(error);
  }
});

router.post('/request', async (req, res, next) => {
  try {
    const payload = await requestSchema.validateAsync(req.body, { abortEarly: false });

    const result = await mutateStore(async (store) => {
      const target = store.users.find((user) => user.borrowing_account_id === payload.borrowing_account_id);
      assert(target, 404, 'Borrower with the provided account ID was not found');
      assert(target.id !== req.auth.user.id, 400, 'Cannot send a friend request to yourself');

      const existing = store.friends.find(
        (entry) =>
          (entry.requester_id === req.auth.user.id && entry.target_id === target.id) ||
          (entry.requester_id === target.id && entry.target_id === req.auth.user.id),
      );
      assert(!existing, 409, 'A friend request or relationship already exists');

      const record = {
        id: nextId(store, 'friends'),
        requester_id: req.auth.user.id,
        target_id: target.id,
        status: 'pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      store.friends.push(record);
      createNotification(store, target.id, `New friend request from ${req.auth.user.email}`);
      return record;
    });

    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

router.post('/accept', async (req, res, next) => {
  try {
    const payload = await actionSchema.validateAsync(req.body, { abortEarly: false });
    const record = await mutateStore(async (store) => {
      const request = store.friends.find((entry) => entry.id === payload.requestId);
      assert(request, 404, 'Friend request not found');
      assert(request.target_id === req.auth.user.id, 403, 'You are not authorized to accept this request');
      assert(request.status === 'pending', 400, 'Friend request is not pending');
      request.status = 'accepted';
      request.updated_at = new Date().toISOString();
      createNotification(store, request.requester_id, `Your friend request to ${req.auth.user.email} was accepted`);
      return request;
    });
    res.json(record);
  } catch (error) {
    next(error);
  }
});

router.post('/remove', async (req, res, next) => {
  try {
    const payload = await actionSchema.validateAsync(req.body, { abortEarly: false });
    const removed = await mutateStore(async (store) => {
      const index = store.friends.findIndex(
        (entry) =>
          entry.id === payload.requestId &&
          (entry.requester_id === req.auth.user.id || entry.target_id === req.auth.user.id),
      );
      assert(index !== -1, 404, 'Friend request or relationship not found');
      const [record] = store.friends.splice(index, 1);
      const otherUserId = record.requester_id === req.auth.user.id ? record.target_id : record.requester_id;
      createNotification(store, otherUserId, `Friend connection with ${req.auth.user.email} has been removed`);
      return record;
    });
    res.json(removed);
  } catch (error) {
    next(error);
  }
});

export default router;
