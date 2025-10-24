// 诺亚传说BOSS刷新时间计算器
class BossRefreshApp {
    constructor() {
        this.BOSS_REFRESH_INTERVAL = 4 * 60 + 35; // 4小时35分钟，转换为分钟
        this.DAILY_REFRESH_COUNT = 4; // 每天刷新4次
        this.reminderEnabled = false;
        this.reminderInterval = null;
        this.timelineInterval = null;
        this.notifications = [];
        this.initializeData();
        this.loadFromStorage();
        this.initializeUI();
        this.requestNotificationPermission();
    }

    // 初始化默认数据
    initializeData() {
        this.defaultServers = [
            '皓月峡谷', '极北天穹', '烈日血原', '曙光', '太阳城', '星际之门', '银河帝国'
        ];
        
        this.defaultBossLevels = [50, 52, 56, 59, 60, 64];
        
        // 数据结构: servers[serverName][bossLevel] = { date: [time1, time2, time3, time4] }
        // 存储计算出的刷新时间，按日期保存
        this.servers = {};
        
        // BOSS点位图存储: bossImages[bossLevel] = base64ImageData
        // 每个等级的BOSS在所有服务器都使用相同的点位图
        this.bossImages = {};
        
        this.defaultServers.forEach(server => {
            this.servers[server] = {};
            this.defaultBossLevels.forEach(level => {
                this.servers[server][level] = {};
            });
        });
    }

    // 从本地存储加载数据
    loadFromStorage() {
        const savedData = localStorage.getItem('nykd-boss-data');
        if (savedData) {
            try {
                const data = JSON.parse(savedData);
                this.servers = { ...this.servers, ...data.servers };
                this.bossImages = data.bossImages || {};
                this.reminderEnabled = data.reminderEnabled || false;
                
                // 如果之前开启了提醒功能，重新启动
                if (this.reminderEnabled) {
                    setTimeout(() => {
                        this.startReminderService();
                        this.updateReminderStatus();
                    }, 1000);
                }
            } catch (e) {
                console.error('加载本地数据失败:', e);
            }
        }
    }

    // 保存数据到本地存储
    saveToStorage() {
        const data = {
            servers: this.servers,
            bossImages: this.bossImages,
            reminderEnabled: this.reminderEnabled,
            lastUpdate: new Date().toISOString()
        };
        localStorage.setItem('nykd-boss-data', JSON.stringify(data));
    }

    // 初始化用户界面
    initializeUI() {
        this.populateServerSelect();
        this.setCurrentTime();
        this.setCurrentDate();
    }

    // 填充服务器选择下拉框
    populateServerSelect() {
        const serverSelect = document.getElementById('server');
        
        // 清空现有选项
        serverSelect.innerHTML = '<option value="">请选择服务器</option>';
        
        // 添加服务器选项
        Object.keys(this.servers).forEach(server => {
            const option = document.createElement('option');
            option.value = server;
            option.textContent = server;
            serverSelect.appendChild(option);
        });
    }

    // 删除不再需要的方法
    // 以下方法已移除：
    // - populateNewBossServerSelect（不再需要为新BOSS选择服务器）

    // 设置当前时间
    setCurrentTime() {
        const now = new Date();
        document.getElementById('currentHour').value = now.getHours();
        document.getElementById('currentMinute').value = now.getMinutes();
    }

    // 设置当前日期
    setCurrentDate() {
        const today = this.getTodayString();
        document.getElementById('selectedDate').value = today;
    }

    // 计算当天所有BOSS刷新时间
    calculateDailyBossRefreshTimes(serverName, bossLevel, selectedDate, currentHour, currentMinute, remainingMinutes, refreshCount) {
        const now = new Date();
        now.setHours(currentHour, currentMinute, 0, 0);
        
        // 计算下次刷新时间
        const nextRefresh = new Date(now.getTime() + remainingMinutes * 60000);
        
        // 计算当天所有4次刷新时间
        const refreshTimes = [];
        
        // 根据下次是第几次刷新，反推第一次刷新时间
        const firstRefreshTime = new Date(nextRefresh.getTime() - (refreshCount - 1) * this.BOSS_REFRESH_INTERVAL * 60000);
        
        // 计算当天4次刷新时间
        for (let i = 0; i < this.DAILY_REFRESH_COUNT; i++) {
            const refreshTime = new Date(firstRefreshTime.getTime() + i * this.BOSS_REFRESH_INTERVAL * 60000);
            refreshTimes.push({
                time: this.formatTime(refreshTime),
                date: this.formatDate(refreshTime),
                refreshNumber: i + 1,
                isNext: i + 1 === refreshCount
            });
        }
        
        // 确定保存数据的日期 - 使用第一次刷新的日期作为基准
        const baseDate = this.formatDate(firstRefreshTime);
        
        // 保存到本地存储 - 按第一次刷新的日期保存
        if (!this.servers[serverName][bossLevel][baseDate]) {
            this.servers[serverName][bossLevel][baseDate] = [];
        }
        this.servers[serverName][bossLevel][baseDate] = refreshTimes.map(item => item.time);
        this.saveToStorage();
        
        return {
            nextRefresh: this.formatTime(nextRefresh),
            nextRefreshDate: this.formatDate(nextRefresh),
            nextRefreshNumber: refreshCount,
            baseDate: baseDate, // 添加基准日期信息
            allRefreshTimes: refreshTimes
        };
    }

