import { create, Whatsapp } from 'venom-bot';
import db from '../database'
import logger from '../util/logger';
import { Prisma } from '@prisma/client';
import fetch from 'node-fetch'
import mime from 'mime-types'
import url, { parse } from 'url'
import { createWriteStream, existsSync, mkdirSync, unlinkSync, writeFileSync } from 'fs';
import path from 'path';

const downloadDir = './downloads';

export default class WP {

  _botsMap: Map<string, Whatsapp>;
  
  constructor(botsMap: any) {
    this._botsMap = botsMap
  }

  getBotsNames() {
    return Array.from(this._botsMap.keys())
  }

  findBotByName(botName: string) {
    return this._botsMap.get(botName)
  }

  async createBot(newBotData: Prisma.BotCreateInput  ) {
    if(this._botsMap.has(newBotData.name)) {
      throw new Error('Bot already exists.')
    }
    const databaseBot = await db.bot.create({data: newBotData})
    this._initBot(databaseBot)
  }
  
  async deleteBot(botName: string) {
    this._botsMap.delete(botName)
    await db.bot.deleteMany({where: { name: botName }})
    await this._botsMap.get(botName)?.logout();
    await this._botsMap.get(botName)?.killServiceWorker()
  }
  
   _initBot(databaseBot: any) {
    // this._botsMap.set(databaseBot.name, {})
  
    create({
      session: databaseBot.name,
      logQR: databaseBot.logQR,
    })
    .then((client: Whatsapp) => this.onSessionReady(client))
    .catch((error: any) => { console.log(error) });
  
  }
  
  initWhatsappBots () {
    logger.info('Initializing whatsapp bots')
    db.bot.findMany().then((bots) =>
      bots.map((databaseBot)=>{
        if(!databaseBot.name) { return logger.warn('Bot name not found', databaseBot) }
        this._initBot(databaseBot)
      })
    )
  }
  
  onSessionReady(client: Whatsapp) {
  
    client.onMessage(async (message) => {
      if (message.body === 'Oi' && message.isGroupMsg === false) {
        client.sendText(message.from, 'Opa')
        .then((result) => { console.log('Result: ', result);})
        .catch((error: any) => { console.error('Error when sending: ', error);});
      }
    });
  
    this._botsMap.set(client.session, client)
  
  }
  
  // Messaging
  async sendMessage(botName: string, message: { type: string, phoneNumber: any, content: any }) {
    if(message?.type === 'text') {
      return this._botsMap.get(botName)?.sendText(message.phoneNumber, message.content)
    }

    if(message?.type === 'image') {
      logger.warn(`📥 [${botName}] Downloading [${message.content.imageUrl}]`);

      const {elapsed, filePath } = await this.downloadFile(message.content.imageUrl)

      logger.warn(`✅ [${botName}] File downloaded [${message.content.imageUrl}] in ${elapsed}ms`);

      logger.warn(`🚀 [${botName}] Sending [${filePath}] to [${message.phoneNumber}]`);

      await this._botsMap.get(botName)?.sendImage(message.phoneNumber, filePath, message.content?.caption || '', message.content?.text || '')

    }
    
  }

  downloadFile(url: string): Promise<{elapsed: number, filePath: string, fileName: string}> {
    const time = new Date().getTime()

    // Make sure the download directory exists
    if (!existsSync(downloadDir)) {
      mkdirSync(downloadDir);
    }

    // Parse the URL to get the filename
    const parsedUrl = parse(url);
    const filePath = parsedUrl.pathname || '';
    const filename = path.basename(filePath);

    return new Promise((resolve, reject)=> {
      const writeStream = createWriteStream(path.join(downloadDir, filename));

      fetch(url)
        .then((response: any) =>  {
          if (!response.ok) {
            throw new Error(`HTTP error ${response.status}`);
          }

          // Create a write stream to the file
          response.body.pipe(writeStream);

          return new Promise((resolve, reject) => {
            writeStream.on('finish', resolve);
            writeStream.on('error', reject);
          });
        })
        .catch((err: any) => reject(err))
        .then(() => resolve({
          elapsed: new Date().getTime() - time,
          filePath: path.join(downloadDir, filename),
          fileName: filename
        }) )
    })
    
  }

  deleteFile(filename: string) {
    if (existsSync(path.join(downloadDir, filename))) {
      unlinkSync(path.join(downloadDir, filename))
    }
  }

}