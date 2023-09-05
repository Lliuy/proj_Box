/*******************************************************************************
文件: XListView.ts
创建: 2019年9月5日
作者: 老张(zwx@xfire.mobi)
描述:
    列表组件
    ✦图标模式
        仅支持纵向滚动，图标靠左、靠上对齐
    TODO插入删除
    TODO分页
*******************************************************************************/

const ccapi = cc as any;
const {ccclass, property, playOnFocus, executeInEditMode, menu} = cc._decorator;

class Item<T>{
    public node: cc.Node = null;    // 条目节点
    public index = 0;               // 条目索引 从0开始
    public data: T = null;          // 绑定数据
    public dataChanged = true;      // 数据发生了变化
    public indexChanged = true;     // 索引发生了变化
}

@ccclass
@executeInEditMode
@menu('XFire/XListView')
export default class XListView<TypeData> extends cc.Component {

    @property
    public _prefabItem: cc.Prefab = null;
    @property({
        type: cc.Prefab,
        displayName: CC_DEV && '条目模板',
        tooltip: CC_DEV && '列表中每个条目的创建模板'
    })
    public get prefabItem() {
        return this._prefabItem;
    }
    public set prefabItem(value: cc.Prefab) {
        this._prefabItem = value;
        if (CC_EDITOR) {
            this.node.emit('refreshPreview');
        }
    }

    @property
    public _iconMode = false;
    @property({
        displayName: CC_DEV && '图标模式',
        tooltip: CC_DEV && '图标模式',
        visible: CC_DEV && function() {
            return this != null;
        }
    })
    public get iconMode() {
        return this._iconMode;
    }
    public set iconMode(value: boolean) {
        this._iconMode = value;
        this.horizontal = false;
        if (CC_EDITOR) {
            this.node.emit('refreshPreview');
        }
    }

    @property
    public _horizontal = false;
    @property({
        displayName: CC_DEV && '横向滚动',
        tooltip: CC_DEV && '横向列表',
        visible: CC_DEV && function() {
            return !this.iconMode;
        }
    })
    public get horizontal() {
        return this._horizontal;
    }
    public set horizontal(value: boolean) {
        this._horizontal = value;
        if (CC_EDITOR) {
            this.node.emit('refreshPreview');
        }
    }

    @property
    public _itemWidth = 50;
    @property({
        displayName: CC_DEV && '条目宽',
        tooltip: CC_DEV && '列表中每个条目宽度',
        visible: CC_DEV && function() {
            return this.horizontal || this.iconMode;
        }
    })
    public get itemWidth() {
        return this._itemWidth;
    }
    public set itemWidth(value: number) {
        this._itemWidth = value <= 1 ? 1 : value;
        if (CC_EDITOR) {
            this.node.emit('refreshPreview');
        }
    }

    @property
    public _itemHeight = 50;
    @property({
        displayName: CC_DEV && '条目高',
        tooltip: CC_DEV && '列表中每个条目高度',
        visible: CC_DEV && function() {
            return !this.horizontal || this.iconMode;
        }
    })
    public get itemHeight() {
        return this._itemHeight;
    }
    public set itemHeight(value: number) {
        this._itemHeight = value <= 1 ? 1 : value;
        if (CC_EDITOR) {
            this.node.emit('refreshPreview');
        }
    }

    @property
    public _spacing = 0;
    @property({
        displayName: CC_DEV && '间隔',
        tooltip: CC_DEV && '列表中条目间的间隔'
    })
    public get spacing() {
        return this._spacing;
    }
    public set spacing(value: number) {
        this._spacing = value <= 0 ? 0 : value;
        if (CC_EDITOR) {
            this.node.emit('refreshPreview');
        }
    }

    public scrollView: cc.ScrollView = null;
    private nodeScrollView = new cc.Node();
    private clipRegion = new cc.Node();
    private content = new cc.Node();
    private readonly poolItems: cc.NodePool = new cc.NodePool();
    /** 图标模式下居中显示 */
    private alignCenter = true;

    private scrollContentLastPos = 0;
    private prevStartIndex = -1;
    private prevEndIndex = -1;
    private needUpdate = true;
    private contentSizeChanged = true;

    private items: Item<TypeData>[] = [];
    private setter: (params: {nodeItem: cc.Node; data: TypeData; index: number; indexChanged: boolean; dataChanged: boolean}) => void = null;

    private onFirstActiveCb: () => void = null;

