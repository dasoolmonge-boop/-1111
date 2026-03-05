// app.js - Сервер для мини-приложения цветочного магазина
const http = require('http');
const fs = require('fs');
const path = require('path');
const https = require('https');
const url = require('url');

const PORT = process.env.PORT || 3000;
const ADMIN_ID = 1066867845; // ID администратора в Telegram
const BOT_TOKEN = "8711495102:AAF1PsPMkhLKt6HeyEsi9kwLjdnkUOd3k0I"; // Новый токен для цветочного магазина

// MIME типы для статических файлов
const mimeTypes = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'text/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon'
};

// Файл для хранения данных
const DB_FILE = path.join(__dirname, 'db.json');
// Папка для загруженных изображений
const UPLOAD_DIR = path.join(__dirname, 'public', 'uploads');

// Создаем папку для загрузок, если её нет
if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Инициализация базы данных
function initDB() {
    if (!fs.existsSync(DB_FILE)) {
        const initialData = {
            bouquets: [
                {
                    id: 1,
                    name: 'Нежность',
                    price: 3500,
                    description: 'Нежные розовые пионы с эвкалиптом',
                    photo: 'https://images.unsplash.com/photo-1582794543139-8ac9cb0f7b11?w=400',
                    available: true,
                    composition: 'Пионы, эвкалипт, гипсофила',
                    size: 'Средний (40 см)'
                },
                {
                    id: 2,
                    name: 'Красный вечер',
                    price: 4200,
                    description: 'Страстные красные розы в элегантной упаковке',
                    photo: 'https://images.unsplash.com/photo-1548092372-0d1bd40894a3?w=400',
                    available: true,
                    composition: 'Розы красные (15 шт), флористическая сетка',
                    size: 'Большой (50 см)'
                },
                {
                    id: 3,
                    name: 'Солнечное настроение',
                    price: 2800,
                    description: 'Яркие подсолнухи и герберы',
                    photo: 'https://images.unsplash.com/photo-1535468850893-d6a71e1c2e4c?w=400',
                    available: true,
                    composition: 'Подсолнухи, герберы, зелень',
                    size: 'Средний (35 см)'
                },
                {
                    id: 4,
                    name: 'Лавандовый рай',
                    price: 3900,
                    description: 'Нежная лаванда в композиции с розами',
                    photo: 'https://images.unsplash.com/photo-1468327768560-75b778c92b9c?w=400',
                    available: true,
                    composition: 'Лаванда, розы кустовые, эвкалипт',
                    size: 'Средний (40 см)'
                }
            ],
            orders: [],
            nextBouquetId: 5,
            nextOrderId: 1
        };
        fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2));
    }
}

