const Discord = require('discord.js');

const client = new Discord.Client({disableEveryone: true});

const ytdl = require('ytdl-core');

const request = require('request');

const fs = require('fs');

const getYoutubeID = require('get-youtube-id');

const fetchVideoInfo = require('youtube-info');

//Alpha Code.
//RAIVO#5498
const yt_api_key = "AIzaSyDeoIH0u1e72AtfpwSKKOSy3IPp2UHzqi4";

const prefix = '!';

client.on('ready', function() {
    console.log(`${client.user.username} is Ready to play A cool music for u!`);
});

/////////////////////////
////////////////////////
//////////////////////
var servers = [];
var queue = [];
var guilds = [];
var queueNames = [];
var isPlaying = false;
var dispatcher = null;
var voiceChannel = null;
var skipReq = 0;
var skippers = [];
var now_playing = [];

/////////////////////////
////////////////////////
//////////////////////
client.on('ready', () => {});
var download = function(uri, filename, callback) {
    request.head(uri, function(err, res, body) {
        console.log('content-type:', res.headers['content-type']);
        console.log('content-length:', res.headers['content-length']);

        request(uri).pipe(fs.createWriteStream(filename)).on('close', callback);
    });
};

client.on('message', function(message) {
    const member = message.member;
    const mess = message.content.toLowerCase();
    const args = message.content.split(' ').slice(1).join(' ');

    if (mess.startsWith(prefix + 'play')) {
        if (message.client.voiceChannel) return message.channel.send(`Aghh, Sorry I'm Already in A voice channel`);
        if (!message.member.voiceChannel) return message.channel.send('You should Be Connected to A voice channel.');
        if (args.length == 0) {
            let play_info = new Discord.RichEmbed()
                .setAuthor(client.user.username, client.user.avatarURL)
                .setFooter('Requested By | ' + message.author.tag)
                .setDescription('Insert A YouTube Song name or yt URL!')
                .setColor('RED')
            message.channel.sendEmbed(play_info)
            return;
        }
        if (queue.length > 0 || isPlaying) {
            getID(args, function(id) {
                add_to_queue(id);
                fetchVideoInfo(id, function(err, videoInfo) {
                    if (err) throw new Error(err);
                    let play_info = new Discord.RichEmbed()
                        .setAuthor(client.user.username, client.user.avatarURL)
                        .addField('Added to the Queue ...', `**
                        ${videoInfo.title}
                        **`)
                        .setColor("#d4a1a1")
                        .setFooter('Requested By |' + message.author.tag)
                        .setThumbnail(videoInfo.thumbnailUrl)
                    message.channel.sendEmbed(play_info);
                    queueNames.push(videoInfo.title);
                    now_playing.push(videoInfo.title);

                });
            });
        }
        else {

            isPlaying = true;
            getID(args, function(id) {
                queue.push('placeholder');
                playMusic(id, message);
                fetchVideoInfo(id, function(err, videoInfo) {
                    if (err) throw new Error(err);
                    let play_info = new Discord.RichEmbed()
                        .setAuthor(client.user.username, client.user.avatarURL)
                        .addField('Now Playing ...', `**
                        ${videoInfo.title}
                        **`)
                        .setColor("#d4a1a1")
                        .addField(`By | `, message.author.username)
                        .setThumbnail(videoInfo.thumbnailUrl)

                    message.channel.sendEmbed(play_info)
                    message.channel.send(`**${videoInfo.title}**, is the first Song in the Queue!`)
                });
            });
        }
    }
    else if (mess.startsWith(prefix + 'skip')) {
        if (message.client.voiceChannel) return message.channel.send(`You can't Run this command if you are not in my voice channel!`)
        if (!queue) return message.channel.send(`There are no queue to skip..`)
        if (!message.member.voiceChannel) return message.channel.send("You can't Run A music commands if u are not in A voice Channel..");
        message.channel.send('Okey, now playing the next song...').then(() => {
            skip_song(message);
        });
    }
    else if (message.content.startsWith(prefix + 'vol')) {
        if (message.client.voiceChannel) return message.channel.send(`You can't Run this command if you are not in my voice channel!`)
        if (!message.member.voiceChannel) return message.channel.send(`You can't Run A music commands if u are not in A voice Channel..`);
        if (args > 100) return message.channel.send('U only can set the vol from **0 To 100**\n **__The best vol is 44**__')
        if (args < 1) return message.channel.send('U only can set the vol from **0 To 100**\n **__The best vol is 44**__')
        dispatcher.setVolume(1 * args / 50);
        message.channel.sendMessage(`Vol just set to.. **${dispatcher.volume*50}%** `);
    }
    else if (mess.startsWith(prefix + 'pause')) {
        if (message.client.voiceChannel) return message.channel.send(`You can't Run this command if you are not in my voice channel!`)
        if (!queue) return message.channel.send(`There are no queue to pause..`)

        if (!message.member.voiceChannel) return message.channel.send(`You can't Run A music commands if u are not in A voice Channel..`);
        message.channel.send('If u insistent...').then(() => {
            dispatcher.pause();
        });
    }
    else if (mess.startsWith(prefix + 'resume')) {
        if (message.client.voiceChannel) return message.channel.send(`You can't Run this command if you are not in my voice channel!`)
        if (!queue) return message.channel.send(`There are no queue to pause..`)

        if (!message.member.voiceChannel) return message.channel.send(`You can't Run A music commands if u are not in A voice Channel..`);
            message.channel.send('Well, resuming the song...').then(() => {
            dispatcher.resume();
        });
    }
    else if (mess.startsWith(prefix + 'disconnect')) {
        if (message.client.voiceChannel) return message.channel.send(`You can't Run this command if you are not in my voice channel!`)
        if (!message.member.voiceChannel) return message.channel.send(`You can't Run A music commands if u are not in A voice Channel..`);
        message.channel.send('Stopped the song & disconnected from your voice Channel..!');
        var server = server = servers[message.guild.id];
        if (message.guild.voiceConnection) message.guild.voiceConnection.disconnect();
    }
    else if (mess.startsWith(prefix + 'join')) {
        if (message.client.voiceChannel) return message.channel.send(`You can't Run this command if you are not in my voice channel!`);

        if (!message.member.voiceChannel) return message.channel.send(`You can't Run A music commands if u are not in A voice Channel..`);
        message.member.voiceChannel.join().then(message.channel.send('Joined your Voice channel!..'));
    }
    else if (mess.startsWith(prefix + 'play')) {
        if (message.client.voiceChannel) return message.channel.send(`You can't Run this command if you are not in my voice channel!`)

        if (!message.member.voiceChannel) return message.channel.send(`You can't Run A music commands if u are not in A voice Channel..`);
        if (isPlaying == false) return message.channel.send('Use A command **!restart** Cuz there are An error!!');
        let playing_now_info = new Discord.RichEmbed()
            .setAuthor(client.user.username, client.user.avatarURL)
            .addField('Added to the Queue ...', `**
            ${videoInfo.title}
            **`)
            .setColor("#d4a1a1")
            .setFooter('Requested By | ' + message.author.tag)
            .setThumbnail(videoInfo.thumbnailUrl)
        message.channel.sendEmbed(playing_now_info);
    }
});
//حقوق سيرفر الفا كودز !
function skip_song(message) {
    if (!message.member.voiceChannel) return message.channel.send(':no_entry: || **__يجب ان تكون في روم صوتي__**');
    dispatcher.end();
}