    public onLoad (editorRefresh?: boolean) {
        if (CC_EDITOR) {
            // 不保存
            (this.nodeScrollView as any)._objFlags |= (cc as any).Object.Flags.DontSave;
            // 不显示在编辑器的树结构中
            (this.nodeScrollView as any)._objFlags |= (cc as any).Object.Flags.HideInHierarchy;
            // 不可点击
            (this.nodeScrollView as any)._objFlags |= (cc as any).Object.Flags.LockedInEditor;
            this.nodeScrollView.name = '预览用 不保存 勿修改';
        }
        this.nodeScrollView.parent = this.node;
        this.nodeScrollView.width = this.node.width;
        this.nodeScrollView.height = this.node.height;

        this.scrollView = this.nodeScrollView.addComponent(cc.ScrollView);
        this.scrollView.horizontal = this.horizontal;
        this.scrollView.vertical = !this.horizontal;
        this.scrollView.inertia = true;
        this.scrollView.brake = 0.75;
        this.scrollView.elastic = true;
        this.scrollView.bounceDuration = 0.23;
        this.scrollView.cancelInnerEvents = true;

        this.clipRegion.parent = this.nodeScrollView;
        this.clipRegion.width = this.node.width;
        this.clipRegion.height = this.node.height;
        {
            let cmp = this.clipRegion.addComponent(cc.Mask);
            cmp.type = cc.Mask.Type.RECT;
        }

        this.content.parent = this.clipRegion;
        this.content.width = this.node.width;
        this.content.height = this.node.height;
        if (this.horizontal) {
            this.content.anchorX = 0;
            this.content.anchorY = 0.5;
        }
        else {
            this.content.anchorX = 0.5;
            this.content.anchorY = 1;
        }

        this.scrollView.content = this.content;
        if (this.horizontal) {
            this.scrollView.scrollToPercentHorizontal(0);
        }
        else {
            this.scrollView.scrollToPercentVertical(1);
        }
        if (this.prefabItem) {
            let maxVisibleCount = 0;
            if (this.horizontal) {
                maxVisibleCount = Math.floor(this.content.parent.width / (this.itemWidth + this.spacing)) + 2;
            }
            else {
                maxVisibleCount = Math.floor(this.content.parent.height / (this.itemHeight + this.spacing)) + 2;
            }
            for (let i = 0; i < maxVisibleCount; i++) {
                let node = cc.instantiate(this.prefabItem);
                this.poolItems.put(node);
            }

        }

        if (CC_EDITOR && !editorRefresh) {
            let cb = () => {
                this.clear();
                this.nodeScrollView.destroy();
                this.nodeScrollView = new cc.Node();
                this.nodeScrollView = new cc.Node();
                this.clipRegion = new cc.Node();
                this.content = new cc.Node();
                this.onLoad(true);
                let maxVisibleCount = 0;
                if (this.horizontal) {
                    maxVisibleCount = Math.floor(this.content.parent.width / (this.itemWidth + this.spacing)) + 2;
                }
                else {
                    maxVisibleCount = Math.floor(this.content.parent.height / (this.itemHeight + this.spacing)) + 2;
                }
                maxVisibleCount = Math.min(100, maxVisibleCount);
                for (let i = this.itemCount(); i < maxVisibleCount; i++) {
                    this.addItem(null);
                }
            };

            this.node.on('refreshPreview', cb, this);
            this.node.on(cc.Node.EventType.SIZE_CHANGED, cb, this);
            cb();
        }

    }

    public start() {
        if (this.onFirstActiveCb) {
            setTimeout(() => {
                let cb = this.onFirstActiveCb;
                this.onFirstActiveCb = null;
                cb();
            }, 0);
        }
    }

    public registerSetter(setter: (params: {nodeItem: cc.Node; data: TypeData; index: number; indexChanged: boolean; dataChanged: boolean}) => void): void {
        this.setter = setter;
    }

    public clear() {
        // 回收
        for (let item of this.items) {
            if (item == null || item.node == null) {
                continue;
            }
            this.poolItems.put(item.node);
            item.node = null;
            item.dataChanged = true;
            item.indexChanged = true;
        }
        this.items = [];
        this.needUpdate = true;
        if (this.horizontal) {
            this.content.width = 0;
        }
        else {
            this.content.height = 0;
        }
        this.prevStartIndex = -1;
        this.prevEndIndex = -1;
    }