// Чтение данных из БД
function readDB() {
    try {
        const data = fs.readFileSync(DB_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Ошибка чтения БД:', error);
        return { bouquets: [], orders: [], nextBouquetId: 1, nextOrderId: 1 };
    }
}

// Запись данных в БД
function writeDB(data) {
    try {
        fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
        return true;
    } catch (error) {
        console.error('Ошибка записи БД:', error);
        return false;
    }
}

// Инициализируем БД при старте
initDB();

const server = http.createServer((req, res) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }
    
    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;
    
    // ============================================
    // API ДЛЯ ЗАГРУЗКИ ФОТО
    // ============================================
    
    if (pathname === '/api/upload' && req.method === 'POST') {
        const boundary = req.headers['content-type'].split('boundary=')[1];
        let body = [];
        
        req.on('data', chunk => {
            body.push(chunk);
        }).on('end', () => {
            try {
                const buffer = Buffer.concat(body);
                
                // Ищем имя файла
                const text = buffer.toString('binary');
                const filenameMatch = text.match(/filename="(.+?)"/);
                const filename = filenameMatch ? filenameMatch[1] : `photo_${Date.now()}.jpg`;
                
                // Ищем содержимое файла
                const fileDataStart = buffer.indexOf('\r\n\r\n') + 4;
                const fileDataEnd = buffer.lastIndexOf('\r\n--' + boundary);
                
                if (fileDataStart !== -1 && fileDataEnd !== -1) {
                    const fileData = buffer.slice(fileDataStart, fileDataEnd);
                    
                    // Генерируем уникальное имя файла
                    const ext = path.extname(filename) || '.jpg';
                    const newFilename = `flower_${Date.now()}${ext}`;
                    const filePath = path.join(UPLOAD_DIR, newFilename);
                    
                    // Сохраняем файл
                    fs.writeFileSync(filePath, fileData);
                    
                    const fileUrl = `/uploads/${newFilename}`;
                    
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ 
                        success: true, 
                        url: fileUrl,
                        filename: newFilename 
                    }));
                } else {
                    throw new Error('Не удалось извлечь данные файла');
                }
            } catch (error) {
                console.error('Ошибка загрузки файла:', error);
                res.writeHead(500);
                res.end(JSON.stringify({ error: 'Ошибка загрузки файла' }));
            }
        });
        return;
    }
    
    // ============================================
    // API ДЛЯ БУКЕТОВ
    // ============================================
    
    // Получить все доступные букеты (для клиентов)
    if (pathname === '/api/bouquets' && req.method === 'GET') {
        const db = readDB();
        const availableBouquets = db.bouquets.filter(b => b.available);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(availableBouquets));
        return;
    }
    
    // Получить все букеты (для админа)
    if (pathname === '/api/admin/bouquets' && req.method === 'GET') {
        const db = readDB();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(db.bouquets));
        return;
    }
    
    // Получить конкретный букет
    if (pathname.startsWith('/api/bouquets/') && req.method === 'GET') {
        const bouquetId = parseInt(pathname.split('/').pop());
        const db = readDB();
        const bouquet = db.bouquets.find(b => b.id === bouquetId);
        
        if (bouquet) {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(bouquet));
        } else {
            res.writeHead(404);
            res.end(JSON.stringify({ error: 'Букет не найден' }));
        }
        return;
    }
    
    // Добавить новый букет (админ)
    if (pathname === '/api/admin/bouquets' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                const bouquetData = JSON.parse(body);
                const db = readDB();
                
                const newBouquet = {
                    id: db.nextBouquetId++,
                    ...bouquetData,
                    available: true
                };
                
                db.bouquets.push(newBouquet);
                
                if (writeDB(db)) {
                    res.writeHead(201, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify(newBouquet));
                } else {
                    throw new Error('Ошибка сохранения');
                }
            } catch (error) {
                res.writeHead(500);
                res.end(JSON.stringify({ error: 'Ошибка сервера' }));
            }
        });
        return;
    }
    
    // Обновить букет (админ)
    if (pathname.startsWith('/api/admin/bouquets/') && req.method === 'PUT') {
        const bouquetId = parseInt(pathname.split('/').pop());
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                const updates = JSON.parse(body);
                const db = readDB();
                
                const bouquetIndex = db.bouquets.findIndex(b => b.id === bouquetId);
                if (bouquetIndex === -1) {
                    res.writeHead(404);
                    res.end(JSON.stringify({ error: 'Букет не найден' }));
                    return;
                }
                
                db.bouquets[bouquetIndex] = { ...db.bouquets[bouquetIndex], ...updates };
                
                if (writeDB(db)) {
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify(db.bouquets[bouquetIndex]));
                } else {
                    throw new Error('Ошибка сохранения');
                }
            } catch (error) {
                res.writeHead(500);
                res.end(JSON.stringify({ error: 'Ошибка сервера' }));
            }
        });
        return;
    }
    
    // Удалить букет (админ)
    if (pathname.startsWith('/api/admin/bouquets/') && req.method === 'DELETE') {
        const bouquetId = parseInt(pathname.split('/').pop());
        const db = readDB();
        
        // Удаляем фото букета
        const bouquet = db.bouquets.find(b => b.id === bouquetId);
        if (bouquet && bouquet.photo && bouquet.photo.startsWith('/uploads/')) {
            const photoPath = path.join(__dirname, 'public', bouquet.photo);
            if (fs.existsSync(photoPath)) {
                fs.unlinkSync(photoPath);
            }
        }
        
        db.bouquets = db.bouquets.filter(b => b.id !== bouquetId);
        
        if (writeDB(db)) {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true }));
        } else {
            res.writeHead(500);
            res.end(JSON.stringify({ error: 'Ошибка сохранения' }));
        }
        return;
    }
    
    // Скрыть букет (сделать недоступным) - используется при заказе
    if (pathname.startsWith('/api/bouquets/') && pathname.endsWith('/hide') && req.method === 'POST') {
        const bouquetId = parseInt(pathname.split('/')[3]);
        const db = readDB();
        
        const bouquetIndex = db.bouquets.findIndex(b => b.id === bouquetId);
        if (bouquetIndex === -1) {
            res.writeHead(404);
            res.end(JSON.stringify({ error: 'Букет не найден' }));
            return;
        }
        
        db.bouquets[bouquetIndex].available = false;
        
        if (writeDB(db)) {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true }));
        } else {
            res.writeHead(500);
            res.end(JSON.stringify({ error: 'Ошибка сохранения' }));
        }
        return;
    }
    
    // ============================================
    // API ДЛЯ ЗАКАЗОВ
    // ============================================
    
    // Создать заказ
    if (pathname === '/api/orders' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                const orderData = JSON.parse(body);
                const db = readDB();
                
                // Помечаем каждый букет в заказе как недоступный
                if (orderData.cart && orderData.cart.length > 0) {
                    orderData.cart.forEach(item => {
                        const bouquetIndex = db.bouquets.findIndex(b => b.id === item.id);
                        if (bouquetIndex !== -1) {
                            db.bouquets[bouquetIndex].available = false;
                        }
                    });
                }
                
                const newOrder = {
                    id: db.nextOrderId++,
                    ...orderData,
                    status: 'active',
                    createdAt: new Date().toISOString()
                };
                
                db.orders.push(newOrder);
                
                if (writeDB(db)) {
                    // Отправляем уведомление админу в Telegram
                    sendOrderToAdmin(newOrder);
                    
                    res.writeHead(201, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ 
                        success: true, 
                        orderId: newOrder.id,
                        message: 'Букеты скрыты из каталога'
                    }));
                } else {
                    throw new Error('Ошибка сохранения');
                }
            } catch (error) {
                res.writeHead(500);
                res.end(JSON.stringify({ error: 'Ошибка сервера' }));
            }
        });
        return;
    }
    
    // Получить все заказы (админ)
    if (pathname === '/api/admin/orders' && req.method === 'GET') {
        const db = readDB();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(db.orders));
        return;
    }
    
    // Получить активные заказы (админ)
    if (pathname === '/api/admin/orders/active' && req.method === 'GET') {
        const db = readDB();
        const activeOrders = db.orders.filter(o => o.status === 'active' || o.status === 'processing');
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(activeOrders));
        return;
    }
    
    // Получить историю заказов (админ)
    if (pathname === '/api/admin/orders/history' && req.method === 'GET') {
        const db = readDB();
        const historyOrders = db.orders.filter(o => o.status === 'completed' || o.status === 'cancelled');
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(historyOrders));
        return;
    }
    
    // Обновить статус заказа (админ)
    if (pathname.startsWith('/api/admin/orders/') && req.method === 'PUT') {
        const orderId = parseInt(pathname.split('/').pop());
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                const updates = JSON.parse(body);
                const db = readDB();
                
                const orderIndex = db.orders.findIndex(o => o.id === orderId);
                if (orderIndex === -1) {
                    res.writeHead(404);
                    res.end(JSON.stringify({ error: 'Заказ не найден' }));
                    return;
                }
                
                // Если заказ отменяют, возвращаем букеты в доступные
                if (updates.status === 'cancelled') {
                    const order = db.orders[orderIndex];
                    if (order.cart) {
                        order.cart.forEach(item => {
                            const bouquetIndex = db.bouquets.findIndex(b => b.id === item.id);
                            if (bouquetIndex !== -1) {
                                db.bouquets[bouquetIndex].available = true;
                            }
                        });
                    }
                }
                
                db.orders[orderIndex] = { ...db.orders[orderIndex], ...updates };
                
                if (writeDB(db)) {
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify(db.orders[orderIndex]));
                } else {
                    throw new Error('Ошибка сохранения');
                }
            } catch (error) {
                res.writeHead(500);
                res.end(JSON.stringify({ error: 'Ошибка сервера' }));
            }
        });
        return;
    }
    
    // Восстановить букет (сделать доступным)
    if (pathname.startsWith('/api/bouquets/') && pathname.endsWith('/restore') && req.method === 'POST') {
        const bouquetId = parseInt(pathname.split('/')[3]);
        const db = readDB();
        
        const bouquetIndex = db.bouquets.findIndex(b => b.id === bouquetId);
        if (bouquetIndex === -1) {
            res.writeHead(404);
            res.end(JSON.stringify({ error: 'Букет не найден' }));
            return;
        }
        
        db.bouquets[bouquetIndex].available = true;
        
        if (writeDB(db)) {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true }));
        } else {
            res.writeHead(500);
            res.end(JSON.stringify({ error: 'Ошибка сохранения' }));
        }
        return;
    }
    
    // Проверка прав администратора
    if (pathname === '/api/check-admin' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                const { userId } = JSON.parse(body);
                const isAdminUser = userId === ADMIN_ID;
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ isAdmin: isAdminUser }));
            } catch (error) {
                res.writeHead(400);
                res.end(JSON.stringify({ error: 'Invalid JSON' }));
            }
        });
        return;
    }
    
    // ============================================
    // РАЗДАЧА СТАТИЧЕСКИХ ФАЙЛОВ
    // ============================================
    
    // Определяем, какой файл отдавать
    let filePath;
    if (pathname === '/') {
        filePath = path.join(__dirname, 'public', 'index.html');
    } else if (pathname === '/admin') {
        filePath = path.join(__dirname, 'public', 'admin.html');
    } else {
        filePath = path.join(__dirname, 'public', pathname);
    }
    
    const extname = path.extname(filePath);
    const contentType = mimeTypes[extname] || 'text/plain';
    
    fs.readFile(filePath, (error, content) => {
        if (error) {
            if (error.code === 'ENOENT') {
                // Если файл не найден, отдаем index.html
                fs.readFile(path.join(__dirname, 'public', 'index.html'), (err, content) => {
                    if (err) {
                        res.writeHead(404);
                        res.end('Файл не найден');
                    } else {
                        res.writeHead(200, { 'Content-Type': 'text/html' });
                        res.end(content, 'utf-8');
                    }
                });
            } else {
                res.writeHead(500);
                res.end(`Ошибка сервера: ${error.code}`);
            }
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content, 'utf-8');
        }
    });
});

