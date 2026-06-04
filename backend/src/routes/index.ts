import { Router } from 'express'
import boardsRouter from './boards'

const router = Router()

router.use('/api/boards', boardsRouter)

export default router
