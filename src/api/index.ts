import fastify, { FastifyReply, FastifyRequest } from 'fastify';
import botsRoutes from './routes/bots';
import Whatsapp from '../whatsapp';

const botsMap = new Map()

export type requestWithBots = FastifyRequest & { botsMap: any }

const app = fastify({ logger: true }) as any

const whatsapp = new Whatsapp(botsMap)
whatsapp.initWhatsappBots()

app.get('/', (req: FastifyRequest, res: FastifyReply) => {
  res.send({ name: 'wpbot', bots: Array.from(botsMap.keys()) })
})

app.register(botsRoutes, { prefix: '/bots', whatsapp  })

export default app;