    // 获取服务器BOSS的刷新时间记录
    getServerBossRefreshTimes(serverName) {
        if (!this.servers[serverName]) {
            return {};
        }
        return this.servers[serverName];
    }

    // 格式化时间显示
    formatTime(date) {
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        return `${hours}:${minutes}`;
    }

    // 添加新服务器
    addServer(serverName) {
        if (!serverName || this.servers[serverName]) {
            return false;
        }
        
        this.servers[serverName] = {};
        this.defaultBossLevels.forEach(level => {
            this.servers[serverName][level] = {};
        });
        
        this.saveToStorage();
        this.populateServerSelect();
        return true;
    }

    // 添加新BOSS（所有服务器都添加）
    addBossToAllServers(bossLevel, imageData = null) {
        if (!bossLevel || bossLevel < 1 || bossLevel > 100) {
            return false;
        }
        
        let added = false;
        Object.keys(this.servers).forEach(serverName => {
            if (!this.servers[serverName][bossLevel]) {
                this.servers[serverName][bossLevel] = {};
                added = true;
            }
        });
        
        // 如果提供了图片数据，保存点位图
        if (imageData && added) {
            this.bossImages[bossLevel] = imageData;
        }
        
        if (added) {
            this.saveToStorage();
            return true;
        }
        
        return false; // 所有服务器都已经有这个等级的BOSS
    }

    // 更新BOSS点位图
    updateBossImage(bossLevel, imageData) {
        if (bossLevel && imageData) {
            this.bossImages[bossLevel] = imageData;
            this.saveToStorage();
            return true;
        }
        return false;
    }

    // 获取BOSS点位图
    getBossImage(bossLevel) {
        return this.bossImages[bossLevel] || null;
    }

    // 删除BOSS点位图
    deleteBossImage(bossLevel) {
        if (this.bossImages[bossLevel]) {
            delete this.bossImages[bossLevel];
            this.saveToStorage();
            return true;
        }
        return false;
    }

    // 格式化日期
    formatDate(date) {
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    // 获取今天的日期字符串
    getTodayString() {
        return this.formatDate(new Date());
    }

    // 请求通知权限
    requestNotificationPermission() {
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }
    }

    // 发送通知
    sendNotification(title, body, icon = null) {
        if ('Notification' in window && Notification.permission === 'granted') {
            const notification = new Notification(title, {
                body: body,
                icon: icon || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHZpZXdCb3g9IjAgMCA2NCA2NCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjY0IiBoZWlnaHQ9IjY0IiByeD0iOCIgZmlsbD0iIzFhMWExYSIvPgo8cGF0aCBkPSJNMzIgMTZMMzggMjhIMjZMMzIgMTZaIiBmaWxsPSIjMDBmZjg4Ii8+CjxwYXRoIGQ9Ik0zMiA0OEwyNiAzNkgzOEwzMiA0OFoiIGZpbGw9IiMwMGZmODgiLz4KPC9zdmc+',
                tag: 'boss-reminder',
                requireInteraction: true
            });
            
            // 5秒后自动关闭通知
            setTimeout(() => {
                notification.close();
            }, 5000);
            
            return notification;
        }
        return null;
    }

    // 获取所有服务器的BOSS刷新时间
    getAllBossRefreshTimes(selectedDate) {
        const allEvents = [];
        
        Object.keys(this.servers).forEach(serverName => {
            Object.keys(this.servers[serverName]).forEach(bossLevel => {
                const bossData = this.servers[serverName][bossLevel];
                if (bossData[selectedDate]) {
                    bossData[selectedDate].forEach((timeStr, index) => {
                        const [hours, minutes] = timeStr.split(':').map(Number);
                        const [year, month, day] = selectedDate.split('-').map(Number);
                        const eventTime = new Date(year, month - 1, day, hours, minutes, 0, 0);
                        
                        allEvents.push({
                            server: serverName,
                            bossLevel: parseInt(bossLevel),
                            time: eventTime,
                            timeStr: timeStr,
                            refreshIndex: index + 1
                        });
                    });
                }
            });
        });
        
        // 按时间排序
        allEvents.sort((a, b) => a.time - b.time);
        return allEvents;
    }

    // 检查即将到来的BOSS刷新
    checkUpcomingBossRefresh() {
        const now = new Date();
        const today = this.getTodayString();
        const allEvents = this.getAllBossRefreshTimes(today);
        
        allEvents.forEach(event => {
            const timeDiff = event.time - now;
            const minutesUntil = Math.floor(timeDiff / (1000 * 60));
            
            // 如果距离刷新还有10分钟，发送提醒
            if (minutesUntil === 10) {
                const title = 'BOSS刷新提醒';
                const body = `${event.server} ${event.bossLevel}级BOSS 将在10分钟后刷新 (${event.timeStr})`;
                this.sendNotification(title, body);
            }
        });
    }

    // 开启/关闭提醒功能
    toggleReminders() {
        this.reminderEnabled = !this.reminderEnabled;
        
        if (this.reminderEnabled) {
            // 请求通知权限
            if ('Notification' in window && Notification.permission !== 'granted') {
                Notification.requestPermission().then(permission => {
                    if (permission === 'granted') {
                        this.startReminderService();
                    } else {
                        this.reminderEnabled = false;
                        alert('需要通知权限才能使用提醒功能');
                    }
                });
            } else {
                this.startReminderService();
            }
        } else {
            this.stopReminderService();
        }
        
        this.updateReminderStatus();
        this.saveToStorage();
    }

