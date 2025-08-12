"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dataService = void 0;
const models_1 = require("../models");
class DataService {
    constructor() {
        this.cache = new Map();
        this.DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes
    }
    getCacheKey(prefix, ...params) {
        return `${prefix}:${params.join(':')}`;
    }
    isValidCacheItem(item) {
        return Date.now() - item.timestamp < item.ttl;
    }
    getFromCache(key) {
        const item = this.cache.get(key);
        if (item && this.isValidCacheItem(item)) {
            return item.data;
        }
        if (item) {
            this.cache.delete(key); // Remove expired item
        }
        return null;
    }
    setCache(key, data, ttl = this.DEFAULT_TTL) {
        this.cache.set(key, {
            data,
            timestamp: Date.now(),
            ttl
        });
    }
    clearCacheByPrefix(prefix) {
        for (const key of this.cache.keys()) {
            if (key.startsWith(prefix)) {
                this.cache.delete(key);
            }
        }
    }
    // Force clear specific cache key
    forceClearCache(key) {
        this.cache.delete(key);
        console.log(`[Backend] Force cleared cache for key: ${key}`);
    }
    // Data methods
    async getAllData() {
        const cacheKey = this.getCacheKey('allData');
        const cached = this.getFromCache(cacheKey);
        if (cached) {
            return cached;
        }
        const data = await models_1.DataEntry.find().lean();
        const result = data.map(item => ({
            _id: item._id?.toString(),
            B1: item.B1,
            B2: item.B2,
            B3: item.B3,
            detail: item.detail
        }));
        this.setCache(cacheKey, result);
        return result;
    }
    async setData(data) {
        // Clear all existing data and percentage configurations
        await models_1.DataEntry.deleteMany({});
        await models_1.PercentageConfig.deleteMany({});
        // Insert new data
        await models_1.DataEntry.insertMany(data);
        // Clear all cache when data is updated
        this.cache.clear();
    }
    async addDataEntry(entry) {
        const dataEntry = new models_1.DataEntry(entry);
        await dataEntry.save();
    }
    async clearData() {
        await models_1.DataEntry.deleteMany({});
        await models_1.PercentageConfig.deleteMany({});
    }
    // Clear all admin configurations (percentages)
    async clearAllConfigurations() {
        await models_1.PercentageConfig.deleteMany({});
        // Clear all percentage-related cache
        this.clearCacheByPrefix('b2Data');
        this.clearCacheByPrefix('b3Data');
    }
    // Migration method to fix schema conflicts
    async migratePercentageConfigs() {
        try {
            console.log('[Migration] Starting percentage config migration...');
            // Drop the entire collection to remove old indexes
            await models_1.PercentageConfig.collection.drop();
            console.log('[Migration] Dropped old percentage configs collection');
            // The collection will be recreated automatically with new schema when first document is inserted
            console.log('[Migration] Migration completed successfully');
        }
        catch (error) {
            if (error.message.includes('ns not found')) {
                console.log('[Migration] Collection does not exist, no migration needed');
            }
            else {
                console.error('[Migration] Error during migration:', error);
                throw error;
            }
        }
    }
    // Get B1 values
    async getB1Values() {
        const cacheKey = this.getCacheKey('b1Values');
        const cached = this.getFromCache(cacheKey);
        if (cached) {
            return cached;
        }
        const values = await models_1.DataEntry.distinct('B1');
        // Sắp xếp theo thứ tự tăng dần (số trước, chữ sau)
        const sortedValues = values.sort((a, b) => {
            // Thử parse thành số để so sánh số học
            const numA = parseFloat(a.match(/\d+/)?.[0] || '0');
            const numB = parseFloat(b.match(/\d+/)?.[0] || '0');
            if (numA !== numB) {
                return numA - numB; // Sắp xếp theo số
            }
            // Nếu số bằng nhau, sắp xếp theo chữ cái
            return a.localeCompare(b, 'zh-TW', { numeric: true, sensitivity: 'base' });
        });
        console.log('[Backend] Sorted B1 values:', sortedValues);
        this.setCache(cacheKey, sortedValues);
        return sortedValues;
    }
    // Get data filtered by B1
    async getDataByB1(b1Value) {
        const data = await models_1.DataEntry.find({ B1: b1Value }).lean();
        return data.map(item => ({
            _id: item._id?.toString(),
            B1: item.B1,
            B2: item.B2,
            B3: item.B3,
            detail: item.detail
        }));
    }
    // Get B2 values with percentages - OPTIMIZED
    async getB2Data(b1Value) {
        console.log(`[Backend] Getting B2 data for B1: ${b1Value}`);
        const cacheKey = this.getCacheKey('b2Data', b1Value);
        const cached = this.getFromCache(cacheKey);
        if (cached) {
            console.log(`[Backend] Returning cached B2 data for B1: ${b1Value}`);
            return cached;
        }
        // Use MongoDB aggregation for better performance
        const pipeline = [
            { $match: { B1: b1Value } },
            {
                $group: {
                    _id: '$B2',
                    count: { $sum: 1 }
                }
            },
            {
                $group: {
                    _id: null,
                    items: { $push: { value: '$_id', count: '$count' } },
                    totalCount: { $sum: '$count' }
                }
            }
        ];
        const aggregationResult = await models_1.DataEntry.aggregate(pipeline);
        if (aggregationResult.length === 0) {
            return [];
        }
        const { items, totalCount } = aggregationResult[0];
        console.log(`[Backend] Found ${items.length} B2 values, total ${totalCount} entries for B1: ${b1Value}`);
        // Load percentage configs specific to this B1
        const percentageConfigs = await models_1.PercentageConfig.find({
            type: 'B2',
            B1: b1Value
        }).lean();
        console.log(`[Backend] Found ${percentageConfigs.length} B2 percentage configs for B1: ${b1Value}`);
        const configMap = {};
        percentageConfigs.forEach(config => {
            configMap[config.value] = config.percentage;
        });
        // Build result with configured or natural percentages
        const result = items.map(({ value, count }) => {
            const naturalPercentage = Math.round((count / totalCount) * 100);
            const configuredPercentage = configMap[value];
            return {
                value,
                count,
                totalCount,
                percentage: configuredPercentage !== undefined ? configuredPercentage : naturalPercentage
            };
        })
            .sort((a, b) => b.percentage - a.percentage); // Sort by percentage descending (highest first)
        console.log(`[Backend] B2 data result for B1 ${b1Value} (sorted by % desc):`, result);
        // Cache with shorter TTL for data queries
        this.setCache(cacheKey, result, 2 * 60 * 1000); // 2 minutes
        return result;
    }
    // Get B3 values with percentages - OPTIMIZED
    async getB3Data(b1Value, b2Value) {
        console.log(`[Backend] Getting B3 data for B1: ${b1Value}, B2: ${b2Value}`);
        const cacheKey = this.getCacheKey('b3Data', b1Value, b2Value);
        const cached = this.getFromCache(cacheKey);
        if (cached) {
            console.log(`[Backend] Returning cached B3 data for B1: ${b1Value}, B2: ${b2Value}`);
            return cached;
        }
        // Use MongoDB aggregation for better performance
        const pipeline = [
            { $match: { B1: b1Value, B2: b2Value } },
            {
                $group: {
                    _id: '$B3',
                    count: { $sum: 1 }
                }
            },
            {
                $group: {
                    _id: null,
                    items: { $push: { value: '$_id', count: '$count' } },
                    totalCount: { $sum: '$count' }
                }
            }
        ];
        const aggregationResult = await models_1.DataEntry.aggregate(pipeline);
        if (aggregationResult.length === 0) {
            return [];
        }
        const { items, totalCount } = aggregationResult[0];
        console.log(`[Backend] Found ${items.length} B3 values, total ${totalCount} entries for B1: ${b1Value}, B2: ${b2Value}`);
        // Load percentage configs specific to this B1 and B2 combination
        const percentageConfigs = await models_1.PercentageConfig.find({
            type: 'B3',
            B1: b1Value,
            B2: b2Value
        }).lean();
        console.log(`[Backend] Found ${percentageConfigs.length} B3 percentage configs for B1: ${b1Value}, B2: ${b2Value}`);
        const configMap = {};
        percentageConfigs.forEach(config => {
            configMap[config.value] = config.percentage;
        });
        // Build result with configured or natural percentages
        const result = items.map(({ value, count }) => {
            const naturalPercentage = Math.round((count / totalCount) * 100);
            const configuredPercentage = configMap[value];
            return {
                value,
                count,
                totalCount,
                percentage: configuredPercentage !== undefined ? configuredPercentage : naturalPercentage
            };
        })
            .sort((a, b) => b.percentage - a.percentage); // Sort by percentage descending (highest first)
        console.log(`[Backend] B3 data result for B1 ${b1Value}, B2 ${b2Value} (sorted by % desc):`, result);
        // Cache with shorter TTL for data queries
        this.setCache(cacheKey, result, 2 * 60 * 1000); // 2 minutes
        return result;
    }
    // Get details for B3 - OPTIMIZED with grouping and percentages
    async getB3Details(b1Value, b2Value, b3Value) {
        console.log(`[Backend] getB3Details called with:`, { b1Value, b2Value, b3Value });
        const cacheKey = this.getCacheKey('b3Details', b1Value, b2Value, b3Value);
        // Force clear cache for debugging - ALWAYS get fresh data
        this.forceClearCache(cacheKey);
        console.log(`[Backend] Force cleared cache for key: ${cacheKey}`);
        // Don't use cache during debugging
        // const cached = this.getFromCache<GroupedB3Detail[]>(cacheKey);
        // if (cached) {
        //   console.log(`[Backend] Returning cached B3 details, count: ${cached.length}`);
        //   console.log(`[Backend] Cached sample:`, cached[0]);
        //   return cached;
        // }
        console.log(`[Backend] Fetching fresh data from database...`);
        const entries = await models_1.DataEntry.find({
            B1: b1Value,
            B2: b2Value,
            B3: b3Value
        }).select('detail').lean();
        console.log(`[Backend] Found ${entries.length} entries from database`);
        console.log(`[Backend] Sample entries:`, entries.slice(0, 3));
        const details = entries.map(entry => entry.detail).filter(detail => detail && detail.trim());
        console.log(`[Backend] After filtering empty details: ${details.length} remain`);
        console.log(`[Backend] Sample details:`, details.slice(0, 3));
        // Group identical details and count occurrences
        const groupedDetails = new Map();
        details.forEach((detail, index) => {
            const trimmedDetail = detail.trim();
            const currentCount = groupedDetails.get(trimmedDetail) || 0;
            groupedDetails.set(trimmedDetail, currentCount + 1);
            // Log first few grouping operations for debugging
            if (index < 5) {
                console.log(`[Backend] Grouping[${index}]: "${trimmedDetail}" -> count: ${currentCount + 1}`);
            }
        });
        console.log(`[Backend] Grouped into ${groupedDetails.size} unique details from ${details.length} total`);
        console.log(`[Backend] Top 5 groups:`, Array.from(groupedDetails.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([detail, count]) => ({ detail: detail.substring(0, 50) + '...', count })));
        const totalCount = details.length;
        // Get configured percentages for these details
        const configuredPercentages = await models_1.PercentageConfig.find({
            type: 'B3_DETAIL',
            B1: b1Value,
            B2: b2Value,
            B3: b3Value
        }).lean();
        const configMap = new Map(configuredPercentages.map(config => [config.value, config.percentage]));
        // Convert to result format with percentages
        const result = Array.from(groupedDetails.entries()).map(([detail, count]) => ({
            detail,
            count,
            totalCount,
            percentage: totalCount > 0 ? Math.round((count / totalCount) * 100 * 100) / 100 : 0,
            configuredPercentage: configMap.get(detail)
        })).sort((a, b) => b.count - a.count); // Sort by count descending
        console.log(`[Backend] Final result count: ${result.length}`);
        console.log(`[Backend] Result sample:`, result[0]);
        console.log(`[Backend] Result structure check:`, {
            hasDetail: !!result[0]?.detail,
            hasCount: typeof result[0]?.count === 'number',
            hasTotalCount: typeof result[0]?.totalCount === 'number',
            hasPercentage: typeof result[0]?.percentage === 'number'
        });
        // Don't cache during debugging
        // this.setCache(cacheKey, result, 10 * 60 * 1000); // 10 minutes for details
        return result;
    }
    // Update B3 detail percentage
    async updateB3DetailPercentage(b1Value, b2Value, b3Value, detail, percentage) {
        console.log(`[Backend] Updating B3 detail percentage: B1=${b1Value}, B2=${b2Value}, B3=${b3Value}, detail="${detail}" = ${percentage}%`);
        try {
            const result = await models_1.PercentageConfig.findOneAndUpdate({
                type: 'B3_DETAIL',
                B1: b1Value,
                B2: b2Value,
                B3: b3Value,
                value: detail
            }, {
                type: 'B3_DETAIL',
                B1: b1Value,
                B2: b2Value,
                B3: b3Value,
                value: detail,
                percentage
            }, { upsert: true, new: true });
            console.log(`[Backend] B3 detail percentage saved successfully:`, result);
            // Clear ALL related cache entries
            this.clearCacheByPrefix(`b3Details:${b1Value}:${b2Value}:${b3Value}`);
            this.clearCacheByPrefix(`b3Details`);
            // Also clear any test endpoints cache
            this.clearCacheByPrefix(`test:b3Details`);
            this.clearCacheByPrefix(`grouped:b3Details`);
            console.log(`[Backend] Cache cleared for B3 details: B1=${b1Value}, B2=${b2Value}, B3=${b3Value}`);
        }
        catch (error) {
            console.error(`[Backend] Error updating B3 detail percentage:`, error);
            throw error;
        }
    }
    // Percentage config methods
    async updateB2Percentage(b1Value, value, percentage) {
        try {
            console.log(`[Backend] Saving B2 percentage: B1=${b1Value}, value=${value} = ${percentage}%`);
            const result = await models_1.PercentageConfig.findOneAndUpdate({ type: 'B2', B1: b1Value, value }, { percentage }, { upsert: true, new: true });
            // Clear related cache entries
            this.clearCacheByPrefix(`b2Data:${b1Value}`);
            console.log(`[Backend] B2 percentage saved successfully: B1=${b1Value}, value=${value} = ${percentage}%`);
            console.log(`[Backend] Result:`, result);
        }
        catch (error) {
            console.error(`[Backend] Error saving B2 percentage:`, error);
            throw error;
        }
    }
    async updateB3Percentage(b1Value, b2Value, value, percentage) {
        try {
            console.log(`[Backend] Saving B3 percentage: B1=${b1Value}, B2=${b2Value}, value=${value} = ${percentage}%`);
            const result = await models_1.PercentageConfig.findOneAndUpdate({ type: 'B3', B1: b1Value, B2: b2Value, value }, { percentage }, { upsert: true, new: true });
            // Clear related cache entries
            this.clearCacheByPrefix(`b3Data:${b1Value}:${b2Value}`);
            console.log(`[Backend] B3 percentage saved successfully: B1=${b1Value}, B2=${b2Value}, value=${value} = ${percentage}%`);
            console.log(`[Backend] Result:`, result);
        }
        catch (error) {
            console.error(`[Backend] Error saving B3 percentage:`, error);
            throw error;
        }
    }
    // Phone brands methods - with caching
    async getPhoneBrands() {
        const cacheKey = this.getCacheKey('phoneBrands');
        const cached = this.getFromCache(cacheKey);
        if (cached) {
            return cached;
        }
        const brands = await models_1.PhoneBrand.find().lean();
        const result = brands.map(brand => ({
            _id: brand._id?.toString(),
            name: brand.name,
            percentage: brand.percentage
        }))
            .sort((a, b) => b.percentage - a.percentage); // Sort by percentage descending
        console.log('[Backend] Phone brands sorted by percentage desc:', result);
        this.setCache(cacheKey, result);
        return result;
    }
    async addPhoneBrand(brand) {
        const newBrand = new models_1.PhoneBrand(brand);
        await newBrand.save();
        // Clear phone brands cache
        this.clearCacheByPrefix('phoneBrands');
        return {
            _id: newBrand._id?.toString(),
            name: newBrand.name,
            percentage: newBrand.percentage
        };
    }
    async updatePhoneBrand(id, updates) {
        const brand = await models_1.PhoneBrand.findByIdAndUpdate(id, updates, { new: true }).lean();
        if (!brand)
            return null;
        // Clear phone brands cache
        this.clearCacheByPrefix('phoneBrands');
        return {
            _id: brand._id?.toString(),
            name: brand.name,
            percentage: brand.percentage
        };
    }
    async deletePhoneBrand(id) {
        const result = await models_1.PhoneBrand.findByIdAndDelete(id);
        if (result) {
            // Clear phone brands cache
            this.clearCacheByPrefix('phoneBrands');
        }
        return !!result;
    }
    // User methods
    async getUserByUsername(username) {
        return await models_1.User.findOne({ username }).lean();
    }
    async getUserById(id) {
        return await models_1.User.findById(id).lean();
    }
}
exports.dataService = new DataService();
//# sourceMappingURL=storage.js.map