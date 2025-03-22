const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const moment = require('moment'); // Sana va vaqtni formatlash uchun

const TOKEN = '7578178047:AAGVW20nbC8LtHBn38_nL2cSFBcfWpa9Vyc';
const bot = new TelegramBot(TOKEN, { polling: true });

const regions = [
    'Andijon', 'Buxoro', 'Jizzax', 'Qarshi', 
    'Navoiy', 'Namangan', 'Samarqand', 'Termiz', 
    'Guliston', 'Toshkent', "Farg'ona", 'Xiva','Nukus'
];
const usersSelectedRegions = {}; // Foydalanuvchilar tanlovini saqlash

// Viloyatlar uchun ikki qatorli tugmalar yaratish
const createRegionsKeyboard = () => {
    const keyboard = [];
    for (let i = 0; i < regions.length; i += 2) {
        keyboard.push([
            { text: `🕌 ${regions[i]}`, callback_data: `region_${regions[i]}` },
            regions[i + 1] ? { text: `🕌 ${regions[i + 1]}`, callback_data: `region_${regions[i + 1]}` } : null
        ].filter(Boolean));
    }
    return keyboard;
};




const createRefreshKeyboard = (region) => {
    return [
        [{ text: '🔄 Yangilash', callback_data: `refresh_${region}` }],
        [{ text: '⬅️ Orqaga', callback_data: 'back_to_regions' }]
    ];
};

// Namoz vaqtlarini olish funksiyasi
const getPrayerTimes = async (city) => {
    
    try {
        const response = await axios.get(
            `https://islomapi.uz/api/present/day?region=${city}`
        );
        
        return response.data;
        
    } catch (error) {
        console.error('API dan ma\'lumot olishda xatolik:', error);
        return null;
    }
};

// Namoz vaqtini tekshirish va xabar yuborish
const checkAndSendPrayerNotification = () => {
    const now = moment().format('HH:mm'); // Hozirgi vaqt
    
    for (const userId in usersSelectedRegions) {
        const { region, times } = usersSelectedRegions[userId];
        // console.log(region, times);
        
        // Har bir namoz vaqtini tekshirish
        for (const [prayerName, prayerTime] of Object.entries(times)) {
        console.log(prayerTime);
        console.log(now + "now");
            
            if (prayerTime === now) {
                bot.sendMessage(
                    userId,
                    `${region} 🕰 ${prayerName} : ${prayerTime} vaqti bo'ldi!`
                );
            }
        }
    }
};

// Har daqiqada vaqtni tekshirish
setInterval(checkAndSendPrayerNotification, 60 * 1000);

// Namoz vaqtlarini matn shaklida formatlash
const formatPrayerTimes = (region, times, date, weekday) => {
    
    return `
Namoz Vaqtlari:
=========================
🏘 📍 ${region}  vaqti bilan
--------------------------------------------
    
☀️  Quyosh:    -   ${times.quyosh}
    
⏰  Bomdod:     -   ${times.tong_saharlik}  
⏰  Peshin:     -   ${times.peshin}  
⏰  Asr:        -   ${times.asr} 
⏰  Shom:       -   ${times.shom_iftor}  
⏰  Xufton:     -   ${times.hufton} 
--------------------------------------------
📅  ${date} | ${weekday} 
    
`;
};

// Bot /start komandasi
bot.onText(/\/start/, (msg) => {
    bot.sendMessage(msg.chat.id, 'Assalomu alaykum! Viloyatni tanlang:', {
        reply_markup: {
            inline_keyboard: createRegionsKeyboard()
        }
    });
});

// Callbacklarni qayta ishlash
bot.on('callback_query', async (callbackQuery) => {
    const chatId = callbackQuery.message.chat.id;
    const data = callbackQuery.data;
    const messageId = callbackQuery.message.message_id;
    
    if (data.startsWith('region_')) {
        const region = data.split('_')[1];
        const prayerData = await getPrayerTimes(region);
        
        if (prayerData) {
            const { times, date, weekday } = prayerData;
            const message = formatPrayerTimes(region, times, date, weekday);
            // console.log(times);
            // Foydalanuvchi tanlagan viloyatni saqlash
            usersSelectedRegions[chatId] = {
                userId: chatId,
                region: region,
                times: times
            };
            bot.editMessageText(message, {
                chat_id: chatId,
                message_id: messageId,
                reply_markup: {
                    inline_keyboard: createRefreshKeyboard(region)
                }
            });
        } else {
            bot.editMessageText('Uzr, ma\'lumot olishda xatolik yuz berdi.', {
                chat_id: chatId,
                message_id: messageId
            });
        }
    } else if (data.startsWith('refresh_')) {
        const region = data.split('_')[1];
        const prayerData = await getPrayerTimes(region);
        
        if (prayerData) {
            const { times, date, weekday } = prayerData;
            const message = formatPrayerTimes(region, times, date, weekday);
            bot.deleteMessage(chatId, messageId);
            bot.sendMessage(chatId,message,{
                reply_markup: {
                    inline_keyboard: createRefreshKeyboard(region)
                }
            });
        } else {
            bot.sendMessage(chatId, 'Uzr, ma\'lumot olishda xatolik yuz berdi.');
        }
    } else if (data === 'back_to_regions') {
        bot.editMessageText('Viloyatni tanlang:', {
            chat_id: chatId,
            message_id: messageId,
            reply_markup: {
                inline_keyboard: createRegionsKeyboard()
            }
        });
    }
});
