import { Router, type IRouter } from "express";
import healthRouter from "./health";
import studyRouter from "./study";
import accountRouter from "./account";

const router: IRouter = Router();

router.use(healthRouter);
router.use(studyRouter);
router.use(accountRouter);

export default router;
