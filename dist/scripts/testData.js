"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.testDatabaseConnection = testDatabaseConnection;
const mongoose_1 = __importDefault(require("mongoose"));
const models_1 = require("../models");
const storage_1 = require("../data/storage");
// Sample test data
const sampleData = [
    { B1: '129 中山現況豪宅', B2: '手機案', B3: '手機殼', detail: 'iPhone 14 手機殼' },
    { B1: '129 中山現況豪宅', B2: '手機案', B3: '手機殼', detail: 'Samsung S23 手機殼' },
    { B1: '129 中山現況豪宅', B2: '手機案', B3: '螢幕保護貼', detail: '9H 鋼化玻璃' },
    { B1: '129 中山現況豪宅', B2: '電腦設備', B3: '筆記本電腦', detail: 'MacBook Pro' },
    { B1: '129 中山現況豪宅', B2: '電腦設備', B3: '筆記本電腦', detail: 'Dell XPS' },
    { B1: '130 大安新案', B2: '家具', B3: '沙發', detail: '三人座布沙發' },
    { B1: '130 大安新案', B2: '家具', B3: '餐桌', detail: '實木餐桌' },
    { B1: '130 大安新案', B2: '家電', B3: '冰箱', detail: '雙門冰箱' },
    // 加入更多測試數據
    { B1: '49 信義豪宅', B2: '手機案', B3: '手機殼', detail: 'iPhone 案例' },
    { B1: '99 松山大樓', B2: '電腦設備', B3: '桌機', detail: '桌上型電腦' },
    { B1: '199 天母別墅', B2: '家具', B3: '床組', detail: '雙人床組' },
    { B1: '299 內湖科技', B2: '辦公設備', B3: '印表機', detail: '雷射印表機' },
    { B1: '399 南港經貿', B2: '手機案', B3: '手機殼', detail: 'Android 手機殼' },
    { B1: '499 板橋新站', B2: '家電', B3: '洗衣機', detail: '滾筒洗衣機' },
    { B1: '599 中和環球', B2: '電腦設備', B3: '螢幕', detail: '27吋螢幕' },
    { B1: '699 永和樂華', B2: '家具', B3: '書桌', detail: '實木書桌' },
    { B1: '799 新店碧潭', B2: '手機案', B3: '螢幕保護貼', detail: '防藍光保護貼' },
    { B1: '899 三重重陽', B2: '家電', B3: '電視', detail: '55吋智慧電視' },
    { B1: '999 蘆洲捷運', B2: '辦公設備', B3: '辦公椅', detail: '人體工學椅' },
];
async function testDatabaseConnection() {
    try {
        console.log('🔗 Testing database connection...');
        // Connect to MongoDB
        const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/renew_packages';
        await mongoose_1.default.connect(mongoUri);
        console.log('✅ Connected to MongoDB');
        // Check existing data count
        const count = await models_1.DataEntry.countDocuments();
        console.log(`📊 Current data entries in database: ${count}`);
        // If no data, add sample data
        if (count === 0) {
            console.log('📝 Adding sample data...');
            await storage_1.dataService.setData(sampleData);
            console.log('✅ Sample data added successfully');
        }
        // Test B1 values
        console.log('🔍 Testing B1 values...');
        const b1Values = await storage_1.dataService.getB1Values();
        console.log('B1 Values:', b1Values);
        // Test B2 data for first B1
        if (b1Values.length > 0) {
            console.log(`🔍 Testing B2 data for B1: ${b1Values[0]}...`);
            const b2Data = await storage_1.dataService.getB2Data(b1Values[0]);
            console.log('B2 Data:', b2Data);
        }
        console.log('✅ All tests passed!');
    }
    catch (error) {
        console.error('❌ Error:', error);
    }
    finally {
        await mongoose_1.default.disconnect();
        console.log('🔌 Disconnected from MongoDB');
    }
}
// Run the test
if (require.main === module) {
    testDatabaseConnection();
}
//# sourceMappingURL=testData.js.map