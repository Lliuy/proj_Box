/**
 * 四叉树对象。
 * 象限索引编号如下：
 *     |
 *   1 | 0
 * ----+----
 *   2 | 3
 *     |
 *
 * 【约定】：
 *      坐标系y轴向上，x轴向右
 */

const enum Quadrant{
    Invalid = -1,
    RightTop = 0,
    LeftTop = 1,
    LeftBottom = 2,
    RightBottom = 3
}

interface Node<TypeItem> {
    x: number;
    y: number;
    width: number;
    height: number;
    item: TypeItem;
}

export default class QuadTree<TypeItem> {
    private maxNodesPerLevel = 10;                  // 每个节点能容纳的最多对象超过 则分割4个节点, 我们并不是事先就分好格子， 而是在插入对象的时候才进行划分。
    private maxLevels = 5;                          // 四叉树的最大层数 超过 则不再划分 从根节点开始 最多6 层。
    private subTrees: QuadTree<TypeItem>[] = [];                // 4个子节点队列。
    private boundBox = { x: 0, y: 0, width: 0, height: 0 };     // 当前节点所表示的2d区域的范围
    private nodes: Node<TypeItem>[] = [];           // 当前节点内的待检测的对象。
    private curLevel = 0;                           // 当前层数
    private itemBoundBoxGetter: (item: TypeItem) => {x: number; y: number; width: number; height: number} = null;

    public constructor(itemBoundBoxGetter?: (item: TypeItem) => {x: number; y: number; width: number; height: number},
        maxNodesPerLevel?: number,
        maxLevels?: number)
    {
        if (itemBoundBoxGetter) {
            this.itemBoundBoxGetter = itemBoundBoxGetter;
        }
        else {
            this.itemBoundBoxGetter = (item) => {
                let x = (item as any).x;
                let y = (item as any).y;
                let width = (item as any).width;
                let height = (item as any).height;
                return {x, y, width, height};
            };
        }
        if (maxNodesPerLevel) {
            this.maxNodesPerLevel = Math.max(4, maxNodesPerLevel);
        }
        if (maxLevels) {
            this.maxLevels = Math.max(2, maxLevels);
        }
    }

    public init(boundBox: {x: number; y: number; width: number; height: number}, level: number) {
        this.boundBox = boundBox || { x: 0, y: 0, width: 0, height: 0 };
        this.curLevel = level || 0;
    }

    /*
     * Clears the quadTree and all nodes of objects
     * 清除quadTree和对象的所有节点
     */
    public clear () {
        this.nodes = [];
        for (let tree of this.subTrees) {
            tree.clear();
        }
        this.subTrees = [];
    }

    /*
     * Get all objects in the quadTree
     * 获取quadTree中的所有对象
     */
    public getAllItems (): TypeItem[] {
        let ret: TypeItem[] = [];
        this._getAllItems(ret);
        return ret;
    }

    /**
     * 使用指定对象与四叉树内所有对象进行碰撞测试，返回与指定对象碰撞的所有对象
     * @param testItem 待碰撞检测的对象
     */
    public collisionTest (testItem: TypeItem): TypeItem[] {
        let bbox = this.itemBoundBoxGetter(testItem);
        let node = {x: bbox.x, y: bbox.y, width: bbox.width, height: bbox.height, item: testItem};
        let ret: TypeItem[] = [];
        this._collisionTest(node, ret);
        return ret;
    }

    /**
     * 添加项
     * @param item 待插入项
     */
    public insert (item: TypeItem | TypeItem[]) {
        if (item instanceof Array) { // 使用 instanceof 就是判断一个实例是否属于某种类型
            for (const i of item) {
                this.insert(i);
            }
            return;
        }
        let bbox = this.itemBoundBoxGetter(item);
        let node = {x: bbox.x, y: bbox.y, width: bbox.width, height: bbox.height, item};
        this._insert(node);
    }

