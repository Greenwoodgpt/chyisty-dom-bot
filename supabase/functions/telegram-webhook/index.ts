import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
  callback_query?: TelegramCallbackQuery;
}

interface TelegramMessage {
  message_id: number;
  from: TelegramUser;
  chat: TelegramChat;
  date: number;
  text?: string;
}

interface TelegramCallbackQuery {
  id: string;
  from: TelegramUser;
  message?: TelegramMessage;
  data?: string;
}

interface TelegramUser {
  id: number;
  is_bot: boolean;
  first_name: string;
  last_name?: string;
  username?: string;
}

interface TelegramChat {
  id: number;
  type: string;
}

interface UserState {
  user_id: number;
  state: string;
  temp_data: any;
}

const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN')!;
const TELEGRAM_ADMIN_CHAT_ID = Deno.env.get('TELEGRAM_ADMIN_CHAT_ID')!;
const TELEGRAM_API_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

// Отправка сообщения через Telegram API
async function sendMessage(chatId: number, text: string, replyMarkup?: any) {
  const response = await fetch(`${TELEGRAM_API_URL}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      reply_markup: replyMarkup,
      parse_mode: 'HTML'
    })
  });
  return response.json();
}

// Ответ на callback query
async function answerCallbackQuery(callbackQueryId: string, text?: string) {
  await fetch(`${TELEGRAM_API_URL}/answerCallbackQuery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      callback_query_id: callbackQueryId,
      text
    })
  });
}

// Получение состояния пользователя
async function getUserState(userId: number): Promise<UserState> {
  const { data, error } = await supabase
    .from('tg_user_state')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error || !data) {
    // Создаем новое состояние
    const newState: UserState = {
      user_id: userId,
      state: 'start',
      temp_data: {}
    };
    
    await supabase
      .from('tg_user_state')
      .upsert(newState);
    
    return newState;
  }
  
  return data;
}

// Обновление состояния пользователя
async function updateUserState(userId: number, state: string, tempData?: any) {
  const updateData: any = {
    user_id: userId,
    state,
    updated_at: new Date().toISOString()
  };
  
  if (tempData !== undefined) {
    updateData.temp_data = tempData;
  }
  
  await supabase
    .from('tg_user_state')
    .upsert(updateData);
}

// Главное меню
function getMainMenuKeyboard() {
  return {
    inline_keyboard: [
      [{ text: '🗑️ Оформить заказ', callback_data: 'new_order' }],
      [{ text: '📞 Связаться с оператором', callback_data: 'contact_operator' }],
      [{ text: '❓ Помощь', callback_data: 'help' }]
    ]
  };
}

// Клавиатура выбора размера
function getSizeKeyboard() {
  return {
    inline_keyboard: [
      [{ text: 'Один пакет (до 6 кг) - 100₽', callback_data: 'size_one_bag' }],
      [{ text: 'Два пакета - 200₽', callback_data: 'size_two_bags' }],
      [{ text: 'Три пакета - 300₽', callback_data: 'size_three_bags' }],
      [{ text: '❌ Отмена', callback_data: 'cancel' }]
    ]
  };
}

// Клавиатура выбора времени
function getTimeKeyboard() {
  return {
    inline_keyboard: [
      [{ text: '⏰ В течение часа', callback_data: 'time_within_hour' }],
      [{ text: '🌅 Завтра утром', callback_data: 'time_tomorrow_morning' }],
      [{ text: '📅 Указать свое время', callback_data: 'time_custom' }],
      [{ text: '❌ Отмена', callback_data: 'cancel' }]
    ]
  };
}

// Клавиатура подтверждения
function getConfirmationKeyboard() {
  return {
    inline_keyboard: [
      [{ text: '✅ Все верно, подтвердить', callback_data: 'confirm_order' }],
      [{ text: '❌ Отмена', callback_data: 'cancel' }]
    ]
  };
}

// Обработка команды /start
async function handleStart(message: TelegramMessage) {
  await updateUserState(message.from.id, 'start');
  
  const welcomeText = `
🗑️ <b>Добро пожаловать в сервис вывоза мусора!</b>

Мы поможем вам быстро и удобно заказать вывоз мусора.

<b>Наши тарифы:</b>
• Один пакет (до 6 кг) - 100₽
• Два пакета - 200₽
• Три пакета - 300₽

Выберите действие:`;

  await sendMessage(message.chat.id, welcomeText, getMainMenuKeyboard());
}

