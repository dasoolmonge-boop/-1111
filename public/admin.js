// admin.js - Логика админ-панели цветочного магазина

const tg = window.Telegram.WebApp;
tg.ready();
tg.expand();

let currentUser = tg.initDataUnsafe.user || {};
let isAdmin = false;
let currentOrdersTab = 'active';

// Проверка прав администратора
async function checkAdmin() {
    try {
        const response = await fetch('/api/check-admin', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ userId: currentUser.id })
        });

        const data = await response.json();
        isAdmin = data.isAdmin;

        if (!isAdmin) {
            showToast('У вас нет прав доступа к админ-панели', 'error');
            setTimeout(() => {
                window.location.href = '/';
            }, 2000);
        } else {
            loadBouquets();
            loadOrders();
            loadStats();
        }
    } catch (error) {
        console.error('Ошибка проверки прав:', error);
    }
}

// Переключение основных вкладок
function switchTab(tab) {
    document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.admin-section').forEach(s => s.classList.remove('active'));

    document.querySelector(`[onclick="switchTab('${tab}')"]`).classList.add('active');
    document.getElementById(`${tab}-section`).classList.add('active');

    if (tab === 'bouquets') loadBouquets();
    if (tab === 'orders') loadOrders();
    if (tab === 'stats') loadStats();
}

// Переключение вкладок заказов
function switchOrdersTab(tab) {
    currentOrdersTab = tab;

    document.querySelectorAll('.order-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.orders-tab-content').forEach(c => c.classList.remove('active'));

    document.querySelector(`[onclick="switchOrdersTab('${tab}')"]`).classList.add('active');
    document.getElementById(`${tab}-orders`).classList.add('active');

    loadOrders();
}

// Предпросмотр фото
function previewPhoto(input, previewId) {
    const preview = document.getElementById(previewId);

    if (input.files && input.files[0]) {
        const reader = new FileReader();

        reader.onload = function(e) {
            preview.src = e.target.result;
            preview.classList.add('show');
        }

        reader.readAsDataURL(input.files[0]);
    }
}