    // 启动提醒服务
    startReminderService() {
        if (this.reminderInterval) {
            clearInterval(this.reminderInterval);
        }
        
        // 每分钟检查一次
        this.reminderInterval = setInterval(() => {
            this.checkUpcomingBossRefresh();
        }, 60000);
        
        // 立即检查一次
        this.checkUpcomingBossRefresh();
    }

    // 停止提醒服务
    stopReminderService() {
        if (this.reminderInterval) {
            clearInterval(this.reminderInterval);
            this.reminderInterval = null;
        }
    }

    // 更新提醒状态显示
    updateReminderStatus() {
        const statusElement = document.getElementById('reminderStatusText');
        if (statusElement) {
            statusElement.textContent = this.reminderEnabled ? '提醒功能：已开启' : '提醒功能：未开启';
            statusElement.parentElement.className = this.reminderEnabled ? 'reminder-status active' : 'reminder-status';
        }
    }

    // 生成ICS日历文件
    generateICSFile(selectedDate) {
        const allEvents = this.getAllBossRefreshTimes(selectedDate);
        const now = new Date();
        
        console.log(`导出日期: ${selectedDate}`);
        console.log(`总事件数: ${allEvents.length}`);
        console.log('所有事件:', allEvents);
        
        // 过滤掉已过期的事件
        const futureEvents = allEvents.filter(event => event.time > now);
        
        console.log(`未来事件数: ${futureEvents.length}`);
        console.log('未来事件:', futureEvents);
        
        if (futureEvents.length === 0) {
            alert('没有未来的BOSS刷新事件可以导出');
            return;
        }

        // 获取本地时区偏移量
        const timezoneOffset = now.getTimezoneOffset();
        const timezoneHours = Math.floor(Math.abs(timezoneOffset) / 60);
        const timezoneMinutes = Math.abs(timezoneOffset) % 60;
        const timezoneSign = timezoneOffset <= 0 ? '+' : '-';
        const timezoneId = `UTC${timezoneSign}${String(timezoneHours).padStart(2, '0')}${String(timezoneMinutes).padStart(2, '0')}`;

        let icsContent = [
            'BEGIN:VCALENDAR',
            'VERSION:2.0',
            'PRODID:-//NYKD BOSS Refresh//NONSGML v1.0//EN',
            'CALSCALE:GREGORIAN',
            'METHOD:PUBLISH',
            'BEGIN:VTIMEZONE',
            `TZID:${timezoneId}`,
            'BEGIN:STANDARD',
            `TZOFFSETFROM:${timezoneSign}${String(timezoneHours).padStart(2, '0')}${String(timezoneMinutes).padStart(2, '0')}`,
            `TZOFFSETTO:${timezoneSign}${String(timezoneHours).padStart(2, '0')}${String(timezoneMinutes).padStart(2, '0')}`,
            'DTSTART:19700101T000000',
            'END:STANDARD',
            'END:VTIMEZONE'
        ];

        futureEvents.forEach(event => {
            const startTime = this.formatDateForICS(event.time);
            const endTime = this.formatDateForICS(new Date(event.time.getTime() + 10 * 60 * 1000)); // 结束时间为开始时间+10分钟
            const uid = `boss-${event.server}-${event.bossLevel}-${event.refreshIndex}-${startTime}@nykd-boss-refresh`;
            
            console.log(`添加事件: ${event.server} ${event.bossLevel}级 ${event.timeStr}`);
            
            icsContent.push(
                'BEGIN:VEVENT',
                `UID:${uid}`,
                `DTSTART;TZID=${timezoneId}:${startTime}`,
                `DTEND;TZID=${timezoneId}:${endTime}`,
                `SUMMARY:BOSS刷新 - ${event.server} ${event.bossLevel}级`,
                `DESCRIPTION:服务器: ${event.server}\\n等级: ${event.bossLevel}级\\n第${event.refreshIndex}次刷新`,
                `LOCATION:${event.server}服务器`,
                'STATUS:CONFIRMED',
                'TRANSP:OPAQUE',
                `DTSTAMP:${this.formatDateForICS(now)}`,
                'BEGIN:VALARM',
                'TRIGGER:-PT10M',
                'ACTION:DISPLAY',
                `DESCRIPTION:BOSS即将刷新 - ${event.server} ${event.bossLevel}级`,
                'END:VALARM',
                'END:VEVENT'
            );
        });

        icsContent.push('END:VCALENDAR');
        
        const icsString = icsContent.join('\r\n');
        console.log('生成的ICS内容:', icsString);
        
        this.downloadICSFile(icsString, `BOSS刷新时间表-${selectedDate}.ics`);
        
        // 显示导出摘要
        const summary = this.generateExportSummary(futureEvents);
        alert(summary);
    }

