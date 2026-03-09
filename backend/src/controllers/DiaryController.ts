import { Request, Response } from "express"
import * as diaryService from "../services/diary.services.js"
import { checkIPSpike } from "../services/security.services.js"
import { TooManyRequestsError } from "../errors/AppErrors.js"

/* ==========================================================================
   CONTROLADOR DE DIARIO
   --------------------------------------------------------------------------
   Responsabilidad ÚNICA: extraer datos del request, llamar al servicio y
   devolver res. Sin try/catch manuales — el manejadorErrores global se ocupa.
   ========================================================================== */

export const createDiary = async (req: Request, res: Response) => {
  await assertNotRateLimited(req.ip!)
  const entry = await diaryService.crearEntradaDiarioService(
    req.user!.user_id,
    req.body
  )
  res.status(201).json(entry)
}

export const getMyDiary = async (req: Request, res: Response) => {
  const diario = await diaryService.obtenerDiarioService(req.user!.user_id)
  res.json({ diary: diario })
}

export const getDiaryUser = async (req: Request, res: Response) => {
  const diario = await diaryService.obtenerDiarioService(
    Number(req.params.id_user)
  )
  res.json({ diary: diario })
}

export const removeDiary = async (req: Request, res: Response) => {
  await assertNotRateLimited(req.ip!)
  await diaryService.eliminarEntradaDiarioService(
    req.user!.user_id,
    Number(req.params.id)
  )
  res.json({ message: "Eliminada exitosamente" })
}

const assertNotRateLimited = async (ip: string) => {
  if (await checkIPSpike(ip)) {
    throw new TooManyRequestsError(
      "Demasiadas acciones, intenta en unos segundos"
    )
  }
}
