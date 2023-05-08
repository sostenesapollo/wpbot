import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import db from '../../database'
import { Bot } from "@prisma/client"
import WP from '../../whatsapp'

const serializeBot = (bot: Bot) => bot

export default async function botsRoutes (fastify: FastifyInstance, options: { whatsapp: WP }) {
  const { whatsapp } = options
  
  fastify.get('/', async function (req: FastifyRequest, res: FastifyReply) {
    const bots = await db.bot.findMany({})
    res.send({
      bots: bots.map(bot=>serializeBot(bot)),
      botsMap: whatsapp.getBotsNames()
    })
  })

  fastify.get('/delete/:botName', async function (req: any, res: FastifyReply) {
    const {botName} = req.params

    if(!whatsapp.findBotByName(botName)) return res.send({error: 'Bot not found'})

    try {
        whatsapp.deleteBot(botName)
        return res.send({success: 'Bot removed'})
    } catch (error) {
        return res.status(400).send({error: 'Error to remove bot', message: error})
    }
  })

  fastify.get('/create/:botName', async function (req: any, res: FastifyReply) {
    const {botName} = req.params

    if(whatsapp.findBotByName(botName)) return res.send({error: 'Bot already exists.'})

    try {
        await whatsapp.createBot({name: botName, logQR: true})
        return res.send({success: 'Bot created.'})
    } catch (error) {
        return res.status(400).send({error: 'Error to create bot', message: error})
    }
  })

  fastify.post('/messages', async function (req: any, res: FastifyReply) {
    const {botName, message} = req.body

    try {
        await whatsapp.sendMessage(botName, message)
        return res.send({success: 'Message sent.'})
    } catch (error) {
        return res.status(400).send({error: 'Error to send message', message: error})
    }
  })
}