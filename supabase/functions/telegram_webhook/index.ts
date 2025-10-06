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
  photo?: TelegramPhotoSize[];
}

interface TelegramPhotoSize {
  file_id: string;
  file_unique_id: string;
  width: number;
  height: number;
  file_size?: number;
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
  data: any;
}

const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN')!;
const TELEGRAM_ADMIN_CHAT_ID = Deno.env.get('TELEGRAM_ADMIN_CHAT_ID')!;
const TELEGRAM_API_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

async function sendMessage(chatId: number, text: string, replyMarkup?: any) {
  const response = await fetch(`${TELEGRAM_API_URL}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, reply_markup: replyMarkup, parse_mode: 'HTML' })
  });
  const bodyText = await response.text();
  if (!response.ok) {
    console.error('sendMessage failed', { status: response.status, body: bodyText });
  } else {
    console.log('sendMessage ok', { status: response.status });
  }
  try { return JSON.parse(bodyText); } catch { return { raw: bodyText }; }
}

async function sendPhoto(chatId: number, photoFileId: string, caption?: string) {
  const response = await fetch(`${TELEGRAM_API_URL}/sendPhoto`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, photo: photoFileId, caption })
  });
  const bodyText = await response.text();
  if (!response.ok) {
    console.error('sendPhoto failed', { status: response.status, body: bodyText });
  } else {
    console.log('sendPhoto ok', { status: response.status });
  }
  try { return JSON.parse(bodyText); } catch { return { raw: bodyText }; }
}

async function answerCallbackQuery(callbackQueryId: string, text?: string) {
  await fetch(`${TELEGRAM_API_URL}/answerCallbackQuery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ callback_query_id: callbackQueryId, text })
  });
}

async function getUserState(userId: number): Promise<UserState> {
  const { data, error } = await supabase
    .from('tg_user_state')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error || !data) {
    const newState: UserState = { user_id: userId, state: 'start', data: {} };
    await supabase.from('tg_user_state').upsert(newState);
    return newState;
  }
  return data;
}

async function updateUserState(userId: number, state: string, tempData?: any) {
  const updateData: any = { user_id: userId, state, updated_at: new Date().toISOString() };
  if (tempData !== undefined) updateData.data = tempData;
  await supabase.from('tg_user_state').upsert(updateData);
}

function getMainMenuKeyboard() {
  return { inline_keyboard: [
    [{ text: '🗑️ Оформить заказ', callback_data: 'new_order' }],
    [{ text: '📞 Связаться с оператором', callback_data: 'contact_operator' }],
    [{ text: '❓ Помощь', callback_data: 'help' }]
  ]};
}

function getProviderMainMenuKeyboard() {
  return { inline_keyboard: [
    [{ text: '📦 Новые заказы', callback_data: 'provider_new_orders' }],
    [{ text: '🛠 Мои заказы', callback_data: 'provider_my_orders' }],
    [{ text: '💰 Кошелёк', callback_data: 'provider_wallet' }],
    [{ text: '⚙️ Настройки', callback_data: 'provider_settings' }],
  ]};
}

// Универсальная строка «Назад / В начало»
function getBackHomeRow() {
  return [{ text: '⬅️ Назад', callback_data: 'go_back' }, { text: '🏠 В начало', callback_data: 'go_home' }];
}

function getRoleKeyboard() {
  return { inline_keyboard: [
    [{ text: '🛒 Я заказчик', callback_data: 'role_customer' }],
    [{ text: '🧹 Я исполнитель', callback_data: 'role_performer' }],
    getBackHomeRow()
  ]};
}

function getStartOrderKeyboard() {
  return { inline_keyboard: [
    [{ text: '✅ Да, начать', callback_data: 'start_order_yes' }],
    [{ text: '❌ Нет, позже', callback_data: 'start_order_no' }],
    getBackHomeRow()
  ]};
}

function getSaveAddressKeyboard() {
  return { inline_keyboard: [
    [{ text: '💾 Сохранить', callback_data: 'save_address_yes' }],
    [{ text: '⛔ Не сохранять', callback_data: 'save_address_no' }],
    getBackHomeRow()
  ]};
}

function getTimeChoiceKeyboard() {
  return { inline_keyboard: [
    [{ text: '⚡ Срочно (в течение часа)', callback_data: 'time_choice_urgent' }],
    [{ text: '🕒 Выбрать время', callback_data: 'time_choice_select' }],
    getBackHomeRow()
  ]};
}

function getTimeSlotsKeyboard() {
  return { inline_keyboard: [
    [{ text: 'Через 1 час', callback_data: 'slot_1h' }],
    [{ text: 'Сегодня 18:00–20:00', callback_data: 'slot_today_evening' }],
    [{ text: 'Завтра 10:00–12:00', callback_data: 'slot_tomorrow_morning' }],
    [{ text: '✍️ Ввести своё время', callback_data: 'time_enter_custom' }],
    getBackHomeRow()
  ]};
}

function getBagCountKeyboard() {
  return { inline_keyboard: [
    [{ text: '1 маленький 🥟', callback_data: 'bag_1_small' }],
    [{ text: '1 средний 🍕', callback_data: 'bag_1_medium' }],
    [{ text: '1 большой 🎒', callback_data: 'bag_1_large' }],
    [{ text: '2 пакета ➕', callback_data: 'bag_2' }],
    [{ text: '3 пакета ➕', callback_data: 'bag_3' }],
    getBackHomeRow()
  ]};
}

function getBagSizeKeyboard(idx: number) {
  return { inline_keyboard: [
    [{ text: `Пакет ${idx}: маленький 🥟`, callback_data: 'bag_size_small' }],
    [{ text: `Пакет ${idx}: средний 🍕`, callback_data: 'bag_size_medium' }],
    [{ text: `Пакет ${idx}: большой 🎒`, callback_data: 'bag_size_large' }],
    getBackHomeRow()
  ]};
}

function getPaymentKeyboard(amountSet: boolean) {
  const rows: any[] = [];
  rows.push([{ text: '💵 Минимальная сумма (100₽)', callback_data: 'payment_min' }]);
  rows.push([{ text: '✍️ Ввести свою сумму', callback_data: 'payment_custom' }]);
  if (amountSet) rows.push([{ text: '✅ Оплатить', callback_data: 'pay_now' }]);
  rows.push(getBackHomeRow());
  return { inline_keyboard: rows };
}

function getCommentChoiceKeyboard() {
  return { inline_keyboard: [
    [{ text: '📝 Да, добавить', callback_data: 'comment_yes' }],
    [{ text: '⛔ Нет', callback_data: 'comment_no' }],
    getBackHomeRow()
  ]};
}

function getSizeKeyboard() {
  return { inline_keyboard: [
    [{ text: 'Один пакет (до 6 кг) - 100₽', callback_data: 'size_one_bag' }],
    [{ text: 'Два пакета - 200₽', callback_data: 'size_two_bags' }],
    [{ text: 'Три пакета - 300₽', callback_data: 'size_three_bags' }],
    [{ text: '❌ Отмена', callback_data: 'cancel' }]
  ]};
}

function getTimeKeyboard() {
  return { inline_keyboard: [
    [{ text: '⏰ В течение часа', callback_data: 'time_within_hour' }],
    [{ text: '🌅 Завтра утром', callback_data: 'time_tomorrow_morning' }],
    [{ text: '📅 Указать свое время', callback_data: 'time_custom' }],
    [{ text: '❌ Отмена', callback_data: 'cancel' }]
  ]};
}

function getConfirmationKeyboard() {
  return { inline_keyboard: [
    [{ text: '✅ Все верно, подтвердить', callback_data: 'confirm_order' }],
    [{ text: '❌ Отмена', callback_data: 'cancel' }]
  ]};
}

async function handleStart(message: TelegramMessage) {
  // Первый запуск: определяем роль пользователя
  await updateUserState(message.from.id, 'awaiting_role', { bags: [], bag_count: 0 });
  const text = '👋 Привет! Я — <b>Мусоробот</b> 🤖\n\nКто вы? Выберите роль ниже:';
  await sendMessage(message.chat.id, text, getRoleKeyboard());
}

