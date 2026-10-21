import { Router } from 'express';
import { getAuth } from '@clerk/express';
import { db, accountPlanAccess } from '@workspace/db';
import { eq } from 'drizzle-orm';
import { GetStudyCoursesResponse, GetStudyCourseLessonResponse } from '@workspace/api-zod';
import { STUDY_COURSE_ID, TEACHING_LESSONS, teachingCatalog } from '../lib/study-courses';
import { effectiveStudyPlan } from '../lib/web-billing';

const router = Router();
router.get('/courses', async (req, res) => {
  const userId = getAuth(req).userId;
  if (!userId) { res.status(401).json({ error: 'Sign in required' }); return; }
  const [access] = await db.select().from(accountPlanAccess).where(eq(accountPlanAccess.userId, userId));
  res.json(GetStudyCoursesResponse.parse(teachingCatalog(await effectiveStudyPlan(userId, access?.plan) === 'premium')));
});
router.get('/courses/:courseId/lessons/:lessonId', async (req, res) => {
  const userId = getAuth(req).userId;
  if (!userId) { res.status(401).json({ error: 'Sign in required' }); return; }
  const [access] = await db.select().from(accountPlanAccess).where(eq(accountPlanAccess.userId, userId));
  if (await effectiveStudyPlan(userId, access?.plan) !== 'premium') {
    res.status(403).json({ error: 'الخطة الكاملة مطلوبة لفتح دروس الدراسة.', reason: 'premium-required' });
    return;
  }
  const lesson = req.params.courseId === STUDY_COURSE_ID && TEACHING_LESSONS.find(item => item.id === req.params.lessonId);
  if (!lesson) { res.status(404).json({ error: 'لم نجد هذا الدرس.' }); return; }
  res.json(GetStudyCourseLessonResponse.parse(lesson));
});
export default router;