// Загрузка фото на сервер
async function uploadPhoto(file) {
    const formData = new FormData();
    formData.append('photo', file);

    try {
        const response = await fetch('/api/upload', {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        if (data.success) {
            return data.url;
        } else {
            throw new Error('Ошибка загрузки');
        }
    } catch (error) {
        console.error('Ошибка загрузки фото:', error);
        showToast('Ошибка при загрузке фото', 'error');
        return null;
    }
}

// Загрузка букетов для админа
async function loadBouquets() {
    try {
        const response = await fetch('/api/admin/bouquets');
        const bouquets = await response.json();
        renderAdminBouquets(bouquets);
    } catch (error) {
        console.error('Ошибка загрузки:', error);
        showToast('Ошибка загрузки букетов', 'error');
    }
}

// Отрисовка букетов в админке
function renderAdminBouquets(bouquets) {
    const grid = document.getElementById('adminBouquetsGrid');

    if (bouquets.length === 0) {
        grid.innerHTML = '<div class="empty-cart">Букеты не добавлены</div>';
        return;
    }

    grid.innerHTML = bouquets.map(bouquet => `
        <div class="bouquet-card admin-card ${!bouquet.available ? 'unavailable' : ''}">
            <img src="${bouquet.photo}" alt="${bouquet.name}" class="bouquet-image"
                 onerror="this.src='https://via.placeholder.com/200?text=Букет'">
            <div class="bouquet-actions">
                <button class="bouquet-action-btn edit" onclick="editBouquet(${bouquet.id})">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="bouquet-action-btn toggle" onclick="toggleBouquetAvailability(${bouquet.id})">
                    <i class="fas ${bouquet.available ? 'fa-eye' : 'fa-eye-slash'}"></i>
                </button>
                <button class="bouquet-action-btn delete" onclick="deleteBouquet(${bouquet.id})">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
            <div class="bouquet-info">
                <div class="bouquet-name">${bouquet.name}</div>
                <div class="bouquet-price">${bouquet.price} ₽</div>
                <div class="bouquet-composition">🌿 ${bouquet.composition}</div>
                <div class="bouquet-size">📏 ${bouquet.size}</div>
                <div class="bouquet-description">${bouquet.description}</div>
                <div class="bouquet-status">
                    Статус: ${bouquet.available ? '✅ Доступен' : '❌ Недоступен (заказан)'}
                </div>
            </div>
        </div>
    `).join('');
}

// Добавление нового букета
async function addBouquet(event) {
    event.preventDefault();

    const photoInput = document.getElementById('bouquetPhotoInput');

    if (!photoInput.files || !photoInput.files[0]) {
        showToast('Выберите фото букета', 'error');
        return;
    }

    const submitBtn = event.target.querySelector('.submit-btn');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Загрузка...';

    try {
        const photoUrl = await uploadPhoto(photoInput.files[0]);

        if (!photoUrl) {
            throw new Error('Ошибка загрузки фото');
        }

        const bouquetData = {
            name: document.getElementById('bouquetName').value,
            price: parseInt(document.getElementById('bouquetPrice').value),
            composition: document.getElementById('bouquetComposition').value,
            size: document.getElementById('bouquetSize').value,
            description: document.getElementById('bouquetDescription').value,
            photo: photoUrl
        };

        const response = await fetch('/api/admin/bouquets', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(bouquetData)
        });

        if (response.ok) {
            showToast('Букет успешно добавлен!', 'success');
            document.getElementById('addBouquetForm').reset();
            document.getElementById('bouquetPhotoPreview').classList.remove('show');
            loadBouquets();

            if (tg.HapticFeedback) {
                tg.HapticFeedback.notificationOccurred('success');
            }
        }
    } catch (error) {
        console.error('Ошибка добавления:', error);
        showToast('Ошибка при добавлении букета', 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-plus"></i> Добавить букет';
    }
}

// Редактирование букета
async function editBouquet(bouquetId) {
    try {
        const response = await fetch('/api/admin/bouquets');
        const bouquets = await response.json();
        const bouquet = bouquets.find(b => b.id === bouquetId);

        if (bouquet) {
            document.getElementById('editBouquetId').value = bouquet.id;
            document.getElementById('editBouquetName').value = bouquet.name;
            document.getElementById('editBouquetPrice').value = bouquet.price;
            document.getElementById('editBouquetComposition').value = bouquet.composition;
            document.getElementById('editBouquetSize').value = bouquet.size;
            document.getElementById('editBouquetDescription').value = bouquet.description;
            document.getElementById('editBouquetPhoto').value = bouquet.photo;

            const preview = document.getElementById('editBouquetPhotoPreview');
            preview.src = bouquet.photo;
            preview.classList.add('show');

            document.getElementById('editBouquetModal').classList.add('open');
        }
    } catch (error) {
        console.error('Ошибка загрузки данных букета:', error);
        showToast('Ошибка загрузки данных', 'error');
    }
}

// Сохранение изменений букета
async function saveBouquetEdit(event) {
    event.preventDefault();

    const bouquetId = document.getElementById('editBouquetId').value;
    const photoInput = document.getElementById('editBouquetPhotoInput');
    let photoUrl = document.getElementById('editBouquetPhoto').value;

    const submitBtn = event.target.querySelector('.submit-btn');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Сохранение...';

    try {
        if (photoInput.files && photoInput.files[0]) {
            const newPhotoUrl = await uploadPhoto(photoInput.files[0]);
            if (newPhotoUrl) {
                photoUrl = newPhotoUrl;
            }
        }

        const bouquetData = {
            name: document.getElementById('editBouquetName').value,
            price: parseInt(document.getElementById('editBouquetPrice').value),
            composition: document.getElementById('editBouquetComposition').value,
            size: document.getElementById('editBouquetSize').value,
            description: document.getElementById('editBouquetDescription').value,
            photo: photoUrl
        };

        const response = await fetch(`/api/admin/bouquets/${bouquetId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(bouquetData)
        });

        if (response.ok) {
            showToast('Изменения сохранены!', 'success');
            closeEditModal();
            loadBouquets();

            if (tg.HapticFeedback) {
                tg.HapticFeedback.notificationOccurred('success');
            }
        }
    } catch (error) {
        console.error('Ошибка сохранения:', error);
        showToast('Ошибка при сохранении', 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = 'Сохранить изменения';
    }
}

// Переключение доступности букета
async function toggleBouquetAvailability(bouquetId) {
    try {
        const response = await fetch('/api/admin/bouquets');
        const bouquets = await response.json();
        const bouquet = bouquets.find(b => b.id === bouquetId);

        const updateResponse = await fetch(`/api/admin/bouquets/${bouquetId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ available: !bouquet.available })
        });

        if (updateResponse.ok) {
            showToast(`Букет ${bouquet.available ? 'скрыт' : 'опубликован'}`, 'success');
            loadBouquets();
        }
    } catch (error) {
        console.error('Ошибка:', error);
        showToast('Ошибка при изменении статуса', 'error');
    }
}

