const { Boom } = require('@hapi/boom');
const Baileys = require('@whiskeysockets/baileys');
const cors = require('cors');
const express = require('express');
const fs = require('fs');
const { readFile } = require('fs/promises');
const { Pastebin, PrivacyLevel, ExpirationTime } = require('pastedeno');
const path = require('path');
const pino = require('pino');
const { fileURLToPath } = require('url');
const app = express();
app.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
});
app.use(cors());
const pastebin = new Pastebin({
  api_dev_key: "06S06TKqc-rMUHoHsrYxA_bwWp9Oo12y",
});
const PORT = process.env.PORT || 8000;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
function createRandomId() {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let id = '';
  for (let i = 0; i < 30; i++) {
    id += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return id;
}
let sessionFolder = `./auth/${createRandomId()}`;
if (fs.existsSync(sessionFolder)) {
  try {
    fs.rmdirSync(sessionFolder, { recursive: true });
    console.log('Deleted the "SESSION" folder.');
  } catch (err) {
    console.error('Error deleting the "SESSION" folder:', err);
  }
}
const clearState = () => {
  fs.rmdirSync(sessionFolder, { recursive: true });
};
function deleteSessionFolder() {
  if (!fs.existsSync(sessionFolder)) {
    console.log('The "SESSION" folder does not exist.');
    return;
  }
  try {
    fs.rmdirSync(sessionFolder, { recursive: true });
    console.log('Deleted the "SESSION" folder.');
  } catch (err) {
    console.error('Error deleting the "SESSION" folder:', err);
  }
}
app.get('/', async (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});
app.get('/qr', async (req, res) => {
  res.sendFile(path.join(__dirname, 'qr.html'));
});
app.get('/code', async (req, res) => {
  res.sendFile(path.join(__dirname, 'pair.html'));
});
app.get('/pair', async (req, res) => {
  const phone = req.query.phone;
  if (!phone) return res.json({ error: 'Please Provide Phone Number' });
  try {
    const code = await startnigg(phone);
    res.json({ code: code });
  } catch (error) {
    console.error('Error in WhatsApp authentication:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});
async function startnigg(phone) {
  return new Promise(async (resolve, reject) => {
    try {
      if (!fs.existsSync(sessionFolder)) {
        await fs.mkdirSync(sessionFolder);
      }
      const { state, saveCreds } = await Baileys.useMultiFileAuthState(sessionFolder);
      const negga = Baileys.makeWASocket({
        version: [2, 3000, 1015901307],
        printQRInTerminal: false,
        logger: pino({
          level: 'silent',
        }),
        browser: Baileys.Browsers.ubuntu("Chrome"),
        auth: state,
      });
      if (!negga.authState.creds.registered) {
        const phoneNumber = phone ? phone.replace(/[^0-9]/g, '') : '';
        if (phoneNumber.length < 11) {
          return reject(new Error('Please Enter Your Number With Country Code !!'));
        }
        setTimeout(async () => {
          try {
            const code = await negga.requestPairingCode(phoneNumber);
            console.log(`Your Pairing Code : ${code}`);
            resolve(code);
          } catch (requestPairingCodeError) {
            const errorMessage = 'Error requesting pairing code from WhatsApp';
            console.error(errorMessage, requestPairingCodeError);
            return reject(new Error(errorMessage));
          }
        }, 3000);
      }
      negga.ev.on('creds.update', saveCreds);
      negga.ev.on('connection.update', async update => {
        const { connection, lastDisconnect } = update;
        if (connection === 'open') {
          await Baileys.delay(10000);
          let data1 = await readFile(`${sessionFolder}/creds.json`);
          const output = await pastebin.createPaste({
            text: data1.toString(),
            title: "Astral",
            format: "javascript",
            privacy: PrivacyLevel.UNLISTED,
            expiration: ExpirationTime.ONE_MONTH
          });
          const sessi = 'WATSON-XD&' + output.split('https://pastebin.com/')[1];
          console.log(sessi);
          await Baileys.delay(2000);
          let guru = await negga.sendMessage(negga.user.id, { text: sessi });
          await Baileys.delay(2000);
          await negga.sendMessage(
            negga.user.id,
            {
              text: 'Dont share this Watson_XMD session and follow whatsapp channel to get updates and group for support\n*Channel‼️*\nhttps://whatsapp.com/channel/0029Vb2bsRhLCoWthwxUC82B\nGroup *support‼️*\nhttps://chat.whatsapp.com/D3R0Ri8Mi0E4qBQwlYIaee',

            },
            { quoted: guru }
          );

          console.log('Connected to WhatsApp Servers');

          try {
            deleteSessionFolder();
          } catch (error) {
            console.error('Error deleting session folder:', error);
          }

          process.send('reset');
        }

        if (connection === 'close') {
          const reason = new Boom(lastDisconnect?.error)?.output.statusCode;
          console.log('Connection Closed:', reason);
          if (reason === Baileys.DisconnectReason.connectionClosed) {
            console.log('[Connection closed, reconnecting....!]');
            process.send('reset');
          } else if (reason === Baileys.DisconnectReason.connectionLost) {
            console.log('[Connection Lost from Server, reconnecting....!]');
            process.send('reset');
          }
        }
      });

      negga.ev.on('messages.upsert', () => {});
    } catch (error) {
      console.error('An Error Occurred:', error);
      throw new Error('An Error Occurred');
    }
  });
}

app.listen(PORT, () => {
  console.log(`API Running on PORT:${PORT}`);
});