function playMusic(id, message) {
    voiceChannel = message.member.voiceChannel;


    voiceChannel.join().then(function(connectoin) {
        let stream = ytdl('https://www.youtube.com/watch?v=' + id, {
            filter: 'audioonly'
        });
        skipReq = 0;
        skippers = [];

        dispatcher = connectoin.playStream(stream);
        dispatcher.on('end', function() {
            skipReq = 0;
            skippers = [];
            queue.shift();
            queueNames.shift();
            if (queue.length === 0) {
                queue = [];
                queueNames = [];
                isPlaying = false;
            }
            else {
                setTimeout(function() {
                    playMusic(queue[0], message);
                }, 500);
            }
        });
    });
}

function getID(str, cb) {
    if (isYoutube(str)) {
        cb(getYoutubeID(str));
    }
    else {
        search_video(str, function(id) {
            cb(id);
        });
    }
}

function add_to_queue(strID) {
    if (isYoutube(strID)) {
        queue.push(getYoutubeID(strID));
    }
    else {
        queue.push(strID);
    }
}

function search_video(query, cb) {
    request("https://www.googleapis.com/youtube/v3/search?part=id&type=video&q=" + encodeURIComponent(query) + "&key=" + yt_api_key, function(error, response, body) {
        var json = JSON.parse(body);
        cb(json.items[0].id.videoId);
    });
}


function isYoutube(str) {
    return str.toLowerCase().indexOf('youtube.com') > -1;
}

client.on('message', message => {
    if (message.content === `help`) {
        let helpEmbed = new Discord.RichEmbed()
        .setTitle('قائمة أوامر البوت ...')
        .setDescription('**برفكس البوت (!)**')
        .addField('play', 'لتشغيل اغنية')
        .addField('join', 'دخول رومك الصوتي')
        .addField('disconnect', 'الخروج من رومك الصوتي')
        .addField('skip', 'تخطي الأغنية')
        .addField('pause', 'ايقاف الاغنية مؤقتا')
        .addField('resume', 'تكملة الاغنية')
        .setFooter('المزيد قريبا ان شاء الله!')
      message.channel.send(helpEmbed);
    }
});



client.login(process.env.BOT_TOKEN);

