import mongoose from 'mongoose';
import { IDataEntry, IPercentageConfig, IPhoneBrand, IUser } from '../types';
export declare const DataEntry: mongoose.Model<IDataEntry, {}, {}, {}, mongoose.Document<unknown, {}, IDataEntry, {}, {}> & IDataEntry & Required<{
    _id: unknown;
}> & {
    __v: number;
}, any>;
export declare const PercentageConfig: mongoose.Model<IPercentageConfig, {}, {}, {}, mongoose.Document<unknown, {}, IPercentageConfig, {}, {}> & IPercentageConfig & Required<{
    _id: unknown;
}> & {
    __v: number;
}, any>;
export declare const PhoneBrand: mongoose.Model<IPhoneBrand, {}, {}, {}, mongoose.Document<unknown, {}, IPhoneBrand, {}, {}> & IPhoneBrand & Required<{
    _id: unknown;
}> & {
    __v: number;
}, any>;
export declare const User: mongoose.Model<IUser, {}, {}, {}, mongoose.Document<unknown, {}, IUser, {}, {}> & IUser & Required<{
    _id: unknown;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=index.d.ts.map