    // 生成导出摘要
    generateExportSummary(events) {
        const serverStats = {};
        const bossStats = {};
        
        events.forEach(event => {
            // 统计服务器
            if (!serverStats[event.server]) {
                serverStats[event.server] = 0;
            }
            serverStats[event.server]++;
            
            // 统计BOSS等级
            if (!bossStats[event.bossLevel]) {
                bossStats[event.bossLevel] = 0;
            }
            bossStats[event.bossLevel]++;
        });
        
        let summary = `📅 日历导出完成！\n\n`;
        summary += `📊 导出统计：\n`;
        summary += `• 总事件数：${events.length}个\n\n`;
        
        summary += `🖥️ 服务器分布：\n`;
        Object.keys(serverStats).forEach(server => {
            summary += `• ${server}：${serverStats[server]}个事件\n`;
        });
        
        summary += `\n👾 BOSS等级分布：\n`;
        Object.keys(bossStats).sort((a, b) => parseInt(a) - parseInt(b)).forEach(level => {
            summary += `• ${level}级：${bossStats[level]}个事件\n`;
        });
        
        summary += `\n💡 提示：每个事件都包含10分钟提前提醒`;
        
        return summary;
    }

    // 格式化日期为ICS格式 (本地时间格式)
    formatDateForICS(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');
        
        // 返回本地时间格式，不带Z后缀，这样日历应用会按本地时区处理
        return `${year}${month}${day}T${hours}${minutes}${seconds}`;
    }

    // 下载ICS文件
    downloadICSFile(content, filename) {
        const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.style.display = 'none';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        URL.revokeObjectURL(url);
        
        alert(`日历文件 "${filename}" 已生成并下载！\n请在手机上打开此文件，选择添加到日历应用。`);
    }

    // 清理过期的日历事件（这个功能需要用户手动在日历应用中设置）
    getCalendarCleanupInstructions() {
        return `
自动清理过期事件说明：

📱 手机日历应用设置：
1. 大部分手机日历应用会自动处理过期事件
2. 在日历应用中查找"自动删除过期事件"选项
3. 设置自动删除时间（建议1-7天后）

🗂️ 手动清理方法：
1. 打开手机日历应用
2. 搜索"BOSS刷新"相关事件
3. 选择并删除已过期的事件
4. 或者删除整个"BOSS刷新"日历后重新导入

💡 最佳实践：
1. 建议每周重新导出一次最新时间表
2. 导出前可以先删除旧的BOSS刷新日历
3. 这样可以确保日历中只有最新的事件

⚠️ 注意事项：
- ICS文件中的事件会自动包含10分钟提前提醒
- 过期事件不会自动从手机日历中删除
- 需要定期手动清理或重新导入
        `.trim();
    }

    // 生成多日期的ICS文件（用于批量导出）
    generateMultiDayICSFile(startDate, endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        const allEvents = [];
        
        // 遍历日期范围
        for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
            const dateStr = this.formatDate(date);
            const dayEvents = this.getAllBossRefreshTimes(dateStr);
            allEvents.push(...dayEvents);
        }
        
        const now = new Date();
        const futureEvents = allEvents.filter(event => event.time > now);
        
        if (futureEvents.length === 0) {
            alert('选择的日期范围内没有未来的BOSS刷新事件可以导出');
            return;
        }

        let icsContent = [
            'BEGIN:VCALENDAR',
            'VERSION:2.0',
            'PRODID:-//NYKD BOSS Refresh//NONSGML v1.0//EN',
            'CALSCALE:GREGORIAN',
            'METHOD:PUBLISH'
        ];

        futureEvents.forEach(event => {
            const startTime = this.formatDateForICS(event.time);
            const endTime = this.formatDateForICS(new Date(event.time.getTime() + 10 * 60 * 1000));
            const uid = `boss-${event.server}-${event.bossLevel}-${event.refreshIndex}-${startTime}@nykd-boss-refresh`;
            
            icsContent.push(
                'BEGIN:VEVENT',
                `UID:${uid}`,
                `DTSTART:${startTime}`,
                `DTEND:${endTime}`,
                `SUMMARY:BOSS刷新 - ${event.server} ${event.bossLevel}级`,
                `DESCRIPTION:服务器: ${event.server}\\n等级: ${event.bossLevel}级\\n第${event.refreshIndex}次刷新`,
                `LOCATION:${event.server}服务器`,
                'STATUS:CONFIRMED',
                'TRANSP:OPAQUE',
                `DTSTAMP:${this.formatDateForICS(now)}`,
                'BEGIN:VALARM',
                'TRIGGER:-PT10M',
                'ACTION:DISPLAY',
                `DESCRIPTION:BOSS即将刷新 - ${event.server} ${event.bossLevel}级`,
                'END:VALARM',
                'END:VEVENT'
            );
        });

        icsContent.push('END:VCALENDAR');
        
        const icsString = icsContent.join('\r\n');
        const filename = `BOSS刷新时间表-${startDate}至${endDate}.ics`;
        this.downloadICSFile(icsString, filename);
    }
}

// 全局应用实例
let app;

// 页面加载完成后初始化应用
document.addEventListener('DOMContentLoaded', function() {
    app = new BossRefreshApp();
});