async function handleAdminId(message: TelegramMessage) {
  const chatId = message.chat.id;
  const text = message.text || '';
  const parts = text.split(' ');
  
  if (parts.length < 2) {
    await sendMessage(chatId, '❌ Укажите ID администратора.\nИспользование: /adminid 123456789');
    return;
  }
  
  const adminId = parts[1];
  
  // Save admin ID to bot_settings
  const { error } = await supabase
    .from('bot_settings')
    .upsert({ key: 'admin_chat_id', value: adminId, updated_at: new Date().toISOString() });
  
  if (error) {
    console.error('Error saving admin ID:', error);
    await sendMessage(chatId, '❌ Ошибка при сохранении ID администратора.');
    return;
  }
  
  await sendMessage(chatId, `✅ ID администратора успешно установлен: ${adminId}`);
}

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

async function saveOrder(userId: number, chatId: number, user: TelegramUser, tempData: any, status: string = 'new') {
  // Определяем size_option по количеству пакетов (для совместимости с веб-CRM)
  const count = (tempData.bags?.length ?? 0) || (tempData.size ? (tempData.size === 'one_bag' ? 1 : tempData.size === 'two_bags' ? 2 : 3) : 1);
  const size_option = count === 1 ? 'one_bag' : count === 2 ? 'two_bags' : 'three_bags';

  // Время
  let time_option = 'custom';
  let custom_time: string | null = null;
  if (tempData.time === 'within_hour' || tempData.time_option === 'within_hour') {
    time_option = 'within_hour';
  }
  custom_time = tempData.time_text || tempData.custom_time || null;

  // Сумма (в копейках)
  const amountRub = typeof tempData.amount === 'number' ? tempData.amount : (size_option === 'one_bag' ? 100 : size_option === 'two_bags' ? 200 : 300);
  const amount = Math.max(100, Math.round(amountRub)) * 100;

  const order = {
    user_id: userId,
    username: user.username || null,
    first_name: user.first_name,
    last_name: user.last_name || null,
    address: tempData.address,
    size_option,
    time_option,
    custom_time,
    amount,
    status,
    comment: tempData.comment || null,
    bags: Array.isArray(tempData.bags) ? tempData.bags : null,
  };

  const { data, error } = await supabase.from('orders').insert(order).select().single();
  if (error) { console.error('Error saving order:', error); return null; }
  return data;
}

async function notifyProviders(order: any) {
  // Получаем всех исполнителей с подходящим городом и настройками
  const { data: providers } = await supabase
    .from('tg_user_profile')
    .select('user_id, city, notification_filter, schedule_days, schedule_time')
    .eq('role', 'performer')
    .not('city', 'is', null);

  if (!providers || providers.length === 0) return;

  const isUrgent = order.time_option === 'within_hour';
  const bagCount = order.bags ? order.bags.length : 1;
  const isLarge = bagCount >= 2;

  for (const provider of providers) {
    // Фильтр по городу (упрощенно - по совпадению части города в адресе)
    // TODO: улучшить определение города из адреса
    if (provider.city && !order.address.toLowerCase().includes(provider.city.toLowerCase())) {
      continue;
    }

    // Фильтр по типу уведомлений
    if (provider.notification_filter === 'filter_none') continue;
    if (provider.notification_filter === 'filter_urgent' && !isUrgent) continue;
    if (provider.notification_filter === 'filter_large' && !isLarge) continue;

    // TODO: Проверка графика работы (если указан)

    // Отправляем уведомление
    const notificationText = `
🔔 <b>НОВЫЙ ЗАКАЗ!</b>

📍 ${order.address}
💰 ${order.amount / 100}₽
⏰ ${isUrgent ? 'Срочно (в течение часа)' : order.custom_time || order.time_option}

👉 Открой меню исполнителя, чтобы взять заказ!`;

    await sendMessage(provider.user_id, notificationText, {
      inline_keyboard: [
        [{ text: '📦 Посмотреть заказ', callback_data: 'provider_new_orders' }],
        [{ text: '🏠 Главное меню', callback_data: 'provider_main_menu' }]
      ]
    });
  }
}

async function getAdminChatId(): Promise<string | null> {
  // Try to get from bot_settings first
  const { data, error } = await supabase
    .from('bot_settings')
    .select('value')
    .eq('key', 'admin_chat_id')
    .maybeSingle();
  
  if (!error && data?.value) {
    return data.value;
  }
  
  // Fallback to environment variable
  return Deno.env.get('TELEGRAM_ADMIN_CHAT_ID') || null;
}

async function notifyAdmin(order: any) {
  const adminChatId = await getAdminChatId();
  if (!adminChatId) {
    console.log('Admin chat ID not configured');
    return;
  }
  
  const sizeNames: { [key: string]: string } = { 'one_bag': 'Один пакет (до 6 кг)', 'two_bags': 'Два пакета', 'three_bags': 'Три пакета' };
  const timeNames: { [key: string]: string } = { 'within_hour': 'В течение часа', 'custom': 'Указанное время' };
  const bagsText = order.bags ? `\n🛍️ Пакеты: ${order.bags.join(', ')}` : '';
  const commentText = order.comment ? `\n💬 Комментарий: ${order.comment}` : '';
  const adminText = `
🔔 <b>НОВЫЙ ЗАКАЗ #${order.id.slice(-8)}</b>

👤 <b>Клиент:</b> ${order.first_name} ${order.last_name || ''}
📱 <b>Username:</b> ${order.username ? '@' + order.username : 'не указан'}
📍 <b>Адрес:</b> ${order.address}
📦 <b>Объем:</b> ${sizeNames[order.size_option]}${bagsText}
⏰ <b>Время:</b> ${timeNames[order.time_option]}${order.custom_time ? ' (' + order.custom_time + ')' : ''}
💰 <b>Сумма:</b> ${order.amount / 100}₽
🏷️ <b>Статус:</b> ${order.status}
${commentText}

📅 <b>Дата заказа:</b> ${new Date(order.created_at).toLocaleString('ru-RU')}`;
  await sendMessage(parseInt(adminChatId), adminText);
}