// Обработка команды /help
async function handleHelp(message: TelegramMessage) {
  const helpText = `
❓ <b>Помощь</b>

<b>Как заказать вывоз мусора:</b>
1. Нажмите "Оформить заказ"
2. Укажите адрес
3. Выберите количество мусора
4. Выберите время вывоза
5. Подтвердите заказ

<b>Наши тарифы:</b>
• Один пакет (до 6 кг) - 100₽
• Два пакета - 200₽
• Три пакета - 300₽

<b>Контакты:</b>
📞 Для связи с оператором используйте кнопку в меню`;

  await sendMessage(message.chat.id, helpText, getMainMenuKeyboard());
}

// Сохранение заказа в БД
async function saveOrder(userId: number, chatId: number, user: TelegramUser, tempData: any) {
  const sizeMap: { [key: string]: number } = {
    'one_bag': 100,
    'two_bags': 200,
    'three_bags': 300
  };

  const order = {
    user_id: userId,
    chat_id: chatId,
    username: user.username || null,
    first_name: user.first_name,
    last_name: user.last_name || null,
    address: tempData.address,
    size_option: tempData.size,
    time_option: tempData.time,
    custom_time: tempData.custom_time || null,
    amount: sizeMap[tempData.size] * 100, // в копейках
    status: 'new'
  };

  const { data, error } = await supabase
    .from('orders')
    .insert(order)
    .select()
    .single();

  if (error) {
    console.error('Error saving order:', error);
    return null;
  }

  return data;
}

// Уведомление администратора о новом заказе
async function notifyAdmin(order: any) {
  const sizeNames: { [key: string]: string } = {
    'one_bag': 'Один пакет (до 6 кг)',
    'two_bags': 'Два пакета',
    'three_bags': 'Три пакета'
  };

  const timeNames: { [key: string]: string } = {
    'within_hour': 'В течение часа',
    'tomorrow_morning': 'Завтра утром',
    'custom': 'Указанное время'
  };

  const adminText = `
🔔 <b>НОВЫЙ ЗАКАЗ #${order.id.slice(-8)}</b>

👤 <b>Клиент:</b> ${order.first_name} ${order.last_name || ''}
📱 <b>Username:</b> ${order.username ? '@' + order.username : 'не указан'}
📍 <b>Адрес:</b> ${order.address}
📦 <b>Объем:</b> ${sizeNames[order.size_option]}
⏰ <b>Время:</b> ${timeNames[order.time_option]}${order.custom_time ? ' (' + order.custom_time + ')' : ''}
💰 <b>Сумма:</b> ${order.amount / 100}₽

📅 <b>Дата заказа:</b> ${new Date(order.created_at).toLocaleString('ru-RU')}`;

  await sendMessage(parseInt(TELEGRAM_ADMIN_CHAT_ID), adminText);
}