// 计算BOSS刷新时间
function calculateBossTime() {
    const server = document.getElementById('server').value;
    const bossLevel = document.getElementById('bossLevel').value;
    const selectedDate = document.getElementById('selectedDate').value;
    const currentHour = parseInt(document.getElementById('currentHour').value);
    const currentMinute = parseInt(document.getElementById('currentMinute').value);
    const remainingHours = parseInt(document.getElementById('remainingHours').value) || 0;
    const remainingMinutes = parseInt(document.getElementById('remainingMinutes').value) || 0;
    const refreshCount = parseInt(document.getElementById('refreshCount').value);
    
    // 计算总剩余分钟数
    const totalRemainingMinutes = remainingHours * 60 + remainingMinutes;
    
    // 验证输入
    if (!server || !bossLevel || !selectedDate || isNaN(currentHour) || isNaN(currentMinute) || !refreshCount) {
        alert('请填写完整信息！');
        return;
    }
    
    if (currentHour < 0 || currentHour > 23 || currentMinute < 0 || currentMinute > 59) {
        alert('请输入正确的时间格式！');
        return;
    }
    
    if (remainingHours < 0 || remainingHours > 23 || remainingMinutes < 0 || remainingMinutes > 59) {
        alert('请输入正确的剩余时间格式！');
        return;
    }
    
    if (refreshCount < 1 || refreshCount > 4) {
        alert('刷新次数必须在1-4之间！');
        return;
    }
    
    // 计算刷新时间
    const result = app.calculateDailyBossRefreshTimes(server, bossLevel, selectedDate, currentHour, currentMinute, totalRemainingMinutes, refreshCount);
    
    // 显示结果
    const resultDiv = document.getElementById('result');
    const resultContent = document.getElementById('resultContent');
    
    let html = `
        <p><strong>服务器：</strong>${server}</p>
        <p><strong>BOSS等级：</strong>${bossLevel}级</p>
        <p><strong>当前日期：</strong>${selectedDate}</p>
        <p><strong>剩余时间：</strong>${remainingHours}小时${remainingMinutes}分钟</p>
        <p><strong>下次刷新时间：</strong>${result.nextRefresh} (${result.nextRefreshDate}) - 第${result.nextRefreshNumber}次</p>
    `;
    
    // 如果基准日期与当前日期不同，显示提示
    if (result.baseDate !== selectedDate) {
        html += `<p style="color: #ff6666;"><strong>注意：</strong>BOSS刷新周期跨天，以${result.baseDate}为基准日期</p>`;
    }
    
    html += `<p><strong>完整刷新周期：</strong></p><ul>`;
    
    result.allRefreshTimes.forEach(item => {
        const nextIndicator = item.isNext ? ' ← 下次刷新' : '';
        const timeClass = item.isNext ? 'style="color: #00ff88; font-weight: bold;"' : '';
        const dateInfo = item.date !== result.baseDate ? ` (${item.date})` : '';
        html += `<li ${timeClass}>第${item.refreshNumber}次：${item.time}${dateInfo}${nextIndicator}</li>`;
    });
    
    html += '</ul><p style="font-size: 12px; color: #888;">刷新间隔：4小时30分钟</p>';
    
    resultContent.innerHTML = html;
    resultDiv.style.display = 'block';
    
    // 隐藏其他面板
    document.getElementById('bossList').style.display = 'none';
}

// 显示所有BOSS列表
function showBossList() {
    const bossListDiv = document.getElementById('bossList');
    const bossListContent = document.getElementById('bossListContent');
    
    let html = '';
    
    Object.keys(app.servers).forEach(serverName => {
        html += `
            <div class="server-section">
                <div class="server-header" onclick="toggleServerContent('${serverName}')">
                    <span>${serverName}</span>
                    <span class="toggle-icon" id="icon-${serverName}">▼</span>
                </div>
                <div class="server-content" id="content-${serverName}">
        `;
        
        const bosses = app.getServerBossRefreshTimes(serverName);
        Object.keys(bosses).sort((a, b) => parseInt(a) - parseInt(b)).forEach(level => {
            const bossData = bosses[level];
            const bossImage = app.getBossImage(level);
            
            html += `<div class="boss-item">
                <div class="boss-level">${level}级BOSS</div>
                <div class="boss-times">`;
            
            // 显示BOSS点位图
            if (bossImage) {
                html += `<img src="${bossImage}" alt="${level}级BOSS点位图" class="boss-image" onclick="showImageModal('${bossImage}')">`;
            }
            
            // 显示所有日期的刷新时间
            const dates = Object.keys(bossData).sort().reverse(); // 最新日期在前
            if (dates.length === 0) {
                html += '<div class="time-date">暂无计算记录</div>';
            } else {
                dates.slice(0, 3).forEach(date => { // 只显示最近3天
                    const times = bossData[date];
                    html += `<div class="time-date">${date}: ${times.join(' | ')}</div>`;
                });
                if (dates.length > 3) {
                    html += `<div class="time-date" style="color: #666;">...还有${dates.length - 3}天记录</div>`;
                }
            }
            
            html += `</div></div>`;
        });
        
        html += `
                </div>
            </div>
        `;
    });
    
    bossListContent.innerHTML = html;
    bossListDiv.style.display = 'block';
    
    // 隐藏其他面板
    document.getElementById('result').style.display = 'none';
}

// 移除不再需要的管理界面相关函数
// 以下函数已删除：
// - showBossTimeManager
// - updateManagerBossLevels  
// - loadBossRefreshTimes
// - addBossRefreshTime
// - deleteBossRefreshTime

// 切换服务器内容显示
function toggleServerContent(serverName) {
    const content = document.getElementById(`content-${serverName}`);
    const icon = document.getElementById(`icon-${serverName}`);
    
    if (content.classList.contains('active')) {
        content.classList.remove('active');
        icon.classList.remove('rotated');
    } else {
        content.classList.add('active');
        icon.classList.add('rotated');
    }
}

