const express = require('express');
const { GoogleAnalyticsData } = require('@google-analytics/data');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// 初始化 GA4 客户端
const analyticsDataClient = new GoogleAnalyticsData({
    credentials: {
        client_email: process.env.GA4_CLIENT_EMAIL,
        private_key: process.env.GA4_PRIVATE_KEY.replace(/\\n/g, '\n'),
    },
    projectId: process.env.GA4_PROJECT_ID,
});

// GA4 数据获取 API
app.post('/api/ga4-stats', async (req, res) => {
    try {
        const { startDate, endDate } = req.body;
        const propertyId = process.env.GA4_PROPERTY_ID;

        const [response] = await analyticsDataClient.runReport({
            property: `properties/${propertyId}`,
            dateRanges: [
                {
                    startDate: startDate.split('T')[0],
                    endDate: endDate.split('T')[0],
                },
            ],
            dimensions: [
                {
                    name: 'date',
                },
            ],
            metrics: [
                {
                    name: 'screenPageViewsPerSession',
                },
                {
                    name: 'totalUsers',
                },
            ],
        });

        const stats = response.rows.map(row => ({
            date: row.dimensionValues[0].value,
            pageviews: parseInt(row.metricValues[0].value),
            users: parseInt(row.metricValues[1].value),
        }));

        res.json(stats);
    } catch (error) {
        console.error('获取 GA4 数据失败:', error);
        res.status(500).json({ error: '获取数据失败' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`服务器运行在端口 ${PORT}`);
}); 