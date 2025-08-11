import { DataEntry, PercentageConfig, PhoneBrand, User } from '../models';
import { DataEntry as IDataEntry, PhoneBrand as IPhoneBrand } from '../types';

class DataService {
  // Data methods
  async getAllData(): Promise<IDataEntry[]> {
    const data = await DataEntry.find().lean();
    return data.map(item => ({
      _id: item._id?.toString(),
      B1: item.B1,
      B2: item.B2,
      B3: item.B3,
      detail: item.detail
    }));
  }

  async setData(data: IDataEntry[]): Promise<void> {
    // Clear all existing data and percentage configurations
    await DataEntry.deleteMany({});
    await PercentageConfig.deleteMany({});
    
    // Insert new data
    await DataEntry.insertMany(data);
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

  // B1 values (unique, sorted)
  async getB1Values(): Promise<string[]> {
    const values = await DataEntry.distinct('B1');
    return values.sort();
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

  // Get B2 values with percentages
  async getB2Data(b1Value: string): Promise<Array<{ value: string; count: number; totalCount: number; percentage: number }>> {
    console.log(`[Backend] Getting B2 data for B1: ${b1Value}`);
    
    const allData = await this.getAllData();
    const filteredData = allData.filter(item => item.B1 === b1Value);
    
    console.log(`[Backend] Found ${filteredData.length} entries for B1: ${b1Value}`);
    
    // Count occurrences
    const b2Counts: { [key: string]: number } = {};
    filteredData.forEach(item => {
      b2Counts[item.B2] = (b2Counts[item.B2] || 0) + 1;
    });
    
    const totalCount = filteredData.length;
    console.log(`[Backend] B2 counts:`, b2Counts);
    
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
    const result = Object.entries(b2Counts).map(([value, count]) => {
      const naturalPercentage = Math.round((count / totalCount) * 100);
      const configuredPercentage = configMap[value];
      
      return {
        value,
        count,
        totalCount,
        percentage: configuredPercentage !== undefined ? configuredPercentage : naturalPercentage
      };
    });
    
    console.log(`[Backend] B2 data result for B1 ${b1Value}:`, result);
    return result;
  }

  // Get B3 values with percentages
  async getB3Data(b1Value: string, b2Value: string): Promise<Array<{ value: string; count: number; totalCount: number; percentage: number }>> {
    console.log(`[Backend] Getting B3 data for B1: ${b1Value}, B2: ${b2Value}`);
    
    const allData = await this.getAllData();
    const filteredData = allData.filter(item => item.B1 === b1Value && item.B2 === b2Value);
    
    console.log(`[Backend] Found ${filteredData.length} entries for B1: ${b1Value}, B2: ${b2Value}`);
    
    // Count occurrences
    const b3Counts: { [key: string]: number } = {};
    filteredData.forEach(item => {
      b3Counts[item.B3] = (b3Counts[item.B3] || 0) + 1;
    });
    
    const totalCount = filteredData.length;
    console.log(`[Backend] B3 counts:`, b3Counts);
    
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
    const result = Object.entries(b3Counts).map(([value, count]) => {
      const naturalPercentage = Math.round((count / totalCount) * 100);
      const configuredPercentage = configMap[value];
      
      return {
        value,
        count,
        totalCount,
        percentage: configuredPercentage !== undefined ? configuredPercentage : naturalPercentage
      };
    });
    
    console.log(`[Backend] B3 data result for B1 ${b1Value}, B2 ${b2Value}:`, result);
    return result;
  }

  // Get details for B3
  async getB3Details(b1Value: string, b2Value: string, b3Value: string): Promise<string[]> {
    const entries = await DataEntry.find({
      B1: b1Value,
      B2: b2Value,
      B3: b3Value
    }).lean();
    
    return entries.map(entry => entry.detail).filter(detail => detail);
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
      
      console.log(`[Backend] B3 percentage saved successfully: B1=${b1Value}, B2=${b2Value}, value=${value} = ${percentage}%`);
      console.log(`[Backend] Result:`, result);
    } catch (error) {
      console.error(`[Backend] Error saving B3 percentage:`, error);
      throw error;
    }
  }

  // Phone brands methods
  async getPhoneBrands(): Promise<IPhoneBrand[]> {
    const brands = await PhoneBrand.find().lean();
    return brands.map(brand => ({
      _id: brand._id?.toString(),
      name: brand.name,
      percentage: brand.percentage
    }));
  }

  async addPhoneBrand(brand: Omit<IPhoneBrand, '_id'>): Promise<IPhoneBrand> {
    const newBrand = new PhoneBrand(brand);
    await newBrand.save();
    return {
      _id: newBrand._id?.toString(),
      name: newBrand.name,
      percentage: newBrand.percentage
    };
  }

  async updatePhoneBrand(id: string, updates: Partial<Omit<IPhoneBrand, '_id'>>): Promise<IPhoneBrand | null> {
    const brand = await PhoneBrand.findByIdAndUpdate(id, updates, { new: true }).lean();
    if (!brand) return null;
    
    return {
      _id: brand._id?.toString(),
      name: brand.name,
      percentage: brand.percentage
    };
  }

  async deletePhoneBrand(id: string): Promise<boolean> {
    const result = await PhoneBrand.findByIdAndDelete(id);
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