// 切换添加服务器表单
function toggleAddServer() {
    const form = document.getElementById('addServerForm');
    const bossForm = document.getElementById('addBossForm');
    
    // 隐藏BOSS表单
    bossForm.classList.remove('active');
    
    // 切换服务器表单
    if (form.classList.contains('active')) {
        form.classList.remove('active');
    } else {
        form.classList.add('active');
        document.getElementById('newServerName').value = '';
    }
}

// 切换添加BOSS表单
function toggleAddBoss() {
    const form = document.getElementById('addBossForm');
    const serverForm = document.getElementById('addServerForm');
    
    // 隐藏服务器表单
    serverForm.classList.remove('active');
    
    // 切换BOSS表单
    if (form.classList.contains('active')) {
        form.classList.remove('active');
    } else {
        form.classList.add('active');
        document.getElementById('newBossLevel').value = '';
    }
}

// 添加新服务器
function addNewServer() {
    const serverName = document.getElementById('newServerName').value.trim();
    
    if (!serverName) {
        alert('请输入服务器名称！');
        return;
    }
    
    if (app.addServer(serverName)) {
        alert('服务器添加成功！');
        document.getElementById('addServerForm').classList.remove('active');
        document.getElementById('newServerName').value = '';
    } else {
        alert('服务器已存在或添加失败！');
    }
}

// 添加新BOSS
function addNewBoss() {
    const bossLevel = parseInt(document.getElementById('newBossLevel').value);
    const imageFile = document.getElementById('bossImageUpload').files[0];
    
    if (!bossLevel) {
        alert('请输入BOSS等级！');
        return;
    }
    
    if (bossLevel < 1 || bossLevel > 100) {
        alert('请输入有效的BOSS等级（1-100）！');
        return;
    }
    
    // 如果有图片，先处理图片
    if (imageFile) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const imageData = e.target.result;
            if (app.addBossToAllServers(bossLevel, imageData)) {
                alert(`${bossLevel}级BOSS已添加到所有服务器！`);
                document.getElementById('addBossForm').classList.remove('active');
                document.getElementById('newBossLevel').value = '';
                document.getElementById('bossImageUpload').value = '';
                document.getElementById('imagePreview').style.display = 'none';
            } else {
                alert('所有服务器都已存在该等级BOSS！');
            }
        };
        reader.readAsDataURL(imageFile);
    } else {
        // 没有图片，直接添加BOSS
        if (app.addBossToAllServers(bossLevel)) {
            alert(`${bossLevel}级BOSS已添加到所有服务器！`);
            document.getElementById('addBossForm').classList.remove('active');
            document.getElementById('newBossLevel').value = '';
        } else {
            alert('所有服务器都已存在该等级BOSS！');
        }
    }
}

// 预览BOSS图片
function previewBossImage(input) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const preview = document.getElementById('imagePreview');
            const img = document.getElementById('previewImg');
            img.src = e.target.result;
            preview.style.display = 'block';
        };
        reader.readAsDataURL(input.files[0]);
    }
}

// 移除BOSS图片
function removeBossImage() {
    document.getElementById('bossImageUpload').value = '';
    document.getElementById('imagePreview').style.display = 'none';
}

// 显示图片模态框
function showImageModal(imageSrc) {
    const modal = document.getElementById('imageModal');
    const modalImg = document.getElementById('modalImage');
    modalImg.src = imageSrc;
    modal.style.display = 'block';
}

// 切换管理BOSS图片表单
function toggleManageBossImages() {
    const form = document.getElementById('manageBossImagesForm');
    const serverForm = document.getElementById('addServerForm');
    const bossForm = document.getElementById('addBossForm');
    
    // 隐藏其他表单
    serverForm.classList.remove('active');
    bossForm.classList.remove('active');
    
    // 切换图片管理表单
    if (form.classList.contains('active')) {
        form.classList.remove('active');
    } else {
        form.classList.add('active');
        loadManageBossLevels();
        loadBossImagesList();
    }
}

// 加载管理界面的BOSS等级选项
function loadManageBossLevels() {
    const select = document.getElementById('manageBossLevel');
    select.innerHTML = '<option value="">请选择BOSS等级</option>';
    
    // 获取所有已存在的BOSS等级
    const allLevels = new Set();
    Object.keys(app.servers).forEach(serverName => {
        Object.keys(app.servers[serverName]).forEach(level => {
            allLevels.add(parseInt(level));
        });
    });
    
    // 按等级排序并添加到选择框
    Array.from(allLevels).sort((a, b) => a - b).forEach(level => {
        const option = document.createElement('option');
        option.value = level;
        option.textContent = `${level}级BOSS`;
        select.appendChild(option);
    });
}

// 预览管理界面的图片
function previewManageImage(input) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const preview = document.getElementById('manageImagePreview');
            const img = document.getElementById('managePreviewImg');
            img.src = e.target.result;
            preview.style.display = 'block';
        };
        reader.readAsDataURL(input.files[0]);
    }
}

// 移除管理界面的图片
function removeManageImage() {
    document.getElementById('manageImageUpload').value = '';
    document.getElementById('manageImagePreview').style.display = 'none';
}