    public addItem(data: TypeData) {
        let item = new Item<TypeData>();
        item.data = data;
        item.index = this.items.length;
        this.items.push(item);
        this.needUpdate = true;
        this.contentSizeChanged = true;
    }

    public modifyItem(index: number, data: TypeData) {
        let item = this.items[index];
        if (!item) {
            return;
        }
        item.data = data;
        item.dataChanged = true;
        this.needUpdate = true;
    }

    public itemCount(): number {
        return this.items.length;
    }

    public scrollToTop(anim = false) {
        if (!this.horizontal) {
            if (this.scrollView && !this.onFirstActiveCb) {
                this.scrollView.scrollToTop(anim ? 1 : 0);
                return;
            }
            this.onFirstActiveCb = () => {
                this.scrollView.scrollToTop(anim ? 1 : 0);
            };
        }
    }

    public scrollToBottom(anim = false) {
        if (!this.horizontal) {
            if (this.scrollView && !this.onFirstActiveCb) {
                this.scrollView.scrollToBottom(anim ? 1 : 0);
                return;
            }
            this.onFirstActiveCb = () => {
                this.scrollView.scrollToBottom(anim ? 1 : 0);
            };
        }
    }

    public scrollToLeft(anim = false) {
        if (this.horizontal) {
            if (this.scrollView && !this.onFirstActiveCb) {
                this.scrollView.scrollToLeft(anim ? 1 : 0);
                return;
            }
            this.onFirstActiveCb = () => {
                this.scrollView.scrollToLeft(anim ? 1 : 0);
            };
        }
    }

    public scrollToRight(anim = false) {
        if (this.horizontal) {
            if (this.scrollView && !this.onFirstActiveCb) {
                this.scrollView.scrollToRight(anim ? 1 : 0);
                return;
            }
            this.onFirstActiveCb = () => {
                this.scrollView.scrollToRight(anim ? 1 : 0);
            };
        }
    }

    /**
     * 滚动到指定条目
     * @param index 可以带小数，方便做偏移，对icon模式小数无效
     * @param anim 动画
     * @Param animTimeInSecond 可选，动画时间
     */
    public scrollToItem(index: number, anim = false, animTimeInSecond = 1) {
        if (!this.scrollView || this.onFirstActiveCb) {
            this.onFirstActiveCb = () => {
                this.scrollToItem(index, anim);
            };
            return;
        }
        let winSize = this.horizontal ? this.scrollView.node.width : this.scrollView.node.height;
        let contentSize = this.horizontal ? this.content.width : this.content.height;
        let validBegin = winSize / 2;
        let validEnd = contentSize - winSize / 2;
        let validSize = contentSize - winSize;
        // 计算目标位置，这里为了均匀过渡，将一个item的size定义为 半space + item + 半space
        let itemSize = this.spacing + (this.horizontal ? this.itemWidth : this.itemHeight);
        let row = index;
        if (this.iconMode) {
            let rowItemCount = Math.max(1, Math.floor((this.content.width - this.spacing) / (this.itemWidth + this.spacing)));
            row = Math.floor(index / rowItemCount);
        }
        let dstPos = (this.spacing / 2) + itemSize * row + (itemSize / 2);
        let percent = 0;
        if (dstPos <= validBegin) {
            percent = 0;
        }
        else if (dstPos >= validEnd) {
            percent = 1;
        }
        else {
            percent = (dstPos - validBegin) / validSize;
        }
        if (this.horizontal) {
            this.scrollView.scrollToPercentHorizontal(percent, anim ? animTimeInSecond : 0);
        }
        else {
            this.scrollView.scrollToPercentVertical(1 - percent, anim ? animTimeInSecond : 0);
        }
    }

