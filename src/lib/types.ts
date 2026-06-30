export * from './api/types';

import { StockDetail, AppSettings, MetaInfo } from './api/types';

// 向下相容類型別名，使其指向新型別，透過型別檢查輔助 UI 的屬性存取路徑修改
export type StockData = StockDetail;
export type SystemSettings = AppSettings;
export type SystemMeta = MetaInfo;