// 保存管理界面的BOSS图片
function saveManageBossImage() {
    const bossLevel = document.getElementById('manageBossLevel').value;
    const imageFile = document.getElementById('manageImageUpload').files[0];
    
    if (!bossLevel) {
        alert('请选择BOSS等级！');
        return;
    }
    
    if (!imageFile) {
        alert('请选择要上传的图片！');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
        const imageData = e.target.result;
        if (app.updateBossImage(parseInt(bossLevel), imageData)) {
            alert(`${bossLevel}级BOSS图片保存成功！`);
            // 清空输入
            document.getElementById('manageBossLevel').value = '';
            document.getElementById('manageImageUpload').value = '';
            document.getElementById('manageImagePreview').style.display = 'none';
            // 重新加载列表
            loadBossImagesList();
        } else {
            alert('图片保存失败！');
        }
    };
    reader.readAsDataURL(imageFile);
}

// 加载BOSS图片列表
function loadBossImagesList() {
    const container = document.getElementById('bossImagesList');
    const bossImages = app.bossImages;
    
    if (Object.keys(bossImages).length === 0) {
        container.innerHTML = '<div class="no-images-message">暂无BOSS图片</div>';
        return;
    }
    
    // 清空容器
    container.innerHTML = '';
    
    // 为每个BOSS图片创建DOM元素
    Object.keys(bossImages).sort((a, b) => parseInt(a) - parseInt(b)).forEach(level => {
        const imageData = bossImages[level];
        
        // 创建主容器
        const itemDiv = document.createElement('div');
        itemDiv.className = 'boss-image-item';
        
        // 创建图片信息区域
        const infoDiv = document.createElement('div');
        infoDiv.className = 'boss-image-info';
        
        // 创建缩略图
        const thumbnail = document.createElement('img');
        thumbnail.src = imageData;
        thumbnail.alt = `${level}级BOSS`;
        thumbnail.className = 'boss-image-thumbnail';
        thumbnail.onclick = () => showImageModal(imageData);
        
        // 创建详情区域
        const detailsDiv = document.createElement('div');
        detailsDiv.className = 'boss-image-details';
        
        const levelDiv = document.createElement('div');
        levelDiv.className = 'boss-image-level';
        levelDiv.textContent = `${level}级BOSS`;
        
        const typeDiv = document.createElement('div');
        typeDiv.textContent = '点位图';
        
        detailsDiv.appendChild(levelDiv);
        detailsDiv.appendChild(typeDiv);
        
        infoDiv.appendChild(thumbnail);
        infoDiv.appendChild(detailsDiv);
        
        // 创建操作按钮区域
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'boss-image-actions';
        
        const updateBtn = document.createElement('button');
        updateBtn.className = 'btn btn-small';
        updateBtn.textContent = '更换图片';
        updateBtn.onclick = () => updateBossImage(parseInt(level));
        
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'btn btn-small btn-danger';
        deleteBtn.textContent = '删除图片';
        deleteBtn.onclick = () => deleteBossImageConfirm(parseInt(level));
        
        actionsDiv.appendChild(updateBtn);
        actionsDiv.appendChild(deleteBtn);
        
        // 组装完整元素
        itemDiv.appendChild(infoDiv);
        itemDiv.appendChild(actionsDiv);
        
        container.appendChild(itemDiv);
    });
}

// 更换BOSS图片
function updateBossImage(bossLevel) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = function(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(event) {
                const imageData = event.target.result;
                if (app.updateBossImage(bossLevel, imageData)) {
                    alert(`${bossLevel}级BOSS图片更新成功！`);
                    loadBossImagesList(); // 重新加载列表
                } else {
                    alert('图片更新失败！');
                }
            };
            reader.readAsDataURL(file);
        }
    };
    input.click();
}

// 删除BOSS图片确认
function deleteBossImageConfirm(bossLevel) {
    if (confirm(`确定要删除${bossLevel}级BOSS的点位图吗？`)) {
        if (app.deleteBossImage(bossLevel)) {
            alert(`${bossLevel}级BOSS图片删除成功！`);
            loadBossImagesList(); // 重新加载列表
        } else {
            alert('图片删除失败！');
        }
    }
}
 
 // 关闭图片模态框
 function closeImageModal() {
     document.getElementById('imageModal').style.display = 'none';
 }
 
 // 页面可见性变化时更新当前时间
document.addEventListener('visibilitychange', function() {
    if (!document.hidden && app) {
        app.setCurrentTime();
    }
});

// 每分钟更新一次当前时间
setInterval(() => {
    if (app) {
        app.setCurrentTime();
        // 更新时间线显示
        updateTimelineCurrentTime();
    }
}, 60000);

// 显示BOSS时间线
function showBossTimeline() {
    // 隐藏其他结果区域
    document.getElementById('result').style.display = 'none';
    document.getElementById('bossList').style.display = 'none';
    
    // 显示时间线
    const timelineDiv = document.getElementById('bossTimeline');
    timelineDiv.style.display = 'block';
    
    // 设置默认日期为今天
    const timelineDate = document.getElementById('timelineDate');
    timelineDate.value = app.getTodayString();
    
    // 更新提醒状态显示
    app.updateReminderStatus();
    
    // 生成时间线
    generateTimeline();
    
    // 启动时间线更新
    startTimelineUpdates();
    
    // 监听日期变化
    timelineDate.addEventListener('change', generateTimeline);
}