    protected update(dt: number) {
        let scrolled = false;
        let itemSize = 0;
        // 图标模式下，每行item数量
        let rowItemCount = 1;
        let rowCount = this.items.length;
        let pos = 0;
        if (this.horizontal) {
            itemSize = this.itemWidth;
            pos = this.content.x;
        }
        else {
            if (this.iconMode) {
                rowItemCount = Math.max(1, Math.floor((this.content.width - this.spacing) / (this.itemWidth + this.spacing)));
                rowCount = Math.max(1, Math.ceil(rowCount / rowItemCount));
            }
            itemSize = this.itemHeight;
            pos = this.content.y;
        }
        if (this.contentSizeChanged) {
            if (this.horizontal) {
                this.content.width = this.items.length * (this.itemWidth + this.spacing) + this.spacing;
            }
            else {
                this.content.height = rowCount * (this.itemHeight + this.spacing) + this.spacing;
            }
        }
        if (pos !== this.scrollContentLastPos) {
            this.scrollContentLastPos = pos;
            scrolled = true;
        }

        if (!this.needUpdate && !scrolled) {
            return;
        }
        // 确定首个可见item
        let viewFirstInContent = 0;
        let viewLastInContent = 0;
        let startIndex = 0;
        let endIndex = -1;
        if (this.horizontal) {
            viewFirstInContent = this.content.parent.width * this.content.parent.anchorX + pos;
            viewLastInContent = -viewFirstInContent + this.content.parent.width;
            endIndex = Math.min(this.items.length - 1, Math.ceil(viewLastInContent / (itemSize + this.spacing)));
        }
        else {
            viewFirstInContent = this.content.parent.height * (1 - this.content.parent.anchorY) - pos;
            viewLastInContent = viewFirstInContent - this.content.parent.height;
            endIndex = Math.min(rowCount - 1, Math.ceil((-viewLastInContent) / (itemSize + this.spacing)));
        }
        if (viewFirstInContent < 0) {
            startIndex = Math.floor((-viewFirstInContent) / (itemSize + this.spacing));
        }
        // 只是滚动且首尾无变化 则无需刷新
        if (!this.needUpdate && startIndex === this.prevStartIndex && endIndex === this.prevEndIndex) {
            return;
        }
        // 回收首尾
        this.recirlceHeadAndTail(startIndex, endIndex, rowItemCount);

        this.createItemNodes(startIndex, endIndex, itemSize, rowItemCount);
    }

    private recirlceHeadAndTail(startIndex: number, endIndex: number, rowItemCount: number) {
        // 回收头
        for (let i = (startIndex - 1) * rowItemCount; i >= 0; i--) {
            let item = this.items[i];
            if (item == null || item.node == null) {
                continue;
            }
            this.poolItems.put(item.node);
            item.node = null;
            item.dataChanged = true;
            item.indexChanged = true;
        }
        // 回收尾巴
        for (let i = (endIndex + 1) * rowItemCount; i < this.items.length; i++) {
            let item = this.items[i];
            if (item == null || item.node == null) {
                continue;
            }
            this.poolItems.put(item.node);
            item.node = null;
            item.dataChanged = true;
            item.indexChanged = true;
        }
    }

    private createItemNodes(startIndex: number, endIndex: number, itemSize: number, rowItemCount: number) {
        for (let i = startIndex * rowItemCount; i < (endIndex + 1) * rowItemCount; i++) {
            let item = this.items[i];
            if (item == null) {
                continue;
            }
            if (!item.dataChanged && !item.indexChanged) {
                continue;
            }
            if (item.node == null) {
                item.node = this.getNode();
                if (item.node) {
                    item.node.parent = this.content;
                    if (this.horizontal) {
                        item.node.x = (itemSize * (i + 0.5) + this.spacing * (i + 1));
                        item.node.y = 0;
                    }
                    else {
                        let row = Math.floor(i / rowItemCount);
                        let col = i % rowItemCount;
                        if (this.iconMode) {
                            let rowWidth = rowItemCount * (this.itemWidth + this.spacing) + this.spacing;
                            let off = this.alignCenter ? (this.content.width - rowWidth) / 2 : 0;
                            item.node.x = - this.content.width / 2 + this.spacing + this.itemWidth * 0.5 +  (this.itemWidth + this.spacing) * col + off;
                        }
                        else {
                            item.node.x = 0;
                        }
                        item.node.y = -itemSize * (row + 0.5) - this.spacing * (row + 1);
                    }
                }
            }
            if (this.setter) {
                this.setter({nodeItem: item.node, data: item.data, index: item.index, indexChanged: item.indexChanged, dataChanged: item.dataChanged});
            }
            item.dataChanged = false;
            item.indexChanged = false;
        }
        this.prevStartIndex = startIndex;
        this.prevEndIndex = endIndex;
        this.needUpdate = false;
    }

    private getNode(): cc.Node {
        let node = this.poolItems.get();
        if (node == null) {
            if (this.prefabItem) {
                node = cc.instantiate(this.prefabItem);
            }
        }
        return node;
    }
}