// Функция отправки уведомления админу
function sendOrderToAdmin(orderData) {
    const { name, phone, address, deliveryDate, deliveryTime, wish, cart, totalPrice, userId, username } = orderData;
    
    const bouquetsList = cart.map(item =>
        `💐 ${item.name} - ${item.price} ₽`
    ).join('\n');
    
    // Определяем домен для ссылки - ИСПРАВЛЕНО НА flowerdelivery
    const protocol = 'https';
    const host = 'flowerdelivery.bothost.ru'; // Новый домен для цветочного магазина
    const adminLink = `${protocol}://${host}/admin`;
    const shopLink = `${protocol}://${host}`;
    
    const message = 
        `📩 **НОВЫЙ ЗАКАЗ ЦВЕТОВ**\n\n` +
        `💐 **Букеты:**\n${bouquetsList}\n` +
        `💰 **Итого:** ${totalPrice} ₽\n\n` +
        `👤 **Имя:** ${name}\n` +
        `🆔 **Username:** ${username ? '@' + username : 'нет'}\n` +
        `📱 **Телефон:** ${phone}\n` +
        `📍 **Адрес:** ${address}\n` +
        `📅 **Дата доставки:** ${deliveryDate}\n` +
        `⏰ **Время доставки:** ${deliveryTime}\n` +
        `📝 **Пожелания:** ${wish || 'Без пожеланий'}\n` +
        `🆔 **User ID:** ${userId}\n` +
        `📅 **Дата заказа:** ${new Date().toLocaleString('ru-RU')}\n\n` +
        `👑 **Управление заказами:** ${adminLink}\n` +
        `🏪 **Магазин:** ${shopLink}`;
    
    const postData = JSON.stringify({
        chat_id: ADMIN_ID,
        text: message,
        parse_mode: 'Markdown'
    });
    
    const options = {
        hostname: 'api.telegram.org',
        path: `/bot${BOT_TOKEN}/sendMessage`,
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData)
        }
    };
    
    const req = https.request(options, (apiRes) => {
        let data = '';
        apiRes.on('data', chunk => data += chunk);
        apiRes.on('end', () => {
            console.log('✅ Уведомление админу отправлено');
            console.log(`📱 Ссылка на магазин: ${shopLink}`);
            console.log(`👑 Ссылка на админку: ${adminLink}`);
        });
    });
    
    req.on('error', (error) => {
        console.error('❌ Ошибка отправки уведомления:', error);
    });
    
    req.write(postData);
    req.end();
}

server.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Flower Mini App сервер запущен на порту ${PORT}`);
    console.log(`📱 Главная страница: http://localhost:${PORT}`);
    console.log(`👑 Админ-панель: http://localhost:${PORT}/admin`);
    console.log(`💾 Данные сохраняются в: ${DB_FILE}`);
    console.log(`📸 Загрузки сохраняются в: ${UPLOAD_DIR}`);
    console.log(`🔑 Токен бота: ${BOT_TOKEN.substring(0, 10)}...`);
    console.log(`🌐 Домен: flowerdelivery.bothost.ru`);
});