// 生成时间线
function generateTimeline() {
    const selectedDate = document.getElementById('timelineDate').value;
    if (!selectedDate) return;
    
    const allEvents = app.getAllBossRefreshTimes(selectedDate);
    const timelineContent = document.getElementById('timelineContent');
    
    if (allEvents.length === 0) {
        timelineContent.innerHTML = '<div class="no-events">该日期没有BOSS刷新数据</div>';
        return;
    }
    
    // 按小时分组事件
    const eventsByHour = {};
    for (let hour = 0; hour < 24; hour++) {
        eventsByHour[hour] = [];
    }
    
    allEvents.forEach(event => {
        const hour = event.time.getHours();
        eventsByHour[hour].push(event);
    });
    
    // 生成时间线HTML
    let timelineHTML = '<div class="timeline-container">';
    
    for (let hour = 0; hour < 24; hour++) {
        const hourStr = hour.toString().padStart(2, '0') + ':00';
        const events = eventsByHour[hour];
        
        timelineHTML += `
            <div class="timeline-hour" data-hour="${hour}">
                <div class="timeline-time">${hourStr}</div>
                <div class="timeline-events">
        `;
        
        events.forEach(event => {
            const now = new Date();
            const isToday = selectedDate === app.getTodayString();
            let eventClass = 'timeline-event';
            let countdownText = '';
            
            if (isToday) {
                if (event.time < now) {
                    eventClass += ' past';
                } else {
                    eventClass += ' upcoming';
                    const timeDiff = event.time - now;
                    const hoursUntil = Math.floor(timeDiff / (1000 * 60 * 60));
                    const minutesUntil = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
                    
                    if (hoursUntil > 0) {
                        countdownText = `${hoursUntil}h ${minutesUntil}m`;
                    } else if (minutesUntil > 0) {
                        countdownText = `${minutesUntil}m`;
                    } else {
                        countdownText = '即将刷新';
                    }
                }
            }
            
            timelineHTML += `
                <div class="${eventClass}" onclick="showEventDetails('${event.server}', ${event.bossLevel}, '${event.timeStr}')">
                    <div class="timeline-event-server">${event.server}</div>
                    <div class="timeline-event-boss">${event.bossLevel}级</div>
                    <div class="timeline-event-time">${event.timeStr}</div>
                    ${countdownText ? `<div class="timeline-event-countdown">${countdownText}</div>` : ''}
                </div>
            `;
        });
        
        timelineHTML += `
                </div>
            </div>
        `;
    }
    
    timelineHTML += '</div>';
    timelineContent.innerHTML = timelineHTML;
    
    // 更新当前时间指示器
    updateTimelineCurrentTime();
}

// 更新时间线当前时间指示器
function updateTimelineCurrentTime() {
    const currentTimeDisplay = document.getElementById('currentTimeDisplay');
    if (currentTimeDisplay) {
        const now = new Date();
        const timeStr = now.getHours().toString().padStart(2, '0') + ':' + 
                       now.getMinutes().toString().padStart(2, '0');
        currentTimeDisplay.textContent = timeStr;
    }
    
    // 更新时间线中的当前时间指示器位置
    const selectedDate = document.getElementById('timelineDate')?.value;
    const isToday = selectedDate === app?.getTodayString();
    
    if (isToday) {
        const now = new Date();
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();
        
        // 移除之前的时间指示器
        const existingIndicator = document.querySelector('.timeline-current-time');
        if (existingIndicator) {
            existingIndicator.remove();
        }
        
        // 添加新的时间指示器
        const hourElement = document.querySelector(`[data-hour="${currentHour}"]`);
        if (hourElement) {
            const indicator = document.createElement('div');
            indicator.className = 'timeline-current-time';
            indicator.style.top = `${(currentMinute / 60) * 100}%`;
            hourElement.appendChild(indicator);
        }
    }
}

// 启动时间线更新
function startTimelineUpdates() {
    // 清除之前的定时器
    if (app.timelineInterval) {
        clearInterval(app.timelineInterval);
    }
    
    // 每分钟更新一次时间线
    app.timelineInterval = setInterval(() => {
        const timelineDiv = document.getElementById('bossTimeline');
        if (timelineDiv && timelineDiv.style.display !== 'none') {
            generateTimeline();
        }
    }, 60000);
}

// 显示事件详情
function showEventDetails(serverName, bossLevel, timeStr) {
    const bossImage = app.getBossImage(bossLevel);
    let imageHTML = '';
    
    if (bossImage) {
        imageHTML = `<img src="${bossImage}" alt="${bossLevel}级BOSS点位图" style="max-width: 200px; max-height: 150px; border-radius: 4px; margin-top: 10px;">`;
    }
    
    const message = `
        服务器: ${serverName}
        BOSS等级: ${bossLevel}级
        刷新时间: ${timeStr}
        ${imageHTML ? '\n点击确定查看点位图' : ''}
    `;
    
    if (confirm(message) && bossImage) {
        showImageModal(bossImage);
    }
}

// 开启/关闭提醒功能
function toggleReminders() {
    app.toggleReminders();
}

// 导出日历文件
function exportToCalendar() {
    const selectedDate = document.getElementById('timelineDate')?.value || app.getTodayString();
    app.generateICSFile(selectedDate);
}

// 显示日历清理说明
function showCalendarCleanupInstructions() {
    const instructions = app.getCalendarCleanupInstructions();
    alert(instructions);
}