// Удаление букета
async function deleteBouquet(bouquetId) {
    if (!confirm('Вы уверены, что хотите удалить этот букет?')) return;

    try {
        const response = await fetch(`/api/admin/bouquets/${bouquetId}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            showToast('Букет удален', 'success');
            loadBouquets();

            if (tg.HapticFeedback) {
                tg.HapticFeedback.notificationOccurred('success');
            }
        }
    } catch (error) {
        console.error('Ошибка удаления:', error);
        showToast('Ошибка при удалении', 'error');
    }
}

// Закрытие модального окна
function closeEditModal() {
    document.getElementById('editBouquetModal').classList.remove('open');
    document.getElementById('editBouquetForm').reset();
    document.getElementById('editBouquetPhotoPreview').classList.remove('show');
}

// Загрузка заказов
async function loadOrders() {
    try {
        const activeResponse = await fetch('/api/admin/orders/active');
        const activeOrders = await activeResponse.json();

        const historyResponse = await fetch('/api/admin/orders/history');
        const historyOrders = await historyResponse.json();

        document.getElementById('activeOrdersCount').textContent = activeOrders.length;
        document.getElementById('historyOrdersCount').textContent = historyOrders.length;

        if (currentOrdersTab === 'active') {
            renderOrders(activeOrders, 'activeOrdersList');
        } else {
            renderOrders(historyOrders, 'historyOrdersList');
        }
    } catch (error) {
        console.error('Ошибка загрузки заказов:', error);
    }
}

// Отрисовка заказов
function renderOrders(orders, containerId) {
    const container = document.getElementById(containerId);

    if (orders.length === 0) {
        container.innerHTML = '<div class="empty-cart">Нет заказов</div>';
        return;
    }

    orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    let html = '<div class="orders-grid">';

    orders.forEach(order => {
        const statusText = getStatusText(order.status);
        const statusClass = getStatusClass(order.status);

        html += `
            <div class="order-card">
                <div class="order-header">
                    <span class="order-id">#${order.id}</span>
                    <span class="status-badge ${statusClass}">${statusText}</span>
                </div>
                <div class="order-info">
                    <div><i class="fas fa-user"></i> ${order.name}</div>
                    <div><i class="fas fa-phone"></i> ${order.phone}</div>
                    <div><i class="fas fa-map-marker-alt"></i> ${order.address}</div>
                    <div><i class="fas fa-calendar"></i> ${order.deliveryDate} ${order.deliveryTime}</div>
                    <div><i class="fas fa-comment"></i> ${order.wish}</div>
                    <div class="order-bouquets">
                        ${order.cart.map(item => `
                            <div class="order-bouquet-item">
                                <span>💐 ${item.name} × ${item.quantity}</span>
                                <span>${item.price * item.quantity} ₽</span>
                            </div>
                        `).join('')}
                    </div>
                    <div class="order-total">Итого: ${order.totalPrice} ₽</div>
                    <div class="order-date">${new Date(order.createdAt).toLocaleString()}</div>
                </div>
                ${order.status === 'active' ? `
                    <div class="order-actions">
                        <button onclick="updateOrderStatus(${order.id}, 'processing')" class="action-btn processing-btn">
                            <i class="fas fa-play"></i> В обработку
                        </button>
                        <button onclick="updateOrderStatus(${order.id}, 'completed')" class="action-btn complete-btn">
                            <i class="fas fa-check"></i> Выполнен
                        </button>
                        <button onclick="updateOrderStatus(${order.id}, 'cancelled')" class="action-btn cancel-btn">
                            <i class="fas fa-times"></i> Отменить
                        </button>
                    </div>
                ` : order.status === 'processing' ? `
                    <div class="order-actions">
                        <button onclick="updateOrderStatus(${order.id}, 'completed')" class="action-btn complete-btn">
                            <i class="fas fa-check"></i> Выполнен
                        </button>
                        <button onclick="updateOrderStatus(${order.id}, 'cancelled')" class="action-btn cancel-btn">
                            <i class="fas fa-times"></i> Отменить
                        </button>
                    </div>
                ` : order.status === 'cancelled' ? `
                    <div class="order-actions">
                        <button onclick="updateOrderStatus(${order.id}, 'active')" class="action-btn restore-btn">
                            <i class="fas fa-undo"></i> Восстановить
                        </button>
                    </div>
                ` : ''}
            </div>
        `;
    });

    html += '</div>';
    container.innerHTML = html;
}

// Обновление статуса заказа
async function updateOrderStatus(orderId, status) {
    try {
        const response = await fetch(`/api/admin/orders/${orderId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status })
        });

        if (response.ok) {
            showToast(`Статус заказа обновлен`, 'success');
            loadOrders();
            loadStats();
            loadBouquets(); // Перезагружаем букеты, так как их доступность могла измениться

            if (tg.HapticFeedback) {
                tg.HapticFeedback.impactOccurred('medium');
            }
        }
    } catch (error) {
        console.error('Ошибка:', error);
        showToast('Ошибка при обновлении статуса', 'error');
    }
}

