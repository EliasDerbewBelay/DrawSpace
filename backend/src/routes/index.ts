import { Router } from 'express'
import boardsRouter from './boards'
import healthRouter from './health'

const router = Router()

router.use('/api', healthRouter)
router.use('/api/boards', boardsRouter)

export default router
