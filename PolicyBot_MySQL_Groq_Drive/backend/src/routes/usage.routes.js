import {Router} from 'express';
import {one} from '../db/pool.js';
import {authenticate} from '../middlewares/auth.js';
import {asyncHandler} from '../middlewares/error.js';
const router=Router();router.use(authenticate);
router.get('/',asyncHandler(async(req,res)=>{
  const r=await one(`SELECT c.plan_id,p.max_documents,p.max_questions_month,
    (SELECT COUNT(*) FROM documents d WHERE d.company_id=c.id) AS documents_used,
    (SELECT COUNT(*) FROM messages m WHERE m.company_id=c.id AND (m.state='ok' OR (m.state='processing' AND m.created_at>=UTC_TIMESTAMP()-INTERVAL 15 MINUTE)) AND m.created_at>=DATE_FORMAT(UTC_TIMESTAMP(),'%Y-%m-01') AND m.created_at<DATE_FORMAT(DATE_ADD(UTC_TIMESTAMP(),INTERVAL 1 MONTH),'%Y-%m-01')) AS questions_used,
    (SELECT COALESCE(SUM(m.input_tokens),0) FROM messages m WHERE m.company_id=c.id AND m.state='ok' AND m.created_at>=DATE_FORMAT(UTC_TIMESTAMP(),'%Y-%m-01')) AS input_tokens,
    (SELECT COALESCE(SUM(m.output_tokens),0) FROM messages m WHERE m.company_id=c.id AND m.state='ok' AND m.created_at>=DATE_FORMAT(UTC_TIMESTAMP(),'%Y-%m-01')) AS output_tokens
    FROM companies c JOIN plans p ON p.id=c.plan_id WHERE c.id=?`,[req.companyId]);
  res.json({usage:r});
}));
export default router;