// Загрузка статистики
async function loadStats() {
    try {
        const response = await fetch('/api/admin/orders');
        const orders = await response.json();

        const activeOrders = orders.filter(o => o.status === 'active' || o.status === 'processing').length;
        const completedOrders = orders.filter(o => o.status === 'completed');
        const totalRevenue = completedOrders.reduce((sum, o) => sum + o.totalPrice, 0);
        const avgOrder = completedOrders.length ? Math.round(totalRevenue / completedOrders.length) : 0;

        // Подсчет популярных букетов
        const bouquetCount = {};
        orders.forEach(order => {
            if (order.cart) {
                order.cart.forEach(item => {
                    bouquetCount[item.name] = (bouquetCount[item.name] || 0) + item.quantity;
                });
            }
        });

        let popularBouquet = 'Нет данных';
        let maxCount = 0;
        for (const [name, count] of Object.entries(bouquetCount)) {
            if (count > maxCount) {
                maxCount = count;
                popularBouquet = name;
            }
        }

        document.getElementById('totalOrders').textContent = orders.length;
        document.getElementById('activeOrders').textContent = activeOrders;
        document.getElementById('completedOrders').textContent = completedOrders.length;
        document.getElementById('totalRevenue').textContent = `${totalRevenue} ₽`;
        document.getElementById('avgOrder').textContent = `${avgOrder} ₽`;
        document.getElementById('popularBouquet').textContent = popularBouquet;

        createOrdersChart(orders);

    } catch (error) {
        console.error('Ошибка загрузки статистики:', error);
    }
}

// Создание графика
function createOrdersChart(orders) {
    const ctx = document.getElementById('ordersChart').getContext('2d');

    const last7Days = [];
    const counts = [];

    for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toLocaleDateString('ru-RU');
        last7Days.push(dateStr);

        const count = orders.filter(o => {
            const orderDate = new Date(o.createdAt).toLocaleDateString('ru-RU');
            return orderDate === dateStr;
        }).length;

        counts.push(count);
    }

    if (window.ordersChart) {
        window.ordersChart.destroy();
    }

    window.ordersChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: last7Days,
            datasets: [{
                label: 'Заказы',
                data: counts,
                borderColor: '#50a8eb',
                backgroundColor: 'rgba(80, 168, 235, 0.1)',
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    }
                }
            }
        }
    });
}

// Вспомогательные функции
function getStatusText(status) {
    const statusMap = {
        'active': 'Активный',
        'processing': 'В обработке',
        'completed': 'Выполнен',
        'cancelled': 'Отменен'
    };
    return statusMap[status] || status;
}

function getStatusClass(status) {
    const classMap = {
        'active': 'status-active',
        'processing': 'status-processing',
        'completed': 'status-completed',
        'cancelled': 'status-cancelled'
    };
    return classMap[status] || '';
}

function showToast(message, type) {
    let toast = document.querySelector('.toast');
    if (toast) {
        toast.remove();
    }

    toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <i class="fas ${type === 'success' ? 'fa-check-circle' :
                       type === 'error' ? 'fa-exclamation-circle' :
                       'fa-info-circle'}"></i>
        <span>${message}</span>
    `;

    document.body.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.3s';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Инициализация
document.addEventListener('DOMContentLoaded', checkAdmin);