async function handleCallbackQuery(callbackQuery: TelegramCallbackQuery) {
  const userId = callbackQuery.from.id;
  const chatId = callbackQuery.message!.chat.id;
  const data = callbackQuery.data!;
  await answerCallbackQuery(callbackQuery.id);
  const userState = await getUserState(userId);
  const temp = { ...(userState.data || {}) };

  // Вспомогательные функции-подсказки
  const showRole = async () => {
    await updateUserState(userId, 'awaiting_role', { bags: [], bag_count: 0 });
    await sendMessage(chatId, 'Кто вы? Выберите роль ниже:', getRoleKeyboard());
  };
  const showGreeting = async () => {
    await updateUserState(userId, 'customer_greeting', temp);
    await sendMessage(chatId, '👋 Привет! Я — Мусоробот 🤖. Готов помочь вам цивилизованно избавиться от мусора. Начнём заказ?', getStartOrderKeyboard());
  };
  const showAskCity = async () => {
    await updateUserState(userId, 'awaiting_city', temp);
    await sendMessage(chatId, '🏙️ Укажите ваш город, пожалуйста.', { inline_keyboard: [getBackHomeRow()] });
  };
  const showAskAddress = async () => {
    await updateUserState(userId, 'awaiting_address', temp);
    await sendMessage(chatId, '📍 Уточните адрес, пожалуйста (улица, дом, квартира).', { inline_keyboard: [getBackHomeRow()] });
  };
  const showSaveAddress = async () => {
    await updateUserState(userId, 'ask_save_address', temp);
    await sendMessage(chatId, 'Отлично, адрес записан ✅. Сохранить его для будущих заказов?', getSaveAddressKeyboard());
  };
  const showTimeChoice = async () => {
    await updateUserState(userId, 'awaiting_time_choice', temp);
    await sendMessage(chatId, '⏰ Когда вынести мусор?', getTimeChoiceKeyboard());
  };
  const showTimeSlots = async () => {
    await updateUserState(userId, 'awaiting_time_slot', temp);
    await sendMessage(chatId, 'Выберите удобный интервал или введите своё время:', getTimeSlotsKeyboard());
  };
  const showBagSelection = async () => {
    await updateUserState(userId, 'awaiting_bag_selection', temp);
    await sendMessage(chatId, '🛍️ Сколько и какие пакеты нужно вынести?', getBagCountKeyboard());
  };
  const showNextBagSize = async () => {
    const nextIdx = (temp.bags?.length || 0) + 1;
    await updateUserState(userId, 'awaiting_multi_bag_size', temp);
    await sendMessage(chatId, `Выберите размер для пакета ${nextIdx}:`, getBagSizeKeyboard(nextIdx));
  };
  const showPayment = async () => {
    const amountSet = typeof temp.amount === 'number' && temp.amount >= 100;
    await updateUserState(userId, 'awaiting_payment', temp);
    await sendMessage(chatId, '💳 Как оплатим?', getPaymentKeyboard(!!amountSet));
  };
  const showCommentChoice = async () => {
    await updateUserState(userId, 'awaiting_comment_choice', temp);
    await sendMessage(chatId, '🎁 Хотите оставить комментарий для курьера?', getCommentChoiceKeyboard());
  };

  // Обработка кнопок
  switch (data) {
    // Навигация
    case 'go_home':
      return await showRole();
    case 'go_back':
      switch (userState.state) {
        case 'customer_greeting': return await showRole();
        case 'awaiting_city': return await showGreeting();
        case 'awaiting_address': return await showAskCity();
        case 'ask_save_address': return await showAskAddress();
        case 'awaiting_time_choice': return await showSaveAddress();
        case 'awaiting_time_slot': return await showTimeChoice();
        case 'awaiting_bag_selection': return await showTimeChoice();
        case 'awaiting_multi_bag_size': return await showBagSelection();
        case 'awaiting_payment': return await showBagSelection();
        case 'awaiting_custom_amount': return await showPayment();
        case 'awaiting_comment_choice': return await showPayment();
        case 'awaiting_comment_text': return await showCommentChoice();
        default: return await showRole();
      }

    // Выбор роли
    case 'role_customer': {
      await supabase.from('tg_user_profile').upsert({ user_id: userId, role: 'customer' });
      return await showGreeting();
    }
    case 'role_performer': {
      const { data: profile } = await supabase
        .from('tg_user_profile')
        .select('city')
        .eq('user_id', userId)
        .single();
      
      if (!profile?.city) {
        await supabase.from('tg_user_profile').upsert({ user_id: userId, role: 'performer' });
        await updateUserState(userId, 'awaiting_provider_city', {});
        return await sendMessage(
          chatId,
          '🦸‍♂️ Добро пожаловать, герой чистоты!\n\n🌆 Для начала работы укажите ваш город:\n\n(Город можно будет изменить позже в настройках)'
        );
      }
      
      await supabase.from('tg_user_profile').upsert({ user_id: userId, role: 'performer' });
      await updateUserState(userId, 'start', {});
      return await sendMessage(chatId, '🦸‍♂️ Добро пожаловать, герой чистоты!\n\nГотов к новым подвигам по выносу мусора? 🚀\n\nВыбери действие:', getProviderMainMenuKeyboard());
    }

    // Старт заказа (для заказчика)
    case 'start_order_yes': {
      const { data: profile } = await supabase
        .from('tg_user_profile')
        .select('saved_address')
        .eq('user_id', userId)
        .single();
      
      if (profile?.saved_address) {
        temp.saved_address_available = profile.saved_address;
        await updateUserState(userId, 'choose_address_option', temp);
        return await sendMessage(
          chatId,
          '📍 У вас есть сохранённый адрес:\n\n' + profile.saved_address + '\n\nИспользовать его?',
          {
            inline_keyboard: [
              [{ text: '✅ Да, использовать', callback_data: 'use_saved_address' }],
              [{ text: '🏠 Ввести новый адрес', callback_data: 'enter_new_address' }],
              getBackHomeRow()
            ]
          }
        );
      }
      
      return await showAskCity();
    }
    case 'start_order_no':
      return await showRole();
    
    case 'use_saved_address':
      temp.address = temp.saved_address_available;
      temp.city = 'Сохранённый город';
      await updateUserState(userId, 'ask_save_address', temp);
      return await showAskTime();
    
    case 'enter_new_address':
      return await showAskCity();

    // Старое меню (оставим рабочим)
    case 'new_order':
      await updateUserState(userId, 'awaiting_address', {});
      return await sendMessage(chatId, '📍 Пожалуйста, введите ваш адрес (улица, дом, квартира):');
    case 'contact_operator':
      return await sendMessage(chatId, '📞 Для связи с оператором напишите нам: @operator_username или позвоните по телефону: +7 (xxx) xxx-xx-xx');
    case 'help':
      return await handleHelp(callbackQuery.message!);

    // Меню исполнителя
    case 'provider_main_menu':
      await updateUserState(userId, 'start', {});
      return await sendMessage(chatId, '🦸‍♂️ Главное меню исполнителя\n\nВыбери действие:', getProviderMainMenuKeyboard());

    case 'provider_new_orders': {
      const { data: orders, error } = await supabase
        .from('orders')
        .select('*')
        .eq('status', 'new')
        .order('created_at', { ascending: true })
        .limit(10);

      if (error || !orders || orders.length === 0) {
        return await sendMessage(chatId, '📭 Пока нет новых заказов.\n\nКак только появятся свежие задачки, я сразу тебе сообщу!', getProviderMainMenuKeyboard());
      }

      let message = '📦 Вот свежие задачки рядом с тобой:\n\n';
      const keyboard = [];

      orders.forEach((order, index) => {
        const bags = order.bags || [];
        const bagsText = bags.length > 0 ? bags.join(', ') : (order.amount / 100) + '₽';
        message += `${index + 1}. 🏠 ${order.address}\n`;
        message += `   📦 ${bagsText}\n`;
        message += `   ⏰ ${order.time_option === 'within_hour' ? 'Срочно' : order.custom_time || 'По согласованию'}\n\n`;
        
        keyboard.push([{ text: `⚡ Взять заказ #${index + 1}`, callback_data: `provider_take_${order.id}` }]);
      });

      keyboard.push([{ text: '🔙 Назад', callback_data: 'provider_main_menu' }]);
      return await sendMessage(chatId, message, { inline_keyboard: keyboard });
    }

    case 'provider_my_orders':
      return await sendMessage(
        chatId,
        '🛠 Мои заказы\n\nВыберите категорию:',
        {
          inline_keyboard: [
            [{ text: '⚡ Текущие заказы', callback_data: 'provider_current_orders' }],
            [{ text: '✅ Выполненные заказы', callback_data: 'provider_completed_orders' }],
            [{ text: '🔙 Назад', callback_data: 'provider_main_menu' }]
          ]
        }
      );

    case 'provider_current_orders': {
      const { data: orders } = await supabase
        .from('orders')
        .select('*')
        .eq('performer_id', userId)
        .eq('status', 'in_progress')
        .order('created_at', { ascending: false })
        .limit(10);

      if (!orders || orders.length === 0) {
        return await sendMessage(
          chatId,
          '📭 У тебя пока нет заказов в работе.\n\nЗагляни в раздел «Новые заказы» 📦',
          {
            inline_keyboard: [[{ text: '🔙 Назад', callback_data: 'provider_my_orders' }]]
          }
        );
      }

      let message = '⚡ Текущие заказы:\n\n';
      const keyboard = [];

      orders.forEach((order, index) => {
        message += `${index + 1}. 🏠 ${order.address}\n`;
        message += `   📦 ${order.amount / 100}₽\n`;
        message += `   🕐 Создан: ${new Date(order.created_at).toLocaleDateString('ru-RU')}\n\n`;
        keyboard.push([{ text: `✅ Завершить заказ #${index + 1}`, callback_data: `provider_request_photos_${order.id}` }]);
      });

      keyboard.push([{ text: '🔙 Назад', callback_data: 'provider_my_orders' }]);
      return await sendMessage(chatId, message, { inline_keyboard: keyboard });
    }

    case 'provider_completed_orders': {
      const { data: orders } = await supabase
        .from('orders')
        .select('*')
        .eq('performer_id', userId)
        .eq('status', 'completed')
        .order('updated_at', { ascending: false })
        .limit(20);

      if (!orders || orders.length === 0) {
        return await sendMessage(
          chatId,
          '📭 У тебя пока нет выполненных заказов.',
          {
            inline_keyboard: [[{ text: '🔙 Назад', callback_data: 'provider_my_orders' }]]
          }
        );
      }

      let message = '✅ История выполненных заказов:\n\n';
      const keyboard = [];

      orders.forEach((order, index) => {
        const earnings = order.amount / 100;
        const commission = Math.max(20, earnings * 0.15);
        const netEarnings = earnings - commission;
        
        message += `${index + 1}. 🏠 ${order.address}\n`;
        message += `   💰 Заработано: ${netEarnings.toFixed(2)}₽\n`;
        message += `   📅 ${new Date(order.updated_at).toLocaleDateString('ru-RU')}\n`;
        
        if (order.photo_door && order.photo_bin) {
          message += `   📸 Фото: доступны\n`;
        }
        message += `\n`;
      });

      keyboard.push([{ text: '🔙 Назад', callback_data: 'provider_my_orders' }]);

      return await sendMessage(chatId, message, { inline_keyboard: keyboard });
    }

    case 'provider_wallet': {
      const { data: profile } = await supabase
        .from('tg_user_profile')
        .select('eco_points')
        .eq('user_id', userId)
        .single();

      const balance = profile?.eco_points || 0;

      return await sendMessage(
        chatId,
        `💰 Твой кошелёк\n\n💵 Баланс: ${balance}₽\n\n📊 История операций скоро будет доступна!\n\n💳 Хочешь вывести средства или оставить копить?`,
        {
          inline_keyboard: [
            [{ text: '💸 Вывести средства', callback_data: 'provider_withdraw' }],
            [{ text: '🔙 Назад', callback_data: 'provider_main_menu' }]
          ]
        }
      );
    }

    case 'provider_withdraw':
      return await sendMessage(chatId, '💳 Функция вывода средств будет доступна позже.\n\nМы работаем над этим!', getProviderMainMenuKeyboard());

    case 'provider_settings':
      return await sendMessage(
        chatId,
        '⚙️ Настройки исполнителя\n\nЗдесь можно настроить:',
        {
          inline_keyboard: [
            [{ text: '🌆 Изменить город', callback_data: 'provider_change_city' }],
            [{ text: '⏰ График работы', callback_data: 'provider_schedule' }],
            [{ text: '🔙 Назад', callback_data: 'provider_main_menu' }]
          ]
        }
      );

    case 'provider_change_city':
      await updateUserState(userId, 'awaiting_provider_city', {});
      return await sendMessage(
        chatId,
        '🌆 Введите название вашего города:',
        {
          inline_keyboard: [[{ text: '🔙 Назад', callback_data: 'provider_settings' }]]
        }
      );

    case 'provider_schedule':
      return await sendMessage(
        chatId,
        '⏰ Настраиваем твой рабочий ритм\n\nХочешь быть в строю всегда или по расписанию?\n\n👉 Выбери вариант:',
        {
          inline_keyboard: [
            [{ text: '🌍 Всегда на связи (принимать заказы 24/7)', callback_data: 'schedule_always' }],
            [{ text: '📅 Задать свой график', callback_data: 'schedule_custom' }],
            [{ text: '🔙 Назад', callback_data: 'provider_settings' }]
          ]
        }
      );

    case 'schedule_always':
      return await sendMessage(
        chatId,
        'Супер! Ты теперь железный герой 💪\n\nБудешь получать все заказы в любое время суток.\n\n👉 Хочешь фильтровать уведомления или брать всё подряд?',
        {
          inline_keyboard: [
            [{ text: '🔔 Все заказы', callback_data: 'filter_all' }],
            [{ text: '⚡ Только срочные', callback_data: 'filter_urgent' }],
            [{ text: '📦 Только крупные (2+ пакета)', callback_data: 'filter_large' }],
            [{ text: '🔙 Назад', callback_data: 'provider_schedule' }]
          ]
        }
      );

    case 'schedule_custom':
      return await sendMessage(
        chatId,
        'Отлично, давай настроим твой график 📅\n\n📍 Сначала выбери дни:',
        {
          inline_keyboard: [
            [{ text: 'Каждый день', callback_data: 'days_everyday' }],
            [{ text: 'Только будни (пн–пт)', callback_data: 'days_weekdays' }],
            [{ text: 'Только выходные (сб–вс)', callback_data: 'days_weekend' }],
            [{ text: 'Указать вручную', callback_data: 'days_manual' }],
            [{ text: '🔙 Назад', callback_data: 'provider_schedule' }]
          ]
        }
      );

    case 'days_everyday':
      temp.schedule_days = 'everyday';
      await updateUserState(userId, userState.state, temp);
      return await sendMessage(
        chatId,
        'Теперь время работы:',
        {
          inline_keyboard: [
            [{ text: '⏰ С 09:00 до 18:00', callback_data: 'time_9_18' }],
            [{ text: '⏰ С 10:00 до 20:00', callback_data: 'time_10_20' }],
            [{ text: 'Указать своё', callback_data: 'time_custom_input' }],
            [{ text: '🔙 Назад', callback_data: 'schedule_custom' }]
          ]
        }
      );

    case 'days_weekdays':
      temp.schedule_days = 'weekdays';
      await updateUserState(userId, userState.state, temp);
      return await sendMessage(
        chatId,
        'Теперь время работы:',
        {
          inline_keyboard: [
            [{ text: '⏰ С 09:00 до 18:00', callback_data: 'time_9_18' }],
            [{ text: '⏰ С 10:00 до 20:00', callback_data: 'time_10_20' }],
            [{ text: 'Указать своё', callback_data: 'time_custom_input' }],
            [{ text: '🔙 Назад', callback_data: 'schedule_custom' }]
          ]
        }
      );

    case 'days_weekend':
      temp.schedule_days = 'weekend';
      await updateUserState(userId, userState.state, temp);
      return await sendMessage(
        chatId,
        'Теперь время работы:',
        {
          inline_keyboard: [
            [{ text: '⏰ С 09:00 до 18:00', callback_data: 'time_9_18' }],
            [{ text: '⏰ С 10:00 до 20:00', callback_data: 'time_10_20' }],
            [{ text: 'Указать своё', callback_data: 'time_custom_input' }],
            [{ text: '🔙 Назад', callback_data: 'schedule_custom' }]
          ]
        }
      );

    case 'days_manual':
      await updateUserState(userId, 'awaiting_manual_days', temp);
      return await sendMessage(
        chatId,
        '📅 Укажите дни работы через запятую (например: пн, ср, пт):',
        {
          inline_keyboard: [
            [{ text: '🔙 Назад', callback_data: 'schedule_custom' }]
          ]
        }
      );

    case 'time_9_18':
      temp.schedule_time = '09:00-18:00';
      await updateUserState(userId, userState.state, temp);
      return await sendMessage(
        chatId,
        `Окей, график установлен! 🎯\n\nТы в строю: ${temp.schedule_days === 'everyday' ? 'каждый день' : temp.schedule_days === 'weekdays' ? 'пн–пт' : temp.schedule_days === 'weekend' ? 'сб–вс' : temp.schedule_days}, с 09:00 до 18:00\n\nТеперь давай уточним уведомления.\n\n👉 Что слать тебе в рабочее время?`,
        {
          inline_keyboard: [
            [{ text: '🔔 Все новые заказы', callback_data: 'filter_all' }],
            [{ text: '⚡ Только срочные', callback_data: 'filter_urgent' }],
            [{ text: '📦 Только крупные', callback_data: 'filter_large' }],
            [{ text: '🔕 Ничего, сам буду заходить и смотреть', callback_data: 'filter_none' }],
            [{ text: '🔙 Назад', callback_data: 'schedule_custom' }]
          ]
        }
      );

    case 'time_10_20':
      temp.schedule_time = '10:00-20:00';
      await updateUserState(userId, userState.state, temp);
      return await sendMessage(
        chatId,
        `Окей, график установлен! 🎯\n\nТы в строю: ${temp.schedule_days === 'everyday' ? 'каждый день' : temp.schedule_days === 'weekdays' ? 'пн–пт' : temp.schedule_days === 'weekend' ? 'сб–вс' : temp.schedule_days}, с 10:00 до 20:00\n\nТеперь давай уточним уведомления.\n\n👉 Что слать тебе в рабочее время?`,
        {
          inline_keyboard: [
            [{ text: '🔔 Все новые заказы', callback_data: 'filter_all' }],
            [{ text: '⚡ Только срочные', callback_data: 'filter_urgent' }],
            [{ text: '📦 Только крупные', callback_data: 'filter_large' }],
            [{ text: '🔕 Ничего, сам буду заходить и смотреть', callback_data: 'filter_none' }],
            [{ text: '🔙 Назад', callback_data: 'schedule_custom' }]
          ]
        }
      );

    case 'time_custom_input':
      await updateUserState(userId, 'awaiting_custom_time_start', temp);
      return await sendMessage(
        chatId,
        '⏰ С какого времени начинаешь? (например: 08:00)',
        {
          inline_keyboard: [
            [{ text: '🔙 Назад', callback_data: 'schedule_custom' }]
          ]
        }
      );

    case 'filter_all':
      temp.notification_filter = 'all';
      await supabase.from('tg_user_profile').upsert({
        user_id: userId,
        data: {
          schedule_days: temp.schedule_days,
          schedule_time: temp.schedule_time,
          notification_filter: 'all'
        }
      });
      await updateUserState(userId, 'start', {});
      return await sendMessage(
        chatId,
        `Готово! ✅\n\nТвой график: ${temp.schedule_days === 'everyday' ? 'каждый день' : temp.schedule_days === 'weekdays' ? 'пн–пт' : temp.schedule_days === 'weekend' ? 'сб–вс' : temp.schedule_days || 'всегда на связи'}, ${temp.schedule_time || 'круглосуточно'}\nУведомления: все новые заказы\n\n🚀 Теперь система сама будет подбирать тебе заказы по этому расписанию.`,
        getProviderMainMenuKeyboard()
      );

    case 'filter_urgent':
      temp.notification_filter = 'urgent';
      await supabase.from('tg_user_profile').upsert({
        user_id: userId,
        data: {
          schedule_days: temp.schedule_days,
          schedule_time: temp.schedule_time,
          notification_filter: 'urgent'
        }
      });
      await updateUserState(userId, 'start', {});
      return await sendMessage(
        chatId,
        `Готово! ✅\n\nТвой график: ${temp.schedule_days === 'everyday' ? 'каждый день' : temp.schedule_days === 'weekdays' ? 'пн–пт' : temp.schedule_days === 'weekend' ? 'сб–вс' : temp.schedule_days || 'всегда на связи'}, ${temp.schedule_time || 'круглосуточно'}\nУведомления: только срочные заказы\n\n🚀 Теперь система сама будет подбирать тебе заказы по этому расписанию.`,
        getProviderMainMenuKeyboard()
      );

    case 'filter_large':
      temp.notification_filter = 'large';
      await supabase.from('tg_user_profile').upsert({
        user_id: userId,
        data: {
          schedule_days: temp.schedule_days,
          schedule_time: temp.schedule_time,
          notification_filter: 'large'
        }
      });
      await updateUserState(userId, 'start', {});
      return await sendMessage(
        chatId,
        `Готово! ✅\n\nТвой график: ${temp.schedule_days === 'everyday' ? 'каждый день' : temp.schedule_days === 'weekdays' ? 'пн–пт' : temp.schedule_days === 'weekend' ? 'сб–вс' : temp.schedule_days || 'всегда на связи'}, ${temp.schedule_time || 'круглосуточно'}\nУведомления: только крупные заказы (2+ пакета)\n\n🚀 Теперь система сама будет подбирать тебе заказы по этому расписанию.`,
        getProviderMainMenuKeyboard()
      );

    case 'filter_none':
      temp.notification_filter = 'none';
      await supabase.from('tg_user_profile').upsert({
        user_id: userId,
        data: {
          schedule_days: temp.schedule_days,
          schedule_time: temp.schedule_time,
          notification_filter: 'none'
        }
      });
      await updateUserState(userId, 'start', {});
      return await sendMessage(
        chatId,
        `Готово! ✅\n\nТвой график: ${temp.schedule_days === 'everyday' ? 'каждый день' : temp.schedule_days === 'weekdays' ? 'пн–пт' : temp.schedule_days === 'weekend' ? 'сб–вс' : temp.schedule_days || 'всегда на связи'}, ${temp.schedule_time || 'круглосуточно'}\nУведомления: отключены\n\n🚀 Теперь система сама будет подбирать тебе заказы по этому расписанию.`,
        getProviderMainMenuKeyboard()
      );

    case 'cancel':
      await updateUserState(userId, 'start', {});
      return await sendMessage(chatId, '❌ Действие отменено.', getMainMenuKeyboard());

    // Сохранение адреса
    case 'save_address_yes':
      if (temp.address) {
        await supabase.from('tg_user_profile').upsert({ user_id: userId, saved_address: temp.address });
      }
      return await showTimeChoice();
    case 'save_address_no':
      return await showTimeChoice();

    // Время вывоза
    case 'time_choice_urgent':
      temp.time = 'within_hour';
      await updateUserState(userId, 'awaiting_bag_selection', temp);
      return await showBagSelection();
    case 'time_choice_select':
      return await showTimeSlots();
    case 'time_enter_custom':
      await updateUserState(userId, 'awaiting_custom_time_text', temp);
      return await sendMessage(chatId, '✍️ Напишите желаемую дату и время (например: «завтра в 14:00»):', { inline_keyboard: [getBackHomeRow()] });

    case 'slot_1h':
      temp.time_text = 'Через 1 час';
      return await showBagSelection();
    case 'slot_today_evening':
      temp.time_text = 'Сегодня 18:00–20:00';
      return await showBagSelection();
    case 'slot_tomorrow_morning':
      temp.time_text = 'Завтра 10:00–12:00';
      return await showBagSelection();

    // Количество пакетов (один пакет сразу с размером)
    case 'bag_1_small':
      temp.bags = ['small']; temp.bag_count = 1; return await showPayment();
    case 'bag_1_medium':
      temp.bags = ['medium']; temp.bag_count = 1; return await showPayment();
    case 'bag_1_large':
      temp.bags = ['large']; temp.bag_count = 1; return await showPayment();
    case 'bag_2':
      temp.bags = []; temp.bag_count = 2; return await showNextBagSize();
    case 'bag_3':
      temp.bags = []; temp.bag_count = 3; return await showNextBagSize();

    // Уточнение размеров для 2-3 пакетов
    case 'bag_size_small':
      temp.bags = [...(temp.bags || []), 'small'];
      if (temp.bags.length < temp.bag_count) return await showNextBagSize();
      return await showPayment();
    case 'bag_size_medium':
      temp.bags = [...(temp.bags || []), 'medium'];
      if (temp.bags.length < temp.bag_count) return await showNextBagSize();
      return await showPayment();
    case 'bag_size_large':
      temp.bags = [...(temp.bags || []), 'large'];
      if (temp.bags.length < temp.bag_count) return await showNextBagSize();
      return await showPayment();

    // Оплата
    case 'payment_min':
      temp.amount = 100; await updateUserState(userId, 'awaiting_payment', temp);
      return await sendMessage(chatId, 'Сумма установлена: 100₽', getPaymentKeyboard(true));
    case 'payment_custom':
      await updateUserState(userId, 'awaiting_custom_amount', temp);
      return await sendMessage(chatId, 'Введите желаемую сумму в рублях (не меньше 100):', { inline_keyboard: [getBackHomeRow()] });
    case 'pay_now': {
      const order = await saveOrder(userId, chatId, callbackQuery.from, temp, 'new');
      if (order) {
        temp.order_id = order.id;
        await updateUserState(userId, 'awaiting_comment_choice', temp);
        await sendMessage(chatId, '✅ Ваш заказ оплачен и принят! Хотите добавить комментарий для курьера?', getCommentChoiceKeyboard());
        await notifyAdmin(order);
        await notifyProviders(order);
      } else {
        await sendMessage(chatId, '❌ Произошла ошибка при создании заказа. Попробуйте еще раз.');
      }
      return;
    }

    // Комментарий
    case 'comment_yes':
      await updateUserState(userId, 'awaiting_comment_text', temp);
      return await sendMessage(chatId, 'Напишите комментарий (например: «Забрать с порога», «Позвонить в домофон»):', { inline_keyboard: [getBackHomeRow()] });
    case 'comment_no':
      await updateUserState(userId, 'start', {});
      return await sendMessage(chatId, '✅ Ваш заказ принят! Курьер скоро приедет и аккуратно вынесет ваш мусор. Спасибо, что выбираете Мусоробота 🤖✨\n\nВы можете оформить 🏠 Новый заказ командой /start.');

    // Исполнитель: взятие заказа
    default:
      if (data.startsWith('provider_take_')) {
        const orderId = data.replace('provider_take_', '');
        
        // Проверяем, что заказ существует и доступен
        const { data: orderCheck } = await supabase
          .from('orders')
          .select('*')
          .eq('id', orderId)
          .eq('status', 'new')
          .maybeSingle();

        if (!orderCheck) {
          return await sendMessage(chatId, '❌ Не удалось взять заказ. Возможно, его уже взял другой исполнитель.', getProviderMainMenuKeyboard());
        }

        // Обновляем заказ и привязываем исполнителя
        const { error } = await supabase
          .from('orders')
          .update({ 
            status: 'in_progress', 
            performer_id: userId,
            updated_at: new Date().toISOString() 
          })
          .eq('id', orderId);

        if (error) {
          console.error('Error taking order:', error);
          return await sendMessage(chatId, '❌ Произошла ошибка при взятии заказа.', getProviderMainMenuKeyboard());
        }

        // Сохраняем ID заказа в состоянии исполнителя
        temp.current_order_id = orderId;
        await updateUserState(userId, 'provider_working', temp);

        return await sendMessage(
          chatId, 
          '🎉 Отличный выбор!\n\nЗаказ закреплён за тобой.\n\n📸 Теперь нужно сделать фото мусорного пакета:\n\n1️⃣ Фото пакета возле двери клиента\n2️⃣ Фото пакета на фоне мусорки\n\nНачнём?',
          {
            inline_keyboard: [
              [{ text: '📸 Сфотографировал пакет возле двери', callback_data: `photo_at_door_${orderId}` }],
              [{ text: '🤝 Передал в руки', callback_data: `handed_over_${orderId}` }],
              [{ text: '🔙 Назад', callback_data: 'provider_my_orders' }]
            ]
          }
        );
      }

      // Фото у двери
      if (data.startsWith('photo_at_door_')) {
        const orderId = data.replace('photo_at_door_', '');
        temp.current_order_id = orderId;
        temp.photo_step = 'at_door';
        await updateUserState(userId, 'awaiting_photo_at_door', temp);
        return await sendMessage(chatId, '📸 Отлично! Пришлите фото мусорного пакета возле двери клиента.');
      }

      // Передано в руки
      if (data.startsWith('handed_over_')) {
        const orderId = data.replace('handed_over_', '');
        
        // Получаем данные заказа для отправки уведомления заказчику
        const { data: order } = await supabase
          .from('orders')
          .select('*')
          .eq('id', orderId)
          .single();

        if (order) {
          // Отправляем запрос заказчику на подтверждение
          await sendMessage(
            order.user_id,
            '🤝 Исполнитель сообщает, что передал вам мусорный пакет в руки.\n\nПодтвердите, пожалуйста:',
            {
              inline_keyboard: [
                [{ text: '✅ Подтверждаю', callback_data: `confirm_handover_${orderId}` }],
                [{ text: '❌ Не получал', callback_data: `deny_handover_${orderId}` }]
              ]
            }
          );
        }

        temp.current_order_id = orderId;
        temp.handover_requested = true;
        await updateUserState(userId, 'awaiting_handover_confirmation', temp);
        return await sendMessage(chatId, '⏳ Запрос отправлен заказчику. Ожидайте подтверждения...');
      }

      // Подтверждение передачи в руки от заказчика
      if (data.startsWith('confirm_handover_')) {
        const orderId = data.replace('confirm_handover_', '');
        
        // Получаем исполнителя
        const { data: order } = await supabase
          .from('orders')
          .select('performer_id')
          .eq('id', orderId)
          .single();

        if (order?.performer_id) {
          // Уведомляем исполнителя
          const performerState = await getUserState(order.performer_id);
          const performerTemp = performerState.data || {};
          performerTemp.current_order_id = orderId;
          performerTemp.photo_step = 'at_bin';
          await updateUserState(order.performer_id, 'awaiting_photo_at_bin', performerTemp);
          
          await sendMessage(
            order.performer_id,
            '✅ Заказчик подтвердил получение!\n\n📸 Теперь пришлите фото этого мусорного пакета на фоне мусорки.'
          );
        }

        return await sendMessage(chatId, '✅ Спасибо за подтверждение!');
      }

      // Отклонение передачи в руки
      if (data.startsWith('deny_handover_')) {
        const orderId = data.replace('deny_handover_', '');
        
        const { data: order } = await supabase
          .from('orders')
          .select('performer_id')
          .eq('id', orderId)
          .single();

        if (order?.performer_id) {
          await sendMessage(
            order.performer_id,
            '❌ Заказчик не подтвердил передачу.\n\nПожалуйста, попробуйте связаться с клиентом или сделайте фото у двери.',
            {
              inline_keyboard: [
                [{ text: '📸 Сфотографировал у двери', callback_data: `photo_at_door_${orderId}` }],
                [{ text: '🔙 К моим заказам', callback_data: 'provider_my_orders' }]
              ]
            }
          );
        }

        return await sendMessage(chatId, 'Исполнитель уведомлён.');
      }

      // Проверка выполнения заказа заказчиком
      if (data.startsWith('check_order_')) {
        const orderId = data.replace('check_order_', '');
        
        const { data: order } = await supabase
          .from('orders')
          .select('*')
          .eq('id', orderId)
          .single();
        
        if (!order) {
          return await sendMessage(chatId, '❌ Заказ не найден.');
        }

        if (order.photo_door || order.photo_bin) {
          let message = '📸 Фото выполнения заказа:\n\n';
          
          if (order.photo_door) {
            message += '✅ Фото у двери: есть\n';
          } else {
            message += '❌ Фото у двери: нет\n';
          }
          
          if (order.photo_bin) {
            message += '✅ Фото у мусорки: есть\n';
          } else {
            message += '❌ Фото у мусорки: нет\n';
          }
          
          await sendMessage(chatId, message);
          
          // Отправляем фото, если они есть
          if (order.photo_door) {
            await sendPhoto(chatId, order.photo_door, '📷 Фото мусорного пакета у двери');
          }
          
          if (order.photo_bin) {
            await sendPhoto(chatId, order.photo_bin, '📷 Фото мусорного пакета у мусорки');
          }
          
          // Проверяем, есть ли уже оценка
          if (order.rating) {
            const stars = '⭐'.repeat(order.rating);
            return await sendMessage(
              chatId,
              `${stars} Вы уже оценили этот заказ: ${order.rating}/5\n\nЕсли у вас есть вопросы или замечания:`,
              {
                inline_keyboard: [
                  [{ text: '📞 НАПИСАТЬ В ПОДДЕРЖКУ', callback_data: `support_${orderId}` }]
                ]
              }
            );
          }
          
          return await sendMessage(
            chatId, 
            'Заказ выполнен качественно? 🌟',
            {
              inline_keyboard: [
                [{ text: '⭐', callback_data: `rate_${orderId}_1` }],
                [{ text: '⭐⭐', callback_data: `rate_${orderId}_2` }],
                [{ text: '⭐⭐⭐', callback_data: `rate_${orderId}_3` }],
                [{ text: '⭐⭐⭐⭐', callback_data: `rate_${orderId}_4` }],
                [{ text: '⭐⭐⭐⭐⭐', callback_data: `rate_${orderId}_5` }]
              ]
            }
          );
        } else {
          return await sendMessage(
            chatId, 
            '📭 К сожалению, исполнитель не загрузил фото выполнения заказа.\n\nЗаказ был отмечен как выполненный.'
          );
        }
      }

      // Оценка заказа
      if (data.startsWith('rate_')) {
        const parts = data.split('_');
        const orderId = parts[1];
        const rating = parseInt(parts[2]);
        
        // Получаем данные заказа
        const { data: order } = await supabase
          .from('orders')
          .select('*')
          .eq('id', orderId)
          .single();

        if (!order) {
          return await sendMessage(chatId, '❌ Заказ не найден.');
        }

        // Сохраняем рейтинг заказа
        await supabase
          .from('orders')
          .update({ rating })
          .eq('id', orderId);

        // Обновляем средний рейтинг исполнителя
        if (order.performer_id) {
          const { data: profile } = await supabase
            .from('tg_user_profile')
            .select('average_rating, rating_count')
            .eq('user_id', order.performer_id)
            .maybeSingle();

          const currentRating = profile?.average_rating || 0;
          const currentCount = profile?.rating_count || 0;
          const newCount = currentCount + 1;
          const newRating = ((currentRating * currentCount) + rating) / newCount;

          await supabase
            .from('tg_user_profile')
            .upsert({
              user_id: order.performer_id,
              average_rating: Number(newRating.toFixed(2)),
              rating_count: newCount,
              updated_at: new Date().toISOString()
            });
        }
        
        const stars = '⭐'.repeat(rating);
        return await sendMessage(
          chatId,
          `${stars} Спасибо за вашу оценку!\n\nВаше мнение помогает нам становиться лучше. 🙏\n\nЕсли у вас есть вопросы или замечания:`,
          {
            inline_keyboard: [
              [{ text: '📞 НАПИСАТЬ В ПОДДЕРЖКУ', callback_data: `support_${orderId}` }]
            ]
          }
        );
      }

      // Обращение в поддержку
      if (data.startsWith('support_')) {
        const orderId = data.replace('support_', '');
        temp.support_order_id = orderId;
        await updateUserState(userId, 'awaiting_support_message', temp);
        return await sendMessage(chatId, '✍️ Напишите ваше сообщение для поддержки:');
      }

      // Запрос фото для завершения заказа
      if (data.startsWith('provider_request_photos_')) {
        const orderId = data.replace('provider_request_photos_', '');
        temp.current_order_id = orderId;
        temp.photo_step = 'at_door';
        await updateUserState(userId, 'awaiting_photo_at_door', temp);
        return await sendMessage(
          chatId,
          '📸 Для завершения заказа нужно загрузить 2 фото:\n\n1️⃣ Фото мусорного пакета возле двери клиента\n2️⃣ Фото пакета на фоне мусорки\n\nПришлите первое фото (у двери):'
        );
      }

      // Завершение заказа (старый хэндлер для совместимости)
      if (data.startsWith('provider_complete_')) {
        const orderId = data.replace('provider_complete_', '');
        temp.current_order_id = orderId;
        await updateUserState(userId, 'awaiting_completion_confirm', temp);
        
        return await sendMessage(
          chatId,
          '✅ Подтвердите выполнение заказа.\n\nПосле подтверждения средства будут зачислены на ваш счёт.',
          {
            inline_keyboard: [
              [{ text: '✅ Подтверждаю выполнение', callback_data: `final_confirm_${orderId}` }],
              [{ text: '❌ Отмена', callback_data: 'provider_my_orders' }]
            ]
          }
        );
      }

      // Финальное подтверждение
      if (data.startsWith('final_confirm_')) {
        const orderId = data.replace('final_confirm_', '');
        
        const { data: order, error } = await supabase
          .from('orders')
          .update({ status: 'completed', updated_at: new Date().toISOString() })
          .eq('id', orderId)
          .eq('performer_id', userId)
          .select()
          .maybeSingle();

        if (error || !order) {
          console.error('Error completing order:', error);
          return await sendMessage(chatId, '❌ Не удалось завершить заказ.', getProviderMainMenuKeyboard());
        }

        // Рассчитываем заработок (сумма минус комиссия 15%, минимум 20 руб)
        const totalAmount = order.amount / 100;
        const commission = Math.max(20, totalAmount * 0.15);
        const earnings = totalAmount - commission;

        // Обновляем баланс исполнителя
        const { data: profile } = await supabase
          .from('tg_user_profile')
          .select('eco_points')
          .eq('user_id', userId)
          .maybeSingle();

        const currentBalance = profile?.eco_points || 0;
        await supabase
          .from('tg_user_profile')
          .upsert({ 
            user_id: userId, 
            eco_points: currentBalance + earnings 
          });

        // Уведомляем заказчика с возможностью проверить выполнение
        await sendMessage(
          order.user_id,
          `✅ Ваш заказ выполнен!\n\n🎉 Спасибо за использование Мусоробота! 🤖✨\n\nВы можете проверить, как был выполнен заказ:`,
          {
            inline_keyboard: [
              [{ text: '📸 Проверить выполнение заказа', callback_data: `check_order_${orderId}` }]
            ]
          }
        );

        await updateUserState(userId, 'provider_main', {});
        return await sendMessage(
          chatId, 
          `🌟 Красота! Заказ закрыт.\n\n💰 Заработано: +${earnings.toFixed(2)}₽\n💸 Комиссия сервиса: ${commission.toFixed(2)}₽\n\n💵 Новый баланс: ${(currentBalance + earnings).toFixed(2)}₽`, 
          getProviderMainMenuKeyboard()
        );
      }
  }
}


