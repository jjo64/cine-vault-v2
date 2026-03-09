import { Request, Response } from "express"
import { consultarTMDB } from "../helpers/fetchTMDB.js"

export const personInformation = async (req: Request, res: Response) => {
  const datos = await consultarTMDB(`person/${req.params.id}`, {
    language: "es-ES",
  })
  res.status(200).json(datos)
}

export const personInformationCombined = async (
  req: Request,
  res: Response
) => {
  const datos = await consultarTMDB(
    `person/${req.params.id}/combined_credits`,
    {
      language: "es-ES",
    }
  )
  res.status(200).json(datos)
}
