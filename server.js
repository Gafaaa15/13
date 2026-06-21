const express = require('express');
const fs = require('fs').promises; // Используем промисы для асинхронной работы с файлами
const path = require('path');

const app = express();
const PORT = 3000;
const LOG_FILE = 'errors.log';

// Middleware для парсинга JSON тела запроса
app.use(express.json());

// ==================== ЗАДАНИЕ 1: Базовая обработка ошибки ====================
app.get('/error', (req, res) => {
    try {
        throw new Error('Тестовое исключение');
    } catch (err) {
        console.error('Ошибка в /error:', err.message);
        res.status(500).send('Internal Server Error');
    }
});

// ==================== ЗАДАНИЕ 2: Обработка неверного JSON ====================
app.post('/parse-json', (req, res) => {
    try {
        // Предполагаем, что тело запроса - это строка JSON
        const jsonData = JSON.stringify(req.body); // На самом деле body уже распарсен, но для примера
        const parsed = JSON.parse(jsonData); // Имитация парсинга
        res.json({ success: true, data: parsed });
    } catch (err) {
        res.status(400).json({ error: 'Bad Request', message: err.message });
    }
});

// ==================== ЗАДАНИЕ 3: Проверка входных данных ====================
app.get('/user', (req, res) => {
    try {
        const { name } = req.query;
        if (!name) {
            throw new Error('Имя обязательно');
        }
        res.json({ message: `Привет, ${name}!` });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// ==================== ЗАДАНИЕ 4: Асинхронная операция ====================
app.get('/fetch', async (req, res) => {
    try {
        const response = await fetch('https://jsonplaceholder.typicode.com/posts/1');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        res.json(data);
    } catch (err) {
        console.error('Ошибка при запросе к API:', err.message);
        res.status(503).send('Service Unavailable');
    }
});

// ==================== ЗАДАНИЕ 5: Централизованный обработчик ====================
// Маршрут для тестирования
app.get('/trigger-error', (req, res) => {
    throw new Error('Ошибка для централизованного обработчика');
});

// Централизованный middleware для обработки ошибок
app.use((err, req, res, next) => {
    console.error('Централизованный обработчик:', err.stack);
    res.status(500).send('Что-то пошло не так!');
});

// ==================== ЗАДАНИЕ 6: Логирование ошибок в файл ====================
const logErrorToFile = async (errorMessage) => {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] Ошибка: ${errorMessage}\n`;
    
    try {
        await fs.appendFile(LOG_FILE, logEntry);
        console.log('Ошибка записана в лог-файл');
    } catch (logErr) {
        console.error('Не удалось записать ошибку в файл:', logErr.message);
    }
};

app.get('/log-error', async (req, res) => {
    try {
        throw new Error('Тестовая ошибка для логирования');
    } catch (err) {
        await logErrorToFile(err.message);
        res.status(500).send('Ошибка залогирована');
    }
});

// ==================== ЗАДАНИЕ 7: Обработка разных типов ошибок ====================
app.get('/divide', (req, res) => {
    try {
        const { a, b } = req.query;
        const numA = parseFloat(a);
        const numB = parseFloat(b);
        
        if (isNaN(numA) || isNaN(numB)) {
            throw new Error('Неверные параметры');
        }
        if (numB === 0) {
            throw new Error('Деление на ноль');
        }
        
        const result = numA / numB;
        res.json({ result });
    } catch (err) {
        if (err.message === 'Деление на ноль') {
            res.status(400).json({ error: 'Нельзя делить на ноль' });
        } else if (err.message === 'Неверные параметры') {
            res.status(400).json({ error: 'Параметры a и b должны быть числами' });
        } else {
            res.status(500).json({ error: 'Внутренняя ошибка сервера' });
        }
    }
});

// ==================== ЗАДАНИЕ 8: Проброс ошибки в next() ====================
app.get('/data', (req, res, next) => {
    try {
        throw new Error('Ошибка в /data, которая будет передана в централизованный обработчик');
    } catch (err) {
        next(err); // Передаём ошибку в централизованный обработчик
    }
});

// ==================== ЗАДАНИЕ 9: Работа с файловой системой ====================
app.get('/read-file', async (req, res) => {
    try {
        const filePath = path.join(__dirname, 'data.txt');
        const fileContent = await fs.readFile(filePath, 'utf8');
        res.send(fileContent);
    } catch (err) {
        if (err.code === 'ENOENT') {
            res.status(404).send('Файл не найден');
        } else {
            res.status(500).send('Ошибка при чтении файла');
        }
    }
});

// ==================== ЗАДАНИЕ 10: Комбинированная обработка ====================
app.post('/process', async (req, res) => {
    try {
        // 1. Парсим JSON (хотя express.json() уже сделал это)
        const data = req.body;
        
        // 2. Проверяем наличие email
        if (!data.email) {
            throw new Error('Поле email обязательно');
        }
        
        // 3. Сохраняем данные в файл
        const filePath = path.join(__dirname, 'user-data.json');
        await fs.writeFile(filePath, JSON.stringify(data, null, 2));
        
        res.json({ success: true, message: 'Данные сохранены' });
    } catch (err) {
        // Логируем ошибку
        console.error('Ошибка в /process:', err.message);
        
        // Отправляем ответ с соответствующим статусом
        res.status(422).json({ 
            error: 'Unprocessable Entity', 
            message: err.message 
        });
    }
});

// ==================== Запуск сервера ====================
app.listen(PORT, () => {
    console.log(`Сервер запущен на http://localhost:${PORT}`);
});