document.addEventListener('DOMContentLoaded', () => {
    const generateBtn = document.getElementById('generateBtn');
    const birthdateInput = document.getElementById('birthdate');
    const chartContainer = document.getElementById('klineChart');
    const chartSection = document.getElementById('chart-section');
    const summarySection = document.getElementById('summary-section');
    
    let myChart = null;

    generateBtn.addEventListener('click', () => {
        const birthdateStr = birthdateInput.value;
        if (!birthdateStr) {
            alert('请先选择您的阳历生日！');
            return;
        }

        // 解决时区问题：手动解析年月日
        const [year, month, day] = birthdateStr.split('-').map(Number);

        // 严格日期校验逻辑
        if (!validateDate(year, month, day)) {
            return;
        }

        const birthdate = new Date(year, month - 1, day);

        if (isNaN(birthdate.getTime())) {
            alert('无效的日期格式！');
            return;
        }

        generateFortune(birthdate);
    });

    function validateDate(year, month, day) {
        // 1. 年份必须是4位数字 (1900-2026合理范围)
        if (year < 1900 || year > 2026) {
            alert('年份请输入1900-2026之间的4位数字！');
            return false;
        }

        // 2. 月份必须是1-12
        if (month < 1 || month > 12) {
            alert('月份请输入1-12之间的数字！');
            return false;
        }

        // 3. 天数校验 (考虑大月、小月、平闰年2月)
        const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
        
        // 闰年判断：能被4整除但不能被100整除，或者能被400整除
        const isLeapYear = (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
        if (isLeapYear) {
            daysInMonth[1] = 29; // 闰年2月29天
        }

        if (day < 1 || day > daysInMonth[month - 1]) {
            const maxDays = daysInMonth[month - 1];
            alert(`${year}年${month}月只有${maxDays}天，请输入有效的日期！`);
            return false;
        }

        return true;
    }

    function generateFortune(birthdate) {
        // 1. 农历转换
        const lunarBirth = Lunar.fromDate(birthdate);
        const shengxiao = lunarBirth.getYearShengXiao();
        const lunarMonth = lunarBirth.getMonthInChinese();
        const lunarDay = lunarBirth.getDayInChinese();
        
        // 显示结果区域
        chartSection.style.display = 'block';
        summarySection.style.display = 'block';

        // 2. 生成K线数据 (2026-02-16 到 2036-02-16)
        const startDate = new Date('2026-02-16');
        const endDate = new Date('2036-02-16');
        const data = generateKLineData(startDate, endDate, shengxiao);

        // 3. 渲染图表
        renderChart(data);

        // 4. 生成2026年总结
        generateSummary(shengxiao, lunarBirth, data);
        
        // 滚动到图表位置
        chartSection.scrollIntoView({ behavior: 'smooth' });
    }

    function generateKLineData(startDate, endDate, userShengxiao) {
        const categoryData = []; // 日期
        const values = []; // [Open, Close, Lowest, Highest]
        
        // 强制从每月1号开始，避免日期计算偏差
        let currentYear = startDate.getFullYear();
        let currentMonth = startDate.getMonth(); // 0-based
        
        let currentPrice = 50; // 初始运势值
        
        // 简单的生肖年份对应表 (2026是马年)
        const shengxiaoOrder = ['鼠', '牛', '虎', '兔', '龙', '蛇', '马', '羊', '猴', '鸡', '狗', '猪'];
        const startYearShengxiaoIndex = shengxiaoOrder.indexOf('马'); // 2026年

        // 计算总月数
        const endYear = endDate.getFullYear();
        const endMonth = endDate.getMonth();
        const totalMonths = (endYear - currentYear) * 12 + (endMonth - currentMonth);

        for (let i = 0; i <= totalMonths; i++) {
            // 计算当前年月
            let year = currentYear + Math.floor((currentMonth + i) / 12);
            let month = (currentMonth + i) % 12 + 1; // 1-based
            
            const dateStr = `${year}-${month.toString().padStart(2, '0')}`;
            const currentDate = new Date(year, month - 1, 1);
            
            // 计算当前年份的生肖
            const yearOffset = year - 2026;
            const currentYearShengxiaoIndex = (startYearShengxiaoIndex + yearOffset) % 12;
            const currentYearShengxiao = shengxiaoOrder[currentYearShengxiaoIndex];
            
            // 本命年或冲太岁判断 (简单逻辑：相同为本命年，相差6为冲)
            const isBenMingNian = currentYearShengxiao === userShengxiao;
            const isChongTaiSui = Math.abs(shengxiaoOrder.indexOf(userShengxiao) - currentYearShengxiaoIndex) === 6;

            // 波动系数：本命年和冲太岁波动大
            let volatility = 5; 
            if (isBenMingNian || isChongTaiSui) {
                volatility = 15; // 大波动
            }

            // 生成单根K线数据
            // 随机涨跌方向，引入正弦波制造长周期趋势
            const trend = Math.sin(currentDate.getTime() / (1000 * 60 * 60 * 24 * 365)) * 2; 
            const randomChange = (Math.random() - 0.5) * volatility + trend;
            
            let open = currentPrice;
            let close = currentPrice + randomChange;
            
            // 限制范围 0-100
            close = Math.max(10, Math.min(90, close));
            
            // 生成上下影线 (波动要大)
            let high = Math.max(open, close) + Math.random() * volatility * 0.8;
            let low = Math.min(open, close) - Math.random() * volatility * 0.8;
            
            // 再次限制
            high = Math.min(100, high);
            low = Math.max(0, low);

            categoryData.push(dateStr);
            // 确保数据为数字类型，避免 ECharts 解析问题
            values.push([
                parseFloat(open.toFixed(1)), 
                parseFloat(close.toFixed(1)), 
                parseFloat(low.toFixed(1)), 
                parseFloat(high.toFixed(1))
            ]);
            
            currentPrice = close;
        }

        return { categoryData, values };
    }

    function renderChart(data) {
        if (myChart) {
            myChart.dispose();
        }
        
        // 使用 setTimeout 确保 DOM 布局更新完成后再初始化图表
        setTimeout(() => {
            // 初始化图表，不使用内置主题，手动配置暗色科技风
            myChart = echarts.init(chartContainer);

            const option = {
                backgroundColor: 'transparent',
                title: {
                    text: '未来十年运势走势 (2026-2036)',
                    left: 'center',
                    textStyle: {
                        color: '#00f3ff',
                        fontFamily: 'monospace'
                    }
                },
                tooltip: {
                    trigger: 'axis',
                    axisPointer: {
                        type: 'cross',
                        label: {
                            backgroundColor: '#2979ff'
                        }
                    },
                    backgroundColor: 'rgba(20, 20, 30, 0.9)',
                    borderColor: '#00f3ff',
                    textStyle: {
                        color: '#fff'
                    },
                    formatter: function (params) {
                        const param = params[0];
                        // param.value: [index, open, close, low, high] (当 axis 为 category 时)
                        const open = param.value[1];
                        const close = param.value[2];
                        const low = param.value[3];
                        const high = param.value[4];
                        
                        return `<div style="font-family: monospace;">
                                ${param.name}<br/>
                                <span style="color:${parseFloat(close) > parseFloat(open) ? '#ff2e63' : '#00e676'}">
                                开盘: ${open}<br/>
                                收盘: ${close}<br/>
                                最低: ${low}<br/>
                                最高: ${high}
                                </span>
                                </div>`;
                    }
                },
                grid: {
                    left: '5%',
                    right: '5%',
                    bottom: '15%',
                    top: '10%',
                    containLabel: true,
                    borderColor: '#333'
                },
                xAxis: {
                    type: 'category',
                    data: data.categoryData,
                    scale: true,
                    boundaryGap: false,
                    axisLine: { 
                        onZero: false,
                        lineStyle: { color: '#00f3ff' } 
                    },
                    splitLine: { 
                        show: true,
                        lineStyle: { color: 'rgba(0, 243, 255, 0.1)', type: 'dashed' }
                    },
                    axisLabel: { color: '#a0a0a0' },
                    min: 'dataMin',
                    max: 'dataMax'
                },
                yAxis: {
                    scale: true,
                    splitArea: { show: false },
                    splitLine: { 
                        show: true,
                        lineStyle: { color: 'rgba(0, 243, 255, 0.1)' }
                    },
                    axisLine: { lineStyle: { color: '#00f3ff' } },
                    axisLabel: { color: '#a0a0a0' }
                },
                dataZoom: [
                    {
                        type: 'inside',
                        start: 0,
                        end: 100
                    },
                    {
                        show: true,
                        type: 'slider',
                        top: '90%',
                        start: 0,
                        end: 100,
                        borderColor: 'rgba(0, 243, 255, 0.2)',
                        fillerColor: 'rgba(0, 243, 255, 0.2)',
                        textStyle: { color: '#00f3ff' },
                        handleStyle: {
                            color: '#00f3ff',
                            shadowBlur: 3,
                            shadowColor: 'rgba(0, 0, 0, 0.6)',
                            shadowOffsetX: 2,
                            shadowOffsetY: 2
                        }
                    }
                ],
                series: [
                    {
                        name: '运势',
                        type: 'candlestick',
                        data: data.values,
                        itemStyle: {
                            color: '#ff2e63', // 阳线 (涨) 霓虹红
                            color0: '#00e676', // 阴线 (跌) 霓虹绿
                            borderColor: '#ff2e63',
                            borderColor0: '#00e676'
                        },
                        markPoint: {
                            data: [
                                { type: 'max', name: '巅峰', itemStyle: { color: '#bc13fe' } },
                                { type: 'min', name: '低谷', itemStyle: { color: '#2979ff' } }
                            ],
                            label: { color: '#fff' }
                        },
                        markLine: {
                            symbol: ['none', 'none'],
                            data: [
                                { type: 'average', name: '平均运势', lineStyle: { color: '#bc13fe', type: 'dashed' } }
                            ],
                            label: { color: '#bc13fe', position: 'end' }
                        }
                    }
                ]
            };

            myChart.setOption(option);
            
            // 确保尺寸正确
            myChart.resize();
            
            // 响应式重绘
            window.addEventListener('resize', () => {
                myChart.resize();
            });
        }, 100);
    }

    function generateSummary(shengxiao, lunarBirth, data) {
        // 2026年数据 (前12个月)
        const year2026Data = data.values.slice(0, 12);
        // 计算2026年整体趋势
        let startPrice = parseFloat(year2026Data[0][0]);
        let endPrice = parseFloat(year2026Data[11][1]);
        let isRising = endPrice > startPrice;
        
        // 随机文案库
        const wealthText = [
            "财星高照，正财稳健，适合稳步投资。",
            "偏财运旺，偶有意外之喜，但需防冲动消费。",
            "财运平平，宜守不宜攻，储蓄为上。",
            "财运波动较大，虽然机会多，但风险也并存。",
            "能够通过副业获得不错收益，注意开源节流。"
        ];
        
        const loveText = [
            "桃花盛开，单身者有望脱单，有伴者感情升温。",
            "感情平稳，细水长流，适合通过旅行增进感情。",
            "稍有波折，需多沟通包容，避免小事争吵。",
            "魅力值提升，社交活动中容易遇到心仪对象。",
            "重心在自我提升，感情顺其自然，不强求。"
        ];

        const benMingNianText = "2026年是丙午马年。";
        let specialText = "";
        
        if (shengxiao === '马') {
            specialText = "本命年值太岁，运势起伏较大，建议低调行事，多穿红色衣物开运。";
        } else if (shengxiao === '鼠') {
            specialText = "冲太岁之年，变动较多，宜动不宜静，可主动寻求变化（如搬家、出差）。";
        } else {
            specialText = `属${shengxiao}的朋友，在马年机遇与挑战并存，保持积极心态即可乘风破浪。`;
        }

        // 随机选择
        const randomWealth = wealthText[Math.floor(Math.random() * wealthText.length)];
        const randomLove = loveText[Math.floor(Math.random() * loveText.length)];
        
        // DOM 更新
        document.getElementById('lunar-info').textContent = `您的农历生日：${lunarBirth.getMonthInChinese()}月${lunarBirth.getDayInChinese()} (属${shengxiao})`;
        document.getElementById('wealth-fortune').textContent = randomWealth;
        document.getElementById('love-fortune').textContent = randomLove;
        
        let trendText = isRising ? "整体呈上升趋势，运势红火！" : "整体处于调整期，蓄势待发。";
        document.getElementById('overall-comment').textContent = `${benMingNianText} ${specialText} 2026年${trendText}`;
    }
});
