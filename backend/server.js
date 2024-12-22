// server.js
import cors from "cors";
import express from "express";
import multer from "multer";
import { Telegraf } from "telegraf";
import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const bot = new Telegraf(process.env.BOT_TOKEN);
const upload = multer({ dest: "uploads/" });

app.use(
  cors({
    origin: "http://localhost:3001",
  })
);

// MongoDB моделі
const specialistSchema = new mongoose.Schema({
  telegramId: String,
  name: String,
  specialization: String,
  districts: [String],
  phone: String,
  active: { type: Boolean, default: true },
});

const requestSchema = new mongoose.Schema({
  serviceType: String,
  address: String,
  description: String,
  commonProblem: String,
  phone: String,
  photo: String,
  status: { type: String, default: "new" },
  specialist: { type: mongoose.Schema.Types.ObjectId, ref: "Specialist" },
});

const Specialist = mongoose.model("Specialist", specialistSchema);
const Request = mongoose.model("Request", requestSchema);

// Состояния регистрации специалистов
const registrationStates = {};

// Обработка команд бота
bot.command("start", (ctx) => {
  ctx.reply("Добро пожаловать! Выберите действие:", {
    reply_markup: {
      keyboard: [["Зарегистрироваться как специалист"], ["Мой профиль"]],
      resize_keyboard: true,
    },
  });
});

bot.hears("Зарегистрироваться как специалист", async (ctx) => {
  const userId = ctx.from.id;

  // Проверяем, не зарегистрирован ли уже специалист
  const existingSpecialist = await Specialist.findOne({ telegramId: userId });
  if (existingSpecialist) {
    return ctx.reply("Вы уже зарегистрированы как специалист.");
  }

  registrationStates[userId] = { step: "name" };
  ctx.reply("Введите ваше ФИО:");
});

// Обработка регистрации специалиста
bot.on("text", async (ctx) => {
  const userId = ctx.from.id;
  const state = registrationStates[userId];

  console.log("state", state);

  if (!state) return;

  switch (state.step) {
    case "name":
      state.name = ctx.message.text;
      state.step = "specialization";
      ctx.reply("Выберите вашу специализацию:", {
        reply_markup: {
          keyboard: [
            ["Сантехник", "Электрик"],
            ["Слесарь", "Плотник"],
          ],
          resize_keyboard: true,
        },
      });
      break;

    case "specialization":
      state.specialization = ctx.message.text;
      state.step = "districts";
      ctx.reply("Выберите районы работы (через запятую):");
      break;

    case "districts":
      state.districts = ctx.message.text.split(",").map((d) => d.trim());
      state.step = "phone";
      ctx.reply("Введите ваш номер телефона:");
      break;

    case "phone":
      state.phone = ctx.message.text;

      // Сохраняем специалиста в базу
      const specialist = new Specialist({
        telegramId: userId,
        name: state.name,
        specialization: state.specialization,
        districts: state.districts,
        phone: state.phone,
      });

      await specialist.save();
      delete registrationStates[userId];

      ctx.reply("Регистрация успешно завершена!", {
        reply_markup: {
          keyboard: [["Мой профиль"]],
          resize_keyboard: true,
        },
      });
      break;
  }
});

// API эндпоинт для приема заявок
app.post("/api/submit-request", upload.single("photo"), async (req, res) => {
  try {
    const { serviceType, address, description, commonProblem, phone } =
      req.body;
    const photoPath = req.file ? req.file.path : null;

    // Создаем новую заявку
    const request = new Request({
      serviceType,
      address,
      description,
      commonProblem,
      phone,
      photo: photoPath,
    });

    await request.save();

    // Находим всех подходящих специалистов
    const specialists = await Specialist.find({
      specialization: serviceType,
      active: true,
    });

    // Отправляем уведомление всем подходящим специалистам
    for (const specialist of specialists) {
      const message = `
Новая заявка!
Тип услуги: ${serviceType}
Адрес: ${address}
Описание: ${description}
Типовая проблема: ${commonProblem}
      `;

      await bot.telegram.sendMessage(specialist.telegramId, message, {
        reply_markup: {
          inline_keyboard: [
            [{ text: "Принять заказ", callback_data: `accept_${request._id}` }],
          ],
        },
      });

      if (photoPath) {
        await bot.telegram.sendPhoto(specialist.telegramId, {
          source: photoPath,
        });
      }
    }

    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

// Обработка принятия заказа
bot.action(/accept_(.+)/, async (ctx) => {
  const requestId = ctx.match[1];
  const specialistId = ctx.from.id;

  try {
    const request = await Request.findById(requestId);
    if (request.status !== "new") {
      return ctx.reply("Этот заказ уже занят другим специалистом.");
    }

    const specialist = await Specialist.findOne({ telegramId: specialistId });

    request.status = "accepted";
    request.specialist = specialist._id;
    await request.save();

    // Уведомляем специалиста о успешном принятии заказа
    await ctx.reply(
      `Вы приняли заказ! Контактный телефон клиента: ${request.phone}`
    );

    // Уведомляем других специалистов
    const otherSpecialists = await Specialist.find({
      specialization: request.serviceType,
      telegramId: { $ne: specialistId },
    });

    for (const other of otherSpecialists) {
      await bot.telegram.sendMessage(
        other.telegramId,
        `Заказ по адресу ${request.address} уже занят другим специалистом.`
      );
    }
  } catch (error) {
    console.error(error);
    ctx.reply("Произошла ошибка при принятии заказа.");
  }
});

// Запуск сервера
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log("Connected to MongoDB");
    app.listen(3001, () => {
      console.log("Server is running on port 3001");
    });
    bot.launch();
  })
  .catch(console.error);
