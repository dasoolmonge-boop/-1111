// Инициализация Telegram Mini App
const tg = window.Telegram.WebApp;

// Сообщаем Telegram, что приложение готово
tg.ready();

// Расширяем на весь экран
tg.expand();

// Настройка MainButton
tg.MainButton.setText('ЗАКАЗАТЬ');
tg.MainButton.setParams({
    color: '#50a8eb',
    text_color: '#ffffff'
});
tg.MainButton.hide();

// Глобальные переменные
let bouquets = [];
let user = tg.initDataUnsafe.user || {};

// Загрузка данных букетов
async function loadBouquets() {
    try {
        const response = await fetch('/api/bouquets');
        const data = await response.json();
        bouquets = data;
        renderBouquets(bouquets);
    } catch (error) {
        console.error('Ошибка загрузки букетов:', error);
        showToast('Ошибка загрузки букетов', 'error');

        const grid = document.getElementById('bouquetsGrid');
        grid.innerHTML = `
            <div class="empty-cart">
                <i class="fas fa-exclamation-circle" style="font-size: 48px; opacity: 0.3;"></i>
                <p style="margin-top: 16px;">Не удалось загрузить букеты</p>
                <button class="category" onclick="loadBouquets()" style="margin-top: 16px;">Повторить</button>
            </div>
        `;
    }
}

// Отрисовка букетов
function renderBouquets(bouquetsArray) {
    const grid = document.getElementById('bouquetsGrid');
    grid.innerHTML = '';

    if (bouquetsArray.length === 0) {
        grid.innerHTML = `
            <div class="empty-cart" style="grid-column: 1/-1;">
                <i class="fas fa-heart" style="font-size: 48px; opacity: 0.3;"></i>
                <p style="margin-top: 16px;">Скоро появятся новые букеты!</p>
            </div>
        `;
        return;
    }

    bouquetsArray.forEach(bouquet => {
        const card = document.createElement('div');
        card.className = 'bouquet-card';
        card.innerHTML = `
            <img src="${bouquet.photo}" alt="${bouquet.name}" class="bouquet-image"
                 onerror="this.src='https://via.placeholder.com/200?text=Букет'">
            <div class="bouquet-info">
                <div class="bouquet-name">${bouquet.name}</div>
                <div class="bouquet-composition">🌿 ${bouquet.composition}</div>
                <div class="bouquet-size">📏 ${bouquet.size}</div>
                <div class="bouquet-description">
                    ${bouquet.description}
                </div>
                <div class="bouquet-price-row">
                    <span class="bouquet-price">${bouquet.price} ₽</span>
                    <button class="add-to-cart" data-id="${bouquet.id}">
                        <i class="fas fa-plus"></i>
                    </button>
                </div>
            </div>
        `;

        grid.appendChild(card);
    });

    // Добавляем обработчики для кнопок "Добавить в корзину"
    document.querySelectorAll('.add-to-cart').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const bouquetId = parseInt(btn.dataset.id);
            const bouquet = bouquets.find(b => b.id === bouquetId);
            if (bouquet) {
                cart.addItem(bouquet);
                animateButton(btn);
            }
        });
    });
}

// Анимация кнопки при добавлении
function animateButton(btn) {
    btn.classList.add('added');
    btn.innerHTML = '<i class="fas fa-check"></i>';
    setTimeout(() => {
        btn.classList.remove('added');
        btn.innerHTML = '<i class="fas fa-plus"></i>';
    }, 1000);
}

// Показать уведомление
function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <i class="fas ${type === 'success' ? 'fa-check-circle' :
                       type === 'error' ? 'fa-exclamation-circle' :
                       'fa-info-circle'}"></i>
        <span>${message}</span>
    `;

    container.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'slideUp 0.3s reverse';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Фильтрация букетов по категориям
function filterBouquets(category) {
    if (category === 'all') {
        renderBouquets(bouquets);
    } else if (category === 'roses') {
        const roses = bouquets.filter(b => b.composition.toLowerCase().includes('роз'));
        renderBouquets(roses.length ? roses : []);
    } else if (category === 'popular') {
        const popular = bouquets.slice(0, 2);
        renderBouquets(popular);
    } else if (category === 'new') {
        const newBouquets = bouquets.slice(-2);
        renderBouquets(newBouquets);
    }
}

// Проверка прав администратора
async function checkAdmin() {
    try {
        const response = await fetch('/api/check-admin', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ userId: user.id })
        });

        const data = await response.json();

        if (data.isAdmin) {
            const header = document.querySelector('.header-content');
            const adminBtn = document.createElement('a');
            adminBtn.href = '/admin';
            adminBtn.innerHTML = '<i class="fas fa-crown" style="color: gold; margin-right: 10px;"></i>';
            adminBtn.style.marginLeft = '10px';
            adminBtn.title = 'Панель администратора';
            header.appendChild(adminBtn);
        }
    } catch (error) {
        console.error('Ошибка проверки прав:', error);
    }
}

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', () => {
    loadBouquets();
    checkAdmin();

    // Обработка категорий
    document.querySelectorAll('.category').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.category').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const category = btn.dataset.category;
            filterBouquets(category);
        });
    });

    // Тактильная обратная связь
    if (tg.HapticFeedback) {
        document.querySelectorAll('button').forEach(btn => {
            btn.addEventListener('click', () => {
                tg.HapticFeedback.impactOccurred('light');
            });
        });
    }
});