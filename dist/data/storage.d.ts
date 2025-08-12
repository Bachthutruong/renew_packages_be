import { DataEntry as IDataEntry, PhoneBrand as IPhoneBrand } from '../types';
declare class DataService {
    private cache;
    private readonly DEFAULT_TTL;
    private getCacheKey;
    private isValidCacheItem;
    private getFromCache;
    private setCache;
    private clearCacheByPrefix;
    getAllData(): Promise<IDataEntry[]>;
    setData(data: IDataEntry[]): Promise<void>;
    addDataEntry(entry: IDataEntry): Promise<void>;
    clearData(): Promise<void>;
    clearAllConfigurations(): Promise<void>;
    migratePercentageConfigs(): Promise<void>;
    getB1Values(): Promise<string[]>;
    getDataByB1(b1Value: string): Promise<IDataEntry[]>;
    getB2Data(b1Value: string): Promise<Array<{
        value: string;
        count: number;
        totalCount: number;
        percentage: number;
    }>>;
    getB3Data(b1Value: string, b2Value: string): Promise<Array<{
        value: string;
        count: number;
        totalCount: number;
        percentage: number;
    }>>;
    getB3Details(b1Value: string, b2Value: string, b3Value: string): Promise<string[]>;
    updateB2Percentage(b1Value: string, value: string, percentage: number): Promise<void>;
    updateB3Percentage(b1Value: string, b2Value: string, value: string, percentage: number): Promise<void>;
    getPhoneBrands(): Promise<IPhoneBrand[]>;
    addPhoneBrand(brand: Omit<IPhoneBrand, '_id'>): Promise<IPhoneBrand>;
    updatePhoneBrand(id: string, updates: Partial<Omit<IPhoneBrand, '_id'>>): Promise<IPhoneBrand | null>;
    deletePhoneBrand(id: string): Promise<boolean>;
    getUserByUsername(username: string): Promise<any>;
    getUserById(id: string): Promise<any>;
}
export declare const dataService: DataService;
export {};
//# sourceMappingURL=storage.d.ts.map