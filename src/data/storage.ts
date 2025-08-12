import { DataEntry, PercentageConfig, PhoneBrand, User } from '../models';
import { DataEntry as IDataEntry, PhoneBrand as IPhoneBrand, GroupedB3Detail } from '../types';

// Simple in-memory cache
interface CacheItem<T> {
  data: T;
  timestamp: number;
  ttl: number; // time to live in milliseconds
}

class DataService {
  private cache: Map<string, CacheItem<any>> = new Map();
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes

  private getCacheKey(prefix: string, ...params: string[]): string {
    return `${prefix}:${params.join(':')}`;
  }

  private isValidCacheItem<T>(item: CacheItem<T>): boolean {
    return Date.now() - item.timestamp < item.ttl;
  }

  private getFromCache<T>(key: string): T | null {
    const item = this.cache.get(key);
    if (item && this.isValidCacheItem(item)) {
      return item.data;
    }
    if (item) {
      this.cache.delete(key); // Remove expired item
    }
    return null;
  }

  private setCache<T>(key: string, data: T, ttl: number = this.DEFAULT_TTL): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  private clearCacheByPrefix(prefix: string): void {
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
      }
    }
  }

  // Force clear specific cache key
  forceClearCache(key: string): void {
    this.cache.delete(key);
    console.log(`[Backend] Force cleared cache for key: ${key}`);
  }

  // Data methods
  async getAllData(): Promise<IDataEntry[]> {
    const cacheKey = this.getCacheKey('allData');
    const cached = this.getFromCache<IDataEntry[]>(cacheKey);
    if (cached) {
      return cached;
    }

    const data = await DataEntry.find().lean();
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

  async setData(data: IDataEntry[]): Promise<void> {
    // Clear all existing data and percentage configurations
    await DataEntry.deleteMany({});
    await PercentageConfig.deleteMany({});
    
    // Insert new data
    await DataEntry.insertMany(data);

    // Clear all cache when data is updated
    this.cache.clear();
  }

  async addDataEntry(entry: IDataEntry): Promise<void> {
    const dataEntry = new DataEntry(entry);
    await dataEntry.save();
  }

  async clearData(): Promise<void> {
    await DataEntry.deleteMany({});
    await PercentageConfig.deleteMany({});
  }

  // Clear all admin configurations (percentages)
  async clearAllConfigurations(): Promise<void> {
    await PercentageConfig.deleteMany({});
    // Clear all percentage-related cache
    this.clearCacheByPrefix('b2Data');
    this.clearCacheByPrefix('b3Data');
  }

  // Migration method to fix schema conflicts
  async migratePercentageConfigs(): Promise<void> {
    try {
      console.log('[Migration] Starting percentage config migration...');
      
      // Drop the entire collection to remove old indexes
      await PercentageConfig.collection.drop();
      console.log('[Migration] Dropped old percentage configs collection');
      
      // The collection will be recreated automatically with new schema when first document is inserted
      console.log('[Migration] Migration completed successfully');
    } catch (error: any) {
      if (error.message.includes('ns not found')) {
        console.log('[Migration] Collection does not exist, no migration needed');
      } else {
        console.error('[Migration] Error during migration:', error);
        throw error;
      }
    }
  }

  // Get B1 values
  async getB1Values(): Promise<string[]> {
    const cacheKey = this.getCacheKey('b1Values');
    const cached = this.getFromCache<string[]>(cacheKey);
    if (cached) {
      return cached;
    }

    const values = await DataEntry.distinct('B1');
    
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
  async getDataByB1(b1Value: string): Promise<IDataEntry[]> {
    const data = await DataEntry.find({ B1: b1Value }).lean();
    return data.map(item => ({
      _id: item._id?.toString(),
      B1: item.B1,
      B2: item.B2,
      B3: item.B3,
      detail: item.detail
    }));
  }

  // Get B2 values with percentages - OPTIMIZED
  async getB2Data(b1Value: string): Promise<Array<{ value: string; count: number; totalCount: number; percentage: number }>> {
    console.log(`[Backend] Getting B2 data for B1: ${b1Value}`);
    
    const cacheKey = this.getCacheKey('b2Data', b1Value);
    const cached = this.getFromCache<Array<{ value: string; count: number; totalCount: number; percentage: number }>>(cacheKey);
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

    const aggregationResult = await DataEntry.aggregate(pipeline);
    
    if (aggregationResult.length === 0) {
      return [];
    }

    const { items, totalCount } = aggregationResult[0];
    console.log(`[Backend] Found ${items.length} B2 values, total ${totalCount} entries for B1: ${b1Value}`);

    // Load percentage configs specific to this B1
    const percentageConfigs = await PercentageConfig.find({ 
      type: 'B2', 
      B1: b1Value 
    }).lean();
    
    console.log(`[Backend] Found ${percentageConfigs.length} B2 percentage configs for B1: ${b1Value}`);
    
    const configMap: { [key: string]: number } = {};
    percentageConfigs.forEach(config => {
      configMap[config.value] = config.percentage;
    });
    
    // Build result with configured or natural percentages
    const result = items.map(({ value, count }: { value: string; count: number }) => {
      const naturalPercentage = Math.round((count / totalCount) * 100);
      const configuredPercentage = configMap[value];
      
      return {
        value,
        count,
        totalCount,
        percentage: configuredPercentage !== undefined ? configuredPercentage : naturalPercentage
      };
    })
    .sort((a: { value: string; count: number; totalCount: number; percentage: number }, 
           b: { value: string; count: number; totalCount: number; percentage: number }) => 
           b.percentage - a.percentage); // Sort by percentage descending (highest first)
    
    console.log(`[Backend] B2 data result for B1 ${b1Value} (sorted by % desc):`, result);
    
    // Cache with shorter TTL for data queries
    this.setCache(cacheKey, result, 2 * 60 * 1000); // 2 minutes
    return result;
  }

  // Get B3 values with percentages - OPTIMIZED
  async getB3Data(b1Value: string, b2Value: string): Promise<Array<{ value: string; count: number; totalCount: number; percentage: number }>> {
    console.log(`[Backend] Getting B3 data for B1: ${b1Value}, B2: ${b2Value}`);
    
    const cacheKey = this.getCacheKey('b3Data', b1Value, b2Value);
    const cached = this.getFromCache<Array<{ value: string; count: number; totalCount: number; percentage: number }>>(cacheKey);
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

    const aggregationResult = await DataEntry.aggregate(pipeline);
    
    if (aggregationResult.length === 0) {
      return [];
    }

    const { items, totalCount } = aggregationResult[0];
    console.log(`[Backend] Found ${items.length} B3 values, total ${totalCount} entries for B1: ${b1Value}, B2: ${b2Value}`);

    // Load percentage configs specific to this B1 and B2 combination
    const percentageConfigs = await PercentageConfig.find({ 
      type: 'B3', 
      B1: b1Value,
      B2: b2Value 
    }).lean();
    
    console.log(`[Backend] Found ${percentageConfigs.length} B3 percentage configs for B1: ${b1Value}, B2: ${b2Value}`);
    
    const configMap: { [key: string]: number } = {};
    percentageConfigs.forEach(config => {
      configMap[config.value] = config.percentage;
    });
    
    // Build result with configured or natural percentages
    const result = items.map(({ value, count }: { value: string; count: number }) => {
      const naturalPercentage = Math.round((count / totalCount) * 100);
      const configuredPercentage = configMap[value];
      
      return {
        value,
        count,
        totalCount,
        percentage: configuredPercentage !== undefined ? configuredPercentage : naturalPercentage
      };
    })
    .sort((a: { value: string; count: number; totalCount: number; percentage: number }, 
           b: { value: string; count: number; totalCount: number; percentage: number }) => 
           b.percentage - a.percentage); // Sort by percentage descending (highest first)
    
    console.log(`[Backend] B3 data result for B1 ${b1Value}, B2 ${b2Value} (sorted by % desc):`, result);
    
    // Cache with shorter TTL for data queries
    this.setCache(cacheKey, result, 2 * 60 * 1000); // 2 minutes
    return result;
  }

  // Get details for B3 - OPTIMIZED with grouping and percentages
  async getB3Details(b1Value: string, b2Value: string, b3Value: string): Promise<GroupedB3Detail[]> {
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
    const entries = await DataEntry.find({
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
    const groupedDetails = new Map<string, number>();
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
      .map(([detail, count]) => ({ detail: detail.substring(0, 50) + '...', count }))
    );

    const totalCount = details.length;
    
    // Get configured percentages for these details
    const configuredPercentages = await PercentageConfig.find({
      type: 'B3_DETAIL',
      B1: b1Value,
      B2: b2Value,
      B3: b3Value
    }).lean();

    const configMap = new Map(
      configuredPercentages.map(config => [config.value, config.percentage])
    );

    // Convert to result format with percentages
    const result: GroupedB3Detail[] = Array.from(groupedDetails.entries()).map(([detail, count]) => ({
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
  async updateB3DetailPercentage(b1Value: string, b2Value: string, b3Value: string, detail: string, percentage: number): Promise<void> {
    console.log(`[Backend] Updating B3 detail percentage: B1=${b1Value}, B2=${b2Value}, B3=${b3Value}, detail="${detail}" = ${percentage}%`);
    
    try {
      const result = await PercentageConfig.findOneAndUpdate(
        {
          type: 'B3_DETAIL',
          B1: b1Value,
          B2: b2Value,
          B3: b3Value,
          value: detail
        },
        {
          type: 'B3_DETAIL',
          B1: b1Value,
          B2: b2Value,
          B3: b3Value,
          value: detail,
          percentage
        },
        { upsert: true, new: true }
      );

      console.log(`[Backend] B3 detail percentage saved successfully:`, result);

      // Clear ALL related cache entries
      this.clearCacheByPrefix(`b3Details:${b1Value}:${b2Value}:${b3Value}`);
      this.clearCacheByPrefix(`b3Details`);
      
      // Also clear any test endpoints cache
      this.clearCacheByPrefix(`test:b3Details`);
      this.clearCacheByPrefix(`grouped:b3Details`);
      
      console.log(`[Backend] Cache cleared for B3 details: B1=${b1Value}, B2=${b2Value}, B3=${b3Value}`);
    } catch (error) {
      console.error(`[Backend] Error updating B3 detail percentage:`, error);
      throw error;
    }
  }

  // Percentage config methods
  async updateB2Percentage(b1Value: string, value: string, percentage: number): Promise<void> {
    try {
      console.log(`[Backend] Saving B2 percentage: B1=${b1Value}, value=${value} = ${percentage}%`);
      
      const result = await PercentageConfig.findOneAndUpdate(
        { type: 'B2', B1: b1Value, value },
        { percentage },
        { upsert: true, new: true }
      );
      
      // Clear related cache entries
      this.clearCacheByPrefix(`b2Data:${b1Value}`);
      
      console.log(`[Backend] B2 percentage saved successfully: B1=${b1Value}, value=${value} = ${percentage}%`);
      console.log(`[Backend] Result:`, result);
    } catch (error) {
      console.error(`[Backend] Error saving B2 percentage:`, error);
      throw error;
    }
  }

  async updateB3Percentage(b1Value: string, b2Value: string, value: string, percentage: number): Promise<void> {
    try {
      console.log(`[Backend] Saving B3 percentage: B1=${b1Value}, B2=${b2Value}, value=${value} = ${percentage}%`);
      
      const result = await PercentageConfig.findOneAndUpdate(
        { type: 'B3', B1: b1Value, B2: b2Value, value },
        { percentage },
        { upsert: true, new: true }
      );
      
      // Clear related cache entries
      this.clearCacheByPrefix(`b3Data:${b1Value}:${b2Value}`);
      
      console.log(`[Backend] B3 percentage saved successfully: B1=${b1Value}, B2=${b2Value}, value=${value} = ${percentage}%`);
      console.log(`[Backend] Result:`, result);
    } catch (error) {
      console.error(`[Backend] Error saving B3 percentage:`, error);
      throw error;
    }
  }

  // Phone brands methods - with caching
  async getPhoneBrands(): Promise<IPhoneBrand[]> {
    const cacheKey = this.getCacheKey('phoneBrands');
    const cached = this.getFromCache<IPhoneBrand[]>(cacheKey);
    if (cached) {
      return cached;
    }

    const brands = await PhoneBrand.find().lean();
    const result = brands.map(brand => ({
      _id: brand._id?.toString(),
      name: brand.name,
      percentage: brand.percentage
    }))
    .sort((a: IPhoneBrand, b: IPhoneBrand) => b.percentage - a.percentage); // Sort by percentage descending

    console.log('[Backend] Phone brands sorted by percentage desc:', result);
    this.setCache(cacheKey, result);
    return result;
  }

  async addPhoneBrand(brand: Omit<IPhoneBrand, '_id'>): Promise<IPhoneBrand> {
    const newBrand = new PhoneBrand(brand);
    await newBrand.save();
    
    // Clear phone brands cache
    this.clearCacheByPrefix('phoneBrands');
    
    return {
      _id: newBrand._id?.toString(),
      name: newBrand.name,
      percentage: newBrand.percentage
    };
  }

  async updatePhoneBrand(id: string, updates: Partial<Omit<IPhoneBrand, '_id'>>): Promise<IPhoneBrand | null> {
    const brand = await PhoneBrand.findByIdAndUpdate(id, updates, { new: true }).lean();
    if (!brand) return null;
    
    // Clear phone brands cache
    this.clearCacheByPrefix('phoneBrands');
    
    return {
      _id: brand._id?.toString(),
      name: brand.name,
      percentage: brand.percentage
    };
  }

  async deletePhoneBrand(id: string): Promise<boolean> {
    const result = await PhoneBrand.findByIdAndDelete(id);
    
    if (result) {
      // Clear phone brands cache
      this.clearCacheByPrefix('phoneBrands');
    }
    
    return !!result;
  }

  // User methods
  async getUserByUsername(username: string): Promise<any> {
    return await User.findOne({ username }).lean();
  }

  async getUserById(id: string): Promise<any> {
    return await User.findById(id).lean();
  }
}

export const dataService = new DataService(); 