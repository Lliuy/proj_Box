/**
 * 杭州炫火科技有限公司 zwx@xfire.mobi
 * 有序队列
 *      比较函数返回值约定：
 *          大于返回正数
 *          小于返回负数
 *          其他（等于）返回0
 *
 * 1.0.0
 *      2019年9月19日
 *      首发
 *
 */

export default class XSortedQueue<TypeItem> {
    public items: TypeItem[] = [];
    private comparer: (item1: TypeItem, item2: TypeItem) => number = null;

    public constructor(comparer?: (item1: TypeItem, item2: TypeItem) => number) {
        this.comparer = comparer;
        if (this.comparer == null) {
            this.comparer = (i1, i2) => {
                let any1 = i1 as any;
                let any2 = i2 as any;
                return any1 < any2 ? -1 : any1 > any2 ? 1 : 0;
            };
        }
    }

    public clear() {
        this.items = [];
    }

    public get length() {
        return this.items.length;
    }

    public push(itemOrItems: TypeItem | TypeItem[]): void {
        if (Array.isArray(itemOrItems)) {
            let items = itemOrItems as TypeItem[];
            for (let item of items) {
                this.binaryInsert(item);
            }
        }
        else {
            this.binaryInsert(itemOrItems as TypeItem);
        }
    }

    public popHead(): TypeItem {
        return this.items.shift();
    }

    public popTail(): TypeItem {
        return this.items.pop();
    }

    /**
     * 折半插入
     */
    private binaryInsert(item: TypeItem) {
        let low = 0;
        let high = this.items.length - 1;
        let comparer = this.comparer;
        let items = this.items;
        while (low <= high) {
            let mid = (low + high) >> 1;
            if (comparer(item, items[mid]) < 0) {
                high = mid - 1;
            }
            else {
                low = mid + 1;
            }
        }
        // 插入位置为high+1
        items.splice(high + 1, 0, item);
    }
}