async function showOrderSummary(chatId: number, tempData: any) {
  const sizeNames: { [key: string]: string } = { 'one_bag': 'Один пакет (до 6 кг)', 'two_bags': 'Два пакета', 'three_bags': 'Три пакета' };
  const sizeAmounts: { [key: string]: number } = { 'one_bag': 100, 'two_bags': 200, 'three_bags': 300 };
  const timeNames: { [key: string]: string } = { 'within_hour': 'В течение часа', 'tomorrow_morning': 'Завтра утром', 'custom': 'Указанное время' };
  const summaryText = `
📋 <b>Проверьте ваш заказ:</b>

📍 <b>Адрес:</b> ${tempData.address}
📦 <b>Объем:</b> ${sizeNames[tempData.size]}
⏰ <b>Время:</b> ${timeNames[tempData.time]}${tempData.custom_time ? ' (' + tempData.custom_time + ')' : ''}
💰 <b>К оплате:</b> ${sizeAmounts[tempData.size]}₽`;
  await sendMessage(chatId, summaryText, getConfirmationKeyboard());
}

async function handleTextMessage(message: TelegramMessage) {
  const userId = message.from.id;
  const chatId = message.chat.id;
  const text = message.text?.trim() || '';
  const userState = await getUserState(userId);
  const temp = { ...(userState.data || {}) };

  // Обработка фото от исполнителя
  if (message.photo && (userState.state === 'awaiting_photo_at_door' || userState.state === 'awaiting_photo_at_bin')) {
    const orderId = temp.current_order_id;
    
    if (!orderId) {
      await sendMessage(chatId, '⚠️ Не найден активный заказ.');
      return;
    }

    // Получаем file_id самого большого фото (последнее в массиве)
    const photoFileId = message.photo[message.photo.length - 1].file_id;

    if (userState.state === 'awaiting_photo_at_door') {
      // Сохраняем file_id фото у двери в БД
      await supabase
        .from('orders')
        .update({ photo_door: photoFileId })
        .eq('id', orderId);

      temp.photo_at_door_received = true;
      temp.photo_step = 'at_bin';
      await updateUserState(userId, 'awaiting_photo_at_bin', temp);
      return await sendMessage(
        chatId,
        '✅ Отлично! Фото у двери получено.\n\n📸 Теперь пришлите фото этого мусорного пакета на фоне мусорки.'
      );
    }

    if (userState.state === 'awaiting_photo_at_bin') {
      // Сохраняем file_id фото у мусорки в БД
      await supabase
        .from('orders')
        .update({ photo_bin: photoFileId })
        .eq('id', orderId);

      temp.photo_at_bin_received = true;
      await updateUserState(userId, 'provider_ready_to_complete', temp);
      return await sendMessage(
        chatId,
        '✅ Супер! Оба фото получены.\n\n🎯 Готов завершить заказ?',
        {
          inline_keyboard: [
            [{ text: '✅ Завершить заказ', callback_data: `provider_complete_${orderId}` }],
            [{ text: '🔙 К моим заказам', callback_data: 'provider_my_orders' }]
          ]
        }
      );
    }
  }

  switch (userState.state) {
    case 'awaiting_provider_city':
      if (text.length < 2) {
        await sendMessage(chatId, '❌ Название города слишком короткое. Попробуйте ещё раз.');
        return;
      }
      await supabase.from('tg_user_profile').upsert({ 
        user_id: userId, 
        city: text,
        role: 'performer'
      });
      await updateUserState(userId, 'start', {});
      await sendMessage(
        chatId,
        `✅ Отлично! Город "${text}" сохранён.\n\n📍 Изменить город можно в настройках.\n\n🔔 Теперь вы будете получать уведомления о новых заказах в вашем городе согласно вашего графика работы.`,
        getProviderMainMenuKeyboard()
      );
      return;

    case 'awaiting_city':
      if (text.length < 2) { await sendMessage(chatId, '❌ Название города слишком короткое.', { inline_keyboard: [getBackHomeRow()] }); return; }
      temp.city = text;
      await updateUserState(userId, 'awaiting_address', temp);
      await sendMessage(chatId, '📍 Уточните адрес, пожалуйста (улица, дом, квартира).', { inline_keyboard: [getBackHomeRow()] });
      return;

    case 'awaiting_address':
      if (text.length < 5) { await sendMessage(chatId, '❌ Адрес слишком короткий. Введите полный адрес.', { inline_keyboard: [getBackHomeRow()] }); return; }
      temp.address = text;
      await updateUserState(userId, 'ask_save_address', temp);
      await sendMessage(chatId, 'Отлично, адрес записан ✅. Сохранить его для будущих заказов?', getSaveAddressKeyboard());
      return;

    case 'awaiting_custom_time_text':
      temp.time_text = text;
      await updateUserState(userId, 'awaiting_bag_selection', temp);
      await sendMessage(chatId, '🛍️ Сколько и какие пакеты нужно вынести?', getBagCountKeyboard());
      return;

    case 'awaiting_custom_amount': {
      const amount = parseInt(text.replace(/\D/g, ''));
      if (!amount || amount < 100) {
        await sendMessage(chatId, '❌ Укажите корректную сумму (не меньше 100₽).', { inline_keyboard: [getBackHomeRow()] });
        return;
      }
      temp.amount = amount;
      await updateUserState(userId, 'awaiting_payment', temp);
      await sendMessage(chatId, `Сумма установлена: ${amount}₽`, getPaymentKeyboard(true));
      return;
    }

    case 'awaiting_comment_text': {
      if (!temp.order_id) {
        await sendMessage(chatId, '⚠️ Не найден активный заказ. Начните заново: /start');
        await updateUserState(userId, 'start', {});
        return;
      }
      await supabase.from('orders').update({ comment: text }).eq('id', temp.order_id);
      await updateUserState(userId, 'start', {});
      await sendMessage(chatId, '✅ Комментарий добавлен!\n\nВаш заказ принят! Курьер скоро приедет и аккуратно вынесет ваш мусор. Спасибо, что выбираете Мусоробота 🤖✨');
      return;
    }

    case 'awaiting_photo_at_door':
    case 'awaiting_photo_at_bin':
      await sendMessage(chatId, '📸 Пожалуйста, пришлите фото (не текст).');
      return;
    
    case 'awaiting_check_completion':
      await sendMessage(chatId, '📋 Пожалуйста, используйте кнопки для проверки выполнения заказа.');
      return;

    case 'awaiting_manual_days':
      temp.schedule_days = text;
      await updateUserState(userId, userState.state, temp);
      await sendMessage(
        chatId,
        'Теперь время работы:',
        {
          inline_keyboard: [
            [{ text: '⏰ С 09:00 до 18:00', callback_data: 'time_9_18' }],
            [{ text: '⏰ С 10:00 до 20:00', callback_data: 'time_10_20' }],
            [{ text: 'Указать своё', callback_data: 'time_custom_input' }],
            [{ text: '🔙 Назад', callback_data: 'schedule_custom' }]
          ]
        }
      );
      return;

    case 'awaiting_custom_time_start':
      temp.schedule_time_start = text;
      await updateUserState(userId, 'awaiting_custom_time_end', temp);
      await sendMessage(
        chatId,
        '⏰ До какого времени работаешь? (например: 18:00)',
        {
          inline_keyboard: [
            [{ text: '🔙 Назад', callback_data: 'schedule_custom' }]
          ]
        }
      );
      return;

    case 'awaiting_custom_time_end':
      temp.schedule_time = `${temp.schedule_time_start}-${text}`;
      await updateUserState(userId, userState.state, temp);
      await sendMessage(
        chatId,
        `Окей, график установлен! 🎯\n\nТы в строю: ${temp.schedule_days === 'everyday' ? 'каждый день' : temp.schedule_days === 'weekdays' ? 'пн–пт' : temp.schedule_days === 'weekend' ? 'сб–вс' : temp.schedule_days}, с ${temp.schedule_time}\n\nТеперь давай уточним уведомления.\n\n👉 Что слать тебе в рабочее время?`,
        {
          inline_keyboard: [
            [{ text: '🔔 Все новые заказы', callback_data: 'filter_all' }],
            [{ text: '⚡ Только срочные', callback_data: 'filter_urgent' }],
            [{ text: '📦 Только крупные', callback_data: 'filter_large' }],
            [{ text: '🔕 Ничего, сам буду заходить и смотреть', callback_data: 'filter_none' }],
            [{ text: '🔙 Назад', callback_data: 'schedule_custom' }]
          ]
        }
      );
      return;

    case 'awaiting_support_message': {
      const orderId = temp.support_order_id;
      
      if (!orderId || !text) {
        await sendMessage(chatId, '❌ Ошибка при отправке сообщения.');
        return;
      }

      // Получаем детали заказа
      const { data: order } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();

      if (!order) {
        await sendMessage(chatId, '❌ Заказ не найден.');
        return;
      }

      // Отправляем сообщение администратору
      const adminChatId = await getAdminChatId();
      if (adminChatId) {
        const adminMessage = `📞 <b>ОБРАЩЕНИЕ В ПОДДЕРЖКУ</b>\n\n` +
          `👤 От: ${message.from.first_name}${message.from.last_name ? ' ' + message.from.last_name : ''}` +
          `${message.from.username ? ` (@${message.from.username})` : ''}\n` +
          `📦 Заказ ID: ${orderId.slice(-8)}\n` +
          `📍 Адрес: ${order.address}\n` +
          `📅 Дата заказа: ${new Date(order.created_at).toLocaleDateString('ru-RU')}\n` +
          `⭐ Оценка: ${order.rating ? order.rating + '/5' : 'не оценен'}\n\n` +
          `💬 Сообщение:\n${text}`;

        await sendMessage(parseInt(adminChatId), adminMessage);
      }

      await updateUserState(userId, 'start', {});
      await sendMessage(chatId, '✅ Ваше сообщение отправлено в поддержку. Мы свяжемся с вами в ближайшее время.', getMainMenuKeyboard());
      return;
    }

    case 'awaiting_custom_time': // совместимость со старым сценарием
      const tempDataCustomTime = { ...temp, custom_time: text };
      await updateUserState(userId, 'awaiting_confirmation', tempDataCustomTime);
      await showOrderSummary(chatId, tempDataCustomTime);
      return;

    default:
      await sendMessage(chatId, 'Выберите действие из меню:', getMainMenuKeyboard());
      return;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method === 'GET') return new Response('ok', { headers: corsHeaders });
  try {
    console.log('telegram_webhook request received', { method: req.method });
    const update: TelegramUpdate = await req.json();
    if (update.message) {
      const message = update.message;
      if (message.text?.startsWith('/start'))        await handleStart(message);
      else if (message.text?.startsWith('/help'))   await handleHelp(message);
      else if (message.text?.startsWith('/adminid')) await handleAdminId(message);
      else if (message.text || message.photo)       await handleTextMessage(message);
    } else if (update && update.callback_query) {
      await handleCallbackQuery(update.callback_query);
    }
    return new Response('OK', { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error('Error processing update (telegram_webhook):', error);
    return new Response('Error', { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});