    /*
     * 将节点拆分为4个子节点
     */
    private split () {
        let width = this.boundBox.width / 2;
        let height = this.boundBox.height / 2;

        this.subTrees[Quadrant.RightTop] = new QuadTree();
        this.subTrees[Quadrant.LeftTop] = new QuadTree();
        this.subTrees[Quadrant.LeftBottom] = new QuadTree();
        this.subTrees[Quadrant.RightBottom] = new QuadTree();
        this.subTrees[Quadrant.RightTop].init({x: this.boundBox.x + width, y: this.boundBox.y + height, width, height}, this.curLevel + 1);
        this.subTrees[Quadrant.LeftTop].init({ x: this.boundBox.x, y: this.boundBox.y + height, width, height}, this.curLevel + 1);
        this.subTrees[Quadrant.LeftBottom].init({ x: this.boundBox.x, y: this.boundBox.y, width, height}, this.curLevel + 1);
        this.subTrees[Quadrant.RightBottom].init({ x: this.boundBox.x + width, y: this.boundBox.y, width, height}, this.curLevel + 1);

        let newAry: Node<TypeItem>[] = [];
        for (let node of this.nodes) {
            let quadrant = this.getQuadrant(node);
            if (quadrant !== Quadrant.Invalid) {
                this.subTrees[quadrant]._insert(node);
            }
            else {
                newAry.push(node);
            }
        }
        this.nodes = newAry;
    }

    /**
     * 判断对象所属象限
     */
    private getQuadrant (node: Node<TypeItem>): Quadrant {
        let hCenter = this.boundBox.x + this.boundBox.width / 2;
        let vCenter = this.boundBox.y + this.boundBox.height / 2;

        let inTop = node.y >= vCenter;
        let inBottom = (node.y + node.height) <= vCenter;
        let inRight = node.x >= hCenter;
        let inLeft = (node.x + node.width) <= hCenter;
        // 按象限顺序优先返回
        if (inTop && inRight) {
            return Quadrant.RightTop;
        }
        else if (inTop && inLeft) {
            return Quadrant.LeftTop;
        }
        else if (inBottom && inLeft) {
            return Quadrant.LeftBottom;
        }
        else if (inBottom && inRight) {
            return Quadrant.RightBottom;
        }
        return Quadrant.Invalid;
    }

    private _insert(node: Node<TypeItem>) {
        if (this.subTrees.length) {
            let quadrant = this.getQuadrant(node);
            if (quadrant !== Quadrant.Invalid) {
                this.subTrees[quadrant]._insert(node);
                return;
            }
        }
        this.nodes.push(node);

        // 判断是否需要分叉
        if (this.subTrees.length === 0 && this.nodes.length > this.maxNodesPerLevel && (this.curLevel + 1) < this.maxLevels) {
            this.split();
        }
    }

    private _getAllItems(ret: TypeItem[]) {
        for (let tree of this.subTrees) {
            tree._getAllItems(ret);
        }
        for (let node of this.nodes) {
            ret.push(node.item);
        }
    }

    private _collisionTest(testNode: Node<TypeItem>, ret: TypeItem[]) {
        let hCenter = this.boundBox.x + this.boundBox.width / 2;
        let vCenter = this.boundBox.y + this.boundBox.height / 2;

        if (this.subTrees.length) {
            let left = testNode.x;
            let right = testNode.x + testNode.width;
            let top = testNode.y + testNode.height;
            let bottom = testNode.y;

            if (this.subTrees[Quadrant.RightTop] && right >= hCenter && top >= vCenter) {
                this.subTrees[Quadrant.RightTop]._collisionTest(testNode, ret);
            }
            if (this.subTrees[Quadrant.LeftTop] && left <= hCenter && top >= vCenter) {
                this.subTrees[Quadrant.LeftTop]._collisionTest(testNode, ret);
            }
            if (this.subTrees[Quadrant.LeftBottom] && left <= hCenter && bottom <= vCenter) {
                this.subTrees[Quadrant.LeftBottom]._collisionTest(testNode, ret);
            }
            if (this.subTrees[Quadrant.RightBottom] && right >= hCenter && bottom <= vCenter) {
                this.subTrees[Quadrant.RightBottom]._collisionTest(testNode, ret);
            }
        }

        for (let node of this.nodes) {
            if (this.testTwoItems(testNode, node)) {
                ret.push(node.item);
            }
        }
    }

    private testTwoItems(node1: Node<TypeItem>, node2: Node<TypeItem>): boolean {
        return !(
            (node1.x > (node2.x + node2.width)) ||
            (node2.x > (node1.x + node1.width)) ||
            (node1.y > (node2.y + node2.height)) ||
            (node2.y > (node1.y + node1.height))
        );
    }
}
