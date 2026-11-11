import express from 'express';

import { readStore, getMasterData } from '../lib/store.js';

const router = express.Router();

router.get('/states', async (_req, res, next) => {
  try {
    const store = await readStore();
    res.json(store.states);
  } catch (error) {
    next(error);
  }
});

router.get('/districts', async (req, res, next) => {
  try {
    const { stateCode } = req.query;
    const store = await readStore();
    const districts = stateCode
      ? store.districts.filter((district) => district.stateCode === String(stateCode))
      : store.districts;
    res.json(districts);
  } catch (error) {
    next(error);
  }
});

router.get('/universities', async (req, res, next) => {
  try {
    const { stateCode, districtCode } = req.query;
    const store = await readStore();
    const universities = store.universities.filter((university) => {
      if (stateCode && university.stateCode !== String(stateCode)) return false;
      if (districtCode && university.districtCode !== String(districtCode)) return false;
      return true;
    });
    res.json(universities);
  } catch (error) {
    next(error);
  }
});

router.get('/interest-slabs', async (_req, res, next) => {
  try {
    const master = getMasterData();
    res.json(master.interestSlabs);
  } catch (error) {
    next(error);
  }
});

router.get('/loan-purposes', async (_req, res, next) => {
  try {
    const master = getMasterData();
    res.json(master.loanPurposes);
  } catch (error) {
    next(error);
  }
});

router.get('/shri-tiers', async (_req, res, next) => {
  try {
    const master = getMasterData();
    res.json(master.shriTiers);
  } catch (error) {
    next(error);
  }
});

export default router;
