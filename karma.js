if (process.version.slice(1).split('.')[0] < 11) throw new Error(`Node must be v11+ - please upgrade to the latest version of Node!`)

const Discord = require('discord.js')
const axios = require('axios')
const gist = require('snekgist')
const exec = require('child_process').exec
const os = require('os')
const moment = require('moment')
require('moment-duration-format')
const c = require('ansi-colors')
const config = require('./config.json')
const Ratelimiter = require('./Ratelimiter.js')
const rl = new Ratelimiter()
const client = new Discord.Client()
const Enmap = require('enmap')
const EnmapMongo = require('enmap-mongo')
require('log-timestamp')(function () { return '[' + new Date().toISOString() + '] %s' })

client.karmaStore = new Enmap({ provider: new EnmapMongo({
  name: `karmaStore`,
  dbName: `enmap`,
  url: ''
})
})

client.on('message', async (message) => {
  if (message.author.bot) return
  const check = await rl.check(message)
  if (check === true) {
    if (message.cleanContent.startsWith(config.prefix)) {
      if (message.channel.type === 'dm') return
      const keyword = message.cleanContent.replace(config.prefix, '').trim()

      if (!client.karmaStore.has(keyword)) {
        client.karmaStore.set(keyword, {
          numKarma: 0
        })
      }
      try {
        await message.reply({
          embed: {
            color: Math.floor(Math.random() * (0xFFFFFF + 1)),
            author: {
              name: client.user.username,
              icon_url: client.user.displayAvatarURL
            },
            description: `${keyword} has **${client.karmaStore.getProp(keyword, 'numKarma') || 0}** Karma!`,
            footer: {
              text: `KarmaBot by .vlexar#0001`
            },
            timestamp: new Date()
          }
        })
      } catch (e) {
        console.error(e)
      }
    } else if ((message.cleanContent.endsWith('--')) || message.cleanContent.endsWith('++')) {
      if (message.channel.type === 'dm') return
      if ((message.guild.roles.find(role => role.name === 'NoKarma')) && (message.member.roles.has(message.guild.roles.find(role => role.name === 'NoKarma').id))) {
        message.reply(`You are not allowed to add or subtract Karma at this time. Please contact a server mod/admin/staff member. Type \`@KarmaBot help\` for more info.`)
        return message.react('\uD83D\uDD34')
      }
      let type
      if (message.cleanContent.endsWith('--')) {
        type = 'minus'
      } else if (message.cleanContent.endsWith('++')) {
        type = 'plus'
      } else {
        return
      }
      const keyword = message.cleanContent.replace(/([+-]{2,})$/m, '').trim()

      if (!client.karmaStore.has(keyword)) {
        client.karmaStore.set(keyword, {
          numKarma: 0
        })
      }
      if (keyword === '') return
      let currentKarma = client.karmaStore.getProp(keyword, 'numKarma')
      if (type === 'minus') client.karmaStore.setProp(keyword, 'numKarma', --currentKarma)
      else if (type === 'plus') client.karmaStore.setProp(keyword, 'numKarma', ++currentKarma)
      console.log(c.bgWhite(`[KARMA] ${c.cyan.bold(keyword)} ${c.red.bold.underline(type)}`))
      try {
        await message.channel.send({
          embed: {
            color: Math.floor(Math.random() * (0xFFFFFF + 1)),
            author: {
              name: client.user.username,
              icon_url: client.user.displayAvatarURL
            },
            description: `[KARMA] **${keyword}** has **${client.karmaStore.getProp(keyword, 'numKarma') || 0}** Karma. To lookup later use  **${config.prefix}**  and type **${config.prefix} ${keyword}**`,
            footer: {
              text: `KarmaBot by .vlexar#0001`
            },
            timestamp: new Date()
          }
        })
      } catch (e) {
        console.error(e)
      }
    }
  }

  if (message.content.match(new RegExp(`^<@!?${client.user.id}>( |)$`))) {
    message.reply(`Hi there! Please type \`@KarmaBot help\` for help using this bot or \`@KarmaBot stats\` to get bot statistics.`)
    return message.react('\u2705')
  }
  if (message.content.startsWith(`<@${client.user.id}>` + ` help`)) {
    if (message.channel.type === 'dm') return
    try {
      const embed = new Discord.MessageEmbed()
        .setTitle(`KarmaBot Help & Information`)
        .setThumbnail(message.guild.iconURL)
        .setURL(`https://discord.io/ec`)
        .setColor(Math.floor(Math.random() * (0xFFFFFF + 1)))
        .setDescription(`**KarmaBot Help and Information (basic usage, invite URL, support)**`)
        .addField(`**❯❯ Add Karma (++):**`, `To **add or increase** karma, type *any* keyword (can be a username, emoji, or any string of text) followed by two plus symbols **++** For example, typing **keyword++** will increase the karma of keyword by one.`, true)
        .addField(`**❯❯ Subtract Karma (--):**`, `To **subtract or decrease** karma, type *any* keyword (can be a username, emoji, or any string of text) followed by two minus symbols **--** For example, typing **keyword--** will decrease the karma of keyword by one.`, true)
        .addField(`**❯❯ Lookup Karma (>k):**`, `To **lookup** karma, type **>k** followed by the keyword to lookup. For example, typing **>k keyword** will return the karma of keyword. This is shared across all guilds using KarmaBot.`, true)
        .addField(`**❯❯ Blacklist (Per Guild):**`, `To **blacklist** a user from being able to add or subtract Karma in a guild, create the role **NoKarma** and assign it to the users you wish to blacklist. Users can still lookup Karma, so this can act as a way for admins/mods to, for example, award points to users without the users all being able to add/remove Karma. By default this bot will take commands from any user, but messages [are internally rate-limited for spam protection](https://cdn.rawgit.com/shikhir-arora/karma-simple/3848016d/Ratelimiter.js).`, true)
        .addField(`**❯❯ Stats:**`, `For **KarmaBot Stats,** type \`@KarmaBot stats\` - fun stuff!`, true)
        .addBlankField()
        .addField(`**❯❯ Invite KarmaBot:**`, `**To Invite KarmaBot**, [click here (requires Manage Server permissions)](https://discordapp.com/api/oauth2/authorize?client_id=608715647635161118&permissions=0&scope=bot).`, true)
        .addField(`**❯❯ Support:**`, `**For support, visit:** [our Discord server](https://discord.io/ec) or [GitHub](https://github.com/hieudn1995/confettivietnam/issues).`, true)
        .setFooter(`Project by .vlexar#0001 | KarmaBot Help`)
        .setTimestamp()
      await message.reply({ embed })
    } catch (e) {
      console.error(e)
    }
  }

  if (message.content.startsWith(`<@${client.user.id}>` + ` stats`)) {
    try {
      const embed = new Discord.MessageEmbed()
        .setTitle(`KarmaBot Stats`)
        .setURL(`https://karmabot.vlexar.pw`)
        .setColor(Math.floor(Math.random() * (0xFFFFFF + 1)))
        .setDescription(`**KarmaBot Stats/Info**`)
        .addField(`**❯❯ Guilds:**`, `${client.guilds.size.toLocaleString()}`, false)
        .addField(`**❯❯ Users:**`, `${client.users.size.toLocaleString()}`, false)
        .addField(`**❯❯ Channels:**`, `${client.channels.size.toLocaleString()}`, false)
        .addField(`**❯❯ Shards:**`, `${client.ws.shards.size}`, false)
        .addField(`**❯❯ Uptime:**`, moment.duration(process.uptime(), 'seconds').format('dd:hh:mm:ss'), false)
        .addField(`**❯❯ CPU:**`, `${os.cpus().length}x ${os.cpus()[0].model}`, false)
        .addField(`**❯❯ Gateway Ping:**`, `${client.ws.ping.toFixed(5)} ms`, false)
        .addField(`**❯❯ Load Average:**`, `${os.loadavg()[1]}`, false)
        .addField(`**❯❯ Memory Usage:**`, `${(process.memoryUsage().rss / 1048576).toFixed(2)}MB / ${(os.totalmem() / 1073741824).toFixed(2)}GB`, false)
        .addField(`**❯❯ System:**`, `${os.type()} - ${os.arch()} ${os.release()}`, false)
        .addField(`**❯❯ Node Version:**`, process.version, false)
        .addField(`**❯❯ Discord.js:**`, `v${Discord.version}`, false)
        .addField(`**❯❯ GitHub:**`, `[GitHub Repo](https://github.com/hieudn1995/confettivietnam).`, true)
        .setFooter(`Project by .vlexar#0001 | KarmaBot Stats`)
        .setTimestamp()
      await message.reply({ embed })
    } catch (e) {
      console.error(e)
    }
  }

  const clean = (text) => {
    if (typeof (text) === 'string') { return text.replace(/`/g, '`' + String.fromCharCode(8203)).replace(/@/g, '@' + String.fromCharCode(8203)) } else { return text }
  }
  const args = message.content.split(' ').slice(1)

  if (message.content.startsWith(config.adminprefix + 'eval')) {
    if (message.author.id !== config.ownerID) return
    try {
      const code = args.join(' ')
      let evaled = await eval(code) // eslint-disable-line no-eval

      if (typeof evaled !== 'string') { evaled = require('util').inspect(evaled, { depth: 0 }) }

      if (evaled.includes(client.token || config.token)) {
        evaled = evaled.replace(client.token, 'REDACTED!')
      }

      if (clean(evaled).length > 1800) {
        await gist(clean(evaled))
          .then(res => {
            const embed = new Discord.MessageEmbed()
              .setTitle(`Eval output exceeds 2000 characters. View on Gist.`)
              .setURL(`${res.html.url}`)
              .setColor(Math.floor(Math.random() * (0xFFFFFF + 1)))
              .setDescription(`Eval output exceeds 2000 characters. View Gist [here](${res.html_url}).`)
              .setFooter(`Eval Output`)
              .setTimestamp()
            message.channel.send({ embed }).catch((e) => message.channel.send(e.message))
          })
      } else {
        message.channel.send(clean(evaled), {
          code: 'fix'
        })
      }
    } catch (err) {
      console.log(err)
      err = err.toString() // eslint-disable-line no-ex-assign
      if (err.includes(client.token || config.token)) {
        err = err.replace(client.token, 'REDACTED!') // eslint-disable-line no-ex-assign
      }
      message.channel.send(`\`ERROR\` \`\`\`fix\n${clean(err)}\n\`\`\``)
    }
  }

  if (message.content.startsWith(config.adminprefix + 'exec')) {
    if (message.author.id !== config.ownerID) return
    exec(args.join(' '), async (e, stdout, stderr) => {
      if (stdout.length > 1800 || stderr.length > 1800) {
        await gist(`${stdout}\n\n${stderr}`)
          .then(res => {
            const embed = new Discord.MessageEmbed()
              .setTitle(`Console output exceeds 2000 characters. View on Gist.`)
              .setURL(`${res.html_url}`)
              .setColor(Math.floor(Math.random() * (0xFFFFFF + 1)))
              .setDescription(`Console output exceeds 2000 characters. View Gist [here](${res.html_url}).`)
              .setFooter(`Exec Output`)
              .setTimestamp()
            message.channel.send({ embed }).catch((e) => message.channel.send(e.message))
          })
      } else {
        stdout && message.channel.send(`\`INFO:\`\n\n\`\`\`fix\n${stdout}\`\`\``)
        stderr && message.channel.send(`\`ERRORS:\`\n\n\`\`\`fix\n${stderr}\`\`\``)
        if (!stderr && !stdout) { message.react('\u2705') }
      }
    })
  }
})

async function postDiscordStats () {
  const discordBots = axios({
    method: 'post',
    url: `https://discordbots.org/api/bots/${client.user.id}/stats`,
    headers: {
      Authorization: ''
    },
    data: {
      server_count: client.guilds.size
    }
  })

  const botlistSpace = axios({
    method: 'post',
    url: `https://api.botlist.space/v1/bots/${client.user.id}`,
    headers: {
      Authorization: ''
    },
    data: {
      server_count: client.guilds.size
    }
  })
  
  const botsgg = axios({
    method: 'post',
    url: `https://discord.bots.gg/api/v1/bots/${client.user.id}/stats`,
    headers: {
      Authorization: ''
    },
    data: {
      guildCount: client.guilds.size
    }
  })
  
  // eslint-disable-next-line no-unused-vars
  const [dbres, bspaceres, botsggres] = await Promise.all([discordBots, botlistSpace, botsgg]) // lgtm [js/unused-local-variable] 
}

client.on('ready', () => {
  console.log(c.bgWhite(`[READY] Connected as ${c.red.bold.underline(client.user.username)}#${c.cyan.bold(client.user.discriminator)} ${c.green.bold(client.user.id)}`))
  setInterval(() => client.user.setActivity(`@KarmaBot help`, { type: `WATCHING` }), 90000)

  postDiscordStats()
})

client.on('guildCreate', (guild) => {
  console.log(c.bgGreen(`New guild joined: ${c.blue.bold.underline(guild.name)} (id: ${c.yellow.italic(guild.id)}). This guild has ${c.green.underline(guild.memberCount)} members!`))

  postDiscordStats()
})

client.on('guildDelete', (guild) => {
  console.log(c.bgWhite.underline(`I have been removed from: ${c.red.bold.underline(guild.name)} (id: ${c.yellow.bold(guild.id)})`))

  postDiscordStats()
})

client.on('disconnect', (event) => {
  setTimeout(() => client.destroy().then(() => client.login(config.token)), 10000)
  console.log(c.bgRed.underline(`[DISCONNECT] Notice: Disconnected from gateway with code ${event.code} - Attempting reconnect.`))
})

client.on('reconnecting', () => {
  console.log(c.bgYellow.italic(`[NOTICE] ReconnectAction: Reconnecting to Discord...`))
})

client.on('rateLimit', console.log)
client.on('error', console.error)
client.on('warn', console.warn)

process.on('unhandledRejection', (error) => {
  console.error(c.bgRed(`Uncaught Promise Error: \n${error.stack}`))
})

process.on('uncaughtException', (err) => {
  let errmsg = (err ? err.stack || err : '').toString().replace(new RegExp(`${__dirname}/`, 'g'), './')
  console.error(c.red.bold(errmsg))
})

client.login(config.token)
