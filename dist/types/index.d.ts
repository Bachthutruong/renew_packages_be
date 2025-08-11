import { Document } from 'mongoose';
export interface ExcelRow {
    B1: string;
    B2: string;
    B3: string;
    'Chi tiết của B3': string;
}
export interface IDataEntry extends Document {
    B1: string;
    B2: string;
    B3: string;
    detail: string;
    createdAt: Date;
    updatedAt: Date;
}
export interface IPercentageConfig extends Document {
    type: 'B2' | 'B3';
    B1: string;
    B2?: string;
    value: string;
    percentage: number;
    createdAt: Date;
    updatedAt: Date;
}
export interface IPhoneBrand extends Document {
    name: string;
    percentage: number;
    createdAt: Date;
    updatedAt: Date;
}
export interface IUser extends Document {
    username: string;
    password: string;
    role: 'admin' | 'user';
    createdAt: Date;
    updatedAt: Date;
}
export interface DataEntry {
    _id?: string;
    B1: string;
    B2: string;
    B3: string;
    detail: string;
}
export interface PercentageConfig {
    B2: {
        [key: string]: number;
    };
    B3: {
        [key: string]: number;
    };
}
export interface PhoneBrand {
    _id?: string;
    name: string;
    percentage: number;
}
export interface User {
    _id?: string;
    username: string;
    password: string;
    role: 'admin' | 'user';
}
export interface FilteredData {
    B1Values: string[];
    B2Data: {
        value: string;
        percentage: number;
    }[];
    B3Data: {
        value: string;
        percentage: number;
    }[];
}
export interface AdminSettings {
    percentageConfigs: PercentageConfig;
    phoneBrands: PhoneBrand[];
}
//# sourceMappingURL=index.d.ts.map