// Обработка callback query
async function handleCallbackQuery(callbackQuery: TelegramCallbackQuery) {
  const userId = callbackQuery.from.id;
  const chatId = callbackQuery.message!.chat.id;
  const data = callbackQuery.data!;
  
  await answerCallbackQuery(callbackQuery.id);
  
  const userState = await getUserState(userId);
  
  switch (data) {
    case 'new_order':
      await updateUserState(userId, 'awaiting_address', {});
      await sendMessage(chatId, '📍 Пожалуйста, введите ваш адрес (улица, дом, квартира):');
      break;
      
    case 'contact_operator':
      await sendMessage(chatId, '📞 Для связи с оператором напишите нам: @operator_username или позвоните по телефону: +7 (xxx) xxx-xx-xx');
      break;
      
    case 'help':
      await handleHelp(callbackQuery.message!);
      break;
      
    case 'cancel':
      await updateUserState(userId, 'start', {});
      await sendMessage(chatId, '❌ Заказ отменен.', getMainMenuKeyboard());
      break;
      
    case 'size_one_bag':
    case 'size_two_bags':
    case 'size_three_bags':
      const size = data.replace('size_', '');
      const tempData = { ...userState.temp_data, size };
      await updateUserState(userId, 'awaiting_time', tempData);
      await sendMessage(chatId, '⏰ Во сколько забрать мусор?', getTimeKeyboard());
      break;
      
    case 'time_within_hour':
    case 'time_tomorrow_morning':
      const time = data.replace('time_', '');
      const tempDataTime = { ...userState.temp_data, time };
      await updateUserState(userId, 'awaiting_confirmation', tempDataTime);
      await showOrderSummary(chatId, tempDataTime);
      break;
      
    case 'time_custom':
      const tempDataCustom = { ...userState.temp_data, time: 'custom' };
      await updateUserState(userId, 'awaiting_custom_time', tempDataCustom);
      await sendMessage(chatId, '📅 Напишите желаемую дату и время (например: "завтра в 14:00" или "28.12 в 10:30"):');
      break;
      
    case 'confirm_order':
      const order = await saveOrder(userId, chatId, callbackQuery.from, userState.temp_data);
      if (order) {
        await updateUserState(userId, 'start', {});
        await sendMessage(chatId, `✅ Заказ принят! Номер заказа: #${order.id.slice(-8)}\n\nМы свяжемся с вами в ближайшее время.`, getMainMenuKeyboard());
        await notifyAdmin(order);
      } else {
        await sendMessage(chatId, '❌ Произошла ошибка при создании заказа. Попробуйте еще раз.', getMainMenuKeyboard());
      }
      break;
  }
}

// Показ итогов заказа
async function showOrderSummary(chatId: number, tempData: any) {
  const sizeNames: { [key: string]: string } = {
    'one_bag': 'Один пакет (до 6 кг)',
    'two_bags': 'Два пакета',
    'three_bags': 'Три пакета'
  };
  
  const sizeAmounts: { [key: string]: number } = {
    'one_bag': 100,
    'two_bags': 200,
    'three_bags': 300
  };
  
  const timeNames: { [key: string]: string } = {
    'within_hour': 'В течение часа',
    'tomorrow_morning': 'Завтра утром',
    'custom': 'Указанное время'
  };

  const summaryText = `
📋 <b>Проверьте ваш заказ:</b>

📍 <b>Адрес:</b> ${tempData.address}
📦 <b>Объем:</b> ${sizeNames[tempData.size]}
⏰ <b>Время:</b> ${timeNames[tempData.time]}${tempData.custom_time ? ' (' + tempData.custom_time + ')' : ''}
💰 <b>К оплате:</b> ${sizeAmounts[tempData.size]}₽`;

  await sendMessage(chatId, summaryText, getConfirmationKeyboard());
}

// Обработка текстовых сообщений
async function handleTextMessage(message: TelegramMessage) {
  const userId = message.from.id;
  const chatId = message.chat.id;
  const text = message.text!;
  
  const userState = await getUserState(userId);
  
  switch (userState.state) {
    case 'awaiting_address':
      if (text.length < 10) {
        await sendMessage(chatId, '❌ Адрес слишком короткий. Пожалуйста, укажите полный адрес (улица, дом, квартира):');
        return;
      }
      
      const tempData = { address: text };
      await updateUserState(userId, 'awaiting_size', tempData);
      await sendMessage(chatId, '📦 Выберите, сколько мусора нужно вынести:', getSizeKeyboard());
      break;
      
    case 'awaiting_custom_time':
      const tempDataCustomTime = { ...userState.temp_data, custom_time: text };
      await updateUserState(userId, 'awaiting_confirmation', tempDataCustomTime);
      await showOrderSummary(chatId, tempDataCustomTime);
      break;
      
    case 'start':
    default:
      await sendMessage(chatId, 'Выберите действие из меню:', getMainMenuKeyboard());
      break;
  }
}

serve(async (req) => {
  // Health check + CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (req.method === 'GET') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('telegram-webhook request received', { method: req.method });
    const update: TelegramUpdate = await req.json();
    
    if (update.message) {
      const message = update.message;
      
      if (message.text?.startsWith('/start')) {
        await handleStart(message);
      } else if (message.text?.startsWith('/help')) {
        await handleHelp(message);
      } else if (message.text) {
        await handleTextMessage(message);
      }
    } else if (update.callback_query) {
      await handleCallbackQuery(update.callback_query);
    }
    
    return new Response('OK', {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error processing update:', error);
    return new Response('Error', {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});